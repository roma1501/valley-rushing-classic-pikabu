// Characters.js — персонажи Valley Rushing Classic: модель из частей — голова, лицо, торс, руки,
// ноги с опорными точками в суставах: assets/models/char_r6.glb (блочные R6: Яндекс, Playgama)
// или assets/models/char_toon.glb (мультяшный ребёнок с шеей, кулаками и кроссовками — только
// YouTube Playables, RV_TOON). Цвета и лица на каждого, аксессуары на голове, рюкзак на спине,
// нож в правой руке и процедурная анимация частей: бег, рывок, торможение, удар ножом, падение,
// подъём, радость и танцы меню. Кости движок не читает (скилл world3d) — части вращаются вокруг
// своих опорных точек (metadata.pivot).
// Материалы частей по ролям: <Часть> (кожа / кофта / штаны по части), Skin (кисти), Shoe, Sole.
//
// Оси модели (как в Babylon/glTF): нос вдоль +X, верх +Y, левый бок персонажа — −Z.
// Мах рукой/ногой вперёд — rotation.z > 0; отвести левую руку в сторону — rotation.x > 0,
// правую — rotation.x < 0. Наклон тела вперёд — body.rotation.z < 0, крен вправо — x > 0.
// Нет модели — персонаж собирается из коробок той же раскладки (игра не падает).

const CHAR_SKIN = RV_TOON ? ['#f2c29b', '#f2d3b3', '#e8b48a', '#c58a5c', '#8d5a3b', '#d9a57a', '#6b4431', '#ffd9c2']
    : ['#f5cd30', '#f2d3b3', '#e8b48a', '#c58a5c', '#8d5a3b', '#f8f8f8', '#a3a2a5', '#ffd9c2'];
const CHAR_SHIRT = ['#ff8a1f', '#c4281c', '#1f2a44', '#287f47', '#6b327c', '#ff9a1f', '#1b1b1b', '#e8e8e8', '#e86fa8', '#2fb5c9', '#7a4a2a', '#f2c94c'];
const CHAR_PANTS = ['#6a4cd6', '#27304a', '#1b1b1b', '#5a3a22', '#3b5ba8', '#6d6e6c', '#2d4f2d', '#8a1d1d'];
const CHAR_HAIR = ['#e8762c', '#3b2416', '#f3d36b', '#1a1a1a', '#b5452a', RV_TOON ? '#5a3825' : '#9a9a9a', '#6b3f9e'];
const CHAR_FACES = RV_TOON ? ['hero', 'buddy', 'champ', 'hero', 'buddy', 'champ', 'grin', 'wink'] : ['smile', 'grin', 'cool', 'wink', 'happy', 'smirk'];
const CHAR_SHOES = ['#f5f5f5', '#f5f5f5', '#1b1b1b', '#e5463b', '#2f8cff', '#f2c230', '#34a853'];
const CHAR_BAGS = ['#3fa34d', '#2f8cff', '#e5463b', '#f2c230', '#6b327c', '#1b1b1b'];
const CHAR_DECALS = ['', '', 'stripe', 'star', 'bolt', 'heart', 'num', 'circle', 'skull'];

