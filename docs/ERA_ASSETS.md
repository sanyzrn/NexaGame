# سفارش تصاویر عصرها — درفش

این فایل همهٔ تصاویری را که برای عصرهای بعدی لازم است، با **نام دقیق فایل، اندازه و پرامپت ساخت تصویر** فهرست می‌کند.
تا وقتی تصویر واقعی یک عصر آماده نشده، بازی خودش از روی تصاویر عصر اول یک «تصویر آزمایشی» رنگ‌شده می‌سازد، پس بازی همیشه قابل اجراست.

---

## ۰. چطور کار می‌کند

1. هر عصر یک **پیشوند** دارد که همان شمارهٔ عصر است: عصر ۲ = `e2_`، عصر ۳ = `e3_` … عصر ۱۷ = `e17_`. (فهرست کامل ۱۷ عصر در صفحهٔ «سفر در زمان» بازی و در `src/data/eras.ts` است.)
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

## ۶. عصر ۴ — سامانی (`e4_`) · ۸۱۹ میلادی · کتابخانهٔ بخارا

**حس عصر:** بخارا و سمرقند، کتابخانه‌های بزرگ، رودکی و زنده شدن زبان پارسی، آجرکاری ساده و گرم، سفالینه‌های خط‌دار. رنگ‌ها: سبز یشمی، کرم، قهوه‌ای آجری، مشکی خوشنویسی.
**قانون پیشنهادی:** طومارهای جادو — بعضی دیوها فقط با تیر آتشین می‌سوزند.

```
ERA 4 PALETTE: jade green, cream, brick brown, calligraphy black; Samanid Bukhara, 9th–10th century
```

| فایل | پرامپت (STYLE + این + پسوند ژست) |
|---|---|
| `e4_bg_arena_01` | ARENA + `Samanid library courtyard in Bukhara: patterned brick walls like the Samanid Mausoleum, tall bookshelf niches with scrolls along the side walls, a great arched gate with Kufic inscriptions at the top centre, brick floor with slip-painted pottery patterns, a round platform with a calligraphy medallion.` |
| `e4_hero_*` | `Samanid scholar-archer: white turban with a long tail, jade-green robe over mail, ink-stained fingers, a scroll case on the back beside the quiver, elegant Khorasani composite bow.` |
| `e4_imp_*` | **دیو جوهرخور:** `Small ink demon dripping black ink, quill horns, stealing a book.` |
| `e4_shield_*` | **دیو قفسه:** `Big demon carrying a heavy wooden bookcase door as a shield, iron-bound, spiky.` |
| `e4_flyer_*` | **دیو کاغذی:** `Paper demon folded like origami bird with burning edges.` |
| `e4_slinger_*` | **دیو دوات‌انداز:** `Demon throwing ink pots that splash, stained apron.` |
| `e4_bomber_*` | **دیو شمع‌دان:** `Fat demon hugging a giant lit oil lamp about to spill.` |
| `e4_wraith_*` | **شبح کتاب‌سوخته:** `Ghost made of burning pages and ash, glowing ember eyes.` |
| `e4_boss_*` | **دیو کتاب‌سوز:** `Huge demon made of charred books and parchment, flame crown, ink tears, waist-up gripping the parapet.` |
| `e4_pillar_01 / banner / brazier / pot / arrow / rock / boulder` | ستون آجری با کتیبهٔ کوفی · درفش سبز با نقش قلم · چراغ‌پیه‌سوز برنجی · سفالینهٔ خط‌دار سامانی · تیر با پرِ سفید و نوک برنزی · دوات کوچک · تکه دیوار آجری با ترک بنفش |

---

## ۷. عصر ۵ — غزنوی (`e5_`) · ۹۷۷ میلادی · کاخ غزنین

**حس عصر:** کاخ‌های غزنین، فیل‌های جنگی، فردوسی و سرودن شاهنامه، مرمر و طلا. رنگ‌ها: طلایی، مرمری، سرخ لاکی، آبی نیلی.
**قانون پیشنهادی:** فیل‌های جنگی — دیوهای غول‌پیکر که یک خط را می‌کوبند.

```
ERA 5 PALETTE: gold, marble white, lacquer red, indigo; Ghaznavid court, 10th–11th century
```

