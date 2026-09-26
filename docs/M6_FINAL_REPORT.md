# M6 final report — درفش demo

The M6 milestone in two halves: **«اوج» (the Ascension)** — the content elevation (three new
enemy archetypes, fire arrows, pots and loot, سه‌تیر, the boss's boulder barrage and ash fury,
daily omens, elites, combo calligraphy, «لحظهٔ برتر») — and **the hardening pass** documented
here: performance, size budget, Telegram/mobile robustness, quality and deployment.

Verification for this pass: 81/81 unit tests, clean typecheck and production build, and a scripted
walk-through of the **production build** in headless Chromium at phone resolution (390×844, DPR 2)
that plays a full run — waves → boss (intro, boulder barrage, ash fury) → the held team finisher →
Result → Hero Card — then verifies the auto light-effects switch, the self-pause on leaving, and
ten restarts in a row, with a zero-tolerance console watch. Not yet measured on a physical
mid-range Android (see Known issues); QA.md §12 has the on-device procedure.

---

## 1. Loading budget (the exact numbers)

`npm run size` prints this from `dist/` at any time. On the wire (gzip), per file:

| File | First paint | Lazy |
|---|---|---|
| bundle JS (gz) | 430 KB | |
| bg_arena_01.webp | 319 KB | |
| enemies.webp + json | 293 KB | |
| propsui.webp + json | 240 KB | |
| hero.webp + json | 122 KB | |
| Vazirmatn Regular + Black (subset) | 59 KB | |
| telegram-web-app.js (gz) | 13 KB | |
| index.html + css + pack.json (gz) | 4 KB | |
| **First paint, WebP path** | **≈ 1.46 MB** (raw 2.6 MB) | |
| boss-0.webp + boss-1.webp + jsons | | 807 KB |
| card_bg.webp (first Hero Card) | | 255 KB |
| NotoNastaliqUrdu-Bold (subset, after boot) | | 127 KB |
| **Lazy total (WebP)** | | **≈ 1.19 MB** |
| First paint on WebP-less devices (PNG/JPG twins, palette-quantized) | ≈ 1.57 MB | |

- Budget: **first paint 1.46 MB** vs the 4 MB ceiling (and under the 3 MB ideal). The boss atlas
  (807 KB) left the critical path entirely — it is fetched in the background while the player
  reads the title screen, and the placeholder silhouette (which is what the title shows anyway —
  he is a dark shape there by design) swaps to real art the moment it lands. The swap was
  verified in the harness: the request fires ~2.3 s after navigation (after first paint) and the
  boss sprite's texture flips to `atlas:boss-0` with no visible snap.
- The no-WebP fallback path — old iOS, roughly — used to weigh ~8 MB in PNGs; palette-quantized
  PNG twins bring it to **≈ 1.57 MB**, inside the budget on every device the game supports.
- Fonts: Vazirmatn 49→29 KB per weight, Nastaliq 154→127 KB, by subsetting to whole Persian
  ranges (every letter + both digit sets + the punctuation we use, so new Persian text can never
  render tofu). Verified lossless: the subsets contain **exactly** the same code points as the
  originals across all ranges (0 lost), and HarfBuzz glyph-closure keeps the GSUB shaping tables
  the Nastaliq calligraphy needs.
- Audio is fully procedural (Web Audio, zero downloads) — nothing to compress.
- The `index.html` splash (flag emblem, «درفش», shimmering bar) paints before any JS or font
  arrives, then hands over to the Phaser loading screen with real progress — same background
  colour, no flash.

## 2. Performance

- **Automatic light effects.** `systems/Perf.ts` watches the real frame rate; under 45 fps for
  3 seconds it switches to light effects by itself (halved particles, no shafts/glows) with a
  tiny toast («جلوه‌ها سبک شد … از «مکث» قابل تغییر است»). The player's own toggle always wins,
  and after any manual change the auto switch stands down for the session. The decision core is
  pure and unit-tested (7 cases: sustained dip fires, recovery resets the window, fires once,
  manual override respected, disabled flag). Verified end-to-end in the harness: on the throttled
  software renderer the switch fired after ~88 s of sub-45 fps and persisted.
- **Pools and allocations.** Arrows (12), damage numbers (24), rings, toasts, hazards, pickups —
  all pooled; the target list is a reused array rebuilt only when the roster changes; hot paths
  (update loops in Game/Hud/Enemy/Boss/ProjectileSystem/Hazards/FX/Atmosphere) allocate nothing
  per frame (audited). Every code-drawn texture is cached by key; the Hero Card canvas texture is
  removed on close.
- **Ten restarts in a row** (harness): heap 73→64→69 MB with an 11.6 MB spread (GC noise, no
  growth trend), Phaser texture count constant at 167 across all ten. No leaks.
- **Frame-rate profile.** The harness profiled four segments at real pace on the production
  build. In *software* GL (headless Chromium) every segment is CPU-bound at 1.4–2.0 fps, so
  absolute numbers are not meaningful for hardware — but the *relative* cost matches the design
  budget: the finisher (full-screen flash, shockwave, light flood) is the heaviest moment
  (~1.4 fps avg vs ~2.0 in normal combat), the boss's fury barrage second (~1.7), normal combat
  and the title lightest. On-device absolute numbers are a physical-pass item (QA.md §12; the
  debug overlay shows live FPS), and the auto light-effects switch is the safety net for any
  device that dips.

## 3. Telegram & mobile robustness

