# ASSET_REPLACEMENT_GUIDE — درفش (Darafsh)

Every asset below is currently a **code-drawn placeholder** (or an existing asset reused) and is meant to be replaced by real artwork. Drop a PNG with the exact filename into `assets-src/`, run `npm run assets`, and it appears in the game with **zero code changes** — the manifest governs size, anchor and atlas. After dropping real art, optionally run `npm run anchors` to measure true per-pose anchors (feet on the lowest opaque row) and paste the printed lines into `ART_ANCHORS` in `src/data/entities.ts`, then check hitboxes with the debug overlay (`` ` `` / 3-finger tap).

**General rules for ALL character art:**

- Style: flat 2D illustration, thick dark outlines, warm Shahnameh palette (lapis, gold, pomegranate red, turquoise), slightly cartoonish proportions (bigger heads read better on phones).
- Transparent background (PNG with alpha), no drop shadows baked in (shadows are drawn by the engine as soft ellipses at the feet).
- The `ox/oy` anchor in the table is the manifest default; per-pose real-art anchors go into `ART_ANCHORS` (`src/data/entities.ts`).
- All sizes are in **source pixels** (the canvas is 1080×1920 design px; sprites are scaled at render).
- Characters face **down-screen (toward the hero/camera)** — front-ish ¾ view, like the existing imps.
- One pose per file, static frame. All idle/walk animation (bob, tilt, squash, sway) is procedural — do NOT bake motion into frames.
- The packer trims transparent borders and writes the anchor into the atlas frame pivot, so the character must fill a similar portion of the box as the existing art of the same type.

---

## 1. NEW ENEMIES (M6 «اوج» — the Ascension)

### 1.1 سنگ‌انداز — Slinger (`slinger_*`) — 4 poses

| File | Size | Anchor (ox, oy) | Atlas |
|---|---|---|---|
| `slinger_walk_1.png` | 256×256 | 0.5, 0.9 | enemies |
| `slinger_walk_2.png` | 256×256 | 0.5, 0.9 | enemies |
| `slinger_throw.png` | 256×256 | 0.5, 0.9 | enemies |
| `slinger_hit.png` | 256×256 | 0.5, 0.9 | enemies |

**Character:** a lean, wiry desert div — younger brother of the imps, an ambush skirmisher. Olive-green skin (#7a8a4a body, #98a862 belly), ragged sand-colored loincloth. Wears a **cream turban with a turquoise gem** and one small horn poking through it. Sly amber-yellow eyes (#ffd23a), smug grin with small tusks. Carries a **leather sling** (a cord pouch) and keeps a spare stone in the off hand.

**Poses:**
- `walk_1` / `walk_2`: striding frames, legs swapped (like the imp's walk pair), sling arm hanging low on the right, spare stone visible in the left hand at waist height.
- `throw`: the wind-up — sling arm raised overhead, body leaning into the spin, sling cord extended up-right with the stone in the pouch. This pose is shown while the sling-star effect whirls overhead; the art itself should be a strong anticipation silhouette.
- `hit`: recoiling, eyes shut as ✕✕, sling arm flung back, turban askew.

**Animation states wired in code:** walk (2-frame procedural swap + bob + tilt), windup (throw pose with a spinning glint star above the head + rock-scale wobble), hit flash (150 ms), knockback, spawn smoke-pop, three random deaths (pop / spin / crumble — driven from the `hit` pose), hp bar (84→92 px wide above head).

**Where used:** waves 2 and 4; occasional wall summons. Stops at a random y between 640–900 (design px) and lobs stones.

**Hitbox:** circle centre (0, −64), r=48 relative to the feet anchor (in `ENEMIES.slinger`, `src/data/entities.ts`). Impact spark colour `0xa8c46a` (olive) — recolour if the final art changes the skin tone.
**Shadow:** engine-drawn ellipse, rx 82 / ry 21 source-box px.

---

### 1.2 نفتی‌دار — Bomber (`bomber_*`) — 3 poses

| File | Size | Anchor (ox, oy) | Atlas |
|---|---|---|---|
| `bomber_walk_1.png` | 320×320 | 0.5, 0.9 | enemies |
| `bomber_walk_2.png` | 320×320 | 0.5, 0.9 | enemies |
| `bomber_hit.png` | 320×320 | 0.5, 0.9 | enemies |

**Character:** a fat, waddling siege div — a walking catastrophe. Round belly, moss-green skin (#4a7a34 body, #649a48 belly), stubby legs, small malicious eyes glowing **toxic green (#b0ff5a)**, tusks. He hugs a **black-iron cauldron of glowing naphtha** against his front (toward the hero): riveted dark metal (#2a2a30), sloshing green-glow liquid (#8aff4a with #d8ffa0 highlights) spilling over the rim. The cauldron is his identity — it must read instantly.

**Poses:**
- `walk_1` / `walk_2`: heavy waddling steps, belly and cauldron shifting side to side (the code adds a sloshing tilt — keep the cauldron roughly centered).
- `hit`: staggering, cauldron tilting, naphtha splashing out, eyes shut.

**Animation states wired in code:** lurching walk (surging stride + slosh tilt), **fuse blink** (when lethal damage lights the fuse: whole-body tint flickers toward warm gold `0xffe08a`, speeding up as the blast nears; a green spark-star glints on the cauldron's rim), hit flash, knockback, spawn pop, deaths. The explosion itself is all engine FX (rings, dust, debris, flash) — no art needed.

**Where used:** wave 3 onwards; boss summons in armor phase and ash fury. On death its cauldron detonates: 270 px radius, 130 damage to **enemies** (chain reactions!), never hurts the hero. A **fire arrow** sets it off almost instantly.

**Hitbox:** circle centre (0, −92), r=64. Spark colour `0x7ad84a`.
**Shadow:** rx 104 / ry 26.

---

### 1.3 شبح — Wraith (`wraith_*`) — 3 poses

| File | Size | Anchor (ox, oy) | Atlas |
|---|---|---|---|
| `wraith_walk_1.png` | 320×320 | 0.5, 0.9 | enemies |
| `wraith_walk_2.png` | 320×320 | 0.5, 0.9 | enemies |
| `wraith_hit.png` | 320×320 | 0.5, 0.9 | enemies |

**Character:** a hooded spectre of a fallen div-cultist — pale, cold, half elsewhere. Body: pale cyan shroud (#9fd8e8) with darker hood and sleeves (#3f6a7a / #35586a), **no legs** — a trailing wisp tail of 3 ragged tongues instead of a lower body. Deep hood with two hollow glowing eyes (#c8fbff with dark pupils). Tattered sleeve-ribbons for arms. A faint inner glow (code overlays a soft additive glow; bake a subtle one if you like).

**Poses:**
- `walk_1` / `walk_2`: the wisp tail waves between the two frames (mirror the tongue offsets), sleeves drifting.
- `hit`: hood knocked back, eyes as ✕✕, tail whipping.

**Animation states wired in code (important):** the wraith **phases** — solid 2.5 s → shimmer warning 0.42 s (fast alpha flicker) → **ghost 1.7 s at 26 % alpha, untouchable** → back. While ghost, arrows pass through. **Fire pins it solid** while burning. The engine only changes alpha — the art must read clearly at 26 % opacity against the arena floor (strong silhouette, high interior contrast). Depth sorts with floor entities; engine adds a 12 px hover bob and 6° weave tilt.

**Where used:** wave 4; ash-fury summons. Drifts down on a slow weave, never hurries.

**Hitbox:** circle centre (0, −78), r=50. Spark colour `0x9fe8ff`.
**Shadow:** rx 74 / ry 16 (fainter than others — the engine fades it while ghost).

---

## 2. HAZARD PROJECTILES

### 2.1 `rock.png` — 96×96, anchor 0.5/0.5, atlas `enemies`

The slinger's stone: a small irregular grey chunk (#8a8a92, outline #3d3d44) with one or two crack lines. No glow (the engine adds a thin motion trail). Displayed at 52 px diameter (hit radius 26 design px). Spins fast (420°/s) in flight. **Must read at small size against the bright floor.**

### 2.2 `boulder.png` — 256×256, anchor 0.5/0.5, atlas `enemies`

The White Div's siege stone: a big jagged chunk torn from the arena wall — warm grey stone (#6e625a, facets #8a7c72 / #5a4f46) with **glowing purple div-magic cracks** (#b35cd1 / #8a3ab8) through it. The engine adds: a purple additive glow, a ground shadow that runs ahead of it, a pulsing red-gold warning ring at the landing spot, dust trail, and a heavy landing (dust + debris + shockwave ring). Displayed at 176 px diameter (hit radius 88). Can be **shot out of the air** (hp 60 — one charged shot); if it lands it **crushes enemies** within 150 px and staggers the hero's bow when close (never costs a heart).

---

## 3. REUSED / REPOSITIONED EXISTING ASSETS (no new art needed, but the design changed)

### 3.1 Braziers — now also *inside* the arena (`brazier.png` reused)

Two new braziers stand at **(215, 700)** and **(865, 640)** design px (left / right, upper third of the arena, clear of the pillars' shadow from the hero's bow — verified by ray tests). They are positioned so a shot at the top corners, or a bank shot off a side wall, **passes through the flame and the arrow catches fire**. `ARENA.fireRadius` = 108 design px around the flame tip is the ignition zone (see `FEEL.fire` for the look). If you paint a dedicated "arena brazier" variant later (a free-standing tripod brazier rather than a wall sconce), add a new manifest key and swap it only for these two entries in `ARENA.decor`.

### 3.2 Pots — now breakable (`pot.png` reused)

Three pots stand at (322, 640), (758, 788), (540, 1052). One arrow breaks each (`Pot` entity, `src/entities/Pot.ts`); the arrow flies on ('pass' — a pot never shields an enemy). Each hides coins (50 %), a **سه‌تیر** triple-shot bundle (28 %), or a heart (22 %), rolled per run. The break itself is engine FX (dust + clay debris + shatter sfx); the pickups are engine-drawn (heart art / gold-tinted arrow art). If you want a distinct "breakable pot" look (e.g. cracked clay, a glinting lid), add `pot_breakable.png` as a new manifest key — the positions are in `ARENA.pots`.

---

## 4. TEMPORARY / PROCEDURAL (NO FILE NEEDED — listed so you know what is NOT hand-drawn)

These are generated at runtime or drawn from data; replace them only if you want bespoke art:

| What | Currently | Notes |
|---|---|---|
| Omen grade tints (فال لشکر) | Code gradient (`vGradientTex`) + multiply overlay | Optional: a subtle per-omen particle set or sky variant could be added later; the system only reads `OmenDef.grade` colours from `src/data/omens.ts`. |
| Fire-arrow look | Arrow sprite tinted `0xffb060` + flame trail particles | Optional: a dedicated flaming-arrow sprite variant could replace the tint. |
| Burning enemies | Body tint `0xff9a4a` + flame licks | No frames needed. |
| Triple-shot pips (HUD) | Three small gold-tinted `arrow` sprites + count | Could become a little سه‌تیر medallion icon later. |
| Combo words (تیغ/تندر/طوفان/افسانه/درفش) | Live gradient text (`surprises.call`) | Designed as calligraphy stamps; optionally a stamped-seal art could sit behind the word. |
| Speed lines (full draw) | `fx_speedlines` runtime texture | Fine as-is. |
| Boulder warning ring / hazards glow | `fx_ring` / `fx_glow` runtime textures | Fine as-is. |
| Pickup flight icons | `ui_heart_full` art / gold `arrow` | Fine as-is. |
| Ash-fury boss tint & grade | Body tint `0xffd8c0` + red grade overlay (`FEEL.boss.fury`) | Optional: a cracked-magma skin variant of the boss would be gorgeous — would need `boss_fury` pose keys; the code reads `FEEL.boss.fury` only, so this is a later, optional art pass. |
| Title omen parchment | `parchmentTex` + live text | Fine as-is. |

---

## 5. PRE-EXISTING PLACEHOLDERS (unchanged from before, still replacement-needed)

These were already placeholder-drawn before the M6 upgrade and remain so (the console's `[assets]` warning lists every one):

`hero_hurt` (512², atlas hero — falls back to `hero_idle` + red flash until provided: tilted hero, arms flung, red tunic).

Everything else already has real art committed in `assets-src/` (hero idle/draw/full, imp ×3, shield ×3, flyer ×3, boss ×3, pillar, arrow, brazier, banner, pot, all UI, card_bg).

---

## 6. REPLACEMENT CHECKLIST

1. Paint the PNG at the exact source size (or larger with the same aspect — the packer resizes with a warning; exact size is best).
2. Save to `assets-src/<key>.png` (filename = manifest key).
3. `npm run assets` (add `--force` to repack everything). The console's "missing" list should shrink.
4. `npm run anchors [-- --sheet]` — paste the printed `ART_ANCHORS` lines into `src/data/entities.ts` so the feet land exactly on the floor and walk frames don't jitter. A pose can be mirrored there (`flip: true`).
5. Toggle the debug overlay (`` ` `` or 3-finger tap; `?debug=1` in the URL) and check: hitboxes (circle), hp-bar height, shadow size, and that nothing overlaps weirdly at the spawn line.
6. New enemy types: play a wave with them (`?debug=1`, then keys **U** slinger, **V** bomber, **Y** wraith, **X** boulder, **T** سه‌تیر, **O** cycle the day's omen) and watch each behaviour: wind-up → lob, fuse → blast → chain, solid → shimmer → ghost.
7. If the final art's proportions differ strongly from the placeholder (e.g. a much taller slinger), tune `ENEMIES.<type>` hitboxes / `hpBar` / `shadow` in `src/data/entities.ts` — **never** the other way around.

*Tuning lives in `BALANCE.enemies.<type>` (gameplay) and `FEEL.slinger/bomber/wraith` (look & motion) — no code changes are ever needed for pure art swaps.*
