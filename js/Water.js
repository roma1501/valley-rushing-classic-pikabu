// Water.js — экспериментальная «физика воды» Valley Rushing Classic. Включается в настройках
// (по умолчанию выключена): плоская вода карты заменяется живой.
//
// Поверхность — сетка с шейдером: сумма волн Герстнера (одни и те же формулы считают и GPU,
// и CPU для плавающих предметов), отражение неба по Френелю, блик солнца, цвет от мелководья у
// поля к глубине, пена у бортов поля, у островов и на гребнях, туман сцены.
// Рябь — волновое уравнение на сетке вокруг поля (CPU, 30 шагов в секунду): поле и острова —
// твёрдые стенки, от них рябь отражается. Источники: персонажи, бегущие у края поля, рывки и
// удары у воды, рыбки, предметы на волнах. Высота ряби уходит в шейдер текстурой.
// Плавучесть: предметы (уточки, круги, мячи, бочки, кувшинки, ящики) держатся на воде пружиной
// с затуханием, наклоняются по склону волны, дрейфуют по ряби, отскакивают от берегов и сами
// разгоняют рябь. Всё на паузе стоит (время шейдера идёт только в update).

const RV_WAVES = [
    { dx: 0.94, dy: 0.34, amp: 10, len: 1300, speed: 0.55 },
    { dx: -0.37, dy: 0.93, amp: 6.5, len: 760, speed: 0.6 },
    { dx: 0.62, dy: -0.78, amp: 4, len: 430, speed: 0.75 },
    { dx: -0.96, dy: -0.28, amp: 2.4, len: 240, speed: 0.9 },
];