- **Close confirmation** is on during a run (a stray swipe can't throw it away) and off on the
  Result/title. **Vertical swipes disabled**, portrait locked, header/background/bottom-bar
  colours ours — re-asserted when the client flips its day/night theme (themeChanged wired).
- **Self-pause:** leaving or minimising mid-run (visibilitychange, Telegram's `deactivated`)
  pauses the run — the pause menu freezes the whole world — and «ادامه» resumes exactly where it
  was. Two real bugs were found and fixed while wiring this:
  1. The pause menu could be launched twice in one tick (the game's pre-existing
     `Phaser.Core.Events.HIDDEN` handler plus the new path), logging "Cannot pause non-running
     Scene" warnings. There is now one path (GameScene.autoPause), race-guarded.
  2. **«شروع دوباره» from the pause menu could land on the title screen** on a first-boot run:
     Phaser's `scene.start(key)` with no data *reuses the previous launch data* (`{title:true}`
     from boot). The restart now passes `{title:false}` explicitly.
- Audio unlocks on the first gesture anywhere (iOS autoplay rules); it suspends while hidden and
  holds mid-note through the pause menu. Haptics degrade silently (Telegram → navigator.vibrate →
  nothing).
- **Graceful error screen:** a failed or stalled boot (blocked network, dead bundle) shows a
  Persian panel — «میدان آماده نشد / اتصال اینترنت را بررسی کن و دوباره تلاش کن» — with a
  «تلاش دوباره» button; a 25 s watchdog covers a hung load; `visibilitychange`-style artifacts
  can't trigger it. Past boot, missing art falls back to placeholders, so the game itself never
  shows the error screen.
- The console in production is **completely clean** — zero errors, zero warnings (harness-verified
  with a zero-tolerance watch; placeholder-asset notices are dev-only).

## 4. Quality & deployment

- **QA.md** — a one-session checklist covering every feature, every surprise flag (trick shots,
  golden imp, Homa, fleeing, flame bow, Div's eyes, Simorgh, volley, rescue, reactions), every
  school power, the M6 systems, the Telegram behaviours, performance (including how to see the
  auto switch), and the per-platform test matrix (Telegram Android/iOS/Desktop, Chrome, Safari)
  with expected differences.
- **Deploy:** `vercel.json` and `public/_headers` (Cloudflare Pages) are committed — versioned
  paths immutable for a year, `index.html` always revalidates, so a re-deploy shows new art
  immediately (the packer's `pack.json` version busts the asset cache). README covers run/build/
  deploy, connecting the bot via BotFather (menu button or Mini App), LAN + tunnel phone testing,
  asset replacement, and tuning `balance.ts` / `feel.ts` / surprise flags.
- Tests: **81/81** (7 new for the auto-reduce decision core), typecheck clean, production build
  clean, size report reproducible via `npm run size`.

## 5. What's ready to demo

The full loop: instant branded boot → title at dusk (omens, school picker, the Div's eyes
secret) → «نبرد!» dive → tutorial on first play → waves teaching imp/shield/flyer + slinger /
bomber / wraith + elites, fire arrows, pots and loot, سه‌تیر, combo calligraphy → the White Div
(intro, barrier, gem stuns, summons, سنگ‌باران, خشم خاکستری) → the held team finisher «تیر آرش» →
Result (count-up, stars, group bar, «لحظهٔ برتر», teammates' chat reactions) → Hero Card (share,
save, challenge and invite deep links) → «دوباره». Under it all: the simulated لشکر (group bar,
chain, toasts, rescue, volley), three school powers, daily shared omens, the surprise flags, the
self-pause, the auto light-effects switch, and a 1.46 MB first paint.

## 6. Known issues

1. **On-device FPS pass pending.** Absolute frame-rate numbers need a physical mid-range Android
   (the harness can only measure software rendering). The auto light-effects switch is the
   verified safety net; QA.md §12 is the procedure (the debug overlay shows live FPS).
2. **Placeholder art** for the M6 content (slinger, bomber, wraith, rock, boulder, hero_hurt) is
   deliberate and documented in ASSET_REPLACEMENT_GUIDE.md — same keys, sizes, anchors and
   hitboxes as final art, so swapping is drop-in.
3. **PNG fallback path** is palette-quantized (≈ 1.57 MB) — visually fine at game sizes, but the
   WebP path is the reference look on the rare WebP-less device.
4. Desktop Telegram has no haptics (by platform); keyboard shortcuts (ENTER, ESC, debug keys)
   are desktop-only conveniences.

## 7. Top 5 recommendations — demo → real game

1. **The group backend (Cloudflare Workers + D1 + Durable Objects)** is the single unlock for the
   concept's heart: a shared group Div with real hp, the زنجیرهٔ درفش across members, live raid
   toasts in the actual chat. `GameService`/`GroupSession` is already the seam — a network
   implementation buffers events behind `next()` exactly like the mock.
2. **The group bot** (Bot API webhook on the same Worker): boss-defeat announcements, the chain
   window («زنجیره ×۱٫۵ فعال است»), the «کمکم کن» rescue link, and nightly digests — the viral
   loops the mock can only hint at.
3. **Economy on Telegram Stars** (concept §7): the seasonal «شاهنامه‌نامه» pass, group درفش
   banners (one buyer, everyone sees it — the strongest social purchase), صندوق سخاوت gifts.
   Power skins are already pure data (`FEEL.powers.<school>.palettes`) and the Hero Card already
   shows them.
4. **Final art for the M6 cast** per ASSET_REPLACEMENT_GUIDE.md — the slinger, bomber and wraith
   are the game's most distinctive enemies and currently silhouettes of their future selves.
5. **Season structure** (concept §5): a six-week Shahnameh season = a new boss variant (the
   bossBrain FSM is data-driven already), new omens, and a fresh «فصل» banner — the comeback
   engine once the social loop is live.
