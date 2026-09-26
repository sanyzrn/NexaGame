# QA — درفش (Darafsh) demo checklist

One-session checklist for every feature in the demo: the core shot, all systems, every surprise
flag, every school power, the Telegram integration, performance and deployment. Persian names are
what the player actually sees. Dev-only shortcuts (where they exist) are marked **[dev]** — enable
the debug overlay with `?debug=1` (or the `D` key on desktop) to use them.

How to run for testing:

```bash
npm install
npm run dev          # http://localhost:5173 — phone on LAN: npm run dev:lan
npm run build && npm run preview   # production build locally
```

Telegram test flow: `npm run tunnel` (cloudflared quick tunnel), open the printed URL on the
phone, then create/point a test bot at it (see README → Deploy). `?tg=0` forces «normal browser»
mode for A/B comparison.

---

## 1. Boot & loading (M6)

- [ ] The branded splash (flag emblem, «درفش», shimmering bar) paints instantly, before any JS.
- [ ] It fades into the Phaser loading screen (same background colour — no flash), which shows
      real progress and «آماده!» when done.
- [ ] Total cold load on a mid-range phone over 4G feels instant (< ~3 s until the title reacts).
- [ ] Kill the network before loading the page → after 25 s the Persian error screen appears with
      «تلاش دوباره»; tapping it reloads (and succeeds once the network is back).
