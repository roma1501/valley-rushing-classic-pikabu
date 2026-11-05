// Cosmetics.js — косметика Valley Rushing Classic: каталог (6 вкладок), владение и прогресс просмотров
// рекламы, ежедневный подарок (7 дней) и колесо фортуны. Только внешний вид — без
// игрового преимущества; каждая вещь видна в игре: скин и головной убор на персонаже,
// лицо на голове, нож в руке ловца, след за бегущим, эмоция — в меню, на финише и в итогах.
//
// Цена: ~35% предметов вкладки — за монеты, ~65% — за рекламу (1–5 просмотров; чем
// ценнее, тем больше). Прогресс просмотров хранится в сохранении (save.cos.ads[id]).
// Состояние — в общем сохранении игры (Game.save): cos { owned, eq, ads }, daily { day,
// last, cycle }, wheel { free, adDay, adSpins }. Названия — ключи 'cos_<id>' в LANG_STRINGS.
// Иконки шляп и ножей — рендеры моделей (assets/ui/cos/<id>.webp), остальное рисуется
// теми же функциями, что и в игре (лица, надписи, частицы).

// Мультяшный персонаж без сходства с Roblox — ТОЛЬКО сборка YouTube Playables (требование её
// модерации): модель char_toon, стартовый образ «как на обложке», мультяшные лица и иконки.
// Яндекс и Playgama — классические R6. Локально проверить: ?toon в адресе.
const RV_TOON = String(typeof GAME_PLATFORM !== 'undefined' ? GAME_PLATFORM : '') === 'playables'
    || (typeof location !== 'undefined' && /[?&]toon\b/.test(String(location.search || '')));

const COSMETIC_TABS = ['skin', 'hat', 'face', 'knife', 'trail', 'emote'];

