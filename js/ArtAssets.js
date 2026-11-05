// ArtAssets.js — ImageGen art. Literal paths keep assets visible to the build scanner.

/** @type {Record<string, string>} */
const ART_FACES = {
    // hero / buddy / champ и их эмоции mad / fear / daze — не ImageGen: рисует
    // assets/models/src/make_faces.py (PIL).
    hero: 'assets/textures/faces/hero.webp',
    buddy: 'assets/textures/faces/buddy.webp',
    champ: 'assets/textures/faces/champ.webp',
    mad: 'assets/textures/faces/mad.webp',
    fear: 'assets/textures/faces/fear.webp',
    daze: 'assets/textures/faces/daze.webp',
    smile: 'assets/textures/faces/smile.webp',
    grin: 'assets/textures/faces/grin.webp',
    wink: 'assets/textures/faces/wink.webp',
    happy: 'assets/textures/faces/happy.webp',
    smirk: 'assets/textures/faces/smirk.webp',
    tongue: 'assets/textures/faces/tongue.webp',
    surprised: 'assets/textures/faces/surprised.webp',
    sleepy: 'assets/textures/faces/sleepy.webp',
    cool: 'assets/textures/faces/cool.webp',
    nerd: 'assets/textures/faces/nerd.webp',
    cat: 'assets/textures/faces/cat.webp',
    mustache: 'assets/textures/faces/mustache.webp',
    derp: 'assets/textures/faces/derp.webp',
    kawaii: 'assets/textures/faces/kawaii.webp',
    beard: 'assets/textures/faces/beard.webp',
    eyepatch: 'assets/textures/faces/eyepatch.webp',
    monocle: 'assets/textures/faces/monocle.webp',
    clown: 'assets/textures/faces/clown.webp',
    vampire: 'assets/textures/faces/vampire.webp',
    robot: 'assets/textures/faces/robot.webp',
    hearts: 'assets/textures/faces/hearts.webp',
    stars: 'assets/textures/faces/stars.webp',
    money: 'assets/textures/faces/money.webp',
    fireeyes: 'assets/textures/faces/fireeyes.webp',
    angry: 'assets/textures/faces/angry.webp',
    scared: 'assets/textures/faces/scared.webp',
    dizzy: 'assets/textures/faces/dizzy.webp',
};

/** @type {Record<string, string>} */
const ART_DECALS = {
    stripe: 'assets/textures/decals/stripe.webp',
    bolt: 'assets/textures/decals/bolt.webp',
    num: 'assets/textures/decals/num.webp',
    hoodie: 'assets/textures/decals/hoodie.webp',
    overalls: 'assets/textures/decals/overalls.webp',
    flower: 'assets/textures/decals/flower.webp',
    buttons: 'assets/textures/decals/buttons.webp',
    cross: 'assets/textures/decals/cross.webp',
    badge: 'assets/textures/decals/badge.webp',
    spots: 'assets/textures/decals/spots.webp',
    dots: 'assets/textures/decals/dots.webp',
    camo: 'assets/textures/decals/camo.webp',
    tie: 'assets/textures/decals/tie.webp',
    tiger: 'assets/textures/decals/tiger.webp',
    torn: 'assets/textures/decals/torn.webp',
    bandage: 'assets/textures/decals/bandage.webp',
    robot: 'assets/textures/decals/robot.webp',
    super: 'assets/textures/decals/super.webp',
    belt: 'assets/textures/decals/belt.webp',
    snow: 'assets/textures/decals/snow.webp',
    stars: 'assets/textures/decals/stars.webp',
    rainbow: 'assets/textures/decals/rainbow.webp',
    neon: 'assets/textures/decals/neon.webp',
    flame: 'assets/textures/decals/flame.webp',
    ribs: 'assets/textures/decals/ribs.webp',
    banana: 'assets/textures/decals/banana.webp',
    star: 'assets/textures/decals/star.webp',
    gem: 'assets/textures/decals/gem.webp',
    shield: 'assets/textures/decals/shield.webp',
    astro: 'assets/textures/decals/astro.webp',
    heart: 'assets/textures/decals/heart.webp',
    circle: 'assets/textures/decals/circle.webp',
    skull: 'assets/textures/decals/skull.webp',
};

