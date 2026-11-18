# سامانی — کتابخانهٔ بخارا (the Library of Bukhara)

The fourth era: four waves through a burning library, then the **دیو کتاب‌سوز** (Book-Burning Div),
who starts behind his armour. The way in is fire.

## The loop

1. **A lamp flame lights the arrow.** The arena's braziers already did this (existing
   `ProjectileSystem.fireZones`); the era adds a third brass reading lamp on the central line under
   the Div, so one straight shot can pass through fire and still reach his chest.
2. **A fire arrow that hits the Div burns the parchment off his ink heart** for 3.6 s
   (`LIBRARY.exposeMs`). While it is open, a normal arrow through the chest gem counts as critical:
   it gets past the armour and stuns him (`BossBrain` armour/stun, reused unchanged).
3. **He breathes cold and snuffs a lamp** every 9.5–13.5 s while armoured. The player either changes
   their shooting angle to another lit lamp, or sends a fire arrow into the dark lamp to relight it.
   Lamps also relight themselves after 9 s, so a bad snuff is never a dead end.

The golden arrow through the gem remains the skilled alternative — it always opens the armour. The
lamp route is the era's readable, lower-precision path that rewards reading the room.

## Making it discoverable in play

No tutorial wall. Four one-shot HUD toasts fire at the moment each idea becomes relevant:

| When | Toast |
| --- | --- |
| The aim line first crosses a lit lamp (which also **flares that lamp**) | تیر آتش می‌گیرد — از شعلهٔ چراغ رد شو، بعد به دیو بزن |
| An arrow bounces off his armour | قلب دیو بسته است — تیر آتشین به او بزن تا قلبش باز شود |
| First cold breath | نفس سرد دیو — چراغ خاموش شد… |
| First relight | چراغ دوباره روشن شد — آتش را به چراغ‌های خاموش برسان |

The era's `rule` line is also shown at run start: «تیر از شعلهٔ چراغ آتش می‌گیرد؛ تیر آتشین قلب دیو
را می‌گشاید».

## Why these choices (design references)

- **Fire arrows + braziers** (Zelda): the series teaches "shoot through the flame, then at the
  target" with braziers placed in the sightline. Our third lamp sits exactly on the boss line for the
  same reason — the mechanic teaches itself on the first shot.
- **Removing the aim tax** (Breath of the Wild lets you hold an arrow to a flame instead of requiring
  a precise pass): the aim flare and the generous lamp radius (`ARENA.fireRadius`) are that lesson —
  the player should never lose the fire because their line was 10 px off.
- **Puzzle structure: teach → combine → test** (Ocarina of Time's torch rooms): wave 1 has the lamps
  on screen while nothing threatens them; the boss then removes one, which is the test.
- **Feedback must explain itself** (light-beam reflection write-ups): the lamp flares as the aim line
  crosses it, so the affordance is visible before the shot, not inferred after it.
- **Discovery over instruction** (Moon Fields / "light four torches" critiques): hints appear only in
  response to something the player just did (a bounce, a snuff), never as a prerequisite to act.

## Files

- `src/systems/libraryRules.ts` — pure `LampBank`, `WardWindow`, `SnuffClock`, `lampOnRay` (unit
  tested, no Phaser).
- `src/data/lamps.ts` — the era's decor: the two in-arena braziers flagged `lamp`, plus the reading
  lamp at (540, 905).
- `src/systems/LibraryLamps.ts` — lamp state, fire zones, snuff/relight FX, aim flare.
- `src/systems/BookWard.ts` — the Div's cold-breath cadence, the exposure, and the four hints.
- `src/entities/Boss.ts` — `exposeWeak()`, `weakOpen`, the weak-hit rule and the ink-heart aura.
- `src/entities/Decor.ts` — a brazier can be put out and relit (`Brazier.setLit/flare`).