// Сырые записи: [id, ru, en, data]. Порядок внутри вкладки — от простых к редким.
const COSMETIC_RAW = {
    skin: [
        // Новичок. В Playables — герой обложки: красное худи со шнурками, зелёный рюкзак, джинсы, кроссовки.
        ['skin_default', 'Новичок', 'Rookie', RV_TOON
            ? { skin: '#f2c29b', shirt: '#e5463b', pants: '#2c3d6b', decal: 'hoodie', decalColor: '#ffffff', sleeves: true, back: 'backpack', backColor: '#3fa34d', shoes: '#f5f5f5', sole: '#e5463b' }
            : { skin: '#f8f8f8', shirt: '#1f2a44', pants: '#27304a', decal: 'stripe', decalColor: '#2fb5c9' }],
        ['skin_noob', 'Классик', 'Classic', { skin: RV_TOON ? '#f2c29b' : '#f5cd30', shirt: '#ff8a1f', pants: '#6a4cd6', decal: '' }],
        ['skin_redbolt', 'Красная молния', 'Red Bolt', { skin: '#f2d3b3', shirt: '#c4281c', pants: '#1b1b1b', decal: 'bolt', decalColor: '#ffd23a' }],
        ['skin_striker', 'Футболист', 'Striker', { skin: '#e8b48a', shirt: '#f2f2f2', pants: '#1b1b1b', decal: 'num', decalColor: '#c4281c', sleeves: true }],
        ['skin_hoodie', 'Худи', 'Hoodie', { skin: '#e8b48a', shirt: '#6b327c', pants: '#27304a', decal: 'hoodie', decalColor: '#ffffff', sleeves: true }],
        ['skin_farmer', 'Фермер', 'Farmer', { skin: '#f2d3b3', shirt: '#c4281c', pants: '#3b5ba8', decal: 'overalls', decalColor: '#3b5ba8' }],
        ['skin_beach', 'Пляжник', 'Beach Boy', { skin: '#e8b48a', shirt: '#2fb5c9', pants: '#ff9a1f', decal: 'flower', decalColor: '#ffffff' }],
        ['skin_chef', 'Шеф', 'Chef', { skin: '#f2d3b3', shirt: '#f8f8f8', pants: '#1b1b1b', decal: 'buttons', decalColor: '#1b1b1b', sleeves: true }],
        ['skin_doctor', 'Доктор', 'Doctor', { skin: '#f2d3b3', shirt: '#f8f8f8', pants: '#2fb5c9', decal: 'cross', decalColor: '#e8443a', sleeves: true }],
        ['skin_patrol', 'Патруль', 'Patrol', { skin: '#c58a5c', shirt: '#27304a', pants: '#1b1b1b', decal: 'badge', decalColor: '#ffc83d', sleeves: true }],
        ['skin_cow', 'Бурёнка', 'Moo Moo', { skin: '#f8f8f8', shirt: '#f8f8f8', pants: '#f8f8f8', decal: 'spots', decalColor: '#1b1b1b', sleeves: true }],
        ['skin_clown', 'Клоун', 'Clown', { skin: '#f8f8f8', shirt: '#e86fa8', pants: '#2fb5c9', decal: 'dots', decalColor: '#ffd23a', sleeves: true }],
        ['skin_camo', 'Камуфляж', 'Camo', { skin: '#c58a5c', shirt: '#4b5a2a', pants: '#3a4a24', decal: 'camo', decalColor: '#2a3418', sleeves: true }],
        ['skin_fire', 'Пожарный', 'Firefighter', { skin: '#f2d3b3', shirt: '#c4281c', pants: '#3a2a1a', decal: 'stripe', decalColor: '#ffd23a', sleeves: true }],
        ['skin_agent', 'Агент', 'Agent', { skin: '#f2d3b3', shirt: '#1b1b1b', pants: '#1b1b1b', decal: 'tie', decalColor: '#c4281c', sleeves: true }],
        ['skin_tiger', 'Тигр', 'Tiger', { skin: '#ff9a1f', shirt: '#ff9a1f', pants: '#ff9a1f', decal: 'tiger', decalColor: '#1b1b1b', sleeves: true }],
        ['skin_zombie', 'Зомби', 'Zombie', { skin: '#7fb069', shirt: '#5a6b3a', pants: '#3b3b5a', decal: 'torn', decalColor: '#2a2a1a' }],
        ['skin_mummy', 'Мумия', 'Mummy', { skin: '#e8dcc0', shirt: '#e8dcc0', pants: '#e8dcc0', decal: 'bandage', decalColor: '#b8a888', sleeves: true }],
        ['skin_robot', 'Робот', 'Robot', { skin: '#a3a2a5', shirt: '#6d6e6c', pants: '#4a4a4c', decal: 'robot', decalColor: '#2fb5c9', sleeves: true }],
        ['skin_super', 'Супергерой', 'Super', { skin: '#f2d3b3', shirt: '#2f5fd0', pants: '#c4281c', decal: 'super', decalColor: '#ffd23a', sleeves: true }],
        ['skin_ninja', 'Ниндзя', 'Ninja', { skin: '#e8b48a', shirt: '#1b1b1b', pants: '#1b1b1b', decal: 'belt', decalColor: '#c4281c', sleeves: true }],
        ['skin_frost', 'Лёд', 'Frost', { skin: '#d8f3ff', shirt: '#7fd3ff', pants: '#4aa3e0', decal: 'snow', decalColor: '#ffffff', sleeves: true }],
        ['skin_galaxy', 'Галактика', 'Galaxy', { skin: '#8d5a3b', shirt: '#2a1b5a', pants: '#1b1b3a', decal: 'stars', decalColor: '#ffffff', sleeves: true }],
        ['skin_rainbow', 'Радуга', 'Rainbow', { skin: '#f8f8f8', shirt: '#ff3b3b', pants: '#2f8cff', decal: 'rainbow', decalColor: '#ffffff' }],
        ['skin_neon', 'Неон', 'Neon', { skin: '#1b1b1b', shirt: '#1b1b1b', pants: '#1b1b1b', decal: 'neon', decalColor: '#39ff88', sleeves: true, glow: 1 }],
        ['skin_lava', 'Лава', 'Lava', { skin: '#3a1a1a', shirt: '#1b1b1b', pants: '#1b1b1b', decal: 'flame', decalColor: '#ff6a1f', sleeves: true, glow: 1 }],
        ['skin_skeleton', 'Скелет', 'Skeleton', { skin: '#f8f8f8', shirt: '#1b1b1b', pants: '#1b1b1b', decal: 'ribs', decalColor: '#f8f8f8' }],
        ['skin_banana', 'Банан', 'Banana', { skin: '#f5cd30', shirt: '#f5e04a', pants: '#f5e04a', decal: 'banana', decalColor: '#7a5a1a', sleeves: true }],
        ['skin_golden', 'Золото', 'Golden', { skin: '#ffc83d', shirt: '#ffc83d', pants: '#e8a82a', decal: 'star', decalColor: '#fff5c0', sleeves: true, metal: 1 }],
        ['skin_diamond', 'Алмаз', 'Diamond', { skin: '#bff3ff', shirt: '#7fe9ff', pants: '#5ad0f0', decal: 'gem', decalColor: '#ffffff', sleeves: true, metal: 1 }],
    ],
    hat: [
        // Playables, по умолчанию: каштановые вихры и зелёные наушники (hair — причёска под убором).
        ...(RV_TOON ? [['hat_hero', 'Наушники и вихры', 'Headphones & Spikes', { acc: 'headphones', tint: '#3fb24d', hair: 'hair_spiky', hairTint: '#5a3825' }]] : []),
        ['hat_spiky_ginger', 'Рыжий ёжик', 'Ginger Spikes', { acc: 'hair_spiky', tint: '#e8762c' }],
        ['hat_none', 'Без шапки', 'Bald', { acc: '' }],
        ['hat_spiky_black', 'Чёрный ёжик', 'Black Spikes', { acc: 'hair_spiky', tint: '#1a1a1a' }],
        ['hat_bob_brown', 'Каштановое каре', 'Brown Bob', { acc: 'hair_bob', tint: '#3b2416' }],
        ['hat_long_blonde', 'Светлые локоны', 'Blonde Locks', { acc: 'hair_long', tint: '#f3d36b' }],
        ['hat_cap_red', 'Красная кепка', 'Red Cap', { acc: 'cap', tint: '#c4281c' }],
        ['hat_cap_blue', 'Синяя кепка', 'Blue Cap', { acc: 'cap', tint: '#2f5fd0' }],
        ['hat_beanie_green', 'Зелёная шапка', 'Green Beanie', { acc: 'beanie', tint: '#287f47' }],
        ['hat_spiky_blue', 'Синий ёжик', 'Blue Spikes', { acc: 'hair_spiky', tint: '#2f8cff' }],
        ['hat_bob_pink', 'Розовое каре', 'Pink Bob', { acc: 'hair_bob', tint: '#e86fa8' }],
        ['hat_long_purple', 'Фиолетовые локоны', 'Purple Locks', { acc: 'hair_long', tint: '#6b3f9e' }],
        ['hat_headphones', 'Наушники', 'Headphones', { acc: 'headphones', tint: '' }],
        ['hat_party', 'Колпак', 'Party Hat', { acc: 'party', tint: '' }],
        ['hat_chef', 'Поварской колпак', 'Chef Hat', { acc: 'chef', tint: '' }],
        ['hat_cap_black', 'Чёрная кепка', 'Black Cap', { acc: 'cap', tint: '#1b1b1b' }],
        ['hat_beanie_red', 'Красная шапка', 'Red Beanie', { acc: 'beanie', tint: '#c4281c' }],
        ['hat_cat', 'Кошачьи ушки', 'Cat Ears', { acc: 'cat_ears', tint: '' }],
        ['hat_bunny', 'Ушки кролика', 'Bunny Ears', { acc: 'bunny', tint: '' }],
        ['hat_propeller', 'Кепка с пропеллером', 'Propeller Cap', { acc: 'propeller', tint: '' }],
        ['hat_cowboy', 'Ковбойская шляпа', 'Cowboy Hat', { acc: 'cowboy', tint: '' }],
        ['hat_tophat', 'Цилиндр', 'Top Hat', { acc: 'tophat', tint: '' }],
        ['hat_pirate', 'Пиратская треуголка', 'Pirate Hat', { acc: 'pirate', tint: '' }],
        ['hat_viking', 'Шлем викинга', 'Viking Helmet', { acc: 'viking', tint: '' }],
        ['hat_wizard', 'Колпак волшебника', 'Wizard Hat', { acc: 'wizard', tint: '' }],
        ['hat_headdress', 'Перьевой убор', 'Feather Headdress', { acc: 'headdress', tint: '' }],
        ['hat_horns', 'Рожки', 'Devil Horns', { acc: 'horns', tint: '' }],
        ['hat_halo', 'Нимб', 'Halo', { acc: 'halo', tint: '', glow: 1 }],
        ['hat_crown', 'Корона', 'Crown', { acc: 'crown', tint: '' }],
    ],
    face: [
        ...(RV_TOON ? [['face_hero', 'Весёлый', 'Cheerful', { face: 'hero' }]] : []),
        ['face_smile', 'Улыбка', 'Smile', { face: 'smile' }],
        ['face_grin', 'Во весь рот', 'Big Grin', { face: 'grin' }],
        ['face_wink', 'Подмигивание', 'Wink', { face: 'wink' }],
        ['face_happy', 'Счастье', 'Joy', { face: 'happy' }],
        ['face_smirk', 'Ухмылка', 'Smirk', { face: 'smirk' }],
        ['face_tongue', 'Язык', 'Tongue Out', { face: 'tongue' }],
        ['face_surprised', 'Удивление', 'Surprised', { face: 'surprised' }],
        ['face_sleepy', 'Соня', 'Sleepy', { face: 'sleepy' }],
        ['face_cool', 'Крутые очки', 'Cool Shades', { face: 'cool' }],
        ['face_nerd', 'Ботан', 'Nerd', { face: 'nerd' }],
        ['face_cat', 'Котик', 'Kitty', { face: 'cat' }],
        ['face_mustache', 'Усач', 'Mustache', { face: 'mustache' }],
        ['face_derp', 'Чудик', 'Derp', { face: 'derp' }],
        ['face_kawaii', 'Кавай', 'Kawaii', { face: 'kawaii' }],
        ['face_beard', 'Бородач', 'Beard', { face: 'beard' }],
        ['face_eyepatch', 'Повязка', 'Eyepatch', { face: 'eyepatch' }],
        ['face_monocle', 'Монокль', 'Monocle', { face: 'monocle' }],
        ['face_clown', 'Клоунский нос', 'Clown Nose', { face: 'clown' }],
        ['face_vampire', 'Вампир', 'Vampire', { face: 'vampire' }],
        ['face_robot', 'Робо-лицо', 'Robo Face', { face: 'robot' }],
        ['face_hearts', 'Влюблённость', 'Heart Eyes', { face: 'hearts' }],
        ['face_stars', 'Звёзды в глазах', 'Star Eyes', { face: 'stars' }],
        ['face_money', 'Богач', 'Money Eyes', { face: 'money' }],
        ['face_fire', 'Огонь', 'On Fire', { face: 'fireeyes' }],
    ],
    knife: [
        ['knife_classic', 'Ледяной нож', 'Ice Knife', { model: 'knife', blade: '#8fd0ff', handle: '#2a2a35' }],
        ['knife_steel', 'Сталь', 'Steel', { model: 'knife', blade: '#d8dde3', handle: '#5b3418' }],
        ['knife_red', 'Рубиновый', 'Ruby', { model: 'knife', blade: '#ff5a4a', handle: '#1b1b1b' }],
        ['knife_cleaver', 'Тесак', 'Cleaver', { model: 'cleaver', blade: '#c9d1d9', handle: '#5b3418' }],
        ['knife_candy', 'Леденец', 'Candy Cane', { model: 'candy', blade: '#ffffff', handle: '#e8443a' }],
        ['knife_fish', 'Рыба', 'Fish', { model: 'fish', blade: '#5fb0ff', handle: '#2f5fd0' }],
        ['knife_dagger', 'Кинжал', 'Dagger', { model: 'dagger', blade: '#e8e8e8', handle: '#7a2a8a' }],
        ['knife_cleaver_green', 'Изумрудный тесак', 'Emerald Cleaver', { model: 'cleaver', blade: '#34e27a', handle: '#1b1b1b' }],
        ['knife_katana', 'Катана', 'Katana', { model: 'katana', blade: '#e8eef5', handle: '#1b1b1b' }],
        ['knife_candy_green', 'Мятный леденец', 'Mint Cane', { model: 'candy', blade: '#ffffff', handle: '#34e27a' }],
        ['knife_ice', 'Кристалл', 'Crystal', { model: 'ice', blade: '#8ff3ff', handle: '#2a6aa0', glow: 0.5 }],
        ['knife_black', 'Ночной', 'Midnight', { model: 'knife', blade: '#2a2a35', handle: '#ff3b3b' }],
        ['knife_dagger_gold', 'Золотой кинжал', 'Golden Dagger', { model: 'dagger', blade: '#ffc83d', handle: '#5b3418', metal: 1 }],
        ['knife_fish_gold', 'Золотая рыбка', 'Goldfish', { model: 'fish', blade: '#ffc83d', handle: '#ff9a1f', metal: 1 }],
        ['knife_katana_pink', 'Сакура', 'Sakura', { model: 'katana', blade: '#ff9ad0', handle: '#ffffff', glow: 0.4 }],
        ['knife_cleaver_purple', 'Тесак тьмы', 'Shadow Cleaver', { model: 'cleaver', blade: '#9a5aff', handle: '#1b1b1b', glow: 0.4 }],
        ['knife_neon', 'Неоновый', 'Neon Blade', { model: 'knife', blade: '#39ff88', handle: '#1b1b1b', glow: 0.8 }],
        ['knife_ice_purple', 'Аметист', 'Amethyst', { model: 'ice', blade: '#c08aff', handle: '#4a2a7a', glow: 0.6 }],
        ['knife_dagger_ruby', 'Кинжал рубинов', 'Ruby Dagger', { model: 'dagger', blade: '#ff3b5a', handle: '#ffc83d', glow: 0.4 }],
        ['knife_katana_black', 'Тёмная катана', 'Dark Katana', { model: 'katana', blade: '#3a3a4a', handle: '#c4281c', glow: 0.3 }],
        ['knife_gold', 'Золотой нож', 'Golden Knife', { model: 'knife', blade: '#ffd23a', handle: '#1b1b1b', metal: 1, glow: 0.3 }],
        ['knife_rainbow', 'Радужный', 'Rainbow Blade', { model: 'ice', blade: '#ff7ad0', handle: '#2f8cff', glow: 1 }],
    ],
    trail: [
        ['trail_none', 'Без следа', 'No Trail', { tex: '' }],
        ['trail_dust', 'Пыль', 'Dust', { tex: 'dot', c1: '#ffffff', c2: '#d8e8c8', rate: 26 }],
        ['trail_bubbles', 'Пузыри', 'Bubbles', { tex: 'bubble', c1: '#9fe8ff', c2: '#ffffff', rate: 18 }],
        ['trail_leaves', 'Листья', 'Leaves', { tex: 'leaf', c1: '#5fd05a', c2: '#c8f070', rate: 16 }],
        ['trail_hearts', 'Сердечки', 'Hearts', { tex: 'heart', c1: '#ff5a8a', c2: '#ffb0c8', rate: 14 }],
        ['trail_stars', 'Звёзды', 'Stars', { tex: 'star', c1: '#ffd23a', c2: '#ffffff', rate: 16 }],
        ['trail_snow', 'Снежинки', 'Snowflakes', { tex: 'snow', c1: '#ffffff', c2: '#bfe9ff', rate: 18 }],
        ['trail_notes', 'Ноты', 'Music Notes', { tex: 'note', c1: '#6b3f9e', c2: '#2f8cff', rate: 12 }],
        ['trail_pixels', 'Пиксели', 'Pixels', { tex: 'square', c1: '#34e27a', c2: '#2f8cff', rate: 22 }],
        ['trail_coins', 'Монетки', 'Coins', { tex: 'coin', c1: '#ffc83d', c2: '#fff0a0', rate: 12 }],
        ['trail_sparks', 'Искры', 'Sparks', { tex: 'spark', c1: '#fff2a8', c2: '#ff9a1f', rate: 30 }],
        ['trail_clouds', 'Облачка', 'Puffs', { tex: 'cloud', c1: '#ffffff', c2: '#e8f2ff', rate: 12 }],
        ['trail_flames', 'Пламя', 'Flames', { tex: 'flame', c1: '#ffb43a', c2: '#ff3b1f', rate: 30 }],
        ['trail_bolts', 'Молнии', 'Lightning', { tex: 'bolt', c1: '#fff36a', c2: '#7fd3ff', rate: 12 }],
        ['trail_candy', 'Конфетти', 'Confetti', { tex: 'square', c1: '#ff5a8a', c2: '#34e27a', rate: 28, spin: 1 }],
        ['trail_toxic', 'Токсик', 'Toxic', { tex: 'bubble', c1: '#9aff3a', c2: '#3aff8a', rate: 22 }],
        ['trail_galaxy', 'Галактика', 'Galaxy', { tex: 'star', c1: '#b48aff', c2: '#5ad0ff', rate: 24 }],
        ['trail_lovebomb', 'Любовь', 'Love Storm', { tex: 'heart', c1: '#ff3b5a', c2: '#ffd23a', rate: 26 }],
        ['trail_ice', 'Иней', 'Frostbite', { tex: 'snow', c1: '#7fe9ff', c2: '#2f8cff', rate: 28 }],
        ['trail_inferno', 'Инферно', 'Inferno', { tex: 'flame', c1: '#ff3bff', c2: '#ff3b1f', rate: 40 }],
        ['trail_rainbow', 'Радуга', 'Rainbow', { tex: 'spark', c1: '#ff3b3b', c2: '#2f8cff', rate: 40, rainbow: 1 }],
    ],
    emote: [
        ['emote_wave', 'Привет', 'Wave', { dance: 'wave' }],
        ['emote_cheer', 'Ура', 'Cheer', { dance: 'cheer' }],
        ['emote_clap', 'Аплодисменты', 'Clap', { dance: 'clap' }],
        ['emote_jacks', 'Звёздочка', 'Jumping Jacks', { dance: 'jacks' }],
        ['emote_sway', 'Покачивание', 'Sway', { dance: 'sway' }],
        ['emote_bow', 'Поклон', 'Bow', { dance: 'bow' }],
        ['emote_salute', 'Честь', 'Salute', { dance: 'salute' }],
        ['emote_flex', 'Силач', 'Flex', { dance: 'flex' }],
        ['emote_pogo', 'Попрыгунчик', 'Pogo', { dance: 'pogo' }],
        ['emote_airplane', 'Самолётик', 'Airplane', { dance: 'airplane' }],
        ['emote_chicken', 'Цыплёнок', 'Chicken Dance', { dance: 'chicken' }],
        ['emote_robot', 'Робот', 'Robot', { dance: 'robot' }],
        ['emote_squat', 'Приседания', 'Squats', { dance: 'squat' }],
        ['emote_kick', 'Каратэ', 'Karate', { dance: 'kick' }],
        ['emote_headbang', 'Рок', 'Headbang', { dance: 'headbang' }],
        ['emote_laugh', 'Хохот', 'Laugh', { dance: 'laugh' }],
        ['emote_floss', 'Флосс', 'Floss', { dance: 'floss' }],
        ['emote_dab', 'Дэб', 'Dab', { dance: 'dab' }],
        ['emote_spin', 'Волчок', 'Spin', { dance: 'spin' }],
        ['emote_moonwalk', 'Лунная походка', 'Moonwalk', { dance: 'moonwalk' }],
        ['emote_disco', 'Диско', 'Disco', { dance: 'disco' }],
    ],
};

