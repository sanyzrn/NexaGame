-- Real Telegram teams for «درفش»: one team per player, expiring single-use invite codes.
-- The Edge Function (game-auth) is the only writer: it verifies Telegram initData and calls these
-- with the service role. RLS is on with no policies, so the anon/public API can never read teams.

-- The sign-in table game-auth already uses. Created here (if missing) so a fresh project works.
create table if not exists public.game_players (
  telegram_id bigint primary key,
  first_name text not null default 'بازیکن',
  username text,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create table if not exists public.game_teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_telegram_id bigint not null references public.game_players (telegram_id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint game_teams_name_length check (char_length(btrim(name)) between 1 and 32)
);

create table if not exists public.game_team_members (
  team_id uuid not null references public.game_teams (id) on delete cascade,
  telegram_id bigint not null references public.game_players (telegram_id) on delete cascade,
  member_role text not null default 'member',
  joined_at timestamptz not null default now(),
  primary key (team_id, telegram_id),
  constraint game_team_members_role check (member_role in ('owner', 'member'))
);

-- One team per player: a second membership is impossible, even under concurrent requests.
create unique index if not exists game_team_members_one_team on public.game_team_members (telegram_id);

create table if not exists public.game_team_invites (
  code text primary key,
  team_id uuid not null references public.game_teams (id) on delete cascade,
  created_by bigint not null references public.game_players (telegram_id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used_at timestamptz,
  used_by bigint,
  constraint game_team_invites_code check (code ~ '^[A-Z0-9]{4,16}$')
);

create index if not exists game_team_invites_team on public.game_team_invites (team_id);

alter table public.game_teams enable row level security;
alter table public.game_team_members enable row level security;
alter table public.game_team_invites enable row level security;
-- No policies on purpose: nothing is readable with the anon key. game-auth uses the service role.

/** Team capacity, read by the RPCs below so a stale client can never exceed it. */
create or replace function public.game_team_capacity()
returns integer
language sql
immutable
as $$ select 10 $$;

/**
 * Creates a team and its owner in one transaction. Returns the existing team instead of failing
 * when the player already has one, so a repeated tap cannot leave an empty team behind.
 * → { status: 'created' | 'exists', teamId, teamName }
 */
create or replace function public.game_create_team(p_name text, p_telegram_id bigint)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_team public.game_teams%rowtype;
  v_current uuid;
  v_name text;
begin
  -- Same rules as the client: collapsed spaces, trimmed, at most 32 characters.
  v_name := left(btrim(regexp_replace(coalesce(p_name, ''), '\s+', ' ', 'g')), 32);
  if char_length(v_name) < 1 then
    v_name := 'لشکر بی‌نام';
  end if;

  select team_id into v_current
    from public.game_team_members
   where telegram_id = p_telegram_id;
  if v_current is not null then
    select * into v_team from public.game_teams where id = v_current;
    return jsonb_build_object('status', 'exists', 'teamId', v_team.id, 'teamName', v_team.name);
  end if;

  insert into public.game_teams (name, owner_telegram_id)
  values (v_name, p_telegram_id)
  returning * into v_team;

  insert into public.game_team_members (team_id, telegram_id, member_role)
  values (v_team.id, p_telegram_id, 'owner');

  return jsonb_build_object('status', 'created', 'teamId', v_team.id, 'teamName', v_team.name);
exception
  when unique_violation then
    select team_id into v_current from public.game_team_members where telegram_id = p_telegram_id;
    if v_current is null then raise; end if;
    select * into v_team from public.game_teams where id = v_current;
    return jsonb_build_object('status', 'exists', 'teamId', v_team.id, 'teamName', v_team.name);
end;
$$;

/**
 * Redeems a single-use invite code atomically (the invite row is locked, so two phones cannot both
 * use the same code). Status is always explicit — the client shows a distinct message for each:
 *   invalid · expired · used · already_joined (same player reopens their used code)
 *   already_member · other_team · full · joined
 */
create or replace function public.game_redeem_team_invite(p_code text, p_telegram_id bigint)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_code text := upper(btrim(coalesce(p_code, '')));
  v_invite public.game_team_invites%rowtype;
  v_team public.game_teams%rowtype;
  v_current uuid;
  v_members integer;
begin
  select * into v_invite
    from public.game_team_invites
   where code = v_code
     for update;

  if not found then
    return jsonb_build_object('status', 'invalid');
  end if;

  if v_invite.used_at is not null then
    if v_invite.used_by = p_telegram_id then
      select * into v_team from public.game_teams where id = v_invite.team_id;
      return jsonb_build_object('status', 'already_joined', 'teamId', v_invite.team_id, 'teamName', v_team.name);
    end if;
    return jsonb_build_object('status', 'used');
  end if;

  if v_invite.expires_at <= now() then
    return jsonb_build_object('status', 'expired');
  end if;

  select team_id into v_current
    from public.game_team_members
   where telegram_id = p_telegram_id;

  if v_current is not null then
    if v_current = v_invite.team_id then
      select * into v_team from public.game_teams where id = v_current;
      return jsonb_build_object('status', 'already_member', 'teamId', v_current, 'teamName', v_team.name);
    end if;
    select * into v_team from public.game_teams where id = v_current;
    -- The player's *own* team: «تو در لشکر «…» هستی».
    return jsonb_build_object('status', 'other_team', 'ownTeamName', v_team.name);
  end if;

  select count(*) into v_members
    from public.game_team_members
   where team_id = v_invite.team_id;

  if v_members >= public.game_team_capacity() then
    return jsonb_build_object('status', 'full');
  end if;

  insert into public.game_team_members (team_id, telegram_id)
  values (v_invite.team_id, p_telegram_id);

  update public.game_team_invites
     set used_at = now(), used_by = p_telegram_id
   where code = v_invite.code;

  select * into v_team from public.game_teams where id = v_invite.team_id;
  return jsonb_build_object('status', 'joined', 'teamId', v_invite.team_id, 'teamName', v_team.name);
exception
  when unique_violation then
    return jsonb_build_object('status', 'already_member');
end;
$$;

-- Only the Edge Function (service role) may run these.
revoke all on function public.game_create_team(text, bigint) from public, anon, authenticated;
revoke all on function public.game_redeem_team_invite(text, bigint) from public, anon, authenticated;
grant execute on function public.game_create_team(text, bigint) to service_role;
grant execute on function public.game_redeem_team_invite(text, bigint) to service_role;