| فایل | پرامپت (STYLE + این + پسوند ژست) |
|---|---|
| `e5_bg_arena_01` | ARENA + `Ghaznavid palace courtyard: carved marble walls with star-shaped tiles, a victory tower at the top centre, elephant reliefs flanking it, red lacquer canopies along the side walls, marble floor, a round platform with a gold sunburst.` |
| `e5_hero_*` | `Ghaznavid royal archer: gilded conical helmet with a mail veil, red lacquered lamellar armour, white sash, war-elephant motif on the quiver, heavy composite bow.` |
| `e5_imp_*` | **دیو فیل‌بان:** `Small demon mahout with a hooked goad and a turban.` |
| `e5_shield_*` | **دیو زره‌طلا:** `Big demon with a gilded round shield embossed with an elephant.` |
| `e5_flyer_*` | **دیو شاهین طلایی:** `Golden-feathered demon hawk with jewelled hood.` |
| `e5_slinger_*` | **دیو زوبین‌انداز:** `Demon throwing short javelins, red sash.` |
| `e5_bomber_*` | **دیو خمره‌طلا:** `Fat demon hugging a jar of molten gold, glowing and splashing.` |
| `e5_wraith_*` | **شبح شاعر:** `Ghost of a wandering poet with a lute, pale gold light.` |
| `e5_boss_*` | **فیل‌دیو جنگی:** `Colossal war-elephant demon with four tusks, armoured howdah on its back, waist-up (head, trunk and front legs) over the parapet.` |
| `e5_pillar_01 / banner / brazier / pot / arrow / rock / boulder` | ستون مرمری با سرستون فیل · درفش سرخ با فیل طلایی · آتشدان مرمری · خمرهٔ زرنگار · تیر با پرِ سرخ · زوبین کوچک · تکه مرمر با ترک بنفش |

---

## ۸. عصر ۶ — سلجوقی (`e6_`) · ۱۰۳۷ میلادی · کاروانسرای کویر

**حس عصر:** کاروانسرا، آجرکاری هندسی، گنبدهای فیروزه‌ای، شتر و بازار، طوفان شن. رنگ‌ها: آجری، فیروزه‌ای، کرم، مسی.
**قانون پیشنهادی:** طوفان شن — میدان هر چند ثانیه تیره و روشن می‌شود.

```
ERA 6 PALETTE: baked-brick tan, turquoise, cream, copper, indigo night accents; Seljuk caravanserai, 11th century.
```

| فایل | پرامپت |
|---|---|
| `e6_bg_arena_01` | ARENA + `Seljuk caravanserai courtyard in the desert: geometric brick-pattern walls, a great iwan with turquoise tile muqarnas at the top centre, arched cells along the side walls with carpets and copper lamps, sand-drifted brick floor, a round platform of star-and-cross tiles.` |
| `e6_hero_*` | `Seljuk ghulam archer: conical steel helmet with a turban wrapped around it and a mail aventail, quilted kaftan in indigo with turquoise borders, curved sabre at the hip, powerful recurve bow, thumb-ring on the right hand.` |
| `e6_imp_*` | **دیو بازاری:** `Small thieving bazaar demon with a stolen rug over his shoulder, pointed slippers, gold coins falling from his pockets.` |
| `e6_shield_*` | **دیو قلعه‌بان:** `Hulking demon guard in a brass-studded kite-shaped shield covered in Kufic patterns, mail shirt, spiked turban helmet, heavy mace.` |
| `e6_flyer_*` | **غول‌کرکس کویر:** `Bald desert vulture demon with ragged black wings and a copper collar, bone beak.` |
| `e6_slinger_*` | **نفت‌انداز:** `Demon grenadier throwing clay naphtha grenades (round, spiked clay pots), soot-stained, scarf over his mouth.` |
| `e6_bomber_*` | **شترِ دیو:** `Fat demon riding / hugging a barrel of Greek fire strapped with copper bands, fuse smoking, glowing green eyes.` |
| `e6_wraith_*` | **غول بیابانی (سراب):** `Mirage ghoul made of shimmering heat haze, tattered caravan cloak, hollow glowing eyes, legs dissolving into blowing sand.` |
| `e6_boss_*` | **غول بیابان:** `Colossal sand ghoul, waist-up behind the wall: body made of cracked desert stone and swirling sand, bone jewellery, a caravan's broken wheel as a necklace, glowing turquoise gem in the chest, hands gripping the parapet.` |
| `e6_pillar_01` | `Round brick minaret-style pillar with turquoise tile bands and Kufic calligraphy.` |
| `e6_banner` | `Caravan banner: indigo cloth with a golden double-headed eagle, fringed.` |
| `e6_brazier` | `Copper lantern-brazier with pierced star patterns.` |
| `e6_pot` | `Turquoise-glazed pottery jar.` |
| `e6_arrow` | `Arrow with a naphtha-wrapped tip (unlit), horizontal, point right.` |
| `e6_rock` | `Small clay naphtha grenade.` |
| `e6_boulder` | `Brick chunk of a minaret with glowing purple cracks.` |

---

## ۹. عصر ۷ — خوارزمشاهی (`e7_`) · ۱۰۷۷ میلادی · دروازهٔ گرگانج

**حس عصر:** خوارزم، رود جیحون، زمستان سخت، دیوارهای بلند و باد سرد استپ. رنگ‌ها: آبی یخی، خاکستری سنگ، قهوه‌ای خز، نقره‌ای.
**قانون پیشنهادی:** سرمای شمال — تیرها دیوها را کند می‌کنند؛ دیوهای یخی.

