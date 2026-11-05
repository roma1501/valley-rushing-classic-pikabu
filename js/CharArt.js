// CharArt.js — рисунки Valley Rushing Classic на холсте 256×256: дополнительные лица,
// принты на футболки и спрайты следов. Одни и те же функции рисуют текстуры в игре
// (Characters.texture, след за бегущим) и превью карточек магазина (GameUI).
// Прозрачный фон; цвет принта — color, у следов — c1/c2.

/** @satisfies {Record<string, any>} */
const CharArt = {
    INK: '#161616',

    _eye(ctx, x, y, w, h, c) { ctx.beginPath(); ctx.ellipse(x, y, w, h, 0, 0, Math.PI * 2); ctx.fillStyle = c || this.INK; ctx.fill(); },
    _dot(ctx, x, y, r, c) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = c; ctx.fill(); },
    _line(ctx, pts, w, c) {
        ctx.beginPath(); ctx.moveTo(pts[0], pts[1]);
        for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
        ctx.strokeStyle = c || this.INK; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke();
    },
    _arc(ctx, x0, y0, cx, cy, x1, y1, w, c) {
        ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo(cx, cy, x1, y1);
        ctx.strokeStyle = c || this.INK; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.stroke();
    },
    _star(ctx, cx, cy, r, c, inner) {
        ctx.beginPath();
        for (let i = 0; i < 10; i++) {
            const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * (inner || 0.45) : r;
            ctx.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
        }
        ctx.closePath(); ctx.fillStyle = c; ctx.fill();
    },
    _heart(ctx, cx, cy, s, c) {
        ctx.beginPath(); ctx.moveTo(cx, cy + s * 0.9);
        ctx.bezierCurveTo(cx - s * 1.3, cy + s * 0.1, cx - s * 0.8, cy - s * 1.05, cx, cy - s * 0.35);
        ctx.bezierCurveTo(cx + s * 0.8, cy - s * 1.05, cx + s * 1.3, cy + s * 0.1, cx, cy + s * 0.9);
        ctx.fillStyle = c; ctx.fill();
    },
    _smileEyes(ctx) { this._eye(ctx, 94, 104, 12, 20); this._eye(ctx, 162, 104, 12, 20); this._dot(ctx, 97, 95, 5, '#fff'); this._dot(ctx, 165, 95, 5, '#fff'); },

    // Лица сверх базовых (Characters._drawFace). false — такого лица нет.
    face(ctx, name) {
        const K = this.INK;
        switch (name) {
            case 'tongue':
                this._smileEyes(ctx);
                this._arc(ctx, 86, 152, 128, 196, 170, 152, 11);
                ctx.beginPath(); ctx.ellipse(140, 186, 18, 22, 0.2, 0, Math.PI); ctx.fillStyle = '#e25563'; ctx.fill();
                break;
            case 'surprised':
                this._eye(ctx, 94, 100, 14, 22); this._eye(ctx, 162, 100, 14, 22); this._dot(ctx, 98, 92, 5, '#fff'); this._dot(ctx, 166, 92, 5, '#fff');
                this._arc(ctx, 72, 64, 94, 50, 116, 62, 8); this._arc(ctx, 140, 62, 162, 50, 184, 64, 8);
                ctx.beginPath(); ctx.ellipse(128, 176, 16, 22, 0, 0, Math.PI * 2); ctx.fillStyle = K; ctx.fill();
                break;
            case 'sleepy':
                this._arc(ctx, 74, 108, 94, 120, 114, 108, 10); this._arc(ctx, 142, 108, 162, 120, 182, 108, 10);
                this._arc(ctx, 104, 170, 128, 178, 152, 170, 10);
                ctx.font = '900 34px Arial Black, sans-serif'; ctx.fillStyle = '#2f8cff'; ctx.fillText('z', 190, 76); ctx.font = '900 24px Arial Black, sans-serif'; ctx.fillText('z', 214, 52);
                break;
            case 'nerd':
                ctx.lineWidth = 9; ctx.strokeStyle = K;
                ctx.beginPath(); ctx.arc(94, 106, 28, 0, Math.PI * 2); ctx.stroke(); ctx.beginPath(); ctx.arc(162, 106, 28, 0, Math.PI * 2); ctx.stroke();
                this._line(ctx, [122, 104, 134, 104], 8);
                this._eye(ctx, 94, 108, 9, 12); this._eye(ctx, 162, 108, 9, 12);
                this._arc(ctx, 92, 160, 128, 190, 164, 160, 10);
                ctx.fillStyle = '#fff'; ctx.fillRect(116, 166, 11, 14); ctx.fillRect(129, 166, 11, 14);
                ctx.strokeStyle = K; ctx.lineWidth = 3; ctx.strokeRect(116, 166, 11, 14); ctx.strokeRect(129, 166, 11, 14);
                break;
            case 'cat':
                this._eye(ctx, 94, 102, 12, 17); this._eye(ctx, 162, 102, 12, 17); this._dot(ctx, 97, 95, 4, '#fff'); this._dot(ctx, 165, 95, 4, '#fff');
                ctx.beginPath(); ctx.moveTo(120, 140); ctx.lineTo(136, 140); ctx.lineTo(128, 150); ctx.closePath(); ctx.fillStyle = '#e86fa8'; ctx.fill();
                this._arc(ctx, 104, 158, 116, 172, 128, 156, 8); this._arc(ctx, 128, 156, 140, 172, 152, 158, 8);
                for (const [y, d] of [[142, -8], [154, 0], [166, 8]]) { this._line(ctx, [72, y + d, 30, y + d * 1.6], 5); this._line(ctx, [184, y + d, 226, y + d * 1.6], 5); }
                break;
            case 'mustache':
                this._smileEyes(ctx);
                ctx.beginPath(); ctx.moveTo(128, 150);
                ctx.bezierCurveTo(100, 136, 70, 150, 60, 176); ctx.bezierCurveTo(84, 168, 104, 172, 128, 162);
                ctx.bezierCurveTo(152, 172, 172, 168, 196, 176); ctx.bezierCurveTo(186, 150, 156, 136, 128, 150);
                ctx.fillStyle = '#3b2416'; ctx.fill();
                break;
            case 'derp':
                ctx.beginPath(); ctx.arc(92, 104, 22, 0, Math.PI * 2); ctx.fillStyle = '#fff'; ctx.fill(); ctx.lineWidth = 6; ctx.strokeStyle = K; ctx.stroke();
                ctx.beginPath(); ctx.arc(166, 96, 16, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
                this._eye(ctx, 100, 112, 8, 8); this._eye(ctx, 160, 90, 6, 6);
                this._arc(ctx, 88, 166, 118, 150, 168, 178, 10);
                break;
            case 'kawaii':
                for (const x of [92, 164]) {
                    this._eye(ctx, x, 106, 20, 26);
                    this._dot(ctx, x + 6, 96, 8, '#fff'); this._dot(ctx, x - 6, 116, 4, '#fff');
                }
                this._arc(ctx, 118, 158, 128, 168, 138, 158, 7);
                ctx.fillStyle = 'rgba(255,120,150,.55)';
                ctx.beginPath(); ctx.ellipse(56, 146, 18, 10, 0, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.ellipse(200, 146, 18, 10, 0, 0, Math.PI * 2); ctx.fill();
                break;
            case 'beard':
                this._smileEyes(ctx);
                ctx.beginPath(); ctx.moveTo(52, 136); ctx.quadraticCurveTo(60, 236, 128, 246); ctx.quadraticCurveTo(196, 236, 204, 136);
                ctx.quadraticCurveTo(170, 170, 128, 168); ctx.quadraticCurveTo(86, 170, 52, 136); ctx.fillStyle = '#5a3a22'; ctx.fill();
                this._arc(ctx, 106, 186, 128, 198, 150, 186, 8, '#2a1a10');
                break;
            case 'eyepatch':
                this._eye(ctx, 94, 104, 12, 20); this._dot(ctx, 97, 95, 5, '#fff');
                this._line(ctx, [60, 60, 210, 120], 7);
                ctx.beginPath(); ctx.ellipse(162, 106, 26, 22, 0, 0, Math.PI * 2); ctx.fillStyle = K; ctx.fill();
                this._arc(ctx, 96, 168, 136, 180, 168, 156, 10);
                break;
            case 'monocle':
                this._eye(ctx, 94, 104, 11, 18);
                ctx.beginPath(); ctx.arc(162, 104, 26, 0, Math.PI * 2); ctx.lineWidth = 7; ctx.strokeStyle = '#d8a23a'; ctx.stroke();
                this._eye(ctx, 162, 104, 10, 14); this._line(ctx, [186, 116, 200, 190], 4, '#d8a23a');
                this._arc(ctx, 70, 72, 94, 62, 116, 74, 8);
                this._line(ctx, [100, 166, 156, 166], 10);
                break;
            case 'clown':
                this._smileEyes(ctx);
                this._dot(ctx, 128, 140, 18, '#ff3b3b'); this._dot(ctx, 122, 134, 5, '#ffb0b0');
                this._arc(ctx, 74, 162, 128, 220, 182, 162, 12, '#c4281c');
                break;
            case 'vampire':
                this._arc(ctx, 72, 82, 92, 70, 114, 92, 9); this._arc(ctx, 142, 92, 164, 70, 184, 82, 9);
                this._eye(ctx, 94, 108, 11, 16, '#c4281c'); this._eye(ctx, 162, 108, 11, 16, '#c4281c');
                this._arc(ctx, 90, 160, 128, 182, 166, 160, 9);
                ctx.fillStyle = '#fff'; ctx.strokeStyle = K; ctx.lineWidth = 3;
                for (const x of [108, 148]) { ctx.beginPath(); ctx.moveTo(x - 8, 166); ctx.lineTo(x + 8, 168); ctx.lineTo(x, 190); ctx.closePath(); ctx.fill(); ctx.stroke(); }
                break;
            case 'robot':
                ctx.fillStyle = K; ctx.beginPath(); ctx.roundRect(52, 72, 152, 70, 18); ctx.fill();
                ctx.fillStyle = '#39ffe0'; ctx.fillRect(76, 94, 34, 22); ctx.fillRect(146, 94, 34, 22);
                ctx.fillStyle = K;
                for (let i = 0; i < 5; i++) ctx.fillRect(84 + i * 20, 166, 12, 22);
                break;
            case 'hearts':
                this._heart(ctx, 94, 104, 28, '#ff3b5a'); this._heart(ctx, 162, 104, 28, '#ff3b5a');
                this._arc(ctx, 84, 160, 128, 204, 172, 160, 11);
                break;
            case 'stars':
                this._star(ctx, 94, 104, 30, '#ffc83d', 0.48); this._star(ctx, 162, 104, 30, '#ffc83d', 0.48);
                ctx.lineWidth = 4; ctx.strokeStyle = K;
                ctx.beginPath(); ctx.moveTo(82, 160); ctx.quadraticCurveTo(128, 222, 174, 160); ctx.closePath(); ctx.fillStyle = K; ctx.fill();
                break;
            case 'money':
                ctx.font = '900 66px Arial Black, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#17934e';
                ctx.fillText('$', 94, 108); ctx.fillText('$', 162, 108);
                this._arc(ctx, 82, 158, 128, 214, 174, 158, 11);
                break;
            case 'fireeyes': {
                for (const x of [94, 162]) {
                    ctx.beginPath(); ctx.moveTo(x - 20, 118); ctx.quadraticCurveTo(x - 24, 84, x - 6, 66); ctx.quadraticCurveTo(x - 4, 86, x + 4, 80);
                    ctx.quadraticCurveTo(x + 6, 66, x + 16, 58); ctx.quadraticCurveTo(x + 26, 92, x + 20, 118); ctx.closePath();
                    ctx.fillStyle = '#ff6a1f'; ctx.fill();
                    this._eye(ctx, x, 106, 10, 12, '#ffe14a');
                }
                this._arc(ctx, 92, 172, 128, 156, 164, 172, 10);
                break;
            }
            default: return false;
        }
        return true;
    },

    // Принты на футболку сверх базовых (Characters._drawDecal). false — такого нет.
    decal(ctx, name, color) {
        const K = this.INK, c = color;
        ctx.fillStyle = c; ctx.strokeStyle = c;
        switch (name) {
            case 'hoodie':
                ctx.globalAlpha = 0.9; ctx.beginPath(); ctx.roundRect(54, 150, 148, 70, 20); ctx.lineWidth = 10; ctx.stroke(); ctx.globalAlpha = 1;
                this._line(ctx, [104, 10, 96, 96], 8, c); this._line(ctx, [152, 10, 160, 96], 8, c);
                this._dot(ctx, 96, 104, 9, c); this._dot(ctx, 160, 104, 9, c);
                break;
            case 'overalls':
                ctx.fillRect(40, 120, 176, 136); ctx.fillRect(56, 0, 30, 130); ctx.fillRect(170, 0, 30, 130);
                this._dot(ctx, 71, 112, 10, '#ffc83d'); this._dot(ctx, 185, 112, 10, '#ffc83d');
                ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.fillRect(96, 160, 64, 46);
                break;
            case 'flower':
                for (const [x, y, r] of [[70, 70, 34], [180, 90, 26], [110, 190, 40], [200, 210, 22], [40, 190, 20]]) {
                    for (let i = 0; i < 5; i++) { const a = i * Math.PI * 2 / 5; this._dot(ctx, x + Math.cos(a) * r * 0.62, y + Math.sin(a) * r * 0.62, r * 0.45, c); }
                    this._dot(ctx, x, y, r * 0.32, '#ffd23a');
                }
                break;
            case 'buttons':
                for (const y of [60, 118, 176]) { this._dot(ctx, 104, y, 11, c); this._dot(ctx, 152, y, 11, c); }
                this._line(ctx, [128, 0, 128, 256], 4, 'rgba(0,0,0,.25)');
                break;
            case 'cross':
                ctx.fillRect(104, 60, 48, 136); ctx.fillRect(60, 104, 136, 48);
                break;
            case 'badge':
                this._star(ctx, 82, 86, 42, c, 0.55); this._dot(ctx, 82, 86, 14, 'rgba(0,0,0,.25)');
                ctx.fillRect(140, 70, 70, 10); ctx.fillRect(140, 96, 52, 10);
                break;
            case 'spots':
                for (const [x, y, rx, ry] of [[60, 60, 40, 30], [190, 80, 30, 42], [100, 180, 46, 34], [210, 210, 26, 22], [30, 220, 22, 26]]) { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0.4, 0, Math.PI * 2); ctx.fill(); }
                break;
            case 'dots':
                for (let y = 24; y < 256; y += 52) for (let x = (y / 52) % 2 ? 50 : 24; x < 256; x += 52) this._dot(ctx, x, y, 14, c);
                break;
            case 'camo':
                for (const [x, y, rx, ry, a] of [[50, 50, 50, 26, 0.5], [180, 40, 40, 30, -0.4], [120, 140, 60, 30, 0.2], [40, 200, 40, 34, -0.2], [200, 190, 50, 28, 0.7], [140, 240, 40, 20, 0]]) {
                    ctx.beginPath(); ctx.ellipse(x, y, rx, ry, a, 0, Math.PI * 2); ctx.fill();
                }
                break;
            case 'tie':
                ctx.fillStyle = '#f8f8f8'; ctx.beginPath(); ctx.moveTo(76, 0); ctx.lineTo(180, 0); ctx.lineTo(128, 120); ctx.closePath(); ctx.fill();
                ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(114, 10); ctx.lineTo(142, 10); ctx.lineTo(150, 40); ctx.lineTo(162, 190); ctx.lineTo(128, 230); ctx.lineTo(94, 190); ctx.lineTo(106, 40); ctx.closePath(); ctx.fill();
                break;
            case 'tiger':
                for (const y of [30, 90, 150, 210]) {
                    ctx.beginPath(); ctx.moveTo(0, y); ctx.quadraticCurveTo(50, y + 20, 90, y + 4); ctx.lineTo(70, y + 26); ctx.quadraticCurveTo(30, y + 34, 0, y + 22); ctx.fill();
                    ctx.beginPath(); ctx.moveTo(256, y + 10); ctx.quadraticCurveTo(206, y + 30, 166, y + 14); ctx.lineTo(186, y + 36); ctx.quadraticCurveTo(226, y + 44, 256, y + 32); ctx.fill();
                }
                break;
            case 'torn':
                ctx.beginPath(); ctx.moveTo(40, 256); ctx.lineTo(60, 200); ctx.lineTo(80, 230); ctx.lineTo(110, 180); ctx.lineTo(130, 226); ctx.lineTo(160, 190); ctx.lineTo(190, 236); ctx.lineTo(210, 200); ctx.lineTo(230, 256); ctx.closePath(); ctx.fill();
                ctx.fillRect(150, 50, 40, 8); ctx.fillRect(166, 34, 8, 40);
                ctx.fillRect(60, 90, 30, 6); ctx.fillRect(72, 78, 6, 30);
                break;
            case 'bandage':
                ctx.lineWidth = 16;
                for (let i = -2; i < 8; i++) { ctx.beginPath(); ctx.moveTo(0, i * 40); ctx.lineTo(256, i * 40 + 70); ctx.stroke(); }
                break;
            case 'robot':
                ctx.lineWidth = 8; ctx.strokeRect(40, 40, 176, 176); ctx.strokeRect(80, 80, 96, 60);
                this._dot(ctx, 104, 180, 12, '#ff3b3b'); this._dot(ctx, 152, 180, 12, '#ffd23a');
                for (let x = 92; x < 170; x += 20) ctx.fillRect(x, 96, 10, 28);
                break;
            case 'super':
                ctx.beginPath(); ctx.moveTo(128, 30); ctx.lineTo(230, 90); ctx.lineTo(128, 230); ctx.lineTo(26, 90); ctx.closePath(); ctx.fill();
                ctx.fillStyle = '#c4281c'; ctx.font = '900 110px Arial Black, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('S', 128, 120);
                break;
            case 'belt':
                ctx.fillRect(0, 196, 256, 34); ctx.fillRect(140, 210, 26, 46); ctx.fillRect(176, 210, 22, 40);
                this._line(ctx, [60, 0, 200, 190], 20, 'rgba(255,255,255,.2)');
                break;
            case 'snow':
                for (const [x, y, r] of [[70, 70, 34], [180, 120, 44], [90, 190, 28], [210, 220, 18], [30, 150, 16]]) {
                    for (let i = 0; i < 3; i++) { const a = i * Math.PI / 3; this._line(ctx, [x - Math.cos(a) * r, y - Math.sin(a) * r, x + Math.cos(a) * r, y + Math.sin(a) * r], 6, c); }
                }
                break;
            case 'stars':
                for (const [x, y, r] of [[60, 60, 30], [190, 80, 22], [120, 170, 40], [220, 200, 16], [36, 200, 14], [160, 30, 10], [90, 120, 8]]) this._star(ctx, x, y, r, c);
                break;
            case 'rainbow': {
                const cols = ['#ff3b3b', '#ff9a1f', '#ffd23a', '#34e27a', '#2f8cff', '#6b3f9e'];
                ctx.lineWidth = 20; ctx.lineCap = 'butt';
                cols.forEach((col, i) => { ctx.beginPath(); ctx.arc(128, 220, 150 - i * 20, Math.PI, 0); ctx.strokeStyle = col; ctx.stroke(); });
                break;
            }
            case 'neon':
                ctx.shadowColor = c; ctx.shadowBlur = 18; ctx.lineWidth = 10;
                ctx.strokeRect(40, 40, 176, 176);
                this._line(ctx, [70, 180, 110, 90, 140, 150, 186, 70], 10, c);
                ctx.shadowBlur = 0;
                break;
            case 'flame':
                for (const [x, w, h] of [[60, 50, 150], [128, 70, 210], [196, 50, 160]]) {
                    ctx.beginPath(); ctx.moveTo(x - w, 256); ctx.quadraticCurveTo(x - w, 256 - h * 0.6, x - w * 0.2, 256 - h);
                    ctx.quadraticCurveTo(x, 256 - h * 0.55, x + w * 0.3, 256 - h * 0.85); ctx.quadraticCurveTo(x + w, 256 - h * 0.4, x + w, 256); ctx.closePath(); ctx.fill();
                }
                ctx.fillStyle = '#ffd23a'; ctx.beginPath(); ctx.moveTo(98, 256); ctx.quadraticCurveTo(100, 160, 128, 120); ctx.quadraticCurveTo(160, 170, 158, 256); ctx.closePath(); ctx.fill();
                break;
            case 'ribs':
                ctx.fillRect(120, 10, 16, 236);
                for (let i = 0; i < 5; i++) { const y = 40 + i * 40; ctx.beginPath(); ctx.ellipse(128, y, 92 - i * 6, 14, 0, 0, Math.PI * 2); ctx.lineWidth = 12; ctx.stroke(); }
                break;
            case 'banana':
                ctx.beginPath(); ctx.moveTo(40, 80); ctx.quadraticCurveTo(80, 230, 220, 180); ctx.quadraticCurveTo(110, 190, 70, 70); ctx.closePath(); ctx.fill();
                ctx.fillRect(34, 66, 18, 22);
                break;
            case 'gem':
                ctx.beginPath(); ctx.moveTo(70, 90); ctx.lineTo(186, 90); ctx.lineTo(220, 130); ctx.lineTo(128, 230); ctx.lineTo(36, 130); ctx.closePath(); ctx.fill();
                ctx.fillStyle = 'rgba(0,80,140,.25)'; ctx.beginPath(); ctx.moveTo(36, 130); ctx.lineTo(220, 130); ctx.lineTo(128, 230); ctx.closePath(); ctx.fill();
                this._line(ctx, [100, 90, 84, 130, 128, 230, 172, 130, 156, 90], 4, 'rgba(0,80,140,.4)');
                break;
            case 'shield':
                ctx.beginPath(); ctx.moveTo(128, 20); ctx.lineTo(220, 50); ctx.quadraticCurveTo(220, 180, 128, 236); ctx.quadraticCurveTo(36, 180, 36, 50); ctx.closePath(); ctx.fill();
                ctx.fillStyle = '#c4281c'; ctx.fillRect(116, 50, 24, 150); ctx.fillRect(66, 100, 124, 24);
                break;
            case 'six7': {
                ctx.font = '900 150px Arial Black, RushFont, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                ctx.lineJoin = 'round'; ctx.lineWidth = 22; ctx.strokeStyle = K; ctx.strokeText('67', 128, 136);
                ctx.fillStyle = c; ctx.fillText('67', 128, 136);
                this._star(ctx, 214, 40, 22, '#ffffff'); this._star(ctx, 40, 218, 16, '#ffffff');
                break;
            }
            case 'astro':
                ctx.beginPath(); ctx.roundRect(60, 50, 136, 110, 20); ctx.fill();
                this._dot(ctx, 92, 90, 12, '#ff3b3b'); this._dot(ctx, 128, 90, 12, '#ffd23a'); this._dot(ctx, 164, 90, 12, '#34e27a');
                ctx.fillStyle = '#fff'; ctx.fillRect(84, 120, 88, 14);
                break;
            default: return false;
        }
        return true;
    },

    // Спрайт следа: tex — dot|bubble|leaf|heart|star|snow|note|square|coin|spark|cloud|flame|bolt.
    sprite(ctx, tex, c1, c2) {
        const g = ctx.createRadialGradient(128, 128, 10, 128, 128, 120);
        g.addColorStop(0, c2 || c1); g.addColorStop(1, c1);
        ctx.fillStyle = g; ctx.strokeStyle = c1;
        switch (tex) {
            case 'dot': { const r = ctx.createRadialGradient(128, 128, 0, 128, 128, 120); r.addColorStop(0, c1); r.addColorStop(0.6, c2 || c1); r.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = r; ctx.fillRect(0, 0, 256, 256); break; }
            case 'bubble':
                ctx.beginPath(); ctx.arc(128, 128, 96, 0, Math.PI * 2); ctx.globalAlpha = 0.35; ctx.fill(); ctx.globalAlpha = 1;
                ctx.lineWidth = 14; ctx.stroke(); this._dot(ctx, 92, 90, 20, '#ffffff');
                break;
            case 'leaf':
                ctx.beginPath(); ctx.moveTo(40, 200); ctx.quadraticCurveTo(40, 40, 216, 40); ctx.quadraticCurveTo(216, 216, 40, 200); ctx.fill();
                this._line(ctx, [40, 200, 180, 76], 8, 'rgba(0,60,0,.35)');
                break;
            case 'heart': this._heart(ctx, 128, 132, 100, c1); this._dot(ctx, 92, 88, 16, 'rgba(255,255,255,.6)'); break;
            case 'star': this._star(ctx, 128, 132, 118, c1, 0.46); this._star(ctx, 128, 132, 54, c2 || '#fff', 0.46); break;
            case 'snow':
                for (let i = 0; i < 3; i++) { const a = i * Math.PI / 3; this._line(ctx, [128 - Math.cos(a) * 104, 128 - Math.sin(a) * 104, 128 + Math.cos(a) * 104, 128 + Math.sin(a) * 104], 18, c1); }
                this._dot(ctx, 128, 128, 24, c2 || c1);
                break;
            case 'note':
                ctx.fillStyle = c1; ctx.beginPath(); ctx.ellipse(90, 190, 46, 34, -0.4, 0, Math.PI * 2); ctx.fill();
                ctx.fillRect(122, 40, 18, 154); ctx.beginPath(); ctx.moveTo(140, 40); ctx.quadraticCurveTo(210, 70, 196, 140); ctx.quadraticCurveTo(190, 90, 140, 90); ctx.fill();
                break;
            case 'square': ctx.fillStyle = c1; ctx.fillRect(40, 40, 176, 176); ctx.fillStyle = c2 || c1; ctx.fillRect(40, 40, 88, 88); ctx.fillRect(128, 128, 88, 88); break;
            case 'coin':
                ctx.beginPath(); ctx.arc(128, 128, 104, 0, Math.PI * 2); ctx.fillStyle = c1; ctx.fill();
                ctx.lineWidth = 14; ctx.strokeStyle = '#b8860b'; ctx.stroke();
                ctx.fillStyle = c2 || '#fff'; ctx.font = '900 120px Arial Black, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('$', 128, 136);
                break;
            case 'spark':
                ctx.beginPath(); ctx.moveTo(128, 0); ctx.quadraticCurveTo(140, 116, 256, 128); ctx.quadraticCurveTo(140, 140, 128, 256); ctx.quadraticCurveTo(116, 140, 0, 128); ctx.quadraticCurveTo(116, 116, 128, 0); ctx.fill();
                break;
            case 'cloud':
                for (const [x, y, r] of [[80, 150, 60], [140, 110, 72], [190, 160, 52], [130, 170, 60]]) this._dot(ctx, x, y, r, c1);
                break;
            case 'flame':
                ctx.beginPath(); ctx.moveTo(128, 10); ctx.quadraticCurveTo(230, 130, 196, 196); ctx.quadraticCurveTo(170, 250, 128, 248);
                ctx.quadraticCurveTo(86, 250, 60, 196); ctx.quadraticCurveTo(30, 130, 128, 10); ctx.fill();
                ctx.fillStyle = '#fff6c0'; ctx.beginPath(); ctx.ellipse(128, 190, 34, 46, 0, 0, Math.PI * 2); ctx.fill();
                break;
            case 'n67':
                ctx.font = '900 150px Arial Black, RushFont, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                ctx.lineJoin = 'round'; ctx.lineWidth = 20; ctx.strokeStyle = '#161a22'; ctx.strokeText('67', 128, 134);
                ctx.fillStyle = g; ctx.fillText('67', 128, 134);
                break;
            case 'bolt':
                ctx.beginPath(); ctx.moveTo(150, 10); ctx.lineTo(60, 140); ctx.lineTo(118, 140); ctx.lineTo(98, 246); ctx.lineTo(200, 104); ctx.lineTo(140, 104); ctx.closePath(); ctx.fill();
                break;
            default: return false;
        }
        return true;
    },
};
