// Match.js — правила матча Valley Rushing Classic (без 3D: только состояние и события).
//
// Поле и линии — маркеры карты (Maps.js): field (центр, scale — размер в метрах),
// line-a (южная линия), line-b (северная), chaser (центр зоны ловцов). Координаты в
// коде не хранятся: правка карты в редакторе меняет игру.
//
// Матч: один ловец, остальные — бегуны. Пересечение — бегуны ждут за линией старта,
// отсчёт 3-2-1, «БЕГИ!!», и за RV_ROUND_TIME секунд нужно попасть за линию напротив.
// Удар ножом валит бегуна; лежачего можно спасти (удерживать действие рядом), иначе через
// RV_CONVERT_TIME секунд он встаёт ловцом. Не успевшие к сигналу — пойманы. После
// пересечения направление меняется. Бегуны побеждают, если кто-то прошёл все RV_CROSSINGS
// пересечений; ловцы — если бегунов не осталось. Со 2-го пересечения случайному бегуну
// предлагают «Героя»: пробежать поле в одиночку за награду.
//
// Движение с инерцией: разгон RV_ACCEL, без ввода — скольжение RV_FRICTION, рывок по
// направлению ввода (Пробел), резкая остановка (Shift) гасит скорость сразу.
// Ввод актёра — actor.input { mx, my (мир, длина ≤ 1), dash, brake, attack, ability, action }:
// игрока заполняет Game, ботов — Bots.think. События — opts.emit(type, data) для звука,
// эффектов и интерфейса.

/** @satisfies {Record<string, any>} */
const RV_ITEMS = {
    sprint: { tab: 'runner', price: 0, currency: 'gems', cd: 12, dur: 2.2 },
    door: { tab: 'runner', price: 300, currency: 'gems', cd: 18, dur: 6 },
    cloak: { tab: 'runner', price: 700, currency: 'gems', cd: 20, dur: 3 },
    airhorn: { tab: 'runner', price: 600, currency: 'gems', cd: 18, dur: 0 },
    lunge: { tab: 'chaser', price: 0, currency: 'gems', cd: 6, dur: 0.22 },
    leash: { tab: 'chaser', price: 800, currency: 'gems', cd: 15, dur: 0 },
    dagger: { tab: 'chaser', price: 500, currency: 'gems', cd: 16, dur: 5 },
    rocket: { tab: 'chaser', price: 450, currency: 'gems', cd: 10, dur: 0.28 },
    medkit: { tab: 'items', price: 60, currency: 'coins', cd: 0, dur: 0 },
    adrenaline: { tab: 'items', price: 40, currency: 'coins', cd: 0, dur: 5 },
};

// Константы правил с дефолтами (в игре это лексические const — только typeof).
function rvCfg() {
    const U = 'undefined';
    return {
        players: typeof RV_PLAYERS !== U ? RV_PLAYERS : 16,
        crossings: typeof RV_CROSSINGS !== U ? RV_CROSSINGS : 3,
        roundTime: typeof RV_ROUND_TIME !== U ? RV_ROUND_TIME : 24,
        waitTime: typeof RV_WAIT_TIME !== U ? RV_WAIT_TIME : 3,
        countdown: typeof RV_COUNTDOWN !== U ? RV_COUNTDOWN : 3,
        runnerSpeed: typeof RV_RUNNER_SPEED !== U ? RV_RUNNER_SPEED : 540,
        chaserSpeed: typeof RV_CHASER_SPEED !== U ? RV_CHASER_SPEED : 565,
        accel: typeof RV_ACCEL !== U ? RV_ACCEL : 1900,
        friction: typeof RV_FRICTION !== U ? RV_FRICTION : 1300,
        dashSpeed: typeof RV_DASH_SPEED !== U ? RV_DASH_SPEED : 980,
        dashTime: typeof RV_DASH_TIME !== U ? RV_DASH_TIME : 0.2,
        dashCooldown: typeof RV_DASH_COOLDOWN !== U ? RV_DASH_COOLDOWN : 1.3,
        brakeCooldown: typeof RV_BRAKE_COOLDOWN !== U ? RV_BRAKE_COOLDOWN : 0.35,
        knifeRange: typeof RV_KNIFE_RANGE !== U ? RV_KNIFE_RANGE : 150,
        knifeArc: (typeof RV_KNIFE_ARC_DEG !== U ? RV_KNIFE_ARC_DEG : 120) * Math.PI / 180,
        knifeCooldown: typeof RV_KNIFE_COOLDOWN !== U ? RV_KNIFE_COOLDOWN : 0.6,
        reviveRange: typeof RV_REVIVE_RANGE !== U ? RV_REVIVE_RANGE : 125,
        reviveTime: typeof RV_REVIVE_TIME !== U ? RV_REVIVE_TIME : 1,
        convertTime: typeof RV_CONVERT_TIME !== U ? RV_CONVERT_TIME : 5,
        gems: typeof RV_GEMS_PER_ROUND !== U ? RV_GEMS_PER_ROUND : 6,
        gemValue: typeof RV_GEM_VALUE !== U ? RV_GEM_VALUE : 3,
        botSkill: typeof RV_BOT_SKILL !== U ? RV_BOT_SKILL : 0.6,
        heroChance: typeof RV_HERO_CHANCE !== U ? RV_HERO_CHANCE : 0.4,
        heroTime: typeof RV_HERO_TIME !== U ? RV_HERO_TIME : 12,
        heroGems: typeof RV_HERO_GEMS !== U ? RV_HERO_GEMS : 25,
    };
}