```
ERA 7 PALETTE: ice blue, stone grey, fur brown, silver; Khwarazmian Gurganj in winter, 11th–13th century
```

| فایل | پرامپت (STYLE + این + پسوند ژست) |
|---|---|
| `e7_bg_arena_01` | ARENA + `Snowy fortress courtyard of Gurganj: tall stone walls with icicles, a frozen river gate at the top centre, braziers in snowdrifts along the side walls, snow-dusted flagstone floor, a round platform with a frost star.` |
| `e7_hero_*` | `Khwarazmian archer in winter gear: fur-trimmed pointed hat, quilted blue coat over mail, fur boots, frosty breath, steppe composite bow.` |
| `e7_imp_*` | **دیوچهٔ برفی:** `Small snow demon with icicle horns, throwing snowballs.` |
| `e7_shield_*` | **دیو یخ‌سپر:** `Big demon holding a shield of solid ice.` |
| `e7_flyer_*` | **جغد یخی:** `Frost owl demon with crystal feathers.` |
| `e7_slinger_*` | **دیو یخ‌انداز:** `Demon throwing ice shards, fur cloak.` |
| `e7_bomber_*` | **دیو بهمن:** `Fat demon made of packed snow hugging a boulder of ice.` |
| `e7_wraith_*` | **شبح کولاک:** `Ghost made of swirling blizzard, glowing blue eyes.` |
| `e7_boss_*` | **دیو یخ‌زده:** `Giant frozen demon encased in ice armour, frost beard, icicle crown, waist-up gripping the parapet.` |
| `e7_pillar_01 / banner / brazier / pot / arrow / rock / boulder` | ستون سنگی یخ‌زده · درفش آبی با گرگ نقره‌ای · آتشدان آهنی در برف · کوزهٔ پوشیده از برف · تیر با پرِ سفید برفی · گلولهٔ برف · تخته‌سنگ یخی با ترک بنفش |

---

## ۱۰. عصر ۸ — ایلخانی (`e8_`) · ۱۲۵۶ میلادی · رصدخانهٔ مراغه

**حس عصر:** رصدخانهٔ مراغه، خواجه نصیر، اسطرلاب، آسمان پرستاره. رنگ‌ها: نیلی شب، طلایی ستاره، فیروزه‌ای، برنزی.
**قانون پیشنهادی:** آسمان شب — ستاره‌ها کمانه می‌دهند.

```
ERA 8 PALETTE: night indigo, star gold, turquoise, bronze; Ilkhanid Maragheh observatory, 13th century
```

| فایل | پرامپت (STYLE + این + پسوند ژست) |
|---|---|
| `e8_bg_arena_01` | ARENA + `Maragheh observatory courtyard at night: a great bronze armillary sphere at the top centre, star charts and astrolabes on the side walls, a starry sky above, tiled floor with a zodiac circle, a round platform with an astrolabe design.` |
| `e8_hero_*` | `Ilkhanid astronomer-archer: dark-blue robe covered with star embroidery, bronze astrolabe on the belt, pointed cap, bow with star-shaped inlays.` |
| `e8_imp_*` | **دیو شهاب:** `Small demon riding a tiny falling star.` |
| `e8_shield_*` | **دیو اسطرلاب:** `Big demon using a giant bronze astrolabe as a shield.` |
| `e8_flyer_*` | **دیو خفاش شب:** `Night bat demon with star-speckled wings.` |
| `e8_slinger_*` | **دیو ستاره‌انداز:** `Demon hurling glowing star fragments.` |
| `e8_bomber_*` | **دیو کره‌ای:** `Fat demon hugging a glowing celestial globe.` |
| `e8_wraith_*` | **شبح کسوف:** `Ghost shaped like an eclipse, dark disc with a burning corona.` |
| `e8_boss_*` | **دیو ستاره‌خوار:** `Giant cosmic demon with a starry body, a crescent-moon crown, swallowing stars, waist-up gripping the parapet.` |
| `e8_pillar_01 / banner / brazier / pot / arrow / rock / boulder` | ستون برنزی با حلقه‌های رصدی · درفش نیلی با ستاره · چراغ برنجی ستاره‌ای · کوزهٔ نیلی با ستاره · تیر با نوک ستاره · تکه ستارهٔ درخشان · سنگ‌آسمانی با ترک بنفش |

---

## ۱۱. عصر ۹ — تیموری (`e9_`) · ۱۳۷۰ میلادی · باغ‌های هرات

**حس عصر:** هرات و سمرقند، مینیاتور بهزاد، باغ‌های چهارباغ، کاشی لاجوردی. رنگ‌ها: لاجوردی، فیروزه‌ای، طلایی، سبز باغ.
**قانون پیشنهادی:** نقاشی زنده — دیوها از دل مینیاتورها بیرون می‌آیند.

```
ERA 9 PALETTE: lapis, turquoise, gold, garden green; Timurid Herat, 14th–15th century
```

