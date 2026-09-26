# سفارش تصاویر عصرها — درفش

این فایل همهٔ تصاویری را که برای عصرهای بعدی لازم است، با **نام دقیق فایل، اندازه و پرامپت ساخت تصویر** فهرست می‌کند.
تا وقتی تصویر واقعی یک عصر آماده نشده، بازی خودش از روی تصاویر عصر اول یک «تصویر آزمایشی» رنگ‌شده می‌سازد، پس بازی همیشه قابل اجراست.

---

## ۰. چطور کار می‌کند

1. هر عصر یک **پیشوند** دارد: عصر ۲ = `e2_`، عصر ۳ = `e3_` … عصر ۸ = `e8_`.
2. نام فایل = پیشوند + نام همان تصویر در عصر اول. مثال: پهلوانِ ایستادهٔ عصر اشکانی → `e2_hero_idle.png`.
3. فایل را در پوشهٔ `assets-src/` بگذار و `npm run assets` را اجرا کن. **بدون هیچ تغییری در کد** در بازی ظاهر می‌شود.
4. هر تصویری که نباشد، نسخهٔ آزمایشی رنگ‌شده جایش نشان داده می‌شود. پس می‌توانی تصاویر را **یکی‌یکی** اضافه کنی.
5. بعد از اضافه کردن کاراکترها، `npm run anchors` را بزن و خطوطی را که چاپ می‌کند در `ART_ANCHORS` داخل `src/data/entities.ts` بگذار تا پاها دقیق روی زمین بنشینند.
6. برای دیدن یک عصر بدون باز کردنش: آدرس بازی + `?era=2` (یا `?era=parthian`).

### ترتیب پیشنهادی ساخت (بیشترین اثر با کمترین کار)

| اولویت | چه چیزی | چرا |
|---|---|---|
| ۱ | `bg_arena_01` (زمین) | نیمی از حس عصر همین یک تصویر است |
| ۲ | `boss_idle` ، `boss_roar` ، `boss_stunned` | غول آخر، هویت هر عصر |
| ۳ | `hero_idle` ، `hero_draw` ، `hero_full` ، `hero_hurt` | پهلوان که «بروز» می‌شود |
| ۴ | `imp_*` ، `shield_*` ، `flyer_*` | دشمن‌هایی که بیشتر دیده می‌شوند |
| ۵ | `slinger_*` ، `bomber_*` ، `wraith_*` | دشمن‌های ویژه |
| ۶ | `pillar_01` ، `banner` ، `brazier` ، `pot` ، `arrow` ، `rock` ، `boulder` | اشیای میدان |

---

## ۱. جدول ثابت اندازه‌ها (برای همهٔ عصرها یکی است)

| فایل (بدون پیشوند) | اندازه (px) | نکته |
|---|---|---|
| `bg_arena_01` | 1080×1920 | پس‌زمینهٔ کامل، **بدون** شفافیت. چیدمان باید ثابت بماند (بخش ۲) |
| `hero_idle` · `hero_draw` · `hero_full` · `hero_hurt` | 512×512 | پهلوان **از پشت**، رو به بالای صفحه |
| `imp_walk_1` · `imp_walk_2` · `imp_hit` | 256×256 | دشمن سبک، رو به دوربین |
| `shield_walk_1` · `shield_walk_2` · `shield_hit` | 384×384 | سپردار، سپر بزرگ در دست |
| `flyer_up` · `flyer_down` · `flyer_hit` | 320×320 | پرنده، بال بالا / بال پایین |
| `slinger_walk_1` · `slinger_walk_2` · `slinger_throw` · `slinger_hit` | 256×256 | پرتاب‌گر |
| `bomber_walk_1` · `bomber_walk_2` · `bomber_hit` | 320×320 | انفجاری، ظرف/بمب جلوی شکم |
| `wraith_walk_1` · `wraith_walk_2` · `wraith_hit` | 320×320 | شبح، بدون پا، باید در ۲۶٪ شفافیت هم خوانا باشد |
| `boss_idle` · `boss_roar` · `boss_stunned` | 1024×1024 | غول، **فقط نیم‌تنهٔ بالا**، دو دست روی لبهٔ دیوار |
| `pillar_01` | 256×640 | ستون وسط میدان (تیر از آن کمانه می‌کند) |
| `banner` | 256×512 | درفش آویخته، از بالا آویزان |
| `brazier` | 256×256 | آتشدان (تیر از شعله‌اش آتشین می‌شود) |
| `pot` | 192×192 | کوزهٔ شکستنی |
| `arrow` | 256×64 | تیر افقی، نوک به سمت **راست** |
| `rock` | 96×96 | سنگِ پرتاب‌گر |
| `boulder` | 256×256 | صخرهٔ بزرگ غول |