const RV_RADIUS = 28;          // px: «тело» актёра для расталкивания
const RV_ATTACK_DUR = 0.38;    // секунд: анимация удара; попадание — на 30% хода

class RVActor {
    constructor(id, name, look, isPlayer) {
        this.id = id;
        this.name = name;
        this.look = look;
        this.isPlayer = !!isPlayer;
        this.level = 1;
        /** @type {'runner' | 'chaser'} */
        this.team = 'runner';
        /** @type {'active' | 'downed' | 'safe'} */
        this.state = 'active';
        this.x = 0; this.y = 0; this.vx = 0; this.vy = 0;
        this.heading = 0;
        this.input = { mx: 0, my: 0, dash: false, brake: false, attack: false, ability: false, action: false };
        this.dashT = 0; this.dashCd = 0; this.dashX = 0; this.dashY = 0; this.dashSide = 1;
        this.brakeT = 0; this.brakeCd = 0;
        this.attackT = -1; this.attackCd = 0; this.attackChecked = false; this.attackBuf = 0;
        /** @type {number | null} */
        this.lockHeading = null;      // Shift Lock: курс игрока = направление камеры
        this.downT = 0; this.reviveP = 0; this.reviver = null; this.invulnT = 0; this.selfRevive = -1;
        this.celebrateT = 0; this.stunT = 0; this.reviving = false;
        this.ability = { id: '', cd: 0, activeT: 0 };
        this.buffs = { sprint: 0, adrenaline: 0, cloak: 0, dagger: 0, rocket: 0, lunge: 0 };
        this.consumable = { id: '', count: 0 };
        this.stats = { crossings: 0, catches: 0, revives: 0, gems: 0, caught: false };
        this.bot = null;
        this.rig = null;
        this.wasDowned = false;
        this._lookKey = '';           // Game: ключ надетой внешности (пересборка персонажа)
        this._wetT = 0;               // Water: пауза между волнами от бега у края поля
        this._plateKey = '';          // Game: последнее содержимое таблички
        /** @type {any} */
        this._dizzy = null;           // Game: частицы «звёздочки» над лежачим
    }

    get speed() { return Math.hypot(this.vx, this.vy); }
    get active() { return this.state === 'active'; }
}

class RVMatch {
    // geo: { minX, maxX, minY, maxY, lineA, lineB, chaser: {x, y} } — из маркеров (Game.fieldGeo).
    // opts: { emit(type, data), rand(), tutorial?: boolean }
    constructor(geo, actors, opts) {
        this.c = rvCfg();
        this.geo = geo;
        this.actors = actors;
        this.opts = opts || {};
        this.rand = this.opts.rand || Math.random;
        this.phase = 'wait';
        this.phaseT = 0;
        this.timer = 0;
        this.crossing = 1;
        this.dir = -1;                    // −1: от line-a к line-b (вверх по карте)
        /** @type {{ id: number, x: number, y: number, alive: boolean }[]} */
        this.gems = [];
        /** @type {{ id: number, x: number, y: number, nx: number, ny: number, half: number, t: number, owner: RVActor }[]} */
        this.doors = [];
        this._ids = 1;
        this.hero = null;
        this.heroPending = null;
        this.winner = '';
        this.countLeft = 0;
        this.overConverted = false;
        this.time = 0;
        this.tutorial = !!this.opts.tutorial;
    }

