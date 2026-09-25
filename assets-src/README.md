# assets-src — source art (not shipped)

Drop PNGs here using the **exact filenames** below. Sub-folders are optional: files are matched by name only.
While `npm run dev` is running, adding, replacing or deleting a file repacks the art and reloads the page automatically.
Otherwise run `npm run assets` (it also runs as part of `npm run build`).

Any file that is missing is drawn as a placeholder with the same key, size and anchor, so real art drops in with no code changes.
If a file's size differs from the size listed here, the packer warns and resizes it (keeping the aspect ratio, padding with transparency).

| File | Size | Anchor (origin) | Packed into |
|---|---|---|---|
| `bg_arena_01.png` | 1080×1920, no alpha | top-left | standalone WebP q80 (+ JPG fallback) |
| `hero_idle` / `hero_draw` / `hero_full` / `hero_hurt` | 512×512 | feet: 0.5, 0.9 | atlas `hero` |
| `imp_walk_1` / `imp_walk_2` / `imp_hit` | 256×256 | feet: 0.5, 0.9 | atlas `enemies` |
| `shield_walk_1` / `shield_walk_2` / `shield_hit` | 384×384 | feet: 0.5, 0.9 | atlas `enemies` |
| `flyer_up` / `flyer_down` / `flyer_hit` | 320×320 | centre: 0.5, 0.5 | atlas `enemies` |
| `boss_idle` / `boss_roar` / `boss_stunned` | 1024×1024 | knuckles: 0.5, 0.86 | atlas `boss` |
| `pillar_01` | 256×640 | base: 0.5, 0.95 | atlas `propsui` |
| `arrow` (pointing right) | 256×64 | tip: 0.88, 0.5 | atlas `propsui` |
| `brazier` | 256×256 | base: 0.5, 0.9 | atlas `propsui` |
| `banner` | 256×512 | top: 0.5, 0.05 | atlas `propsui` |
| `pot` | 192×192 | base: 0.5, 0.9 | atlas `propsui` |
| `ui_bossbar_frame` | 1024×342 (3:1) | centre | atlas `propsui` |
| `ui_heart_full` / `ui_heart_empty` | 128×128 | centre | atlas `propsui` |
| `ui_btn_pause` | 160×160 | centre | atlas `propsui` |
| `ui_toast_frame` | 640×160 | centre | atlas `propsui` |
| `ui_combo_badge` | 256×256 | centre | atlas `propsui` |
| `card_bg.png` | 1080×1920, no alpha | top-left | standalone (loaded lazily) |

The source of truth is `src/assets/manifest.ts`. Hitboxes are **not** derived from the images; they live in `src/data/entities.ts` and `src/data/arena.ts`.
No text in images: all text is rendered by the game.