**هر عصر = ۳۴ فایل.**

---

## ۲. قواعد مشترک همهٔ تصاویر

### سبک (اول هر پرامپت کاراکتر بگذار)

```
STYLE: Detailed painterly cartoon game sprite, thick dark outlines, rich warm shading, ornate gold trim,
Persian-inspired decorative details, slightly heroic chibi proportions (big head, readable on a phone),
single static pose, full body, centered, transparent background, no ground shadow, no text, no frame.
```

> بهترین نتیجه: تصویر عصر اول همان کاراکتر را هم به‌عنوان **تصویر مرجع** به هوش مصنوعی بده تا زاویه، اندازه و حجم یکی بماند.

### زاویه‌ها

- **پهلوان:** از پشت (نمای ۳/۴ پشت)، رو به بالای صفحه، کمان در دست چپ. مثل `hero_draw.png` فعلی.
- **دشمن‌ها:** رو به دوربین (پایین صفحه)، نمای ۳/۴ جلو.
- **غول:** از جلو، فقط از کمر به بالا، دو دست باز روی لبهٔ دیوار (بند انگشت‌ها پایین تصویر)، چشم‌های درخشان.
- حرکت (راه رفتن، تاب خوردن) را **نکش**؛ کد خودش حرکت می‌دهد. هر فایل یک ژست ثابت است.

### پسوند ژست‌ها (بعد از توصیف کاراکتر اضافه کن)

| ژست | پسوند انگلیسی |
|---|---|
| `hero_idle` | `seen from behind in 3/4 back view facing up-screen, standing ready, bow held low in the left hand, relaxed heroic stance` |
| `hero_draw` | `seen from behind in 3/4 back view facing up-screen, bow raised in the left hand, right hand reaching back to draw, mid-draw tension` |
| `hero_full` | `seen from behind in 3/4 back view facing up-screen, bow fully drawn, arrow nocked and glowing, whole body coiled with power` |
| `hero_hurt` | `seen from behind in 3/4 back view, recoiling from a hit, body tilted, arms flung out, bow still gripped` |
| `*_walk_1` / `*_walk_2` | `facing the camera, mid-stride` (در walk_2 پاها برعکس walk_1) |
| `*_hit` | `recoiling from a hit, eyes shut as X X, head thrown back` |
| `flyer_up` / `flyer_down` | `hovering, wings raised high` / `hovering, wings swept down` |
| `slinger_throw` | `throwing arm raised overhead, leaning into the throw, projectile ready` |
| `boss_idle` | `front view, waist-up only, both hands resting on a stone parapet at the bottom edge, glaring, glowing eyes` |
| `boss_roar` | `front view, waist-up only, hands slammed on the parapet, mouth wide open roaring, veins glowing` |
| `boss_stunned` | `front view, waist-up only, slumped on the parapet, eyes spiralling, tongue out, small stars around the head` |

### پس‌زمینه: چیدمان ثابت (خیلی مهم)

تیرها از دیوارها و ستون‌ها کمانه می‌کنند؛ این برخوردها در کد به مختصات ثابت بسته شده‌اند. پس **هر زمین جدید باید همان چیدمان `bg_arena_01` را داشته باشد** (بهترین راه: تصویر عصر اول را به‌عنوان مرجع بده و فقط «سبک و دوره» را عوض کن):

- دیوار چپ در x≈125 و دیوار راست در x≈955؛ دیوار بالا در y≈300 (غول پشت آن است، وسط، بین دو نقش برجسته).
- کف روشن و باز بین y=345 تا y=1440 (دشمن‌ها روی آن راه می‌روند).
- سکوی گرد پهلوان پایین وسط: مرکز (540, 1652)، شعاع ≈240.
- **ستون‌ها و آتشدان‌ها و کوزه‌ها را در زمینه نکش** (جدا کشیده می‌شوند). جای ستون‌ها: (262, 1150) و (818, 1330).
- نور از بالا-چپ.

