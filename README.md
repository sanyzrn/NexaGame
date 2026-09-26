# درفش — نبرد پهلوانان (Darafsh: Battle of Heroes)

A playable vertical slice of a Telegram Mini App archery game: Phaser 3, TypeScript and Vite.

**Status: M6 final — «اوج» (the Ascension) + the performance/stability pass.** Everything from M5.5 (title, tutorial, waves, the White Div, the team finisher, Result, Hero Card and sharing, school powers, challenge links, surprises) **plus the M6 elevation**: three new enemy archetypes (سنگ‌انداز slinger, نفتی‌دار bomber, شبح wraith), fire arrows lit on braziers, breakable pots with loot, the سه‌تیر triple shot, the boss's سنگ‌باران boulder barrage and خشم خاکستری ash-fury phase, daily shared omens (فال لشکر), elites, combo calligraphy, and the run's «لحظهٔ برتر» on every card and share — **plus the M6 hardening**: a 1.5 MB first paint (lazy boss art, subset fonts), automatic light effects on weak phones, closing confirmation and self-pause inside Telegram, a graceful error screen, and one-command deploy configs. See [docs/M6_FINAL_REPORT.md](docs/M6_FINAL_REPORT.md) for the full numbers (sizes, FPS, known issues, next steps), [ASSET_REPLACEMENT_GUIDE.md](ASSET_REPLACEMENT_GUIDE.md) for the art that is still placeholder and [QA.md](QA.md) for the full test checklist.

## Run

```bash
npm install
npm run dev        # http://localhost:5173
npm run dev:lan    # also reachable from your phone on the same Wi-Fi
npm test           # unit tests (geometry, ricochet, charge curve, waves, effects quality, omens, boulders, moments, perf)
npm run build      # packs art + subsets fonts, type-checks, writes static files to dist/
npm run preview    # serves dist/ (use this to judge performance)
npm run assets     # pack /assets-src → public/assets (add --force to repack everything)
npm run fonts      # subset /fonts-src → public/fonts (whole Persian ranges, so new text never breaks)
npm run size       # exact loading budget of dist/, per file (run after build)
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
- **سنگ‌انداز (Slinger):** walks to the upper third, plants its feet and whirls a sling over its head — then lobs a stone at your bow. The stone is a real target: **shoot it out of the air** (an intercept) for a chime, combo and power. A stone landing near you staggers the bow for a beat (never a heart).
- **نفتی‌دار (Bomber):** a walking cauldron of naphtha. Lethal damage doesn't kill it — it lights a **1.5 s fuse** (blinking faster and faster), then detonates: heavy damage to every enemy around it. Kill it **inside a crowd**; chain two bombers for a massacre. A **fire arrow** sets it off almost at once.
- **شبح (Wraith):** slips out of the world — solid 2.5 s, a shimmer warning, then **ghost and untouchable** for 1.7 s. Time your shots, or pin it solid with **fire** (a burning wraith cannot phase).
- **Elites:** from wave 4, some enemies spawn gold-trimmed and tougher (×2.2 hp) and always drop loot.

Each arrow that hits keeps the **combo** going (the ×N badge on the left); an arrow that hits nothing, or losing a heart, ends it. At 5/10/15/20/30 the combo **stamps a calligraphy word** across the sky — تیغ، تندر، طوفان، افسانه، and at 30 the game's own name: درفش.

Four waves, then the White Div rises.

### Fire, pots and سه‌تیر

- **Fire arrows:** two braziers stand inside the arena, high on the side walls. An arrow that passes through a flame **catches fire**: a burning trail, and the next enemy hit **burns** for 2 s. Fire ignores nothing — but it lights bombers instantly and pins wraiths solid.
- **Pots:** three clay pots stand on the floor. One arrow breaks each (the arrow flies on), spilling **coins** (score + power), a **heart**, or a **سه‌تیر bundle** — the next three releases each loose a fan of three arrows.

### فال لشکر — the omen of the day

One omen is drawn each **day, shared by everyone** (seeded by the UTC date — the whole group fights the same day). It colours the arena for the whole run and bends it one way:

- «باد کویر» — arrows drift on a wind, +25 % score
- «شب لاله» — more flyers, +15 % score
- «خون آتش» — flames burn bigger and hotter
- «دیوان خاموش» — enemies neither taunt nor bang, but walk faster; power gains +30 %
- «ماه آبی» — the group's chain starts lit
- «بازگشت سیمرغ» — the Homa is guaranteed; the flame bow comes sooner

The omen is announced on the title and at the run's start, and printed on the Result screen, the Hero Card and the share text. `?omen=<id>` overrides it for testing (`?omen=` turns it off).

### The White Div, ascended

After the waves the Div rises as before (gem weak point, the golden-arrow barrier, the stun, the summons) — and now:

- **سنگ‌باران (boulder barrage):** he rips chunks of the wall and hurls them at you. A pulsing ring marks the landing spot. **Shoot the boulder out of the sky** (one charged shot) — or let it land and **crush whatever stands under it** (yes, that includes his own imps: «له شد!»). A close landing staggers the bow for a beat; boulders never cost a heart.
- **خشم خاکستری (ash fury):** under 25 % hp the world turns hot and red: faster summons (bombers and wraiths join), boulders come in pairs, the gem burns brighter.

### لحظهٔ برتر — the run's story

Every run tracks its best moment — a boulder crushing an enemy, a bomber chain reaction, an intercept streak, one-arrow-two-enemies, a ricochet masterclass, a fire spree, a golden streak — and tells it back on the Result screen, the Hero Card and the share text, so no two cards read the same.

The pause menu has **Effects: full / light**. Light halves every particle count and turns the light shafts off, for weak phones. The choice is saved on the device.

**Debug overlay** (`` ` `` / `D` / 3-finger tap / `?debug=1`), extra keys: `H` hurt, `B` boss now, `N` boss −15 %, `P` power full, `G` golden imp, `J` Homa, `K` flame bow, **`O` cycle the omen, `T` سه‌تیر +3, `U`/`V`/`Y` spawn slinger/bomber/wraith, `X` drop a boulder**.

