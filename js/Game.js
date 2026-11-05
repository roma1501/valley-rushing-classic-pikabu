// Game.js — Valley Rushing Classic: связка движка, правил (Match.js), ботов (Bots.js), персонажей
// (Characters.js) и интерфейса (GameUI.js).
//
// Режимы: menu (толпа танцует у линии, камера облетает поле) -> tutorial (первый запуск или
// «Как играть») -> match (16 игроков: вы и 15 ботов) -> results -> menu.
// Камера — от третьего лица за игроком, смотрит туда, куда нужно бежать (бегун) или на
// бегунов (ловец); правой кнопкой мыши / пальцем справа — повернуть. Ввод: WASD/стрелки,
// Пробел — рывок, Shift — остановка, ЛКМ/E — удар (ловец), E удерживать — спасти (бегун),
// Q — способность; на телефоне — джойстик и кнопки GameUI.
// Прогресс (кристаллы, монеты, опыт, купленное, tutorialDone) — одним объектом Platform.save.

/** @type {Record<string, string>} */
const SFX = {
    ui_click: 'assets/sounds/ui_click.ogg', ui_buy: 'assets/sounds/ui_buy.ogg', ui_error: 'assets/sounds/ui_error.ogg', ui_open: 'assets/sounds/ui_open.ogg',
    knife_swing: 'assets/sounds/knife_swing.ogg', knife_hit: 'assets/sounds/knife_hit.ogg', downed: 'assets/sounds/downed.ogg', convert: 'assets/sounds/convert.ogg',
    gem_pickup: 'assets/sounds/gem_pickup.ogg', coin_reward: 'assets/sounds/coin_reward.ogg',
    dash: 'assets/sounds/dash.ogg', brake: 'assets/sounds/brake.ogg', trip: 'assets/sounds/trip.ogg',
    step_1: 'assets/sounds/step_1.ogg', step_2: 'assets/sounds/step_2.ogg', step_3: 'assets/sounds/step_3.ogg',
    whistle: 'assets/sounds/whistle.wav', beep: 'assets/sounds/beep.ogg', go: 'assets/sounds/go.ogg', time_tick: 'assets/sounds/time_tick.ogg',
    crossed: 'assets/sounds/crossed.ogg', heartbeat: 'assets/sounds/heartbeat.ogg',
    round_win: 'assets/sounds/round_win.ogg', round_lose: 'assets/sounds/round_lose.ogg', match_win: 'assets/sounds/match_win.ogg', match_lose: 'assets/sounds/match_lose.ogg',
    level_up: 'assets/sounds/level_up.ogg', revive: 'assets/sounds/revive.ogg', hero: 'assets/sounds/hero.ogg',
    ability_door: 'assets/sounds/ability_door.ogg', ability_cloak: 'assets/sounds/ability_cloak.ogg', ability_airhorn: 'assets/sounds/ability_airhorn.ogg',
    ability_leash: 'assets/sounds/ability_leash.ogg', ability_dagger: 'assets/sounds/ability_dagger.ogg', ability_rocket: 'assets/sounds/ability_rocket.wav',
    ability_sprint: 'assets/sounds/ability_sprint.ogg', ability_lunge: 'assets/sounds/ability_lunge.ogg',
    water_splash: 'assets/sounds/water_splash.ogg', water_plop: 'assets/sounds/water_plop.ogg',
};
// Базовая громкость по уровню файлов (assets/sounds/SOUNDS.md): тихие шаги и монеты громче.
/** @type {Record<string, number>} */
const SFX_GAIN = {
    ui_open: 0.75, knife_swing: 0.8, gem_pickup: 0.55, dash: 0.55, whistle: 0.45, go: 0.8, crossed: 0.9, round_win: 0.95,
    match_lose: 0.95, level_up: 0.75, revive: 0.6, hero: 0.95, ability_door: 0.8, ability_cloak: 0.9, ability_airhorn: 0.6,
    ability_sprint: 0.9, trip: 0.55, step_1: 2.2, step_2: 2.2, step_3: 2.2, coin_reward: 1.8, ui_buy: 2, ability_dagger: 1.8, ability_leash: 1.8,
};
const MUSIC = { menu: 'assets/sounds/music_menu.mp3', round: 'assets/sounds/music_round.ogg', lobby: 'assets/sounds/music_lobby.ogg' };

const RV_SAVE_DEFAULT = {
    v: 1, tutorialDone: false, coins: 0, gems: 0, xp: 0, level: 1, wins: 0, matches: 0,
    owned: ['sprint', 'lunge'], eqRunner: 'sprint', eqChaser: 'lunge', eqItem: '', items: { medkit: 0, adrenaline: 0 },
};

/** @returns {any} */
function rvUI() { return typeof GameUI !== 'undefined' ? GameUI : {}; }