```
ARENA: Top-down 3/4 view of a vertical game arena (1080x1920 portrait), same layout as the reference image:
a high wall across the top third with a central gap where a giant waits, two decorative reliefs flanking it,
side walls on the left and right edges, an open flat floor in the middle, a round ornate platform at the bottom
centre for the hero. No characters, no pillars, no pots, no braziers on the floor. Soft light from the top-left.
Painterly detailed game background, warm and readable, floor slightly brighter than the edges.
```

---

## ۳. عصر ۱ — هخامنشی (۱۳ فایل باقی‌مانده، بدون پیشوند)

> با این‌ها عصر اول کامل می‌شود. نام فایل‌ها **بدون پیشوند** است.

| فایل | پرامپت (بعد از STYLE) |
|---|---|
| `slinger_walk_1` / `_2` / `_throw` / `_hit` | `Lean wiry desert demon, olive-green skin, ragged sand-coloured loincloth, cream turban with a turquoise gem and one small horn poking through, sly amber eyes, smug grin with small tusks, leather sling in the right hand, spare stone in the left hand.` + پسوند ژست |
| `bomber_walk_1` / `_2` / `_hit` | `Fat waddling siege demon, round belly, moss-green skin, stubby legs, small glowing toxic-green eyes, tusks, hugging a riveted black-iron cauldron of glowing green naphtha that spills over the rim.` + پسوند (در hit: `cauldron tilting, naphtha splashing`) |
| `wraith_walk_1` / `_2` / `_hit` | `Hooded spectre of a fallen demon cultist, pale cyan shroud, dark teal hood and sleeves, no legs — a trailing wisp tail of three ragged tongues, two hollow glowing cyan eyes in a deep hood, tattered sleeve ribbons, very strong silhouette.` + پسوند |
| `hero_hurt` | توصیف پهلوان فعلی: `Young Persian archer hero, golden domed helmet with a long turquoise plume, royal-blue tunic with golden lions, red sash, cream trousers, brown boots, golden bow with turquoise inlays, quiver on the back.` + پسوند `hero_hurt` |
| `rock` | `Small irregular grey stone chunk with one or two crack lines, no glow, readable at tiny size.` |
| `boulder` | `Big jagged chunk of warm grey wall stone with glowing purple magic cracks running through it.` |

**هویت دشمن‌های عصر ۱ (برای متن‌ها و داستان):** دیوزاد (`imp`)، سپردیو (`shield`)، کرکس‌دیو (`flyer`)، فلاخن‌دیو (`slinger`)، نفت‌دیو (`bomber`)، سایه‌دیو (`wraith`)، و غول: **دیو سپید**.

---

## ۴. عصر ۲ — اشکانی (`e2_`) · ۲۴۷ پیش از میلاد · دشت‌های پارت

**حس عصر:** دشت باز، گرد و خاک طلایی، سوارکاران کماندار، چادرهای نمدی، قلعه‌های خشتی. رنگ‌ها: خاکی، اخرایی، قرمز سفالی، سبز زیتونی.
**قانون عصر در بازی:** باد دشت (تیرها کمی منحرف می‌شوند) و دشمنان تندتر.

```
ERA 2 PALETTE: dusty ochre, terracotta red, olive green, sand gold, felt brown; Parthian steppe, 3rd century BC.
```

