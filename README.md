# درفش — نبرد پهلوانان (Darafsh: Battle of Heroes)

A playable vertical slice of a Telegram Mini App archery game: Phaser 3, TypeScript and Vite.

**Status: M2, five waves of imps, shield-bearers and flyers in a living arena, with hearts, a combo counter and a defeat screen. The White Div idles behind the wall.**
Next: M3 (the White Div boss phase), then M4 (HUD and team feel), M5 (screens, Hero Card, share) and M6 (performance pass and deploy).

## Run

```bash
npm install
npm run dev        # http://localhost:5173
npm run dev:lan    # also reachable from your phone on the same Wi-Fi
npm test           # unit tests (geometry, ricochet, charge curve, waves, effects quality)
npm run build      # packs art, type-checks, writes static files to dist/
npm run preview    # serves dist/ (use this to judge performance)
npm run assets     # pack /assets-src → public/assets (add --force to repack everything)
npm run anchors    # suggest per-pose anchors for real art (add -- --sheet for a preview image)
```

Node 20+ (tested on Node 24 / npm 12). npm 12 blocks install scripts by default and lists `esbuild` as blocked. That is harmless because its prebuilt binary is used.

## Controls

**Point and release**, like a bubble shooter: touch anywhere and the arrow is nocked; the aim line runs from the bow **through your finger** and follows it as you slide. Lift to shoot.
The dotted line is the exact flight path (first ricochet included). It stops at the first enemy it would hit and puts a **lock-on reticle** on it; the reticle turns **grey and crossed** when a shield-bearer would block the shot.
While your finger is down the bow charges (0.7 s to full). At full power it **pulses gold** (0.35 s gold, every second, with a chime, a hum and a haptic tick). **Release on a gold pulse** for a critical: ×2.5 damage, and the arrow pierces one enemy. Full power never drains, so take your time aiming and wait for the next pulse.
Changed your mind? **Drag back down below the hero** (a red ✕ appears) and lift to cancel.
Arrows bounce off pillars and side walls (2 bounces max); the top wall absorbs them.

Desktop: the same with the mouse. `` ` `` or `D` toggles the debug overlay. While it is on, `H` costs the hero a heart (to test the hurt animation and the defeat screen).

## Enemies and waves

Enemies appear at the top edge in a puff of purple smoke and walk down. If one reaches the line above the platform it lunges at the hero, who loses a heart (with a short invulnerability after it). Three hearts; losing the last shows the defeat screen.

- **Imp:** waddles with a sideways drift, sometimes stops to taunt. Weak (a charged shot kills it).
- **Shield-bearer:** slow, heavy steps that shake the ground. It raises its shield when you aim at it, and arrows that arrive head-on clang off with no damage. **Ricochet** off a wall or pillar to hit it from the side.
- **Flyer:** zig-zags in the air above its shadow and tumbles when hit. Fragile but hard to line up.

Each arrow that hits keeps the **combo** going (the ×N badge on the left); an arrow that hits nothing, or losing a heart, ends it. After wave 5 the waves repeat with tougher enemies until the boss phase lands in M3.

The pause menu has **Effects: full / light**. Light halves every particle count and turns the light shafts off, for weak phones. The choice is saved on the device.

## Test on your phone

**Browser on the same Wi-Fi:** run `npm run dev:lan` and open the `Network:` URL it prints (e.g. `http://192.168.1.20:5173`) on the phone. Allow Node through the Windows firewall if asked.

**Inside Telegram:** Telegram only opens HTTPS URLs.

1. Terminal 1: `npm run dev` (or `npm run build && npm run preview -- --port 5173` to test the production build).
2. Terminal 2: `npm run tunnel`. It prints a URL like `https://random-words.trycloudflare.com` (a Cloudflare quick tunnel, no account needed).
   It needs `cloudflared` installed once: `winget install --id Cloudflare.cloudflared`, then open a new terminal.