    emit(type, data) { if (this.opts.emit) this.opts.emit(type, data || {}); }

    // --- Геометрия -------------------------------------------------------------------

    get startY() { return this.dir < 0 ? this.geo.lineA : this.geo.lineB; }
    get goalY() { return this.dir < 0 ? this.geo.lineB : this.geo.lineA; }
    get dist() { return Math.abs(this.geo.lineA - this.geo.lineB); }
    // Продвижение по направлению забега: 0 — линия старта, dist — линия финиша.
    progress(y) { return (y - this.startY) * this.dir; }
    yAt(s) { return this.startY + s * this.dir; }

    runners() { return this.actors.filter(a => a.team === 'runner'); }
    chasers() { return this.actors.filter(a => a.team === 'chaser'); }
    get player() { return this.actors.find(a => a.isPlayer) || null; }

    // --- Старт ------------------------------------------------------------------------

    // chaserIds — кто начинает ловцом.
    begin(chaserIds) {
        for (const a of this.actors) {
            a.team = chaserIds.includes(a.id) ? 'chaser' : 'runner';
            a.state = 'active';
            a.stats = { crossings: 0, catches: 0, revives: 0, gems: 0, caught: false };
            a.wasDowned = false;
        }
        this.crossing = 1;
        this.dir = -1;
        this._placeStart(true);
        this._enterWait();
    }

    _placeStart(teleport) {
        const g = this.geo, runners = this.runners(), chasers = this.chasers();
        const w = g.maxX - g.minX - 300;
        runners.forEach((a, i) => {
            const col = i % 8, row = Math.floor(i / 8);
            const x = g.minX + 150 + w * (col + 0.5) / 8 + (this.rand() - 0.5) * 60;
            const y = this.yAt(-(140 + row * 110 + this.rand() * 40));
            if (teleport) { a.x = x; a.y = y; a.vx = a.vy = 0; }
            a.heading = this.dir < 0 ? -Math.PI / 2 : Math.PI / 2;
        });
        chasers.forEach((a, i) => {
            const x = g.chaser.x + (i - (chasers.length - 1) / 2) * 260;
            if (teleport) { a.x = x; a.y = g.chaser.y; a.vx = a.vy = 0; }
            a.heading = this.dir < 0 ? Math.PI / 2 : -Math.PI / 2;
        });
    }

    _enterWait() {
        this.phase = 'wait';
        this.phaseT = 0;
        this.timer = this.c.roundTime;
        this.hero = null;
        this.heroPending = null;
        this.overConverted = false;
        this.doors = [];
        for (const a of this.actors) {
            a.reviveP = 0; a.downT = 0; a.celebrateT = 0;
            if (a.team === 'runner' && a.state === 'safe') a.state = 'active';
            if (a.ability) a.ability.cd = Math.min(a.ability.cd, 2);
        }
        this._spawnGems();
        this.emit('wait', { crossing: this.crossing, total: this.c.crossings, dir: this.dir });
        // «Герой или трус» — со второго пересечения.
        if (!this.tutorial && this.crossing >= 2 && this.rand() < this.c.heroChance) {
            const pool = this.runners().filter(a => a.state === 'active');
            if (pool.length >= 3) {
                const pl = pool.find(a => a.isPlayer);
                const pick = pl && this.rand() < 0.45 ? pl : pool[Math.floor(this.rand() * pool.length)];
                if (pick.isPlayer) { this.heroPending = pick; this.emit('heroOffer', { actor: pick }); }
                else if (this.rand() < 0.45) this._setHero(pick);
            }
        }
    }

    // Ответ игрока на предложение «Героя».
    heroDecision(yes) {
        const a = this.heroPending;
        this.heroPending = null;
        if (a && yes && this.phase !== 'run') this._setHero(a);
    }

    _setHero(a) {
        this.hero = a;
        this.emit('hero', { actor: a });
    }

    _spawnGems() {
        for (const g of this.gems) if (g.alive) this.emit('gemGone', { gem: g });
        this.gems = [];
        const geo = this.geo, n = this.tutorial ? 0 : this.c.gems;
        for (let i = 0; i < n; i++) {
            const s = 380 + this.rand() * (this.dist - 760);
            const gem = { id: this._ids++, x: geo.minX + 220 + this.rand() * (geo.maxX - geo.minX - 440), y: this.yAt(s), alive: true };
            this.gems.push(gem);
            this.emit('gemSpawn', { gem });
        }
    }