| فایل | پرامپت (STYLE + این + پسوند ژست) |
|---|---|
| `e2_bg_arena_01` | ARENA + `Parthian steppe fortress courtyard: mud-brick walls with crenellations, felt tents and horse banners along the side walls, two carved reliefs of mounted archers flanking the central gap, dusty sand-and-stone floor with scattered straw, a round platform of fired bricks with a sun motif. Dusty golden afternoon light.` |
| `e2_hero_*` | `Young Parthian horse-archer hero: pointed felt cap (Parthian tiara) with a golden band and a red streamer, scaled leather jerkin over a long ochre tunic, baggy trousers tucked into soft boots, recurve composite bow, gorytos (bow-case quiver) on the hip, flowing red scarf.` |
| `e2_imp_*` | **سوار‌دیوچه:** `Small mischievous steppe demon, dusty-orange skin, wearing a felt cap too big for him, riding-crop in hand, bandy legs as if always on horseback, cheeky grin, tiny horns.` |
| `e2_shield_*` | **سپردار پارتی:** `Heavy steppe demon warrior, dark-red skin, scale-mail coat, big round wicker-and-leather shield painted with a sun, short spear, horned iron helmet with cheek guards.` |
| `e2_flyer_*` | **شاهین‌دیو:** `Demon falcon with leathery wings and bronze feathers, hooked golden beak, red jesses on its legs, fierce yellow eyes.` |
| `e2_slinger_*` | **کمان‌دیو سوار:** `Wiry demon horse-archer on foot, sand-coloured skin, felt cap, short recurve bow instead of a sling, a flaming arrow ready, quiver on the hip.` (throw: `drawing the bow upward`) |
| `e2_bomber_*` | **مشک‌دیو:** `Fat demon hugging a huge leather waterskin bulging with glowing green naphtha, tied with rope, drips leaking, felt vest, toxic-green eyes.` |
| `e2_wraith_*` | **روح دشت:** `Ghost of a fallen rider made of swirling dust and sand, tattered felt cloak, glowing amber eyes, lower body dissolving into a sand trail.` |
| `e2_boss_*` | **اژدهای دشت:** `Giant three-horned steppe dragon, waist-up behind the wall, sand-coloured scales with terracotta belly plates, a mane of red horsehair, bronze rings on its horns, glowing ember eyes, smoke curling from its nostrils, clawed hands gripping the parapet.` |
| `e2_pillar_01` | `Mud-brick and timber pillar wrapped in red felt, a horse-skull ornament at the top, 256x640, base at the bottom.` |
| `e2_banner` | `Parthian war banner: dark red felt with a golden galloping horse, fringed bottom, hanging from a wooden crossbar.` |
| `e2_brazier` | `Bronze tripod fire bowl with horse-head legs, glowing coals, no flame (flame is added by the game).` |
| `e2_pot` | `Rustic terracotta storage jar with a rope handle and a wax-sealed lid.` |
| `e2_arrow` | `Parthian arrow, horizontal, point to the right, bronze trilobate head, red-dyed fletching.` |
| `e2_rock` | `Small sun-baked clay ball.` |
| `e2_boulder` | `Chunk of mud-brick fortress wall with glowing purple cracks.` |

---

## ۵. عصر ۳ — ساسانی (`e3_`) · ۲۲۴ میلادی · ایوان مدائن

**حس عصر:** طاق کسری، گچ‌بری، سواره‌نظام زره‌پوش (کاتافراکت)، آتشکده، ابریشم ارغوانی. رنگ‌ها: ارغوانی، طلایی، سفید گچی، سبز یشمی.
**قانون پیشنهادی:** زره‌پوشان — فقط تیر طلایی زره را می‌شکند.

```
ERA 3 PALETTE: royal purple, gold, stucco white, jade green, deep crimson; Sasanian palace, 3rd–7th century.
```

| فایل | پرامپت |
|---|---|
| `e3_bg_arena_01` | ARENA + `Sasanian palace courtyard before the great arch of Ctesiphon, carved stucco walls with rosettes and winged ribbons, two reliefs of armoured kings on horseback, fire-temple niches in the side walls, polished stone floor with inlaid geometric bands, a round platform with a winged-crown emblem.` |
| `e3_hero_*` | `Sasanian noble archer: tall winged crown-helmet with ribbons (korymbos style), shimmering mail over a purple silk tunic with pearl borders, flowing ribbons at the shoulders, heavy composite bow, gold-plated quiver.` |
| `e3_imp_*` | **دیوک درباری:** `Small palace demon in an oversized purple silk robe and a crooked crown, carrying a stolen goblet, big ears, sly smile.` |
| `e3_shield_*` | **زره‌دیو کاتافراکت:** `Massive demon cataphract: full lamellar armour head to toe, face-mask helmet, tall oval shield with a simurgh emblem, long lance.` |
| `e3_flyer_*` | **سنمورو‌دیو:** `Demon version of the Senmurv (dog-headed peacock-tailed creature) with dark wings, snarling dog face, iridescent purple tail.` |
| `e3_slinger_*` | **منجنیق‌دیو:** `Demon engineer carrying a small hand-catapult on his shoulder, leather apron, goggles of polished bronze, bag of stones.` |
| `e3_bomber_*` | **آتش‌دیو آتشکده:** `Fat demon carrying a stolen fire-altar urn blazing with green fire, smoke pouring out, singed robes.` |
| `e3_wraith_*` | **شبح مغ:** `Ghost of a corrupted priest in white robes and a padam mouth-veil, glowing violet eyes, lower body fading into incense smoke.` |
| `e3_boss_*` | **ضحاک ماردوش:** `The tyrant Zahhak, waist-up behind the wall: crowned king with a cruel face, two huge black serpents growing from his shoulders, hissing, purple royal robes torn, gold jewellery, glowing green eyes (the snakes' eyes glow too), clawed hands gripping the parapet.` |
| `e3_pillar_01` | `White stucco column with a bull-headed capital and carved vine bands.` |
| `e3_banner` | `Derafsh Kaviani-style banner: purple and gold cloth with a four-pointed star, jewelled tassels.` |
| `e3_brazier` | `Stone fire-altar with a stepped base, glowing coals.` |
| `e3_pot` | `Silver-gilt amphora with a dancing-figure frieze.` |
| `e3_arrow` | `Heavy armour-piercing arrow, horizontal, point right, long iron bodkin head, white fletching.` |
| `e3_rock` | `Polished catapult stone.` |
| `e3_boulder` | `Carved stucco block with glowing purple cracks.` |