| فایل | پرامپت (STYLE + این + پسوند ژست) |
|---|---|
| `e9_bg_arena_01` | ARENA + `Timurid garden courtyard in Herat: a ribbed turquoise dome and portal at the top centre, chahar-bagh water channels in the floor, cypress and blossoming trees along the side walls, lapis tile borders, a round platform shaped like a miniature painting frame.` |
| `e9_hero_*` | `Timurid archer as a Persian miniature hero: tall white turban with a feather, golden brocade coat, lapis sash, finely painted bow.` |
| `e9_imp_*` | **دیو نقش:** `Small demon painted in flat miniature style, stepping out of a page.` |
| `e9_shield_*` | **دیو قاب‌دار:** `Big demon holding a gilded painting frame as a shield.` |
| `e9_flyer_*` | **دیو سیمرغ‌نما:** `Fake-simurgh demon with painted wings.` |
| `e9_slinger_*` | **دیو قلم‌مو:** `Demon flicking paint blobs from a big brush.` |
| `e9_bomber_*` | **دیو رنگ‌دان:** `Fat demon hugging a pot of bubbling magic paint.` |
| `e9_wraith_*` | **شبح طرح:** `Ghost drawn as an unfinished pencil sketch.` |
| `e9_boss_*` | **دیو مینیاتور:** `Giant demon made of a living miniature painting, gold leaf skin, lapis patterns, waist-up gripping the parapet.` |
| `e9_pillar_01 / banner / brazier / pot / arrow / rock / boulder` | ستون کاشی لاجوردی · درفش زرنگار · چراغ برنجی مشبک · گلدان لاجوردی · تیر زرنگار · قطرهٔ رنگ · تکه گنبد فیروزه‌ای با ترک بنفش |

---

## ۱۲. عصر ۱۰ — صفوی (`e10_`) · ۱۵۰۱ میلادی · میدان نقش جهان

**حس عصر:** کاشی فیروزه‌ای، مینیاتور، گنبد، باغ ایرانی، تفنگ فتیله‌ای کنار کمان. رنگ‌ها: فیروزه‌ای، لاجوردی، زرد زعفرانی، سبز باغ.
**قانون پیشنهادی:** کاشی‌های جادویی — تیر از نقش‌های کف کمانه می‌کند.

```
ERA 10 PALETTE: turquoise, lapis blue, saffron yellow, garden green, rose pink; Safavid Isfahan, 16th century.
```

| فایل | پرامپت |
|---|---|
| `e10_bg_arena_01` | ARENA + `Naqsh-e Jahan square in Isfahan as an arena: a turquoise-tiled mosque portal and dome at the top centre, two-storey arcades along the side walls, a long reflecting pool pattern in the floor, flower beds at the edges, a round platform of floral haft-rang tiles.` |
| `e10_hero_*` | `Safavid Qizilbash archer: red baton-turban (taj) with twelve folds, lapis-blue brocade coat with gold floral patterns, sash, composite bow in a jewelled case, a matchlock musket slung on the back as decoration.` |
| `e10_imp_*` | **دیو مینیاتوری:** `Small demon painted like a Persian miniature figure: flat vivid colours, curly moustache, striped trousers, carrying a stolen pomegranate.` |
| `e10_shield_*` | **دیو تفنگ‌دار:** `Big demon musketeer behind a tall wooden mantlet shield with painted tiles, bandolier, matchlock musket, plumed helmet.` |
| `e10_flyer_*` | **دیو طاووس:** `Demon peacock with an enormous turquoise tail full of glowing eye-spots, sharp golden crest.` |
| `e10_slinger_*` | **دیو کاشی‌انداز:** `Demon tile-maker throwing spinning ceramic tiles like shuriken, apron covered in glaze, stack of tiles under his arm.` |
| `e10_bomber_*` | **دیو باروت‌کش:** `Fat demon hugging a large gunpowder keg with a lit fuse, sparks, embroidered vest.` |
| `e10_wraith_*` | **روح نقاش:** `Ghost made of flowing ink and gold leaf, like a miniature painting come alive, brush-stroke tail, glowing gold eyes.` |
| `e10_boss_*` | **اکوان دیو:** `Akvan Div, waist-up behind the wall: huge wild-haired demon with a long face, spotted leopard-like skin, curling horns, gold earrings, a tile-crown, grinning, whirlwind swirling around him, hands gripping the parapet.` |
| `e10_pillar_01` | `Slim wooden talar column with a muqarnas capital and mirror-work.` |
| `e10_banner` | `Safavid standard: green silk with a golden sun-lion, brass finial.` |
| `e10_brazier` | `Brass samovar-shaped fire lamp with tile inlays.` |
| `e10_pot` | `Blue-and-white Safavid ceramic vase.` |
| `e10_arrow` | `Elegant arrow with gold-painted shaft and peacock fletching, horizontal, point right.` |
| `e10_rock` | `Small spinning ceramic tile.` |
| `e10_boulder` | `Chunk of a tiled dome with glowing purple cracks.` |