    addGem(x, y) {
        const gem = { id: this._ids++, x, y, alive: true };
        this.gems.push(gem);
        this.emit('gemSpawn', { gem });
        return gem;
    }

    // --- Кадр ---------------------------------------------------------------------------

    update(dt) {
        this.time += dt;
        this.phaseT += dt;
        const c = this.c;
        if (this.tutorial) { /* обучение ведёт Game: фаз раунда нет */ }
        else if (this.phase === 'wait') {
            if (this.phaseT >= c.waitTime && !this.heroPending) this._enterCountdown();
        } else if (this.phase === 'countdown') {
            const left = Math.ceil(c.countdown - this.phaseT);
            if (left !== this.countLeft && left > 0) { this.countLeft = left; this.emit('count', { n: left }); }
            if (this.phaseT >= c.countdown) this._enterRun();
        } else if (this.phase === 'hero') {
            this.timer -= dt;
            const h = this.hero;
            if (!h || h.state !== 'active' || this.timer <= 0) {
                if (h && h.state === 'active' && this.timer <= 0) this._down(h, null);
                this.hero = null;
                this.phase = 'heroEnd';
                this.phaseT = 0;
            }
        } else if (this.phase === 'heroEnd') {
            if (this.phaseT >= 1.4) { this.timer = c.roundTime; this._go(); }
        } else if (this.phase === 'run') {
            const prev = Math.ceil(this.timer);
            this.timer -= dt;
            if (Math.ceil(this.timer) !== prev && this.timer <= 5 && this.timer > 0) this.emit('tick', { n: Math.ceil(this.timer) });
            if (this.timer <= 0) {
                for (const a of this.runners()) if (a.state === 'active') this._down(a, null);
                this.emit('timeUp', {});
                this._enterOver();
            } else if (!this.runners().some(a => a.state === 'active')) this._enterOver();
        } else if (this.phase === 'over') {
            if (!this.overConverted && this.phaseT >= 1.1) {
                this.overConverted = true;
                for (const a of this.runners()) if (a.state === 'downed') this._convert(a);
            }
            if (this.phaseT >= 2.8) this._nextCrossing();
        }

        for (const a of this.actors) this._think(a, dt);
        for (const a of this.actors) this._step(a, dt);
        this._collide();
        this._resolve(dt);
        for (const d of this.doors) d.t -= dt;
        if (this.doors.some(d => d.t <= 0)) {
            for (const d of this.doors) if (d.t <= 0) this.emit('doorGone', { door: d });
            this.doors = this.doors.filter(d => d.t > 0);
        }
    }

    _enterCountdown() {
        this.phase = 'countdown';
        this.phaseT = 0;
        this.countLeft = 0;
    }

    _enterRun() {
        if (this.hero && this.hero.state === 'active') {
            this.phase = 'hero';
            this.phaseT = 0;
            this.timer = this.c.heroTime;
            this.emit('heroGo', { actor: this.hero });
            return;
        }
        this._go();
    }

    _go() {
        this.phase = 'run';
        this.phaseT = 0;
        this.emit('go', { crossing: this.crossing });
    }

    _enterOver() {
        this.phase = 'over';
        this.phaseT = 0;
        const safe = this.runners().filter(a => a.state === 'safe').length;
        this.emit('roundOver', { safe, crossing: this.crossing });
    }

    _nextCrossing() {
        const alive = this.runners().filter(a => a.state === 'safe' || a.state === 'active');
        if (!alive.length) return this._finish('chasers');
        if (this.crossing >= this.c.crossings) return this._finish('runners');
        this.crossing++;
        this.dir = -this.dir;
        this._enterWait();
    }

    _finish(winner) {
        this.phase = 'end';
        this.phaseT = 0;
        this.winner = winner;
        for (const a of this.actors) {
            const won = (winner === 'runners') === (a.team === 'runner');
            a.celebrateT = won ? 99 : 0;
        }
        this.emit('end', { winner });
    }

    // Мозг: бот или ввод игрока (заполняет Game).
    _think(a, dt) {
        if (a.bot && typeof Bots !== 'undefined') Bots.think(a, this, dt);
    }

    // Предельная скорость с усилениями.
    maxSpeed(a) {
        let v = a.team === 'chaser' ? this.c.chaserSpeed : this.c.runnerSpeed;
        if (a.buffs.sprint > 0) v *= 1.35;
        if (a.buffs.adrenaline > 0) v *= 1.12;
        // Боты: скорость по мастерству (сложность в настройках) — лёгкие ловцы и бегуны медленнее.
        if (a.bot) v *= 0.82 + 0.22 * (a.bot.skill || 0.5);
        return v;
    }