---

## ۶. عصر ۴ — سلجوقی (`e4_`) · ۱۰۳۷ میلادی · کاروانسرای کویر

**حس عصر:** کاروانسرا، آجرکاری هندسی، گنبدهای فیروزه‌ای، شتر و بازار، طوفان شن. رنگ‌ها: آجری، فیروزه‌ای، کرم، مسی.
**قانون پیشنهادی:** طوفان شن — میدان هر چند ثانیه تیره و روشن می‌شود.

```
ERA 4 PALETTE: baked-brick tan, turquoise, cream, copper, indigo night accents; Seljuk caravanserai, 11th century.
```

| فایل | پرامپت |
|---|---|
| `e4_bg_arena_01` | ARENA + `Seljuk caravanserai courtyard in the desert: geometric brick-pattern walls, a great iwan with turquoise tile muqarnas at the top centre, arched cells along the side walls with carpets and copper lamps, sand-drifted brick floor, a round platform of star-and-cross tiles.` |
| `e4_hero_*` | `Seljuk ghulam archer: conical steel helmet with a turban wrapped around it and a mail aventail, quilted kaftan in indigo with turquoise borders, curved sabre at the hip, powerful recurve bow, thumb-ring on the right hand.` |
| `e4_imp_*` | **دیو بازاری:** `Small thieving bazaar demon with a stolen rug over his shoulder, pointed slippers, gold coins falling from his pockets.` |
| `e4_shield_*` | **دیو قلعه‌بان:** `Hulking demon guard in a brass-studded kite-shaped shield covered in Kufic patterns, mail shirt, spiked turban helmet, heavy mace.` |
| `e4_flyer_*` | **غول‌کرکس کویر:** `Bald desert vulture demon with ragged black wings and a copper collar, bone beak.` |
| `e4_slinger_*` | **نفت‌انداز:** `Demon grenadier throwing clay naphtha grenades (round, spiked clay pots), soot-stained, scarf over his mouth.` |
| `e4_bomber_*` | **شترِ دیو:** `Fat demon riding / hugging a barrel of Greek fire strapped with copper bands, fuse smoking, glowing green eyes.` |
| `e4_wraith_*` | **غول بیابانی (سراب):** `Mirage ghoul made of shimmering heat haze, tattered caravan cloak, hollow glowing eyes, legs dissolving into blowing sand.` |
| `e4_boss_*` | **غول بیابان:** `Colossal sand ghoul, waist-up behind the wall: body made of cracked desert stone and swirling sand, bone jewellery, a caravan's broken wheel as a necklace, glowing turquoise gem in the chest, hands gripping the parapet.` |
| `e4_pillar_01` | `Round brick minaret-style pillar with turquoise tile bands and Kufic calligraphy.` |
| `e4_banner` | `Caravan banner: indigo cloth with a golden double-headed eagle, fringed.` |
| `e4_brazier` | `Copper lantern-brazier with pierced star patterns.` |
| `e4_pot` | `Turquoise-glazed pottery jar.` |
| `e4_arrow` | `Arrow with a naphtha-wrapped tip (unlit), horizontal, point right.` |
| `e4_rock` | `Small clay naphtha grenade.` |
| `e4_boulder` | `Brick chunk of a minaret with glowing purple cracks.` |