/** @satisfies {Record<string, any>} */
const Characters = {
    /** @type {any} */
    model: null,
    /** @type {any} */
    knife: null,
    /** @type {Record<string, any>} */
    acc: {},
    /** @type {Record<string, any>} */
    knives: {},
    DANCES: ['wave', 'cheer', 'clap', 'jacks', 'sway', 'bow', 'salute', 'flex', 'pogo', 'airplane', 'chicken', 'robot', 'squat', 'kick', 'headbang', 'laugh', 'floss', 'dab', 'spin', 'moonwalk', 'disco'],
    _tex: new Map(),        // ключ сцены|вид -> DynamicTexture (лица, надписи на футболках)
    ACCESSORIES: ['hair_spiky', 'hair_bob', 'hair_long', 'cap', 'tophat', 'headphones', 'beanie', 'headdress', 'crown'],

    // Модели — один раз на страницу (кэш Model3D). Нет файла — запасная сборка из коробок.
    async preload() {
        const artReady = ArtAssets.preload();
        const load = (url) => Model3D.load(url).catch((e) => { console.warn('Characters: нет модели ' + url + ' — ' + ((e && e.message) || e)); return null; });
        const urls = {
            hair_spiky: 'assets/models/acc_hair_spiky.glb', hair_bob: 'assets/models/acc_hair_bob.glb',
            hair_long: 'assets/models/acc_hair_long.glb', cap: 'assets/models/acc_cap.glb',
            tophat: 'assets/models/acc_tophat.glb', headphones: 'assets/models/acc_headphones.glb',
            beanie: 'assets/models/acc_beanie.glb', headdress: 'assets/models/acc_headdress.glb',
            crown: 'assets/models/acc_crown.glb', party: 'assets/models/acc_party.glb',
            chef: 'assets/models/acc_chef.glb', cat_ears: 'assets/models/acc_cat_ears.glb',
            bunny: 'assets/models/acc_bunny.glb', propeller: 'assets/models/acc_propeller.glb',
            cowboy: 'assets/models/acc_cowboy.glb', pirate: 'assets/models/acc_pirate.glb',
            viking: 'assets/models/acc_viking.glb', wizard: 'assets/models/acc_wizard.glb',
            horns: 'assets/models/acc_horns.glb', halo: 'assets/models/acc_halo.glb',
            knight: 'assets/models/acc_knight.glb', astro: 'assets/models/acc_astro.glb',
            ninja: 'assets/models/acc_ninja.glb', pumpkin: 'assets/models/acc_pumpkin.glb',
            myth_shark: 'assets/models/acc_myth_shark.glb', myth_croc: 'assets/models/acc_myth_croc.glb',
            myth_log: 'assets/models/acc_myth_log.glb', myth_coffee: 'assets/models/acc_myth_coffee.glb',
            myth_banana: 'assets/models/acc_myth_banana.glb', myth_melon: 'assets/models/acc_myth_melon.glb',
            backpack: 'assets/models/acc_backpack.glb',
        };
        const knives = {
            knife: 'assets/models/knife.glb', cleaver: 'assets/models/knife_cleaver.glb', dagger: 'assets/models/knife_dagger.glb',
            katana: 'assets/models/knife_katana.glb', candy: 'assets/models/knife_candy.glb', fish: 'assets/models/knife_fish.glb',
            ice: 'assets/models/knife_ice.glb',
        };
        this.model = await load(RV_TOON ? 'assets/models/char_toon.glb' : 'assets/models/char_r6.glb');
        await Promise.all(Object.keys(urls).map(async (k) => { this.acc[k] = await load(urls[k]); })
            .concat(Object.keys(knives).map(async (k) => { this.knives[k] = await load(knives[k]); })));
        this.knife = this.knives.knife || null;
        await artReady;
    },

    // Рисунки для магазина и игры (холст 256×256).
    drawFace(ctx, name) { this._drawFace(ctx, name); },
    drawDecal(ctx, name, color) { this._drawDecal(ctx, name, color || '#ffffff'); },
    drawSprite(ctx, tex, c1, c2) {
        const multicolor = tex === 'coin' || tex === 'leaf';
        if (ArtAssets.draw(ctx, ART_TRAILS[tex], multicolor ? null : c1, 256, 256, multicolor ? null : c2 || c1)) return true;
        return CharArt.sprite(ctx, tex, c1, c2 || c1);
    },

    // Текстура спрайта следа, общая на сцену.
    spriteTexture(scene, tex, c1, c2) {
        const key = scene.uid + '|sprite|' + tex + '|' + c1 + '|' + c2;
        let t = this._tex.get(key);
        if (t) return t;
        t = new BABYLON.DynamicTexture('rv-sprite-' + tex, { width: 128, height: 128 }, scene, true);
        t.hasAlpha = true;
        const ctx = /** @type {CanvasRenderingContext2D} */ (/** @type {any} */ (t.getContext()));
        ctx.clearRect(0, 0, 128, 128);
        ctx.save(); ctx.scale(0.5, 0.5); this.drawSprite(ctx, tex, c1, c2 || c1); ctx.restore();
        t.update(true);
        this._tex.set(key, t);
        scene.onDisposeObservable.addOnce(() => this._tex.delete(key));
        return t;
    },

    // Случайная внешность бота. noob — «классик» игры: оранжевая майка, фиолетовые штаны.
    // Playables (RV_TOON): лысых нет — без шапки всегда причёска; кроссовки, иногда рюкзак.
    randomLook(rand, noob) {
        const pick = (a) => a[Math.floor(rand() * a.length)];
        if (!RV_TOON) {
            if (noob) return { skin: '#f5cd30', shirt: '#ff8a1f', pants: '#6a4cd6', hair: '', hairColor: '', acc: '', face: 'smile', decal: '' };
            const hairs = ['hair_spiky', 'hair_bob', 'hair_long', 'hair_spiky', 'hair_bob', ''];
            const hats = ['cap', 'tophat', 'headphones', 'beanie', 'headdress', 'crown', '', '', ''];
            const hat = pick(hats);
            const hair = (hat === 'tophat' || hat === 'beanie' || hat === 'cap' || hat === 'headdress') && rand() < 0.5 ? '' : pick(hairs);
            return {
                skin: pick(CHAR_SKIN), shirt: pick(CHAR_SHIRT), pants: pick(CHAR_PANTS),
                hair, hairColor: pick(CHAR_HAIR), acc: hat, face: pick(CHAR_FACES), decal: pick(CHAR_DECALS),
                decalColor: pick(['#ffffff', '#ffd23a', '#161a22', '#ff3b3b', '#34e27a']),
            };
        }
        if (noob) return { skin: '#f2c29b', shirt: '#ff8a1f', pants: '#6a4cd6', hair: 'hair_spiky', hairColor: '#3b2416', acc: '', face: 'buddy', decal: '', shoes: '#f5f5f5', sole: '#3a3f4a' };
        const hairs = ['hair_spiky', 'hair_bob', 'hair_long', 'hair_spiky', 'hair_bob'];
        const hats = ['cap', 'tophat', 'headphones', 'beanie', 'headdress', 'crown', '', '', ''];
        const hat = pick(hats);
        const hair = (hat === 'tophat' || hat === 'beanie' || hat === 'cap' || hat === 'headdress') && rand() < 0.5 ? '' : pick(hairs);
        const bag = rand() < 0.3;
        return {
            skin: pick(CHAR_SKIN), shirt: pick(CHAR_SHIRT), pants: pick(CHAR_PANTS), sleeves: rand() < 0.5,
            hair, hairColor: pick(CHAR_HAIR), acc: hat, face: pick(CHAR_FACES), decal: pick(CHAR_DECALS),
            decalColor: pick(['#ffffff', '#ffd23a', '#161a22', '#ff3b3b', '#34e27a']),
            shoes: pick(CHAR_SHOES), sole: rand() < 0.5 ? '#3a3f4a' : '#f5f5f5',
            back: bag ? 'backpack' : '', backColor: pick(CHAR_BAGS),
        };
    },

    // Текстура лица / надписи (DynamicTexture с прозрачностью), общая на сцену.
    texture(scene, kind, name, color) {
        const key = scene.uid + '|' + kind + '|' + name + '|' + (color || '');
        let t = this._tex.get(key);
        if (t) return t;
        t = new BABYLON.DynamicTexture('rv-' + kind + '-' + name, { width: 256, height: 256 }, scene, true);
        t.hasAlpha = true;
        const ctx = /** @type {CanvasRenderingContext2D} */ (/** @type {any} */ (t.getContext()));
        ctx.clearRect(0, 0, 256, 256);
        if (kind === 'face') this._drawFace(ctx, name);
        else this._drawDecal(ctx, name, color || '#ffffff');
        t.update(true);
        t.wrapU = t.wrapV = BABYLON.Texture.CLAMP_ADDRESSMODE;
        this._tex.set(key, t);
        scene.onDisposeObservable.addOnce(() => this._tex.delete(key));
        return t;
    },

    // Лица — свои простые мультяшные рисунки: глаза-овалы, рот дугой.
    _drawFace(ctx, name) {
        if (ArtAssets.draw(ctx, ART_FACES[name])) return;
        const ink = '#161616';
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        const eye = (x, y, w, h) => { ctx.beginPath(); ctx.ellipse(x, y, w, h, 0, 0, Math.PI * 2); ctx.fillStyle = ink; ctx.fill(); };
        const shine = (x, y) => { ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.fillStyle = '#ffffff'; ctx.fill(); };
        const mouth = (y0, depth, w, lw) => {
            ctx.beginPath(); ctx.moveTo(128 - w, y0); ctx.quadraticCurveTo(128, y0 + depth, 128 + w, y0);
            ctx.strokeStyle = ink; ctx.lineWidth = lw; ctx.stroke();
        };
        const brows = (tilt) => {
            ctx.strokeStyle = ink; ctx.lineWidth = 12;
            ctx.beginPath(); ctx.moveTo(70, 70 - tilt); ctx.lineTo(112, 70 + tilt); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(186, 70 - tilt); ctx.lineTo(144, 70 + tilt); ctx.stroke();
        };
        switch (name) {
            case 'grin':
                eye(94, 104, 13, 22); eye(162, 104, 13, 22); shine(98, 94); shine(166, 94);
                ctx.beginPath(); ctx.moveTo(78, 150); ctx.quadraticCurveTo(128, 222, 178, 150); ctx.closePath();
                ctx.fillStyle = ink; ctx.fill();
                ctx.beginPath(); ctx.moveTo(90, 156); ctx.lineTo(166, 156); ctx.lineTo(160, 170); ctx.lineTo(96, 170); ctx.closePath();
                ctx.fillStyle = '#ffffff'; ctx.fill();
                break;
            case 'cool':
                ctx.fillStyle = ink;
                ctx.beginPath(); ctx.roundRect(58, 82, 64, 40, 12); ctx.fill();
                ctx.beginPath(); ctx.roundRect(134, 82, 64, 40, 12); ctx.fill();
                ctx.fillRect(116, 90, 24, 8);
                ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.fillRect(68, 90, 18, 6); ctx.fillRect(144, 90, 18, 6);
                mouth(168, 18, 34, 10);
                break;
            case 'wink':
                eye(94, 104, 13, 22); shine(98, 94);
                ctx.strokeStyle = ink; ctx.lineWidth = 11;
                ctx.beginPath(); ctx.moveTo(146, 106); ctx.quadraticCurveTo(162, 92, 178, 106); ctx.stroke();
                mouth(158, 34, 40, 11);
                break;
            case 'happy':
                ctx.strokeStyle = ink; ctx.lineWidth = 12;
                ctx.beginPath(); ctx.moveTo(76, 112); ctx.quadraticCurveTo(94, 88, 112, 112); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(144, 112); ctx.quadraticCurveTo(162, 88, 180, 112); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(84, 150); ctx.quadraticCurveTo(128, 214, 172, 150); ctx.closePath();
                ctx.fillStyle = ink; ctx.fill();
                ctx.beginPath(); ctx.ellipse(128, 180, 22, 12, 0, 0, Math.PI * 2); ctx.fillStyle = '#e25563'; ctx.fill();
                ctx.fillStyle = 'rgba(255,120,140,.45)';
                ctx.beginPath(); ctx.ellipse(62, 146, 16, 10, 0, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.ellipse(194, 146, 16, 10, 0, 0, Math.PI * 2); ctx.fill();
                break;
            case 'smirk':
                eye(94, 106, 12, 19); eye(162, 106, 12, 19); shine(97, 97); shine(165, 97);
                ctx.strokeStyle = ink; ctx.lineWidth = 11;
                ctx.beginPath(); ctx.moveTo(96, 168); ctx.quadraticCurveTo(140, 180, 170, 150); ctx.stroke();
                break;
            case 'angry':
                brows(10);
                eye(96, 110, 13, 17); eye(160, 110, 13, 17);
                ctx.fillStyle = '#ff3b3b'; ctx.beginPath(); ctx.arc(99, 106, 5, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.arc(163, 106, 5, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.moveTo(84, 176); ctx.quadraticCurveTo(128, 140, 172, 176); ctx.closePath();
                ctx.fillStyle = ink; ctx.fill();
                ctx.fillStyle = '#ffffff';
                ctx.beginPath(); ctx.moveTo(96, 170); ctx.lineTo(104, 160); ctx.lineTo(112, 168); ctx.fill();
                ctx.beginPath(); ctx.moveTo(160, 170); ctx.lineTo(152, 160); ctx.lineTo(144, 168); ctx.fill();
                break;
            case 'scared':
                ctx.strokeStyle = ink; ctx.lineWidth = 9;
                ctx.beginPath(); ctx.moveTo(74, 66); ctx.lineTo(112, 56); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(182, 66); ctx.lineTo(144, 56); ctx.stroke();
                ctx.beginPath(); ctx.arc(94, 104, 20, 0, Math.PI * 2); ctx.fillStyle = '#ffffff'; ctx.fill(); ctx.lineWidth = 7; ctx.stroke();
                ctx.beginPath(); ctx.arc(162, 104, 20, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
                eye(94, 106, 8, 8); eye(162, 106, 8, 8);
                ctx.beginPath(); ctx.ellipse(128, 178, 20, 26, 0, 0, Math.PI * 2); ctx.fillStyle = ink; ctx.fill();
                break;
            case 'dizzy':
                ctx.strokeStyle = ink; ctx.lineWidth = 11;
                for (const cx of [94, 162]) {
                    ctx.beginPath(); ctx.moveTo(cx - 16, 88); ctx.lineTo(cx + 16, 120); ctx.stroke();
                    ctx.beginPath(); ctx.moveTo(cx + 16, 88); ctx.lineTo(cx - 16, 120); ctx.stroke();
                }
                ctx.beginPath(); ctx.moveTo(86, 170); ctx.quadraticCurveTo(107, 150, 128, 170); ctx.quadraticCurveTo(149, 190, 170, 170); ctx.stroke();
                break;
            default: // smile
                if (CharArt.face(ctx, name)) break;
                eye(94, 104, 12, 20); eye(162, 104, 12, 20); shine(97, 95); shine(165, 95);
                mouth(156, 38, 44, 11);
        }
    },

    // Надписи на футболке: простые значки, рисуются цветом поверх ткани.
    _drawDecal(ctx, name, color) {
        const multicolor = ['rainbow', 'flower', 'super', 'astro'].includes(name);
        if (ArtAssets.draw(ctx, ART_DECALS[name], multicolor ? null : color)) return;
        ctx.fillStyle = color;
        ctx.strokeStyle = color;
        ctx.lineJoin = 'round';
        const star = (cx, cy, r) => {
            ctx.beginPath();
            for (let i = 0; i < 10; i++) {
                const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r;
                ctx.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
            }
            ctx.closePath(); ctx.fill();
        };
        switch (name) {
            case 'stripe':
                ctx.fillRect(0, 96, 256, 34); ctx.globalAlpha = 0.6; ctx.fillRect(0, 146, 256, 16); ctx.globalAlpha = 1;
                break;
            case 'star': star(128, 124, 82); break;
            case 'bolt':
                ctx.beginPath(); ctx.moveTo(146, 20); ctx.lineTo(70, 140); ctx.lineTo(122, 140); ctx.lineTo(104, 236);
                ctx.lineTo(188, 104); ctx.lineTo(134, 104); ctx.closePath(); ctx.fill();
                break;
            case 'heart':
                ctx.beginPath(); ctx.moveTo(128, 214);
                ctx.bezierCurveTo(30, 150, 40, 50, 128, 92); ctx.bezierCurveTo(216, 50, 226, 150, 128, 214); ctx.fill();
                break;
            case 'num':
                ctx.font = '900 150px RushFont, Montserrat, Arial Black, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                ctx.fillText(String(1 + Math.floor(Math.random() * 99)), 128, 134);
                break;
            case 'circle':
                ctx.lineWidth = 26; ctx.beginPath(); ctx.arc(128, 128, 72, 0, Math.PI * 2); ctx.stroke();
                ctx.beginPath(); ctx.arc(128, 128, 26, 0, Math.PI * 2); ctx.fill();
                break;
            case 'skull':
                ctx.beginPath(); ctx.arc(128, 112, 66, 0, Math.PI * 2); ctx.fill(); ctx.fillRect(92, 150, 72, 50);
                ctx.globalCompositeOperation = 'destination-out';
                ctx.beginPath(); ctx.arc(102, 112, 20, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.arc(154, 112, 20, 0, Math.PI * 2); ctx.fill();
                ctx.fillRect(108, 170, 10, 30); ctx.fillRect(138, 170, 10, 30);
                ctx.globalCompositeOperation = 'source-over';
                break;
            default:
                CharArt.decal(ctx, name, color);
        }
    },

    // Запасная модель из коробок — та же раскладка частей, что у char_r6.glb (px).
    _fallbackParts() {
        return [
            { name: 'Torso', size: [36, 72, 72], center: [0, 108, 0], pivot: [0, 72, 0] },
            { name: 'Head', size: [43, 42, 43], center: [0, 167, 0], pivot: [0, 144, 0], cyl: true },
            { name: 'Face', size: [1, 34, 30], center: [22.2, 167, 0], pivot: [0, 144, 0], plane: true },
            { name: 'ShirtDecal', size: [1, 56, 56], center: [18.4, 110, 0], pivot: [0, 72, 0], plane: true },
            { name: 'LeftArm', size: [36, 72, 36], center: [0, 108, -55], pivot: [0, 134, -55] },
            { name: 'RightArm', size: [36, 72, 36], center: [0, 108, 55], pivot: [0, 134, 55] },
            { name: 'LeftLeg', size: [36, 72, 35.7], center: [0, 36, -18.15], pivot: [0, 72, -18] },
            { name: 'RightLeg', size: [36, 72, 35.7], center: [0, 36, 18.15], pivot: [0, 72, 18] },
        ];
    },

    _buildFallback(scene, name) {
        const root = new BABYLON.Mesh(name, scene);
        for (const p of this._fallbackParts()) {
            let m;
            if (p.plane) {
                m = BABYLON.MeshBuilder.CreatePlane(name + '/' + p.name, { width: p.size[2], height: p.size[1], sideOrientation: BABYLON.Mesh.DOUBLESIDE }, scene);
                m.rotation.y = -Math.PI / 2;
                m.bakeCurrentTransformIntoVertices();
            } else if (p.cyl) {
                m = BABYLON.MeshBuilder.CreateCylinder(name + '/' + p.name, { height: p.size[1], diameter: p.size[0], tessellation: 20 }, scene);
            } else {
                m = BABYLON.MeshBuilder.CreateBox(name + '/' + p.name, { width: p.size[0], height: p.size[1], depth: p.size[2] }, scene);
            }
            m.position.set(p.center[0], p.center[1], p.center[2]);
            m.bakeCurrentTransformIntoVertices();
            m.metadata = { part: p.name, pivot: p.pivot, axes: null };
            m.material = new BABYLON.StandardMaterial(name + '/' + p.name, scene);
            m.parent = root;
        }
        return root;
    },
};

// Один персонаж на сцене. Позиция и курс задаются игрой (place), поза — animate(dt, s).
class CharacterRig {
    /** @param {any} view @param {any} look */
    constructor(view, look, id) {
        const scene = view.scene;
        this.view = view;
        this.scene = scene;
        this.look = look;
        this.id = id;
        this.root = new BABYLON.TransformNode('rig-' + id, scene);
        this.body = new BABYLON.TransformNode('rig-body-' + id, scene);
        this.body.parent = this.root;
        const name = 'char-' + id;
        this.model = Characters.model ? Model3D.build(Characters.model, scene, { name }) : Characters._buildFallback(scene, name);
        this.model.parent = this.body;
        /** @type {Record<string, any>} */
        this.parts = {};
        for (const m of this.model.getChildMeshes(false)) {
            const part = m.metadata && m.metadata.part;
            if (!part) continue;
            this.parts[part] = m;
            const pv = m.metadata.pivot || [0, 0, 0];
            m.setPivotPoint(new BABYLON.Vector3(pv[0], pv[1], pv[2]));
        }
        const P = this.parts;
        if (P.Face && P.Head) P.Face.parent = P.Head;
        if (P.ShirtDecal && P.Torso) P.ShirtDecal.parent = P.Torso;
        this._paint();
        World3D.addObject(view, this.model, 'actor');
        for (const k of ['Face', 'ShirtDecal']) if (P[k] && P[k].edgesRenderer) P[k].disableEdgesRendering();
        // Аксессуар на голове: вершины в пространстве персонажа — дочерний к голове без сдвига.
        this.accRoot = null;
        const accModel = look.acc && Characters.acc[look.acc];
        const hairModel = look.hair && Characters.acc[look.hair];
        this.propeller = null;
        for (const [m, tint] of [[hairModel, look.hairColor], [accModel, look.accTint || '']]) {
            if (!m || !P.Head) continue;
            const r = Model3D.build(m, scene, { name: name + '-acc' });
            r.parent = P.Head;
            for (const c of r.getChildMeshes(false)) {
                const cm = /** @type {any} */ (c.material);
                if (!cm) continue;
                for (const sm of cm.subMaterials || [cm]) {
                    if (!sm) continue;
                    if (tint && /\/(hair|cap|beanie|tint|cups)$/i.test(sm.name)) sm.diffuseColor = BABYLON.Color3.FromHexString(tint);
                    if (/\/glow$/i.test(sm.name)) sm.emissiveColor = sm.diffuseColor.scale(0.85);
                }
                if (c.metadata && c.metadata.part === 'Propeller') {
                    const pv = c.metadata.pivot || [0, 0, 0];
                    c.setPivotPoint(new BABYLON.Vector3(pv[0], pv[1], pv[2]));
                    this.propeller = c;
                }
            }
            World3D.addObject(view, r, 'actor');
        }
        // Рюкзак на спине: вершины в пространстве персонажа — дочерний к торсу без сдвига.
        const backModel = look.back && Characters.acc[look.back];
        if (backModel && P.Torso) {
            const r = Model3D.build(backModel, scene, { name: name + '-back' });
            r.parent = P.Torso;
            for (const c of r.getChildMeshes(false)) {
                const cm = /** @type {any} */ (c.material);
                for (const sm of (cm && (cm.subMaterials || [cm])) || []) {
                    if (sm && look.backColor && /\/bag$/i.test(sm.name)) sm.diffuseColor = BABYLON.Color3.FromHexString(look.backColor);
                }
            }
            World3D.addObject(view, r, 'actor');
        }
        // Мифический скин: голова — модель аксессуара, голова R6 и лицо скрыты (дети головы видны).
        if (look.hideHead && accModel) for (const k of ['Head', 'Face']) if (P[k]) P[k].isVisible = false;
        // Нож — в правой руке (кисть у нижнего края руки), спрятан, пока персонаж не ловец.
        this.knife = null;
        if (P.RightArm) {
            const kd = look.knife || null;
            const km = (kd && Characters.knives[kd.model]) || Characters.knife;
            const kn = km ? Model3D.build(km, scene, { name: name + '-knife' }) : this._fallbackKnife(name);
            if (kd) {
                for (const c of kn.getChildMeshes(false)) {
                    const cm = /** @type {any} */ (c.material);
                    for (const sm of (cm && (cm.subMaterials || [cm])) || []) {
                        if (!sm) continue;
                        const isBlade = /\/blade$/i.test(sm.name), isHandle = /\/handle$/i.test(sm.name);
                        if (isBlade && kd.blade) sm.diffuseColor = BABYLON.Color3.FromHexString(kd.blade);
                        if (isHandle && kd.handle) sm.diffuseColor = BABYLON.Color3.FromHexString(kd.handle);
                        if (isBlade && kd.glow) sm.emissiveColor = sm.diffuseColor.scale(Math.min(1, kd.glow) * 0.7);
                        if (kd.metal) { sm.specularColor = new BABYLON.Color3(0.9, 0.9, 0.9); sm.specularPower = 48; }
                    }
                }
            }
            kn.parent = P.RightArm;
            kn.position.set(2, 69, 60);          // хват под кулаком: рукоять видна снизу, клинок вперёд и наружу
            kn.rotation.set(0, -0.6, -0.28);
            World3D.addObject(view, kn, 'actor');
            kn.setEnabled(false);
            this.knife = kn;
        }
        // Состояние анимации.
        this.phase = Math.random() * 6;
        this.pose = { armLz: 0, armLx: 0, armRz: 0, armRx: 0, legLz: 0, legRz: 0, legLx: 0, legRx: 0, headY: 0, headZ: 0, lean: 0, bank: 0, twist: 0, lift: 0 };
        this.down = 0;          // 0 — стоит, 1 — лежит (плавно)
        this.flashT = 0;
        this.squash = 0;
        this.faceName = '';
        this.visibility = 1;
        this.dance = look.dance || Characters.DANCES[Math.floor(Math.random() * 4)];
        this.setFace(look.face || (RV_TOON ? 'hero' : 'smile'));
    }

    _fallbackKnife(name) {
        const scene = this.scene;
        const root = new BABYLON.Mesh(name + '-knife', scene);
        const handle = BABYLON.MeshBuilder.CreateBox(name + '-knife/Handle', { width: 15, height: 7, depth: 7 }, scene);
        const hm = new BABYLON.StandardMaterial(name + '-knife/h', scene);
        hm.diffuseColor = BABYLON.Color3.FromHexString('#2a2a35');
        handle.material = hm;
        handle.parent = root;
        const blade = BABYLON.MeshBuilder.CreateBox(name + '-knife/Blade', { width: 42, height: 7, depth: 1.5 }, scene);
        blade.position.x = 28;
        const bm = new BABYLON.StandardMaterial(name + '-knife/b', scene);
        bm.diffuseColor = BABYLON.Color3.FromHexString('#8fd0ff');
        blade.material = bm;
        blade.parent = root;
        return root;
    }

    _mat(part) { const m = this.parts[part]; return m && m.material; }

    _paint() {
        const L = this.look, C = (hex) => BABYLON.Color3.FromHexString(hex);
        const arms = L.sleeves ? L.shirt : L.skin;
        const byPart = { Head: L.skin, Torso: L.shirt, LeftArm: arms, RightArm: arms, LeftLeg: L.pants, RightLeg: L.pants };
        // Цвет по роли материала: кисти — кожа, кроссовки и подошва — свои, остальное — по части.
        const color = (part, matName) => {
            if (/\/skin$/i.test(matName)) return L.skin;
            if (/\/shoe$/i.test(matName)) return L.shoes || (L.metal ? L.pants : '#f5f5f5');
            if (/\/sole$/i.test(matName)) return L.sole || (L.metal ? L.pants : '#3a3f4a');
            return byPart[part];
        };
        for (const part of Object.keys(byPart)) {
            const mat = /** @type {any} */ (this._mat(part));
            for (const sm of (mat && (mat.subMaterials || [mat])) || []) {
                if (!sm) continue;
                sm.diffuseColor = C(color(part, sm.name));
                if (L.metal) { sm.specularColor = new BABYLON.Color3(0.85, 0.85, 0.85); sm.specularPower = 36; }
                else sm.specularColor = new BABYLON.Color3(0, 0, 0);
            }
        }
        const decal = this.parts.ShirtDecal;
        if (decal) {
            if (L.decal) {
                const mat = new BABYLON.StandardMaterial('decal-' + this.id, this.scene);
                mat.diffuseTexture = Characters.texture(this.scene, 'decal', L.decal, L.decalColor);
                mat.useAlphaFromDiffuseTexture = true;
                if (L.glow) { mat.emissiveTexture = mat.diffuseTexture; mat.emissiveColor = new BABYLON.Color3(0, 0, 0); }
                mat.specularColor = new BABYLON.Color3(0, 0, 0);
                mat.zOffset = -2;
                const old = decal.material; decal.material = mat; if (old) old.dispose();
            } else decal.setEnabled(false);
        }
        const face = this.parts.Face;
        if (face) {
            const mat = new BABYLON.StandardMaterial('face-' + this.id, this.scene);
            mat.useAlphaFromDiffuseTexture = true;
            mat.specularColor = new BABYLON.Color3(0, 0, 0);
            mat.zOffset = -2;
            const old = face.material; face.material = mat; if (old) old.dispose();
        }
    }

    setFace(name) {
        if (this.faceName === name) return;
        this.faceName = name;
        const face = this.parts.Face;
        if (face && face.material) face.material.diffuseTexture = Characters.texture(this.scene, 'face', name);
    }

    setKnife(on) { if (this.knife) this.knife.setEnabled(!!on); }

    // Мигание белым при попадании / красным при обращении в ловца.
    flash(hex, t) {
        this.flashT = t || 0.25;
        this._flashColor = BABYLON.Color3.FromHexString(hex || '#ffffff');
    }

    setVisibility(v) {
        if (Math.abs(v - this.visibility) < 0.01) return;
        this.visibility = v;
        for (const m of this.root.getChildMeshes(false)) m.visibility = v;
    }

    place(x, y, h, heading) {
        this.root.position.set(x, h, y);
        this.root.rotation.y = -heading;
    }

    // s: { speed01, mode: 'idle'|'run'|'downed'|'celebrate'|'dance'|'revive'|'stun',
    //      dashT 0..1 (1 — только начался), dashSide −1|1, brakeT, attackT (−1 — нет, 0..1 — ход удара),
    //      knife, sprint }
    animate(dt, s) {
        const P = this.parts, p = this.pose;
        const k = Math.min(1, Math.max(0, s.speed01 || 0));
        // Шаг цикла бега — от пройденного пути: ноги не скользят по земле.
        this.phase += dt * (2.2 + 9.5 * k);
        const sw = Math.sin(this.phase), cw = Math.cos(this.phase);
        const t = performance.now() / 1000;
        const target = { armLz: 0, armLx: 0.04, armRz: 0, armRx: -0.04, legLz: 0, legRz: 0, legLx: 0, legRx: 0, headY: 0, headZ: 0, lean: 0, bank: 0, twist: 0, lift: 0 };
        const mode = s.mode || 'idle';
        let downTarget = 0;
        if (mode === 'downed') {
            downTarget = 1;
            target.armLx = 1.25 + Math.sin(t * 3) * 0.05; target.armRx = -1.25; target.armLz = 0.3; target.armRz = 0.3;
            target.legLx = 0.22; target.legRx = -0.22;
            target.headY = Math.sin(t * 2.5) * 0.35;
        } else if (mode === 'celebrate') {
            const j = Math.abs(Math.sin(t * 7));
            target.lift = j * 26;
            target.armLz = 2.75 + Math.sin(t * 14) * 0.25; target.armRz = 2.75 - Math.sin(t * 14) * 0.25;
            target.armLx = 0.35; target.armRx = -0.35;
            target.legLz = 0.15 * j; target.legRz = -0.15 * j;
            target.headZ = 0.15;
        } else if (mode === 'dance') {
            this._dance(target, t);
        } else if (mode === 'revive') {
            target.lean = -0.38; target.armLz = 1.35 + Math.sin(t * 9) * 0.12; target.armRz = 1.35 - Math.sin(t * 9) * 0.12;
            target.legLz = 0.35; target.legRz = -0.25; target.lift = -8; target.headZ = -0.25;
        } else if (mode === 'stun') {
            target.bank = Math.sin(t * 16) * 0.22; target.armLx = 0.9; target.armRx = -0.9; target.headY = Math.sin(t * 11) * 0.5;
        } else {
            // Бег: руки и ноги противофазой, корпус вперёд, подпрыгивание на каждом шаге.
            const amp = 0.95 * k;
            target.legLz = sw * amp; target.legRz = -sw * amp;
            target.armLz = -sw * amp * 0.95; target.armRz = sw * amp * 0.95;
            target.armLx = 0.06 + 0.1 * k; target.armRx = -0.06 - 0.1 * k;
            target.lean = -0.2 * k - (s.sprint ? 0.12 : 0);
            target.lift = Math.abs(cw) * 9 * k;
            target.twist = sw * 0.12 * k;
            target.headZ = 0.12 * k;
            // Дыхание на месте.
            const idle = 1 - k;
            target.armLz += Math.sin(t * 1.7) * 0.04 * idle; target.armRz += Math.sin(t * 1.7 + 0.4) * 0.04 * idle;
            target.headY += Math.sin(t * 0.6 + this.id) * 0.25 * idle;
            target.lift += Math.sin(t * 2.2) * 1.2 * idle;
        }
        if (s.knife && mode !== 'downed' && mode !== 'celebrate') {
            // Ловец держит нож перед собой.
            target.armRz = target.armRz * 0.35 + 0.55; target.armRx = -0.12;
        }
        if (mode !== 'downed' && s.dashT > 0) {
            // Рывок вбок: крен в сторону рывка, руки назад, ноги врозь.
            const d = Math.sin(Math.min(1, s.dashT) * Math.PI);
            target.bank += 0.42 * d * (s.dashSide || 1);
            target.armLz -= 0.9 * d; target.armRz -= 0.9 * d; target.armLx += 0.5 * d; target.armRx -= 0.5 * d;
            target.legLx += 0.3 * d; target.legRx -= 0.3 * d;
            target.lean -= 0.15 * d;
        }
        if (mode !== 'downed' && s.brakeT > 0) {
            const d = Math.sin(Math.min(1, s.brakeT) * Math.PI);
            target.lean += 0.42 * d; target.legLz += 0.55 * d; target.legRz += 0.35 * d; target.armLz += 0.6 * d; target.armRz += 0.6 * d;
        }
        let snap = false;
        if (mode !== 'downed' && s.attackT >= 0) {
            // Удар: замах вверх-назад, рубящий взмах вперёд-поперёк, возврат.
            const a = s.attackT;
            snap = true;
            if (a < 0.28) {
                const u = a / 0.28;
                target.armRz = 0.55 + 2.15 * u; target.armRx = -0.15 - 0.55 * u; target.twist = 0.38 * u; target.lean = 0.06 * u;
            } else if (a < 0.55) {
                const u = (a - 0.28) / 0.27;
                const e = 1 - Math.pow(1 - u, 3);
                target.armRz = 2.7 - 1.75 * e; target.armRx = -0.7 + 1.25 * e; target.twist = 0.38 - 0.85 * e; target.lean = -0.18 * e;
                target.armLz = -0.45 * e;
            } else {
                const u = (a - 0.55) / 0.45;
                target.armRz = 0.95 - 0.4 * u; target.armRx = 0.55 - 0.67 * u; target.twist = -0.47 * (1 - u); target.lean = -0.18 * (1 - u);
            }
        }
        // Сглаживание позы; удар — почти без сглаживания (иначе смазывается взмах).
        const r = 1 - Math.pow(0.0008, dt), rs = snap ? 1 - Math.pow(0.000001, dt) : r;
        for (const key in target) {
            const rate = snap && (key === 'armRz' || key === 'armRx' || key === 'twist') ? rs : r;
            p[key] += (target[key] - p[key]) * rate;
        }
        // Падение и подъём: быстрое падение с отскоком, подъём медленнее.
        const dr = downTarget > this.down ? 1 - Math.pow(0.0005, dt) : 1 - Math.pow(0.03, dt);
        this.down += (downTarget - this.down) * dr;
        const fall = this.down;

        if (P.LeftArm) { P.LeftArm.rotation.z = p.armLz; P.LeftArm.rotation.x = p.armLx; }
        if (P.RightArm) { P.RightArm.rotation.z = p.armRz; P.RightArm.rotation.x = p.armRx; }
        if (P.LeftLeg) { P.LeftLeg.rotation.z = p.legLz; P.LeftLeg.rotation.x = p.legLx; }
        if (P.RightLeg) { P.RightLeg.rotation.z = p.legRz; P.RightLeg.rotation.x = p.legRx; }
        if (P.Head) { P.Head.rotation.y = p.headY; P.Head.rotation.z = p.headZ; }
        if (this.propeller) this.propeller.rotation.y += dt * (6 + 14 * k);
        // Тело: наклон, крен, поворот плеч, подъём; лёжа — на спине вокруг пяток.
        this.body.rotation.z = p.lean * (1 - fall) + fall * 1.5;
        this.body.rotation.x = p.bank * (1 - fall);
        this.body.rotation.y = p.twist * (1 - fall);
        this.body.position.y = p.lift * (1 - fall) + fall * 19;
        this.body.position.x = fall * 6;
        // Сжатие-растяжение (приземление, рывок).
        this.squash *= Math.pow(0.002, dt);
        const sq = this.squash;
        this.body.scaling.set(1 + sq * 0.12, 1 - sq * 0.18, 1 + sq * 0.12);
        // Вспышка попадания.
        if (this.flashT > 0) {
            this.flashT = Math.max(0, this.flashT - dt);
            const f = Math.min(1, this.flashT / 0.12);
            this._setEmissive(this._flashColor.scale(f * 0.85));
            if (this.flashT === 0) this._setEmissive(null);
        }
    }

    // Эмоции (магазин, финиш, победа, меню): позы частей во времени t.
    _dance(T, t) {
        const S = Math.sin, ab = Math.abs;
        switch (this.dance) {
            case 'cheer': { const j = ab(S(t * 7)); T.lift = j * 26; T.armLz = 2.8 + S(t * 14) * 0.2; T.armRz = 2.8 - S(t * 14) * 0.2; T.armLx = 0.35; T.armRx = -0.35; T.headZ = 0.15; break; }
            case 'clap': { const c = ab(S(t * 9)); T.armLz = 1.35; T.armRz = 1.35; T.armLx = -0.15 + 0.5 * c; T.armRx = 0.15 - 0.5 * c; T.lift = ab(S(t * 4.5)) * 5; T.headZ = 0.1; break; }
            case 'jacks': { const j = ab(S(t * 5)); T.lift = j * 22; T.armLx = 0.2 + 2.4 * j; T.armRx = -0.2 - 2.4 * j; T.legLx = 0.35 * j; T.legRx = -0.35 * j; break; }
            case 'sway': { const w = S(t * 4.2); T.bank = w * 0.18; T.twist = w * 0.3; T.armLz = 0.6 + w * 0.6; T.armRz = 0.6 - w * 0.6; T.headZ = 0.1 + ab(w) * 0.1; break; }
            case 'bow': { const b = Math.max(0, S(t * 1.6)); T.lean = -1.0 * b; T.armRz = 1.1 * b; T.armRx = 0.4 * b; T.armLz = -0.3 * b; T.headZ = -0.3 * b; break; }
            case 'salute': { T.armRz = 2.45; T.armRx = 0.95; T.headZ = 0.12 + S(t * 2) * 0.03; T.lift = 2; T.legLx = 0.04; T.legRx = -0.04; break; }
            case 'flex': { const f = 0.5 + 0.5 * S(t * 5); T.armLx = 1.45 + 0.15 * f; T.armRx = -1.45 - 0.15 * f; T.armLz = 0.9 * f; T.armRz = 0.9 * f; T.lean = 0.12; T.lift = 6 * f; T.legLx = 0.2; T.legRx = -0.2; break; }
            case 'pogo': { const j = ab(S(t * 6)); T.lift = j * 46; T.legLz = -0.2 * j; T.legRz = -0.2 * j; T.armLz = -0.3; T.armRz = -0.3; T.headZ = 0.2 * j; break; }
            case 'airplane': { const w = S(t * 2.4); T.armLx = 1.55; T.armRx = -1.55; T.bank = w * 0.35; T.twist = w * 0.4; T.lean = -0.15; T.lift = ab(S(t * 4.8)) * 6; break; }
            case 'chicken': { const f = ab(S(t * 12)); T.armLx = 0.3 + 0.7 * f; T.armRx = -0.3 - 0.7 * f; T.headZ = S(t * 6) * 0.3; T.lean = -0.25; T.legLz = S(t * 6) * 0.35; T.legRz = -S(t * 6) * 0.35; T.lift = -6; break; }
            case 'robot': { const k = Math.floor(t * 4) % 4; const q = [[1.5, 0, 0, 0], [0, 0, 1.5, 0], [1.5, 0, 1.5, 0], [0.75, 0.6, 0.75, -0.6]][k]; T.armLz = q[0]; T.armLx = 0.05 + q[1]; T.armRz = q[2]; T.armRx = -0.05 + q[3]; T.headY = [0.5, -0.5, 0, 0][k]; T.twist = [0.2, -0.2, 0, 0][k]; break; }
            case 'squat': { const d = 0.5 + 0.5 * S(t * 3.2); T.lift = -34 * d; T.legLz = 1.0 * d; T.legRz = 1.0 * d; T.lean = 0.25 * d; T.armLz = 1.5 * d; T.armRz = 1.5 * d; break; }
            case 'kick': { const k = S(t * 5); T.legLz = Math.max(0, k) * 1.5; T.legRz = Math.max(0, -k) * 1.5; T.armLz = 1.2; T.armRz = 1.2; T.armLx = -0.3; T.armRx = 0.3; T.lean = 0.25 * ab(k); T.lift = 8 * ab(k); break; }
            case 'headbang': { const h = S(t * 11); T.headZ = -0.45 * h; T.lean = -0.18 * Math.max(0, h); T.armRz = 2.7; T.armRx = -0.3; T.armLz = 0.6; T.lift = ab(h) * 4; break; }
            case 'laugh': { const l = S(t * 9); T.lean = 0.25 + 0.08 * l; T.headZ = 0.35 + 0.1 * l; T.armLz = 0.7; T.armRz = 0.7; T.armLx = -0.35; T.armRx = 0.35; T.lift = ab(l) * 5; break; }
            case 'floss': { const f = S(t * 7), g = S(t * 14); T.armLx = 0.6 * f; T.armRx = 0.6 * f; T.armLz = 0.45 * g; T.armRz = -0.45 * g; T.bank = -0.18 * f; T.twist = 0.12 * g; T.lift = ab(g) * 3; break; }
            case 'dab': { const d = Math.min(1, Math.max(0, S(t * 2.2) * 2)); T.armRz = 2.4 * d; T.armRx = -1.25 * d; T.armLz = 2.0 * d; T.armLx = -0.85 * d; T.headZ = -0.45 * d; T.headY = -0.5 * d; T.lean = -0.15 * d; break; }
            case 'spin': { T.twist = S(t * 3) * 3; T.armLx = 1.4; T.armRx = -1.4; T.lift = 4 + ab(S(t * 6)) * 8; T.headZ = 0.15; break; }
            case 'moonwalk': { const m = S(t * 5); T.legLz = -0.35 * m; T.legRz = 0.35 * m; T.lean = 0.2; T.armLz = 0.3 * m; T.armRz = -0.3 * m; T.lift = ab(m) * 6; T.headZ = 0.1; break; }
            case 'disco': { const d = S(t * 4); T.armRz = 2.0 + 0.9 * d; T.armRx = -0.9 + 0.6 * d; T.armLz = 0.2; T.armLx = 0.3; T.bank = -0.15 * d; T.twist = 0.25 * d; T.lift = ab(S(t * 8)) * 5; break; }
            case 'sixseven': { const w = S(t * 7.5); T.armLz = 1.15 + 0.5 * w; T.armRz = 1.15 - 0.5 * w; T.armLx = -0.25; T.armRx = 0.25; T.lean = 0.1; T.headY = S(t * 3.75) * 0.25; T.headZ = 0.08; T.lift = ab(w) * 4; T.bank = w * 0.06; break; }   // жест «6-7»: руки по очереди вверх-вниз ладонями вверх
            case 'look': { T.headY = S(t * 1.3 + this.id) * 0.6; T.legLz = S(t * 3) * 0.12; T.legRz = -S(t * 3) * 0.12; T.armLz = S(t * 3) * 0.1; T.armRz = -S(t * 3) * 0.1; break; }
            default: { T.armRz = 2.6; T.armRx = -0.4 + S(t * 9) * 0.45; T.headZ = 0.12; T.lift = ab(S(t * 4.5)) * 4; }   // wave
        }
    }

    _setEmissive(c) {
        for (const m of this.root.getChildMeshes(false)) {
            const mm = /** @type {any} */ (m.material);
            for (const mat of (mm && (mm.subMaterials || [mm])) || []) {
                if (!mat || /^face-|^decal-/.test(mat.name)) continue;
                if (!mat._rvBaseEmissive) mat._rvBaseEmissive = mat.emissiveColor ? mat.emissiveColor.clone() : new BABYLON.Color3(0, 0, 0);
                mat.emissiveColor = c ? mat._rvBaseEmissive.add(c) : mat._rvBaseEmissive.clone();
            }
        }
    }

    dispose() {
        for (const m of [this.model].concat(this.model.getChildMeshes(false))) World3D.outlineRemove(this.view, m);
        for (const m of this.root.getChildMeshes(false)) World3D.outlineRemove(this.view, m);
        this.view.removeShadowCaster(this.model);
        const mats = new Set();
        for (const m of this.root.getChildMeshes(false)) {
            const mat = /** @type {any} */ (m.material);
            if (!mat) continue;
            mats.add(mat);
            for (const sm of mat.subMaterials || []) if (sm) mats.add(sm);
        }
        this.root.dispose(false, false);
        for (const mat of mats) mat.dispose(false, false);
    }
}