    // Можно ли сейчас бегуну выйти за линию старта.
    canLeaveStart(a) {
        if (this.phase === 'run') return true;
        if (this.phase === 'hero') return a === this.hero;
        return false;
    }

    _step(a, dt) {
        const c = this.c, inp = a.input;
        for (const k in a.buffs) if (a.buffs[k] > 0) a.buffs[k] = Math.max(0, a.buffs[k] - dt);
        a.dashCd = Math.max(0, a.dashCd - dt);
        a.brakeCd = Math.max(0, a.brakeCd - dt);
        a.attackCd = Math.max(0, a.attackCd - dt);
        a.invulnT = Math.max(0, a.invulnT - dt);
        a.stunT = Math.max(0, a.stunT - dt);
        a.celebrateT = Math.max(0, a.celebrateT - dt);
        if (a.ability.id) a.ability.cd = Math.max(0, a.ability.cd - dt);
        a.dashT = Math.max(0, a.dashT - dt);
        a.brakeT = Math.max(0, a.brakeT - dt);
        const ended = this.phase === 'end';

        if (a.state === 'downed') {
            a.downT += dt;
            const f = Math.max(0, 1 - 6 * dt);
            a.vx *= f; a.vy *= f;
            a.x += a.vx * dt; a.y += a.vy * dt;
            this._clampField(a);
            if (a.selfRevive >= 0 && a.downT >= a.selfRevive) { a.selfRevive = -1; this._revive(a, a); }
            else if (!this.tutorial && a.downT >= c.convertTime && this.phase === 'run') this._convert(a);
            return;
        }

        // Действия.
        if (!ended && a.stunT <= 0) {
            if (inp.ability && a.ability.id && a.ability.cd <= 0) this._useAbility(a);
            if (inp.dash && a.dashCd <= 0) {
                let dx = inp.mx, dy = inp.my;
                const l = Math.hypot(dx, dy);
                if (l < 0.2) { dx = Math.cos(a.heading); dy = Math.sin(a.heading); } else { dx /= l; dy /= l; }
                a.dashX = dx; a.dashY = dy;
                a.dashT = c.dashTime; a.dashCd = c.dashCooldown;
                const cross = Math.cos(a.heading) * dy - Math.sin(a.heading) * dx;
                a.dashSide = cross >= 0 ? 1 : -1;
                this.emit('dash', { actor: a });
            }
            if (inp.brake && a.brakeCd <= 0 && a.speed > 120) {
                a.vx = 0; a.vy = 0; a.dashT = 0;
                a.brakeT = 0.28; a.brakeCd = c.brakeCooldown;
                this.emit('brake', { actor: a });
            }
            // Нажатие удара — разовое: запоминается на 0.25 с (клик чуть раньше конца перезарядки не теряется).
            if (inp.attack) a.attackBuf = 0.25;
            if (a.attackBuf > 0 && a.team === 'chaser' && a.attackCd <= 0 && a.attackT < 0) { a.attackBuf = 0; this._swing(a); }
            if (inp.action && a.team === 'runner' && a.consumable.id === 'adrenaline' && a.consumable.count > 0 && !this._reviveTarget(a)) {
                a.consumable.count--;
                a.buffs.adrenaline = RV_ITEMS.adrenaline.dur;
                this.emit('consumable', { actor: a, id: 'adrenaline' });
            }
        }
        inp.dash = false; inp.brake = false; inp.ability = false; inp.attack = false;
        a.attackBuf = Math.max(0, (a.attackBuf || 0) - dt);

        // Ход удара.
        if (a.attackT >= 0) {
            a.attackT += dt / RV_ATTACK_DUR;
            if (!a.attackChecked && a.attackT >= 0.3) { a.attackChecked = true; this._hitCheck(a); }
            if (a.attackT >= 1) a.attackT = -1;
        }

        // Скорость: разгон к желаемой, без ввода — скольжение.
        const vmax = this.maxSpeed(a);
        let mx = ended || a.stunT > 0 ? 0 : inp.mx, my = ended || a.stunT > 0 ? 0 : inp.my;
        const ml = Math.hypot(mx, my);
        if (ml > 1) { mx /= ml; my /= ml; }
        const accel = c.accel * (a.buffs.adrenaline > 0 ? 1.8 : 1);
        if (a.dashT > 0 || a.buffs.rocket > 0 || a.buffs.lunge > 0) {
            const sp = a.buffs.rocket > 0 ? 1400 : a.buffs.lunge > 0 ? 1200 : c.dashSpeed;
            const k = 1 - Math.pow(0.0001, dt);
            a.vx += (a.dashX * sp - a.vx) * k;
            a.vy += (a.dashY * sp - a.vy) * k;
        } else if (Math.hypot(mx, my) > 0.08) {
            const tx = mx * vmax, ty = my * vmax;
            let dx = tx - a.vx, dy = ty - a.vy;
            const dl = Math.hypot(dx, dy);
            // Разворот против движения — чуть резче, чтобы управление не было ватным.
            const against = (a.vx * mx + a.vy * my) < 0 ? 1.35 : 1;
            const step = accel * against * dt;
            if (dl > step) { dx *= step / dl; dy *= step / dl; }
            a.vx += dx; a.vy += dy;
        } else {
            const sp = a.speed, dec = c.friction * (a.stunT > 0 ? 0.6 : 1) * dt;
            if (sp <= dec) { a.vx = 0; a.vy = 0; } else { a.vx *= (sp - dec) / sp; a.vy *= (sp - dec) / sp; }
        }
        // Скорость сверх предела (после рывка) гаснет плавно.
        const sp = a.speed, cap = a.dashT > 0 || a.buffs.rocket > 0 || a.buffs.lunge > 0 ? 1500 : vmax;
        if (sp > cap) { const k = Math.max(cap / sp, 1 - 5 * dt); a.vx *= k; a.vy *= k; }

        a.x += a.vx * dt;
        a.y += a.vy * dt;
        this._constrain(a);

        // Курс — по скорости (или по камере в Shift Lock); во время удара держится направление удара.
        if (a.attackT < 0 && a.lockHeading != null) a.heading = a.lockHeading;
        else if (a.attackT < 0 && a.speed > 40) {
            const want = Math.atan2(a.vy, a.vx);
            let d = want - a.heading;
            while (d > Math.PI) d -= Math.PI * 2;
            while (d < -Math.PI) d += Math.PI * 2;
            a.heading += d * Math.min(1, 16 * dt);
        }
    }