---

## ۱۳. عصر ۱۱ — افشاری (`e11_`) · ۱۷۳۶ میلادی · دژ کلات

**حس عصر:** نادرشاه، کوه‌های خراسان، دژ کلات، لشکرکشی‌های بزرگ. رنگ‌ها: سرخ تیره، فولادی، قهوه‌ای کوهستان، طلایی.
**قانون پیشنهادی:** یورش برق‌آسا — موج‌ها بی‌وقفه می‌رسند.

```
ERA 11 PALETTE: dark red, steel grey, mountain brown, gold; Afsharid Kalat fortress, 18th century
```

| فایل | پرامپت (STYLE + این + پسوند ژست) |
|---|---|
| `e11_bg_arena_01` | ARENA + `Mountain fortress courtyard of Kalat: rugged stone walls built into cliffs, a great gate at the top centre, war tents and cannons along the side walls, rocky floor, a round platform with a Nadiri sunburst.` |
| `e11_hero_*` | `Afsharid archer-soldier: red four-pointed Nadiri hat with fur rim, steel breastplate over a long red coat, wide belt, curved sword, powerful bow.` |
| `e11_imp_*` | **دیو کوهی:** `Small rocky mountain demon with pebble teeth.` |
| `e11_shield_*` | **دیو فولادپوش:** `Big demon in a steel breastplate with a round steel shield.` |
| `e11_flyer_*` | **عقاب‌دیو کوهستان:** `Mountain eagle demon with steel talons.` |
| `e11_slinger_*` | **دیو خمپاره‌انداز:** `Demon lobbing small iron cannonballs.` |
| `e11_bomber_*` | **دیو باروت:** `Fat demon hugging a keg of gunpowder, fuse lit.` |
| `e11_wraith_*` | **شبح سرباز:** `Ghost of a fallen soldier in a torn red coat.` |
| `e11_boss_*` | **دیو کوه‌پیکر:** `Colossal demon made of mountain rock, cannon on its shoulder, waist-up gripping the parapet.` |
| `e11_pillar_01 / banner / brazier / pot / arrow / rock / boulder` | ستون سنگ کوهی · درفش سرخ با شمشیر · آتشدان آهنی · کوزهٔ مسی · تیر فولادی · گلولهٔ توپ کوچک · تخته‌سنگ کوهی با ترک بنفش |

---

## ۱۴. عصر ۱۲ — زندیه (`e12_`) · ۱۷۵۱ میلادی · ارگ کریم‌خان، شیراز

**حس عصر:** شیراز، باغ ارم، نارنجستان، کاشی‌های گل و بلبل، شعر حافظ و سعدی. رنگ‌ها: صورتی گلی، نارنجی، سبز باغ، زرد.
**قانون پیشنهادی:** باغ نارنج — میوه‌های افتاده جان می‌دهند.

```
ERA 12 PALETTE: rose pink, orange, garden green, yellow; Zand Shiraz, 18th century
```

| فایل | پرامپت (STYLE + این + پسوند ژست) |
|---|---|
| `e12_bg_arena_01` | ARENA + `Shiraz garden courtyard: Arg of Karim Khan brick towers at the top centre, gol-o-bolbol (rose and nightingale) tiles on the walls, orange trees along the side walls, a long pool, a round platform with a rose mosaic.` |
| `e12_hero_*` | `Zand archer: lambskin hat, rose-coloured coat with floral embroidery, green sash, a sprig of orange blossom on the quiver, elegant bow.` |
| `e12_imp_*` | **دیو نارنج‌دزد:** `Small demon juggling stolen oranges.` |
| `e12_shield_*` | **دیو کاشی‌پوش:** `Big demon with a shield of gol-o-bolbol tiles.` |
| `e12_flyer_*` | **بلبل‌دیو:** `Mischievous nightingale demon with thorny wings.` |
| `e12_slinger_*` | **دیو هسته‌انداز:** `Demon spitting / throwing fruit pits.` |
| `e12_bomber_*` | **دیو گلاب:** `Fat demon hugging a huge rosewater flask about to burst.` |
| `e12_wraith_*` | **شبح شعر:** `Ghost made of flowing Nastaliq calligraphy.` |
| `e12_boss_*` | **دیو نارنج‌خوار:** `Giant greedy demon with orange-peel skin, a crown of orange blossoms, cheeks full of fruit, waist-up gripping the parapet.` |
| `e12_pillar_01 / banner / brazier / pot / arrow / rock / boulder` | ستون آجری با کاشی گل‌وبلبل · درفش صورتی با گل سرخ · چراغ لاله‌ای · گلدان نارنج · تیر با پرِ صورتی · هستهٔ نارنج · تکه برج آجری با ترک بنفش |

---

## ۱۵. عصر ۱۳ — قاجار (`e13_`) · ۱۷۸۹ میلادی · تهران قدیم