/** @type {Record<string, string>} */
const ART_TRAILS = {
    dot: 'assets/textures/trails/dot.webp',
    bubble: 'assets/textures/trails/bubble.webp',
    leaf: 'assets/textures/trails/leaf.webp',
    heart: 'assets/textures/trails/heart.webp',
    star: 'assets/textures/trails/star.webp',
    snow: 'assets/textures/trails/snow.webp',
    note: 'assets/textures/trails/note.webp',
    square: 'assets/textures/trails/square.webp',
    coin: 'assets/textures/trails/coin.webp',
    spark: 'assets/textures/trails/spark.webp',
    cloud: 'assets/textures/trails/cloud.webp',
    flame: 'assets/textures/trails/flame.webp',
    bolt: 'assets/textures/trails/bolt.webp',
};

/** @type {Record<string, string>} */
const ART_UI_ICONS = {
    gem: 'assets/ui/icons/gem.webp',
    coin: 'assets/ui/icons/coin.webp',
    knife: 'assets/ui/icons/knife.webp',
    runner: 'assets/ui/icons/runner.webp',
    chaser: 'assets/ui/icons/chaser.webp',
    bolt: 'assets/ui/icons/bolt.webp',
    dash: 'assets/ui/icons/dash.webp',
    revive: 'assets/ui/icons/revive.webp',
    pause: 'assets/ui/icons/pause.webp',
    soundOn: 'assets/ui/icons/soundOn.webp',
    soundOff: 'assets/ui/icons/soundOff.webp',
    trophy: 'assets/ui/icons/trophy.webp',
    timer: 'assets/ui/icons/timer.webp',
    next: 'assets/ui/icons/next.webp',
    play: 'assets/ui/icons/play.webp',
    bag: 'assets/ui/icons/bag.webp',
    help: 'assets/ui/icons/help.webp',
    close: 'assets/ui/icons/close.webp',
    home: 'assets/ui/icons/home.webp',
    star: 'assets/ui/icons/star.webp',
    check: 'assets/ui/icons/check.webp',
    ghost: 'assets/ui/icons/ghost.webp',
    lock: 'assets/ui/icons/lock.webp',
    shirt: 'assets/ui/icons/shirt.webp',
    hat: 'assets/ui/icons/hat.webp',
    face: 'assets/ui/icons/face.webp',
    trail: 'assets/ui/icons/trail.webp',
    gift: 'assets/ui/icons/gift.webp',
    wheel: 'assets/ui/icons/wheel.webp',
    adplay: 'assets/ui/icons/adplay.webp',
    gear: 'assets/ui/icons/gear.webp',
    emote: 'assets/ui/icons/emote.webp',
    hanger: 'assets/ui/icons/hanger.webp',
    crown: 'assets/ui/icons/crown.webp',
    heart: 'assets/ui/icons/heart.webp',
    tv: 'assets/ui/icons/tv.webp',
    shiftlock: 'assets/ui/icons/shiftlock.webp',
    sprint: 'assets/ui/icons/sprint.webp',
    door: 'assets/ui/icons/door.webp',
    cloak: 'assets/ui/icons/cloak.webp',
    airhorn: 'assets/ui/icons/airhorn.webp',
    lunge: 'assets/ui/icons/lunge.webp',
    leash: 'assets/ui/icons/leash.webp',
    dagger: 'assets/ui/icons/dagger.webp',
    rocket: 'assets/ui/icons/rocket.webp',
    medkit: 'assets/ui/icons/medkit.webp',
    adrenaline: 'assets/ui/icons/adrenaline.webp',
};