    _clampField(a) {
        const g = this.geo, r = RV_RADIUS;
        a.x = Math.max(g.minX + r, Math.min(g.maxX - r, a.x));
        a.y = Math.max(g.minY + r, Math.min(g.maxY - r, a.y));
    }

    // Зоны: бегуны до сигнала — за линией старта, дошедшие — за линией финиша,
    // ловцы — только между линиями.
    _constrain(a) {
        this._clampField(a);
        const s = this.progress(a.y), d = this.dist;
        let lo = -1e9, hi = 1e9;
        if (a.team === 'chaser') { lo = 34; hi = d - 34; }
        else if (a.state === 'safe') lo = d + 12;
        else if (!this.canLeaveStart(a)) hi = -18;
        if (this.phase === 'end') { lo = -1e9; hi = 1e9; if (a.team === 'chaser') { lo = 34; hi = d - 34; } }
        const cs = Math.max(lo, Math.min(hi, s));
        if (cs !== s) {
            a.y = this.yAt(cs);
            const vs = a.vy * this.dir;
            if ((cs === lo && vs < 0) || (cs === hi && vs > 0)) a.vy = 0;
        }
    }

    // Расталкивание актёров и двери.
    _collide() {
        const list = this.actors, r2 = RV_RADIUS * 2;
        for (let i = 0; i < list.length; i++) {
            const a = list[i];
            for (let j = i + 1; j < list.length; j++) {
                const b = list[j];
                const dx = b.x - a.x, dy = b.y - a.y;
                const d2 = dx * dx + dy * dy;
                if (d2 >= r2 * r2 || d2 < 1e-6) continue;
                const d = Math.sqrt(d2), push = (r2 - d) / 2;
                const nx = dx / d, ny = dy / d;
                const wa = a.state === 'downed' ? 0.2 : 1, wb = b.state === 'downed' ? 0.2 : 1;
                const sum = wa + wb;
                a.x -= nx * push * (2 * wa / sum); a.y -= ny * push * (2 * wa / sum);
                b.x += nx * push * (2 * wb / sum); b.y += ny * push * (2 * wb / sum);
            }
        }
        for (const door of this.doors) {
            for (const a of list) {
                if (a.team !== 'chaser') continue;
                const rx = a.x - door.x, ry = a.y - door.y;
                const along = rx * -door.ny + ry * door.nx;
                const across = rx * door.nx + ry * door.ny;
                if (Math.abs(along) > door.half + RV_RADIUS || Math.abs(across) > 18 + RV_RADIUS) continue;
                const side = across >= 0 ? 1 : -1;
                const push = (18 + RV_RADIUS) * side - across;
                a.x += door.nx * push; a.y += door.ny * push;
                const vn = a.vx * door.nx + a.vy * door.ny;
                if (vn * side < 0) { a.vx -= door.nx * vn; a.vy -= door.ny * vn; }
            }
        }
        for (const a of list) this._constrain(a);
    }

