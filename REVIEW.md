# درفش: M5.5 review and elevation

A full pass over the demo against the five goals (viral spread, teamwork, lightweight, rewarding, identity). It covers what I found, what changed, the school-power system, the new surprises, and what I recommend after the demo.

Verification for this pass: type-check, 54 unit tests, the production build, and scripted walk-throughs in headless Chrome at phone resolution (title, tutorial, all three powers against live enemies, every surprise, Result, Hero Card). **Not yet tested on a real phone or inside the Telegram client.** Frame rate on a mid-range Android is still to be measured in M6.

---

## Part A: findings and fixes

### Bugs fixed

| # | Finding | Fix |
|---|---|---|
| 1 | **The tutorial could cost the run.** The ricochet step's shield-bearer could reach the hero, take a heart, and even use up the once-per-run teammate rescue on a learning run. | While the tutorial runs, a lunge only staggers the hero. Learning is free. |
| 2 | **Start-up race.** In play mode (restart, «دوباره») the run started in the same frame the HUD was relaunched. With the tutorial pending, `showSkip()` ran on a HUD that didn't exist yet, and the scene would throw. | The HUD sets a `ready` flag at the end of `create`, and the Game scene waits for it before starting the run. |
| 3 | **Offset tap areas.** Phaser measures a container's custom hit shape from its top-left corner, not its centre. The title's group chip reacted to taps up and left of where it's drawn. | Hit shapes are corrected, and the rule is written next to each one so it doesn't come back. |
| 4 | **Links pointed at the hosting page, not Telegram.** Every share and invite used the raw page URL. Inside Telegram that opens a browser, not the game, and the receiver never learns who sent it or why. | New `src/config/app.ts` (`VITE_TG_BOT`, `VITE_TG_APP`) builds `t.me/<bot>/<app>?startapp=…` deep links. See the viral loop below. |
| 5 | **The bottom safe area was ignored.** Only the top row moved for notches, so a home bar could cover the new bottom controls. | The power orb and «رد کردن» now sit above the bottom inset too. |
| 6 | **No Telegram back button.** Inside Telegram, players expect the header's back arrow to close overlays. | The pause menu and the card viewer show Telegram's BackButton, and pressing it closes them. |
| 7 | **Effects that vanished.** Additive blending disappears on the sunlit sand. This showed up again in the new power effects (quake, wings, ward). | These use normal blending with deeper colours. The rule is noted in the code for future effects. |

### What weakened the goals, and what I added

**Viral spread.** The Hero Card and invite existed, but they gave the *receiver* nothing to do. I added a two-way loop:

- **«رکوردم را بزن» challenge links.** Sharing the Hero Card now carries the score and the sender's name in Telegram's start parameter (`c_<score>_<name>`, base64url so Persian names survive the 64-character limit).
- **What the friend sees.** On the title, a parchment ribbon says «سارا تو را به چالش کشید: رکوردش ۱۲٬۴۰۰». After their run, the Result tells them «از رکورد سارا (۱۲٬۴۰۰) گذشتی! 🎉», or how many points were left. Beating it is a natural reason to share back.
- **Invite links.** «دعوت هم‌رزم» carries the inviter (`i_<name>`), and the invitee's title says «سارا تو را به لشکر فراخواند!».
- **Rarer cards.** The Hero Card shows the school emblem, and it gets extra marks that are worth showing off: the red «بی‌نقص» seal and the golden «هما» medallion.

**Teamwork.** The player now picks a school (رستمی / آرشی / سیمرغی) on the title, and each school's power does a different job for the group (see Part B). The Simorghi power lifts the whole group's chain, which is the clearest example of "your skill feeds a shared goal".

**Rewarding play.** There are now three layers of reward:
- a power earned by golden-window skill;
- trick-shot calls for skilful arrows;
- rare events that feel lucky and are worth telling friends about.

The golden window stays central: it is what fills the power meter.

