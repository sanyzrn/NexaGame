/**
 * Where the game talks to its backend: the Supabase Edge Function `game-auth`, which verifies
 * Telegram identity and owns team membership.
 *
 * Both values are public and baked in at build time:
 *   VITE_GAME_API_URL=https://<project>.supabase.co/functions/v1/game-auth
 *   VITE_SUPABASE_ANON_KEY=<the project's anon/publishable key>
 * The anon key only gets the request past Supabase's function gateway; nothing in the database is
 * readable with it (RLS is on with no policies), and every team call is authenticated by initData.
 *
 * Without `VITE_GAME_API_URL` the game runs as the local demo: playable, with the simulated team
 * and plain web invite links.
 */
function cleanUrl(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  const value = raw.trim().replace(/\/+$/, '');
  return /^https:\/\/[^\s]+$/i.test(value) ? value : '';
}

export const GAME_API = {
  endpoint: cleanUrl(import.meta.env.VITE_GAME_API_URL),
  anonKey: typeof import.meta.env.VITE_SUPABASE_ANON_KEY === 'string' ? (import.meta.env.VITE_SUPABASE_ANON_KEY as string).trim() : '',
} as const;

/** True when this build has a backend to sign in to. */
export const hasGameApi = Boolean(GAME_API.endpoint);