    // --- Нож ------------------------------------------------------------------------------

    range(a) { return this.c.knifeRange * (a.buffs.dagger > 0 ? 2 : 1); }

    _swing(a) {
        a.attackT = 0;
        a.attackChecked = false;
        a.attackCd = this.c.knifeCooldown;
        // Доводка: развернуться к ближайшему бегуну в широком секторе перед собой.
        const t = this._nearestTarget(a, this.range(a) * 1.35, Math.PI * 0.95);
        if (t) a.heading = Math.atan2(t.y - a.y, t.x - a.x);
        this.emit('swing', { actor: a });
    }

    _nearestTarget(a, range, arc) {
        let best = null, bd = range + RV_RADIUS;
        for (const b of this.actors) {
            if (b.team !== 'runner' || b.state !== 'active' || b.invulnT > 0) continue;
            const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
            if (d > bd) continue;
            let ang = Math.atan2(dy, dx) - a.heading;
            while (ang > Math.PI) ang -= Math.PI * 2;
            while (ang < -Math.PI) ang += Math.PI * 2;
            if (Math.abs(ang) > arc / 2 && d > RV_RADIUS * 1.6) continue;
            best = b; bd = d;
        }
        return best;
    }

    _hitCheck(a) {
        if (this.phase !== 'run' && this.phase !== 'hero' && !this.tutorial) return;
        const t = this._nearestTarget(a, this.range(a), this.c.knifeArc);
        if (!t) { this.emit('miss', { actor: a }); return; }
        if (a.buffs.dagger > 0) a.buffs.dagger = 0;
        this._down(t, a);
    }

    // Бегун повержен: ударом (by) или не успел к сигналу (by = null).
    _down(t, by) {
        if (t.state !== 'active' || t.team !== 'runner') return;
        t.state = 'downed';
        t.downT = 0;
        t.reviveP = 0;
        t.attackT = -1;
        t.dashT = 0;
        t.wasDowned = true;
        t.stats.caught = true;
        if (by) {
            const dx = t.x - by.x, dy = t.y - by.y, d = Math.hypot(dx, dy) || 1;
            t.vx = dx / d * 420; t.vy = dy / d * 420;
            by.stats.catches++;
        }
        t.selfRevive = -1;
        if (t.consumable.id === 'medkit' && t.consumable.count > 0 && by) {
            t.consumable.count--;
            t.selfRevive = 1.4;
            this.emit('consumable', { actor: t, id: 'medkit' });
        }
        this.emit('downed', { actor: t, by });
    }

    _revive(t, by) {
        if (t.state !== 'downed') return;
        t.state = 'active';
        t.reviveP = 0;
        t.invulnT = 1.6;
        t.downT = 0;
        if (by && by !== t) by.stats.revives++;
        this.emit('revived', { actor: t, by });
    }

    _convert(a) {
        if (a.team !== 'runner' || a.state !== 'downed') return;
        a.team = 'chaser';
        a.state = 'active';
        a.invulnT = 0;
        a.attackCd = 1;
        a.vx = a.vy = 0;
        if (a.isPlayer && a.ability) a.ability.cd = 1;
        this.emit('converted', { actor: a });
    }

    // Лежачий товарищ в пределах досягаемости бегуна (для подсказки и спасения).
    _reviveTarget(a) {
        if (a.team !== 'runner' || a.state !== 'active') return null;
        let best = null, bd = this.c.reviveRange;
        for (const b of this.actors) {
            if (b === a || b.state !== 'downed' || b.team !== 'runner') continue;
            const d = Math.hypot(b.x - a.x, b.y - a.y);
            if (d < bd) { best = b; bd = d; }
        }
        return best;
    }