- [ ] With the network blocked *after* boot, the game still fully works (placeholders cover any
      art that can't be fetched) and no error screen appears.

## 2. Title screen

- [ ] Dusk arena behind the title: drifting embers (two parallax layers), flickering braziers,
      swaying banners, the White Div a dark silhouette with slowly pulsing red eyes.
- [ ] «درفش» + «نبرد پهلوانان» in the real fonts, with the gold shine sweep every few seconds.
- [ ] **Lazy boss art:** during the first seconds the Div is the placeholder silhouette; when the
      boss atlas finishes (watch Network tab), he swaps to the real art with no visible snap.
- [ ] The day's omen chip (فال لشکر) is present; the same omen shows for everyone on the same date
      (verify by changing the system date, or `?omen=` with a different id).
- [ ] School picker: three medallions, the chosen one lifts and is ringed in gold; a line explains
      its power; the choice persists across restarts.
- [ ] Sound toggle (top), group chip «لشکر دوستان» with member avatars, challenge/invite ribbons
      when arriving from a `startapp` link.
- [ ] Secret: tap the Div's eyes 3× → they flare, the third wake wakes him (roar, embers, shake).
- [ ] «نبرد!» pulse; tapping flies the camera down into the arena (no hard cut), HUD fades in,
      the tutorial starts on a fresh install (clear site data to test).

## 3. Core shot («یک نفس، یک تیر»)

- [ ] Drag anywhere → the trajectory line follows; hold → the bow draws and the charge ring fills.
- [ ] The golden window (نیم‌ثانیهٔ درخشان) opens on a full draw: shimmer + haptic tick + hum.
      Releasing inside it crits (bigger number, flash, punch).
- [ ] Overdrawing fades the golden window; the shot is ordinary.
- [ ] Ricochet off pillars and raised shields; a raised shield blocks a straight arrow (clang);
      golden arrows pass through shields.
- [ ] Arrows stick into pillars/wall (quiver, fade), deflect and tumble off shields.
- [ ] Full draw shows speed lines; the hero leans back and trembles with the strain.
- [ ] Release → recoil, bow shake, cape flick; numbers pop, drift and fade.

## 4. Enemies (every type, wave 1–4)

| Type | Check |
|---|---|
| دیوچه (imp) | walks down with idle hops/scratches; dies in one hit |
| سپردار (shield-bearer) | raises the shield when the aim line nears; ricochet or golden arrow needed |
| پرنده (flyer) | flies a zig-zag, banks into turns, tumbles down when hit |
| سنگ‌انداز (slinger) | stops at range, sling whirls, lobs a rock — the rock can be shot out of the air (intercept) |
| نفتی‌دار (bomber) | fuse starts on lethal damage, faster when burning; blast hurts enemies too (chain) |
| شبح (wraith) | fades ghost (untargetable), shimmers before it; a burning arrow pins it solid |
| نخبه (elite, wave 4) | bigger, more HP, gold trim, guaranteed drop |

- [ ] Waves teach one new thing each; the wave banner announces each; wave 4 can include elites.
- [ ] Enemies near the hero lunge (windup → dash); the hero blinks and is invulnerable briefly.
- [ ] Burning enemies take damage over time (fire arrows), with flame licks and a hotter tint.

## 5. Arena interactions (M6 Ascension)

- [ ] Arrow flying through a brazier's flame catches fire → fire arrow (more damage, burns).
- [ ] Pots break on one arrow (the arrow passes through) and drop coins / a heart / سه‌تیر; the
      drops arc up then home to the hero; a full-health run gives score instead of the heart.
- [ ] سه‌تیر pip appears in the HUD; the next shot fans three arrows.
- [ ] Boss boulders land with a red warning ring; they crush enemies (and can be intercepted);
      a near-miss staggers the bow for a moment.
- [ ] Slinger rocks can be intercepted mid-air («تیر سنگ‌شکن!» moment).

## 6. The White Div (boss)

- [ ] Intro: drums, camera push, he rises and slams (shake + dust), the boss bar fills, roar.
- [ ] Second time onwards: a tap skips the intro.
- [ ] Barrier phase: the hexagonal ward blocks normal arrows (chip + clang); golden arrows and
      the Rostami power break it; the gem hit stuns him (stars, head shake, recovery).
- [ ] Summons (imps leap from the wall cracks), varied by phase.
- [ ] سنگ‌باران: he leans back, rips and hurls a boulder — warning ring, crush, stagger near-miss.
- [ ] زیر ۲۵٪ جان: خشم خاکستری — hotter tint, red grade, faster embers, tighter barrage.
- [ ] Defeat → «تیر آرش» team finisher: slow-mo, the golden arrow flight, white flood, shatter.

## 7. Team feel (simulated)

- [ ] The group Div bar at the top: teammates' chunks drain with a white trail; the player's gold
      stream flies from each hit up to the bar; «سهم تو از پیروزی لشکر: X٪» on the Result.
- [ ] زنجیرهٔ درفش: playing soon after a «teammate» raises the chain tier (×1.2/×1.5/×2), flame
      and ring grow, countdown ring blinks when about to fall.
- [ ] Teammate toasts (RTL, avatar right) react to events; never cover the aim line.
- [ ] یاری هم‌رزم: on the first death a teammate's spirit revives the hero (once per run).
- [ ] تیرباران هم‌رزمان: when 3+ enemies are close (or last heart + lunge), the horn sounds,
      teammates rise and each looses one school-coloured arrow.

## 8. School powers (one per school)

Fill the power orb with ~3 golden hits (kills/combos top it up); tap the orb (quick tap, not a
drag) when it shows «آماده!».

- [ ] رستمی «خشم رستم»: time slows, drums, the quake ring races up the floor with molten cracks;
      everything it reaches is hurt/knocked back/dazed; lunges are broken; **the barrier shatters**.
- [ ] آرشی «چشم عقاب»: near-freeze, dim, eagle cry; gold reticles lock one by one (gem first);
      three golden arrows plunge from above — the gem one stuns.
- [ ] سیمرغی «بال سیمرغ»: a feather spirals onto the bow; wings sweep the arena; a heart returns,
      a turquoise ward blocks the next lunge, **the group chain rises a tier**, enemies slow.
- [ ] The orb never fires into nothing (meter not spent with no target); a drag or long press on
      the orb never fires it; a tap on the orb never starts an aim.
- [ ] Each power: its name in calligraphy, its own sounds, its own haptics.

## 9. Surprises (each behind a flag in `feel.ts`)

| Flag | How to see it |
|---|---|
| `trickShot` | ricochet kill → «تیر کمانه‌ای!»; two ricochets → slow-mo «کمانهٔ دوگانه!»; one arrow, two kills → «یک تیر، دو دیو!» |
| `goldenImp` | rare per run: a golden imp dashes across; kill it → shower of gold |
| `homa` | very rare: the Homa glides over; its shadow crossing the hero blesses the run (هما on the Hero Card) |
| `fleeing` | at a big combo, fresh imps sometimes turn and run |
| `flameBow` | 5 golden releases in a row → the bow burns (style only) — also a possible omen |
| `divEyes` | title secret (see §2) |
| `simorgh` (feel) | the first time the barrier rises: the Simorgh's shadow sweeps, a feather lands on the bow, the next arrow homes to the gem |
| `volley` (feel) | see §7 تیرباران |
| `rescue` (feel) | see §7 یاری |
| `reactions` (feel) | after the Result stars: teammates reply in chat bubbles (typing dots first); a flawless run gets the crown cheer + confetti; tap a bubble to send a heart back |

All are rare-but-fair: readable instantly, never hurt performance, and never block progress.

## 10. Result, Hero Card, sharing

- [ ] Victory: light floods, panel slides up. Defeat: dignified dusk version, encouraging text.
- [ ] Stats count up one by one with ticks: score, best combo, crits, golden accuracy %, group
      damage; 1–3 stars stamp in; the group bar drains visibly.
- [ ] «لحظهٔ برتر» — the run's best moment line (intercept, bomb chain, crush, golden streak…).
- [ ] «کارت افتخار»: renders on the parchment (school emblem, epic line by performance, stars,
      omen chip, moment line, هما medallion / بی‌نقص seal when earned); flips in with a flash;
      long-pressable inside Telegram; PNG download in a normal browser.
- [ ] Share text carries the moment + link; «دعوت هم‌رزم» and «رکوردم را بزن» build Telegram deep
      links; the receiver's title shows the challenge/invite ribbon; beating a challenge is
      announced on the Result.

## 11. Telegram & mobile behaviour

- [ ] Back button (Telegram header) opens/closes the pause menu; in the card viewer it closes it.
- [ ] During a run, closing asks for confirmation (enableClosingConfirmation); on the title and
      Result it doesn't.
- [ ] Vertical swipes never close or scroll the app mid-aim (disableVerticalSwipes).
- [ ] Switching away mid-run (home button, notification shade, another chat) pauses the run by
      itself; returning shows the pause menu and resumes cleanly on «ادامه».
- [ ] Audio starts only after the first touch (iOS); haptics do nothing (silently) where
      unsupported; the header/background/bottom-bar colours follow our palette, including after
      the client's day↔night theme change.
- [ ] Notch / home bar: HUD, pause button and the power orb stay clear of both safe areas.
- [ ] Viewport rotation/resize: the game re-fits with no letterbox glitches.

Platform matrix (expected differences):

| Client | Notes |
|---|---|
| Telegram Android | haptics via Telegram; WebP; test back button + closing confirmation |
| Telegram iOS | audio unlock on first touch; long-press card save; check safe areas (notch) |
| Telegram Desktop | no haptics; keyboard ENTER/SPACE starts; ESC pauses |
| Chrome mobile | no Telegram APIs (browser mode); `navigator.vibrate` haptics on Android |
| Safari iOS | WebP decodes (older versions: JPG/PNG fallback path); audio after gesture |

## 12. Performance (M6)

- [ ] Smooth 60 fps through a full run; the heaviest moments (boss slam, finisher, full screen of
      enemies + effects) stay playable.
- [ ] **Auto light effects:** on a throttled device (or Chrome DevTools 6× CPU slowdown), the game
      switches to light effects by itself after ~3 s under 45 fps, with the tiny toast
      «جلوه‌ها سبک شد»; the pause menu's «جلوه‌های سبک» toggle turns full effects back on, and
      the auto switch then stays out of the way for the session.
- [ ] Light effects visibly halve particles and drop the light shafts + glows.
- [ ] 10 restarts in a row («شروع دوباره» ×10): no growing memory (see README → Performance for
      the measurement method), no lost/corrupted visuals, audio still correct.
- [ ] Console is clean in production (no errors, no warnings).

## 13. Deployment smoke (after hosting)

- [ ] `npm run build` produces `dist/`; deploy Vercel (vercel.json) or Cloudflare Pages
      (`_headers`, output dir `dist`) — see README → Deploy.
- [ ] Open the Mini App through the bot (BotFather → /newapp or menu button URL).
- [ ] Versioned paths (`/bundle/*`, `/assets/*`, `/fonts/*`, `/vendor/*`) serve with
      `Cache-Control: immutable`; `index.html` revalidates.
- [ ] Re-deploy after an asset change → new art shows immediately (pack.json version bump
      busts the cache).

## 14. Data-driven sanity (for balance work)

- [ ] All gameplay numbers live in `src/config/balance.ts`; all look/motion in
      `src/config/feel.ts`; enemies/waves in `src/data/*`; changing a value changes the game
      after a reload, with no code edits anywhere else.
- [ ] `?omen=<id>` forces a specific omen; `?omen=` (empty) disables omens for the session.
- [ ] `?perf=0` disables the auto light-effects switch (profiling full effects);
      `?qa=1` exposes `window.__game` / `window.__svc` for scripted testing (harmless otherwise).
- [ ] Debug overlay **[dev]**: `?debug=1`; keys — `P` fills the power meter, `G` sends the golden
      imp, `J` brings the Homa, `K` lights the flame bow.
