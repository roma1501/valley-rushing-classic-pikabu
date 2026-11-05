// Bots.js — мозги ботов Valley Rushing Classic. Каждый кадр Bots.think(actor, match, dt) заполняет
// actor.input тем же форматом, что и ввод игрока (Match.js): направление движения в мире,
// разовые нажатия рывка / остановки / удара / способности и удержание действия.
//
// Бегун: ждёт сигнала у линии, выбирает дорожку, бежит к линии напротив, уходит от
// ближайших ловцов (отталкивание с упреждением), делает рывок вбок, когда ловец рядом и
// замахивается, подбирает кристаллы по пути, иногда спасает лежачих, если рядом безопасно.
// Часть бегунов медлит на старте — толпа не уходит одним комком.
// Ловец: до сигнала — встаёт в строй посреди поля; в забеге выбирает цель (близость,
// упреждение, не больше двух ловцов на одного бегуна), ведёт перехват и бьёт ножом в
// досягаемости; иногда делает выпад. Мастерство (skill) — точность упреждения и реакция.

/** @satisfies {Record<string, any>} */
const Bots = {
    // Память бота — один раз при создании.
    brain(rand, skill) {
        return {
            skill: Math.max(0.15, Math.min(1, skill + (rand() - 0.5) * 0.35)),
            bravery: rand(),
            lane: 0,
            hesitate: 0,
            target: null,
            retarget: 0,
            react: 0,
            dodgeT: 0,
            dodgeFor: -1,
            willDodge: false,
            dodgeDelay: 0,
            slot: rand(),
            wander: { x: 0, y: 0, t: 0 },
            phase: '',
            jitter: rand() * 6.28,
            rand,
        };
    },

    think(a, m, dt) {
        const b = a.bot, inp = a.input;
        inp.dash = false; inp.brake = false; inp.attack = false; inp.ability = false; inp.action = false;
        inp.mx = 0; inp.my = 0;
        if (a.state === 'downed' || m.phase === 'end') return;
        b.retarget -= dt; b.react -= dt; b.dodgeT -= dt; b.wander.t -= dt;
        if (b.phase !== m.phase) {
            b.phase = m.phase;
            if (m.phase === 'wait') {
                b.lane = m.geo.minX + 200 + b.rand() * (m.geo.maxX - m.geo.minX - 400);
                b.hesitate = b.rand() < 0.3 + 0.4 * (1 - b.skill) ? b.rand() * 4 * (1.15 - b.skill) : 0;
                b.target = null;
            }
        }
        if (a.team === 'runner') this._runner(a, m, dt, b, inp);
        else this._chaser(a, m, dt, b, inp);
    },

    _seek(inp, a, x, y, slow) {
        const dx = x - a.x, dy = y - a.y, d = Math.hypot(dx, dy);
        if (d < 6) return d;
        const k = slow ? Math.min(1, d / slow) : 1;
        inp.mx = dx / d * k; inp.my = dy / d * k;
        return d;
    },

    // Погулять рядом с точкой: стоять, иногда переходить.
    _mill(a, b, inp, cx, cy, rx, ry) {
        if (b.wander.t <= 0) {
            b.wander.t = 1.2 + b.rand() * 2.5;
            b.wander.x = cx + (b.rand() - 0.5) * rx * 2;
            b.wander.y = cy + (b.rand() - 0.5) * ry * 2;
        }
        const d = this._seek(inp, a, b.wander.x, b.wander.y, 160);
        if (d < 30) { inp.mx = 0; inp.my = 0; }
        else { inp.mx *= 0.45; inp.my *= 0.45; }
    },

    _runner(a, m, dt, b, inp) {
        const goalS = m.dist + 160;
        if (a.state === 'safe') {
            // Дошёл: отойти от линии и порадоваться.
            this._mill(a, b, inp, Math.max(m.geo.minX + 150, Math.min(m.geo.maxX - 150, a.x)), m.yAt(m.dist + 190), 120, 50);
            return;
        }
        const running = m.canLeaveStart(a);
        if (!running) {
            const startX = Math.max(m.geo.minX + 150, Math.min(m.geo.maxX - 150, b.lane));
            this._mill(a, b, inp, startX, m.yAt(-150 - b.slot * 120), 140, 60);
            return;
        }
        if (b.hesitate > 0 && m.phase === 'run' && m.timer > 9) {
            b.hesitate -= dt;
            this._mill(a, b, inp, a.x, m.yAt(-70), 90, 25);
            return;
        }
        // Цель — дорожка за линией финиша.
        let gx = b.lane, gy = m.yAt(goalS);
        let sx = gx - a.x, sy = gy - a.y;
        let sl = Math.hypot(sx, sy) || 1;
        sx /= sl; sy /= sl;
        // Кристалл рядом и безопасно — за ним.
        const chasers = m.actors.filter(c => c.team === 'chaser' && c.state === 'active');
        const danger = (x, y, r) => chasers.some(c => Math.hypot(c.x - x, c.y - y) < r);
        let best = null, bd = 230 + 120 * b.bravery;
        for (const g of m.gems) {
            if (!g.alive || m.progress(g.y) < m.progress(a.y) - 120) continue;
            const d = Math.hypot(g.x - a.x, g.y - a.y);
            if (d < bd && !danger(g.x, g.y, 320)) { best = g; bd = d; }
        }
        if (best) { const d = Math.hypot(best.x - a.x, best.y - a.y) || 1; sx = (best.x - a.x) / d; sy = (best.y - a.y) / d; }
        // Спасти лежачего, если хватает смелости и ловцов рядом нет.
        if (b.bravery > 0.45 && m.timer > 6) {
            let down = null, dd = 420;
            for (const o of m.actors) {
                if (o.state !== 'downed' || o.team !== 'runner' || o.downT > m.c.convertTime - 1.2) continue;
                const d = Math.hypot(o.x - a.x, o.y - a.y);
                if (d < dd && !danger(o.x, o.y, 330)) { down = o; dd = d; }
            }
            if (down) {
                if (dd > m.c.reviveRange * 0.7) {
                    const d = dd || 1; sx = (down.x - a.x) / d; sy = (down.y - a.y) / d;
                } else {
                    inp.action = true; inp.mx = 0; inp.my = 0;
                    return;
                }
            }
        }
        // Уход от ловцов: отталкивание от упреждённой позиции, сильнее вблизи.
        let ax = 0, ay = 0, threat = null, td = 1e9;
        const look = 0.18 + 0.25 * b.skill;
        for (const c of chasers) {
            const px = c.x + c.vx * look, py = c.y + c.vy * look;
            const dx = a.x - px, dy = a.y - py, d = Math.hypot(dx, dy) || 1;
            if (d < td) { td = d; threat = c; }
            if (d > 620) continue;
            // Слабые боты почти не обходят ловца — лёгкая добыча; сильные огибают заранее.
            const w = Math.pow((620 - d) / 620, 2) * 2.6 * (0.3 + 1.05 * b.skill);
            // Уходить вбок сильнее, чем назад: так бегун огибает ловца, а не стоит.
            const lat = sx * dy - sy * dx;
            const side = lat >= 0 ? 1 : -1;
            ax += (dx / d) * w * 0.6 + (-sy * side) * w * 0.9;
            ay += (dy / d) * w * 0.6 + (sx * side) * w * 0.9;
        }
        if (a.invulnT > 0) { ax *= 0.3; ay *= 0.3; }
        let mx = sx + ax, my = sy + ay;
        // Не пятиться за линию старта, если уже выбежал.
        const ml = Math.hypot(mx, my) || 1;
        inp.mx = mx / ml; inp.my = my / ml;
        if (m.progress(a.y) > 40 && inp.my * m.dir < -0.6) { inp.my = -0.3 * m.dir; }
        // Сменить дорожку, если ловец стоит прямо на пути.
        if (threat && td < 380 && Math.abs(threat.x - b.lane) < 260 && b.rand() < dt * 2) {
            b.lane = threat.x + (a.x < threat.x ? -1 : 1) * (380 + b.rand() * 300);
            b.lane = Math.max(m.geo.minX + 150, Math.min(m.geo.maxX - 150, b.lane));
        }
        // Рывок от замаха или вплотную подошедшего ловца — с задержкой реакции.
        if (threat && a.dashCd <= 0 && b.dodgeT <= 0) {
            const close = td < 175 + 40 * b.skill;
            const swinging = threat.attackT >= 0 && threat.attackT < 0.25 && td < 230;
            // Решение увернуться — одно на сближение: шанс и задержка реакции зависят от мастерства.
            if ((close || swinging) && b.dodgeFor !== threat.id) {
                b.dodgeFor = threat.id;
                b.willDodge = b.rand() < 0.1 + 0.85 * Math.pow(b.skill, 1.2);
                b.dodgeDelay = 0.04 + (1 - b.skill) * 0.4;
            }
            if (!close && !swinging && td > 330) b.dodgeFor = -1;
            if (b.dodgeFor === threat.id) b.dodgeDelay -= dt;
            if ((close || swinging) && b.willDodge && b.dodgeDelay <= 0) {
                b.dodgeFor = -1;
                const dx = a.x - threat.x, dy = a.y - threat.y, d = Math.hypot(dx, dy) || 1;
                const side = (b.rand() < 0.5 ? 1 : -1);
                inp.mx = (-dy / d * side + sx * 0.6); inp.my = (dx / d * side + sy * 0.6);
                const l = Math.hypot(inp.mx, inp.my) || 1; inp.mx /= l; inp.my /= l;
                inp.dash = true;
                b.dodgeT = 0.5 + (1 - b.skill) * 0.6;
            }
        }
        if (threat && td < 300 && a.ability.id && a.ability.cd <= 0 && b.rand() < dt * 3) inp.ability = true;
    },

    _chaser(a, m, dt, b, inp) {
        const g = m.geo;
        const chasers = m.actors.filter(c => c.team === 'chaser' && c.state === 'active');
        const idx = chasers.indexOf(a);
        if (m.phase === 'wait' || m.phase === 'countdown' || m.phase === 'over' || m.phase === 'heroEnd') {
            // Строй поперёк поля, ближе к середине; лицом к бегунам.
            const n = Math.max(1, chasers.length);
            const x = g.minX + 220 + (g.maxX - g.minX - 440) * ((idx + 0.5) / n);
            const rows = Math.ceil(n / 7), row = idx % Math.max(1, rows);
            const s = m.dist * (0.42 + row * 0.12 + (b.slot - 0.5) * 0.08);
            const d = this._seek(inp, a, x, m.yAt(s), 220);
            if (d < 26) { inp.mx = 0; inp.my = 0; }
            if (m.phase === 'over') { inp.mx *= 0.5; inp.my *= 0.5; }
            return;
        }
        // Выбор цели.
        if (b.retarget <= 0 || !b.target || b.target.state !== 'active' || b.target.team !== 'runner') {
            b.retarget = 0.35 + b.rand() * 0.5;
            let best = null, bs = 1e9;
            for (const r of m.actors) {
                if (r.team !== 'runner' || r.state !== 'active') continue;
                if (m.phase === 'hero' && r !== m.hero) continue;
                const d = Math.hypot(r.x - a.x, r.y - a.y);
                if (r.buffs.cloak > 0 && d > 110) continue;
                const s = m.progress(r.y);
                if (s < -30 && m.phase === 'run' && d > 200) continue;    // ещё за линией — недосягаем
                let score = d;
                const others = chasers.filter(c => c !== a && c.bot && c.bot.target === r).length;
                score += others * 320;
                if (s > m.dist - 300) score += 160;                       // почти дошёл — сложно догнать
                if (r.isPlayer) score -= 80 * b.skill;    // сильные ловцы охотнее идут за игроком
                if (score < bs) { bs = score; best = r; }
            }
            b.target = best;
        }
        const t = b.target;
        if (!t) {
            // Никого нет: держать середину между бегунами и финишем.
            const x = g.minX + 220 + (g.maxX - g.minX - 440) * ((idx + 0.5) / Math.max(1, chasers.length));
            this._seek(inp, a, x, m.yAt(m.dist * 0.62), 200);
            return;
        }
        // Перехват: упреждение по скорости цели.
        const d = Math.hypot(t.x - a.x, t.y - a.y);
        const lead = Math.min(0.9, d / 600) * (0.12 + 0.88 * b.skill);
        let ax = t.x + t.vx * lead, ay = t.y + t.vy * lead;
        // Ловец не выходит за линии — встаёт перед бегуном со стороны финиша.
        const s = m.progress(ay);
        if (s < 40) ay = m.yAt(40);
        this._seek(inp, a, ax, ay, 0);
        const wob = Math.sin(m.time * 1.3 + b.jitter) * 0.08;
        inp.mx += wob * inp.my; inp.my -= wob * inp.mx;
        // Удар: цель в досягаемости и перед собой.
        const range = m.range(a);
        if (d < range + 30 * b.skill - 12 * (1 - b.skill) && a.attackCd <= 0) {
            if (b.react <= 0) b.react = 0.04 + (1 - b.skill) * 0.42;
            else if (b.react <= dt * 1.5) inp.attack = true;
        } else if (d > range + 60) b.react = 0;
        // Выпад: цель чуть дальше удара и почти по курсу.
        if (a.ability.id && a.ability.cd <= 0 && d > 210 && d < 340) {
            const ang = Math.abs(Math.atan2(Math.sin(Math.atan2(t.y - a.y, t.x - a.x) - a.heading), Math.cos(Math.atan2(t.y - a.y, t.x - a.x) - a.heading)));
            if (ang < 0.35 && b.rand() < dt * 2.5 * b.skill) inp.ability = true;
        }
    },
};