// Эксклюзивные скины ежедневного подарка (7-й день): нет в магазине и на колесе.
const COSMETIC_EXCLUSIVE = [
    ['ex_knight', 'Золотой рыцарь', 'Golden Knight', { skin: '#d8dde3', shirt: '#a3a8b0', pants: '#6d7480', decal: 'shield', decalColor: '#ffc83d', sleeves: true, metal: 1, acc: 'knight' }],
    ['ex_astro', 'Космонавт', 'Astronaut', { skin: '#f2d3b3', shirt: '#f2f2f2', pants: '#f2f2f2', decal: 'astro', decalColor: '#2f8cff', sleeves: true, acc: 'astro' }],
    ['ex_ninja', 'Теневой ниндзя', 'Shadow Ninja', { skin: '#e8b48a', shirt: '#2a2a3a', pants: '#2a2a3a', decal: 'belt', decalColor: '#9a5aff', sleeves: true, acc: 'ninja', glow: 1 }],
    ['ex_pumpkin', 'Тыквоголовый', 'Pumpkin King', { skin: '#ff9a1f', shirt: '#3a2a4a', pants: '#1b1b1b', decal: 'flame', decalColor: '#ff9a1f', sleeves: true, acc: 'pumpkin', glow: 1 }],
];

// Мифические брейнрот-скины: первыми во вкладке «Скины», цена задана явно (3 за рекламу
// 5–7 просмотров, 3 за монеты). Голова — отдельная модель (hideHead прячет голову R6),
// fx — аура частиц и светящееся кольцо под ногами (только внешний вид). Нет на колесе и в подарке.
const COSMETIC_MYTHIC = [
    ['myth_67', '67', '67', { skin: '#e8b48a', shirt: '#1b1b1b', pants: '#3b5ba8', decal: 'six7', decalColor: '#ffd23a', sleeves: true, dance: 'sixseven', fx: { tex: 'n67', c1: '#ffd23a', c2: '#ffffff', ring: '#ffd23a', rate: 9 } }, 'ads', 7],
    ['myth_shark', 'Акулини Кроссовкини', 'Sharkini Sneakerini', { skin: '#8fa9c8', shirt: '#2f8cff', pants: '#f2f2f2', decal: 'stripe', decalColor: '#ffffff', acc: 'myth_shark', hideHead: true, fx: { tex: 'bubble', c1: '#9fe8ff', c2: '#ffffff', ring: '#2f8cff', rate: 16 } }, 'ads', 5],
    ['myth_croc', 'Крокодилло Пилотто', 'Crocodillo Pilotto', { skin: '#4f9a3a', shirt: '#8a7a4a', pants: '#5a4a2a', decal: 'badge', decalColor: '#ffc83d', sleeves: true, acc: 'myth_croc', hideHead: true, fx: { tex: 'cloud', c1: '#e8e8e8', c2: '#ffb43a', ring: '#34e27a', rate: 14 } }, 'ads', 6],
    ['myth_log', 'Тук-Тук Бревнямба', 'Tok Tok Logamba', { skin: '#9a6a3a', shirt: '#7a4a22', pants: '#5a3418', decal: 'tiger', decalColor: '#4a2a12', sleeves: true, acc: 'myth_log', hideHead: true, fx: { tex: 'leaf', c1: '#a0612e', c2: '#ffd23a', ring: '#ff9a1f', rate: 16 } }, 'ads', 7],
    ['myth_coffee', 'Капучино Танцуччино', 'Cappuccino Dancino', { skin: '#f2d3b3', shirt: '#6b4226', pants: '#3b2416', decal: 'heart', decalColor: '#f8f0e0', acc: 'myth_coffee', hideHead: true, fx: { tex: 'cloud', c1: '#ffffff', c2: '#e8d8c8', ring: '#c8823a', rate: 14 } }, 'coins', 3000],
    ['myth_banana', 'Банано Мартышкино', 'Banano Monkino', { skin: '#6b4a2e', shirt: '#f5d84a', pants: '#6b4a2e', decal: 'banana', decalColor: '#7a5a1a', acc: 'myth_banana', hideHead: true, fx: { tex: 'star', c1: '#ffd23a', c2: '#fff6a0', ring: '#ffd23a', rate: 16 } }, 'coins', 4000],
    ['myth_melon', 'Арбузина Балерина', 'Melonina Ballerina', { skin: '#ffd9c2', shirt: '#ff6f91', pants: '#34a853', decal: 'dots', decalColor: '#1b1b1b', acc: 'myth_melon', hideHead: true, fx: { tex: 'heart', c1: '#ff5a8a', c2: '#34e27a', ring: '#ff5a8a', rate: 16 } }, 'coins', 5000],
];