/** @satisfies {Record<string, any>} */
const Game = {
    /** @type {any} */
    app: null,
    /** @type {any} */
    geo: null,
    groundH: 80,
    mode: 'boot',
    /** @type {RVActor[]} */
    actors: [],
    /** @type {RVActor | null} */
    player: null,
    /** @type {RVMatch | null} */
    match: null,
    /** @type {any} */
    save: null,
    keys: new Set(),
    touch: false,
    camAz: -Math.PI / 2,
    camAzSmooth: -Math.PI / 2,
    follow: { x: 0, y: 0 },
    /** @type {any} */
    gemModel: null,
    gemMeshes: new Map(),
    doorMeshes: new Map(),
    /** @type {any} */
    lines: null,
    /** @type {any} */
    ring: null,
    /** @type {any} */
    dust: null,
    slashes: new Map(),
    ropes: [],
    shocks: [],
    hudT: 0,
    /** @type {any} */
    tut: null,
    endT: 0,
    resultsShown: false,
    menuT: 0,
    orbit: null,
    _waterT: 0,
    _lastHint: '',
    _busy: false,

    // --- Запуск -----------------------------------------------------------------------

    async init(app) {
        this.app = app;
        CameraController.PAN_KEYS = /** @type {any} */ ({});   // WASD двигает героя, а не камеру
        const loc = app.location;
        this.geo = this.fieldGeo(loc);
        this.groundH = loc.terrain.heightAt(this.geo.cx, this.geo.cy) + this.geo.h;
        LoadingScreen.set(82);
        const [save] = await Promise.all([
            Platform.load().catch(() => null),
            Characters.preload(),
            Model3D.load('assets/models/gem.glb').then(m => { this.gemModel = m; }).catch(() => { this.gemModel = null; }),
            Sound.preload(Object.values(SFX)),
        ]);
        this.save = Object.assign(JSON.parse(JSON.stringify(RV_SAVE_DEFAULT)), save || {});
        this.save.items = Object.assign({ medkit: 0, adrenaline: 0 }, this.save.items || {});
        // Сложность ботов: по умолчанию средняя, в Playables — лёгкая.
        this.save.settings = Object.assign({ outline: false, water: false, difficulty: Platform.name === 'playables' ? 'easy' : 'normal' }, this.save.settings || {});
        Cosmetics.ensure(this.save);
        LoadingScreen.set(88);
        this.setupWorld();
        this.registerFx();
        this.createActors();
        this.setupCamera();
        this.setupInput();
        this.setupUI();
        this.installRenderOverrides();
        if (this.save.settings.water) RVWater.enable(this);
        app.onFrame(dt => this.frame(dt));
        // Пауза Playables: оверлей «Пауза» без кнопок, ввод блокирует SDK-пауза движка.
        Pause.onChange((active, reason, on) => {
            rvUI().platformPause?.(Pause.has('platform'));
            if (reason === 'platform' && on) this.persist();   // Playables: сохранить на onPause
        });
        window.addEventListener('lory-release-input', () => this.releaseInput());
    },

    async ready() {
        this.enterMenu();
        // Кадр с толпой и камерой — до снятия загрузки.
        this.frame(0.016);
    },

    // Поле — маркеры карты: field (центр, scale — размер в метрах), line-a, line-b, chaser.
    fieldGeo(loc) {
        const f = loc.marker('field'), a = loc.marker('line-a'), b = loc.marker('line-b'), c = loc.marker('chaser');
        const W = (f && f.scale ? f.scale[0] : 28) * 100, L = (f && f.scale ? f.scale[2] : 40) * 100;
        const cx = f ? f.x : loc.width / 2, cy = f ? f.y : loc.height / 2;
        return {
            cx, cy, W, L, h: f ? f.h : 80,
            minX: cx - W / 2, maxX: cx + W / 2, minY: cy - L / 2, maxY: cy + L / 2,
            lineA: a ? a.y : cy + L * 0.4, lineB: b ? b.y : cy - L * 0.4,
            chaser: c ? { x: c.x, y: c.y } : { x: cx, y: cy },
        };
    },

    // --- Мир: небо, линии, пена у края, кольцо досягаемости, частицы -------------------

    setupWorld() {
        const app = this.app, view = app.location.view, scene = view.scene, g = this.geo, H = this.groundH;
        // Камера может опускаться низко: край воды прячет туман, а не ограничение наклона.
        app.location.terrain.outerRing = 0;
        // Небо: градиентный купол без света и тумана.
        const sky = BABYLON.MeshBuilder.CreateSphere('rv-sky', { diameter: 16000, segments: 24, sideOrientation: BABYLON.Mesh.BACKSIDE }, scene);
        const tex = new BABYLON.DynamicTexture('rv-sky-tex', { width: 8, height: 512 }, scene, false);
        const ctx = /** @type {CanvasRenderingContext2D} */ (/** @type {any} */ (tex.getContext()));
        const grd = ctx.createLinearGradient(0, 0, 0, 512);
        grd.addColorStop(0, '#2f86e8'); grd.addColorStop(0.36, '#62adf2'); grd.addColorStop(0.49, '#bfe6fb');
        grd.addColorStop(0.52, '#d8f3ff'); grd.addColorStop(1, '#9fdcf0');
        ctx.fillStyle = grd; ctx.fillRect(0, 0, 8, 512); tex.update(false);
        const skyMat = new BABYLON.StandardMaterial('rv-sky-mat', scene);
        skyMat.emissiveTexture = tex; skyMat.disableLighting = true; skyMat.fogEnabled = false;
        skyMat.diffuseColor = new BABYLON.Color3(0, 0, 0); skyMat.specularColor = new BABYLON.Color3(0, 0, 0);
        skyMat.metadata = { toon: false }; skyMat.disableDepthWrite = true;
        sky.material = skyMat; sky.infiniteDistance = true; sky.isPickable = false;
        sky.renderingGroupId = 0;
        this.sky = sky;
        // Белые линии старта и финиша.
        const lineMat = new BABYLON.StandardMaterial('rv-line-mat', scene);
        lineMat.disableLighting = true; lineMat.emissiveColor = new BABYLON.Color3(1, 1, 1);
        lineMat.metadata = { toon: false };
        const mkLine = (y, name) => {
            const m = BABYLON.MeshBuilder.CreateBox(name, { width: g.W - 8, height: 3, depth: 34 }, scene);
            m.position.set(g.cx, H + 1.2, y);
            m.material = lineMat.clone(name + '-mat');
            m.isPickable = false;
            return m;
        };
        this.lines = { a: mkLine(g.lineA, 'rv-line-a'), b: mkLine(g.lineB, 'rv-line-b') };
        // Пена по краю поля.
        const foamMat = new BABYLON.StandardMaterial('rv-foam', scene);
        foamMat.disableLighting = true; foamMat.emissiveColor = new BABYLON.Color3(1, 1, 1); foamMat.alpha = 0.55;
        foamMat.metadata = { toon: false };
        this.foam = [];
        const fw = 70;
        for (const [w, d, x, y] of [[g.W + fw * 2, fw, g.cx, g.minY - fw / 2], [g.W + fw * 2, fw, g.cx, g.maxY + fw / 2], [fw, g.L, g.minX - fw / 2, g.cy], [fw, g.L, g.maxX + fw / 2, g.cy]]) {
            const m = BABYLON.MeshBuilder.CreateGround('rv-foam', { width: w, height: d }, scene);
            m.position.set(x, 3, y); m.material = foamMat; m.isPickable = false;
            this.foam.push(m);
        }
        this.foamMat = foamMat;
        // Кольцо досягаемости ножа под игроком-ловцом.
        const ring = BABYLON.MeshBuilder.CreateTorus('rv-ring', { diameter: 2, thickness: 0.035, tessellation: 64 }, scene);
        const ringMat = new BABYLON.StandardMaterial('rv-ring-mat', scene);
        ringMat.disableLighting = true; ringMat.emissiveColor = new BABYLON.Color3(1, 1, 1); ringMat.alpha = 0.5;
        ringMat.metadata = { toon: false };
        ring.material = ringMat; ring.isPickable = false; ring.setEnabled(false);
        this.ring = ring;
        // Облака не отбрасывают тень на поле.
        for (const rec of app.location.objects) {
            if (rec.mesh && /cloud/i.test(String(rec.def.model || ''))) view.removeShadowCaster(rec.mesh);
        }
        // Деревья и облака на слабых устройствах — часть прячется.
        this.applyQuality();
    },

    applyQuality() {
        const loc = this.app.location;
        const cores = (navigator.hardwareConcurrency || 8);
        const tier = !IS_MOBILE ? 'high' : cores <= 4 ? 'low' : 'medium';
        const hide = { high: 0.3, medium: 0.5, low: 0.78 }[tier];
        let i = 0;
        for (const rec of loc.objects) {
            const name = String(rec.def.name || '') + ' ' + String(rec.def.model || '');
            if (!rec.mesh || !/tree|cloud/i.test(name)) continue;
            i++;
            // Детерминированно: каждое k-е дерево, чтобы картинка не мигала между запусками.
            const frac = (i * 0.618) % 1;
            if (tier !== 'high' || /cloud/i.test(name)) rec.mesh.setEnabled(frac >= hide * (tier === 'high' ? 0 : 1));
        }
        this.quality = tier;
    },

    registerFx() {
        const fx = this.app.fx;
        if (!fx) return;
        const textures = {
            hit: ['hit_star', 'dizzy_star', 'spark'], gem: ['gem_glint', 'ring'],
            convert: ['puff', 'spark'], revive: ['gem_glint'], puff: ['puff'],
            streak: ['spark'], confetti: ['confetti', 'confetti'], shock: ['ring'],
            dizzy: ['dizzy_star'], 'run-dust': ['puff'],
        };
        const register = (name, layers) => {
            layers.forEach((layer, i) => {
                const key = textures[name][i];
                layer.texture = ART_FX[key];
                layer.color = layer.color2 = '#ffffff';
                if (layer.colorGradient) layer.colorGradient = layer.colorGradient.map(g => [g[0], '#ffffff', g[2]]);
                if (key === 'hit_star' || key === 'puff') layer.sheet = { width: 128, height: 128, start: 0, end: 3, speed: 1, loop: false };
                if (key === 'confetti') layer.sheet = { width: 128, height: 128, start: 0, end: 3, speed: 0, loop: false, randomStart: true };
                layer.blend = 'standard';
            });
            fx.register(name, layers);
        };
        register('hit', [
            { burst: 1, capacity: 2, life: [0.14, 0.16], size: [120, 130], speed: [0, 0], color: '#fff8c8', sizeGradient: [[0, 0.4], [0.4, 1], [1, 0.2]] },
            { burst: 14, capacity: 18, life: [0.25, 0.5], size: [22, 42], speed: [140, 300], color: '#ffd23a', color2: '#ffe680', gravity: [0, -260, 0], sizeGradient: [[0, 1], [1, 0.1]] },
            { burst: 26, capacity: 30, life: [0.2, 0.45], size: [5, 10], speed: [300, 560], color: '#ffffff', gravity: [0, -400, 0] },
        ]);
        register('gem', [
            { burst: 26, capacity: 30, life: [0.35, 0.8], size: [6, 14], speed: [90, 230], color: '#5dff9a', color2: '#d8ffe6', gravity: [0, 160, 0] },
            { burst: 1, capacity: 2, life: [0.2, 0.22], size: [110, 120], speed: [0, 0], color: '#b6ffd0', sizeGradient: [[0, 0.3], [0.5, 1], [1, 0]] },
        ]);
        register('convert', [
            { burst: 24, capacity: 30, life: [0.6, 1.3], size: [30, 64], speed: [30, 110], color: '#3a1018', blend: 'standard', direction: [[-0.5, 0.4, -0.5], [0.5, 1, 0.5]], gravity: [0, 40, 0], sizeGradient: [[0, 0.4], [1, 1.6]], colorGradient: [[0, '#4a1420', 0.8], [1, '#2a0c12', 0]] },
            { burst: 30, capacity: 34, life: [0.3, 0.7], size: [6, 12], speed: [160, 340], color: '#ff3b3b', color2: '#ffb0a0' },
        ]);
        register('revive', [
            { burst: 30, capacity: 34, life: [0.6, 1.2], size: [8, 16], speed: [40, 120], color: '#7dffb0', color2: '#ffffff', direction: [[-0.3, 1, -0.3], [0.3, 1, 0.3]], gravity: [0, 120, 0], box: [[-50, 0, -50], [50, 40, 50]] },
        ]);
        register('puff', [
            { burst: 10, capacity: 12, life: [0.35, 0.7], size: [18, 36], speed: [40, 130], color: '#e9f2d8', blend: 'standard', direction: [[-1, 0.2, -1], [1, 0.6, 1]], sizeGradient: [[0, 0.5], [1, 1.5]], colorGradient: [[0, '#f2f7e6', 0.75], [1, '#f2f7e6', 0]] },
        ]);
        register('streak', [
            { burst: 14, capacity: 16, life: [0.15, 0.3], size: [6, 12], speed: [20, 60], color: '#ffffff', box: [[-30, 40, -30], [30, 160, 30]] },
        ]);
        register('confetti', [
            { burst: 90, capacity: 100, life: [1.4, 2.6], size: [8, 15], speed: [200, 520], color: '#ffd23a', color2: '#ff3b8a', direction: [[-0.6, 1, -0.6], [0.6, 1, 0.6]], gravity: [0, -420, 0], spin: [-6, 6] },
            { burst: 70, capacity: 80, life: [1.4, 2.6], size: [8, 15], speed: [200, 520], color: '#2f8cff', color2: '#34e27a', direction: [[-0.6, 1, -0.6], [0.6, 1, 0.6]], gravity: [0, -420, 0], spin: [-6, 6] },
        ]);
        register('shock', [
            { burst: 1, capacity: 2, life: [0.3, 0.55], size: [120, 130], speed: [0, 0], color: '#fff2a8', sizeGradient: [[0, 0.4], [1, 1.6]] },
        ]);
        register('dizzy', [
            { rate: 7, capacity: 12, life: [0.5, 0.9], size: [7, 12], speed: [10, 30], color: '#ffe14a', box: [[-26, 0, -26], [26, 6, 26]], direction: [[-0.3, 1, -0.3], [0.3, 1, 0.3]] },
        ]);
        register('run-dust', [
            { rate: 0, capacity: 60, life: [0.35, 0.7], size: [12, 26], speed: [10, 50], color: '#eef5dc', blend: 'standard', box: [[-18, 0, -18], [18, 4, 18]], direction: [[-0.5, 0.4, -0.5], [0.5, 1, 0.5]], sizeGradient: [[0, 0.4], [1, 1.4]], colorGradient: [[0, '#eef5dc', 0.6], [1, '#eef5dc', 0]] },
        ]);
    },

    // --- Актёры --------------------------------------------------------------------------

    createActors() {
        const view = this.app.location.view;
        const names = String(Lang.t('botNames') || '').split(',').map(s => s.trim()).filter(Boolean);
        const pool = names.length >= 15 ? names : ['Pixel', 'Blocky', 'Taco', 'Zoom', 'Kitty', 'Bacon', 'Luna', 'Frosty', 'Ninja', 'Dusty', 'Mega', 'Chill', 'Turbo', 'Sunny', 'Rocket', 'Panda'];
        for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
        const c = rvCfg();
        const knives = Cosmetics.list('knife').map(i => i.data);
        for (let i = 0; i < c.players; i++) {
            const isPlayer = i === 0;
            const look = isPlayer ? Cosmetics.look(this.save) : Characters.randomLook(Math.random, i % 5 === 1);
            if (!isPlayer) {
                look.knife = knives[Math.floor(Math.random() * Math.min(knives.length, 12))];
                look.dance = Characters.DANCES[Math.floor(Math.random() * Characters.DANCES.length)];
            }
            const a = new RVActor(i, isPlayer ? Lang.t('plateYou') : pool[(i - 1) % pool.length], look, isPlayer);
            a.level = isPlayer ? this.save.level : 1 + Math.floor(Math.random() * 45);
            a.rig = new CharacterRig(view, look, i);
            if (isPlayer) a._lookKey = JSON.stringify(look);
            if (!isPlayer) a.bot = Bots.brain(Math.random, this.botSkill());
            this.actors.push(a);
            rvUI().plate?.(a.id, { name: a.name, sub: Lang.t('plateLevel', { n: a.level }), me: isPlayer });
        }
        this.player = this.actors[0];
    },

    resetActor(a) {
        a.vx = a.vy = 0; a.dashT = a.brakeT = a.stunT = 0; a.attackT = -1; a.invulnT = 0; a.celebrateT = 0;
        for (const k in a.buffs) a.buffs[k] = 0;
        a.input = { mx: 0, my: 0, dash: false, brake: false, attack: false, ability: false, action: false };
        a.ability = { id: '', cd: 0, activeT: 0 };
        a.consumable = { id: '', count: 0 };
        if (a.bot) a.ability.id = a.team === 'chaser' ? 'lunge' : (a.bot.bravery > 0.6 ? 'sprint' : '');
        if (a.rig) { a.rig.setVisibility(1); a.rig.down = 0; }
    },

    equipPlayer() {
        const p = this.player, s = this.save;
        if (!p) return;
        p.ability.id = p.team === 'chaser' ? s.eqChaser : s.eqRunner;
        if (!s.owned.includes(p.ability.id)) p.ability.id = p.team === 'chaser' ? 'lunge' : 'sprint';
        const it = s.eqItem;
        p.consumable = it && s.items[it] > 0 ? { id: it, count: 1 } : { id: '', count: 0 };
    },

    // --- Камера (как в Roblox) ------------------------------------------------------
    // Камера смотрит на голову игрока без запаздывания и сама не крутится: поворот —
    // правой кнопкой мыши (по горизонтали и вертикали) или пальцем справа, приближение —
    // колесом или щипком. Ctrl — Shift Lock: курсор захвачен, мышь крутит камеру, персонаж
    // смотрит туда же, камера чуть за правым плечом. В начале каждого пересечения камера
    // один раз плавно разворачивается к цели забега.

    setupCamera() {
        const cam = this.app.camera;
        cam.ignorePointer = () => true;                // мышь и пальцы над холстом — для игры
        cam.follow(this.follow);
        this.camH = this.groundH + 150;
        cam._groundH = () => this.camH;                // точка взгляда — голова персонажа (в гардеробе — своя)
        this.view = { yaw: -Math.PI / 2, pitch: 0.32, dist: 470, snapT: 0, lock: false };
        const canvas = /** @type {HTMLCanvasElement} */ (document.getElementById('world3d'));
        canvas.addEventListener('wheel', (e) => {
            if (!e.deltaY) return;
            const v = this.view;
            v.dist = Math.max(170, Math.min(1500, v.dist * Math.pow(1.13, Math.max(-1, Math.min(1, e.deltaY / 100)))));
        }, { passive: true });
        document.addEventListener('pointerlockchange', () => {
            if (document.pointerLockElement !== canvas && this.view.lock) this.setShiftLock(false);
        });
    },

    // Shift Lock (Ctrl): захват курсора; Esc или меню снимают.
    setShiftLock(on) {
        const canvas = /** @type {HTMLCanvasElement} */ (document.getElementById('world3d'));
        on = !!on && !this.touch && (this.mode === 'match' || this.mode === 'tutorial') && !Pause.active;
        this.view.lock = on;
        if (on) {
            try {
                const r = /** @type {any} */ (canvas.requestPointerLock());
                if (r && r.catch) r.catch(() => this.setShiftLock(false));
            } catch (e) { this.view.lock = false; }
        } else if (document.pointerLockElement) document.exitPointerLock();
        if (this.player) this.player.lockHeading = null;
        rvUI().setShiftLock?.(this.view.lock);
    },

    // Расстояние камеры -> зум движка (экранных px на мировой px в точке взгляда).
    zoomForDist(dist) {
        const cam = this.app.camera, cv = this.app.location.view.world.canvas;
        const h = (cv && cv.clientHeight) || window.innerHeight, w = (cv && cv.clientWidth) || window.innerWidth;
        const d = dist * (w < h ? 1.35 : 1);          // в портрете чуть дальше: кадр узкий
        return h / (2 * Math.tan(cam.cam.fov / 2) * Math.max(60, d));
    },

    rotateView(dx, dy) {
        const v = this.view;
        v.yaw += dx * 0.0075;
        v.pitch = Math.max(0.04, Math.min(1.3, v.pitch + dy * 0.0055));
        v.snapT = 0;
    },

    updateCamera(dt) {
        const cam = this.app.camera, g = this.geo, v = this.view, p = this.player;
        const playing = this.mode === 'match' || this.mode === 'tutorial';
        let yaw = v.yaw, pitch = v.pitch, dist = v.dist;
        if (playing) {
            if (v.snapT > 0) {
                // Разовый разворот к цели забега.
                v.snapT = Math.max(0, v.snapT - dt);
                let d = this.camAz - v.yaw;
                while (d > Math.PI) d -= Math.PI * 2;
                while (d < -Math.PI) d += Math.PI * 2;
                v.yaw += d * Math.min(1, dt * 5);
                yaw = v.yaw;
            }
        } else if (this.mode === 'wardrobe' && p) {
            // Гардероб: камера перед игроком, персонаж — в свободной от панели части экрана.
            const t = performance.now() / 1000;
            yaw = Math.PI / 2 + Math.sin(t * 0.35) * 0.22;
            const cv = this.app.location.view.world.canvas;
            const w = (cv && cv.clientWidth) || window.innerWidth, h = (cv && cv.clientHeight) || window.innerHeight;
            const r = rvUI().previewRect?.() || { x: 0, y: 0, w, h };
            const zoom = Math.max(0.15, Math.min(r.h * 0.78 / 250, r.w * 0.85 / 170, 3));
            cam.azimuth = yaw; cam.pitch = 0.1; cam.zoomTarget = cam.zoom = zoom;
            const ox = (r.x + r.w / 2 - w / 2) / zoom, oy = (r.y + r.h / 2 - h / 2) / zoom;
            this.follow.x = p.x + Math.sin(yaw) * ox;
            this.follow.y = p.y - Math.cos(yaw) * ox;
            this.camH = this.groundH + 105 + oy;
            this.camAzSmooth = yaw;
            v.yaw = yaw;
            return;
        } else {
            // Меню и итоги: медленный облёт.
            this.menuT += dt;
            yaw = this.camAz + this.menuT * 0.12;
            pitch = this.mode === 'menu' ? 0.3 : 0.26;
            dist = this.mode === 'menu' ? 980 : 520;
            v.yaw = yaw;
        }
        this.camH = this.groundH + 150;
        cam.azimuth = yaw;
        cam.pitch = pitch;
        cam.zoomTarget = cam.zoom = this.zoomForDist(dist);
        this.camAzSmooth = yaw;
        if (this.mode === 'menu') {
            this.follow.x = g.cx; this.follow.y = g.lineA + 260;
        } else if (p) {
            // Shift Lock — камера за правым плечом, персонаж смотрит по камере.
            const sh = v.lock ? 55 : 0;
            this.follow.x = p.x - Math.sin(yaw) * sh;
            this.follow.y = p.y + Math.cos(yaw) * sh;
            p.lockHeading = v.lock && playing && p.state === 'active' ? yaw : null;
        }
    },

    // Вкладка примеряемой вещи в гардеробе ('' — ничего не примеряется).
    previewTab() {
        if (this.mode !== 'wardrobe' || !this.tryId) return '';
        const it = Cosmetics.get(this.tryId);
        return it ? it.tab : '';
    },

    // Разворот камеры к цели (начало пересечения, смена роли).
    snapCamera() { if (this.view) this.view.snapT = 1.2; },

    // --- Ввод -----------------------------------------------------------------------------

    setupInput() {
        const canvas = /** @type {HTMLCanvasElement} */ (document.getElementById('world3d'));
        const playing = () => (this.mode === 'match' || this.mode === 'tutorial') && !Pause.active;
        window.addEventListener('keydown', (e) => {
            const t = /** @type {HTMLElement} */ (e.target);
            if (t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;
            if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'AltLeft', 'AltRight'].includes(e.code)) e.preventDefault();
            this.keys.add(e.code);
            this.setTouch(false);
            if (!playing() || e.repeat) return;
            const p = this.player;
            if (!p) return;
            if (e.code === 'ControlLeft' || e.code === 'ControlRight') { this.setShiftLock(!this.view.lock); return; }
            if (e.code === 'Space') p.input.dash = true;
            if (e.code === 'ShiftLeft' || e.code === 'ShiftRight' || e.code === 'AltLeft' || e.code === 'AltRight' || e.code === 'KeyC') p.input.brake = true;
            if (e.code === 'KeyQ') p.input.ability = true;
            if ((e.code === 'KeyF' || e.code === 'KeyE') && p.team === 'chaser') p.input.attack = true;
        });
        window.addEventListener('keyup', (e) => { this.keys.delete(e.code); });
        // Холст: ЛКМ — удар (одно нажатие — один удар), ПКМ или палец — поворот камеры, два пальца — приближение.
        /** @type {Map<number, {x: number, y: number}>} */
        const drags = new Map();
        let pinch = 0;
        canvas.addEventListener('pointerdown', (e) => {
            this.setTouch(e.pointerType === 'touch');
            if (e.pointerType === 'mouse' && e.button === 0) {
                if (playing() && this.player && this.player.team === 'chaser') this.player.input.attack = true;
                return;
            }
            if (e.pointerType === 'mouse' && e.button !== 2) return;
            drags.set(e.pointerId, { x: e.clientX, y: e.clientY });
            if (drags.size === 2) { const [a, b] = [...drags.values()]; pinch = Math.hypot(a.x - b.x, a.y - b.y); }
            try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* синтетическое */ }
        });
        canvas.addEventListener('pointermove', (e) => {
            if (this.view.lock && document.pointerLockElement === canvas) {
                const mx = Math.max(-80, Math.min(80, e.movementX || 0)), my = Math.max(-80, Math.min(80, e.movementY || 0));
                if (playing()) this.rotateView(mx, my);
                return;
            }
            const d = drags.get(e.pointerId);
            if (!d) return;
            const dx = e.clientX - d.x, dy = e.clientY - d.y;
            d.x = e.clientX; d.y = e.clientY;
            if (!(this.mode === 'match' || this.mode === 'tutorial')) return;
            if (drags.size >= 2) {
                const [a, b] = [...drags.values()], nd = Math.hypot(a.x - b.x, a.y - b.y);
                if (pinch > 0 && nd > 0) this.view.dist = Math.max(170, Math.min(1500, this.view.dist * pinch / nd));
                pinch = nd;
                return;
            }
            this.rotateView(dx, dy);
        });
        const up = (e) => { drags.delete(e.pointerId); if (drags.size < 2) pinch = 0; };
        canvas.addEventListener('pointerup', up);
        canvas.addEventListener('pointercancel', up);
        canvas.addEventListener('lostpointercapture', up);
        canvas.addEventListener('contextmenu', e => e.preventDefault());
        window.addEventListener('pointermove', (e) => { if (e.pointerType === 'mouse' && (Math.abs(e.movementX) + Math.abs(e.movementY)) > 2) this.setTouch(false); });
        Pause.onChange(() => { if (Pause.active && this.view.lock) this.setShiftLock(false); });
        this.setTouch(IS_MOBILE);
    },

    // Экранное управление. В Playables оно всегда на экране, и на ПК тоже: там каждое
    // действие обязано работать мышью (джойстик и кнопки GameUI принимают и мышь).
    setTouch(on) {
        on = !!on || Platform.name === 'playables';
        if (this.touch === on && this._touchSet) return;
        this._touchSet = true;
        this.touch = on;
        if (on && this.view && this.view.lock) this.setShiftLock(false);
        rvUI().setTouchMode?.(on);
    },

    releaseInput() {
        this.keys.clear();
        this.uiAction = false;
        const p = this.player;
        if (p) p.input = { mx: 0, my: 0, dash: false, brake: false, attack: false, ability: false, action: false };
    },

    // Направление движения игрока в мире из клавиш или джойстика (относительно камеры).
    readPlayerInput() {
        const p = this.player;
        if (!p) return;
        const k = this.keys;
        let ix = 0, iy = 0;
        if (k.has('KeyD') || k.has('ArrowRight')) ix += 1;
        if (k.has('KeyA') || k.has('ArrowLeft')) ix -= 1;
        if (k.has('KeyW') || k.has('ArrowUp')) iy += 1;
        if (k.has('KeyS') || k.has('ArrowDown')) iy -= 1;
        const j = rvUI().joystick;
        if (j && j.active && (Math.abs(j.x) > 0.05 || Math.abs(j.y) > 0.05)) { ix = j.x; iy = -j.y; }
        const l = Math.hypot(ix, iy);
        if (l > 1) { ix /= l; iy /= l; }
        const az = this.app.camera.azimuth;
        const fx = Math.cos(az), fy = Math.sin(az), rx = -Math.sin(az), ry = Math.cos(az);
        p.input.mx = rx * ix + fx * iy;
        p.input.my = ry * ix + fy * iy;
        p.input.action = (k.has('KeyE') && p.team === 'runner') || !!this.uiAction;
        if (p.team !== 'chaser') p.input.attack = false;
    },

    // Кнопки телефона (GameUI): рывок, действие (удар / спасти / адреналин), способность.
    onButton(name, down) {
        const p = this.player;
        if (!p || !(this.mode === 'match' || this.mode === 'tutorial')) return;
        if (name === 'dash' && down) p.input.dash = true;
        if (name === 'ability' && down) p.input.ability = true;
        if (name === 'action') {
            this.uiAction = down && p.team === 'runner';
            if (down && p.team === 'chaser') p.input.attack = true;
        }
    },

    // --- Интерфейс --------------------------------------------------------------------------

    setupUI() {
        const ui = rvUI();
        ui.init?.({
            onPlay: () => this.onPlay(),
            onHowToPlay: () => this.startTutorial(false),
            onTutorialSkip: () => this.endTutorial(true),
            onPause: (on) => this.setPaused(on),
            onQuit: () => this.quitToMenu(),
            onMute: () => { const m = Sound.toggleMuted(); rvUI().setMuted?.(m); return m; },
            onBuy: (id) => this.buy(id),
            onEquip: (id) => this.equip(id),
            getShop: () => this.shopData(),
            onResultsNext: () => this.resultsNext(),
            onHeroChoice: (yes) => { if (this.match) this.match.heroDecision(yes); if (yes) this.sfx('hero'); },
            onButton: (name, down) => this.onButton(name, down),
            getWardrobe: () => this.wardrobeData(),
            onWardrobe: (open) => this.onWardrobe(open),
            onTryOn: (id) => this.onTryOn(id),
            onCosBuy: (id) => this.onCosBuy(id),
            onCosAd: (id) => this.onCosAd(id),
            onCosEquip: (id) => this.onCosEquip(id),
            getDaily: () => this.dailyData(),
            onDailyClaim: (double) => this.onDailyClaim(double),
            getWheel: () => this.wheelData(),
            onWheelSpin: (byAd) => this.onWheelSpin(byAd),
            getLeaderboard: () => this.leaderboardData(),
            onLogin: () => this.onLogin(),
            onResultsDouble: () => this.onResultsDouble(),
            onAdRevive: () => this.onAdRevive(),
            onAdBoost: () => this.onAdBoost(),
            getSettings: () => this.getSettings(),
            onSetting: (key, value) => this.setSetting(key, value),
        });
        ui.setMuted?.(Sound.muted);
        ui.setPlatform?.(Platform.name);
    },

    profile() {
        const s = this.save;
        return { level: s.level, xp: s.xp, xpNext: this.xpNext(s.level), coins: s.coins, gems: s.gems, wins: s.wins, muted: Sound.muted };
    },

    xpNext(level) { return 100 + (level - 1) * 60; },

    setPaused(on) {
        if (!(this.mode === 'match' || this.mode === 'tutorial')) on = false;
        Pause.set('manual', on);
        rvUI().showPause?.(on);
        if (on) this.releaseInput();
    },

    persist() { Platform.save(this.save); },

    // --- Магазин ------------------------------------------------------------------------------

    shopData() {
        const s = this.save;
        const items = Object.keys(RV_ITEMS).map(id => {
            const d = RV_ITEMS[id], consumable = d.tab === 'items';
            return {
                id, tab: d.tab, nameKey: 'item_' + id, descKey: 'item_' + id + '_desc', price: d.price, currency: d.currency,
                owned: consumable ? s.items[id] > 0 : s.owned.includes(id),
                equipped: consumable ? s.eqItem === id && s.items[id] > 0 : (d.tab === 'runner' ? s.eqRunner === id : s.eqChaser === id),
                count: consumable ? s.items[id] : undefined, free: d.price === 0,
            };
        });
        return { coins: s.coins, gems: s.gems, tabs: [{ id: 'runner', titleKey: 'tabRunner' }, { id: 'chaser', titleKey: 'tabChaser' }, { id: 'items', titleKey: 'tabItems' }], items };
    },

    buy(id) {
        const d = RV_ITEMS[id], s = this.save;
        if (!d) return false;
        const wallet = d.currency === 'coins' ? 'coins' : 'gems';
        if (d.tab !== 'items' && s.owned.includes(id)) return false;
        if (s[wallet] < d.price) { this.sfx('ui_error'); return false; }
        s[wallet] -= d.price;
        if (d.tab === 'items') { s.items[id] = (s.items[id] || 0) + 1; s.eqItem = id; }
        else { s.owned.push(id); if (d.tab === 'runner') s.eqRunner = id; else s.eqChaser = id; }
        this.sfx('ui_buy');
        this.persist();
        return true;
    },

    equip(id) {
        const d = RV_ITEMS[id], s = this.save;
        if (!d) return;
        if (d.tab === 'items') { if (s.items[id] > 0) s.eqItem = s.eqItem === id ? '' : id; }
        else if (s.owned.includes(id)) { if (d.tab === 'runner') s.eqRunner = id; else s.eqChaser = id; }
        this.persist();
    },

    // --- Меню ---------------------------------------------------------------------------------

    enterMenu() {
        this.mode = 'menu';
        this.match = null;
        this.clearRoundObjects();
        Pause.set('manual', false);
        const g = this.geo;
        // Толпа у южной линии лицом к камере.
        this.actors.forEach((a, i) => {
            a.team = 'runner'; a.state = 'active';
            this.resetActor(a);
            const col = i % 6, row = Math.floor(i / 6);
            a.x = g.cx + (col - 2.5) * 150 + (row % 2) * 70 + (Math.random() - 0.5) * 40;
            a.y = g.lineA + 140 + row * 120 + (Math.random() - 0.5) * 30;
            if (i === 0) { a.x = g.cx; a.y = g.lineA + 120; }
            a.heading = Math.PI / 2;
            a.rig.setKnife(false);
            a.rig.dance = i === 0 ? (a.look.dance || 'wave') : Characters.DANCES[Math.floor(Math.random() * Characters.DANCES.length)];
        });
        this.camAz = -Math.PI / 2 - 0.5;
        this.menuT = 0;
        if (this.view && this.view.lock) this.setShiftLock(false);
        rvUI().showHUD?.(false);
        rvUI().hideResults?.();
        rvUI().tutorialHide?.();
        this.stopTrail();
        this.tryId = null;
        this.applyPlayerLook();
        rvUI().showMenu?.(this.profile());
        this.updateBadges();
        if (this.save.tutorialDone && !this._dailyOffered && Cosmetics.dailyState(this.save).canClaim) {
            this._dailyOffered = true;
            setTimeout(() => { if (this.mode === 'menu') rvUI().showDaily?.(); }, 900);
        }
        Sound.music(MUSIC.menu, { volume: 0.8 });
        Platform.gameplay(false);
    },

    onPlay() {
        if (this._busy) return;
        if (!this.save.tutorialDone) { this.startTutorial(true); return; }
        this.startMatch();
    },

    quitToMenu() {
        Pause.set('manual', false);
        rvUI().showPause?.(false);
        if (this.mode === 'tutorial') { this.endTutorial(true, true); return; }
        this.enterMenu();
    },

    // --- Матч ---------------------------------------------------------------------------------

    startMatch() {
        rvUI().hideMenu?.();
        rvUI().hideResults?.();
        rvUI().tutorialHide?.();
        this.clearRoundObjects();
        this.mode = 'match';
        this.resultsShown = false;
        this.endT = 0;
        const c = rvCfg();
        // Ловец — случайный; игрок изредка начинает ловцом (не в первом матче).
        let chaserId;
        if (this.save.matches > 0 && Math.random() < 0.22) chaserId = 0;
        else chaserId = 1 + Math.floor(Math.random() * (this.actors.length - 1));
        const emit = (type, data) => this.onEvent(type, data);
        this.match = new RVMatch(this.geo, this.actors, { emit });
        for (const a of this.actors) {
            if (a.bot) a.bot = Bots.brain(Math.random, this.botSkill());
        }
        this.match.begin([chaserId]);
        for (const a of this.actors) { this.resetActor(a); a.rig.setKnife(a.team === 'chaser'); }
        this.equipPlayer();
        this.player.level = this.save.level;
        this._boostPending = !!this.boostReady;
        this.boostReady = false;
        this._revivedByAd = false;
        this.stopTrail();
        this.updateRoleCamera();
        this.view.yaw = this.camAz; this.view.pitch = 0.32; this.view.snapT = 0;
        rvUI().showHUD?.(true);
        const p = this.player;
        if (p.team === 'chaser') rvUI().banner?.(Lang.t('bYouChaser'), { color: '#ff3b3b', sub: Lang.t('bYouChaserSub'), ms: 2200 });
        else rvUI().banner?.(Lang.t('bYouRunner'), { color: '#2f8cff', sub: Lang.t('bYouRunnerSub', { n: c.crossings }), ms: 2200 });
        Sound.music(MUSIC.round, { volume: 0.62 });
        Platform.gameplay(true);
        Platform.track('progression_started', { step_id: 'round', role: p.team, difficulty: this.difficulty() });
        this.save.matches++;
    },

    updateRoleCamera() {
        const m = this.match, p = this.player;
        if (!m || !p) return;
        // Бегун смотрит вперёд по забегу, ловец — навстречу бегунам.
        const forward = m.dir < 0 ? -Math.PI / 2 : Math.PI / 2;
        this.camAz = p.team === 'chaser' ? forward + Math.PI : forward;
        this.snapCamera();
    },

    onEvent(type, d) {
        const p = this.player, ui = rvUI(), m = this.match;
        const me = d && d.actor === p;
        const fx = this.app.fx, H = this.groundH;
        const at = (a, h) => new BABYLON.Vector3(a.x, H + (h || 0), a.y);
        const tut = this.mode === 'tutorial';
        switch (type) {
            case 'wait':
                this.updateRoleCamera();
                if (!tut) ui.banner?.(Lang.t('bCrossing', { n: d.crossing, total: d.total }), { size: 'l', ms: 1500 });
                this.pulseGoal();
                break;
            case 'count':
                ui.countdown?.(d.n);
                this.sfx('beep', { rate: d.n === 1 ? 1.25 : 1 });
                break;
            case 'go':
                if (this._boostPending && p.team === 'runner' && !tut) { this._boostPending = false; p.buffs.adrenaline = 6; ui.feed?.(Lang.t('item_adrenaline'), '#ffc83d'); }
                ui.countdown?.(0);
                ui.banner?.(Lang.t('bRun'), { color: '#ffc83d', ms: 1100, size: 'xl' });
                this.sfx('whistle'); this.sfx('go', { volume: 0.8 });
                this.app.camera.shake(220, 0.01);
                break;
            case 'heroOffer':
                ui.heroChoice?.(5, m ? m.c.heroGems : 25);
                break;
            case 'hero':
                ui.banner?.(Lang.t('bHero', { name: d.actor.name }), { color: '#ffc83d', ms: 1800 });
                this.sfx('hero');
                break;
            case 'heroGo':
                ui.countdown?.(0);
                ui.banner?.(Lang.t('bRun'), { color: '#ffc83d', ms: 1000, size: 'xl' });
                this.sfx('whistle');
                break;
            case 'heroWin':
                if (d.actor === p) { const cv = this.app.location.view.world.canvas; ui.floatText?.((cv ? cv.clientWidth : window.innerWidth) / 2, (cv ? cv.clientHeight : window.innerHeight) * 0.45, '+' + d.gems, '#34e27a'); this.sfx('coin_reward'); }
                break;
            case 'tick':
                this.sfx('time_tick', { volume: 0.7 });
                break;
            case 'swing':
                if (me) this.auraBurst(0.6);
                this.sfx('knife_swing', { volume: me ? 0.9 : 0.45, detune: 0.08 });
                this.slash(d.actor);
                break;
            case 'miss':
                break;
            case 'downed': {
                RVWater.onActor(d.actor, 1);
                const t = d.actor, by = d.by;
                t.rig.flash('#ffffff', 0.3);
                t.rig.squash = 1;
                if (fx) fx.play('hit', at(t, 110));
                this.sfx('knife_hit', { volume: me || (by && by.isPlayer) ? 1 : 0.5, detune: 0.06 });
                this.sfx('downed', { volume: me ? 0.9 : 0.4, detune: 0.1 });
                this.startDizzy(t);
                if (by) ui.feed?.(Lang.t('feedCaught', { a: by.name, b: t.name }), '#ff3b3b');
                if (me) {
                    if (this.mode === 'match' && !this._revivedByAd && this.adsReady() && t.team === 'runner') setTimeout(() => { if (p.state === 'downed') ui.offerRevive?.(true); }, 700);
                    ui.banner?.(Lang.t('bCaught'), { color: '#ff3b3b', ms: 1500 });
                    ui.flash?.('#ff3b3b', 500);
                    this.app.camera.shake(320, 0.03);
                } else if (by && by.isPlayer) {
                    this.app.camera.shake(160, 0.015);
                    ui.flash?.('#ffc83d', 250);
                }
                break;
            }
            case 'revived':
                this.stopDizzy(d.actor);
                if (me) ui.offerRevive?.(false);
                d.actor.rig.flash('#7dffb0', 0.35);
                if (fx) fx.play('revive', at(d.actor, 0));
                this.sfx('revive', { volume: me || (d.by && d.by.isPlayer) ? 1 : 0.5 });
                if (d.by && d.by !== d.actor) ui.feed?.(Lang.t('feedRevived', { a: d.by.name, b: d.actor.name }), '#34e27a');
                if (me) ui.banner?.(Lang.t('bRevived'), { color: '#34e27a', ms: 1200 });
                break;
            case 'converted':
                this.stopDizzy(d.actor);
                if (me) ui.offerRevive?.(false);
                d.actor.rig.setKnife(true);
                d.actor.rig.flash('#ff3b3b', 0.45);
                if (fx) fx.play('convert', at(d.actor, 40));
                this.sfx('convert', { volume: me ? 1 : 0.35 });
                ui.feed?.(Lang.t('feedConverted', { a: d.actor.name }), '#ff6b3b');
                if (d.actor.bot) d.actor.ability.id = 'lunge';
                if (me) {
                    this.equipPlayer();
                    this.updateRoleCamera();
                    ui.banner?.(Lang.t('bNowChaser'), { color: '#ff3b3b', sub: Lang.t('bYouChaserSub'), ms: 2000 });
                }
                break;
            case 'crossed':
                if (me) this.auraBurst(1.6);
                if (fx && (me || Math.random() < 0.4)) fx.play('puff', at(d.actor, 0));
                ui.feed?.(Lang.t('feedCrossed', { a: d.actor.name }), '#2f8cff');
                if (me) {
                    ui.banner?.(Lang.t('bSafe'), { color: '#34e27a', ms: 1300 });
                    this.sfx('crossed');
                    if (fx) fx.play('revive', at(p, 0));
                    if (this.tut) this.tutEvent('crossed');
                }
                break;
            case 'gemSpawn':
                this.spawnGem(d.gem);
                break;
            case 'gem': {
                this.removeGem(d.gem, true);
                if (me) {
                    const s = this.app.location.view.projectToScreen(d.gem.x, d.gem.y, H + 80);
                    ui.floatText?.(s.x, s.y, '+' + d.value, '#34e27a');
                    ui.flash?.('#34e27a', 200);
                    this.sfx('gem_pickup');
                    if (this.tut) this.tutEvent('gem');
                } else this.sfx('gem_pickup', { volume: 0.25 });
                break;
            }
            case 'gemGone':
                this.removeGem(d.gem, false);
                break;
            case 'dash':
                RVWater.onActor(d.actor, 0.6);
                d.actor.rig.squash = 0.8;
                if (fx && (me || Math.random() < 0.5)) { fx.play('puff', at(d.actor, 4)); if (me) fx.play('streak', at(d.actor, 0)); }
                this.sfx('dash', { volume: me ? 0.8 : 0.25, detune: 0.1 });
                if (me && this.tut) this.tutEvent('dash');
                break;
            case 'brake':
                RVWater.onActor(d.actor, 0.45);
                if (fx) fx.play('puff', at(d.actor, 2));
                this.sfx('brake', { volume: me ? 0.8 : 0.25, detune: 0.1 });
                if (me && this.tut) this.tutEvent('brake');
                break;
            case 'ability':
                this.onAbility(d.actor, d.id, me);
                break;
            case 'abilityFail':
                if (me) this.sfx('ui_error', { volume: 0.5 });
                break;
            case 'consumable':
                if (me) {
                    this.save.items[d.id] = Math.max(0, (this.save.items[d.id] || 0) - 1);
                    this.persist();
                    this.sfx(d.id === 'medkit' ? 'revive' : 'ability_sprint');
                }
                break;
            case 'door':
                this.spawnDoor(d.door);
                break;
            case 'doorGone':
                this.removeDoor(d.door);
                break;
            case 'leash':
                this.rope(d.actor, d.target);
                break;
            case 'timeUp':
                ui.banner?.(Lang.t('bTimeUp'), { color: '#ff9a1f', ms: 1400 });
                this.sfx('whistle');
                break;
            case 'roundOver':
                if (m && !tut) {
                    const pl = this.player;
                    if (pl.team === 'runner' && pl.state === 'safe') this.sfx('round_win', { volume: 0.7 });
                }
                break;
            case 'end': {
                const won = m && m.playerWon();
                ui.banner?.(Lang.t(d.winner === 'runners' ? 'bRunnersWin' : 'bChasersWin'), { color: d.winner === 'runners' ? '#2f8cff' : '#ff3b3b', ms: 2400, size: 'xl' });
                this.sfx(won ? 'match_win' : 'match_lose');
                if (won && fx) fx.play('confetti', at(p, 260));
                Sound.music(MUSIC.lobby, { volume: 0.55 });
                break;
            }
        }
    },

    onAbility(a, id, me) {
        const fx = this.app.fx, at = new BABYLON.Vector3(a.x, this.groundH + 60, a.y);
        this.sfx('ability_' + id, { volume: me ? 0.9 : 0.35 });
        if (id === 'airhorn') {
            if (fx) fx.play('shock', at);
            this.shockwave(a);
            if (me) this.app.camera.shake(260, 0.02);
        } else if (id === 'lunge' || id === 'rocket' || id === 'sprint') {
            if (fx) { fx.play('puff', at); fx.play('streak', at); }
        } else if (id === 'cloak') {
            if (fx) fx.play('convert', at);
        } else if (id === 'dagger') {
            a.rig.flash('#8fd0ff', 0.3);
        }
    },

    // --- Кристаллы, двери, взмах, верёвка, ударная волна ---------------------------------

    spawnGem(gem) {
        const scene = this.app.location.view.scene;
        let mesh;
        if (this.gemModel) mesh = Model3D.build(this.gemModel, scene, { name: 'gem-' + gem.id });
        else {
            mesh = BABYLON.MeshBuilder.CreatePolyhedron('gem-' + gem.id, { type: 1, size: 16 }, scene);
            const mat = new BABYLON.StandardMaterial('gem-mat-' + gem.id, scene);
            mat.diffuseColor = BABYLON.Color3.FromHexString('#38f27a');
            mesh.material = mat;
            mesh.scaling.y = 1.6;
        }
        for (const m of [mesh].concat(mesh.getChildMeshes(false))) {
            const mat = /** @type {any} */ (m.material);
            if (mat && mat.emissiveColor) mat.emissiveColor = new BABYLON.Color3(0.08, 0.35, 0.16);
        }
        World3D.addObject(this.app.location.view, mesh, 'actor', { ink: false });
        mesh.position.set(gem.x, this.groundH + 55, gem.y);
        mesh.scaling.scaleInPlace(0.01);
        this.gemMeshes.set(gem.id, { mesh, born: 0, phase: Math.random() * 6, gem });
    },

    removeGem(gem, taken) {
        const rec = this.gemMeshes.get(gem.id);
        if (!rec) return;
        this.gemMeshes.delete(gem.id);
        if (taken && this.app.fx) this.app.fx.play('gem', rec.mesh.position.clone());
        Model3D.dispose(this.app.location.view, rec.mesh);
    },

    spawnDoor(door) {
        const scene = this.app.location.view.scene;
        const root = new BABYLON.Mesh('door-' + door.id, scene);
        const wood = new BABYLON.StandardMaterial('door-wood', scene);
        wood.diffuseColor = BABYLON.Color3.FromHexString('#a0612e');
        const dark = new BABYLON.StandardMaterial('door-frame', scene);
        dark.diffuseColor = BABYLON.Color3.FromHexString('#5b3418');
        const gold = new BABYLON.StandardMaterial('door-knob', scene);
        gold.diffuseColor = BABYLON.Color3.FromHexString('#ffc83d');
        const w = door.half * 2;
        const panel = BABYLON.MeshBuilder.CreateBox('door-panel', { width: 26, height: 210, depth: w - 40 }, scene);
        panel.position.y = 105; panel.material = wood; panel.parent = root;
        for (const z of [-(w / 2 - 10), w / 2 - 10]) {
            const post = BABYLON.MeshBuilder.CreateBox('door-post', { width: 34, height: 236, depth: 22 }, scene);
            post.position.set(0, 118, z); post.material = dark; post.parent = root;
        }
        const top = BABYLON.MeshBuilder.CreateBox('door-top', { width: 34, height: 24, depth: w }, scene);
        top.position.y = 236; top.material = dark; top.parent = root;
        const knob = BABYLON.MeshBuilder.CreateSphere('door-knob', { diameter: 16 }, scene);
        knob.position.set(16, 104, w / 2 - 50); knob.material = gold; knob.parent = root;
        root.position.set(door.x, this.groundH, door.y);
        root.rotation.y = -Math.atan2(door.ny, door.nx);
        World3D.addObject(this.app.location.view, root, 'actor');
        root.scaling.set(1, 0.01, 1);
        this.doorMeshes.set(door.id, { mesh: root, t: 0, mats: [wood, dark, gold] });
        if (this.app.fx) this.app.fx.play('puff', new BABYLON.Vector3(door.x, this.groundH, door.y));
    },

    removeDoor(door) {
        const rec = this.doorMeshes.get(door.id);
        if (!rec) return;
        this.doorMeshes.delete(door.id);
        if (this.app.fx) this.app.fx.play('puff', rec.mesh.position.clone());
        World3D.removeObject(this.app.location.view, rec.mesh);
        for (const m of rec.mats) m.dispose();
    },

    // Полумесяц взмаха ножа перед ловцом.
    slash(a) {
        const scene = this.app.location.view.scene;
        let rec = this.slashes.get(a.id);
        if (!rec) {
            const r0 = 40, r1 = 160, n = 18, arc = Math.PI * 0.85;
            const pos = [], col = [], idx = [];
            for (let i = 0; i <= n; i++) {
                const t = i / n, ang = -arc / 2 + arc * t;
                const fade = Math.sin(t * Math.PI);
                for (const r of [r0, r1]) {
                    pos.push(Math.cos(ang) * r, 0, Math.sin(ang) * r);
                    col.push(1, 1, 1, r === r1 ? 0.95 * fade : 0);
                }
                if (i < n) { const b = i * 2; idx.push(b, b + 1, b + 2, b + 1, b + 3, b + 2); }
            }
            const mesh = new BABYLON.Mesh('slash-' + a.id, scene);
            const vd = new BABYLON.VertexData();
            vd.positions = pos; vd.indices = idx; vd.colors = col;
            vd.applyToMesh(mesh);
            mesh.hasVertexAlpha = true;
            const mat = new BABYLON.StandardMaterial('slash-mat', scene);
            mat.disableLighting = true; mat.emissiveColor = new BABYLON.Color3(0.75, 0.92, 1);
            mat.backFaceCulling = false; mat.alpha = 0.999; mat.metadata = { toon: false };
            mesh.material = mat; mesh.isPickable = false;
            mesh.setEnabled(false);
            rec = { mesh, t: 1, actor: a };
            this.slashes.set(a.id, rec);
        }
        rec.t = 0;
        rec.mesh.setEnabled(false);
    },

    rope(a, t) {
        const scene = this.app.location.view.scene;
        const line = BABYLON.MeshBuilder.CreateTube('rope', { path: [new BABYLON.Vector3(a.x, this.groundH + 90, a.y), new BABYLON.Vector3(t.x, this.groundH + 90, t.y)], radius: 4, updatable: true }, scene);
        const mat = new BABYLON.StandardMaterial('rope-mat', scene);
        mat.diffuseColor = BABYLON.Color3.FromHexString('#c8823a');
        line.material = mat;
        this.ropes.push({ mesh: line, mat, t: 0.35, a, b: t });
    },

    shockwave(a) {
        const scene = this.app.location.view.scene;
        const ring = BABYLON.MeshBuilder.CreateTorus('shock', { diameter: 2, thickness: 0.06, tessellation: 48 }, scene);
        const mat = new BABYLON.StandardMaterial('shock-mat', scene);
        mat.disableLighting = true; mat.emissiveColor = new BABYLON.Color3(1, 0.95, 0.6); mat.alpha = 0.9; mat.metadata = { toon: false };
        ring.material = mat;
        ring.position.set(a.x, this.groundH + 40, a.y);
        this.shocks.push({ mesh: ring, mat, t: 0 });
    },

    startDizzy(a) {
        if (a._dizzy || !this.app.fx) return;
        a._dizzy = this.app.fx.play('dizzy', a.rig.root.position, { follow: () => new BABYLON.Vector3(a.x - 120 * Math.cos(a.heading), this.groundH + 50, a.y - 120 * Math.sin(a.heading)) });
    },

    stopDizzy(a) {
        if (a._dizzy) { a._dizzy.stop(); a._dizzy = null; }
    },

    pulseGoal() { this._goalPulse = 0; },

    clearRoundObjects() {
        for (const rec of this.gemMeshes.values()) Model3D.dispose(this.app.location.view, rec.mesh);
        this.gemMeshes.clear();
        for (const [id, rec] of this.doorMeshes) { World3D.removeObject(this.app.location.view, rec.mesh); for (const m of rec.mats) m.dispose(); }
        this.doorMeshes.clear();
        for (const r of this.ropes) { r.mesh.dispose(); r.mat.dispose(); }
        this.ropes = [];
        for (const s of this.shocks) { s.mesh.dispose(); s.mat.dispose(); }
        this.shocks = [];
        for (const a of this.actors) this.stopDizzy(a);
    },

    // --- Туториал ------------------------------------------------------------------------------

    // auto — первый запуск по «Играть»: после обучения сразу матч.
    startTutorial(auto) {
        Pause.set('manual', false);
        rvUI().showPause?.(false);
        rvUI().hideMenu?.();
        rvUI().hideResults?.();
        this.clearRoundObjects();
        this.mode = 'tutorial';
        const g = this.geo;
        const p = this.player, dummy = this.actors[1];
        const emit = (type, data) => this.onEvent(type, data);
        this.match = new RVMatch(g, [p, dummy], { emit, tutorial: true });
        this.match.begin([dummy.id]);
        this.resetActor(p); this.resetActor(dummy);
        dummy.bot = null;
        dummy.input = { mx: 0, my: 0, dash: false, brake: false, attack: false, ability: false, action: false };
        p.x = g.cx; p.y = g.lineA + 200;
        dummy.x = g.cx + 500; dummy.y = (g.lineA + g.lineB) / 2;
        for (const a of this.actors) if (a !== p && a !== dummy) { a.x = -99999; a.y = -99999; a.rig.root.setEnabled(false); rvUI().platePos?.(a.id, 0, 0, false); }
        p.rig.setKnife(false); dummy.rig.setKnife(true);
        this.match.phase = 'run';
        this.match.timer = 9999;
        this.match.phaseT = 0;
        this.camAz = -Math.PI / 2;
        this.view.yaw = this.camAz; this.view.pitch = 0.32; this.view.snapT = 0;
        const steps = ['move', 'dash'];
        if (!this.touch) steps.push('stop');
        steps.push('gems', 'cross', 'knife');
        this.tut = { auto, steps, i: -1, dist: 0, lastX: p.x, lastY: p.y, dummy, doneT: 0, target: null };
        rvUI().showHUD?.(true);
        Sound.music(MUSIC.lobby, { volume: 0.55 });
        Platform.gameplay(true);
        this.tutNext();
    },

    tutStepView() {
        const t = this.tut, s = t.steps[t.i], touch = this.touch;
        const keys = { move: touch ? 'tut1Touch' : 'tut1', dash: touch ? 'tut2Touch' : 'tut2', stop: 'tut3', gems: 'tut4', cross: 'tut5', knife: touch ? 'tut6Touch' : 'tut6' };
        const targets = { move: 'joystick', dash: 'dash', stop: null, gems: 'gems', cross: null, knife: 'action' };
        rvUI().tutorialStep?.({ text: Lang.t(keys[s]), target: targets[s], progress: (t.i + 1) + '/' + t.steps.length });
        t.view = s + (touch ? 't' : 'k');
    },

    tutNext() {
        const t = this.tut, m = this.match, g = this.geo, p = this.player;
        if (!t || !m) return;
        t.i++;
        if (t.i > 0) this.sfx('crossed', { volume: 0.6 });
        if (t.i >= t.steps.length) {
            rvUI().tutorialHide?.();
            rvUI().banner?.(Lang.t('tutDone'), { color: '#34e27a', ms: 1600 });
            t.doneT = 1.8;
            return;
        }
        const s = t.steps[t.i];
        if (s === 'gems') {
            // Кристалл — впереди игрока по взгляду камеры, но до линии финиша.
            const az = this.app.camera.azimuth;
            const gx = Math.max(g.minX + 200, Math.min(g.maxX - 200, p.x + Math.cos(az) * 380 + (p.x < g.cx ? 160 : -160)));
            const gs = Math.max(-200, Math.min(m.dist - 300, m.progress(p.y + Math.sin(az) * 380)));
            m.addGem(gx, m.yAt(gs));
        }
        if (s === 'cross') {
            // Ловец-манекен медленно идёт навстречу; удар не валит, а лишь отбрасывает.
            t.dummy.x = g.cx; t.dummy.y = m.yAt(m.dist * 0.5);
        }
        if (s === 'knife') {
            // Игрок становится ловцом, перед ним — неподвижный бегун-манекен.
            const d = t.dummy;
            p.team = 'chaser'; p.state = 'active'; p.rig.setKnife(true); p.attackCd = 0.3;
            d.team = 'runner'; d.state = 'active'; d.rig.setKnife(false); d.invulnT = 0;
            d.x = p.x; d.y = m.yAt(m.dist - 380);
            d.vx = d.vy = 0;
            this.camAz = m.dir < 0 ? Math.PI / 2 : -Math.PI / 2;
            this.snapCamera();
        }
        this.tutStepView();
    },

    tutEvent(name) {
        const t = this.tut;
        if (!t || t.i < 0 || t.i >= t.steps.length) return;
        const s = t.steps[t.i];
        if ((s === 'dash' && name === 'dash') || (s === 'stop' && name === 'brake') || (s === 'gems' && name === 'gem') || (s === 'cross' && name === 'crossed') || (s === 'knife' && name === 'hit')) this.tutNext();
    },

    updateTutorial(dt) {
        const t = this.tut, m = this.match, p = this.player;
        if (!t || !m) return;
        if (t.view && t.view !== (t.steps[t.i] || '') + (this.touch ? 't' : 'k') && t.i < t.steps.length) this.tutStepView();
        const s = t.steps[t.i];
        if (s === 'move') {
            t.dist += Math.hypot(p.x - t.lastX, p.y - t.lastY);
            if (t.dist > 450) this.tutNext();
        }
        t.lastX = p.x; t.lastY = p.y;
        const d = t.dummy;
        d.input.mx = 0; d.input.my = 0; d.input.attack = false;
        if (s === 'cross' && d.team === 'chaser') {
            // Манекен-ловец лениво преследует, но бьёт мимо.
            const dx = p.x - d.x, dy = p.y - d.y, dl = Math.hypot(dx, dy) || 1;
            if (dl > 140) { d.input.mx = dx / dl * 0.42; d.input.my = dy / dl * 0.42; }
            else if (d.attackCd <= 0) d.input.attack = true;
        }
        if (p.state === 'downed' && p.downT > 1.1) { m._revive(p, p); }
        if (s === 'knife' && d.state === 'downed') this.tutEvent('hit');
        if (t.doneT > 0) {
            t.doneT -= dt;
            if (t.doneT <= 0) this.endTutorial(false);
        }
    },

    // skipped — «Пропустить»; toMenu — выход в меню из паузы.
    endTutorial(skipped, toMenu) {
        const t = this.tut;
        if (!t) return;
        this.tut = null;
        if (!this.save.tutorialDone) Platform.track('tutorial_completed', { skipped: !!skipped });
        this.save.tutorialDone = true;
        this.persist();
        rvUI().tutorialHide?.();
        for (const a of this.actors) { a.rig.root.setEnabled(true); this.resetActor(a); a.team = 'runner'; a.state = 'active'; }
        const c = rvCfg();
        for (const a of this.actors) if (!a.isPlayer) a.bot = Bots.brain(Math.random, this.botSkill());
        this.match = null;
        this.releaseInput();
        if (t.auto && !toMenu) this.startMatch();
        else this.enterMenu();
    },

    // --- Настройки: обводка выключена по умолчанию, игрок включает её сам ----------------------

    // Константы движка в игре неизменяемы (const), поэтому включённая обводка подменяет
    // уровни контура и обводки в World3D.cfg() и переприменяется к живой сцене.
    installRenderOverrides() {
        const W = /** @type {any} */ (World3D);
        if (!W._rvBaseCfg) {
            W._rvBaseCfg = W.cfg;
            W.cfg = function () {
                const c = W._rvBaseCfg.apply(W, arguments);
                if (Game.save && Game.save.settings && Game.save.settings.outline) { c.ink = Math.max(c.ink, 2); c.outline = Math.max(c.outline, 1); }
                return c;
            };
        }
        if (this.save.settings.outline) World3D.applyRenderConstants(this.app.location.view);
    },

    getSettings() { return { outline: !!this.save.settings.outline, water: !!this.save.settings.water, muted: Sound.muted, difficulty: this.difficulty() }; },

    difficulty() {
        const d = this.save && this.save.settings && this.save.settings.difficulty;
        return d === 'easy' || d === 'hard' ? d : 'normal';
    },

    // Мастерство ботов по сложности: лёгкие медленнее и хуже уворачиваются/целятся, сложные — наоборот.
    botSkill() {
        const base = rvCfg().botSkill, k = { easy: 0.45, normal: 1, hard: 1.5 }[this.difficulty()];
        return Math.max(0.1, Math.min(1, base * k));
    },

    // Множитель монет и опыта за матч: сложная — больше.
    rewardMult() { return { easy: 0.8, normal: 1, hard: 1.5 }[this.difficulty()]; },

    setSetting(key, value) {
        if (key === 'outline') {
            this.save.settings.outline = !!value;
            World3D.applyRenderConstants(this.app.location.view);
            this.persist();
        } else if (key === 'water') {
            // Экспериментальная физика воды: живая поверхность, рябь, плавающие предметы.
            this.save.settings.water = !!value;
            RVWater.setEnabled(this, !!value);
            this.persist();
        } else if (key === 'difficulty') {
            this.save.settings.difficulty = value === 'easy' || value === 'hard' ? value : 'normal';
            this.persist();
        } else if (key === 'muted') {
            Sound.setMuted(!!value);
            rvUI().setMuted?.(Sound.muted);
        }
        return this.getSettings();
    },

    // --- Реклама за награду ---------------------------------------------------------------------

    // Есть ли сейчас rewarded: Яндекс, Playables с API рекламы или локальная заглушка ?mockads.
    adsReady() {
        if (Platform.name === 'yandex') return true;
        if (Platform.name === 'playables') return typeof ytgame !== 'undefined' && !!(ytgame.ads && ytgame.ads.requestRewardedAd);
        if (Platform.name === 'playgama') return !!(Platform.sdk && Platform.sdk.advertisement && Platform.sdk.advertisement.isRewardedSupported);
        return /[?&#]mockads\b/.test(location.search + location.hash);
    },

    // Просмотр за награду со стабильным id; true — только по подтверждению SDK. Защита от двойного нажатия.
    async watchAd(id) {
        if (this._adBusy || !this.adsReady()) return false;
        this._adBusy = true;
        try { return await Platform.rewarded(id); } catch (e) { return false; } finally { this._adBusy = false; }
    },

    // --- Гардероб ---------------------------------------------------------------------------------

    wardrobeData() {
        const s = this.save, c = Cosmetics.ensure(s);
        return {
            coins: s.coins, gems: s.gems, adsReady: this.adsReady(),
            tabs: COSMETIC_TABS.map(id => ({ id, titleKey: 'tab' + id[0].toUpperCase() + id.slice(1) })),
            items: COSMETIC_TABS.flatMap(tab => Cosmetics.list(tab)).map(it => ({
                id: it.id, tab: it.tab, nameKey: 'cos_' + it.id, rarity: it.rarity, currency: it.currency,
                price: it.price, adsNeed: it.ads, adsDone: Math.min(it.ads, c.ads[it.id] || 0),
                owned: c.owned.includes(it.id), equipped: c.eq[it.tab] === it.id, data: it.data,
            })),
        };
    },

    // Открыть/закрыть гардероб: камера перед игроком, примерка на живом персонаже.
    onWardrobe(open) {
        if (open) {
            if (this.mode !== 'menu') return;
            this.mode = 'wardrobe';
            const g = this.geo, p = this.player;
            p.x = g.cx; p.y = g.lineA + 40; p.heading = -Math.PI / 2;
            this.tryId = null;
        } else if (this.mode === 'wardrobe') {
            this.onTryOn(null);
            this.mode = 'menu';
            this.placeMenuPlayer();
            this.updateBadges();
        }
    },

    placeMenuPlayer() {
        const g = this.geo, p = this.player;
        if (p) { p.x = g.cx; p.y = g.lineA + 120; }
    },

    onTryOn(id) {
        const it = id ? Cosmetics.get(id) : null;
        this.tryId = it ? it.id : null;
        this.applyPlayerLook();
    },

    // Внешность игрока из надетого (+ примерка): персонаж пересобирается на месте.
    applyPlayerLook() {
        const p = this.player;
        if (!p) return;
        const look = Cosmetics.look(this.save, this.tryId);
        const key = JSON.stringify(look);
        if (p._lookKey === key) return;
        p._lookKey = key;
        p.look = look;
        const knife = p.rig ? p.rig.knife && p.rig.knife.isEnabled() : false;
        if (p.rig) p.rig.dispose();
        p.rig = new CharacterRig(this.app.location.view, look, p.id);
        p.rig.dance = look.dance;
        p.rig.setKnife(knife || this.previewTab() === 'knife');
        this.stopTrail();
        this.stopAura();
        if (look.fx && this.mode === 'wardrobe') setTimeout(() => this.auraBurst(1.4), 60);
    },

    onCosBuy(id) {
        const it = Cosmetics.get(id), s = this.save;
        if (!it || it.currency !== 'coins' || Cosmetics.owned(s, id)) return false;
        if (s.coins < it.price) { this.sfx('ui_error'); return false; }
        s.coins -= it.price;
        Cosmetics.grant(s, id);
        Cosmetics.equip(s, id);
        this.sfx('ui_buy');
        this.persist();
        this.tryId = null;
        this.applyPlayerLook();
        return true;
    },

    async onCosAd(id) {
        const it = Cosmetics.get(id), s = this.save;
        if (!it || it.currency !== 'ads' || Cosmetics.owned(s, id)) return false;
        const ok = await this.watchAd('shop-unlock');
        if (!ok) return false;
        const c = Cosmetics.ensure(s);
        c.ads[id] = Math.min(it.ads, (c.ads[id] || 0) + 1);
        if (c.ads[id] >= it.ads) {
            Cosmetics.grant(s, id);
            Cosmetics.equip(s, id);
            this.sfx('level_up');
            this.tryId = null;
            this.applyPlayerLook();
        }
        this.persist();
        return true;
    },

    onCosEquip(id) {
        if (!Cosmetics.equip(this.save, id)) return;
        this.persist();
        this.tryId = null;
        this.applyPlayerLook();
    },

    // --- Ежедневный подарок и колесо ------------------------------------------------------------------

    dailyData() { return Object.assign(Cosmetics.dailyState(this.save), { adsReady: this.adsReady() }); },

    async onDailyClaim(double) {
        if (this._dailyBusy) return null;
        this._dailyBusy = true;
        try {
            const st = Cosmetics.dailyState(this.save);
            if (!st.canClaim) return null;
            if (double) {
                if (st.day === 6) return null;
                const ok = await this.watchAd('daily-x2');
                if (!ok) return null;
            }
            const got = Cosmetics.claimDaily(this.save, double);
            if (got) { this.sfx(got.itemId ? 'level_up' : 'coin_reward'); this.persist(); this.applyPlayerLook(); }
            this.updateBadges();
            return got;
        } finally { this._dailyBusy = false; }
    },

    wheelData() { return Object.assign(Cosmetics.wheelState(this.save), { adsReady: this.adsReady() }); },

    async onWheelSpin(byAd) {
        if (this._wheelBusy) return null;
        this._wheelBusy = true;
        try {
            const st = Cosmetics.wheelState(this.save);
            if (byAd ? st.adSpinsLeft <= 0 : !st.freeAvailable) return null;
            if (byAd && !(await this.watchAd('wheel-spin'))) return null;
            const res = Cosmetics.spinWheel(this.save, byAd);
            if (res) this.persist();      // приз начислен до анимации — сворачивание вкладки его не отнимет
            this.updateBadges();
            return res;
        } finally { this._wheelBusy = false; }
    },

    // --- Рекорды --------------------------------------------------------------------------------------

    async leaderboardData() {
        if (Platform.name !== 'yandex') return null;
        const now = Date.now();
        // Лимит Яндекса — 20 запросов за 5 минут: таблица кэшируется на 30 секунд.
        if (this._lbCache && now - this._lbCache.t < 30000) return this._lbCache.data;
        const entries = await Platform.leaderboard();
        const data = { entries: entries || [], authorized: Platform.authorized() };
        this._lbCache = { t: now, data };
        return data;
    },

    async onLogin() {
        const ok = await Platform.login();
        this._lbCache = null;
        return ok;
    },

    // Очки матча в рекорды — после каждого матча, без отсечения локальным рекордом.
    matchScore(p, won) {
        const st = p.stats;
        return st.crossings * 100 + st.catches * 60 + st.revives * 40 + st.gems * 5 + (won ? 200 : 0);
    },

    // --- Предложения за рекламу в игре ---------------------------------------------------------------

    async onResultsDouble() {
        const r = this._lastReward;
        if (!r || r.doubled) return false;
        rvUI().setResultsDouble?.('busy');
        const ok = await this.watchAd('results-x2');
        if (!ok) { rvUI().setResultsDouble?.('available'); return false; }
        r.doubled = true;
        this.save.coins += r.coins;
        this.save.gems += r.gems;
        this.persist();
        this.sfx('coin_reward');
        rvUI().setResultsDouble?.('done', { coins: r.coins * 2, gems: r.gems * 2, xp: r.xp });
        return true;
    },

    async onAdRevive() {
        const m = this.match, p = this.player;
        if (!m || this.mode !== 'match' || p.state !== 'downed' || this._revivedByAd) return false;
        rvUI().offerRevive?.(false);
        const ok = await this.watchAd('revive');
        if (!ok || p.state !== 'downed' || p.team !== 'runner') return false;
        this._revivedByAd = true;
        m._revive(p, p);
        return true;
    },

    async onAdBoost() {
        if (this.boostReady) return true;
        const ok = await this.watchAd('boost-start');
        if (!ok) return false;
        this.boostReady = true;
        this.updateBadges();
        this.sfx('ability_sprint');
        return true;
    },

    updateBadges() {
        const s = this.save;
        if (!s) return;
        const d = Cosmetics.dailyState(s), w = Cosmetics.wheelState(s);
        rvUI().setMenuBadges?.({ daily: d.canClaim, wheel: w.freeAvailable, leaderboard: Platform.name === 'yandex', boostReady: !!this.boostReady });
    },

    // --- Мифическая аура (только внешний вид) ---------------------------------------------------------
    // Скин с fx: облако частиц вокруг персонажа, светящееся кольцо и пятно под ногами,
    // всплески на финише, при ударе и при примерке. Видно в меню, гардеробе, матче и итогах.

    startAura() {
        const p = this.player, fx = this.app.fx, a = p && p.look && p.look.fx;
        if (!a || this.aura || !p.rig) return;
        const scene = this.app.location.view.scene, H = this.groundH;
        const h = fx ? fx.create({
            rate: (a.rate || 14) * 1.5, capacity: 100, life: [0.8, 1.6], size: [22, 38], speed: [15, 45], color: '#ffffff',
            box: [[-58, 20, -58], [58, 175, 58]], direction: [[-0.35, 1, -0.35], [0.35, 1, 0.35]], gravity: [0, 28, 0],
            spin: [-1.5, 1.5], blend: 'standard', sizeGradient: [[0, 0.3], [0.3, 1], [1, 0.2]],
            follow: () => new BABYLON.Vector3(p.x, H, p.y),
        }) : null;
        if (h) h.system.particleTexture = Characters.spriteTexture(scene, a.tex, a.c1, a.c2);
        const col = BABYLON.Color3.FromHexString(a.ring || a.c1);
        const ring = BABYLON.MeshBuilder.CreateTorus('aura-ring', { diameter: 2, thickness: 0.07, tessellation: 48 }, scene);
        const rm = new BABYLON.StandardMaterial('aura-ring-mat', scene);
        rm.disableLighting = true; rm.emissiveColor = col; rm.alpha = 0.85; rm.metadata = { toon: false };
        ring.material = rm; ring.isPickable = false;
        const glowTex = new BABYLON.DynamicTexture('aura-glow-tex', { width: 128, height: 128 }, scene, false);
        const g = /** @type {CanvasRenderingContext2D} */ (/** @type {any} */ (glowTex.getContext()));
        const gr = g.createRadialGradient(64, 64, 4, 64, 64, 64);
        gr.addColorStop(0, 'rgba(255,255,255,.9)'); gr.addColorStop(0.55, 'rgba(255,255,255,.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
        g.clearRect(0, 0, 128, 128); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); glowTex.update(false); glowTex.hasAlpha = true;
        const disc = BABYLON.MeshBuilder.CreateGround('aura-glow', { width: 1, height: 1 }, scene);
        const dm = new BABYLON.StandardMaterial('aura-glow-mat', scene);
        dm.disableLighting = true; dm.emissiveColor = col; dm.opacityTexture = glowTex; dm.alpha = 0.7; dm.metadata = { toon: false };
        disc.material = dm; disc.isPickable = false;
        this.aura = { h, ring, rm, disc, dm, glowTex, fx: a };
    },

    stopAura() {
        const a = this.aura;
        if (!a) return;
        this.aura = null;
        if (a.h) a.h.dispose();
        a.ring.dispose(); a.rm.dispose(); a.disc.dispose(); a.dm.dispose(); a.glowTex.dispose();
    },

    updateAura() {
        const p = this.player;
        const want = p && p.look && p.look.fx && p.rig && p.rig.root.isEnabled() && p.buffs.cloak <= 0 && p.state !== 'downed' && this.mode !== 'boot';
        if (!want) { this.stopAura(); return; }
        if (!this.aura) this.startAura();
        const a = this.aura;
        if (!a) return;
        const t = performance.now() / 1000, H = this.groundH;
        const r = 62 + Math.sin(t * 3) * 6;
        a.ring.position.set(p.x, H + 3, p.y);
        a.ring.scaling.set(r, 40, r);
        a.ring.rotation.y = t * 1.6;
        a.rm.alpha = 0.6 + 0.25 * Math.sin(t * 5);
        a.disc.position.set(p.x, H + 2, p.y);
        a.disc.scaling.set(230 + Math.sin(t * 2.2) * 18, 1, 230 + Math.sin(t * 2.2) * 18);
        if (a.h) a.h.setRate((a.fx.rate || 14) * 1.5 * (p.speed > 200 ? 1.6 : 1));
    },

    // Разовый всплеск частиц мифического скина (финиш, удар, примерка).
    auraBurst(power) {
        const p = this.player, fx = this.app.fx, a = p && p.look && p.look.fx;
        if (!fx || !a) return;
        const h = fx.create({
            burst: Math.round(24 * (power || 1)), capacity: 40, life: [0.5, 1.1], size: [18, 34], speed: [120, 280], color: '#ffffff',
            position: new BABYLON.Vector3(p.x, this.groundH + 110, p.y), direction: [[-1, 0.3, -1], [1, 1, 1]], gravity: [0, -120, 0],
            blend: 'standard', sizeGradient: [[0, 0.5], [0.4, 1], [1, 0.2]],
        });
        if (h) h.system.particleTexture = Characters.spriteTexture(this.app.location.view.scene, a.tex, a.c1, a.c2);
    },

    // --- След за игроком ------------------------------------------------------------------------------

    startTrail() {
        const p = this.player, fx = this.app.fx, tr = p && p.look && p.look.trail;
        if (!fx || !tr || !tr.tex || this.trail) return;
        const scene = this.app.location.view.scene, H = this.groundH;
        const h = fx.create({
            rate: 0, capacity: 90, life: [0.45, 0.9], size: [16, 30], speed: [10, 40], color: '#ffffff',
            box: [[-22, 10, -22], [22, 60, 22]], direction: [[-0.4, 0.5, -0.4], [0.4, 1, 0.4]], gravity: [0, tr.tex === 'flame' || tr.tex === 'bubble' ? 60 : -20, 0],
            spin: tr.spin ? [-4, 4] : [-1, 1], blend: 'standard',
            sizeGradient: [[0, 0.5], [0.3, 1], [1, 0.2]],
            follow: () => new BABYLON.Vector3(p.x, H, p.y),
        });
        if (!h) return;
        h.system.particleTexture = Characters.spriteTexture(scene, tr.tex, tr.c1, tr.c2);
        if (tr.rainbow) { h.system.color1 = new BABYLON.Color4(1, 0.4, 0.4, 1); h.system.color2 = new BABYLON.Color4(0.4, 0.6, 1, 1); }
        this.trail = { h, rate: tr.rate || 20 };
    },

    stopTrail() {
        if (this.trail) { this.trail.h.dispose(); this.trail = null; }
    },

    updateTrail() {
        const p = this.player;
        const moving = (this.mode === 'match' || this.mode === 'tutorial') && p.state === 'active' && p.speed > 160;
        const preview = this.previewTab() === 'trail';
        if (!(moving || preview)) { if (this.trail) this.trail.h.setRate(0); return; }
        if (!this.trail) this.startTrail();
        if (!this.trail) return;
        // В гардеробе персонаж стоит: след кружит облаком вокруг него, а не прячется в ногах.
        const sys = this.trail.h.system, wide = preview ? 1 : 0;
        if (this.trail.wide !== wide) {
            this.trail.wide = wide;
            sys.minEmitBox = new BABYLON.Vector3(preview ? -85 : -22, preview ? 0 : 10, preview ? -85 : -22);
            sys.maxEmitBox = new BABYLON.Vector3(preview ? 85 : 22, preview ? 190 : 60, preview ? 85 : 22);
            sys.minSize = preview ? 22 : 16; sys.maxSize = preview ? 40 : 30;
        }
        this.trail.h.setRate(preview ? this.trail.rate * 1.3 : this.trail.rate * Math.min(1.4, p.speed / 400));
    },

    // --- Результаты -------------------------------------------------------------------------------

    showResults() {
        const m = this.match, p = this.player, s = this.save;
        if (!m || !p) return;
        this.resultsShown = true;
        this.mode = 'results';
        const won = m.playerWon();
        const survived = p.team === 'runner' && won;
        const st = p.stats;
        const mult = this.rewardMult();
        const coins = Math.round((st.crossings * 10 + st.catches * 12 + st.revives * 8 + (won ? (survived ? 60 : 25) : 5)) * mult);
        const gems = st.gems;
        const xp = Math.round(coins + gems * 2 * mult);
        s.coins += coins; s.gems += gems; s.xp += xp;
        this._lastReward = { coins, gems, xp, doubled: false };
        Platform.submitScore(this.matchScore(p, won));
        if (won) s.wins++;
        let levelUp = false;
        while (s.xp >= this.xpNext(s.level)) { s.xp -= this.xpNext(s.level); s.level++; levelUp = true; }
        p.level = s.level;
        rvUI().plate?.(p.id, { name: p.name, sub: Lang.t('plateLevel', { n: p.level }), me: true });
        this.persist();
        Platform.track(won ? 'progression_completed' : 'progression_failed', { step_id: 'round', role: p.team, difficulty: this.difficulty(), survived });
        Platform.ads.roundEnded();
        Platform.gameplay(false);
        rvUI().showHUD?.(false);
        rvUI().showResults?.({
            win: won, title: Lang.t(won ? 'resWin' : 'resLose'), role: p.team,
            stats: [
                { label: Lang.t('statCrossings'), value: String(st.crossings) + ' / ' + m.c.crossings },
                { label: Lang.t('statCatches'), value: String(st.catches) },
                { label: Lang.t('statRevives'), value: String(st.revives) },
                { label: Lang.t('statGems'), value: String(gems) },
                { label: Lang.t('statDifficulty'), value: Lang.t('setDiff_' + this.difficulty()) + ' ×' + this.rewardMult() },
            ],
            coins, gems, xp, level: s.level, levelUp,
        });
        if (levelUp) this.sfx('level_up');
        rvUI().setResultsDouble?.(this.adsReady() ? 'available' : 'unavailable');
        rvUI().offerRevive?.(false);
        this.camAz = this.app.camera.azimuth;
        this.menuT = 0;
    },

    resultsNext() {
        if (this._busy) return;
        this._busy = true;
        Platform.ads.next(() => { this._busy = false; rvUI().hideResults?.(); this.enterMenu(); });
    },

    // --- Кадр ---------------------------------------------------------------------------------------

    update(dt) {
        const m = this.match;
        if ((this.mode === 'match' || this.mode === 'tutorial') && m) {
            this.readPlayerInput();
            m.update(dt);
            if (this.mode === 'tutorial') this.updateTutorial(dt);
            if (this.mode === 'match' && m.phase === 'end') {
                this.endT += dt;
                if (this.endT > 3.2 && !this.resultsShown) this.showResults();
            }
        } else if (this.mode === 'results' && m) {
            for (const a of this.actors) { a.input.mx = a.input.my = 0; }
        }
        this.updateObjects(dt);
        RVWater.update(dt);
    },

    // Каждый кадр, и на паузе: поза, таблички, камера, вода.
    frame(dt) {
        const paused = Pause.active;
        const adt = paused ? 0 : dt;
        this.updateCamera(dt);
        this.animateActors(adt);
        this.updatePlates();
        if (!paused) {
            this._waterT += dt;
            const ter = this.app.location.terrain;
            const tex = ter && ter.material && ter.material.diffuseTexture;
            if (tex) { tex.uOffset = this._waterT * 0.004; tex.vOffset = Math.sin(this._waterT * 0.3) * 0.01; }
            if (this.foamMat) this.foamMat.alpha = 0.42 + Math.sin(this._waterT * 2.2) * 0.12;
        }
        this.hudT -= dt;
        if (this.hudT <= 0) { this.hudT = 0.1; this.updateHUD(); }
    },

    animateActors(dt) {
        const m = this.match, H = this.groundH, mode = this.mode;
        const t = performance.now() / 1000;
        // Примерка ножа: нож в руке и показательный взмах раз в 2.4 с.
        const knifeShow = this.previewTab() === 'knife', ph = (t % 2.4) / 2.4;
        const knifeSwing = ph < 0.16 ? ph / 0.16 : -1;
        // Заслоняет ли актёр игрока: близко к камере или на отрезке камера -> игрок.
        const cp = this.app.location.view.camera.position, pl = this.player;
        const playing = mode === 'match' || mode === 'tutorial';
        const blocker = (a) => {
            if (!playing || !pl) return false;
            const ax = a.x - cp.x, ay = a.y - cp.z, bx = pl.x - cp.x, by = pl.y - cp.z;
            const bl = bx * bx + by * by;
            if (ax * ax + ay * ay < 230 * 230) return true;
            const u = bl > 1 ? (ax * bx + ay * by) / bl : 0;
            if (u <= 0 || u >= 0.97) return false;
            return Math.hypot(ax - bx * u, ay - by * u) < 62;
        };
        for (const a of this.actors) {
            const rig = a.rig;
            if (!rig || !rig.root.isEnabled()) continue;
            const inMenu = mode === 'menu' || mode === 'wardrobe';
            const vmax = m ? m.maxSpeed(a) : 540;
            let am = 'run';
            if (inMenu) am = a.isPlayer && knifeShow ? 'run' : 'dance';   // примерка ножа — стойка, не танец
            else if (a.state === 'downed') am = 'downed';
            else if (a.stunT > 0) am = 'stun';
            else if (a.reviving) am = 'revive';
            else if (a.celebrateT > 0 && a.speed < 200) am = a.isPlayer || mode === 'results' ? 'dance' : 'celebrate';
            rig.animate(dt, {
                speed01: inMenu ? 0 : a.speed / vmax, mode: am,
                dashT: a.dashT > 0 ? a.dashT / (m ? m.c.dashTime : 0.2) : (a.buffs.lunge > 0 || a.buffs.rocket > 0 ? 0.6 : 0),
                dashSide: a.dashSide, brakeT: a.brakeT > 0 ? a.brakeT / 0.28 : 0,
                attackT: a.isPlayer && knifeShow ? knifeSwing : a.attackT, knife: (a.team === 'chaser' && !inMenu) || (a.isPlayer && knifeShow), sprint: a.buffs.sprint > 0 || a.buffs.adrenaline > 0,
            });
            let heading = a.heading;
            if (inMenu) heading = Math.atan2(-Math.sin(this.camAzSmooth), -Math.cos(this.camAzSmooth)) + (a.isPlayer && mode === 'wardrobe' ? (knifeShow ? -0.95 : 0) : Math.sin(t * 0.4 + a.id) * 0.25);
            rig.place(a.x, a.y, H, heading);
            // Лицо по состоянию; у мультяшных лиц (hero/buddy/champ) — эмоции в том же стиле.
            let face = a.look.face || (RV_TOON ? 'hero' : 'smile');
            const toon = face === 'hero' || face === 'buddy' || face === 'champ';
            if (a.state === 'downed') face = toon ? 'daze' : 'dizzy';
            else if (a.team === 'chaser' && !inMenu) face = toon ? 'mad' : 'angry';
            else if (m && a.team === 'runner' && a.state === 'active' && !inMenu && m.phase === 'run') {
                for (const c of m.actors) if (c.team === 'chaser' && Math.abs(c.x - a.x) < 230 && Math.abs(c.y - a.y) < 230) { face = toon ? 'fear' : 'scared'; break; }
            }
            rig.setFace(face);
            // Невидимость: свой — полупрозрачный, чужой почти не виден. Как в Roblox, тот, кто
            // оказался между камерой и игроком, тоже становится прозрачным.
            const cloak = a.buffs.cloak > 0;
            let vis = cloak ? (a.isPlayer ? 0.35 : 0.12) : a.invulnT > 0 ? 0.55 + 0.45 * Math.abs(Math.sin(t * 18)) : 1;
            if (!a.isPlayer && blocker(a)) vis = Math.min(vis, 0.28);
            rig.setVisibility(vis);
            if (rig.knife) {
                const s = (a.buffs.dagger > 0 ? 1.9 : 1) * 1.3;   // ножи чуть крупнее — читаются издалека
                rig.knife.scaling.set(s, s, s);
            }
        }
        // Кольцо досягаемости игрока-ловца.
        const p = this.player;
        if (this.ring && p) {
            const show = (mode === 'match' || mode === 'tutorial') && p.team === 'chaser' && p.state === 'active';
            this.ring.setEnabled(show);
            if (show) {
                const r = m ? m.range(p) : 150;
                this.ring.position.set(p.x, H + 3, p.y);
                this.ring.scaling.set(r, 60, r);
                const mat = /** @type {any} */ (this.ring.material);
                mat.alpha = p.attackCd > 0 ? 0.22 : 0.5;
            }
        }
    },

    updateObjects(dt) {
        const H = this.groundH, t = performance.now() / 1000;
        for (const rec of this.gemMeshes.values()) {
            rec.born = Math.min(1, rec.born + dt * 3);
            const pop = rec.born < 1 ? 1 + Math.sin(rec.born * Math.PI) * 0.4 : 1;
            const s = rec.born * pop;
            rec.mesh.scaling.set(s, s, s);
            rec.mesh.position.y = H + 52 + Math.sin(t * 2.6 + rec.phase) * 10;
            rec.mesh.rotation.y = t * 1.8 + rec.phase;
        }
        for (const rec of this.doorMeshes.values()) {
            rec.t = Math.min(1, rec.t + dt * 5);
            const e = 1 + Math.sin(rec.t * Math.PI) * 0.15;
            rec.mesh.scaling.set(1, rec.t * e, 1);
        }
        for (const rec of this.slashes.values()) {
            if (rec.t >= 1) continue;
            const a = rec.actor;
            rec.t += dt / 0.2;
            const show = a.attackT >= 0.26 || rec.t > 0.3;
            rec.mesh.setEnabled(show && rec.t < 1);
            rec.mesh.position.set(a.x, H + 78, a.y);
            const sweep = (rec.t - 0.5) * 1.1;
            rec.mesh.rotation.set(0.25, -a.heading + sweep, 0);
            const range = this.match ? this.match.range(a) / 150 : 1;
            const s = (0.75 + rec.t * 0.35) * range;
            rec.mesh.scaling.set(s, 1, s);
            const mat = /** @type {any} */ (rec.mesh.material);
            mat.alpha = Math.max(0, 1 - rec.t);
        }
        for (const r of this.ropes) {
            r.t -= dt;
            BABYLON.MeshBuilder.CreateTube('rope', { path: [new BABYLON.Vector3(r.a.x, H + 90, r.a.y), new BABYLON.Vector3(r.b.x, H + 90, r.b.y)], radius: 4, instance: r.mesh });
        }
        for (const r of this.ropes.filter(x => x.t <= 0)) { r.mesh.dispose(); r.mat.dispose(); }
        this.ropes = this.ropes.filter(x => x.t > 0);
        for (const s of this.shocks) {
            s.t += dt / 0.45;
            const r = 40 + s.t * 680;
            s.mesh.scaling.set(r, 40, r);
            s.mat.alpha = Math.max(0, 0.9 * (1 - s.t));
        }
        for (const s of this.shocks.filter(x => x.t >= 1)) { s.mesh.dispose(); s.mat.dispose(); }
        this.shocks = this.shocks.filter(x => x.t < 1);
        // Линия финиша пульсирует во время забега.
        const m = this.match;
        if (this.lines) {
            const goalIsB = !m || m.dir < 0;
            const running = m && (m.phase === 'run' || m.phase === 'hero' || m.phase === 'countdown');
            for (const [key, line] of [['a', this.lines.a], ['b', this.lines.b]]) {
                const goal = (key === 'b') === goalIsB && running;
                const k = goal ? 0.5 + 0.5 * Math.sin(t * 6) : 0;
                line.material.emissiveColor = new BABYLON.Color3(1, 1 - k * 0.18, 1 - k * 0.75);
                line.scaling.z = goal ? 1 + k * 0.5 : 1;
            }
        }
        // Пыль из-под ног игрока и след.
        const p = this.player, fx = this.app.fx;
        if (p) { this.updateTrail(); this.updateAura(); }
        if (fx && p && (this.mode === 'match' || this.mode === 'tutorial')) {
            if (!this.dust) this.dust = fx.play('run-dust', new BABYLON.Vector3(p.x, H, p.y), { follow: () => new BABYLON.Vector3(p.x, H + 2, p.y) });
            const k = p.state === 'active' ? Math.max(0, p.speed - 250) / 300 : 0;
            for (const h of this.dust.handles) h.setRate(k * 26 + (p.brakeT > 0 ? 40 : 0));
        } else if (this.dust) { this.dust.dispose(); this.dust = null; }
        // Шаги игрока.
        if (p && p.state === 'active' && p.speed > 200 && (this.mode === 'match' || this.mode === 'tutorial')) {
            this._stepT = (this._stepT || 0) - dt * (p.speed / 540);
            if (this._stepT <= 0) { this._stepT = 0.29; this.sfx(['step_1', 'step_2', 'step_3'][Math.floor(Math.random() * 3)], { volume: 0.5, detune: 0.1 }); }
        }
    },

    updatePlates() {
        const ui = rvUI();
        if (!ui.platePos) return;
        const view = this.app.location.view, H = this.groundH, m = this.match;
        const show = this.mode === 'match' || this.mode === 'tutorial';
        const cam = view.camera.position;
        for (const a of this.actors) {
            if (!show || !a.rig.root.isEnabled() || (a.buffs.cloak > 0 && !a.isPlayer)) { ui.platePos(a.id, 0, 0, false); continue; }
            const lying = a.state === 'downed';
            const s = view.projectToScreen(a.x, a.y, H + (lying ? 90 : 232));
            const dist = Math.hypot(cam.x - a.x, cam.z - a.y);
            const scale = Math.max(0.55, Math.min(1.15, 1100 / Math.max(1, dist)));
            ui.platePos(a.id, s.x, s.y, s.visible && dist < 4200, scale);
            // Подпись: уровень, у лежачего — сколько осталось до обращения.
            let sub = Lang.t('plateLevel', { n: a.level });
            if (m && lying && this.mode === 'match') sub = '⏳ ' + Math.max(0, Math.ceil(m.c.convertTime - a.downT));
            const color = a.team === 'chaser' && this.mode !== 'menu' ? '#ff5a4a' : null;
            const key = sub + '|' + color;
            if (a._plateKey !== key) { a._plateKey = key; ui.plate?.(a.id, { name: a.name, sub, color, me: a.isPlayer }); }
        }
    },

    updateHUD() {
        const ui = rvUI(), m = this.match, p = this.player;
        if (!ui.setHUD || !m || !p || !(this.mode === 'match' || this.mode === 'tutorial')) return;
        const runners = m.actors.filter(a => a.team === 'runner' && a.state !== 'downed').length;
        const chasers = m.actors.filter(a => a.team === 'chaser').length;
        const phase = m.phase === 'countdown' ? 'countdown' : (m.phase === 'run' || m.phase === 'hero') ? 'run' : m.phase === 'end' ? 'over' : 'wait';
        let action = null;
        const rt = m._reviveTarget(p);
        let hint = null;
        if (p.state === 'downed') hint = Lang.t('hintDowned');
        else if (p.team === 'chaser') { action = 'attack'; hint = this.mode === 'match' && m.phase === 'run' ? Lang.t(this.touch ? 'hintChaserTouch' : 'hintChaser') : null; }
        else if (rt) { action = 'revive'; hint = Lang.t(this.touch ? 'hintReviveTouch' : 'hintRevive', { name: rt.name }); }
        else if (p.consumable.id === 'adrenaline' && p.consumable.count > 0) action = 'adrenaline';
        if (!hint && p.team === 'runner' && p.state === 'active') hint = Lang.t(m.canLeaveStart(p) ? 'hintCross' : 'hintWait');
        if (this.mode === 'tutorial') hint = null;
        const ab = p.ability.id ? RV_ITEMS[p.ability.id] : null;
        ui.setHUD({
            role: p.state === 'downed' ? 'downed' : p.team, phase,
            crossing: m.crossing, crossings: m.c.crossings,
            timeLeft: this.mode === 'tutorial' ? null : (m.phase === 'run' || m.phase === 'hero') ? Math.max(0, m.timer) : null,
            runners, chasers,
            gems: this.save.gems + p.stats.gems, coins: this.save.coins,
            ability: ab ? { id: p.ability.id, ready: p.ability.cd <= 0, cooldown: ab.cd ? p.ability.cd / ab.cd : 0, active: p.ability.cd > ab.cd - (ab.dur || 0) } : null,
            dash: { ready: p.dashCd <= 0, cooldown: p.dashCd / m.c.dashCooldown },
            action, actionProgress: rt ? rt.reviveP : 0,
            consumable: p.consumable.id ? { id: p.consumable.id, count: p.consumable.count } : null,
            hint,
        });
    },

    // Громкость звука = базовая по громкости файла (SOUNDS.md) × opts.volume.
    sfx(name, opts) {
        const url = SFX[name];
        if (!url) return;
        const o = Object.assign({}, opts || {});
        o.volume = (SFX_GAIN[name] == null ? 1 : SFX_GAIN[name]) * (o.volume == null ? 1 : o.volume);
        Sound.play(url, o);
    },
};