## Screens

- **Title:** the real arena, held at dusk: the camera up high and drifting slowly against two ember layers (parallax), braziers and banners alive, the White Div a silhouette behind the wall with glowing eyes. The title «درفش» and subtitle «نبرد پهلوانان» (Nastaliq once it has loaded) are live text with a gold shine sweeping across. Tap the big pulsing «نبرد!» button and the camera pushes toward the wall, then sweeps down into the arena as the dusk lifts and the HUD fades in. There is no scene cut. Corner buttons: sound, and the group chip (tap it for a roll call). Your best score shows under the button.
- **Tutorial (first play only):** hands-on, and the waves wait for you. (1) A ghost finger shows drag → hold → release while «بکش · نگه دار · رها کن!» light up in step, and the step ends with your first real shot. (2) Hold for the golden window: «حالا!» bursts over the bow when it opens, and the step ends on a golden release (or moves on kindly after three tries). (3) One shield-bearer appears, and a marching gold path shows a ricochet that reaches it from the side. The path is found by tracing the real arena, pillars included, and the shield-bearer appears at the highest spot where such a path exists. «رد کردن» skips it. Completion is stored in localStorage (guarded).
- **Result:** after a victory, light floods in with slow god-rays; after a defeat, a quiet dusk with words that point forward («پایان نبرد»). The panel slides up, then the stats count up one by one with ticks (score, best combo, golden hits, golden-window accuracy, damage to the group Div). 1–3 stars stamp down with sparkles (rules in `BALANCE.stars`), and a «رکورد تازه!» stamp marks a new best. The group Div bar drains by your share, and «سهم تو از پیروزی لشکر: X٪» counts up. Tap anywhere to hurry. Buttons: «دوباره», «کارت افتخار», «دعوت هم‌رزم» (Telegram share sheet with text + link; the clipboard in other browsers).
- **Hero Card:** 1080×1920 on `card_bg`, drawn with Canvas 2D with all text live: your name (Telegram first name or «پهلوان»), an epic line chosen by performance (`src/data/lines.ts`), the hero in a gold halo beside the group's banner, the stars, three stat medallions, the group row, and a red «بی‌نقص» seal for a flawless run. It flips in with a gold flash and a light sweep, then a real `<img>` is laid over it, so inside Telegram it can be long-pressed and saved. «اشتراک کارت» goes through `GameService.prepareShare()`: today the Telegram share sheet with text + link; with a backend, a prepared message that carries the image (`WebApp.shareMessage`). Outside Telegram it uses the native share sheet (with the image when supported) and «دانلود تصویر» saves the PNG.
- **Surprise: teammates reply (`FEEL.reactions.enabled`).** After the stars land, two teammates answer in Telegram-style chat bubbles: typing dots first, then a line that fits your run (a long combo, golden accuracy, being rescued, a defeat…). A flawless run gets the whole group's crown cheer, sent from the group banner, with confetti. Tap a bubble to send a heart back.