    // Спасения, кристаллы, финиш.
    _resolve(dt) {
        for (const a of this.actors) { a.reviving = false; }
        for (const b of this.actors) {
            if (b.state !== 'downed') continue;
            let helper = null;
            for (const a of this.actors) {
                if (!a.input.action || this._reviveTarget(a) !== b) continue;
                helper = a; break;
            }
            if (helper) {
                helper.reviving = true;
                b.reviver = helper;
                b.reviveP += dt / this.c.reviveTime;
                if (b.reviveP >= 1) this._revive(b, helper);
            } else {
                b.reviver = null;
                b.reviveP = Math.max(0, b.reviveP - dt * 0.8);
            }
        }
        for (const g of this.gems) {
            if (!g.alive) continue;
            for (const a of this.actors) {
                if (a.team !== 'runner' || a.state === 'downed') continue;
                if (Math.abs(a.x - g.x) > 70 || Math.abs(a.y - g.y) > 70) continue;
                if (Math.hypot(a.x - g.x, a.y - g.y) > 66) continue;
                g.alive = false;
                a.stats.gems += this.c.gemValue;
                this.emit('gem', { gem: g, actor: a, value: this.c.gemValue });
                break;
            }
        }
        if (this.phase === 'run' || this.phase === 'hero' || this.phase === 'heroEnd') {
            for (const a of this.actors) {
                if (a.team !== 'runner' || a.state !== 'active') continue;
                if (this.progress(a.y) >= this.dist + 12) {
                    a.state = 'safe';
                    a.stats.crossings++;
                    a.celebrateT = 1.6;
                    if (a === this.hero) {
                        a.stats.gems += this.c.heroGems;
                        this.emit('heroWin', { actor: a, gems: this.c.heroGems });
                    }
                    this.emit('crossed', { actor: a });
                }
            }
        }
    }

    // --- Способности ---------------------------------------------------------------------

    _useAbility(a) {
        const id = a.ability.id, def = RV_ITEMS[id];
        if (!def) return;
        if (def.tab === 'runner' && a.team !== 'runner') return;
        if (def.tab === 'chaser' && a.team !== 'chaser') return;
        const fx = Math.cos(a.heading), fy = Math.sin(a.heading);
        let ok = true;
        if (id === 'sprint') a.buffs.sprint = def.dur;
        else if (id === 'cloak') a.buffs.cloak = def.dur;
        else if (id === 'dagger') a.buffs.dagger = def.dur;
        else if (id === 'door') {
            // Дверь поперёк хода позади бегуна.
            const hx = a.speed > 60 ? a.vx / a.speed : fx, hy = a.speed > 60 ? a.vy / a.speed : fy;
            const door = { id: this._ids++, x: a.x - hx * 110, y: a.y - hy * 110, nx: hx, ny: hy, half: 150, t: def.dur, owner: a };
            this.doors.push(door);
            this.emit('door', { door, actor: a });
        } else if (id === 'airhorn') {
            for (const b of this.actors) {
                if (b.team !== 'chaser' || b.state !== 'active') continue;
                const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
                if (d > 340 || d < 1) continue;
                b.vx = dx / d * 1050; b.vy = dy / d * 1050; b.stunT = 0.85; b.attackT = -1;
            }
        } else if (id === 'lunge' || id === 'rocket') {
            let dx = fx, dy = fy;
            const l = Math.hypot(a.input.mx, a.input.my);
            if (id === 'rocket' && l > 0.2) { dx = a.input.mx / l; dy = a.input.my / l; }
            a.dashX = dx; a.dashY = dy;
            a.buffs[id] = def.dur;
        } else if (id === 'leash') {
            const t = this._nearestTarget(a, 470, Math.PI * 0.8);
            if (t) {
                const dx = a.x - t.x, dy = a.y - t.y, d = Math.hypot(dx, dy) || 1;
                t.vx = dx / d * 1150; t.vy = dy / d * 1150; t.stunT = 0.4; t.dashT = 0;
                this.emit('leash', { actor: a, target: t });
            } else ok = false;
        }
        if (!ok) { a.ability.cd = 0.6; this.emit('abilityFail', { actor: a, id }); return; }
        a.ability.cd = def.cd;
        a.ability.activeT = def.dur;
        this.emit('ability', { actor: a, id });
    }

    // Итог для игрока: его сторона победила?
    playerWon() {
        const p = this.player;
        if (!p || !this.winner) return false;
        return this.winner === 'runners' ? p.team === 'runner' : p.team === 'chaser';
    }
}