---

## ۷. عصر ۵ — صفوی (`e5_`) · ۱۵۰۱ میلادی · میدان نقش جهان

**حس عصر:** کاشی فیروزه‌ای، مینیاتور، گنبد، باغ ایرانی، تفنگ فتیله‌ای کنار کمان. رنگ‌ها: فیروزه‌ای، لاجوردی، زرد زعفرانی، سبز باغ.
**قانون پیشنهادی:** کاشی‌های جادویی — تیر از نقش‌های کف کمانه می‌کند.

```
ERA 5 PALETTE: turquoise, lapis blue, saffron yellow, garden green, rose pink; Safavid Isfahan, 16th century.
```

| فایل | پرامپت |
|---|---|
| `e5_bg_arena_01` | ARENA + `Naqsh-e Jahan square in Isfahan as an arena: a turquoise-tiled mosque portal and dome at the top centre, two-storey arcades along the side walls, a long reflecting pool pattern in the floor, flower beds at the edges, a round platform of floral haft-rang tiles.` |
| `e5_hero_*` | `Safavid Qizilbash archer: red baton-turban (taj) with twelve folds, lapis-blue brocade coat with gold floral patterns, sash, composite bow in a jewelled case, a matchlock musket slung on the back as decoration.` |
| `e5_imp_*` | **دیو مینیاتوری:** `Small demon painted like a Persian miniature figure: flat vivid colours, curly moustache, striped trousers, carrying a stolen pomegranate.` |
| `e5_shield_*` | **دیو تفنگ‌دار:** `Big demon musketeer behind a tall wooden mantlet shield with painted tiles, bandolier, matchlock musket, plumed helmet.` |
| `e5_flyer_*` | **دیو طاووس:** `Demon peacock with an enormous turquoise tail full of glowing eye-spots, sharp golden crest.` |
| `e5_slinger_*` | **دیو کاشی‌انداز:** `Demon tile-maker throwing spinning ceramic tiles like shuriken, apron covered in glaze, stack of tiles under his arm.` |
| `e5_bomber_*` | **دیو باروت‌کش:** `Fat demon hugging a large gunpowder keg with a lit fuse, sparks, embroidered vest.` |
| `e5_wraith_*` | **روح نقاش:** `Ghost made of flowing ink and gold leaf, like a miniature painting come alive, brush-stroke tail, glowing gold eyes.` |
| `e5_boss_*` | **اکوان دیو:** `Akvan Div, waist-up behind the wall: huge wild-haired demon with a long face, spotted leopard-like skin, curling horns, gold earrings, a tile-crown, grinning, whirlwind swirling around him, hands gripping the parapet.` |
| `e5_pillar_01` | `Slim wooden talar column with a muqarnas capital and mirror-work.` |
| `e5_banner` | `Safavid standard: green silk with a golden sun-lion, brass finial.` |
| `e5_brazier` | `Brass samovar-shaped fire lamp with tile inlays.` |
| `e5_pot` | `Blue-and-white Safavid ceramic vase.` |
| `e5_arrow` | `Elegant arrow with gold-painted shaft and peacock fletching, horizontal, point right.` |
| `e5_rock` | `Small spinning ceramic tile.` |
| `e5_boulder` | `Chunk of a tiled dome with glowing purple cracks.` |

---

## ۸. عصر ۶ — قاجار (`e6_`) · ۱۷۸۹ میلادی · تهران قدیم

**حس عصر:** شمس‌العماره، ساعت و چرخ‌دنده، شیشه‌های رنگی، لباس نظامی قاجاری، فانوس. رنگ‌ها: صورتی قاجاری، زرد طلایی، سبز تیره، قهوه‌ای.
**قانون پیشنهادی:** دیوهای کوکی — هر چند ثانیه زمان برای دشمن‌ها می‌ایستد.

```
ERA 6 PALETTE: Qajar rose pink, mustard gold, dark green, walnut brown, stained-glass colours; Qajar Tehran, late 18th–19th century.
```