const COSMETIC_DEFAULTS = { skin: 'skin_default', hat: RV_TOON ? 'hat_hero' : 'hat_spiky_ginger', face: RV_TOON ? 'face_hero' : 'face_smile', knife: 'knife_classic', trail: 'trail_none', emote: 'emote_wave' };
// Бесплатные, кроме надетых по умолчанию: прежние стартовые вещи (они уже у всех) и «Без шапки».
// Цены остальных считаются по месту среди платных — этот список их не сдвигает.
const COSMETIC_FREE = ['hat_none', 'hat_spiky_ginger', 'face_smile'];
// Playables: прежние стартовые вещи — кто их не менял, получает новый стартовый образ (один раз).
const COSMETIC_OLD_DEFAULTS = { skin: 'skin_default', hat: 'hat_spiky_ginger', face: 'face_smile' };

/** @satisfies {Record<string, any>} */
const Cosmetics = {
    /** @type {any[]} */
    items: [],
    /** @type {Map<string, any>} */
    byId: new Map(),

    // Каталог: редкость по месту во вкладке, ~35% за монеты (каждый 3-й с поправкой), остальное — за рекламу.
    build() {
        if (this.items.length) return;
        const RARITY = ['common', 'rare', 'epic', 'legendary'];
        const PRICE = { common: [120, 260], rare: [380, 640], epic: [900, 1300], legendary: [1900, 2600] };
        const ADS = { common: [1, 2], rare: [2, 3], epic: [3, 4], legendary: [5, 5] };
        // Мифические — первыми, со своими ценами.
        for (const [id, ru, en, data, currency, value] of COSMETIC_MYTHIC) {
            const item = { id, tab: 'skin', ru, en, data, rarity: 'mythic', free: false, currency, price: currency === 'coins' ? value : 0, ads: currency === 'ads' ? value : 0, exclusive: false, mythic: true };
            this.items.push(item);
            this.byId.set(id, item);
        }
        for (const tab of COSMETIC_TABS) {
            const raw = COSMETIC_RAW[tab];
            const free = raw.filter(r => Object.values(COSMETIC_DEFAULTS).includes(r[0]) || COSMETIC_FREE.includes(r[0])).length;
            const paid = raw.length - free;
            let k = 0;
            raw.forEach((r) => {
                const [id, ru, en, data] = r;
                const isFree = Object.values(COSMETIC_DEFAULTS).includes(id) || COSMETIC_FREE.includes(id);
                const pos = isFree ? 0 : k / Math.max(1, paid - 1);
                const rarity = isFree ? 'common' : RARITY[pos < 0.4 ? 0 : pos < 0.7 ? 1 : pos < 0.9 ? 2 : 3];
                // Каждый 20-й блок: позиции 0,3,6,9,12,15,18 — монеты (35%).
                const coins = !isFree && [0, 3, 6, 9, 12, 15, 18].includes(k % 20);
                const span = PRICE[rarity], step = ((k * 37) % 10) / 10;
                const price = isFree ? 0 : Math.round((span[0] + (span[1] - span[0]) * step) / 10) * 10;
                const adsSpan = ADS[rarity];
                const ads = isFree || coins ? 0 : adsSpan[0] + (k % (adsSpan[1] - adsSpan[0] + 1));
                const item = { id, tab, ru, en, data, rarity, free: isFree, currency: isFree ? 'free' : coins ? 'coins' : 'ads', price: coins ? price : 0, ads, exclusive: false };
                this.items.push(item);
                this.byId.set(id, item);
                if (!isFree) k++;
            });
        }
        for (const [id, ru, en, data] of COSMETIC_EXCLUSIVE) {
            const item = { id, tab: 'skin', ru, en, data, rarity: 'legendary', free: false, currency: 'daily', price: 0, ads: 0, exclusive: true };
            this.items.push(item);
            this.byId.set(id, item);
        }
        const tabs = { skin: ['Скины', 'Skins'], hat: ['Головные уборы', 'Hats'], face: ['Лица', 'Faces'], knife: ['Ножи', 'Knives'], trail: ['Следы', 'Trails'], emote: ['Эмоции', 'Emotes'] };
        for (const k of Object.keys(tabs)) {
            if (!LANG_STRINGS.ru['tab_' + k]) LANG_STRINGS.ru['tab_' + k] = tabs[k][0];
            if (!LANG_STRINGS.en['tab_' + k]) LANG_STRINGS.en['tab_' + k] = tabs[k][1];
        }
        for (const it of this.items) {
            LANG_STRINGS.ru['cos_' + it.id] = it.ru;
            LANG_STRINGS.en['cos_' + it.id] = it.en;
        }
    },

    list(tab) { this.build(); return this.items.filter(i => i.tab === tab && !i.exclusive); },
    get(id) { this.build(); return this.byId.get(id) || null; },

    // Состояние в сохранении (поля дописываются к старым сохранениям).
    ensure(save) {
        const c = save.cos || (save.cos = {});
        c.owned = Array.isArray(c.owned) ? c.owned : [];
        const fresh = !c.eq;
        c.eq = Object.assign({}, COSMETIC_DEFAULTS, c.eq || {});
        if (RV_TOON && !fresh && !c.look2 && Object.keys(COSMETIC_OLD_DEFAULTS).every(k => c.eq[k] === COSMETIC_OLD_DEFAULTS[k])) {
            c.eq.hat = COSMETIC_DEFAULTS.hat;
            c.eq.face = COSMETIC_DEFAULTS.face;
        }
        if (RV_TOON) c.look2 = true;
        c.ads = c.ads && typeof c.ads === 'object' ? c.ads : {};
        for (const it of this.items) if (it.free && !c.owned.includes(it.id)) c.owned.push(it.id);
        save.daily = Object.assign({ day: 0, last: '', cycle: 0 }, save.daily || {});
        save.wheel = Object.assign({ free: '', adDay: '', adSpins: 0 }, save.wheel || {});
        return c;
    },

    owned(save, id) { return !!(save.cos && save.cos.owned.includes(id)); },

    grant(save, id) {
        const c = this.ensure(save);
        if (!c.owned.includes(id)) c.owned.push(id);
    },

    equip(save, id) {
        const it = this.get(id), c = this.ensure(save);
        if (!it || !c.owned.includes(id)) return false;
        c.eq[it.tab] = id;
        return true;
    },

    // Внешность персонажа из надетого (скин + головной убор + лицо + нож); try — примерка.
    look(save, tryId) {
        const c = this.ensure(save);
        const eq = Object.assign({}, c.eq);
        const t = tryId ? this.get(tryId) : null;
        if (t) eq[t.tab] = t.id;
        const skin = (this.get(eq.skin) || this.get('skin_default')).data;
        const hat = (this.get(eq.hat) || this.get(COSMETIC_DEFAULTS.hat)).data;
        const face = (this.get(eq.face) || this.get(COSMETIC_DEFAULTS.face)).data;
        const knife = (this.get(eq.knife) || this.get('knife_classic')).data;
        const trail = (this.get(eq.trail) || this.get('trail_none')).data;
        const emote = (this.get(eq.emote) || this.get('emote_wave')).data;
        return {
            skin: skin.skin, shirt: skin.shirt, pants: skin.pants, decal: skin.decal || '', decalColor: skin.decalColor || '#ffffff',
            sleeves: !!skin.sleeves, glow: skin.glow || 0, metal: skin.metal || 0, hideHead: !!skin.hideHead, fx: skin.fx || null,
            hair: skin.acc ? '' : (hat.hair || ''), hairColor: hat.hairTint || '',
            acc: skin.acc || hat.acc || '', accTint: skin.acc ? '' : (hat.tint || ''), accGlow: hat.glow || 0,
            back: skin.back || '', backColor: skin.backColor || '', shoes: skin.shoes || '', sole: skin.sole || '',
            face: face.face, knife, trail, dance: (t && t.tab === 'emote') ? emote.dance : (skin.dance || emote.dance),
        };
    },

    // --- Ежедневный подарок -------------------------------------------------------------

    today() {
        const d = new Date();
        return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    },

    secondsToMidnight() {
        const d = new Date(), m = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
        return Math.max(0, Math.round((m.getTime() - d.getTime()) / 1000));
    },

    // Награды 7 дней текущего цикла. День 7 — эксклюзивный скин цикла (кончились — 1500 монет).
    dailyRewards(save) {
        this.ensure(save);
        const cyc = save.daily.cycle || 0;
        const pick = (seed, rar) => {
            const pool = this.items.filter(i => !i.exclusive && !i.free && rar.includes(i.rarity));
            return pool.length ? pool[(seed * 7 + cyc * 13) % pool.length].id : '';
        };
        const ex = COSMETIC_EXCLUSIVE[cyc] ? COSMETIC_EXCLUSIVE[cyc][0] : '';
        return [
            { day: 1, kind: 'coins', amount: 60 },
            { day: 2, kind: 'gems', amount: 15, coins: 40 },
            { day: 3, kind: 'coins', amount: 120 },
            { day: 4, kind: 'item', itemId: pick(1, ['common', 'rare']), coins: 50 },
            { day: 5, kind: 'coins', amount: 200, gems: 25 },
            { day: 6, kind: 'item', itemId: pick(2, ['rare', 'epic']), coins: 100 },
            ex ? { day: 7, kind: 'exclusive', itemId: ex } : { day: 7, kind: 'coins', amount: 1500 },
        ];
    },

    dailyState(save) {
        this.ensure(save);
        const canClaim = save.daily.last !== this.today();
        return { day: save.daily.day % 7, canClaim, nextIn: canClaim ? 0 : this.secondsToMidnight(), rewards: this.dailyRewards(save), cycle: save.daily.cycle };
    },

    // Начислить награду дня (double — после подтверждённой рекламы, не на 7-м дне).
    claimDaily(save, double) {
        const st = this.dailyState(save);
        if (!st.canClaim) return null;
        const r = st.rewards[st.day];
        const k = double && r.day !== 7 ? 2 : 1;
        const got = { day: r.day, coins: 0, gems: 0, itemId: '', converted: false };
        const give = (id) => {
            if (!id) return;
            if (this.owned(save, id)) { got.coins += 150 * k; got.converted = true; }
            else { this.grant(save, id); got.itemId = id; }
        };
        if (r.kind === 'coins') got.coins += r.amount * k;
        if (r.kind === 'gems') got.gems += r.amount * k;
        if (r.coins) got.coins += r.coins * k;
        if (r.gems) got.gems += r.gems * k;
        if (r.kind === 'item' || r.kind === 'exclusive') give(r.itemId);
        save.coins += got.coins;
        save.gems += got.gems;
        save.daily.last = this.today();
        save.daily.day = (st.day + 1) % 7;
        if (st.day === 6) save.daily.cycle = (save.daily.cycle || 0) + 1;
        return got;
    },

    // --- Колесо фортуны -----------------------------------------------------------------

    WHEEL: [
        { kind: 'coins', amount: 50, weight: 22, color: '#ffc83d' },
        { kind: 'gems', amount: 10, weight: 14, color: '#34e27a' },
        { kind: 'coins', amount: 100, weight: 18, color: '#ff9a1f' },
        { kind: 'item', weight: 7, color: '#b48aff' },
        { kind: 'coins', amount: 75, weight: 20, color: '#2f8cff' },
        { kind: 'gems', amount: 25, weight: 8, color: '#2fb5c9' },
        { kind: 'coins', amount: 300, weight: 5, color: '#ff3b3b' },
        { kind: 'item', weight: 6, color: '#e86fa8' },
    ],
    WHEEL_AD_SPINS: 3,

    wheelState(save) {
        this.ensure(save);
        const w = save.wheel, today = this.today();
        if (w.adDay !== today) { w.adDay = today; w.adSpins = 0; }
        return {
            sectors: this.WHEEL.map(s => ({ kind: s.kind, amount: s.amount || 0, color: s.color })),
            freeAvailable: w.free !== today, nextFreeIn: w.free !== today ? 0 : this.secondsToMidnight(),
            adSpinsLeft: Math.max(0, this.WHEEL_AD_SPINS - w.adSpins),
        };
    },

    // Результат выбирается ДО анимации и начисляется сразу (один раз).
    spinWheel(save, byAd, rand) {
        const st = this.wheelState(save), w = save.wheel;
        if (byAd ? st.adSpinsLeft <= 0 : !st.freeAvailable) return null;
        const total = this.WHEEL.reduce((n, s) => n + s.weight, 0);
        let r = (rand || Math.random)() * total, index = 0;
        for (let i = 0; i < this.WHEEL.length; i++) { r -= this.WHEEL[i].weight; if (r < 0) { index = i; break; } }
        const s = this.WHEEL[index];
        const prize = { kind: s.kind, amount: s.amount || 0, itemId: '', converted: false };
        if (s.kind === 'coins') save.coins += s.amount;
        else if (s.kind === 'gems') save.gems += s.amount;
        else {
            const pool = this.items.filter(i => !i.exclusive && !i.free && !i.mythic && !this.owned(save, i.id));
            if (pool.length) { const it = pool[Math.floor((rand || Math.random)() * pool.length)]; this.grant(save, it.id); prize.itemId = it.id; }
            else { prize.kind = 'coins'; prize.amount = 250; prize.converted = true; save.coins += 250; }
        }
        if (byAd) w.adSpins++; else w.free = this.today();
        return { index, prize };
    },
};

Cosmetics.build();