/** @satisfies {Record<string, any>} */
const RVWater = {
    on: false,
    /** @type {any} */
    game: null,
    time: 0,
    /** @type {any} */
    mesh: null,
    /** @type {any} */
    mat: null,
    /** @type {any} */
    tex: null,
    sim: null,
    floaters: [],
    fish: [],
    islands: [],
    _acc: 0,
    _fishT: 2,
    _dropT: 0.5,
    _hidden: [],

    setEnabled(game, on) {
        if (on && !this.on) this.enable(game);
        else if (!on && this.on) this.disable();
    },

    enable(game) {
        if (typeof BABYLON === 'undefined' || !game.app || !game.app.location) return;
        this.game = game;
        this.on = true;
        this.time = 0;
        const loc = game.app.location, scene = loc.view.scene, g = game.geo;
        const low = IS_MOBILE;
        this._collectIslands(loc);
        this._buildSim(g, low);
        this._buildMesh(scene, g, low);
        this._buildFloaters(scene, low ? 6 : 12);
        this._buildFish(scene);
        // Плоская вода карты и пена-полосы — прячутся, пока включена живая вода.
        this._hidden = [];
        for (const m of (loc.terrain && loc.terrain.meshes) || []) if (m.isEnabled()) { m.setEnabled(false); this._hidden.push(m); }
        for (const m of game.foam || []) if (m.isEnabled()) { m.setEnabled(false); this._hidden.push(m); }
    },

    disable() {
        if (!this.on) return;
        this.on = false;
        for (const m of this._hidden) m.setEnabled(true);
        this._hidden = [];
        for (const f of this.floaters) { World3D.removeObject(this.game.app.location.view, f.root); for (const mt of f.mats) mt.dispose(); }
        this.floaters = [];
        for (const f of this.fish) { f.root.dispose(); for (const mt of f.mats) mt.dispose(); }
        this.fish = [];
        if (this.mesh) this.mesh.dispose();
        if (this.mat) this.mat.dispose();
        if (this.tex) this.tex.dispose();
        this.mesh = this.mat = this.tex = null;
        this.sim = null;
    },

    // --- Волны Герстнера (CPU-копия шейдера: высота в точке карты) --------------------------

    waveHeight(x, y, t) {
        let h = 0;
        for (const w of RV_WAVES) {
            const k = 2 * Math.PI / w.len, c = Math.sqrt(981 / k) * w.speed;
            h += w.amp * Math.sin(k * (w.dx * x + w.dy * y) - k * c * t);
        }
        return h;
    },

    // Полная высота воды: волны + рябь.
    heightAt(x, y) {
        return this.waveHeight(x, y, this.time) + this.rippleAt(x, y) * this.sim.amp;
    },

    // --- Острова: окружности и прямоугольники для пены и стенок ряби -------------------------

    _collectIslands(loc) {
        this.islands = [];
        for (const rec of loc.objects) {
            if (!rec.mesh || !/island/i.test(String(rec.def.model || ''))) continue;
            const bb = rec.mesh.getHierarchyBoundingVectors(true);
            const cx = (bb.min.x + bb.max.x) / 2, cy = (bb.min.z + bb.max.z) / 2;
            this.islands.push({ x: cx, y: cy, hx: (bb.max.x - bb.min.x) / 2, hy: (bb.max.z - bb.min.z) / 2 });
        }
    },

    // --- Рябь: волновое уравнение на сетке --------------------------------------------------

    _buildSim(g, low) {
        const margin = 1600, cell = low ? 46 : 32;
        const x0 = g.minX - margin, y0 = g.minY - margin;
        const w = Math.ceil((g.W + margin * 2) / cell), h = Math.ceil((g.L + margin * 2) / cell);
        const n = w * h;
        const solid = new Uint8Array(n);
        const pad = 8;
        for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
            const x = x0 + (i + 0.5) * cell, y = y0 + (j + 0.5) * cell;
            let s = x > g.minX - pad && x < g.maxX + pad && y > g.minY - pad && y < g.maxY + pad;
            if (!s) for (const is of this.islands) if (Math.abs(x - is.x) < is.hx * 0.92 && Math.abs(y - is.y) < is.hy * 0.92) { s = true; break; }
            solid[j * w + i] = s ? 1 : 0;
        }
        this.sim = { x0, y0, cell, w, h, cur: new Float32Array(n), prev: new Float32Array(n), solid, amp: 26, damp: 0.986, px: new Uint8Array(n * 4) };
    },

    rippleAt(x, y) {
        const s = this.sim;
        if (!s) return 0;
        const fx = (x - s.x0) / s.cell - 0.5, fy = (y - s.y0) / s.cell - 0.5;
        const i = Math.floor(fx), j = Math.floor(fy);
        if (i < 0 || j < 0 || i >= s.w - 1 || j >= s.h - 1) return 0;
        const tx = fx - i, ty = fy - j, a = s.cur;
        const k = j * s.w + i;
        return (a[k] * (1 - tx) + a[k + 1] * tx) * (1 - ty) + (a[k + s.w] * (1 - tx) + a[k + s.w + 1] * tx) * ty;
    },

    // Возмущение: гауссов горб радиусом r px (amount ~ 0.2 — рябь, 1 — всплеск).
    disturb(x, y, amount, r) {
        const s = this.sim;
        if (!s) return;
        const rc = Math.max(1, Math.ceil((r || 60) / s.cell));
        const ci = Math.floor((x - s.x0) / s.cell), cj = Math.floor((y - s.y0) / s.cell);
        for (let j = cj - rc; j <= cj + rc; j++) for (let i = ci - rc; i <= ci + rc; i++) {
            if (i < 1 || j < 1 || i >= s.w - 1 || j >= s.h - 1) continue;
            const k = j * s.w + i;
            if (s.solid[k]) continue;
            const d2 = ((i - ci) * (i - ci) + (j - cj) * (j - cj)) / (rc * rc);
            if (d2 > 1) continue;
            s.cur[k] -= amount * Math.exp(-d2 * 3);
        }
    },

    _step() {
        const s = this.sim, w = s.w, h = s.h, cur = s.cur, prev = s.prev, solid = s.solid, damp = s.damp;
        // Классическая схема: новое = (сумма соседей / 2 − прошлое) × затухание; стенки — ноль.
        for (let j = 1; j < h - 1; j++) {
            let k = j * w + 1;
            for (let i = 1; i < w - 1; i++, k++) {
                if (solid[k]) { prev[k] = 0; continue; }
                const v = ((cur[k - 1] + cur[k + 1] + cur[k - w] + cur[k + w]) * 0.5 - prev[k]) * damp;
                prev[k] = v > 3 ? 3 : v < -3 ? -3 : v;
            }
        }
        s.prev = cur; s.cur = prev;
    },

    _upload() {
        const s = this.sim, px = s.px, a = s.cur;
        for (let k = 0, p = 0; k < a.length; k++, p += 4) {
            const v = Math.max(0, Math.min(255, 128 + a[k] * 90));
            px[p] = v; px[p + 1] = s.solid[k] ? 255 : 0; px[p + 2] = 0; px[p + 3] = 255;
        }
        this.tex.update(px);
    },

    // --- Поверхность ----------------------------------------------------------------------------

    _buildMesh(scene, g, low) {
        const S = 17000, sub = low ? 110 : 210;
        const mesh = BABYLON.MeshBuilder.CreateGround('rv-water-surface', { width: S, height: S, subdivisions: sub }, scene);
        mesh.position.set(g.cx, 0, g.cy);
        mesh.isPickable = false;
        mesh.alwaysSelectAsActiveMesh = true;   // смещение вершин в шейдере: рамка меша не должна отсекать
        const s = this.sim;
        this.tex = new BABYLON.RawTexture(s.px, s.w, s.h, BABYLON.Engine.TEXTUREFORMAT_RGBA, scene, false, false, BABYLON.Texture.BILINEAR_SAMPLINGMODE);
        this.tex.wrapU = this.tex.wrapV = BABYLON.Texture.CLAMP_ADDRESSMODE;
        RVWater._registerShaders();
        const mat = new BABYLON.ShaderMaterial('rv-water-mat', scene, { vertex: 'rvWater', fragment: 'rvWater' }, {
            attributes: ['position'],
            uniforms: ['world', 'viewProjection', 'uTime', 'uRippleRect', 'uRippleAmp', 'uRippleTexel', 'uCam', 'uSun', 'uDeep', 'uShallow', 'uSky', 'uHorizon',
                'uFogColor', 'uFogDensity', 'uField', 'uIslands', 'uIslandCount', 'uWaves'],
            samplers: ['uRipples'],
        });
        mat.setTexture('uRipples', this.tex);
        mat.setVector4('uRippleRect', new BABYLON.Vector4(s.x0, s.y0, s.w * s.cell, s.h * s.cell));
        mat.setFloat('uRippleAmp', s.amp);
        mat.setVector2('uRippleTexel', new BABYLON.Vector2(1 / s.w, 1 / s.h));
        mat.setVector4('uField', new BABYLON.Vector4(g.minX, g.minY, g.maxX, g.maxY));
        const isl = [];
        for (let i = 0; i < 24; i++) {
            const it = this.islands[i];
            isl.push(it ? new BABYLON.Vector4(it.x, it.y, it.hx, it.hy) : new BABYLON.Vector4(-1e6, -1e6, 1, 1));
        }
        mat.setArray4('uIslands', isl.flatMap(v => [v.x, v.y, v.z, v.w]));
        mat.setFloat('uIslandCount', Math.min(24, this.islands.length));
        const wv = [];
        for (const w of RV_WAVES) { const k = 2 * Math.PI / w.len; wv.push(w.dx, w.dy, w.amp, k, Math.sqrt(981 / k) * w.speed * k); }
        mat.setFloats('uWaves', wv);
        const sun = World3D.sunDirection().scale(-1).normalize();
        mat.setVector3('uSun', sun);
        mat.setColor3('uDeep', BABYLON.Color3.FromHexString('#137fa6'));
        mat.setColor3('uShallow', BABYLON.Color3.FromHexString('#47d6dd'));
        mat.setColor3('uSky', BABYLON.Color3.FromHexString('#4f9fe8'));
        mat.setColor3('uHorizon', BABYLON.Color3.FromHexString('#d4f1fd'));
        mat.backFaceCulling = false;
        mesh.material = mat;
        this.mesh = mesh;
        this.mat = mat;
    },

    _registerShaders() {
        const S = BABYLON.Effect.ShadersStore;
        if (S.rvWaterVertexShader) return;
        S.rvWaterVertexShader = `
precision highp float;
attribute vec3 position;
uniform mat4 world;
uniform mat4 viewProjection;
uniform float uTime;
uniform vec4 uRippleRect;
uniform float uRippleAmp;
uniform vec2 uRippleTexel;
uniform float uWaves[20];
uniform sampler2D uRipples;
varying vec3 vWorld;
varying vec3 vNormal;
varying float vCrest;
varying float vRipple;
float rip(vec2 uv) {
    if (uv.x < 0.0 || uv.y < 0.0 || uv.x > 1.0 || uv.y > 1.0) return 0.0;
    return (texture2D(uRipples, uv).r - 0.502) * 2.833;
}
void main(void) {
    vec4 wp = world * vec4(position, 1.0);
    vec2 p = wp.xz;
    vec3 disp = vec3(0.0);
    vec3 tang = vec3(1.0, 0.0, 0.0);
    vec3 bino = vec3(0.0, 0.0, 1.0);
    float crest = 0.0;
    for (int i = 0; i < 4; i++) {
        vec2 d = vec2(uWaves[i * 5], uWaves[i * 5 + 1]);
        float a = uWaves[i * 5 + 2], k = uWaves[i * 5 + 3], w = uWaves[i * 5 + 4];
        float ph = k * dot(d, p) - w * uTime;
        float s = sin(ph), c = cos(ph);
        float q = 0.55 / (k * a * 4.0 + 0.0001);
        disp.x += q * a * d.x * c;
        disp.z += q * a * d.y * c;
        disp.y += a * s;
        tang += vec3(-q * d.x * d.x * k * a * s, d.x * k * a * c, -q * d.x * d.y * k * a * s);
        bino += vec3(-q * d.x * d.y * k * a * s, d.y * k * a * c, -q * d.y * d.y * k * a * s);
        crest += max(0.0, s) * a;
    }
    vec2 ruv = (p - uRippleRect.xy) / uRippleRect.zw;
    float r = rip(ruv);
    float rx = rip(ruv + vec2(uRippleTexel.x, 0.0)) - rip(ruv - vec2(uRippleTexel.x, 0.0));
    float rz = rip(ruv + vec2(0.0, uRippleTexel.y)) - rip(ruv - vec2(0.0, uRippleTexel.y));
    float cellX = uRippleRect.z * uRippleTexel.x, cellZ = uRippleRect.w * uRippleTexel.y;
    vec3 n = normalize(cross(bino, tang));
    n = normalize(n + vec3(-rx * uRippleAmp / (2.0 * cellX), 0.0, -rz * uRippleAmp / (2.0 * cellZ)) * 3.0);
    wp.xyz += disp;
    wp.y += r * uRippleAmp;
    vWorld = wp.xyz;
    vNormal = n;
    vCrest = crest / 23.0;
    vRipple = r;
    gl_Position = viewProjection * wp;
}`;
        S.rvWaterFragmentShader = `
precision highp float;
uniform float uTime;
uniform vec3 uCam;
uniform vec3 uSun;
uniform vec3 uDeep;
uniform vec3 uShallow;
uniform vec3 uSky;
uniform vec3 uHorizon;
uniform vec3 uFogColor;
uniform float uFogDensity;
uniform vec4 uField;
uniform vec4 uIslands[24];
uniform float uIslandCount;
varying vec3 vWorld;
varying vec3 vNormal;
varying float vCrest;
varying float vRipple;
float boxDist(vec2 p, vec2 c, vec2 h) {
    vec2 d = abs(p - c) - h;
    return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
}
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
void main(void) {
    vec2 p = vWorld.xz;
    // Мелкая рябь-«чешуя» поверх крупных волн.
    float t = uTime;
    vec2 q = p * 0.012;
    float n1 = noise(q + vec2(t * 0.35, t * 0.21)), n2 = noise(q * 2.3 - vec2(t * 0.28, -t * 0.4));
    vec3 N = normalize(vNormal + vec3((n1 - 0.5) * 0.22 + (n2 - 0.5) * 0.12, 0.0, (n2 - 0.5) * 0.22 - (n1 - 0.5) * 0.1));
    vec3 V = normalize(uCam - vWorld);
    float fres = 0.06 + 0.9 * pow(1.0 - max(dot(N, V), 0.0), 4.0);
    vec3 R = reflect(-V, N);
    vec3 sky = mix(uHorizon, uSky, clamp(R.y * 1.8, 0.0, 1.0));
    // Расстояние до берега: борт поля и острова.
    float d = boxDist(p, (uField.xy + uField.zw) * 0.5, (uField.zw - uField.xy) * 0.5);
    for (int i = 0; i < 24; i++) {
        if (float(i) >= uIslandCount) break;
        d = min(d, boxDist(p, uIslands[i].xy, uIslands[i].zw * 0.85));
    }
    d = max(d, 0.0);
    float shallow = exp(-d / 520.0);
    vec3 water = mix(uDeep, uShallow, shallow);
    water *= 0.85 + 0.15 * max(dot(N, uSun), 0.0);
    vec3 col = mix(water, sky, fres);
    // Солнечная дорожка и блёстки.
    float spec = pow(max(dot(R, uSun), 0.0), 260.0) * 2.2 + pow(max(dot(R, uSun), 0.0), 40.0) * 0.12;
    col += vec3(1.0, 0.96, 0.86) * spec;
    // Пена: прибой у берега (бегущие полосы), гребни волн, гребни ряби.
    float surf = smoothstep(70.0, 0.0, d + sin(t * 1.6 + (p.x + p.y) * 0.018) * 12.0 + n1 * 22.0);
    float band = smoothstep(0.75, 1.0, sin(d * 0.05 - t * 2.2) * 0.5 + 0.5) * smoothstep(200.0, 50.0, d);
    float foam = surf * 0.8 + band * 0.28 * n2;
    foam += smoothstep(0.82, 1.05, vCrest + n1 * 0.12) * 0.25;
    foam += smoothstep(0.35, 0.9, abs(vRipple)) * 0.55;
    col = mix(col, vec3(0.97, 0.99, 1.0), clamp(foam, 0.0, 0.85));
    // Туман сцены (EXP2), как у остальной картинки.
    float dist = length(uCam - vWorld);
    float f = exp(-pow(dist * uFogDensity, 2.0));
    col = mix(uFogColor, col, clamp(f, 0.0, 1.0));
    gl_FragColor = vec4(col, 1.0);
}`;
    },

    // --- Плавающие предметы -------------------------------------------------------------------

    _buildFloaters(scene, count) {
        const g = this.game.geo, kinds = ['duck', 'ring', 'ball', 'barrel', 'lily', 'duck', 'crate', 'ring', 'ball', 'lily', 'duck', 'barrel'];
        let seed = 7;
        const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
        for (let i = 0; i < count; i++) {
            let x = 0, y = 0;
            for (let tries = 0; tries < 40; tries++) {
                const side = Math.floor(rnd() * 4), off = 180 + rnd() * 1100;
                x = side === 0 ? g.minX - off : side === 1 ? g.maxX + off : g.minX + rnd() * g.W;
                y = side === 2 ? g.minY - off : side === 3 ? g.maxY + off : g.minY + rnd() * g.L;
                if (!this._blocked(x, y, 60)) break;
            }
            const f = this._makeFloater(scene, kinds[i % kinds.length], i);
            Object.assign(f, { x, y, h: 0, vh: 0, vx: (rnd() - 0.5) * 20, vy: (rnd() - 0.5) * 20, yaw: rnd() * 6.28, spin: (rnd() - 0.5) * 0.4, pitch: 0, roll: 0 });
            this.floaters.push(f);
        }
    },

    _mat(scene, hex, mats, emissive) {
        const m = new BABYLON.StandardMaterial('rv-float-' + hex, scene);
        m.diffuseColor = BABYLON.Color3.FromHexString(hex);
        m.specularColor = new BABYLON.Color3(0.2, 0.2, 0.2);
        if (emissive) m.emissiveColor = BABYLON.Color3.FromHexString(hex).scale(0.3);
        mats.push(m);
        return m;
    },

    _makeFloater(scene, kind, i) {
        const root = new BABYLON.Mesh('rv-float-' + kind + '-' + i, scene);
        const mats = [];
        const add = (mesh, hex, x, y, z) => { mesh.material = this._mat(scene, hex, mats); mesh.position.set(x || 0, y || 0, z || 0); mesh.parent = root; return mesh; };
        let r = 40, draft = 10;
        if (kind === 'duck') {
            add(BABYLON.MeshBuilder.CreateSphere('b', { diameterX: 72, diameterY: 50, diameterZ: 56, segments: 10 }, scene), '#ffd23a', 0, 10, 0);
            add(BABYLON.MeshBuilder.CreateSphere('h', { diameter: 36, segments: 10 }, scene), '#ffd23a', 24, 42, 0);
            const beak = add(BABYLON.MeshBuilder.CreateCylinder('k', { diameterTop: 0, diameterBottom: 14, height: 18, tessellation: 8 }, scene), '#ff8a1f', 44, 40, 0);
            beak.rotation.z = -Math.PI / 2;
            for (const z of [-8, 8]) add(BABYLON.MeshBuilder.CreateSphere('e', { diameter: 6, segments: 6 }, scene), '#161a22', 36, 48, z);
            add(BABYLON.MeshBuilder.CreateSphere('t', { diameterX: 22, diameterY: 22, diameterZ: 16, segments: 6 }, scene), '#ffd23a', -32, 22, 0);
            r = 38; draft = 6;
        } else if (kind === 'ring') {
            const t = add(BABYLON.MeshBuilder.CreateTorus('r', { diameter: 90, thickness: 26, tessellation: 24 }, scene), '#ff4b5a', 0, 6, 0);
            t.scaling.y = 0.8;
            // Белые полосы — короткие цилиндры вдоль трубки круга.
            for (let k = 0; k < 4; k++) {
                const ang = k * Math.PI / 2 + Math.PI / 4;
                const s = add(BABYLON.MeshBuilder.CreateCylinder('s', { diameter: 28, height: 16, tessellation: 12 }, scene), '#ffffff', Math.cos(ang) * 45, 6, Math.sin(ang) * 45);
                s.rotation.set(0, Math.PI / 2 - ang, Math.PI / 2); s.scaling.set(0.8, 1, 1);
            }
            r = 52; draft = 4;
        } else if (kind === 'ball') {
            const cols = ['#ff3b3b', '#ffffff', '#2f8cff', '#ffd23a', '#ffffff', '#34e27a'];
            for (let k = 0; k < 6; k++) {
                const s = add(BABYLON.MeshBuilder.CreateSphere('p', { diameter: 56, segments: 10, arc: 1 / 6 }, scene), cols[k], 0, 22, 0);
                s.rotation.y = k * Math.PI / 3;
            }
            r = 30; draft = 6;
        } else if (kind === 'barrel') {
            const b = add(BABYLON.MeshBuilder.CreateCylinder('c', { diameter: 54, height: 78, tessellation: 14 }, scene), '#a0612e', 0, 0, 0);
            b.rotation.z = Math.PI / 2;
            for (const x of [-26, 26]) { const ring = add(BABYLON.MeshBuilder.CreateCylinder('h', { diameter: 57, height: 6, tessellation: 14 }, scene), '#3a3f4a', x, 0, 0); ring.rotation.z = Math.PI / 2; }
            r = 42; draft = 14;
        } else if (kind === 'lily') {
            add(BABYLON.MeshBuilder.CreateDisc('l', { radius: 46, tessellation: 18, arc: 0.88 }, scene), '#3fae4a', 0, 2, 0).rotation.x = Math.PI / 2;
            for (let k = 0; k < 6; k++) {
                const pet = add(BABYLON.MeshBuilder.CreateSphere('f', { diameterX: 10, diameterY: 8, diameterZ: 22, segments: 6 }, scene), '#ff9ad0', Math.cos(k) * 7, 9, Math.sin(k) * 7);
                pet.rotation.y = k * Math.PI / 3;
            }
            add(BABYLON.MeshBuilder.CreateSphere('c', { diameter: 8, segments: 6 }, scene), '#ffd23a', 0, 12, 0);
            r = 46; draft = 1;
        } else {
            add(BABYLON.MeshBuilder.CreateBox('w', { size: 60 }, scene), '#c8823a', 0, 18, 0);
            add(BABYLON.MeshBuilder.CreateBox('s1', { width: 62, height: 10, depth: 62 }, scene), '#7a4a22', 0, 34, 0);
            add(BABYLON.MeshBuilder.CreateBox('s2', { width: 62, height: 10, depth: 62 }, scene), '#7a4a22', 0, 2, 0);
            r = 40; draft = 12;
        }
        World3D.addObject(this.game.app.location.view, root, 'prop');
        return { root, mats, kind, r, draft };
    },

    _blocked(x, y, r) {
        const g = this.game.geo;
        if (x > g.minX - r && x < g.maxX + r && y > g.minY - r && y < g.maxY + r) return true;
        for (const is of this.islands) if (Math.abs(x - is.x) < is.hx + r && Math.abs(y - is.y) < is.hy + r) return true;
        return false;
    },

    _updateFloaters(dt) {
        const g = this.game.geo, s = this.sim;
        for (const f of this.floaters) {
            const r = f.r, h = this.heightAt(f.x, f.y);
            // Плавучесть: пружина к поверхности с затуханием.
            const target = h - f.draft;
            f.vh += ((target - f.h) * 26 - f.vh * 5) * dt;
            f.h += f.vh * dt;
            // Наклон по склону волны.
            const sx = (this.heightAt(f.x + r, f.y) - this.heightAt(f.x - r, f.y)) / (2 * r);
            const sy = (this.heightAt(f.x, f.y + r) - this.heightAt(f.x, f.y - r)) / (2 * r);
            const kk = 1 - Math.pow(0.02, dt);
            f.roll += (Math.atan(sx) - f.roll) * kk;
            f.pitch += (Math.atan(sy) - f.pitch) * kk;
            // Дрейф: рябь толкает от гребня, лёгкое течение вдоль поля, сопротивление воды.
            const gx = (this.rippleAt(f.x + 40, f.y) - this.rippleAt(f.x - 40, f.y)), gy = (this.rippleAt(f.x, f.y + 40) - this.rippleAt(f.x, f.y - 40));
            f.vx += (-gx * 900 + 4) * dt; f.vy += (-gy * 900 + 2.5) * dt;
            const drag = Math.pow(0.55, dt); f.vx *= drag; f.vy *= drag;
            f.x += f.vx * dt; f.y += f.vy * dt;
            // Берега: поле и острова отталкивают, предмет отскакивает.
            if (this._blocked(f.x, f.y, r)) {
                f.x -= f.vx * dt * 2; f.y -= f.vy * dt * 2; f.vx *= -0.6; f.vy *= -0.6;
                if (this._blocked(f.x, f.y, r)) { const dx = f.x - g.cx, dy = f.y - g.cy, l = Math.hypot(dx, dy) || 1; f.x += dx / l * 4; f.y += dy / l * 4; }
            }
            // Края области ряби — назад к полю.
            const minX = s.x0 + 150, maxX = s.x0 + s.w * s.cell - 150, minY = s.y0 + 150, maxY = s.y0 + s.h * s.cell - 150;
            if (f.x < minX || f.x > maxX) { f.vx *= -0.5; f.x = Math.max(minX, Math.min(maxX, f.x)); }
            if (f.y < minY || f.y > maxY) { f.vy *= -0.5; f.y = Math.max(minY, Math.min(maxY, f.y)); }
            f.yaw += f.spin * dt + (f.vx * 0.0006);
            // Предмет сам качает воду.
            // Предмет сам качает воду — слабо и редко, иначе рябь и качка раскачивают друг друга.
            f.wakeT = (f.wakeT || 0) - dt;
            if (f.wakeT <= 0 && Math.abs(f.vh) > 70) { f.wakeT = 0.3; this.disturb(f.x, f.y, 0.08, r); }
            f.root.position.set(f.x, f.h, f.y);
            f.root.rotation.set(f.pitch, f.yaw, -f.roll);
        }
    },

    // --- Рыбки: выпрыгивают и плюхаются --------------------------------------------------------

    _buildFish(scene) {
        for (let i = 0; i < 2; i++) {
            const mats = [];
            const root = new BABYLON.Mesh('rv-fish-' + i, scene);
            const body = BABYLON.MeshBuilder.CreateSphere('fb', { diameterX: 46, diameterY: 22, diameterZ: 14, segments: 8 }, scene);
            body.material = this._mat(scene, i ? '#ff8a1f' : '#ff5a8a', mats); body.parent = root;
            const tail = BABYLON.MeshBuilder.CreateCylinder('ft', { diameterTop: 0, diameterBottom: 22, height: 18, tessellation: 3 }, scene);
            tail.material = body.material; tail.rotation.z = Math.PI / 2; tail.position.x = -28; tail.parent = root;
            root.setEnabled(false);
            this.fish.push({ root, mats, t: -1, x0: 0, y0: 0, x1: 0, y1: 0 });
        }
    },

    _updateFish(dt) {
        this._fishT -= dt;
        const g = this.game.geo;
        if (this._fishT <= 0) {
            this._fishT = 2.5 + Math.random() * 4;
            const f = this.fish.find(q => q.t < 0);
            if (f) {
                let x = 0, y = 0;
                for (let k = 0; k < 20; k++) {
                    const side = Math.floor(Math.random() * 4), off = 160 + Math.random() * 900;
                    x = side === 0 ? g.minX - off : side === 1 ? g.maxX + off : g.minX + Math.random() * g.W;
                    y = side === 2 ? g.minY - off : side === 3 ? g.maxY + off : g.minY + Math.random() * g.L;
                    if (!this._blocked(x, y, 120)) break;
                }
                const a = Math.random() * 6.28;
                Object.assign(f, { t: 0, x0: x, y0: y, x1: x + Math.cos(a) * 170, y1: y + Math.sin(a) * 170 });
                f.root.setEnabled(true);
                this.splash(x, y, 0.55, true);
            }
        }
        for (const f of this.fish) {
            if (f.t < 0) continue;
            f.t += dt / 0.85;
            const u = Math.min(1, f.t);
            const x = f.x0 + (f.x1 - f.x0) * u, y = f.y0 + (f.y1 - f.y0) * u, h = Math.sin(u * Math.PI) * 130 - 6;
            f.root.position.set(x, h, y);
            f.root.rotation.set(0, -Math.atan2(f.y1 - f.y0, f.x1 - f.x0), Math.cos(u * Math.PI) * 0.9);
            if (u >= 1) { f.t = -1; f.root.setEnabled(false); this.splash(x, y, 0.7, true); }
        }
    },

    // --- Всплески ---------------------------------------------------------------------------------

    // Всплеск в точке карты: рябь, брызги и звук (quiet — без звука для далёких мелочей).
    splash(x, y, power, quiet) {
        if (!this.on) return;
        const p = power || 1;
        this.disturb(x, y, 1.1 * p, 50 + 40 * p);
        const fx = this.game.app.fx;
        if (fx) {
            fx.create({ burst: Math.round(16 + 22 * p), capacity: 44, life: [0.45, 1], size: [7, 16], speed: [140 * p + 60, 320 * p + 80],
                color: '#ffffff', color2: '#bff1ff', position: new BABYLON.Vector3(x, 6, y), direction: [[-0.45, 1, -0.45], [0.45, 1, 0.45]],
                gravity: [0, -900, 0], blend: 'standard', sizeGradient: [[0, 1], [1, 0.4]] });
            fx.create({ burst: 1, capacity: 2, life: [0.45, 0.5], size: [60 * p + 40, 70 * p + 50], speed: [0, 0], color: '#ffffff',
                position: new BABYLON.Vector3(x, 8, y), blend: 'standard', sizeGradient: [[0, 0.4], [1, 1.6]] });
        }
        if (!quiet || this._nearCamera(x, y)) this.game.sfx(p > 0.8 ? 'water_splash' : 'water_plop', { volume: Math.min(1, 0.35 + p * 0.4), detune: 0.12 });
    },

    _nearCamera(x, y) {
        const c = this.game.app.location.view.camera.position;
        return Math.hypot(c.x - x, c.z - y) < 1400;
    },

    // Ближайшая к актёру точка воды за бортом поля, если он у самого края (иначе null).
    edgeWater(a, reach) {
        const g = this.game.geo, r = reach || 70;
        const dl = a.x - g.minX, dr = g.maxX - a.x, dt = a.y - g.minY, db = g.maxY - a.y;
        const m = Math.min(dl, dr, dt, db);
        if (m > r) return null;
        if (m === dl) return { x: g.minX - 40, y: a.y };
        if (m === dr) return { x: g.maxX + 40, y: a.y };
        if (m === dt) return { x: a.x, y: g.minY - 40 };
        return { x: a.x, y: g.maxY + 40 };
    },

    // Событие актёра у края: рывок, удар, остановка — брызги за бортом.
    onActor(a, power) {
        if (!this.on) return;
        const w = this.edgeWater(a, 90);
        if (w) this.splash(w.x, w.y, power, !a.isPlayer);
    },

    // --- Кадр ---------------------------------------------------------------------------------------

    update(dt) {
        if (!this.on || !this.sim) return;
        this.time += dt;
        // Капли и порывы ветра — редкие маленькие кольца по всей воде.
        this._dropT -= dt;
        if (this._dropT <= 0) {
            this._dropT = 0.25 + Math.random() * 0.5;
            const s = this.sim;
            this.disturb(s.x0 + Math.random() * s.w * s.cell, s.y0 + Math.random() * s.h * s.cell, 0.35 + Math.random() * 0.4, 40);
        }
        // Бегущие у края поля: волна от ног за бортом.
        for (const a of this.game.actors) {
            if (!a.rig || !a.rig.root.isEnabled() || a.speed < 140) continue;
            a._wetT = (a._wetT || 0) - dt;
            if (a._wetT > 0) continue;
            const w = this.edgeWater(a, 55);
            if (!w) continue;
            a._wetT = 0.12;
            this.disturb(w.x, w.y, Math.min(0.6, a.speed / 1000), 45);
        }
        this._acc += dt;
        const step = 1 / 30;
        let n = 0;
        while (this._acc >= step && n < 3) { this._step(); this._acc -= step; n++; }
        if (this._acc > step) this._acc = 0;
        if (n) this._upload();
        this._updateFloaters(dt);
        this._updateFish(dt);
        const scene = this.game.app.location.view.scene, cam = this.game.app.location.view.camera;
        this.mat.setFloat('uTime', this.time);
        this.mat.setVector3('uCam', cam.position);
        this.mat.setColor3('uFogColor', scene.fogColor);
        this.mat.setFloat('uFogDensity', scene.fogDensity);
    },
};