**حس عصر:** شمس‌العماره، ساعت و چرخ‌دنده، شیشه‌های رنگی، لباس نظامی قاجاری، فانوس. رنگ‌ها: صورتی قاجاری، زرد طلایی، سبز تیره، قهوه‌ای.
**قانون پیشنهادی:** دیوهای کوکی — هر چند ثانیه زمان برای دشمن‌ها می‌ایستد.

```
ERA 13 PALETTE: Qajar rose pink, mustard gold, dark green, walnut brown, stained-glass colours; Qajar Tehran, late 18th–19th century.
```

| فایل | پرامپت |
|---|---|
| `e13_bg_arena_01` | ARENA + `Qajar palace courtyard in old Tehran: a clock tower (Shams-ol-Emareh style) at the top centre, rose-tiled walls with painted flowers, orosi stained-glass windows along the side walls, stone floor with a star fountain pattern, a round platform with a lion-and-sun mosaic.` |
| `e13_hero_*` | `Qajar-era archer-guardian: tall black lambskin hat with a small jewelled plume, dark-green military frock coat with gold epaulettes and frogging, wide belt, a steel crossbow-bow hybrid, handlebar moustache.` |
| `e13_imp_*` | **دیو کوکی:** `Small clockwork demon made of brass with a wind-up key in its back, gear eyes, puffing steam, springy legs.` |
| `e13_shield_*` | **دیو قزاق:** `Big demon soldier in a Qajar Cossack uniform, huge riveted iron shield with a lion-and-sun, sabre.` |
| `e13_flyer_*` | **دیو بادبادکی:** `Demon riding a kite / clockwork bat with brass wings and a ticking heart.` |
| `e13_slinger_*` | **دیو ساعت‌انداز:** `Demon throwing small pocket-watch bombs, monocle, waistcoat full of watches.` |
| `e13_bomber_*` | **دیو سماور:** `Fat demon hugging a huge boiling samovar about to burst, steam jets, green glow.` |
| `e13_wraith_*` | **شبح عکس قدیمی:** `Ghost that looks like a sepia old photograph come alive, cracked edges, flickering, lower body fading into film grain.` |
| `e13_boss_*` | **دیو ساعت‌ساز:** `Giant clockmaker demon, waist-up behind the wall: half flesh, half brass machinery, a clock face in his chest, magnifying-lens eye, gear shoulders, steam pipes, hands of brass gripping the parapet.` |
| `e13_pillar_01` | `Cast-iron lamp-post pillar with painted tiles at the base.` |
| `e13_banner` | `Qajar lion-and-sun flag, green-white-red, gold fringe.` |
| `e13_brazier` | `Ornate oil street-lamp.` |
| `e13_pot` | `Painted Qajar ceramic jug with a rose pattern.` |
| `e13_arrow` | `Steel crossbow bolt, horizontal, point right.` |
| `e13_rock` | `Small ticking pocket-watch bomb.` |
| `e13_boulder` | `Chunk of the clock tower with glowing purple cracks.` |

---

## ۱۶. عصر ۱۴ — مشروطه (`e14_`) · ۱۹۰۶ میلادی · کوچه‌های تبریز

**حس عصر:** تبریز و تهران اوایل قرن بیستم، چاپخانه‌ها و روزنامه‌ها، تلگراف، بازار سرپوشیده. رنگ‌ها: قهوه‌ای سپیا، کرم کاغذی، مشکی جوهر، سبز تیره.
**قانون پیشنهادی:** روزنامه‌های پرنده — کاغذها دید را می‌پوشانند.

```
ERA 14 PALETTE: sepia brown, paper cream, ink black, dark green; early 20th century Tabriz
```

| فایل | پرامپت (STYLE + این + پسوند ژست) |
|---|---|
| `e14_bg_arena_01` | ARENA + `Old Tabriz alley courtyard: brick bazaar arches, a printing-house facade with a big press at the top centre, telegraph poles and posters along the side walls, cobblestone floor scattered with newspapers, a round platform with a pen-and-sun emblem.` |
| `e14_hero_*` | `Early 20th-century archer: felt hat, long dark coat, bandolier of arrows, round glasses, a newspaper in the pocket, sturdy bow.` |
| `e14_imp_*` | **دیو روزنامه‌فروش:** `Small demon made of crumpled newspaper, shouting headlines.` |
| `e14_shield_*` | **دیو ماشین‌چاپ:** `Big demon carrying a printing-press plate as a shield.` |
| `e14_flyer_*` | **دیو کاغذپران:** `Flying newspaper demon flapping pages like wings.` |
| `e14_slinger_*` | **دیو حروف‌انداز:** `Demon throwing metal type letters.` |
| `e14_bomber_*` | **دیو جوهرخمره:** `Fat demon hugging a barrel of printing ink.` |
| `e14_wraith_*` | **شبح تلگراف:** `Ghost made of crackling telegraph wires and Morse dots.` |
| `e14_boss_*` | **دیو چاپخانه:** `Giant demon built from a printing press, rollers for arms, paper tongue, ink-stained, waist-up gripping the parapet.` |
| `e14_pillar_01 / banner / brazier / pot / arrow / rock / boulder` | تیر چراغ‌برق چوبی با آگهی · درفش سبز با قلم · فانوس نفتی · قوطی حلبی · تیر با پرِ کاغذی · حرف سربی · تکه دیوار بازار با ترک بنفش |