**Lightweight (measured).**
- **WebP path:** about 2.5 MB before first play. That is roughly 1.9 MB of art (the White Div's first sheet is the largest at 654 KB), the game bundle at 417 KB gzipped (+11 KB for this whole milestone), two Vazirmatn weights (100 KB) and the Telegram SDK. The Nastaliq font (158 KB) and `card_bg` (261 KB) load later.
- **PNG fallback:** about 8 MB. Only devices without WebP take this path, but it breaks the 4 MB budget. It's the main item for M6.
- **This milestone:** everything new is code-drawn or reuses existing textures, so it added no downloads.

**Identity.** Everything new comes from the Shahnameh and Persian legend:
- Rostam's ox-headed mace (گرز گاوسر), and the quake as «خشم رستم»;
- Arash's precision as «چشم عقاب»;
- the Simorgh's wings;
- the Homa, bird of fortune, whose shadow crowns whoever it falls on;
- the White Div, woken from sleep.

### Smaller polish in this pass
- Power names and rare-event lines sit clear of the wave banner. They used to collide.
- The Hero Card fits its Nastaliq line to the parchment, and the emblem, perfect seal and Homa medallion never overlap.
- The Div's eyes glow through the title's dusk, which makes the silhouette read.
- The power orb explains itself when tapped early: «قدرت رستمی: با ضربه‌های طلایی پر می‌شود».
- New debug keys with the overlay on: `P` fills the power meter, `G` sends a golden imp, `J` brings the Homa, `K` lights the flame bow.

---

## Part B: school powers

**Choosing a school.** Three enamel medallions on the title: رستمی (the mace), آرشی (the bow) and سیمرغی (the feather). The chosen one is lifted and ringed in gold, and a single line says what its power does. The choice is saved on the device.

**Filling and firing (one finger, no conflict with aiming).**
- The **power orb** (bottom left) shows the school emblem inside a ring that fills with the meter.
- The meter fills mostly from **golden hits**, about three per power (`BALANCE.power.gain`). Kills, every fifth combo hit and trick shots top it up. So a power is a reward for the core skill, never a way around it.
- When full, the orb glows in the power's colour, rays turn behind it, and «آماده!» appears.
- **It fires on a deliberate tap only:** released within 450 ms and moved less than 36 px. A touch that becomes a drag, or a long hold, does nothing. The orb is part of the HUD, so a touch on it never starts an aim either.
- A power never fires into nothing: with no target, the meter isn't spent.

| School | Power | Anticipation | Action | Impact | Aftermath |
|---|---|---|---|---|---|
| رستمی (heavy) | **خشم رستم** | Time slows. Ember light gathers into the bow, drums beat twice, the camera leans in. | The stamp: a quake ring races up the floor, leaving molten cracks. | Every enemy it reaches is hurt, knocked back and dazed, and a lunge that hasn't struck is broken off. Shields can't stop the ground. **An armoured White Div's barrier shatters and he is stunned**, exactly as a golden gem hit does: the concept's "Rostamians break the armour". | The cracks cool and fade, dust settles along them. |
| آرشی (precision) | **چشم عقاب** | Time nearly stops, the screen dims, an eagle cries. Gold reticles lock on one by one, with a tick each: the White Div's gem first, then the enemies nearest the hero. | Three golden arrows are loosed in a fan. | They plunge onto their marks from above, so a shield can't meet them head-on. Being golden, they pass the barrier, and an arrow into the gem stuns the Div: "Arashians hit the weak points". | Time eases back, eagle feathers drift down. |
| سیمرغی (support) | **بال سیمرغ** | A feather spirals down onto the bow, with a chime. | The Simorgh's wings sweep the arena from behind the hero to the wall, and the wind stirs banners and foliage. | A heart comes back, and a turquoise ward rises around the hero that turns away the next lunge. **The whole group's chain rises a tier** (a team buff). Enemies under the wings slow down. | Feathers drift down over the arena. |

**Why it shows that a group needs all three:** each power answers a different part of the fight. Rostam breaks the barrier, Arash lands the gem, and the Simorghi lifts everyone's chain.

Each power:
- announces its name in calligraphy;
- has its own sounds (drums and slam, an eagle cry and golden chimes, a feather chime and wing whoosh);
- has its own haptics.

Nothing is created per cast: every object is built once and reused. All numbers are in `BALANCE.power`, and all visuals are in `FEEL.powers`.

**Power skins (future cosmetics).** A power's colours come from `FEEL.powers.<school>.palettes[skin]`, and a second palette (`shahi`) already exists in data. A "skin" is therefore pure presentation that the store could sell without touching gameplay:
- a palette;
- later, particle textures (e.g. rose petals instead of feathers);
- a sound variant.

Skins show to everyone: on the Hero Card, in the group's live raid (concept §3.4), and eventually in teammates' toasts («سارا "بال سیمرغ" شاهانه را به کار برد»). That social visibility is what makes a skin worth buying. Keep them cosmetic only: same numbers, same readability.

---

## Part C: surprises (each behind a flag in `feel.ts`)

| Flag | Moment | What happens |
|---|---|---|
| `surprises.trickShot` | Skill | A kill after a ricochet calls «تیر کمانه‌ای!». After two ricochets it's «کمانهٔ دوگانه!», with a beat of slow motion and a camera nudge. Two kills with one arrow calls «یک تیر، دو دیو!». Each also adds to the power meter. |
| `surprises.goldenImp` | Rare (22% per wave, at most once a run) | A glittering golden imp dashes sideways across the arena, never attacking. Catch it and it bursts into a shower of gold coins: the power meter fills and a big gold stream pours into the group bar. If it gets away: «از دستت در رفت!». |
| `surprises.homa` | Very rare (10% of runs) | «هما!» The bird of fortune glides over the arena, and its shadow slides along the floor. Where it crosses the hero: «سایهٔ هما بر سرت افتاد!», a golden shimmer, a full power meter, and a gold «هما» medallion on that run's Hero Card, the rare card people will want to show. |
| `surprises.fleeing` | Enemy reaction | At a combo of 12 or more, a fresh imp sometimes takes one look at the carnage, a «!» pops over its head, and it runs back the way it came, jittering in panic. |
| `surprises.flameBow` | Skill streak | Five golden releases in a row light the bow on fire («کمان آذرین!»). For eight seconds fire licks the bow and arrows leave flame trails. It's a style reward with no gameplay change, and exactly the look a paid arrow effect would build on. |
| `surprises.divEyes` | Hidden secret | On the title, tap the White Div's glowing eyes three times. They flare, he roars awake from behind the wall, banners flap, and «کیست که خواب دیو سپید را آشفت؟» rises over the logo. |

Already in the game from earlier milestones: the Simorgh's feather (`simorgh.enabled`, M3), the teammates' volley (`volley.enabled`, M4), and the teammates' chat replies after a run (`reactions.enabled`, M5).

---

## Recommendations after the demo

1. **M6 performance.**
   - Serve the PNG fallback only to devices that truly lack WebP, and shrink it (quantised PNG or smaller atlases), or drop it for AVIF/WebP-only builds.
   - Split the White Div's atlases so wave 1 doesn't wait for them.
   - Measure frame rate on a mid-range Android during a Rostami quake with a full wave on screen. That's the heaviest moment added here.
2. **Backend.**
   - Replace `MockGameService` with the Workers implementation.
   - `prepareShare()` should upload the Hero Card and return a `savePreparedInlineMessage` id, so the card itself travels as a Telegram message (`WebApp.shareMessage`), not just a link.
   - Resolve start parameters server-side into real referrals, with the two-sided «هم‌رزم» reward from the concept.
3. **Balance.**
   - Tune `BALANCE.power` with real players: about three golden hits per power is a starting point.
   - Watch that the Rostami barrier-break doesn't make the armour phase trivial. Its cost could rise during the boss fight.
4. **Group composition.** Show the group's school mix on the title chip («لشکر به یک سیمرغی نیاز دارد!») to drive invites of the missing school.
5. **Cosmetics store.**
   - Power skins (palettes are already data), arrow trails (the flame bow proves the look), hero skins via the `Art` registry, and group banners (`groupBannerTex` is code-drawn and easy to vary).
   - Anything bought should show on the Hero Card, so every share advertises it.
6. **Sound.** The pause menu holds the audio context, so its button clicks are silent. A small separate UI bus would fix it.
7. **Real-device QA** inside Telegram on iOS and Android: long-press saving of the card, the share sheet, BackButton, safe areas in fullscreen mode, and haptics.