3. Point your existing bot at that URL in [@BotFather](https://t.me/BotFather), using either:
   - **Menu button:** `/mybots` → your bot → *Bot Settings* → *Menu Button* → *Configure menu button* → send the URL → send a title (e.g. `درفش`). Then open the chat with your bot and tap the button next to the message field.
   - **Main Mini App:** `/mybots` → your bot → *Bot Settings* → *Configure Mini App* → *Enable Mini App* → send the URL. It then opens from the bot's profile ("Open App") and from `https://t.me/<your_bot>?startapp`.
4. A quick-tunnel URL changes every time you restart the tunnel, so update it in BotFather. For a stable URL, deploy (below) and set that URL once.

Inside Telegram the game calls `ready()` and `expand()`, disables vertical swipes (so dragging to aim can't close the app), locks portrait, sets header and background colours, and uses Telegram haptics. In a normal browser, haptics fall back to `navigator.vibrate` (Android).

## Deploy (static)

`npm run build` produces `dist/`, which uses relative paths and works from any sub-path.

- **Vercel:** Framework preset *Vite*, build command `npm run build`, output directory `dist`.
- **Cloudflare Pages:** build command `npm run build`, output directory `dist`, env var `NODE_VERSION=22` (or newer).

`public/assets/` is generated, not committed. The build runs the packer, so `assets-src/` must be committed.

## Art: adding and replacing assets

See [assets-src/README.md](assets-src/README.md) for the exact filenames, sizes and anchors.

- Put a PNG in `assets-src/` with the manifest filename. It shows up with no other code changes. (A new *background* with a different composition also needs `src/data/arena.ts`: walls, lines, platform, the White Div's spot.)
- Generated art rarely puts the feet exactly on the manifest anchor, so give each real pose its own anchor in `ART_ANCHORS` (`src/data/entities.ts`). `npm run anchors` measures every character PNG and prints the lines to paste: feet on the lowest opaque row, x on the torso's centre of mass, so walk frames don't jitter. `npm run anchors -- --sheet` also writes `.cache/anchors.png` with a cross on each anchor. A pose can also be mirrored there (`flip: true`); the shield-bearer's `walk_1` is, so the shield stays in the same hand.
- Then check hitboxes, hp-bar heights and shadow sizes (same file) with the debug overlay.
- Missing files are drawn as placeholders with the same key, size and anchor. The console lists them in one warning, and the debug overlay shows them (and paints their name labels, which are hidden otherwise). If a pose is missing but a sibling pose is real, the sibling is shown instead (`POSE_FALLBACK`), e.g. `hero_hurt` → `hero_idle` with the red hurt flash.
- The packer builds trimmed atlases (max 2048²) as WebP with alpha, plus a PNG fallback that is used only when the device can't decode WebP. Backgrounds become standalone WebP q80 with a JPG fallback. Wrongly sized sources are resized to the manifest size with a warning.
- **Collision shapes never come from images.** Tune them in `src/data/entities.ts` (hitboxes, relative to the anchor, in design px) and `src/data/arena.ts` (walls, lines, pillar positions, hero, decor, the White Div's spot), then check them with the debug overlay.
- New art keys go in `src/assets/manifest.ts` (+ a placeholder painter in `src/assets/placeholders.ts`).

## Tuning: `src/config/balance.ts`

All gameplay numbers live in `src/config/balance.ts`. Times are in ms and distances in design px (the canvas is 1080×1920).

| Group | Knobs |
|---|---|
| `bow` | `chargeMs` (700), `goldenMs` (350) + `goldenGapMs` (650) for the gold pulse, `cooldownMs` (250), `aimMinDistance`, `aimSmoothingMs`, `minAimAngleDeg`, `cancelBelowPx` |
| `arrow` | `minDamage`/`maxDamage` + `damageCurve`, `critMultiplier` (2.5), `critPierce` (1), `speedMin`/`speedMax`, `maxBounces` (2), `radius` |
| `preview` | `bounces` shown (1), `maxLength`, `afterBounceLength`, dash look |
| `hero` | `hearts` (3), `invulnerableMs` after a hit |
| `enemies` | per type: `hp`, `speed` (px/s); shield `frontalDeg` (how head-on an arrow must be to clang) |
| `waves` | `startDelayMs`, `betweenMs`, `sideMargin`, `loopHpScale` |

The waves themselves are in `src/data/waves.ts`: each group says when (`at`), what (`type`), how many (`count`, one every `every` ms) and where (`x`, 0 = left wall … 1 = right wall, a list, or random). The spawn and attack lines are in `src/data/arena.ts`.

## Look and motion: `src/config/feel.ts`

Every animation, lighting and particle number lives in `src/config/feel.ts`. All motion is delta-time based, so it runs the same at any frame rate.

| Group | Knobs |
|---|---|
| impacts | `hitStopMs`, `shake.*` (hit, crit, kill, hurt, growl, step), `critFlash` |
| `light` | `sunSide` (the delivered background is lit from the **left**), `grade` colours, `warm` bloom, `vignette`, `shafts` (count, alpha, period, angle) |
| `motes`, `foliage` | dust motes (count, life, drift) and the background trees' wind shimmer (`ampPx`) |
| `shadow`, `brazier`, `banner` | shadow colour/alpha/offset, flame flicker, floor glow, sparks, banner sway |
| `boss` | breathing, head bob, tilt, gem pulse, eye glow, growl interval |
| `hero` | breathing, cape sway, lean back, bow flex, golden aura, sparkles, recoil, hurt |
| `arrow`, `numbers` | trails, stick time (1.5 s), quiver, deflect; damage-number pop and rise |
| `particles` | per-event particle counts at full quality |
| `enemy`, `imp`, `shield`, `flyer` | spawn pop, walk tilt/bob/stride, hit flash, squash, death, hp-bar trail, lunge; per-type behaviour |

## Performance and particle budget

Everything is pooled: arrows (12), damage numbers (24), rings, and every particle effect uses a pre-allocated Phaser emitter that recycles its particles. Nothing allocates per frame. The debug overlay shows alive particles against the budget (the sum of all emitter caps).

- Full-screen passes: the background (one shader pass that also sways the painted foliage), one multiply grade and one additive bloom layer. The light shafts are three soft quads.
- Measured on wave 5 with rapid golden shots: **57 live particles on average, 256 at peak** (full effects); **33 on average, 147 at peak** in light mode. Emitter caps add up to 1,164, so nothing is ever created mid-game.
- **Light** effects mode halves every burst and the motes and hides the shafts.

## Debug overlay

Toggle it with a **3-finger tap** (phone), `` ` `` / `D` (desktop), or start with `?debug=1` in the URL.
It shows FPS, renderer, charge percentage and phase, the last shot's damage, wave and enemy counts, hearts and combo, live particles, walls (cyan: bounce, red: absorb), the spawn (purple) and attack (orange) lines, pillar rects, hitboxes, flying arrows, and the list of missing assets.

## Architecture

```
src/
  main.ts                 Telegram init, font + WebP detection, Phaser config (1080x1920, FIT)
  config/                 balance.ts (gameplay numbers), feel.ts (look and motion), display.ts (design size, colours, depths)
  data/                   arena.ts (layout), entities.ts (per-pose anchors, scales, hitboxes, shadows), waves.ts
  assets/                 manifest.ts, Art.ts (key → atlas frame / image / placeholder, anchors, fallbacks), placeholders.ts, fxTextures.ts
  render/                 Atmosphere (bg shader, grade, shafts, motes), BendSprite (bendable pose strip), Shadow
  scenes/                 Boot → Preload → Game (+ Hud on top)      [Title, Result: M5]
  systems/
    AimSystem.ts          point-and-release input, smoothing, charge, cancel     (real time)
    charge.ts             pure charge curve + shot stats (unit tested)
    ArenaCollider.ts      walls/pillars ray casts; shared by preview and arrows (unit tested)
    ProjectileSystem.ts   pooled arrows, swept collision, ricochet, pierce, stick   (world time)
    WaveSystem.ts         wave schedule, pooled enemies, wave start/clear signals   (world time)
    AimView.ts            dotted trajectory, lock-on reticle, charge ring, cancel
    FX.ts / TimeCtl.ts    particles, shake, hit-stop / slow-mo
    Audio.ts              procedural Web Audio SFX + mute
  entities/               Hero, Boss (idle White Div), Decor (pillars, braziers, banners, pots), Enemy (pooled, all three types)
  services/               TelegramBridge, Haptics, Settings (effects quality, tutorial), GameService + MockGameService
  ui/                     kit (code-drawn panels, buttons, ribbons, toggles, banners), Button + Toggle, DamageNumbers, TutorialBanner
  debug/                  DebugOverlay
```

Systems talk through typed `Signal`s, and `GameScene` only wires them together. `GameService` is the backend seam: the demo uses `MockGameService`, and a Cloudflare Workers implementation can drop in later. That includes `prepareShare()` for real image sharing via `WebApp.shareMessage`.

The Telegram SDK is vendored at `public/vendor/telegram-web-app.js`, so the game never waits on telegram.org. To update it, re-download it from `https://telegram.org/js/telegram-web-app.js`.