## School powers

Pick a school on the title: رستمی, آرشی or سیمرغی. The **power orb** (bottom left) fills mostly from golden hits, topped up by kills, combo milestones and trick shots. When it glows, **tap** it to fire. A touch that turns into a drag, or a long hold, does nothing, so it never interferes with aiming.

- **رستمی «خشم رستم»:** a quake races up the floor. It hurts, knocks back and dazes every enemy it reaches, and shatters an armoured Div's barrier.
- **آرشی «چشم عقاب»:** reticles lock onto up to three targets (the Div's gem first), then three golden arrows plunge onto them.
- **سیمرغی «بال سیمرغ»:** the wings sweep the arena. You get a heart back and a ward against the next lunge, the group's chain rises a tier, and enemies slow down.

Numbers are in `BALANCE.power`; visuals, including the palettes that would become "power skins", are in `FEEL.powers`.

## Challenge and invite links

The Hero Card share carries a challenge («رکوردم را بزن»: score + name); «دعوت هم‌رزم» carries an invite. Both travel in Telegram's start parameter. A friend who opens one sees who sent them on the title, and the Result tells them whether they beat the score. For real Telegram deep links, build with the bot's username (and the Mini App's short name, if it has one):

```bash
VITE_TG_BOT=YourBot VITE_TG_APP=darafsh npm run build
```

Without them, links point at the page itself with `?startapp=…`, which the game reads the same way (handy for testing in a browser).

## Team feel (simulated group)

Every run is fought with a group, «لشکر دوستان» (six members in `src/config/team.ts`, each of a school: رستمی / آرشی / سیمرغی). In the demo the members are simulated by `MockGameService`, and the UI only talks to the `GroupSession` interface, so a real backend can replace the mock without UI changes.

- **Group Div bar** (top): the whole group's shared foe, in Persian percent, with the group's banner. Every hit you land sends a **gold stream** from the hit point up into the bar, and your running share («سهم تو») ticks up under it. A teammate's blow flies from their toast to the bar as a spark, then drains a chunk (white trail, a «−N» floater, the banner flutters).
- **Teammate toasts** (right): avatar, name and what they did (hit, critical, lit or fanned the chain, joined the fight). Two at most, queued. They never appear in the golden window, at full draw, in cutscenes, the finisher or the rescue, and they wait for a calm moment (or 2.6 s at most while you are busy).
- **Chain (زنجیرهٔ درفش)** (left, under the hearts): teammates raise it (×۱٫۲ → ×۱٫۵ → ×۲) and your hits keep it burning. When it burns out it drops one tier. The multiplier applies to damage dealt to the group Div. The flame, glow and embers grow with each tier.
- **Rescue (یاری هم‌رزم)**: the first time your last heart goes, the screen dims to a spotlight, a teammate's golden spirit flies in from the banner, and you come back with one heart, a short golden invulnerability, and a shockwave that clears the enemies around you. Once per run.
- **Surprise: the teammates' volley (تیرباران هم‌رزمان)**: when enemies crowd the hero (or one is about to reach them on the last heart), a war horn sounds, the teammates in the fight rise along the bottom edge behind the hero, and each fires one arrow in their school's colour that arcs over the arena and plunges onto the enemy nearest the hero. Their name pops above the hit. At most twice per run. It can be switched off with `FEEL.volley.enabled`.

The pause menu is its own scene: while it is open the game and the HUD are truly paused (updates, tweens, timers, particles, the teammates) and the audio is held mid-note.

**Safe areas:** the top row (hearts, group bar, chain, pause) moves below phone notches (`env(safe-area-inset-*)`) and Telegram's own controls in fullscreen (`safeAreaInset` + `contentSafeAreaInset`). The offset only applies where the unsafe band actually overlaps the letterboxed canvas. Add `?safetop=60` to the URL to simulate a 60 px notch on desktop.

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

Inside Telegram the game calls `ready()` and `expand()`, disables vertical swipes (so dragging to aim can't close the app), locks portrait, sets header and background colours (re-asserted when the client flips its day/night theme), and uses Telegram haptics. In a normal browser, haptics fall back to `navigator.vibrate` (Android) and fail silently where unsupported.

**During a run** Telegram's close confirmation is on, so a stray swipe can't throw the run away; it turns off again on the Result screen. Leaving or minimising the app mid-run **pauses the run by itself** — coming back shows the pause menu, and «ادامه» resumes exactly where you left off. Audio unlocks on the first touch (iOS) and suspends while the app is hidden.

## Deploy (static)

`npm run build` produces `dist/`, which uses relative paths and works from any sub-path. Both hosts get correct cache headers automatically from the committed config files: everything versioned (`/bundle/*`, `/assets/*`, `/fonts/*`, `/vendor/*`) is immutable for a year, `index.html` always revalidates — so a re-deploy shows new art immediately (the packer bumps `pack.json`'s version, which busts the asset cache).

- **Vercel:** `vercel.json` is committed (build `npm run build`, output `dist`). Import the repo in the Vercel dashboard and deploy; or `npx vercel` from the project root. Point the bot's Mini App URL (BotFather, above) at the deployment URL.
- **Cloudflare Pages:** `public/_headers` is committed and copied into `dist/`. Create a Pages project → connect the repo → build command `npm run build`, output directory `dist`, env var `NODE_VERSION=22` (or newer).

`public/assets/` and `public/fonts/` are generated, not hand-made. The build runs the packer and the font subsetter, so `assets-src/` and `fonts-src/` must be committed.

## Art: adding and replacing assets

See [assets-src/README.md](assets-src/README.md) for the exact filenames, sizes and anchors.

- Put a PNG in `assets-src/` with the manifest filename. It shows up with no other code changes. (A new *background* with a different composition also needs `src/data/arena.ts`: walls, lines, platform, the White Div's spot.)
- Generated art rarely puts the feet exactly on the manifest anchor, so give each real pose its own anchor in `ART_ANCHORS` (`src/data/entities.ts`). `npm run anchors` measures every character PNG and prints the lines to paste: feet on the lowest opaque row, x on the torso's centre of mass, so walk frames don't jitter. `npm run anchors -- --sheet` also writes `.cache/anchors.png` with a cross on each anchor. A pose can also be mirrored there (`flip: true`); the shield-bearer's `walk_1` is, so the shield stays in the same hand.
- Then check hitboxes, hp-bar heights and shadow sizes (same file) with the debug overlay.
- Missing files are drawn as placeholders with the same key, size and anchor. The list is printed once in dev only (production consoles stay clean), and the debug overlay shows them (and paints their name labels, which are hidden otherwise). If a pose is missing but a sibling pose is real, the sibling is shown instead (`POSE_FALLBACK`), e.g. `hero_hurt` → `hero_idle` with the red hurt flash.
- The packer builds trimmed atlases (max 2048²) as WebP with alpha, plus a palette-quantized PNG fallback (only for devices that can't decode WebP — now roughly 2× the WebP size instead of 3.5×, keeping the whole fallback path under the 4 MB budget). Backgrounds become standalone WebP q80 with a JPG fallback. WebP quality can be tuned per atlas group (`ATLAS_WEBP_BY_GROUP` in `scripts/pack-assets.ts`; the boss runs at q84). Wrongly sized sources are resized to the manifest size with a warning.
- **Collision shapes never come from images.** Tune them in `src/data/entities.ts` (hitboxes, relative to the anchor, in design px) and `src/data/arena.ts` (walls, lines, pillar positions, hero, decor, the White Div's spot), then check them with the debug overlay.
- New art keys go in `src/assets/manifest.ts` (+ a placeholder painter in `src/assets/placeholders.ts`).

## Eras (سفر در زمان) and difficulty

The Derafsh travels through 17 eras of Iranian history, from the Achaemenids through the Parthian, Sasanian, Samanid, Ghaznavid, Seljuk, Khwarazmian, Ilkhanid, Timurid, Safavid, Afsharid, Zand, Qajar, Constitutional and Pahlavi eras to the contemporary era and the future. Beating an era's boss opens the next one; a time-jump cinematic carries the player there.

- **Title menu:** «نبرد!», an info line (era · year · difficulty), «⏳ زمان‌ها» (the era wall) and «⚔ سختی» (the difficulty picker). Pause and Result both have a way back to the main menu.
- **Era wall** (`EraSelectScene`): a scrolling grid of cards. Open eras are in colour, locked eras show how they open, and eras still being built are grey «به‌زودی».
- Eras are data in `src/data/eras.ts` (names, year, place, boss, one signature rule, hp scales, waves). Eras 1–2 are playable.
- **Difficulty** (`src/data/difficulty.ts`): آسان / معمولی / سخت / افسانه‌ای changes hearts, enemy hp and speed, boss hp and the score multiplier; saved on the device.
- Era N re-skins every sprite through `Art` with the prefix `eN_` (e.g. `assets-src/e2_hero_idle.png`), with no code changes. Missing era art is shown as recoloured **test art**; each era's atlas is loaded only when that era is played.
- The full art brief (file names, sizes, prompts for every era) is in [docs/ERA_ASSETS.md](docs/ERA_ASSETS.md); the idea bank is [docs/IDEAS.md](docs/IDEAS.md).
- `?era=2` (or `?era=parthian`) plays an era without unlocking it.

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
| `chain` | `multipliers` (×1, ×1.2, ×1.5, ×2), `durationMs` per tier, `hitExtendMs` / `critExtendMs`, `dropRefill` |
| `rescue` | `hearts` restored (1), `shieldMs` (invulnerable shimmer), `clearRadius` |
| `power` | meter gains (golden, kill, combo step, trick shot), the tap rule, and each power's damage, stun, push, arrows, heal, ward, slow and chain lift |
| `surprises` | golden imp chance, hp, speed and group bonus; Homa chance and timing; fleeing combo and chance; flame bow streak and duration |
| `score`, `stars` | score weights (damage, kill, best combo, golden hit, victory, hearts left); star thresholds (golden accuracy, best combo, hearts lost) |

The mock group lives in `src/config/team.ts`: `SCHOOLS` (names, colours), `MOCK_GROUP` (members, who is already in the fight, the group Div's hp) and `MOCK_PACING` (how often teammates act, damage per school, crit odds, the odds of each activity).

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
| `groupBar`, `stream` | group bar size, drain and trail timing, banner sway; gold-stream motes per hit/crit/kill, flight time, curve, pool |
| `toast` | toast slots, slide in/out, hold, busy patience, gap, spark flight |
| `chain`, `combo`, `hearts` | chain flame size/colour/glow/embers per tier, warning blink; combo tiers, flames, text colours, shatter; heart layout and refill |
| `rescue`, `volley` | rescue slow-mo, dim, spirit timing; the volley's trigger (danger zone, cooldown, max per run), arrows, arc, damage (`volley.enabled` is the surprise's flag) |
| `title`, `tutorial` | title camera zoom/focus/drift, dusk colours, embers, the flight in (push, sweep), button pulse, shine; ghost-finger loop and idle wait, golden-step tries |
| `powers` | orb position, title time, the power skin in use; per power: name, palettes, anticipation, slow motion, quake speed and cracks, lock-on gap, wing sweep, feathers |
| `surprises` | on/off flag and look for each surprise: trick shots, golden imp, Homa, fleeing imps, flame bow, the title's Div-eyes secret |
| `result`, `reactions` | flood, panel slide, count-up speed and tick rate, star gap, group drain; the teammates' replies (`reactions.enabled` is M5's surprise flag), typing time, confetti |

## Performance, loading budget and quality

Everything is pooled: arrows (12), damage numbers (24), rings, and every particle effect uses a pre-allocated Phaser emitter that recycles its particles. Nothing allocates per frame (verified by audit and by the 10-restart memory run). The debug overlay shows alive particles against the budget (the sum of all emitter caps).

- Full-screen passes: the background (one shader pass that also sways the painted foliage), one multiply grade and one additive bloom layer. The light shafts are three soft quads.
- Measured on wave 5 with rapid golden shots: **57 live particles on average, 256 at peak** (full effects); **33 on average, 147 at peak** in light mode. Emitter caps add up to 1,164, so nothing is ever created mid-game.
- **Light** effects mode halves every burst and the motes and hides the shafts.

**Automatic light effects (M6).** `systems/Perf.ts` watches the real frame rate; if it stays under 45 fps for 3 seconds it switches to light effects by itself and shows a tiny toast. The player can always turn full effects back on (pause menu) — and from then on the auto switch stays out of the way for the session. Thresholds live in `feel.ts → quality.autoReduce`; the decision core is pure and unit-tested.

**Loading budget (M6).** `npm run size` prints the exact per-file budget of `dist/`. Current numbers on the wire (gzip):

| Phase | Size | What |
|---|---|---|
| First paint, WebP path | **≈ 1.46 MB** | bundle 418 KB gz + art 970 KB WebP + both Vazirmatn weights 59 KB + Telegram SDK 13 KB gz + JSONs |
| First paint, no-WebP fallback | ≈ 1.57 MB | same, but PNG/JPG twins of the art (palette-quantized) |
| Lazy | ≈ 1.19 MB | boss atlas (fetched in the background while the title is up), card_bg (first Hero Card), the Nastaliq calligraphy font |

The boss art is the only lazy atlas group (`LAZY_ATLAS_GROUPS` in `manifest.ts`): the title shows his placeholder silhouette (by design — he is a dark silhouette there anyway) and the real texture swaps in silently when it arrives, even mid-intro on a slow network. Fonts are subset to whole Persian ranges (every letter + both digit sets + the punctuation we use), so new Persian strings can never render tofu.

**Leak check (M6).** Ten restarts in a row show flat `performance.memory` and a constant Phaser texture count: every texture is cached by key (`ui/kit.ts`), the Hero Card canvas texture is removed on close, and pools are never re-created per run. `index.html` paints a branded splash instantly (before any JS), and a failed boot shows a Persian error screen with «تلاش دوباره» instead of a black page.

## Debug overlay

Toggle it with a **3-finger tap** (phone), `` ` `` / `D` (desktop), or start with `?debug=1` in the URL.
It shows FPS, renderer, charge percentage and phase, the last shot's damage, wave and enemy counts, hearts and combo, the power meter, live particles, walls (cyan: bounce, red: absorb), the spawn (purple) and attack (orange) lines, pillar rects, hitboxes, flying arrows, and the list of missing assets.
Keys while it is on: `H` hurt, `B` boss now, `N` boss −15%, `P` power full, `G` golden imp, `J` the Homa, `K` flame bow.

## Architecture

```
src/
  main.ts                 Telegram init, font + WebP detection, splash/error screen, auto-pause on hide, perf attach, Phaser config (1080x1920, FIT)
  config/                 balance.ts (gameplay numbers), feel.ts (look and motion, quality/auto-reduce), display.ts (design size, colours, depths)
  data/                   arena.ts (layout, fire braziers, pots), entities.ts (per-pose anchors, scales, hitboxes, shadows), waves.ts, omens.ts (فال لشکر), moments.ts (لحظهٔ برتر), lines.ts (epic lines, reactions)
  assets/                 manifest.ts (incl. LAZY_ATLAS_GROUPS), Art.ts (key → atlas frame / image / placeholder, anchors, fallbacks), lazy.ts (lazy atlas groups), placeholders.ts, fxTextures.ts
  render/                 Atmosphere (bg shader, grade, shafts, motes), BendSprite (bendable pose strip), Shadow
  scenes/                 Boot → Preload → Game (title mode at dusk) + Title → Game (play) + Hud → Result (+ Card); Pause over all
  systems/
    AimSystem.ts          point-and-release input, smoothing, charge, cancel     (real time)
    charge.ts             pure charge curve + shot stats (unit tested)
    ArenaCollider.ts      walls/pillars ray casts; shared by preview and arrows (unit tested)
    ProjectileSystem.ts   pooled arrows, swept collision, ricochet, pierce, stick, brazier ignition, wind drift   (world time)
    Hazards.ts            pooled slinger stones + the Div's boulders: arcs, warning rings, intercepts, crushes
    Pickups.ts            pot loot in flight (coins / heart / سه‌تیر), homing to the hero
    WaveSystem.ts         wave schedule, pooled enemies, wave start/clear signals, omen filters + elite spawns
    AimView.ts            dotted trajectory, lock-on reticle, charge ring, cancel
    FX.ts / TimeCtl.ts    particles, shake, hit-stop / slow-mo
    Perf.ts               FPS watch → automatic light effects (decision core pure, unit tested)
    Audio.ts              procedural Web Audio SFX + mute + hold (pause)
    Volley.ts             the teammates' volley (surprise)
    Tutorial.ts           the hands-on first-play tutorial (ghost finger, golden step, ricochet hint)
    score.ts              score, stars, epic line and reaction picks (pure, unit tested)
    Powers.ts, powerMeter.ts   the three school powers; the meter (pure, unit tested)
    Surprises.ts          trick-shot calls, the Homa, fleeing imps' alarm, the flame bow
  entities/               Hero, Boss (idle White Div), Decor (pillars, braziers, banners, pots), Enemy (pooled, all three types)
  services/               TelegramBridge (back button, closing confirmation, safe areas, theme), Haptics, Settings (school, light effects + auto source), SafeArea, Share, links (deep links, start parameters), GameService + MockGameService + MockGroupSession, chain.ts (pure, unit tested)
  ui/                     kit (code-drawn panels, buttons, ribbons, toggles, banners, ornaments), Button + Toggle, DamageNumbers,
                          GroupBar, GoldStream, TeamToasts, SparkFlight, ChainBadge, ComboBadge, Hearts, RescueSpirit, avatar,
                          GhostFinger, HeroCard (Canvas 2D renderer)
  debug/                  DebugOverlay
scripts/
  pack-assets.ts          assets-src → atlases/WebP + palette-PNG fallback + pack.json (per-group WebP quality)
  subset-fonts.ts         fonts-src → public/fonts (Persian-range subsets, layout features kept)
  size-report.ts          the exact per-file loading budget of dist/
  suggest-anchors.ts      per-pose anchor suggestions for real art
```

Systems talk through typed `Signal`s, and `GameScene` only wires them together. `GameService` is the backend seam: the demo uses `MockGameService`, and a Cloudflare Workers implementation can drop in later. That includes `prepareShare()` for real image sharing via `WebApp.shareMessage`, and `prepareInvite()` for the «دعوت هم‌رزم» link (a backend can turn it into a referral).

`GameService.joinGroup()` opens a `GroupSession` for the run. It is pull-based: the HUD takes an activity with `next()` only when it has a calm moment to show it, and the activity's effect on the shared state (hp, chain, members) is committed at that moment, so what the player sees never runs ahead of or behind the state. A network implementation buffers incoming events behind `next()` the same way. Member avatars are generated (school-coloured disc and initial). Give a member a `photoUrl` and the same texture is repainted with their Telegram photo.

The Telegram SDK is vendored at `public/vendor/telegram-web-app.js`, so the game never waits on telegram.org. To update it, re-download it from `https://telegram.org/js/telegram-web-app.js`.