| فایل | پرامپت |
|---|---|
| `e6_bg_arena_01` | ARENA + `Qajar palace courtyard in old Tehran: a clock tower (Shams-ol-Emareh style) at the top centre, rose-tiled walls with painted flowers, orosi stained-glass windows along the side walls, stone floor with a star fountain pattern, a round platform with a lion-and-sun mosaic.` |
| `e6_hero_*` | `Qajar-era archer-guardian: tall black lambskin hat with a small jewelled plume, dark-green military frock coat with gold epaulettes and frogging, wide belt, a steel crossbow-bow hybrid, handlebar moustache.` |
| `e6_imp_*` | **دیو کوکی:** `Small clockwork demon made of brass with a wind-up key in its back, gear eyes, puffing steam, springy legs.` |
| `e6_shield_*` | **دیو قزاق:** `Big demon soldier in a Qajar Cossack uniform, huge riveted iron shield with a lion-and-sun, sabre.` |
| `e6_flyer_*` | **دیو بادبادکی:** `Demon riding a kite / clockwork bat with brass wings and a ticking heart.` |
| `e6_slinger_*` | **دیو ساعت‌انداز:** `Demon throwing small pocket-watch bombs, monocle, waistcoat full of watches.` |
| `e6_bomber_*` | **دیو سماور:** `Fat demon hugging a huge boiling samovar about to burst, steam jets, green glow.` |
| `e6_wraith_*` | **شبح عکس قدیمی:** `Ghost that looks like a sepia old photograph come alive, cracked edges, flickering, lower body fading into film grain.` |
| `e6_boss_*` | **دیو ساعت‌ساز:** `Giant clockmaker demon, waist-up behind the wall: half flesh, half brass machinery, a clock face in his chest, magnifying-lens eye, gear shoulders, steam pipes, hands of brass gripping the parapet.` |
| `e6_pillar_01` | `Cast-iron lamp-post pillar with painted tiles at the base.` |
| `e6_banner` | `Qajar lion-and-sun flag, green-white-red, gold fringe.` |
| `e6_brazier` | `Ornate oil street-lamp.` |
| `e6_pot` | `Painted Qajar ceramic jug with a rose pattern.` |
| `e6_arrow` | `Steel crossbow bolt, horizontal, point right.` |
| `e6_rock` | `Small ticking pocket-watch bomb.` |
| `e6_boulder` | `Chunk of the clock tower with glowing purple cracks.` |

---

## ۹. عصر ۷ — امروز (`e7_`) · ۱۴۰۵ خورشیدی · پشت‌بام‌های شهر

**حس عصر:** شهر امروزی، پشت‌بام، برج میلاد در افق، نئون و کولر آبی، پهپاد. همه چیز **اسطوره‌ای** است: دیوها شکل تکنولوژی گرفته‌اند؛ هیچ ارتش یا کشور واقعی در کار نیست.
**قانون پیشنهادی:** پهپاددیوها — هدف‌هایی که بالای سر می‌چرخند.

```
ERA 7 PALETTE: dusk orange sky, concrete grey, neon cyan and magenta accents, warm window lights; modern Iranian city rooftop.
```

| فایل | پرامپت |
|---|---|
| `e7_bg_arena_01` | ARENA + `Modern city rooftop at dusk as an arena: a tall TV tower silhouette on the horizon behind a rooftop parapet at the top centre, water tanks, satellite dishes and air-conditioner units along the side walls, tar-and-tile roof floor with painted markings, a round helipad-style platform with a golden Derafsh emblem.` |
| `e7_hero_*` | `Modern young archer hero: hooded jacket in royal blue with a golden lion patch, light tactical vest, cargo trousers, sneakers, headphones around the neck, a sleek compound bow with cams and a glowing sight, quiver of carbon arrows on the back, red scarf echoing the first era.` |
| `e7_imp_*` | **دیو اسکوتری:** `Small prankster demon on a tiny electric scooter, hoodie, cap backwards, phone in hand.` |
| `e7_shield_*` | **دیو ضدشورش:** `Big armoured demon holding a riot-style transparent shield with a demon sigil, helmet with visor, glowing eyes. Fantasy, not police.` |
| `e7_flyer_*` | **پهپاددیو:** `Demon quadcopter drone with bat wings instead of rotors' guards, one glowing red eye camera, tiny claws.` |
| `e7_slinger_*` | **دیو پرتابگر:** `Demon throwing glowing energy cans, street-wear, tattoo patterns glowing.` |
| `e7_bomber_*` | **دیو کپسولی:** `Fat demon hugging a big leaking gas cylinder glowing green, hazard stripes.` |
| `e7_wraith_*` | **شبح دیجیتال:** `Glitchy digital ghost, pixelated edges, cyan scanlines, hollow glowing eyes, lower body breaking into pixels.` |
| `e7_boss_*` | **دیو آهنین:** `Colossal iron demon, waist-up behind the parapet: body of steel beams, cables and neon veins, a construction-crane arm, a cracked LED visor with two burning eyes, horns made of antenna masts, hands gripping the parapet.` |
| `e7_pillar_01` | `Concrete rooftop pillar with a water pipe and a neon strip.` |
| `e7_banner` | `Modern fabric banner with a golden Derafsh emblem on deep blue.` |
| `e7_brazier` | `Metal fire barrel with glowing embers.` |
| `e7_pot` | `Clay flower pot with a geranium.` |
| `e7_arrow` | `Carbon arrow with a glowing tip, horizontal, point right.` |
| `e7_rock` | `Glowing energy can.` |
| `e7_boulder` | `Chunk of concrete with rebar and glowing purple cracks.` |