---

## ۱۷. عصر ۱۵ — پهلوی (`e15_`) · ۱۳۰۴ خورشیدی · خیابان لاله‌زار

**حس عصر:** تهران دهه‌های ۳۰ تا ۵۰: خیابان لاله‌زار، سینماها و تئاترها، گرامافون، رادیو، ماشین‌های کلاسیک، معماری آرت‌دکو. فضا نوستالژیک و فرهنگی است، بدون هیچ پیام سیاسی. رنگ‌ها: طلایی آرت‌دکو، کرم، قرمز مخملی، سبز زیتونی.
**قانون پیشنهادی:** نور سینما — پروژکتورها دیوها را آشکار می‌کنند.

```
ERA 15 PALETTE: art-deco gold, cream, velvet red, olive; mid-20th-century Tehran, Lalehzar street, nostalgic
```

| فایل | پرامپت (STYLE + این + پسوند ژست) |
|---|---|
| `e15_bg_arena_01` | ARENA + `Mid-century Lalehzar street courtyard at dusk: an art-deco cinema facade with a lit marquee at the top centre, shop signs, gramophone shop and theatre posters along the side walls, tiled pavement, a round platform with an art-deco sunburst.` |
| `e15_hero_*` | `Mid-century archer hero: tweed flat cap, cream shirt with rolled sleeves, braces, dark trousers, leather quiver, a classic recurve bow, red scarf echoing the first era.` |
| `e15_imp_*` | **دیو گرامافون:** `Small demon with a gramophone horn for a head, spinning record.` |
| `e15_shield_*` | **دیو تابلوی سینما:** `Big demon holding a round cinema sign as a shield, bulbs lit.` |
| `e15_flyer_*` | **دیو فیلم:** `Flying demon made of a film reel with celluloid wings.` |
| `e15_slinger_*` | **دیو صفحه‌انداز:** `Demon throwing vinyl records like discs.` |
| `e15_bomber_*` | **دیو رادیو:** `Fat demon hugging a buzzing vintage radio about to burst with static.` |
| `e15_wraith_*` | **شبح سیاه‌وسفید:** `Ghost from an old black-and-white film, flickering frames.` |
| `e15_boss_*` | **دیو گرامافون:** `Giant demon with a huge gramophone horn mouth, record halo, art-deco gold armour, waist-up gripping the parapet.` |
| `e15_pillar_01 / banner / brazier / pot / arrow / rock / boulder` | تیر چراغ خیابان آرت‌دکو · بنر مخملی سینما · چراغ گازی خیابان · گلدان سرامیکی · تیر کلاسیک با پرِ قرمز · صفحهٔ گرامافون · تکه نمای سینما با ترک بنفش |

---

## ۱۸. عصر ۱۶ — معاصر (`e16_`) · ۱۴۰۵ خورشیدی · پشت‌بام‌های شهر

**حس عصر:** شهر امروزی، پشت‌بام، برج میلاد در افق، نئون و کولر آبی، پهپاد. همه چیز **اسطوره‌ای** است: دیوها شکل تکنولوژی گرفته‌اند؛ هیچ ارتش یا کشور واقعی در کار نیست.
**قانون پیشنهادی:** پهپاددیوها — هدف‌هایی که بالای سر می‌چرخند.

```
ERA 16 PALETTE: dusk orange sky, concrete grey, neon cyan and magenta accents, warm window lights; modern Iranian city rooftop.
```