/** @type {Record<string, string>} */
const ART_ITEMS = {
    sprint: 'assets/ui/items/sprint.webp',
    door: 'assets/ui/items/door.webp',
    cloak: 'assets/ui/items/cloak.webp',
    airhorn: 'assets/ui/items/airhorn.webp',
    lunge: 'assets/ui/items/lunge.webp',
    leash: 'assets/ui/items/leash.webp',
    dagger: 'assets/ui/items/dagger.webp',
    rocket: 'assets/ui/items/rocket.webp',
    medkit: 'assets/ui/items/medkit.webp',
    adrenaline: 'assets/ui/items/adrenaline.webp',
};

/** @type {Record<string, string>} */
const ART_FX = {
    hit_star: 'assets/fx/hit_star.webp',
    spark: 'assets/fx/spark.webp',
    puff: 'assets/fx/puff.webp',
    gem_glint: 'assets/fx/gem_glint.webp',
    confetti: 'assets/fx/confetti.webp',
    dizzy_star: 'assets/fx/dizzy_star.webp',
    ring: 'assets/fx/ring.webp',
};

/** @type {Record<string, string>} */
const ART_META = {
    gift_closed: 'assets/ui/meta/gift_closed.webp',
    gift_open: 'assets/ui/meta/gift_open.webp',
    coins_pile: 'assets/ui/meta/coins_pile.webp',
    gems_pile: 'assets/ui/meta/gems_pile.webp',
    chest: 'assets/ui/meta/chest.webp',
    wheel_hub: 'assets/ui/meta/wheel_hub.webp',
    wheel_pointer: 'assets/ui/meta/wheel_pointer.webp',
    prize_box: 'assets/ui/meta/prize_box.webp',
    logo: String(GAME_PLATFORM) === 'pikabu' ? 'assets/ui/logo-pikabu.webp' : 'assets/ui/logo.webp',   // Пикабу: название только по-русски
};

/** @satisfies {Record<string, any>} */
const ArtAssets = {
    /** @type {Map<string, HTMLImageElement>} */
    images: new Map(),
    /** @type {Map<string, HTMLCanvasElement>} */
    tinted: new Map(),
    /** @type {Promise<void> | null} */
    ready: null,
    preload() {
        if (this.ready) return this.ready;
        const paths = new Set([ART_FACES, ART_DECALS, ART_TRAILS, ART_UI_ICONS, ART_ITEMS, ART_FX, ART_META].flatMap(m => Object.values(m)));
        this.ready = Promise.all(Array.from(paths, async path => {
            const img = new Image();
            img.decoding = 'async';
            img.src = path;
            try { await img.decode(); this.images.set(path, img); }
            catch { /* The procedural art remains available for a missing asset. */ }
        })).then(() => {});
        return this.ready;
    },
    image(path) { return path ? this.images.get(path) : null; },
    draw(ctx, path, color, width = 256, height = 256, color2 = null) {
        const img = this.image(path);
        if (!img) return false;
        if (!color || (color === '#ffffff' && (!color2 || color2 === '#ffffff'))) {
            ctx.drawImage(img, 0, 0, width, height);
            return true;
        }
        const key = path + '|' + color + '|' + (color2 || '');
        let canvas = this.tinted.get(key);
        if (!canvas) {
            canvas = document.createElement('canvas');
            canvas.width = canvas.height = 256;
            const c = canvas.getContext('2d');
            c.drawImage(img, 0, 0, 256, 256);
            c.globalCompositeOperation = 'multiply';
            if (color2 && color2 !== color) {
                const gradient = c.createLinearGradient(0, 0, 0, 256);
                gradient.addColorStop(0, color); gradient.addColorStop(1, color2);
                c.fillStyle = gradient;
            } else c.fillStyle = color;
            c.fillRect(0, 0, 256, 256);
            c.globalCompositeOperation = 'destination-in';
            c.drawImage(img, 0, 0, 256, 256);
            this.tinted.set(key, canvas);
        }
        ctx.drawImage(canvas, 0, 0, width, height);
        return true;
    },
};