---

## ۱۰. عصر ۸ — فردا (`e8_`) · ۱۵۰۰ خورشیدی · شهر نئون

**حس عصر:** آینده، معماری ایرانی با نور و شیشه، جاذبهٔ شکسته، هولوگرام. پایان سفر.
**قانون پیشنهادی:** جاذبهٔ شکسته — تیرها خم می‌شوند.

```
ERA 8 PALETTE: deep night indigo, hologram cyan, magenta, pearl white, gold light; far-future Persian city.
```

| فایل | پرامپت |
|---|---|
| `e8_bg_arena_01` | ARENA + `Far-future Persian arena floating above a neon city: glass-and-light iwan at the top centre shaped like a giant muqarnas, holographic tile patterns on the walls, floating stones along the side walls, a glowing floor of light tiles, a round platform with a golden holographic Derafsh.` |
| `e8_hero_*` | `Future archer hero: sleek white-and-gold armour with Persian patterns glowing in cyan, a translucent visor, a light-bow made of a glowing energy string, long red light-scarf, a small drone companion shaped like a simurgh.` |
| `e8_imp_*` | **دیو هولوگرامی:** `Small holographic demon, translucent cyan, flickering, mischievous grin.` |
| `e8_shield_*` | **دیو میدان‌نیرو:** `Big demon projecting a hexagonal energy shield from a wrist device, sleek dark armour.` |
| `e8_flyer_*` | **دیو ماهواره‌ای:** `Floating demon orb with glowing ring wings.` |
| `e8_slinger_*` | **دیو پلاسما:** `Demon throwing plasma orbs, suit with glowing seams.` |
| `e8_bomber_*` | **دیو هسته‌ای (فانتزی):** `Fat demon hugging a glowing unstable crystal core, energy crackling.` |
| `e8_wraith_*` | **شبح کوانتومی:** `Ghost that exists in two places at once (double-exposure), violet light.` |
| `e8_boss_*` | **دیو بی‌نام:** `The Nameless Div, waist-up behind the parapet: a titan made of shifting shadows and every previous boss's features (white horns, dragon scales, serpents, clockwork, iron), crowned with broken light, hands gripping the parapet — the final enemy of all eras.` |
| `e8_pillar_01` | `Floating crystal pillar with a golden ring.` |
| `e8_banner` | `Holographic Derafsh banner.` |
| `e8_brazier` | `Floating energy brazier.` |
| `e8_pot` | `Glowing glass vessel.` |
| `e8_arrow` | `Arrow of pure light, horizontal, point right.` |
| `e8_rock` | `Small plasma orb.` |
| `e8_boulder` | `Floating crystal chunk with purple cracks.` |

---

## ۱۱. چک‌لیست هر عصر

- [ ] `bg_arena_01` با همان چیدمان (مرجع: عصر ۱)
- [ ] ۳ ژست غول
- [ ] ۴ ژست پهلوان (از پشت)
- [ ] ۱۹ ژست دشمن (imp ۳، shield ۳، flyer ۳، slinger ۴، bomber ۳، wraith ۳)
- [ ] ۷ شیء میدان
- [ ] `npm run assets` ← `npm run anchors` ← بازی با `?era=N&debug=1` و بررسی hitboxها

> وقتی یک عصر از «به‌زودی» به «قابل بازی» تبدیل می‌شود، در `src/data/eras.ts` برایش `playable: true`، موج‌ها و قانونش را تنظیم کن (مثل عصر اشکانی).