| فایل | پرامپت |
|---|---|
| `e16_bg_arena_01` | ARENA + `Modern city rooftop at dusk as an arena: a tall TV tower silhouette on the horizon behind a rooftop parapet at the top centre, water tanks, satellite dishes and air-conditioner units along the side walls, tar-and-tile roof floor with painted markings, a round helipad-style platform with a golden Derafsh emblem.` |
| `e16_hero_*` | `Modern young archer hero: hooded jacket in royal blue with a golden lion patch, light tactical vest, cargo trousers, sneakers, headphones around the neck, a sleek compound bow with cams and a glowing sight, quiver of carbon arrows on the back, red scarf echoing the first era.` |
| `e16_imp_*` | **دیو اسکوتری:** `Small prankster demon on a tiny electric scooter, hoodie, cap backwards, phone in hand.` |
| `e16_shield_*` | **دیو ضدشورش:** `Big armoured demon holding a riot-style transparent shield with a demon sigil, helmet with visor, glowing eyes. Fantasy, not police.` |
| `e16_flyer_*` | **پهپاددیو:** `Demon quadcopter drone with bat wings instead of rotors' guards, one glowing red eye camera, tiny claws.` |
| `e16_slinger_*` | **دیو پرتابگر:** `Demon throwing glowing energy cans, street-wear, tattoo patterns glowing.` |
| `e16_bomber_*` | **دیو کپسولی:** `Fat demon hugging a big leaking gas cylinder glowing green, hazard stripes.` |
| `e16_wraith_*` | **شبح دیجیتال:** `Glitchy digital ghost, pixelated edges, cyan scanlines, hollow glowing eyes, lower body breaking into pixels.` |
| `e16_boss_*` | **دیو آهنین:** `Colossal iron demon, waist-up behind the parapet: body of steel beams, cables and neon veins, a construction-crane arm, a cracked LED visor with two burning eyes, horns made of antenna masts, hands gripping the parapet.` |
| `e16_pillar_01` | `Concrete rooftop pillar with a water pipe and a neon strip.` |
| `e16_banner` | `Modern fabric banner with a golden Derafsh emblem on deep blue.` |
| `e16_brazier` | `Metal fire barrel with glowing embers.` |
| `e16_pot` | `Clay flower pot with a geranium.` |
| `e16_arrow` | `Carbon arrow with a glowing tip, horizontal, point right.` |
| `e16_rock` | `Glowing energy can.` |
| `e16_boulder` | `Chunk of concrete with rebar and glowing purple cracks.` |

---

## ۱۹. عصر ۱۷ — آینده (`e17_`) · ۱۵۰۰ خورشیدی · شهر نئون

**حس عصر:** آینده، معماری ایرانی با نور و شیشه، جاذبهٔ شکسته، هولوگرام. پایان سفر.
**قانون پیشنهادی:** جاذبهٔ شکسته — تیرها خم می‌شوند.

```
ERA 17 PALETTE: deep night indigo, hologram cyan, magenta, pearl white, gold light; far-future Persian city.
```

| فایل | پرامپت |
|---|---|
| `e17_bg_arena_01` | ARENA + `Far-future Persian arena floating above a neon city: glass-and-light iwan at the top centre shaped like a giant muqarnas, holographic tile patterns on the walls, floating stones along the side walls, a glowing floor of light tiles, a round platform with a golden holographic Derafsh.` |
| `e17_hero_*` | `Future archer hero: sleek white-and-gold armour with Persian patterns glowing in cyan, a translucent visor, a light-bow made of a glowing energy string, long red light-scarf, a small drone companion shaped like a simurgh.` |
| `e17_imp_*` | **دیو هولوگرامی:** `Small holographic demon, translucent cyan, flickering, mischievous grin.` |
| `e17_shield_*` | **دیو میدان‌نیرو:** `Big demon projecting a hexagonal energy shield from a wrist device, sleek dark armour.` |
| `e17_flyer_*` | **دیو ماهواره‌ای:** `Floating demon orb with glowing ring wings.` |
| `e17_slinger_*` | **دیو پلاسما:** `Demon throwing plasma orbs, suit with glowing seams.` |
| `e17_bomber_*` | **دیو هسته‌ای (فانتزی):** `Fat demon hugging a glowing unstable crystal core, energy crackling.` |
| `e17_wraith_*` | **شبح کوانتومی:** `Ghost that exists in two places at once (double-exposure), violet light.` |
| `e17_boss_*` | **دیو بی‌نام:** `The Nameless Div, waist-up behind the parapet: a titan made of shifting shadows and every previous boss's features (white horns, dragon scales, serpents, clockwork, iron), crowned with broken light, hands gripping the parapet — the final enemy of all eras.` |
| `e17_pillar_01` | `Floating crystal pillar with a golden ring.` |
| `e17_banner` | `Holographic Derafsh banner.` |
| `e17_brazier` | `Floating energy brazier.` |
| `e17_pot` | `Glowing glass vessel.` |
| `e17_arrow` | `Arrow of pure light, horizontal, point right.` |
| `e17_rock` | `Small plasma orb.` |
| `e17_boulder` | `Floating crystal chunk with purple cracks.` |

---

## ۲۰. چک‌لیست هر عصر

- [ ] `bg_arena_01` با همان چیدمان (مرجع: عصر ۱)
- [ ] ۳ ژست غول
- [ ] ۴ ژست پهلوان (از پشت)
- [ ] ۱۹ ژست دشمن (imp ۳، shield ۳، flyer ۳، slinger ۴، bomber ۳، wraith ۳)
- [ ] ۷ شیء میدان
- [ ] `npm run assets` ← `npm run anchors` ← بازی با `?era=N&debug=1` و بررسی hitboxها

> وقتی یک عصر از «به‌زودی» به «قابل بازی» تبدیل می‌شود، در `src/data/eras.ts` برایش `playable: true`، موج‌ها و قانونش را تنظیم کن (مثل عصر اشکانی).
