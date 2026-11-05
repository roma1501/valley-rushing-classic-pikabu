// GameUI.js — интерфейс Valley Rushing Classic: меню, гардероб, подарок, колесо, рекорды, магазин способностей, HUD, мобильное управление, туториал, результаты.
//
// Образ: «спортивный день на площадке» в стиле Roblox — толстые контуры #161a22, жёсткие нижние
// тени, наклонные плашки-баннеры, нагрудный номер вместо аватарки, гирлянда флажков над меню,
// билетики-«талоны» в магазине. Весь DOM создаётся здесь (#ui-root, z-index 100), стили вписываются
// из JS. Размеры — в em от корня #ui-root (он растёт от 12 до 20 px по меньшей стороне экрана).
//
// Игра вызывает: GameUI.init(handlers), showMenu/hideMenu, showShop/hideShop, showHUD/setHUD,
// banner/countdown/feed/floatText/flash, heroChoice, showResults/hideResults, showPause,
// tutorialStep/tutorialHide, plate/platePos/plateRemove, setTouchMode, setMuted; читает
// GameUI.joystick {x, y, active}. Тексты — Lang.t (ключи в GameLang.js).

/** @typedef {{ level:number, xp:number, xpNext:number, coins:number, gems:number, wins:number, muted:boolean }} UIProfile */
/** @typedef {{ id:string, tab:string, nameKey:string, descKey:string, price:number, currency:'gems'|'coins', owned:boolean, equipped:boolean, count?:number, free?:boolean }} UIShopItem */
/** @typedef {{ coins:number, gems:number, tabs:{ id:string, titleKey:string }[], items:UIShopItem[] }} UIShopData */
/** @typedef {{ id:string, ready:boolean, cooldown:number, active:boolean }} UIAbility */
/** @typedef {{ role:'runner'|'chaser'|'downed', phase:'wait'|'countdown'|'run'|'over', crossing:number, crossings:number, timeLeft:number|null, runners:number, chasers:number, gems:number, coins:number, ability:UIAbility|null, dash:{ ready:boolean, cooldown:number }|null, action:'attack'|'revive'|'adrenaline'|null, actionProgress:number, consumable:{ id:string, count:number }|null, hint:string|null }} UIHud */
/** @typedef {{ win:boolean, title:string, role:'runner'|'chaser', stats:{ label:string, value:string }[], coins:number, gems:number, xp:number, level:number, levelUp:boolean }} UIResults */
/** @typedef {{ text:string, target:'joystick'|'dash'|'action'|'ability'|'gems'|null, progress:string }} UIStep */
/** @typedef {{ onPlay():void, onHowToPlay():void, onTutorialSkip():void, onPause(on:boolean):void, onQuit():void, onMute():boolean, onBuy(id:string):boolean, onEquip(id:string):void, getShop():UIShopData, onResultsNext():void, onHeroChoice(hero:boolean):void, onButton(name:'dash'|'action'|'ability', down:boolean):void }} UIHandlers */

// --- Иконки: внутренность SVG 48x48. Обводка #161a22 3px задаётся на <svg>, заливки — тут. ---
const GAMEUI_ICONS = {
    gem: '<path d="M24 44 5 19 13 5h22l8 14z" fill="#34e27a"/><path d="M13 5l5 14h12l5-14z" fill="#9ff2c0"/><path d="M5 19h38M18 19l6 25 6-25" fill="none"/>',
    coin: '<circle cx="24" cy="24" r="19" fill="#ffc83d"/><circle cx="24" cy="24" r="12" fill="#ffe08a" stroke-width="2.4"/><path d="M24 17.5l2.2 4.6 5 .7-3.6 3.5.9 5-4.5-2.4-4.5 2.4.9-5-3.6-3.5 5-.7z" fill="#ffc83d" stroke-width="2"/>',
    knife: '<g transform="rotate(40 24 24)"><path d="M24 2c5 7 7 17 6 27H18c-1-10 1-20 6-27z" fill="#e6edf5"/><path d="M24 8c2 5 3 11 2.4 17" fill="none" stroke="#fff" stroke-width="2"/><rect x="14" y="29" width="20" height="5" rx="2.5" fill="#ffc83d"/><rect x="20" y="34" width="8" height="12" rx="3" fill="#ff3b3b"/></g>',
    runner: '<rect x="23" y="3" width="11" height="11" rx="3" fill="#ffd9a8"/><path d="M21 16h14l-3 15H20z" fill="#2f8cff"/><path d="M21 18 9 25l3 5 12-5z" fill="#5aa6ff"/><path d="M34 18l9 7-3 4-10-6z" fill="#5aa6ff"/><path d="M20 31 9 42l5 3 12-11z" fill="#1b62c4"/><path d="M27 32l7 5-1 8h6l1-10-9-8z" fill="#1b62c4"/>',
    door: '<path d="M11 44V19a13 13 0 0 1 26 0v25z" fill="#d9964f"/><path d="M24 6v38M11 28h26" fill="none" stroke-width="2.2" opacity=".55"/><circle cx="31" cy="31" r="2.8" fill="#ffc83d"/><path d="M5 44h38" fill="none"/>',
    cloak: '<path d="M9 43V22a15 15 0 0 1 30 0v21l-5-4-5 4-5-4-5 4-5-4z" fill="#eef4ff"/><ellipse cx="19" cy="22" rx="2.6" ry="3.6" fill="#161a22" stroke="none"/><ellipse cx="29" cy="22" rx="2.6" ry="3.6" fill="#161a22" stroke="none"/><path d="M21 30q3 3 6 0" fill="none" stroke-width="2.4"/>',
    airhorn: '<path d="M11 29l3 13h7l-3-13z" fill="#a8641b"/><path d="M5 19h10l18-11v32L15 29H5z" fill="#ff9a1f"/><path d="M15 19v10" fill="none"/><path d="M38 17c3 4 3 10 0 14M42.5 11c6 8 6 18 0 26" fill="none"/>',
    leash: '<circle cx="19" cy="19" r="12" fill="none" stroke="#161a22" stroke-width="8.5"/><circle cx="19" cy="19" r="12" fill="none" stroke="#e0a458" stroke-width="3"/><path d="M28 28 38 38" stroke="#161a22" stroke-width="8.5"/><path d="M28 28 38 38" stroke="#e0a458" stroke-width="3"/><rect x="33" y="33" width="11" height="11" rx="3.5" fill="#ff3b3b"/>',
    dagger: '<g transform="rotate(-40 24 24)"><path d="M24 1l5 8v21H19V9z" fill="#cfe6ff"/><path d="M24 6v22" fill="none" stroke="#fff" stroke-width="2"/><path d="M12 30h24l-3 5H15z" fill="#ffc83d"/><rect x="21" y="35" width="6" height="7" rx="2" fill="#7a4bd8"/><circle cx="24" cy="44" r="2.6" fill="#34e27a"/></g>',
    rocket: '<g transform="rotate(45 24 24)"><path d="M24 2c8 6 9 18 7 30H17C15 20 16 8 24 2z" fill="#f4f6fa"/><circle cx="24" cy="16" r="4.2" fill="#2f8cff"/><path d="M17 24 9 34v5l8-4zM31 24l8 10v5l-8-4z" fill="#ff3b3b"/><path d="M19 33h10l-5 12z" fill="#ffc83d"/></g>',
    medkit: '<path d="M17 13V9a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v4" fill="none"/><rect x="5" y="13" width="38" height="29" rx="5" fill="#fff"/><path d="M21 19h6v5h5v6h-5v5h-6v-5h-5v-6h5z" fill="#ff3b3b"/>',
    bolt: '<path d="M28 3 10 27h11l-3 18 20-26H26z" fill="#ffc83d"/>',
    adrenaline: '<path d="M28 3 10 27h11l-3 18 20-26H26z" fill="#ffc83d"/><path d="M31 8l2.5-4M36 14l4-1.5" fill="none" stroke-width="2.6"/>',
    sprint: '<path d="M5 33c0-3 3-5 6-5l8-14 8 3-3 8c6 1 14 3 16 9v5H5z" fill="#2f8cff"/><path d="M20 19l5 2M18 23l6 2" fill="none" stroke="#fff" stroke-width="2.2"/><rect x="4" y="36" width="38" height="7" rx="3.5" fill="#fff"/><path d="M2 10h9M4 16h6" fill="none"/>',
    lunge: '<g transform="translate(4 0) translate(24 24) scale(.8) rotate(90) translate(-24 -24)"><path d="M24 2c5 7 7 17 6 27H18c-1-10 1-20 6-27z" fill="#e6edf5"/><rect x="14" y="29" width="20" height="5" rx="2.5" fill="#ffc83d"/><rect x="20" y="34" width="8" height="12" rx="3" fill="#ff3b3b"/></g><path d="M3 15h8M2 24h8M3 33h8" fill="none"/>',
    dash: '<path d="M4 9h10l15 15-15 15H4l15-15z" fill="#2f8cff"/><path d="M23 9h10l12 15-12 15H23l12-15z" fill="#5aa6ff"/>',
    revive: '<path d="M24 43C8 32 4 23 4 16a10.5 10.5 0 0 1 20-3 10.5 10.5 0 0 1 20 3c0 7-4 16-20 27z" fill="#ff5a7a"/><path d="M21 17h6v5h5v6h-5v5h-6v-5h-5v-6h5z" fill="#fff"/>',
    pause: '<rect x="10" y="7" width="10" height="34" rx="3" fill="#fff"/><rect x="28" y="7" width="10" height="34" rx="3" fill="#fff"/>',
    soundOn: '<path d="M5 18h8l10-9v30l-10-9H5z" fill="#fff"/><path d="M30 17c3 4 3 10 0 14M35.5 11c6 8 6 18 0 26" fill="none" stroke-width="3.4"/>',
    soundOff: '<path d="M5 18h8l10-9v30l-10-9H5z" fill="#fff"/><path d="M30 18l12 12M42 18 30 30" stroke="#161a22" stroke-width="8"/><path d="M30 18l12 12M42 18 30 30" stroke="#ff5a4a" stroke-width="3.4"/>',
    trophy: '<path d="M14 6h20v13a10 10 0 0 1-20 0z" fill="#ffc83d"/><path d="M14 10H7c0 8 3 12 8 13M34 10h7c0 8-3 12-8 13" fill="none"/><rect x="21" y="29" width="6" height="8" fill="#ffc83d"/><path d="M14 43l2-6h16l2 6z" fill="#ffc83d"/>',
    timer: '<rect x="19" y="3" width="10" height="5" rx="2" fill="#fff"/><circle cx="24" cy="27" r="16" fill="#fff"/><path d="M24 27V17M24 27l7 4" fill="none" stroke-width="3.4"/><path d="M37 11l3 3" fill="none"/>',
    next: '<path d="M6 19h20v-9l16 14-16 14v-9H6z" fill="#fff"/>',
    play: '<path d="M12 6 41 24 12 42z" fill="#fff"/>',
    bag: '<path d="M17 11 14 4h20l-3 7z" fill="#c98b4a"/><path d="M17 11C8 18 3 27 5 35c1 6 6 9 19 9s18-3 19-9c2-8-3-17-12-24z" fill="#e0a458"/><path d="M24 23l2.4 4.8 5.3.8-3.8 3.7.9 5.2-4.8-2.5-4.8 2.5.9-5.2-3.8-3.7 5.3-.8z" fill="#ffc83d" stroke-width="2"/>',
    help: '<circle cx="24" cy="24" r="19" fill="#fff"/><path d="M17.5 19a6.5 6.5 0 1 1 10 5.5c-2.5 1.6-3.5 3-3.5 6" fill="none" stroke-width="4.2"/><circle cx="24" cy="37" r="2.8" fill="#161a22" stroke="none"/>',
    close: '<path d="M11 11 37 37M37 11 11 37" stroke="#161a22" stroke-width="10"/><path d="M11 11 37 37M37 11 11 37" stroke="#fff" stroke-width="4"/>',
    home: '<path d="M7 24 24 8l17 16" fill="none" stroke-width="3.4"/><path d="M11 22 24 11l13 11v19H11z" fill="#fff"/><rect x="20" y="29" width="8" height="12" fill="#ffc83d"/>',
    star: '<path d="M24 4l6 13 14 1.6-10.5 9.6 3 14L24 34.8 11.5 42.2l3-14L4 18.6 18 17z" fill="#ffc83d"/>',
    check: '<path d="M9 25l10 10 20-22" fill="none" stroke="#161a22" stroke-width="10"/><path d="M9 25l10 10 20-22" fill="none" stroke="#fff" stroke-width="4"/>',
    ghost: '<path d="M9 43V22a15 15 0 0 1 30 0v21l-5-4-5 4-5-4-5 4-5-4z" fill="#d9e1ee"/><path d="M17 22h5M26 22h5" fill="none" stroke-width="3"/>',
};

Object.assign(GAMEUI_ICONS, {
    lock: '<rect x="10" y="21" width="28" height="21" rx="4" fill="#ffc83d"/><path d="M16 21v-6a8 8 0 0 1 16 0v6" fill="none" stroke-width="4"/><circle cx="24" cy="31.5" r="3" fill="#161a22" stroke="none"/>',
});

// --- Иконки гардероба, подарка и колеса ---
Object.assign(GAMEUI_ICONS, {
    shirt: '<path d="M17 5 5 11l4 9 5-3v26h20V17l5 3 4-9-12-6c-1 4-4 6-7 6s-6-2-7-6z" fill="#2f8cff"/><path d="M19 5c1 4 3 6 5 6s4-2 5-6" fill="none" stroke-width="2.4"/>',
    hat: '<rect x="13" y="6" width="22" height="25" rx="3" fill="#2a3140"/><path d="M13 23h22v5H13z" fill="#ff3b3b" stroke-width="2.4"/><ellipse cx="24" cy="33" rx="19" ry="6" fill="#2a3140"/>',
    face: '<circle cx="24" cy="24" r="19" fill="#ffd23a"/><ellipse cx="17.5" cy="20" rx="2.6" ry="4" fill="#161a22" stroke="none"/><ellipse cx="30.5" cy="20" rx="2.6" ry="4" fill="#161a22" stroke="none"/><path d="M14 29q10 11 20 0" fill="none" stroke-width="3.4"/>',
    trail: '<path d="M24 5l4 14 14 4-14 4-4 14-4-14L6 23l14-4z" fill="#ffc83d"/><path d="M38 6l1.6 4.4L44 12l-4.4 1.6L38 18l-1.6-4.4L32 12l4.4-1.6z" fill="#fff" stroke-width="2"/><path d="M8 38l1.2 3.2L12.5 42.5 9.2 43.7 8 47 6.8 43.7 3.5 42.5l3.3-1.3z" fill="#34e27a" stroke-width="1.8"/>',
    gift: '<rect x="7" y="21" width="34" height="22" rx="3" fill="#ff3b3b"/><rect x="5" y="14" width="38" height="9" rx="3" fill="#ff6a5a"/><path d="M24 14v29" stroke="#161a22" stroke-width="9"/><path d="M24 14v29" stroke="#ffc83d" stroke-width="4"/><path d="M24 14c-8 0-12-8-6-8s6 8 6 8zM24 14c8 0 12-8 6-8s-6 8-6 8z" fill="#ffc83d"/>',
    wheel: '<circle cx="24" cy="24" r="19" fill="#fff"/><path d="M24 24V5A19 19 0 0 1 43 24z" fill="#ffc83d"/><path d="M24 24h19A19 19 0 0 1 24 43z" fill="#ff3b3b"/><path d="M24 24v19A19 19 0 0 1 5 24z" fill="#2f8cff"/><path d="M24 24H5A19 19 0 0 1 24 5z" fill="#34e27a"/><circle cx="24" cy="24" r="4.5" fill="#fff"/>',
    adplay: '<rect x="4" y="9" width="40" height="30" rx="6" fill="#fff"/><path d="M19 17l14 7-14 7z" fill="#ff9a1f"/>',
    gear: '<path d="M24 4v40M4 24h40M10 10l28 28M38 10 10 38" stroke="#161a22" stroke-width="10"/><path d="M24 4v40M4 24h40M10 10l28 28M38 10 10 38" stroke="#cfd6e2" stroke-width="5"/><circle cx="24" cy="24" r="14" fill="#cfd6e2"/><circle cx="24" cy="24" r="5.5" fill="#5b6577"/>',
    emote: '',
});

// Позы эмоций: a/b — руки (ломаные от плеча), l/r — ноги, t — поворот всей фигуры, u — только верхней части, x — доп. штрихи.
const GAMEUI_POSES = {
    wave: { a: '24 18 16 26 15 34', b: '24 18 33 14 36 5', x: '<path d="M41 4q3 3 0 7" fill="none" stroke-width="2.4"/>' },
    cheer: { a: '24 18 15 11 12 3', b: '24 18 33 11 36 3', l: '24 31 17 43', r: '24 31 31 43' },
    clap: { a: '24 18 16 24 23 27', b: '24 18 32 24 25 27', x: '<path d="M21 21l-3-3M27 21l3-3M24 19v-4" fill="none" stroke-width="2.4"/>' },
    jacks: { a: '24 18 15 13 9 6', b: '24 18 33 13 39 6', l: '24 31 15 42', r: '24 31 33 42' },
    sway: { t: 'rotate(-10 24 31)', a: '24 18 16 25 15 33', b: '24 18 32 25 33 33', x: '<path d="M6 40q-3-6 0-12M42 40q3-6 0-12" fill="none" stroke-width="2.4"/>' },
    bow: { u: 'rotate(55 24 31)', a: '24 18 21 28 20 35', b: '24 18 27 28 28 35' },
    salute: { a: '24 18 17 27 16 35', b: '24 18 34 21 28 11' },
    flex: { a: '24 18 13 19 13 9', b: '24 18 35 19 35 9' },
    pogo: { t: 'translate(0 -3)', a: '24 18 15 23 12 17', b: '24 18 33 23 36 17', l: '24 31 22 43', r: '24 31 26 43', x: '<path d="M19 46l2-3 2 3 2-3 2 3 2-3" fill="none" stroke-width="2.4"/>' },
    airplane: { u: 'rotate(25 24 31)', a: '24 18 10 18 4 18', b: '24 18 38 18 44 18', l: '24 31 20 43', r: '24 31 30 41' },
    chicken: { a: '24 18 15 20 18 14', b: '24 18 33 20 30 14', l: '24 31 17 37 17 43', r: '24 31 31 37 31 43' },
    robot: { a: '24 18 14 18 14 27', b: '24 18 34 18 34 9', l: '24 31 20 43', r: '24 31 28 43' },
    squat: { t: 'translate(0 3)', a: '24 18 31 20 38 20', b: '24 19 31 22 38 22', l: '24 31 13 35 16 41', r: '24 31 35 35 32 41' },
    kick: { a: '24 18 14 22 18 15', b: '24 18 32 16 28 10', l: '24 31 22 43', r: '24 31 38 29' },
    headbang: { a: '24 18 15 24 12 17', b: '24 18 33 24 36 17', x: '<path d="M10 8q-3 3 0 6M38 8q3 3 0 6" fill="none" stroke-width="2.4"/>' },
    laugh: { a: '24 18 17 24 22 28', b: '24 18 31 24 26 28', x: '<path d="M34 4l3 3M38 8h4M36 12l4 1" fill="none" stroke-width="2.4"/>' },
    floss: { t: 'rotate(8 24 31)', a: '24 18 35 21 39 31', b: '24 18 15 25 10 33', l: '24 31 29 43', r: '24 31 21 43' },
    dab: { a: '24 18 31 11 22 6', b: '24 18 34 22 43 17' },
    spin: { a: '24 18 15 22 12 27', b: '24 18 33 22 36 27', x: '<path d="M8 12a18 18 0 0 1 32 0" fill="none"/><path d="M40 12l-1-6M40 12l-6 1" fill="none" stroke-width="2.6"/>' },
    moonwalk: { a: '24 18 15 25 12 22', b: '24 18 33 22 37 16', l: '24 31 19 40 12 43', r: '24 31 30 38 32 43' },
    disco: { a: '24 18 33 10 38 3', b: '24 18 17 25 22 29', l: '24 31 17 43', r: '24 31 31 43', x: '<path d="M43 3l1 3 3 1-3 1-1 3-1-3-3-1 3-1z" fill="#ffc83d" stroke-width="1.5"/>' },
};

/** SVG-фигурка эмоции (внутренность viewBox 48x48). */
function gameUiEmote(dance) {
    const p = GAMEUI_POSES[dance] || GAMEUI_POSES.wave;
    const limb = (pts, col, w) => '<polyline points="' + pts + '" fill="none" stroke="#161a22" stroke-width="' + (w + 3.6) + '"/><polyline points="' + pts + '" fill="none" stroke="' + col + '" stroke-width="' + w + '"/>';
    const legs = limb(p.l || '24 31 19 43', '#1b62c4', 4.4) + limb(p.r || '24 31 29 43', '#1b62c4', 4.4);
    const upper = limb(p.a, '#5aa6ff', 3.6) + limb(p.b, '#5aa6ff', 3.6) + limb('24 17 24 31', '#2f8cff', 6)
        + '<circle cx="24" cy="10" r="6" fill="#ffd9a8"/>';
    return '<g' + (p.t ? ' transform="' + p.t + '"' : '') + '>' + legs + '<g' + (p.u ? ' transform="' + p.u + '"' : '') + '>' + upper + '</g></g>' + (p.x || '');
}
GAMEUI_ICONS['emote'] = gameUiEmote('wave');

// Гирлянда флажков над меню: плитка 160x40 (4 флажка), повторяется по горизонтали.
const GAMEUI_BUNTING = (() => {
    const cols = ['#2f8cff', '#ff3b3b', '#ffc83d', '#34e27a'];
    let flags = '';
    for (let i = 0; i < 4; i++) {
        const x = i * 40;
        flags += '<path d="M' + (x + 4) + ' 6Q' + (x + 20) + ' 14 ' + (x + 36) + ' 6L' + (x + 20) + ' 36Z" fill="' + cols[i] + '" stroke="#161a22" stroke-width="2.5" stroke-linejoin="round"/>';
    }
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="160" height="40" viewBox="0 0 160 40">'
        + '<path d="M0 3Q20 13 40 3Q60 13 80 3Q100 13 120 3Q140 13 160 3" fill="none" stroke="#161a22" stroke-width="2.5"/>' + flags + '</svg>';
    return 'data:image/svg+xml,' + encodeURIComponent(svg);
})();

// --- Стили. Размеры в em от #ui-root; анимации — только transform/opacity. ---
const GAMEUI_CSS = `
@font-face{font-family:'RushFont';src:url('assets/fonts/montserrat.ttf') format('truetype');font-weight:100 900;font-display:swap}

#ui-root{
  --ink:#161a22;--blue:#2f8cff;--blue-d:#1b62c4;--red:#ff3b3b;--red-d:#b92424;--green:#34e27a;--green-d:#17934e;
  --gold:#ffc83d;--gold-d:#c68f12;--orange:#ff9a1f;--cream:#fff7e6;--cream-d:#ecdcb8;--gray:#7d8696;--gray-d:#555d6d;
  position:fixed;inset:0;z-index:100;pointer-events:none;overflow:hidden;
  font-family:'RushFont','Montserrat',system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;font-weight:700;
  font-size:clamp(12px,calc(7px + 1.5vmin),20px);line-height:1.15;color:#fff;
  -webkit-tap-highlight-color:transparent;-webkit-text-size-adjust:100%;text-size-adjust:100%;
}
#ui-root *,#ui-root *::before,#ui-root *::after{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
#ui-root .hidden{display:none!important}
#ui-root b{font-weight:900}
#ui-root .ic{width:1em;height:1em;display:block;flex:none;overflow:visible}
#ui-root img.ic{object-fit:contain}
#ui-root .tx{-webkit-text-stroke:.17em var(--ink);paint-order:stroke fill;text-shadow:0 .09em 0 var(--ink)}

/* ---------- кнопки ---------- */
#ui-root .btn{pointer-events:auto;position:relative;display:inline-flex;align-items:center;justify-content:center;gap:.5em;
  margin:0;min-height:2.9em;padding:.5em 1.1em;border:.24em solid var(--ink);border-radius:.95em;background:var(--c,var(--green));
  color:#fff;font:inherit;font-weight:900;font-size:1em;letter-spacing:.03em;line-height:1.05;text-align:center;text-transform:uppercase;
  cursor:pointer;touch-action:manipulation;-webkit-appearance:none;appearance:none;
  box-shadow:inset 0 .28em 0 rgba(255,255,255,.38),inset 0 -.3em 0 rgba(0,0,0,.2),0 .4em 0 rgba(0,0,0,.35);
  transition:transform .07s,box-shadow .07s,filter .15s;
  -webkit-text-stroke:.14em var(--ink);paint-order:stroke fill;text-shadow:0 .08em 0 var(--ink)}
#ui-root .btn:active,#ui-root .btn.down{transform:translateY(.3em);
  box-shadow:inset 0 .28em 0 rgba(255,255,255,.3),inset 0 -.2em 0 rgba(0,0,0,.2),0 .1em 0 rgba(0,0,0,.35)}
@media (hover:hover){#ui-root .btn:hover:not(:disabled){filter:brightness(1.1)}}
#ui-root .btn.blue{--c:var(--blue)}#ui-root .btn.red{--c:var(--red)}#ui-root .btn.gold{--c:var(--gold)}
#ui-root .btn.orange{--c:var(--orange)}#ui-root .btn.gray{--c:var(--gray)}#ui-root .btn.green{--c:var(--green)}
#ui-root .btn:disabled{filter:grayscale(.85) brightness(.82);cursor:not-allowed}
#ui-root .btn:disabled:active{transform:none;box-shadow:inset 0 .28em 0 rgba(255,255,255,.38),inset 0 -.3em 0 rgba(0,0,0,.2),0 .4em 0 rgba(0,0,0,.35)}
#ui-root .btn:focus{outline:none}
#ui-root .btn:focus-visible{outline:.22em dashed #fff;outline-offset:.2em}
#ui-root .btn .ic{font-size:1.3em}
#ui-root .btn.round{width:2.9em;height:2.9em;min-height:0;padding:0;border-radius:50%}
#ui-root .btn.round .ic{font-size:1.5em}
#ui-root .btn.sm{min-height:2.4em;padding:.3em .7em;font-size:.9em;gap:.35em}
#ui-root .btn.big{font-size:1.25em;min-height:2.9em}

/* ---------- чипы валюты ---------- */
#ui-root .chip{--rr:2em;position:relative;display:inline-flex;align-items:center;gap:.4em;min-height:2.2em;padding:.15em .8em .15em .4em;
  background:var(--ink);border-radius:2em;font-weight:900;color:#fff;box-shadow:0 .25em 0 rgba(0,0,0,.35)}
#ui-root .chip .ic{font-size:1.5em}
#ui-root .chip b{min-width:1.4ch;text-align:right;font-variant-numeric:tabular-nums;font-size:1.05em}
#ui-root .chip.c-gem b{color:var(--green)}
#ui-root .chip.c-coin b{color:var(--gold)}

/* ---------- слои ---------- */
#ui-root .plates{position:absolute;inset:0;z-index:1;overflow:hidden}
#ui-root .plate{position:absolute;left:0;top:0;display:flex;flex-direction:column;align-items:center;white-space:nowrap;
  transform:translate3d(-999px,-999px,0);transform-origin:50% 100%;will-change:transform;margin-top:-.3em;
  padding:.1em .6em .15em;font-size:.82em;line-height:1.1;background:rgba(22,26,34,.76);border-radius:.6em;border-bottom:.22em solid var(--pc,#fff)}
#ui-root .plate.hid{visibility:hidden}
#ui-root .plate .pn{font-weight:900;color:#fff}
#ui-root .plate.me .pn{color:var(--gold)}
#ui-root .plate .ps{font-size:.8em;color:#cdd3de}

#ui-root .fx{position:absolute;inset:0;z-index:3;overflow:hidden}
#ui-root .flash{position:absolute;inset:0;z-index:3;opacity:0;background:radial-gradient(ellipse at center,rgba(0,0,0,0) 46%,var(--fc,#ff3b3b) 140%)}
#ui-root .ft{position:absolute;left:0;top:0;font-size:1.7em;font-weight:900;white-space:nowrap;will-change:transform,opacity}

#ui-root .feed{position:absolute;z-index:4;right:max(.8em,env(safe-area-inset-right));top:calc(max(.6em,env(safe-area-inset-top)) + 9.4em);
  display:flex;flex-direction:column;align-items:flex-end;gap:.35em;max-width:min(21em,64vw)}
#ui-root .feedline{max-width:100%;padding:.2em .7em .25em .6em;background:rgba(22,26,34,.78);border-right:.3em solid var(--fc,#fff);
  border-radius:.6em 0 0 .6em;font-size:.88em;font-weight:800;color:#fff;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}

#ui-root .banner-layer{position:absolute;z-index:6;left:0;right:0;top:25%;display:flex;justify-content:center;padding:0 3vw}
#ui-root .banner{display:flex;flex-direction:column;align-items:center;max-width:100%;will-change:transform,opacity}
#ui-root .banner .bt{position:relative;isolation:isolate;padding:.12em .55em .2em;text-align:center;font-weight:900;line-height:1.02;
  text-transform:uppercase;text-wrap:balance;font-size:min(3.4em,9vw);rotate:-2deg}
#ui-root .banner.l .bt{font-size:min(2.3em,6.6vw)}
#ui-root .banner .bt::before{content:"";position:absolute;inset:0;z-index:-1;background:var(--bc,#ff9a1f);border:.09em solid var(--ink);border-radius:.2em;
  transform:skewX(-8deg);box-shadow:0 .1em 0 rgba(0,0,0,.35),inset 0 .09em 0 rgba(255,255,255,.4),inset 0 -.1em 0 rgba(0,0,0,.18)}
#ui-root .banner .bs{margin-top:.55em;padding:.25em 1em .3em;background:var(--cream);color:var(--ink);border:.2em solid var(--ink);border-radius:2em;
  font-size:1.15em;font-weight:900;text-align:center;box-shadow:0 .25em 0 rgba(0,0,0,.3);rotate:1deg;text-wrap:balance}

#ui-root .count{position:absolute;z-index:6;left:0;right:0;top:46%;display:flex;justify-content:center;pointer-events:none}
#ui-root .count span{display:block;font-size:min(13em,38vmin);line-height:.8;font-weight:900;color:var(--cc,#fff);
  -webkit-text-stroke:.1em var(--ink);paint-order:stroke fill;text-shadow:0 .06em 0 var(--ink);will-change:transform,opacity}

/* ---------- HUD ---------- */
#ui-root .hud{position:absolute;inset:0;z-index:2}
#ui-root .hud-left{position:absolute;left:max(.8em,env(safe-area-inset-left));top:max(.6em,env(safe-area-inset-top));
  display:flex;flex-direction:column;align-items:flex-start;gap:.5em}
#ui-root .role{position:relative;isolation:isolate;display:inline-flex;align-items:center;gap:.4em;min-height:2.6em;padding:.2em 1em .2em .45em;--rc:var(--blue)}
#ui-root .role.chaser{--rc:var(--red)}#ui-root .role.downed{--rc:var(--gray)}
#ui-root .role::before{content:"";position:absolute;inset:0;z-index:-1;background:var(--rc);border:.22em solid var(--ink);border-radius:.6em;transform:skewX(-8deg);
  box-shadow:0 .3em 0 rgba(0,0,0,.35),inset 0 .25em 0 rgba(255,255,255,.32)}
#ui-root .role-ic{display:grid;place-items:center;width:1.9em;height:1.9em;border-radius:50%;background:var(--cream);border:.17em solid var(--ink);font-size:1em}
#ui-root .role-ic .ic{font-size:1.15em}
#ui-root .role-name{font-weight:900;font-size:.95em;letter-spacing:.03em}
#ui-root .counts{display:flex;gap:.4em}
#ui-root .cnt{display:inline-flex;align-items:center;gap:.3em;padding:.12em .65em .12em .3em;background:var(--ink);border-radius:2em;font-weight:900;font-size:.95em;box-shadow:0 .2em 0 rgba(0,0,0,.3)}
#ui-root .cnt .ic{font-size:1.35em}
#ui-root .cnt.r b{color:#79b8ff}#ui-root .cnt.c b{color:#ff7a7a}
#ui-root .cnt b{min-width:1.1ch;font-variant-numeric:tabular-nums}

#ui-root .hud-mid{position:absolute;left:0;right:0;top:max(.4em,env(safe-area-inset-top));display:flex;flex-direction:column;align-items:center}
#ui-root .timer{font-size:2.9em;font-weight:900;line-height:1;font-variant-numeric:tabular-nums;min-width:2ch;text-align:center;will-change:transform}
#ui-root .timer.warn{color:var(--orange);animation:rv-pulse .55s ease-in-out infinite}
#ui-root .timer.crit{color:#ff4a3a;animation:rv-pulse .3s ease-in-out infinite}
#ui-root .xpill{position:relative;isolation:isolate;margin-top:.1em;padding:.2em 1em .25em;font-size:.78em;font-weight:900;letter-spacing:.05em;color:var(--cream);white-space:nowrap}
#ui-root .xpill::before{content:"";position:absolute;inset:0;z-index:-1;background:var(--ink);border-radius:.5em;transform:skewX(-10deg)}

#ui-root .hud-right{position:absolute;right:max(.8em,env(safe-area-inset-right));top:max(.6em,env(safe-area-inset-top));
  display:flex;flex-direction:column;align-items:flex-end;gap:.45em}
#ui-root .hud-right .pausebtn{order:-1;pointer-events:auto}
#ui-root .hud-right .chip{pointer-events:none}

#ui-root .hint{position:absolute;left:9em;right:15.8em;bottom:max(1em,env(safe-area-inset-bottom));margin:0;
  min-width:0;text-align:center;font-size:1.05em;font-weight:800;line-height:1.2;text-wrap:balance;padding:0 .5em}

#ui-root .acts{position:absolute;right:max(1em,env(safe-area-inset-right));bottom:max(1em,env(safe-area-inset-bottom));display:flex;align-items:flex-end;gap:.9em}
#ui-root .act{--rr:1em;--ac:var(--blue);position:relative;display:flex;flex-direction:column;align-items:center;gap:.4em;width:4em;
  transition:opacity .15s,filter .15s;touch-action:none;-webkit-user-select:none;user-select:none}
#ui-root .act.dash{--ac:var(--blue)}#ui-root .act.ability{--ac:var(--orange)}#ui-root .act.action{--ac:var(--red)}
#ui-root .act.action.revive{--ac:#ff6f91}#ui-root .act.action.boost{--ac:var(--gold)}
#ui-root .act .face{position:relative;display:grid;place-items:center;width:3.5em;height:3.5em;border:.2em solid var(--ink);border-radius:.95em;background:var(--cream);
  box-shadow:inset 0 0 0 .24em var(--ac),0 .3em 0 rgba(0,0,0,.35);overflow:hidden;transition:transform .08s}
#ui-root .act .ico{position:relative;display:grid;place-items:center;font-size:1.85em;line-height:0}
#ui-root .act .cd{position:absolute;inset:0;background:conic-gradient(rgba(14,17,24,.68) calc(var(--p,0) * 360deg),transparent 0)}
#ui-root .act .ring{display:none;position:absolute;inset:-.45em;width:calc(100% + .9em);height:calc(100% + .9em);overflow:visible;pointer-events:none}
#ui-root .act .ring circle{fill:none;stroke-linecap:round;stroke-width:8}
#ui-root .act .ring .trk{stroke:rgba(22,26,34,.45)}
#ui-root .act .ring .prg{stroke:#fff;stroke-dasharray:289.03;stroke-dashoffset:289.03;transform:rotate(-90deg);transform-origin:50% 50%}
#ui-root .act .pbar{width:100%;height:.4em;border-radius:1em;background:var(--ink);overflow:hidden;opacity:0;transition:opacity .1s}
#ui-root .act .pbar.on{opacity:1}
#ui-root .act .pbar i{display:block;height:100%;background:var(--green);transform-origin:0 50%;transform:scaleX(0)}
#ui-root .act .key{display:block;min-width:2.3em;padding:.08em .5em .02em;background:var(--cream);color:var(--ink);border:.17em solid var(--ink);border-bottom-width:.3em;
  border-radius:.45em;font-size:.82em;font-weight:900;text-align:center;white-space:nowrap}
#ui-root .act .lab{display:none}
#ui-root .act .cons{position:absolute;left:-.5em;top:-.7em;display:flex;align-items:center;gap:.15em;padding:.05em .45em .05em .2em;background:var(--ink);border-radius:2em;font-size:.8em;font-weight:900;z-index:2}
#ui-root .act .cons .ic{font-size:1.35em}
#ui-root .act.off{opacity:.42;filter:grayscale(.8)}
#ui-root .act.gone:not(.tut-target){display:none}
#ui-root .act.cool .ico{filter:grayscale(.5)}
#ui-root .act.pop .face{animation:rv-pop .45s ease-out}
#ui-root .act.down .face{transform:translateY(.18em) scale(.95)}
#ui-root .act.on::after,#ui-root .tut-target::after{content:"";position:absolute;inset:-.4em;border:.26em solid var(--gold);border-radius:var(--rr);pointer-events:none;animation:rv-ring .85s ease-out infinite}
#ui-root .act .tarrow,#ui-root .chip .tarrow,#ui-root .joy-ghost .tarrow{display:none}
#ui-root .slock{position:absolute;left:max(1em,env(safe-area-inset-left));bottom:max(1em,env(safe-area-inset-bottom));display:flex;align-items:center;gap:.4em;padding:.15em .8em .15em .4em;
  background:var(--ink);border:.17em solid var(--gold);border-radius:2em;font-size:.82em;font-weight:900;color:var(--gold);pointer-events:none}
#ui-root .slock .ic{font-size:1.4em}
#ui-root .khint{position:absolute;right:max(1em,env(safe-area-inset-right));bottom:calc(max(1em,env(safe-area-inset-bottom)) + 6.7em);display:flex;align-items:center;gap:.45em;font-size:.78em;font-weight:900;pointer-events:none}
#ui-root .kk{display:block;min-width:2.3em;padding:.08em .5em .02em;background:var(--cream);color:var(--ink);border:.17em solid var(--ink);border-bottom-width:.3em;border-radius:.45em;font-weight:900;text-align:center;white-space:nowrap}
#ui-root .khint.on .kk{background:var(--gold)}
#ui-root .touch .slock,#ui-root .touch .khint{display:none}
/* По просьбе пользователя подсказки «Ctrl / Shift Lock» на экране не показываются (Ctrl по-прежнему работает). */
#ui-root .slock,#ui-root .khint{display:none !important}
#ui-root .tut-target>.tarrow{display:block}
#ui-root .touch .act.action>.tarrow{display:none}
#ui-root .tarrow{position:absolute;left:50%;bottom:calc(100% + .5em);width:1.8em;height:1.8em;margin-left:-.9em;overflow:visible;z-index:3;animation:rv-bob .55s ease-in-out infinite alternate}
#ui-root .chip .tarrow{bottom:auto;left:auto;right:calc(100% + .45em);top:50%;margin:-.9em 0 0;transform:rotate(-90deg);animation:none}

/* мобильные кнопки */
#ui-root .touch .acts{display:block;width:13.4em;height:13.9em;gap:0}
#ui-root .touch .act{--rr:50%;position:absolute;pointer-events:auto;gap:0;width:var(--sz);height:var(--sz)}
#ui-root .touch .act::before{content:"";position:absolute;inset:-.55em;border-radius:50%}
#ui-root .touch .act .face{width:100%;height:100%;border-radius:50%;border-width:.24em;box-shadow:inset 0 0 0 .3em var(--ac),0 .35em 0 rgba(0,0,0,.35)}
#ui-root .touch .act .ico{font-size:calc(var(--sz) * .5)}
#ui-root .touch .act .key,#ui-root .touch .act .pbar{display:none}
#ui-root .touch .act .ring{display:block}
#ui-root .touch .act .lab{display:block;position:absolute;left:50%;bottom:-.75em;transform:translateX(-50%);padding:.1em .65em .12em;background:var(--ink);border-radius:1em;
  font-size:.78em;font-weight:900;letter-spacing:.04em;white-space:nowrap;color:#fff}
#ui-root .touch .act .cons{left:-.2em;top:-.5em}
#ui-root .touch .act.dash{--sz:4.9em;right:8em;bottom:1.2em}
#ui-root .touch .act.action{--sz:6.3em;right:0;bottom:1.4em}
#ui-root .touch .act.ability{--sz:4.9em;right:3.4em;bottom:8.9em}
#ui-root .touch .hint{left:max(.8em,env(safe-area-inset-left));right:14.4em;bottom:max(1em,env(safe-area-inset-bottom))}
@media (min-width:760px){#ui-root .hint{left:15.8em}}
@media (orientation:portrait){#ui-root .touch .hint{left:max(.8em,env(safe-area-inset-left));right:max(.8em,env(safe-area-inset-right));bottom:calc(max(1em,env(safe-area-inset-bottom)) + 15.6em)}}

/* джойстик */
#ui-root .joy-zone{display:none;position:absolute;left:0;top:0;width:min(50%,calc(100% - 14em));height:100%;touch-action:none;pointer-events:none}
#ui-root .touch .joy-zone{display:block;pointer-events:auto}
#ui-root .joy-ghost{display:none;position:absolute;left:max(2.4em,calc(env(safe-area-inset-left) + 1.4em));bottom:max(2.6em,calc(env(safe-area-inset-bottom) + 1.6em));
  width:9em;height:9em;border-radius:50%;border:.28em dashed rgba(255,255,255,.7);background:rgba(22,26,34,.2);opacity:.75;transition:opacity .15s;pointer-events:none;--rr:50%}
#ui-root .touch .joy-ghost{display:block}
#ui-root .joy-ghost::before{content:"";position:absolute;left:50%;top:50%;width:3.6em;height:3.6em;margin:-1.8em 0 0 -1.8em;border-radius:50%;background:rgba(255,247,230,.55);border:.2em solid var(--ink)}
#ui-root .joy-ghost.hid{opacity:0}
#ui-root .joy{position:absolute;left:0;top:0;width:0;height:0;opacity:0;pointer-events:none;will-change:transform;transition:opacity .1s}
#ui-root .joy.on{opacity:1}
#ui-root .joy-base{position:absolute;left:-5.9em;top:-5.9em;width:11.8em;height:11.8em;border-radius:50%;border:.28em solid rgba(22,26,34,.72);background:rgba(255,255,255,.2);
  box-shadow:inset 0 0 0 .3em rgba(255,255,255,.28)}
#ui-root .joy-knob{position:absolute;left:-1.9em;top:-1.9em;width:3.8em;height:3.8em;border-radius:50%;background:var(--cream);border:.24em solid var(--ink);
  box-shadow:0 .28em 0 rgba(0,0,0,.35),inset 0 .22em 0 #fff;will-change:transform}
#ui-root .wasd{position:absolute;left:max(2em,calc(env(safe-area-inset-left) + 1.4em));bottom:max(4.6em,calc(env(safe-area-inset-bottom) + 3.8em));
  display:grid;grid-template-columns:repeat(3,2.7em);gap:.3em;pointer-events:none}
#ui-root .wasd .kc{height:2.7em;display:grid;place-items:center;background:var(--cream);color:var(--ink);border:.2em solid var(--ink);border-bottom-width:.34em;border-radius:.5em;
  font-size:1.1em;font-weight:900;animation:rv-key .9s ease-in-out infinite alternate}
#ui-root .wasd .kc:nth-child(1){grid-area:1 / 2}#ui-root .wasd .kc:nth-child(2){grid-area:2 / 1}
#ui-root .wasd .kc:nth-child(3){grid-area:2 / 2;animation-delay:.15s}#ui-root .wasd .kc:nth-child(4){grid-area:2 / 3;animation-delay:.3s}

/* ---------- туториал ---------- */
#ui-root .tut{position:absolute;z-index:5;left:0;right:0;top:calc(max(.6em,env(safe-area-inset-top)) + 9.6em);display:flex;justify-content:center;
  padding:0 max(.8em,env(safe-area-inset-right)) 0 max(.8em,env(safe-area-inset-left))}
#ui-root .tut-card{pointer-events:none;display:flex;flex-wrap:wrap;align-items:center;gap:.5em .7em;width:min(34em,100%);padding:.6em .8em;background:var(--cream);color:var(--ink);
  border:.24em solid var(--ink);border-radius:1em;box-shadow:0 .35em 0 rgba(0,0,0,.35);rotate:-.7deg}
#ui-root .tut-step{flex:none;min-width:3em;padding:.2em .5em .22em;background:var(--blue);color:#fff;border:.18em solid var(--ink);border-radius:.7em;text-align:center;font-size:.9em;font-weight:900;
  -webkit-text-stroke:.12em var(--ink);paint-order:stroke fill}
#ui-root .tut-text{flex:1 1 9em;min-width:0;font-size:1.05em;font-weight:800;line-height:1.22}
#ui-root .tut-text b{color:var(--blue-d)}
#ui-root .tut-skip{flex:none;font-size:.8em;min-height:2.7em;margin-left:auto;pointer-events:auto}
#ui-root .tut-skip::after{content:"";position:absolute;inset:-.5em}

/* ---------- экраны ---------- */
#ui-root .menu{position:absolute;inset:0;z-index:10;display:flex;flex-direction:column;align-items:center;
  padding:max(.5em,env(safe-area-inset-top)) max(1em,env(safe-area-inset-right)) max(1em,env(safe-area-inset-bottom)) max(1em,env(safe-area-inset-left));
  background:linear-gradient(rgba(8,16,26,.4),rgba(8,16,26,0) 26%,rgba(8,16,26,0) 60%,rgba(8,16,26,.5))}
#ui-root .bunting{position:absolute;left:0;right:0;top:0;height:2.7em;background:url("${GAMEUI_BUNTING}") repeat-x 0 0 / auto 100%;transform-origin:50% 0;animation:rv-sway 5s ease-in-out infinite}
#ui-root .menu-top{position:relative;width:100%;display:flex;justify-content:space-between;align-items:flex-start;gap:.6em;margin-top:2.1em}
#ui-root .prof{display:flex;align-items:center;gap:.7em;min-width:0}
#ui-root .bib{position:relative;flex:none;width:3.9em;height:4.2em;display:flex;flex-direction:column;align-items:center;justify-content:center;
  background:var(--cream);color:var(--ink);border:.22em solid var(--ink);border-radius:.4em;box-shadow:0 .3em 0 rgba(0,0,0,.35);rotate:-4deg}
#ui-root .bib::before{content:"";position:absolute;left:.3em;top:.3em;width:.3em;height:.3em;border-radius:50%;background:var(--ink);
  box-shadow:2.7em 0 0 var(--ink),0 2.95em 0 var(--ink),2.7em 2.95em 0 var(--ink)}
#ui-root .bib small{font-size:.6em;font-weight:900;letter-spacing:.1em;line-height:1}
#ui-root .bib b{font-size:1.75em;line-height:1;font-weight:900}
#ui-root .prof-info{display:flex;flex-direction:column;gap:.45em;min-width:0}
#ui-root .xpbar{position:relative;width:min(10.5em,34vw);height:1.5em;background:var(--ink);border:.2em solid var(--ink);border-radius:1em;overflow:hidden;box-shadow:0 .2em 0 rgba(0,0,0,.35)}
#ui-root .xpfill{position:absolute;inset:0;background:var(--green);transform-origin:0 50%;transform:scaleX(0);transition:transform .6s cubic-bezier(.2,.8,.2,1)}
#ui-root .xpbar span{position:relative;display:block;text-align:center;font-size:.72em;line-height:1.5;font-weight:900;white-space:nowrap}
#ui-root .wins{display:flex;align-items:center;gap:.4em;font-size:.9em;font-weight:900}
#ui-root .wins .ic{font-size:1.4em}
#ui-root .menu-cur{display:flex;align-items:center;gap:.5em;flex-wrap:wrap;justify-content:flex-end}

#ui-root .logo{position:relative;display:flex;flex-direction:column;align-items:center;margin-top:1em}
#ui-root .logo .lp{position:relative;isolation:isolate;padding:.02em .5em .1em;font-weight:900;line-height:1;text-transform:uppercase;letter-spacing:.02em;
  -webkit-text-stroke:.1em var(--ink);paint-order:stroke fill;text-shadow:0 .06em 0 var(--ink)}
#ui-root .logo .lp::before{content:"";position:absolute;inset:0;z-index:-1;background:var(--lc);border:.06em solid var(--ink);border-radius:.18em;transform:skewX(-9deg);
  box-shadow:0 .08em 0 rgba(0,0,0,.4),inset 0 .07em 0 rgba(255,255,255,.38)}
#ui-root .logo .la{--lc:var(--red);font-size:min(3.9em,13.5vw);rotate:-3deg}
#ui-root .logo .lb{--lc:var(--blue);font-size:min(3.1em,10.5vw);rotate:2deg;margin-top:-.1em;margin-left:1em}
#ui-root .logo .lc{--lc:var(--gold);font-size:min(1.45em,5vw);rotate:-2deg;margin-top:.3em;letter-spacing:.24em;padding-left:.75em;-webkit-text-stroke:.12em var(--ink)}
#ui-root .logo .tagline{margin-top:.55em;font-size:.95em;font-weight:900;text-align:center}
#ui-root .logo .line{width:min(16em,64vw);height:.55em;margin-top:.45em;border:.17em solid var(--ink);border-radius:1em;
  background:repeating-linear-gradient(90deg,#fff 0 .6em,#2a3140 .6em 1.2em)}
@media (min-aspect-ratio:1/1) and (min-width:760px){
  #ui-root .logo{position:absolute;left:0;right:0;top:calc(max(.5em,env(safe-area-inset-top)) + 5.2em);margin:0 auto;width:fit-content}
}
@media (max-height:480px){
  #ui-root .logo{flex-direction:row;flex-wrap:wrap;justify-content:center;align-items:center;margin-top:.6em}
  #ui-root .logo .la{font-size:min(2.9em,10vw)}#ui-root .logo .lb{font-size:min(2.4em,8.5vw);margin:0 0 0 -.3em}
  #ui-root .logo .lc{position:absolute;right:-.4em;bottom:-.95em;margin:0;font-size:.95em}
  #ui-root .logo .tagline,#ui-root .logo .line{display:none}
}
/* Низкий альбомный экран: логотип меньше и ниже верхней панели — не наезжает на монеты и кристаллы. */
@media (min-aspect-ratio:1/1) and (max-height:480px){
  #ui-root .logo{top:calc(max(.5em,env(safe-area-inset-top)) + 4.4em)}
  #ui-root .logo .la{font-size:min(2.3em,8vw)}#ui-root .logo .lb{font-size:min(1.9em,6.8vw)}
  #ui-root .logo .lc{font-size:.8em}
}

#ui-root .btn.play{overflow:hidden;font-size:2.1em;min-height:2.2em;border-width:.14em;border-radius:.5em;gap:.3em;animation:rv-breathe 2.2s ease-in-out infinite;-webkit-text-stroke:.09em var(--ink)}
#ui-root .btn.play .ic{font-size:.9em}
#ui-root .btn.play .sh{position:absolute;top:-10%;bottom:-10%;left:-40%;width:28%;background:linear-gradient(90deg,transparent,rgba(255,255,255,.6),transparent);
  transform:skewX(-20deg);animation:rv-shine 3.2s ease-in-out infinite;pointer-events:none}

/* магазин */
#ui-root .shopscr{position:absolute;inset:0;z-index:11;display:flex;justify-content:center;align-items:center;pointer-events:auto;background:rgba(8,16,26,.58);
  padding:max(.6em,env(safe-area-inset-top)) max(.6em,env(safe-area-inset-right)) max(.6em,env(safe-area-inset-bottom)) max(.6em,env(safe-area-inset-left))}
#ui-root .shop-panel{position:relative;display:flex;flex-direction:column;width:min(62em,100%);height:min(100%,46em);background:var(--cream);color:var(--ink);
  border:.3em solid var(--ink);border-radius:1.2em;box-shadow:0 .5em 0 rgba(0,0,0,.4);overflow:hidden}
#ui-root .shop-head{flex:none;display:flex;flex-wrap:wrap;align-items:center;gap:.5em;padding:.55em .65em;background:var(--ink)}
#ui-root .shop-title{display:flex;align-items:center;gap:.4em;margin-right:auto;font-size:1.3em;font-weight:900;letter-spacing:.03em;color:#fff;min-width:0}
#ui-root .shop-title .ic{font-size:1.3em}
#ui-root .shop-head .chip{background:#2a3140;box-shadow:none}
#ui-root .tabs{flex:none;display:flex;gap:.4em;padding:.6em .7em 0;background:var(--cream-d);border-bottom:.22em solid var(--ink)}
#ui-root .tab{pointer-events:auto;flex:1 1 0;min-width:0;display:flex;align-items:center;justify-content:center;gap:.4em;padding:.5em .3em .5em;margin:0;
  border:.2em solid var(--ink);border-bottom:0;border-radius:.8em .8em 0 0;background:#cdbd95;color:var(--ink);font:inherit;font-size:.95em;font-weight:900;cursor:pointer;
  transform:translateY(.22em);touch-action:manipulation;white-space:nowrap;overflow:hidden}
#ui-root .tab .ic{font-size:1.3em}
#ui-root .tab span{overflow:hidden;text-overflow:ellipsis}
#ui-root .tab.on{background:var(--cream);box-shadow:inset 0 .3em 0 var(--tc)}
#ui-root .tab:focus{outline:none}
#ui-root .shop-list{flex:1;min-height:0;overflow-y:auto;overflow-x:hidden;overscroll-behavior:contain;touch-action:pan-y;-webkit-overflow-scrolling:touch;
  padding:.8em .7em 1em;display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,25em),1fr));gap:.75em .8em;align-content:start}
#ui-root .item{position:relative;display:flex;align-items:stretch;background:#fff;border:.2em solid var(--ink);border-radius:.9em;box-shadow:0 .3em 0 rgba(0,0,0,.2);min-height:5.4em}
#ui-root .item.equipped{box-shadow:0 .3em 0 rgba(0,0,0,.2),0 0 0 .22em var(--ac)}
#ui-root .stub{position:relative;flex:none;width:4.6em;display:grid;place-items:center;background:var(--ac);border-right:.2em dashed rgba(22,26,34,.6);border-radius:.7em 0 0 .7em}
#ui-root .stub .ic{font-size:2.6em}
#ui-root .stub::before,#ui-root .stub::after{content:"";position:absolute;right:-.62em;width:1em;height:1em;border-radius:50%;background:var(--cream);border:.2em solid var(--ink)}
#ui-root .stub::before{top:-.62em}#ui-root .stub::after{bottom:-.62em}
#ui-root .ibody{flex:1;min-width:0;padding:.55em .7em .55em .9em;display:flex;flex-direction:column;justify-content:center;gap:.2em}
#ui-root .iname{display:flex;align-items:center;flex-wrap:wrap;gap:.2em .45em;font-size:1.05em;font-weight:900;line-height:1.1}
#ui-root .idesc{font-size:.82em;font-weight:700;line-height:1.2;color:#4b5263}
#ui-root .istock{font-size:.78em;font-weight:900;color:var(--gold-d)}
#ui-root .tag{display:inline-block;padding:.12em .6em .15em;border-radius:1em;background:var(--green);color:#fff;border:.15em solid var(--ink);font-size:.62em;font-weight:900;text-transform:uppercase;letter-spacing:.04em;
  -webkit-text-stroke:.1em var(--ink);paint-order:stroke fill}
#ui-root .iside{flex:none;width:7.3em;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:.3em;padding:.5em .6em}
#ui-root .iside .btn{width:100%}
#ui-root .need{display:flex;align-items:center;justify-content:center;flex-wrap:wrap;gap:.2em;text-align:center;font-size:.68em;line-height:1.1;font-weight:800;color:var(--red-d)}
#ui-root .need .ic{font-size:1.25em}
#ui-root .stamp{display:inline-block;rotate:-7deg;padding:.2em .5em .22em;border:.2em solid var(--sc,var(--green-d));border-radius:.4em;color:var(--sc,var(--green-d));
  font-size:.8em;font-weight:900;text-transform:uppercase;text-align:center;letter-spacing:.04em;line-height:1.05}

/* модальные окна */
#ui-root .modal{position:absolute;inset:0;display:flex;z-index:13;pointer-events:auto;overflow-y:auto;overscroll-behavior:contain;background:rgba(8,14,24,.6);
  padding:max(.8em,env(safe-area-inset-top)) max(.8em,env(safe-area-inset-right)) max(.8em,env(safe-area-inset-bottom)) max(.8em,env(safe-area-inset-left))}
#ui-root .card{position:relative;margin:auto;background:var(--cream);color:var(--ink);border:.3em solid var(--ink);border-radius:1.2em;box-shadow:0 .5em 0 rgba(0,0,0,.4)}
#ui-root .ribbon{position:absolute;left:0;right:0;top:-1.7em;margin:0 auto;width:fit-content;max-width:calc(100% + .6em);text-align:center;isolation:isolate;
  padding:.1em .7em .2em;font-size:2em;font-weight:900;line-height:1.05;text-transform:uppercase;rotate:-2deg;color:#fff}
#ui-root .ribbon::before{content:"";position:absolute;inset:0;z-index:-1;background:var(--rb,var(--gold));border:.09em solid var(--ink);border-radius:.2em;transform:skewX(-8deg);
  box-shadow:0 .1em 0 rgba(0,0,0,.35),inset 0 .08em 0 rgba(255,255,255,.4),inset 0 -.1em 0 rgba(0,0,0,.18)}

/* выбор героя */
#ui-root .hero{z-index:12;padding-top:calc(max(.8em,env(safe-area-inset-top)) + 2.4em)}
#ui-root .hero-card{width:min(27em,100%);padding:3em 1em 1em;text-align:center;rotate:-1deg}
#ui-root .hero-badge{position:absolute;left:0;right:0;top:-2.2em;margin:0 auto;width:4.4em;height:4.4em;display:grid;place-items:center;border-radius:50%;background:var(--gold);border:.28em solid var(--ink);box-shadow:0 .3em 0 rgba(0,0,0,.35)}
#ui-root .hero-badge .ic{font-size:2.6em}
#ui-root .hero-title{font-size:1.7em;font-weight:900;line-height:1.05;color:#fff;text-wrap:balance}
#ui-root .hero-text{margin:.45em 0 .9em;font-size:1.1em;font-weight:800;line-height:1.25;text-wrap:balance}
#ui-root .hero-btns{display:grid;grid-template-columns:1fr 1fr;gap:.8em}
#ui-root .hero-btns .btn{min-height:3.6em;padding:.4em .5em}
#ui-root .hb{display:flex;flex-direction:column;align-items:center;gap:.1em}
#ui-root .hb small{display:inline-flex;align-items:center;gap:.25em;font-size:.72em;font-weight:900}
#ui-root .hb small .ic{font-size:1.3em}
#ui-root .hero-time{position:relative;margin-top:1em;height:1.3em;border:.2em solid var(--ink);border-radius:1em;background:#e1d3ae;overflow:hidden}
#ui-root .hero-bar{position:absolute;inset:0;background:var(--orange);transform-origin:0 50%}
#ui-root .hero-sec{position:relative;display:block;text-align:center;font-size:.78em;line-height:1.5;font-weight:900;color:var(--ink)}

/* результаты */
#ui-root .results{z-index:13;padding-top:calc(max(.8em,env(safe-area-inset-top)) + 3em)}
#ui-root .res-card{width:min(34em,100%);padding:2.8em 1em 1em}
#ui-root .res-card .ribbon{--rb:var(--gold)}
#ui-root .results.lose .ribbon{--rb:#6d7790}
#ui-root .res-title{margin:.2em 0 .1em;text-align:center;font-size:1.15em;font-weight:900;line-height:1.15;text-wrap:balance}
#ui-root .res-role{display:flex;justify-content:center;margin-bottom:.5em}
#ui-root .res-role span{display:inline-flex;align-items:center;gap:.4em;padding:.1em .8em .12em .25em;border:.18em solid var(--ink);border-radius:2em;background:var(--blue);font-size:.82em;font-weight:900;
  -webkit-text-stroke:.1em var(--ink);paint-order:stroke fill}
#ui-root .res-role span.chaser{background:var(--red)}
#ui-root .res-role .rc{display:grid;place-items:center;width:1.7em;height:1.7em;border-radius:50%;background:var(--cream);border:.14em solid var(--ink);-webkit-text-stroke:0}
#ui-root .res-role .rc .ic{font-size:1.15em}
#ui-root .res-cols{display:flex;flex-direction:column;gap:.7em}
#ui-root .res-stats{padding:.2em .7em;background:#fff;border:.2em solid var(--ink);border-radius:.9em}
#ui-root .srow{display:flex;align-items:baseline;gap:.5em;padding:.4em 0;border-bottom:.15em dotted rgba(22,26,34,.35);font-size:.95em}
#ui-root .srow:last-child{border-bottom:0}
#ui-root .srow .sl{flex:1;min-width:0;font-weight:700;color:#4b5263}
#ui-root .srow .sv{font-weight:900;white-space:nowrap}
#ui-root .res-rew{display:flex;flex-direction:column;gap:.45em}
#ui-root .rew{display:flex;align-items:center;gap:.55em;padding:.25em .7em .25em .45em;border:.2em solid var(--ink);border-radius:.9em;background:#fff}
#ui-root .rew .ic{font-size:1.7em}
#ui-root .rew .rl{flex:1;min-width:0;font-size:.95em;font-weight:800}
#ui-root .rew .rv{font-size:1.35em;font-weight:900;font-variant-numeric:tabular-nums}
#ui-root .rew.coin .rv{color:var(--gold-d)}#ui-root .rew.gem .rv{color:var(--green-d)}#ui-root .rew.xp .rv{color:var(--blue-d)}
#ui-root .rew.lvl{background:var(--ink);color:#fff;border-color:var(--ink)}
#ui-root .mini-bib{flex:none;min-width:2.3em;padding:.05em .3em;background:var(--cream);color:var(--ink);border:.17em solid var(--ink);border-radius:.3em;text-align:center;font-size:1.2em;font-weight:900;rotate:-4deg}
#ui-root .res-next{display:flex;width:100%;margin-top:.9em;min-height:3em}
#ui-root .lvlup{position:absolute;inset:0;z-index:2;display:grid;place-items:center;pointer-events:none;overflow:hidden}
#ui-root .lvlup .rays{position:absolute;left:50%;top:50%;width:150vmax;height:150vmax;margin:-75vmax 0 0 -75vmax;opacity:.75;
  background:repeating-conic-gradient(from 0deg,rgba(255,214,70,.9) 0 9deg,rgba(255,214,70,0) 9deg 18deg);
  -webkit-mask-image:radial-gradient(circle,#000 0,transparent 36%);mask-image:radial-gradient(circle,#000 0,transparent 36%);will-change:transform}
#ui-root .lvlup .lvl-txt{position:relative;text-align:center;font-size:min(2.6em,8vw);font-weight:900;line-height:1.05;text-transform:uppercase;text-wrap:balance;padding:0 1em}
#ui-root .lvlup .lvl-txt small{display:block;margin-top:.15em;font-size:.75em;color:var(--gold)}
#ui-root .confetti{position:absolute;inset:0;z-index:3;pointer-events:none;overflow:hidden}
#ui-root .cf{position:absolute;top:0;width:.7em;height:1.05em;border:.12em solid var(--ink);border-radius:.15em;will-change:transform}
@media (orientation:landscape) and (max-height:520px){
  #ui-root .results{padding-top:calc(max(.5em,env(safe-area-inset-top)) + 2.5em);padding-bottom:max(.5em,env(safe-area-inset-bottom))}
  #ui-root .res-card{width:min(46em,100%);padding:1.7em .9em .7em}
  #ui-root .res-title{margin:.1em 0 0;font-size:1.05em}
  #ui-root .res-role{margin-bottom:.35em}
  #ui-root .res-cols{flex-direction:row;align-items:flex-start;gap:.6em}
  #ui-root .res-cols>*{flex:1 1 0;min-width:0}
  #ui-root .res-rew{gap:.3em}
  #ui-root .rew{padding:.1em .6em .1em .4em}
  #ui-root .res-next{margin-top:.5em;min-height:2.6em}
  #ui-root .ribbon{font-size:1.7em;top:-1.5em}
  #ui-root .srow{padding:.22em 0}
}

/* пауза */
#ui-root .pause{z-index:14;padding-top:calc(max(.8em,env(safe-area-inset-top)) + 3em)}
#ui-root .pause-card{width:min(22em,100%);padding:2.6em 1em 1em;rotate:.5deg}
#ui-root .pause-card .ribbon{--rb:var(--blue)}
#ui-root .pause-btns{display:grid;grid-template-columns:1fr;gap:.8em}
#ui-root .pause-btns .btn{width:100%;min-height:3em}
@media (orientation:landscape) and (max-height:520px){
  #ui-root .pause{padding-top:calc(max(.5em,env(safe-area-inset-top)) + 2.5em)}
  #ui-root .pause-card{width:min(30em,100%);padding:2em .9em .9em}
  #ui-root .pause-btns{grid-template-columns:1fr 1fr;gap:.7em}
  #ui-root .pause-btns .resume{grid-column:1 / -1}
  #ui-root .ribbon{font-size:1.7em;top:-1.5em}
}

/* ---------- адаптив ---------- */
@media (min-width:480px){
  #ui-root .hud-right{flex-direction:row;align-items:center}
  #ui-root .feed{top:calc(max(.6em,env(safe-area-inset-top)) + 4.4em)}
  #ui-root .tut{top:calc(max(.6em,env(safe-area-inset-top)) + 5.6em)}
}
@media (max-width:339px){
  #ui-root .shop-title .tt{display:none}
}
@media (max-width:420px){
  #ui-root .shop-head .chip{font-size:.92em}
  #ui-root .tab .ic{display:none}
  #ui-root .item .iside{width:6.4em}
}

/* ---------- анимации ---------- */
@keyframes rv-pulse{50%{transform:scale(1.16)}}
@keyframes rv-pop{0%{transform:scale(.7)}60%{transform:scale(1.14)}100%{transform:scale(1)}}
@keyframes rv-ring{0%{transform:scale(.88);opacity:1}100%{transform:scale(1.32);opacity:0}}
@keyframes rv-bob{from{transform:translateY(0)}to{transform:translateY(-.55em)}}
@keyframes rv-key{from{transform:translateY(0)}to{transform:translateY(-.25em)}}
@keyframes rv-breathe{50%{transform:scale(1.04)}}
@keyframes rv-shine{0%,55%{transform:translateX(0) skewX(-20deg)}100%{transform:translateX(560%) skewX(-20deg)}}
@keyframes rv-sway{0%,100%{transform:skewX(-.8deg)}50%{transform:skewX(.8deg)}}
@media (prefers-reduced-motion:reduce){
  #ui-root .bunting,#ui-root .btn.play,#ui-root .btn.play .sh,#ui-root .wasd .kc,#ui-root .tarrow{animation:none}
}
`;


// --- Стили мета-экранов: меню-рейка, гардероб, подарок, колесо, рекорды, окна и мелочи. ---
const GAMEUI_CSS_META = `
#ui-root .logo-art{display:block;width:min(36em,88vw);max-height:32vh;object-fit:contain}
#ui-root .meta-art{display:block;width:100%;height:100%;object-fit:contain}
#ui-root .wh-stage .wh-hub{background:transparent;border:0;box-shadow:none}
#ui-root .reward-art{width:5em;height:4em;margin:0 auto .4em}
@media(max-height:520px) and (min-width:560px){#ui-root .logo-art{width:min(24em,55vw);max-height:25vh}}
/* меню: PLAY и вторичные кнопки */
#ui-root .menu-bottom{margin-top:auto;display:flex;flex-direction:column;align-items:stretch;gap:.8em;width:min(30em,100%);padding-bottom:.2em}
#ui-root .mb-center{display:flex;flex-direction:column;align-items:stretch;gap:.55em}
#ui-root .mb-sec{display:grid;grid-template-columns:1fr 1fr;gap:.65em}
#ui-root .mb-l,#ui-root .mb-r{display:contents}
#ui-root .btn.sec{position:relative;justify-content:flex-start;min-height:2.7em;padding:.3em .7em .3em .6em;font-size:.95em;gap:.5em;text-align:left;white-space:nowrap;text-wrap:nowrap}
#ui-root .btn.sec .ic{font-size:1.5em}
#ui-root .btn.purple{--c:#9a5aff}
#ui-root .dot{position:absolute;top:-.55em;right:-.4em;width:1.35em;height:1.35em;border-radius:50%;background:#ff3b3b;border:.2em solid var(--ink);animation:rv-pulse 1s ease-in-out infinite;pointer-events:none}
#ui-root .boost{--c:#2a3140;min-height:2.3em;padding:.2em .8em .2em .6em;font-size:.88em;gap:.45em;text-wrap:balance;-webkit-text-stroke:.08em var(--ink)}
#ui-root .boost .bo-t{font-size:.95em;text-transform:none;font-weight:800;letter-spacing:0;text-align:left}
#ui-root .adtag{display:inline-block;font-size:.66em;font-weight:900;line-height:1;padding:.22em .6em .26em;background:var(--gold);color:#fff;border:.15em solid var(--ink);border-radius:1em;letter-spacing:.03em;-webkit-text-stroke:.12em var(--ink);paint-order:stroke fill;text-shadow:none;white-space:nowrap}
#ui-root .boost-ready{display:flex;align-items:center;justify-content:center;gap:.4em;min-height:2.3em;padding:.2em .8em;background:var(--green-d);border:.2em solid var(--ink);border-radius:2em;font-size:.88em;font-weight:900;
  -webkit-text-stroke:.1em var(--ink);paint-order:stroke fill}
#ui-root .boost-ready .ic{font-size:1.4em}
@media (min-aspect-ratio:1/1){
  #ui-root .menu-bottom{flex-direction:row;align-items:flex-end;justify-content:center;width:auto;max-width:100%;gap:1.2em}
  #ui-root .mb-sec{display:contents}
  #ui-root .mb-l,#ui-root .mb-r{display:flex;flex-direction:column;gap:.55em;flex:none}
  #ui-root .mb-l{order:1}#ui-root .mb-center{order:2}#ui-root .mb-r{order:3}
  #ui-root .mb-center{width:16em;flex:none}
  #ui-root .boost{flex-wrap:wrap;justify-content:center;white-space:normal}
  #ui-root .btn.play{font-size:2.3em;min-width:0}
}
/* узкий альбом (до 700 px): кнопки в ряд PLAY уменьшаются, чтобы весь ряд лежал в безопасной области */
@media (min-aspect-ratio:1/1) and (max-width:699px){
  #ui-root .menu-bottom{gap:.7em}
  #ui-root .mb-center{width:13.5em}
  #ui-root .btn.play{font-size:1.9em}
  #ui-root .btn.sec{font-size:.8em;padding:.25em .5em .25em .4em;gap:.35em}
  #ui-root .mb-l,#ui-root .mb-r{gap:.45em}
}

/* общие окна */
#ui-root .shop-panel.fit{height:auto;max-height:100%}
#ui-root .mbody{flex:1;min-height:0;overflow-y:auto;overflow-x:hidden;overscroll-behavior:contain;touch-action:pan-y;-webkit-overflow-scrolling:touch}
#ui-root .why{font-size:.68em;line-height:1.15;font-weight:800;color:var(--red-d);text-align:center}
#ui-root .why.ok{color:#4b5263}
#ui-root .btn.nocaps{text-transform:none;letter-spacing:0}
#ui-root .btn .bt{display:flex;flex-direction:column;align-items:center;gap:.25em;line-height:1.05}
#ui-root .btn .bt small{font-size:.66em;font-weight:900;letter-spacing:.03em}
#ui-root .popup{z-index:20}
#ui-root .pop-card{width:min(22em,100%);padding:3em 1em 1em;text-align:center;rotate:-.6deg}
#ui-root .pop-card .ribbon{--rb:var(--green)}
#ui-root .pop-body{display:flex;flex-direction:column;align-items:center;gap:.5em;margin:.3em 0 .9em;font-weight:800}
#ui-root .pop-line{display:flex;align-items:center;justify-content:center;gap:.4em;font-size:1.4em;font-weight:900}
#ui-root .pop-line .ic{font-size:1.5em}
#ui-root .pop-line.c b{color:var(--gold-d)}#ui-root .pop-line.g b{color:var(--green-d)}
#ui-root .pop-pv{width:6.5em;height:6.5em;padding:.5em;background:#fff;border:.22em solid var(--ink);border-radius:1em;box-shadow:inset 0 0 0 .22em var(--rc,#8b93a3)}
#ui-root .pop-name{font-size:1.2em;font-weight:900;line-height:1.1}
#ui-root .pop-note{font-size:.85em;color:#4b5263;text-wrap:balance}
#ui-root .toast{position:absolute;z-index:25;left:0;right:0;bottom:calc(max(1em,env(safe-area-inset-bottom)) + 3em);margin:0 auto;width:fit-content;max-width:calc(100% - 2em);padding:.5em 1em;
  background:var(--ink);color:#fff;border-radius:1em;font-size:.95em;font-weight:800;text-align:center;pointer-events:none}
#ui-root .plat{position:absolute;inset:0;z-index:40;display:grid;place-items:center;background:rgba(8,14,24,.88);pointer-events:auto;touch-action:none}
#ui-root .plat span{font-size:min(4.2em,14vw);font-weight:900;letter-spacing:.06em;text-transform:uppercase}
#ui-root .revive-offer{position:absolute;z-index:3;left:0;right:0;bottom:calc(max(1em,env(safe-area-inset-bottom)) + 3.8em);margin:0 auto;width:fit-content;max-width:calc(100% - 1.6em)}
#ui-root .revive-offer .btn{font-size:1.1em;min-height:3em;animation:rv-breathe 1.4s ease-in-out infinite}
#ui-root .touch .revive-offer{bottom:calc(max(1em,env(safe-area-inset-bottom)) + 1.6em)}
#ui-root .res-double{display:flex;width:100%;margin-top:.7em;min-height:2.7em;gap:.5em}
#ui-root .res-double .bt{flex-direction:row;gap:.5em}
#ui-root .res-double.done{--c:var(--green-d)}

/* гардероб: панель справа (альбом) или снизу (портрет), персонаж остаётся свободным */
#ui-root .wardrobe{position:absolute;inset:0;z-index:11}
#ui-root .wd-panel{position:absolute;right:0;top:0;bottom:0;width:58%;pointer-events:auto;display:flex;flex-direction:column;background:var(--cream);color:var(--ink);
  border:.3em solid var(--ink);border-right:0;border-radius:1.2em 0 0 1.2em;box-shadow:0 .5em 0 rgba(0,0,0,.4);overflow:hidden;
  padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) 0;background-clip:padding-box}
@media (max-aspect-ratio:1/1){
  #ui-root .wd-panel{left:0;right:0;top:auto;bottom:0;width:auto;height:60%;border-right:.3em solid var(--ink);border-bottom:0;border-radius:1.2em 1.2em 0 0;padding:0 env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)}
}
#ui-root .wd-tabs{flex:none;display:flex;gap:.3em;padding:.5em .6em 0;background:var(--cream-d);border-bottom:.22em solid var(--ink)}
#ui-root .wd-tabs .tab{padding:.45em .1em}
#ui-root .wd-tabs .tab .ic{display:block;font-size:1.6em}
#ui-root .wd-tabs .tab span{display:none}
#ui-root .wd-sub{flex:none;display:flex;justify-content:space-between;gap:.5em;padding:.45em .9em .05em;font-size:.82em;font-weight:900;color:#4b5263}
#ui-root .wd-grid{flex:1;min-height:0;overflow-y:auto;overflow-x:hidden;overscroll-behavior:contain;touch-action:pan-y;-webkit-overflow-scrolling:touch;
  padding:.6em .7em .7em;display:grid;grid-template-columns:repeat(auto-fill,minmax(6.4em,1fr));gap:.6em;align-content:start}
#ui-root .wcard{--rc:#8b93a3;position:relative;display:flex;flex-direction:column;align-items:center;gap:.15em;margin:0;padding:.35em .25em .4em;background:#fff;color:var(--ink);font:inherit;
  border:.2em solid var(--ink);border-radius:.85em;box-shadow:inset 0 0 0 .24em var(--rc),0 .25em 0 rgba(0,0,0,.2);cursor:pointer;touch-action:manipulation;pointer-events:auto;transition:transform .08s}
#ui-root .wcard.r-rare{--rc:#2f8cff}#ui-root .wcard.r-epic{--rc:#a05cff}#ui-root .wcard.r-legendary{--rc:#ffc83d}#ui-root .wcard.r-mythic{--rc:#ff3b8a}
/* мифические: переливающаяся рамка и плашка «МИФ» */
#ui-root .wcard.r-mythic{background:linear-gradient(160deg,#fff0f8,#efe6ff 55%,#e6fbff);border-color:transparent;box-shadow:0 0 0 .22em #ff3b8a,0 0 0 .44em var(--ink),0 .45em 0 .2em rgba(0,0,0,.3);animation:rv-myth 2.4s linear infinite}
#ui-root .wcard.r-mythic::before{content:"✦✦✦";position:absolute;left:50%;top:-.65em;transform:translateX(-50%);padding:.08em .5em;border-radius:1em;background:linear-gradient(90deg,#ff3b8a,#a05cff,#2fb5c9);color:#fff;font-size:.62em;font-weight:900;letter-spacing:.06em;border:.15em solid var(--ink);white-space:nowrap;z-index:2}
#ui-root .wcard.r-mythic::after{content:"";position:absolute;inset:0;border-radius:.6em;pointer-events:none;background:linear-gradient(105deg,transparent 35%,rgba(255,255,255,.8) 50%,transparent 65%);transform:translateX(-120%);animation:rv-glint 2.2s ease-in-out infinite}
@keyframes rv-myth{0%{box-shadow:0 0 0 .22em #ff3b8a,0 0 0 .44em var(--ink),0 .45em 0 .2em rgba(0,0,0,.3)}33%{box-shadow:0 0 0 .22em #a05cff,0 0 0 .44em var(--ink),0 .45em 0 .2em rgba(0,0,0,.3)}66%{box-shadow:0 0 0 .22em #2fb5c9,0 0 0 .44em var(--ink),0 .45em 0 .2em rgba(0,0,0,.3)}100%{box-shadow:0 0 0 .22em #ff3b8a,0 0 0 .44em var(--ink),0 .45em 0 .2em rgba(0,0,0,.3)}}
#ui-root .wcard:active{transform:translateY(.18em)}
#ui-root .wcard.sel{transform:translateY(-.22em);outline:.24em solid var(--ink);outline-offset:.1em;background:#fffbe6}
#ui-root .wcard:focus{outline:none}
#ui-root .wcard.sel:focus{outline:.24em solid var(--ink);outline-offset:.1em}
#ui-root .wcard.r-legendary::after{content:"";position:absolute;inset:0;border-radius:.6em;pointer-events:none;overflow:hidden;
  background:linear-gradient(105deg,transparent 40%,rgba(255,255,255,.7) 50%,transparent 60%);transform:translateX(-120%);animation:rv-glint 3.2s ease-in-out infinite}
#ui-root .pv{display:block;width:4.4em;height:4.4em;flex:none}
#ui-root .pvi,#ui-root .pvs{display:block;width:100%;height:100%}
#ui-root .pvi img,#ui-root .pvi canvas,#ui-root .pvs svg,#ui-root .pvi .ic{display:block;width:100%;height:100%;object-fit:contain}
#ui-root .pvs svg{overflow:visible}
#ui-root .wn{max-width:100%;font-size:.7em;font-weight:900;line-height:1.1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
#ui-root .ws{display:flex;align-items:center;justify-content:center;gap:.25em;font-size:.68em;font-weight:900;line-height:1.1;min-height:1.6em}
#ui-root .ws .ic{font-size:1.3em}
#ui-root .ws.own{color:var(--green-d)}#ui-root .ws.poor{color:var(--red-d)}
#ui-root .wad{display:flex;flex-direction:column;align-items:center;gap:.1em;width:100%}
#ui-root .wad small{font-size:.58em;font-weight:900;letter-spacing:.04em;text-transform:uppercase;color:#4b5263}
#ui-root .wprog{position:relative;width:86%;height:1.05em;border:.15em solid var(--ink);border-radius:1em;background:#e1d3ae;overflow:hidden}
#ui-root .wprog i{position:absolute;inset:0;background:var(--orange);transform-origin:0 50%}
#ui-root .wprog b{position:relative;display:block;text-align:center;font-size:.62em;line-height:1.55;font-weight:900;color:var(--ink)}
#ui-root .wcm{position:absolute;top:-.5em;right:-.4em;width:1.55em;height:1.55em;display:grid;place-items:center;border-radius:50%;background:var(--green);border:.17em solid var(--ink)}
#ui-root .wcm .ic{font-size:.95em}
#ui-root .wcard.eq .wcm{background:var(--gold)}
#ui-root .wd-detail{flex:none;display:flex;align-items:center;gap:.6em;padding:.55em .7em;background:#fff;border-top:.22em solid var(--ink);--rc:#8b93a3}
#ui-root .wd-detail .pv{width:4.4em;height:4.4em;padding:.25em;background:var(--cream);border:.2em solid var(--ink);border-radius:.8em;box-shadow:inset 0 0 0 .2em var(--rc)}
#ui-root .wd-info{flex:1;min-width:0;display:flex;flex-direction:column;gap:.2em;align-items:flex-start}
#ui-root .wd-name{font-size:clamp(.82em,3.2vw,1.05em);font-weight:900;line-height:1.1;overflow-wrap:normal;word-break:normal;hyphens:auto}
#ui-root .wd-rar{display:inline-block;font-size:.68em;font-weight:900;color:#fff;background:var(--rc);border:.15em solid var(--ink);border-radius:1em;padding:.08em .65em .1em;text-transform:uppercase;letter-spacing:.04em;
  -webkit-text-stroke:.1em var(--ink);paint-order:stroke fill}
#ui-root .wd-try{font-size:.66em;font-weight:800;color:#4b5263}
#ui-root .wd-act{flex:none;display:flex;flex-direction:column;align-items:stretch;gap:.25em;width:min(11.5em,44%)}
#ui-root .wd-act .btn{width:100%;min-height:2.6em;font-size:.88em;padding:.3em .5em}

@media (min-aspect-ratio:1/1) and (max-width:659px){
  #ui-root .wd-panel .shop-title .tt{display:none}
}
@media (max-height:420px){
  #ui-root .wd-panel .shop-head{padding:.3em .5em}
  #ui-root .wd-panel .shop-head .btn.round{font-size:.85em}
  #ui-root .wd-tabs{padding:.35em .5em 0}
  #ui-root .wd-tabs .tab{padding:.25em .1em}
  #ui-root .wd-sub{padding:.25em .8em 0}
  #ui-root .wd-grid{padding:.5em .6em .6em;gap:.5em;grid-template-columns:repeat(auto-fill,minmax(6em,1fr))}
  #ui-root .wcard{padding:.25em .2em .3em}
  #ui-root .wcard .pv{width:3.4em;height:3.4em}
  #ui-root .wd-detail{padding:.4em .6em}
  #ui-root .wd-detail .pv{width:3.6em;height:3.6em}
}

/* подарок дня */
#ui-root .dy-wrap{display:flex;flex-direction:column;gap:.8em;padding:.8em .8em .9em}
#ui-root .dy-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:.65em}
#ui-root .dtile{position:relative;display:flex;flex-direction:column;align-items:center;min-height:6.4em;background:#fff;border:.2em solid var(--ink);border-radius:.9em;box-shadow:0 .25em 0 rgba(0,0,0,.2)}
#ui-root .dtile .dh{width:100%;padding:.15em 0 .18em;background:var(--ink);color:#fff;border-radius:.65em .65em 0 0;font-size:.7em;font-weight:900;text-align:center;letter-spacing:.06em;text-transform:uppercase}
#ui-root .dtile .db{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:.1em;padding:.3em .2em;text-align:center}
#ui-root .dico{display:grid;place-items:center;width:2.7em;height:2.7em;color:var(--ink)}
#ui-root .dico .ic{font-size:2.5em}
#ui-root .dico .pv{width:2.9em;height:2.9em}
#ui-root .da{display:inline-flex;align-items:center;gap:.2em;font-size:.95em;font-weight:900;color:var(--ink)}
#ui-root .da .ic{font-size:1.15em}
#ui-root .dn{max-width:100%;font-size:.7em;font-weight:900;line-height:1.1;color:#4b5263;overflow-wrap:anywhere}
#ui-root .dtile.done{opacity:.6;filter:grayscale(.55)}
#ui-root .dtile.future{opacity:.85}
#ui-root .dtile.today{box-shadow:0 0 0 .25em var(--gold),0 .25em 0 rgba(0,0,0,.2)}
#ui-root .dtile.today .dh{background:var(--orange)}
#ui-root .dtile.today::after,#ui-root .dtile.next::after{content:"";position:absolute;inset:-.35em;border:.24em solid var(--gold);border-radius:1.1em;pointer-events:none;animation:rv-ring 1.1s ease-out infinite}
#ui-root .dtile.next::after{border-color:#b8c0cf;animation-duration:1.8s}
#ui-root .dchk{position:absolute;right:.35em;bottom:.35em;width:1.7em;height:1.7em;display:grid;place-items:center;border-radius:50%;background:var(--green);border:.18em solid var(--ink)}
#ui-root .dchk .ic{font-size:1em}
#ui-root .dtile.big{grid-column:1 / -1;min-height:9.4em;background:#fff8dc}
#ui-root .dtile.big .dh{background:var(--red)}
#ui-root .dtile.big .dico{width:5.4em;height:5.4em}
#ui-root .dtile.big .dico .pv{width:5.4em;height:5.4em}
#ui-root .dtile.big .dn{font-size:.95em;color:var(--ink)}
#ui-root .dgoal{font-size:.62em;font-weight:900;letter-spacing:.06em;text-transform:uppercase;color:var(--red-d)}
#ui-root .dy-foot{display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:.6em .7em}
#ui-root .dy-foot .why{flex:1 1 100%}
#ui-root .dy-next{width:100%;padding:.55em .8em;background:var(--ink);color:#fff;border-radius:.9em;text-align:center;font-size:.95em;font-weight:800}
#ui-root .dy-next b{color:var(--gold);font-variant-numeric:tabular-nums}
@media (orientation:landscape) and (min-width:520px){
  #ui-root .dy-grid{grid-template-columns:repeat(3,1fr) 1.4fr}
  #ui-root .dtile.big{grid-column:4;grid-row:1 / span 2;min-height:0}
}

/* колесо фортуны */
#ui-root .wh-wrap{display:flex;flex-direction:column;align-items:center;gap:.9em;padding:1.3em .8em .9em}
#ui-root .wh-stage{position:relative;flex:none;width:min(20em,76vw,48vh);aspect-ratio:1}
#ui-root .wh-cv{display:block;width:100%;height:100%;will-change:transform}
#ui-root .wh-ptr{position:absolute;left:50%;top:-1.1em;width:2.6em;height:3em;margin-left:-1.3em;z-index:2;object-fit:contain;overflow:visible;transform-origin:50% 25%}
#ui-root .wh-hub{position:absolute;left:50%;top:50%;width:21%;height:21%;margin:-10.5% 0 0 -10.5%;display:grid;place-items:center;border-radius:50%;background:var(--cream);border:.25em solid var(--ink);box-shadow:0 .2em 0 rgba(0,0,0,.35)}
#ui-root .wh-hub .ic{font-size:1.7em}
#ui-root .wh-ctl{display:flex;flex-direction:column;align-items:stretch;gap:.5em;width:min(21em,100%)}
#ui-root .wh-ctl .btn{width:100%}
@media (orientation:landscape) and (max-height:520px){
  #ui-root .wh-wrap{flex-direction:row;justify-content:center;gap:1.6em;padding:1.2em .8em .7em}
  #ui-root .wh-stage{width:min(17em,60vh)}
  #ui-root .wh-ctl{width:min(15em,48%)}
}

/* рекорды */
#ui-root .lb-wrap{display:flex;flex-direction:column;gap:.5em;padding:.7em .8em .9em}
#ui-root .lb-msg{padding:1.4em .5em;text-align:center;font-size:1.05em;font-weight:800;color:#4b5263;text-wrap:balance}
#ui-root .lb-login{align-self:center}
#ui-root .lb-row{display:flex;align-items:center;gap:.6em;padding:.35em .6em .35em .4em;background:#fff;border:.2em solid var(--ink);border-radius:.8em}
#ui-root .lb-row.me{background:#fff3c4;box-shadow:0 0 0 .2em var(--gold)}
#ui-root .lb-rank{flex:none;min-width:2em;height:2em;padding:0 .3em;display:grid;place-items:center;border-radius:1em;background:var(--cream-d);border:.17em solid var(--ink);font-size:.9em;font-weight:900}
#ui-root .lb-row.r1 .lb-rank{background:var(--gold)}#ui-root .lb-row.r2 .lb-rank{background:#cfd6e2}#ui-root .lb-row.r3 .lb-rank{background:#e0955a}
#ui-root .lb-av{flex:none;width:2.3em;height:2.3em;display:grid;place-items:center;border-radius:50%;border:.17em solid var(--ink);overflow:hidden;color:#fff;font-weight:900;
  -webkit-text-stroke:.1em var(--ink);paint-order:stroke fill}
#ui-root .lb-av img{display:block;width:100%;height:100%;object-fit:cover}
#ui-root .lb-name{flex:1;min-width:0;font-size:.98em;font-weight:900;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
#ui-root .lb-score{flex:none;font-size:1.05em;font-weight:900;font-variant-numeric:tabular-nums;color:var(--blue-d)}

@keyframes rv-glint{0%,55%{transform:translateX(-120%)}100%{transform:translateX(120%)}}
@media (prefers-reduced-motion:reduce){
  #ui-root .dot,#ui-root .revive-offer .btn,#ui-root .wcard.r-legendary::after,#ui-root .wcard.r-mythic,#ui-root .wcard.r-mythic::after,#ui-root .dtile.today::after,#ui-root .dtile.next::after{animation:none}
}

/* настройки */
#ui-root .shopscr.top{z-index:15}
#ui-root .shop-panel.sm{width:min(26em,100%)}
#ui-root .set-body{display:flex;flex-direction:column;gap:.7em;padding:.9em .9em 1em}
#ui-root .set-row{display:flex;align-items:center;gap:.7em;padding:.5em .6em;background:#fff;border:.2em solid var(--ink);border-radius:.9em;box-shadow:0 .25em 0 rgba(0,0,0,.2)}
#ui-root .set-ic{flex:none;display:grid;place-items:center;width:2.6em;height:2.6em;border-radius:50%;background:var(--cream-d);border:.18em solid var(--ink)}
#ui-root .set-ic .ic{font-size:1.5em}
#ui-root .set-t{flex:1;min-width:0;display:flex;flex-direction:column;gap:.1em;color:var(--ink)}
#ui-root .set-t b{font-size:1.1em;line-height:1.1}
#ui-root .set-t small{font-size:.74em;font-weight:700;line-height:1.2;color:#4b5263}
#ui-root .seg{display:flex;gap:.3em;margin-top:.45em}
#ui-root .seg-b{pointer-events:auto;flex:1;min-width:0;padding:.42em .3em;font:inherit;font-size:.82em;font-weight:900;color:var(--ink);background:#e9edf3;border:.18em solid var(--ink);border-radius:.6em;cursor:pointer;box-shadow:0 .2em 0 rgba(0,0,0,.25);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#ui-root .seg-b:active{transform:translateY(.12em);box-shadow:0 .08em 0 rgba(0,0,0,.25)}
#ui-root .seg-b.on.d-easy{background:var(--green);color:#fff;-webkit-text-stroke:.1em var(--ink);paint-order:stroke fill}
#ui-root .seg-b.on.d-normal{background:var(--blue);color:#fff;-webkit-text-stroke:.1em var(--ink);paint-order:stroke fill}
#ui-root .seg-b.on.d-hard{background:var(--red);color:#fff;-webkit-text-stroke:.1em var(--ink);paint-order:stroke fill}
#ui-root .sw{pointer-events:auto;position:relative;flex:none;width:5.6em;height:2.6em;margin:0;padding:0;background:#8b93a3;border:.22em solid var(--ink);border-radius:2em;cursor:pointer;touch-action:manipulation;
  box-shadow:inset 0 .22em 0 rgba(0,0,0,.18),0 .3em 0 rgba(0,0,0,.3);transition:background .12s}
#ui-root .sw.on{background:var(--green)}
#ui-root .sw:active{transform:translateY(.2em);box-shadow:inset 0 .22em 0 rgba(0,0,0,.18),0 .1em 0 rgba(0,0,0,.3)}
#ui-root .sw:focus{outline:none}
#ui-root .sw-k{position:absolute;top:.18em;left:.18em;width:1.8em;height:1.8em;border-radius:50%;background:#fff;border:.2em solid var(--ink);box-shadow:inset 0 -.18em 0 rgba(0,0,0,.15);transition:transform .14s cubic-bezier(.3,1.4,.5,1)}
#ui-root .sw.on .sw-k{transform:translateX(3em)}
#ui-root .sw-t{position:absolute;top:50%;right:.65em;margin-top:-.55em;font-size:.68em;line-height:1.1;font-weight:900;color:#fff;-webkit-text-stroke:.14em var(--ink);paint-order:stroke fill}
#ui-root .sw.on .sw-t{right:auto;left:.65em}
#ui-root .mfx{z-index:21}
`;

// Кнопки главного меню, перед которыми в Playables идёт interstitial (вне раунда).
const GAMEUI_MENU_AD_ACTS = ['play', 'how', 'shop', 'wardrobe', 'daily', 'wheel', 'board', 'settings'];

/** @satisfies {Record<string, any>} */
const GameUI = {
    /** @type {UIHandlers | null} */
    handlers: null,
    /** @type {HTMLElement | null} */
    root: null,
    /** Элементы по data-ref. */
    el: /** @type {Record<string, any>} */ ({}),
    inited: false,
    /** Мобильное управление включено (setTouchMode). */
    touch: false,
    muted: false,
    hudOn: false,
    menuOn: false,
    shopOn: false,
    pauseOn: false,
    resultsOn: false,
    heroOn: false,
    /** @type {UIProfile | null} */
    profile: null,
    /** Живой джойстик: x вправо, y вниз, -1..1. Объект не заменяется, поля меняются на месте. */
    joystick: { x: 0, y: 0, active: false },

    _tab: '',
    /** Последние значения, показанные в HUD (дифф-обновление). */
    _h: /** @type {Record<string, any>} */ ({}),
    /** Зажатые кнопки: имя -> pointerId. */
    _held: /** @type {Record<string, number>} */ ({}),
    _jp: /** @type {number | null} */ (null),
    _jx: 0,
    _jy: 0,
    _jr: 48,
    _plates: new Map(),
    _busyUntil: 0,
    _resTok: 0,
    _resBusy: false,
    _banner: /** @type {{ el: HTMLElement, anim: Animation } | null} */ (null),
    _countAnim: /** @type {Animation | null} */ (null),
    _flashAnim: /** @type {Animation | null} */ (null),
    _heroTimer: 0,
    _heroTick: 0,
    _heroAnim: /** @type {Animation | null} */ (null),
    _lvlTimer: 0,
    _tutText: '',
    _tutOn: false,
    _slock: false,
    platformPaused: false,
    settingsOn: false,
    /** 'web' | 'yandex' | 'playables' (setPlatform). */
    platform: 'web',
    /** Открытый мета-экран: '' | 'wardrobe' | 'daily' | 'wheel' | 'board'. */
    _meta: '',
    _wd: /** @type {any} */ (null),
    _wdData: /** @type {any} */ (null),
    _wdItems: /** @type {Map<string, any>} */ (new Map()),
    _pvc: /** @type {Map<string, HTMLCanvasElement>} */ (new Map()),
    _dy: /** @type {any} */ (null),
    _dyBusy: false,
    _wh: /** @type {any} */ (null),
    _whData: /** @type {any} */ (null),
    _whRot: 0,
    _whAnim: /** @type {Animation | null} */ (null),
    _spinLock: false,
    _lbTok: 0,
    _lbBusy: false,
    _popRes: /** @type {(() => void) | null} */ (null),
    _tickH: 0,
    _toastT: 0,
    _dbl: '',
    _resRew: /** @type {{ coins:number, gems:number, xp:number } | null} */ (null),
    _set: /** @type {any} */ (null),
    _badges: { daily: false, wheel: false, leaderboard: false, boostReady: false },
    _boostBusy: false,
    _reviveBusy: false,

    // =====================================================================================
    //  Жизненный цикл
    // =====================================================================================

    /** Один раз: создаёт DOM, стили и обработчики. Повторный вызов только меняет handlers. */
    init(handlers) {
        this.handlers = handlers;
        if (this.inited) return;
        this.inited = true;
        this._injectStyle();
        this._build();
        this._bind();
        this.setMuted(typeof Sound !== 'undefined' ? !!Sound.muted : false);
    },

    _injectStyle() {
        if (document.getElementById('rv-style')) return;
        const s = document.createElement('style');
        s.id = 'rv-style';
        s.textContent = GAMEUI_CSS + GAMEUI_CSS_META;
        document.head.appendChild(s);
    },

    _build() {
        let root = document.getElementById('ui-root');
        if (!root) {
            root = document.createElement('div');
            root.id = 'ui-root';
            document.body.appendChild(root);
        }
        root.innerHTML = this._tplPlates() + this._tplHud() + this._tplLayers() + this._tplTutorial()
            + this._tplMenu() + this._tplShop() + this._tplHero() + this._tplResults() + this._tplPause() + this._tplMeta();
        this.root = root;
        for (const n of root.querySelectorAll('[data-ref]')) this.el[n.getAttribute('data-ref')] = n;
        const E = this.el;
        // Постоянные подписи кнопок.
        E.ico_dash.innerHTML = this._ic('dash');
        E.lab_dash.textContent = Lang.t('hudDash');
        E.key_dash.textContent = Lang.t('keySpace');
        E.key_ability.textContent = Lang.t('keyQ');
        E.hud.classList.toggle('touch', this.touch);
        this.setShiftLock(this._slock);
        this.setPlatform(this.platform);
    },

    // =====================================================================================
    //  Разметка
    // =====================================================================================

    _esc(s) {
        return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    },

    /** Разрешены только теги <b> (тексты туториала приходят из Lang). */
    _rich(s) {
        return this._esc(s).replace(/&lt;(\/?)b&gt;/g, '<$1b>');
    },

    /** ImageGen art with the existing SVG as a fallback. */
    _ic(name, extra) {
        const path = ART_ITEMS[name] || ART_UI_ICONS[name];
        if (ArtAssets.image(path)) return '<img class="ic' + (extra ? ' ' + this._esc(extra) : '') + '" src="' + path + '" alt="" draggable="false" aria-hidden="true">';
        const body = GAMEUI_ICONS[name];
        if (!body) return '';
        return '<svg class="ic' + (extra ? ' ' + extra : '') + '" viewBox="0 0 48 48" fill="none" stroke="#161a22" stroke-width="3" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true">' + body + '</svg>';
    },

    _metaArt(name, fallback) {
        const path = ART_META[name];
        return ArtAssets.image(path) ? '<img class="meta-art" src="' + path + '" alt="" draggable="false">' : this._ic(fallback);
    },

    _tplPlates() {
        return '<div class="plates" data-ref="plates"></div>';
    },

    _tplHud() {
        const T = k => this._esc(Lang.t(k));
        const arrow = '<svg class="tarrow" viewBox="0 0 24 24"><path d="M12 22 3 10h6V2h6v8h6z" fill="#ffc83d" stroke="#161a22" stroke-width="2.4" stroke-linejoin="round"/></svg>';
        const act = name => '<div class="act ' + name + ' off gone" data-ref="a_' + name + '">'
            + '<span class="face"><span class="ico" data-ref="ico_' + name + '"></span><span class="cd" data-ref="cd_' + name + '"></span></span>'
            + (name === 'action'
                ? '<svg class="ring" viewBox="0 0 100 100"><circle class="trk" cx="50" cy="50" r="46"/><circle class="prg" cx="50" cy="50" r="46" data-ref="ring"/></svg>'
                  + '<span class="pbar" data-ref="pbarBox"><i data-ref="pbar"></i></span><span class="cons hidden" data-ref="cons"></span>'
                : '')
            + '<span class="lab" data-ref="lab_' + name + '"></span><span class="key" data-ref="key_' + name + '"></span>' + arrow + '</div>';
        return '<div class="hud hidden" data-ref="hud">'
            + '<div class="joy-zone" data-ref="joyZone"></div>'
            + '<div class="joy-ghost" data-ref="joyGhost">' + arrow + '</div>'
            + '<div class="joy" data-ref="joy"><div class="joy-base"></div><div class="joy-knob" data-ref="joyKnob"></div></div>'
            + '<div class="wasd hidden" data-ref="wasd"><span class="kc">W</span><span class="kc">A</span><span class="kc">S</span><span class="kc">D</span></div>'
            + '<div class="hud-left">'
            +   '<div class="role runner" data-ref="role"><span class="role-ic" data-ref="roleIc"></span><span class="role-name tx" data-ref="roleName"></span></div>'
            +   '<div class="counts"><span class="cnt r">' + this._ic('runner') + '<b data-ref="cRun">0</b></span><span class="cnt c">' + this._ic('knife') + '<b data-ref="cChs">0</b></span></div>'
            + '</div>'
            + '<div class="hud-mid"><div class="timer tx hidden" data-ref="timer"></div><div class="xpill hidden" data-ref="pill"></div></div>'
            + '<div class="hud-right">'
            +   '<span class="chip c-gem" data-ref="gemChip">' + this._ic('gem') + '<b data-ref="hGems">0</b>' + arrow + '</span>'
            +   '<span class="chip c-coin" data-ref="coinChip">' + this._ic('coin') + '<b data-ref="hCoins">0</b></span>'
            +   '<button class="btn round blue pausebtn" type="button" data-act="pause" aria-label="' + T('uiPauseBtn') + '">' + this._ic('pause') + '</button>'
            + '</div>'
            + '<div class="hint tx hidden" data-ref="hint"></div>'
            + '<div class="revive-offer hidden" data-ref="revive"><button class="btn green" type="button" data-act="revive" data-ref="reviveBtn">' + this._ic('revive') + '<span class="bt">' + T('reviveAd') + '<small>' + T('adBtn') + '</small></span></button></div>'
            + '<div class="acts">' + act('dash') + act('ability') + act('action') + '</div>'
            + '<div class="khint" data-ref="khint"><span class="kk">' + T('keyCtrl') + '</span><span class="tx">' + T('shiftLock') + '</span></div>'
            + '<div class="slock hidden" data-ref="slock">' + this._ic('lock') + '<span>' + T('shiftLock') + '</span></div>'
            + '</div>';
    },

    _tplLayers() {
        return '<div class="flash" data-ref="flash"></div><div class="fx" data-ref="fx"></div>'
            + '<div class="feed" data-ref="feed"></div>'
            + '<div class="banner-layer" data-ref="bannerLayer"></div>'
            + '<div class="count hidden" data-ref="count"><span data-ref="countNum"></span></div>';
    },

    _tplTutorial() {
        const T = k => this._esc(Lang.t(k));
        return '<div class="tut hidden" data-ref="tut"><div class="tut-card" data-ref="tutCard">'
            + '<span class="tut-step" data-ref="tutProg"></span>'
            + '<span class="tut-text" data-ref="tutText"></span>'
            + '<button class="btn sm orange tut-skip" type="button" data-act="skip"><span>' + T('tutSkip') + '</span>' + this._ic('next') + '</button>'
            + '</div></div>';
    },

    _tplMenu() {
        const T = k => this._esc(Lang.t(k));
        const sec = (cls, act, icon, key, extra) => '<button class="btn sec ' + cls + '" type="button" data-act="' + act + '"' + (extra && extra.ref ? ' data-ref="' + extra.ref + '"' : '') + '>'
            + this._ic(icon) + '<span>' + T(key) + '</span>' + (extra && extra.dot ? '<i class="dot hidden" data-ref="' + extra.dot + '"></i>' : '') + '</button>';
        return '<div class="menu hidden" data-ref="menu">'
            + '<div class="bunting"></div>'
            + '<div class="menu-top">'
            +   '<div class="prof">'
            +     '<div class="bib"><small>' + T('uiLevelShort') + '</small><b data-ref="mLevel">1</b></div>'
            +     '<div class="prof-info"><div class="xpbar"><div class="xpfill" data-ref="mXpFill"></div><span data-ref="mXpText"></span></div>'
            +     '<div class="wins">' + this._ic('trophy') + '<span data-ref="mWins"></span></div></div>'
            +   '</div>'
            +   '<div class="menu-cur">'
            +     '<span class="chip c-coin">' + this._ic('coin') + '<b data-ref="mCoins">0</b></span>'
            +     '<span class="chip c-gem">' + this._ic('gem') + '<b data-ref="mGems">0</b></span>'
            +     '<button class="btn round blue" type="button" data-act="how" aria-label="' + T('uiHow') + '">' + this._ic('help') + '</button>'
            +     '<button class="btn round gray" type="button" data-act="settings" aria-label="' + T('uiSettings') + '">' + this._ic('gear') + '</button>'
            +     '<button class="btn round blue" type="button" data-act="mute" data-ref="mMute"></button>'
            +   '</div>'
            + '</div>'
            + '<div class="logo" data-ref="logo">'
            +   (ArtAssets.image(ART_META.logo) ? '<img class="logo-art" src="' + ART_META.logo + '" alt="VALLEY RUSHING CLASSIC" draggable="false">' : '<div class="lp la tx">' + T('logoA') + '</div><div class="lp lb tx">' + T('logoB') + '</div><div class="lp lc tx">' + T('logoC') + '</div>')
            +   '<div class="tagline tx">' + T('uiTagline') + '</div><div class="line"></div>'
            + '</div>'
            + '<div class="menu-bottom" data-ref="menuBottom">'
            +   '<div class="mb-center">'
            +     '<button class="btn boost hidden" type="button" data-act="boost" data-ref="boostBtn">' + this._ic('bolt') + '<span class="bo-t">' + T('uiBoostOffer') + '</span><span class="adtag">' + T('adBtn') + '</span></button>'
            +     '<div class="boost-ready hidden" data-ref="boostReady">' + this._ic('bolt') + '<span>' + T('uiBoostReady') + '</span>' + this._ic('check') + '</div>'
            +     '<button class="btn play" type="button" data-act="play"><i class="sh"></i>' + this._ic('play') + '<span>' + T('uiPlay') + '</span></button>'
            +   '</div>'
            +   '<div class="mb-sec">'
            +     '<div class="mb-l">' + sec('purple', 'wardrobe', 'hanger', 'uiWardrobe') + sec('gold', 'shop', 'bolt', 'uiAbilities') + '</div>'
            +     '<div class="mb-r">' + sec('red', 'daily', 'gift', 'uiDaily', { dot: 'dotDaily' }) + sec('orange', 'wheel', 'wheel', 'uiWheel', { dot: 'dotWheel' }) + sec('blue hidden', 'board', 'trophy', 'uiBoard', { ref: 'bBoard' }) + '</div>'
            +   '</div>'
            + '</div>'
            + '</div>';
    },

    /** Гардероб, подарок, колесо, рекорды, настройки, окно-итог, подсказка и пауза платформы. */
    _tplMeta() {
        const T = k => this._esc(Lang.t(k));
        const ic = n => this._ic(n);
        const head = (icon, key, close) => '<div class="shop-head"><div class="shop-title">' + ic(icon) + '<span class="tt">' + T(key) + '</span></div>'
            + '<button class="btn round red" type="button" data-act="' + close + '" aria-label="' + T('uiClose') + '">' + ic('close') + '</button></div>';
        return '<div class="wardrobe hidden" data-ref="wardrobe"><div class="wd-panel">'
            +   '<div class="shop-head"><div class="shop-title">' + ic('shirt') + '<span class="tt">' + T('wdTitle') + '</span></div>'
            +   '<span class="chip c-coin">' + ic('coin') + '<b data-ref="wCoins">0</b></span><span class="chip c-gem">' + ic('gem') + '<b data-ref="wGems">0</b></span>'
            +   '<button class="btn round red" type="button" data-act="wdClose" aria-label="' + T('uiClose') + '">' + ic('close') + '</button></div>'
            +   '<div class="wd-tabs" data-ref="wdTabs"></div><div class="wd-sub" data-ref="wdSub"></div><div class="wd-grid" data-ref="wGrid"></div><div class="wd-detail" data-ref="wDetail"></div>'
            + '</div></div>'
            + '<div class="shopscr hidden" data-ref="daily"><div class="shop-panel fit">' + head('gift', 'dayTitle', 'dyClose') + '<div class="mbody" data-ref="dyBody"></div></div></div>'
            + '<div class="shopscr hidden" data-ref="wheel"><div class="shop-panel fit">' + head('wheel', 'whTitle', 'whClose')
            +   '<div class="mbody"><div class="wh-wrap"><div class="wh-stage"><canvas class="wh-cv" width="440" height="440" data-ref="whCv"></canvas>'
            +   (ArtAssets.image(ART_META.wheel_pointer) ? '<img class="wh-ptr" data-ref="whPtr" src="' + ART_META.wheel_pointer + '" alt="" draggable="false">' : '<svg class="wh-ptr" viewBox="0 0 26 30" data-ref="whPtr"><path d="M13 29 3 11A12 12 0 1 1 23 11z" fill="#ff3b3b" stroke="#161a22" stroke-width="2.6" stroke-linejoin="round"/><circle cx="13" cy="10" r="3.4" fill="#fff"/></svg>')
            +   '<div class="wh-hub">' + this._metaArt('wheel_hub', 'star') + '</div></div><div class="wh-ctl" data-ref="whCtl"></div></div></div></div></div>'
            + '<div class="shopscr hidden" data-ref="board"><div class="shop-panel fit">' + head('trophy', 'lbTitle', 'lbClose') + '<div class="mbody" data-ref="bBody"></div></div></div>'
            + '<div class="shopscr top hidden" data-ref="settings"><div class="shop-panel fit sm">' + head('gear', 'setTitle', 'setClose') + '<div class="mbody set-body" data-ref="setBody"></div></div></div>'
            + '<div class="modal popup hidden" data-ref="popup"><div class="card pop-card" data-ref="popCard"><div class="ribbon tx"><span data-ref="popTitle"></span></div>'
            +   '<div class="pop-body" data-ref="popBody"></div><button class="btn green big" type="button" data-act="popOk" data-ref="popOk"></button></div>'
            +   '<div class="confetti" data-ref="popConf"></div></div>'
            + '<div class="confetti mfx" data-ref="mfx"></div>'
            + '<div class="toast hidden" data-ref="toast" role="status"></div>'
            + '<div class="plat hidden" data-ref="plat" role="status"><span class="tx">' + T('platPaused') + '</span></div>';
    },

    _tplShop() {
        const T = k => this._esc(Lang.t(k));
        return '<div class="shopscr hidden" data-ref="shop"><div class="shop-panel">'
            + '<div class="shop-head">'
            +   '<div class="shop-title">' + this._ic('bag') + '<span class="tt">' + T('shopTitle') + '</span></div>'
            +   '<span class="chip c-coin">' + this._ic('coin') + '<b data-ref="sCoins">0</b></span>'
            +   '<span class="chip c-gem">' + this._ic('gem') + '<b data-ref="sGems">0</b></span>'
            +   '<button class="btn round red" type="button" data-act="shopClose" aria-label="' + T('uiClose') + '">' + this._ic('close') + '</button>'
            + '</div>'
            + '<div class="tabs" data-ref="shopTabs"></div>'
            + '<div class="shop-list" data-ref="shopList"></div>'
            + '</div></div>';
    },

    _tplHero() {
        const T = k => this._esc(Lang.t(k));
        return '<div class="modal hero hidden" data-ref="hero"><div class="card hero-card" data-ref="heroCard">'
            + '<div class="hero-badge">' + this._ic('trophy') + '</div>'
            + '<div class="hero-title tx">' + T('heroTitle') + '</div>'
            + '<div class="hero-text">' + T('heroText') + '</div>'
            + '<div class="hero-btns">'
            +   '<button class="btn green big" type="button" data-act="hero" data-v="1"><span class="hb"><span>' + T('heroYes') + '</span><small>' + this._ic('gem') + '+<span data-ref="heroReward">25</span></small></span></button>'
            +   '<button class="btn gray big" type="button" data-act="hero" data-v="0"><span>' + T('heroNo') + '</span></button>'
            + '</div>'
            + '<div class="hero-time"><div class="hero-bar" data-ref="heroBar"></div><span class="hero-sec" data-ref="heroSec"></span></div>'
            + '</div></div>';
    },

    _tplResults() {
        const T = k => this._esc(Lang.t(k));
        return '<div class="modal results hidden" data-ref="results"><div class="card res-card" data-ref="resCard">'
            + '<div class="ribbon tx" data-ref="resRibbon"><span data-ref="resHead"></span></div>'
            + '<div class="res-title" data-ref="resTitle"></div>'
            + '<div class="res-role" data-ref="resRole"></div>'
            + '<div class="res-cols">'
            +   '<div class="res-stats" data-ref="resStats"></div>'
            +   '<div class="res-rew">'
            +     '<div class="rew coin" data-ref="rewCoin">' + this._ic('coin') + '<span class="rl">' + T('resCoins') + '</span><b class="rv" data-ref="rvCoin">+0</b></div>'
            +     '<div class="rew gem" data-ref="rewGem">' + this._ic('gem') + '<span class="rl">' + T('resGems') + '</span><b class="rv" data-ref="rvGem">+0</b></div>'
            +     '<div class="rew xp" data-ref="rewXp">' + this._ic('star') + '<span class="rl">' + T('resXp') + '</span><b class="rv" data-ref="rvXp">+0</b></div>'
            +     '<div class="rew lvl" data-ref="rewLvl"><span class="mini-bib" data-ref="rvLvl">1</span><span class="rl" data-ref="rlLvl"></span></div>'
            +   '</div>'
            + '</div>'
            + '<button class="btn orange res-double hidden" type="button" data-act="resDouble" data-ref="resDouble"></button>'
            + '<button class="btn green big res-next" type="button" data-act="resNext" data-ref="resNextBtn"><span>' + T('resNext') + '</span>' + this._ic('next') + '</button>'
            + '</div>'
            + '<div class="confetti" data-ref="confetti"></div>'
            + '<div class="lvlup hidden" data-ref="lvlup"><div class="rays" data-ref="lvlRays"></div><div class="lvl-txt tx"><span>' + T('resLevelUp') + '</span><small data-ref="lvlNum"></small></div></div>'
            + '</div>';
    },

    _tplPause() {
        const T = k => this._esc(Lang.t(k));
        return '<div class="modal pause hidden" data-ref="pauseScr"><div class="card pause-card" data-ref="pauseCard">'
            + '<div class="ribbon tx"><span>' + T('pauseTitle') + '</span></div>'
            + '<div class="pause-btns">'
            +   '<button class="btn green big resume" type="button" data-act="resume">' + this._ic('play') + '<span>' + T('pauseResume') + '</span></button>'
            +   '<button class="btn blue" type="button" data-act="how">' + this._ic('help') + '<span>' + T('pauseHow') + '</span></button>'
            +   '<button class="btn gray" type="button" data-act="settings">' + this._ic('gear') + '<span>' + T('uiSettings') + '</span></button>'
            +   '<button class="btn gold" type="button" data-act="mute" data-ref="pSound"></button>'
            +   '<button class="btn red" type="button" data-act="quit">' + this._ic('home') + '<span>' + T('pauseQuit') + '</span></button>'
            + '</div>'
            + '</div></div>';
    },

    // =====================================================================================
    //  Ввод
    // =====================================================================================

    _bind() {
        const root = this.root;
        // Звук нажатия — на любой кнопке интерфейса (не на игровых кругах управления).
        root.addEventListener('pointerdown', e => {
            const b = /** @type {HTMLElement} */ (e.target).closest('button');
            if (b && !b.disabled) Sound.play('assets/sounds/ui_click.ogg', { volume: 0.6 });
        });
        // Кнопка не получает фокус от мыши: иначе Пробел (рывок в игре) «нажмёт» её ещё раз.
        root.addEventListener('mousedown', e => {
            if (/** @type {HTMLElement} */ (e.target).closest('button')) e.preventDefault();
        });
        root.addEventListener('click', e => {
            const el = /** @type {HTMLElement} */ (e.target).closest('[data-act]');
            if (!el || /** @type {HTMLButtonElement} */ (el).disabled) return;
            this._act(el.getAttribute('data-act'), /** @type {HTMLElement} */ (el));
            if (/** @type {HTMLElement} */ (el).blur) /** @type {HTMLElement} */ (el).blur();
        });
        this._bindJoystick();
        this._bindActs();
        window.addEventListener('lory-release-input', () => this._releaseInput());
        window.addEventListener('blur', () => this._releaseInput());
        window.addEventListener('keydown', e => {
            if (e.key !== 'Escape' || e.repeat) return;
            // Esc: preventDefault не вызываем (требование Playables).
            if (this.platformPaused) return;
            if (this._popRes) { this._popupClose(); return; }
            if (this.settingsOn) { this.hideSettings(); return; }
            if (this._meta) { this._metaEsc(); return; }
            if (this.shopOn) { this.hideShop(); return; }
            if (!this.hudOn || this.resultsOn || this.heroOn) return;
            this.handlers.onPause(!this.pauseOn);
        });
    },

    /** Жмём-блокировка: меню и модальные окна закрывают игровые кнопки. */
    _blocked() {
        return !this.hudOn || this.pauseOn || this.resultsOn || this.heroOn || this.platformPaused;
    },

    _act(name, el, adDone) {
        const H = this.handlers;
        // Playables (требование модерации): interstitial перед каждой кнопкой главного меню —
        // только вне игрового процесса (HUD раунда скрыт), не в паузе раунда.
        if (!adDone && this.platform === 'playables' && !this.hudOn && GAMEUI_MENU_AD_ACTS.includes(name)) {
            if (this._menuAdBusy) return;
            this._menuAdBusy = true;
            Platform.interstitial().catch(() => false).then(() => { this._menuAdBusy = false; this._act(name, el, true); });
            return;
        }
        const now = performance.now();
        const once = () => { if (now < this._busyUntil) return false; this._busyUntil = now + 600; return true; };
        switch (name) {
            case 'play': if (once()) H.onPlay(); break;
            case 'how': if (once()) H.onHowToPlay(); break;
            case 'quit': if (once()) H.onQuit(); break;
            case 'shop': this.showShop(); break;
            case 'wardrobe': this.showWardrobe(); break;
            case 'daily': this.showDaily(); break;
            case 'wheel': this.showWheel(); break;
            case 'board': this.showLeaderboard(); break;
            case 'settings': this.showSettings(); break;
            case 'setClose': this.hideSettings(); break;
            case 'setTog': this._setToggle(el.getAttribute('data-key')); break;
            case 'setDiff': this._setDifficulty(el.getAttribute('data-val')); break;
            case 'wdClose': this.hideWardrobe(); break;
            case 'wdTab': this._wdTab(el.getAttribute('data-tab')); break;
            case 'wdSel': this._wdSelect(el.getAttribute('data-id')); break;
            case 'wdBuy': this._wdAction('buy'); break;
            case 'wdAd': this._wdAction('ad'); break;
            case 'wdEquip': this._wdAction('equip'); break;
            case 'dyClose': this.hideDaily(); break;
            case 'dyClaim': this._dyClaim(false); break;
            case 'dyDouble': this._dyClaim(true); break;
            case 'whClose': this.hideWheel(); break;
            case 'whFree': this._whSpin(false); break;
            case 'whAd': this._whSpin(true); break;
            case 'lbClose': this.hideLeaderboard(); break;
            case 'lbLogin': this._lbLogin(); break;
            case 'popOk': this._popupClose(); break;
            case 'boost': this._boost(); break;
            case 'revive': this._revive(); break;
            case 'resDouble': this._resDouble(); break;
            case 'shopClose': this.hideShop(); break;
            case 'mute': this.setMuted(!!H.onMute()); break;
            case 'pause': H.onPause(true); break;
            case 'resume': H.onPause(false); break;
            case 'tab': this._tab = el.getAttribute('data-tab'); this._renderShop(); break;
            case 'buy': this._buy(el.getAttribute('data-id')); break;
            case 'equip': H.onEquip(el.getAttribute('data-id')); this._renderShop(); break;
            case 'skip': this.tutorialHide(); H.onTutorialSkip(); break;
            case 'hero': this._heroDone(el.getAttribute('data-v') === '1'); break;
            case 'resNext':
                if (this._resBusy) return;
                this._resBusy = true;
                /** @type {HTMLButtonElement} */ (el).disabled = true;
                H.onResultsNext();
                break;
        }
    },

    _bindJoystick() {
        const z = this.el.joyZone;
        z.addEventListener('pointerdown', e => {
            if (this._jp !== null || !this.touch || this._blocked()) return;
            e.preventDefault();
            this._jp = e.pointerId;
            try { z.setPointerCapture(e.pointerId); } catch (err) { /* палец уже поднят */ }
            this._jr = 4 * (parseFloat(getComputedStyle(this.root).fontSize) || 12);
            this._jx = e.clientX;
            this._jy = e.clientY;
            const box = this.root.getBoundingClientRect(); // поле может быть уже окна (рамка 2:1 Playgama)
            this.el.joy.style.transform = 'translate3d(' + (e.clientX - box.left) + 'px,' + (e.clientY - box.top) + 'px,0)';
            this.el.joyKnob.style.transform = 'translate3d(0,0,0)';
            this.el.joy.classList.add('on');
            this.el.joyGhost.classList.add('hid');
            const J = this.joystick;
            J.x = 0; J.y = 0; J.active = true;
        });
        z.addEventListener('pointermove', e => {
            if (e.pointerId !== this._jp) return;
            const dx = e.clientX - this._jx, dy = e.clientY - this._jy;
            const len = Math.hypot(dx, dy), R = this._jr;
            const k = len > R ? R / len : 1;
            this.el.joyKnob.style.transform = 'translate3d(' + (dx * k).toFixed(1) + 'px,' + (dy * k).toFixed(1) + 'px,0)';
            const m = Math.min(1, len / R), dead = 0.16, J = this.joystick;
            if (m < dead) { J.x = 0; J.y = 0; }
            else { const s = (m - dead) / (1 - dead); J.x = dx / len * s; J.y = dy / len * s; }
        });
        const end = e => { if (e.pointerId === this._jp) this._joyEnd(); };
        for (const t of ['pointerup', 'pointercancel', 'lostpointercapture']) z.addEventListener(t, end);
    },

    _joyEnd() {
        this._jp = null;
        const J = this.joystick;
        J.x = 0; J.y = 0; J.active = false;
        if (this.el.joy) {
            this.el.joy.classList.remove('on');
            this.el.joyGhost.classList.remove('hid');
        }
    },

    _bindActs() {
        for (const name of ['dash', 'ability', 'action']) {
            const el = this.el['a_' + name];
            el.addEventListener('pointerdown', e => {
                e.preventDefault();
                if (this._held[name] != null || !this.touch || this._blocked() || el.classList.contains('off')) return;
                this._held[name] = e.pointerId;
                try { el.setPointerCapture(e.pointerId); } catch (err) { /* палец уже поднят */ }
                el.classList.add('down');
                this.handlers.onButton(name, true);
            });
            const up = e => { if (this._held[name] === e.pointerId) this._releaseBtn(name); };
            for (const t of ['pointerup', 'pointercancel', 'lostpointercapture']) el.addEventListener(t, up);
        }
    },

    _releaseBtn(name) {
        if (this._held[name] == null) return;
        delete this._held[name];
        const el = this.el['a_' + name];
        if (el) el.classList.remove('down');
        this.handlers.onButton(name, false);
    },

    /** Сброс джойстика и зажатых кнопок (lory-release-input, пауза, окна). */
    _releaseInput() {
        if (!this.inited) return;
        this._joyEnd();
        for (const name of Object.keys(this._held)) this._releaseBtn(name);
    },

    /** true — включить мобильные кнопки и джойстик, false — подсказки клавиш для ПК. */
    setTouchMode(on) {
        this.touch = !!on;
        if (!this.inited) return;
        this.el.hud.classList.toggle('touch', this.touch);
        if (!this.touch) this._releaseInput();
        if (this._tutOn) this._tutTarget(this._tutTargetName);
    },

    /** Платформа сборки. На Playables нет собственных кнопок звука (им управляет YouTube) и «Рекордов». */
    setPlatform(name) {
        this.platform = String(name || 'web');
        if (!this.inited) return;
        const E = this.el, pl = this.platform === 'playables';
        E.mMute.classList.toggle('hidden', pl);
        E.pSound.classList.toggle('hidden', pl);
        this.setMenuBadges();
        if (this.settingsOn) this._renderSettings(this._set || undefined);
    },

    /** Индикатор Shift Lock (ПК): чип слева внизу, подсвеченная подсказка «Ctrl — Shift Lock» в ряду клавиш. */
    setShiftLock(on) {
        this._slock = !!on;
        if (!this.inited) return;
        this.el.slock.classList.toggle('hidden', !this._slock);
        this.el.khint.classList.toggle('on', this._slock);
    },

    setMuted(muted) {
        this.muted = !!muted;
        if (!this.inited) return;
        const E = this.el;
        const label = Lang.t(this.muted ? 'uiSoundOff' : 'uiSoundOn');
        E.mMute.innerHTML = this._ic(this.muted ? 'soundOff' : 'soundOn');
        E.mMute.setAttribute('aria-label', label);
        E.mMute.classList.toggle('blue', !this.muted);
        E.mMute.classList.toggle('gray', this.muted);
        E.pSound.innerHTML = this._ic(this.muted ? 'soundOff' : 'soundOn') + '<span>' + this._esc(label) + '</span>';
        if (this.settingsOn && this._set && this._set.muted !== this.muted) this._renderSettings(Object.assign({}, this._set, { muted: this.muted }));
    },

    _show(el, noAnim) {
        el.classList.remove('hidden');
        if (!noAnim) el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200, easing: 'ease-out' });
    },

    // =====================================================================================
    //  Меню
    // =====================================================================================

    /** Главное меню поверх живой сцены. profile: { level, xp, xpNext, coins, gems, wins, muted }. */
    showMenu(profile) {
        if (!this.inited) return;
        if (profile) this.profile = profile;
        if (!this.profile) this.profile = { level: 1, xp: 0, xpNext: 100, coins: 0, gems: 0, wins: 0, muted: this.muted };
        const E = this.el;
        this.menuOn = true;
        if (this.shopOn) { this.shopOn = false; E.shop.classList.add('hidden'); }
        if (this._meta) this._metaHide(this._meta);
        this._fillMenu();
        this.setMenuBadges();
        this.setMuted(typeof this.profile.muted === 'boolean' ? this.profile.muted : this.muted);
        const wasHidden = E.menu.classList.contains('hidden');
        E.menu.classList.remove('hidden');
        if (wasHidden) {
            E.menu.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 250, easing: 'ease-out' });
            E.logo.animate([
                { transform: 'translateY(-60%) scale(.7)', opacity: 0 },
                { transform: 'translateY(4%) scale(1.06)', opacity: 1, offset: 0.65 },
                { transform: 'none', opacity: 1 }], { duration: 520, easing: 'cubic-bezier(.2,.8,.3,1)' });
            E.menuBottom.animate([{ transform: 'translateY(60%)', opacity: 0 }, { transform: 'none', opacity: 1 }],
                { duration: 420, delay: 120, easing: 'cubic-bezier(.2,.8,.3,1)', fill: 'backwards' });
        }
    },

    hideMenu() {
        if (!this.inited) return;
        this.menuOn = false;
        this.el.menu.classList.add('hidden');
    },

    _fillMenu() {
        const p = this.profile, E = this.el;
        if (!p) return;
        E.mLevel.textContent = String(p.level);
        const frac = p.xpNext > 0 ? Math.max(0, Math.min(1, p.xp / p.xpNext)) : 0;
        E.mXpFill.style.transform = 'scaleX(' + frac.toFixed(3) + ')';
        E.mXpText.textContent = Lang.t('resXp') + ' ' + Math.floor(p.xp) + '/' + Math.floor(p.xpNext);
        E.mWins.textContent = Lang.t('uiWinsLabel', { n: p.wins });
        E.mCoins.textContent = String(p.coins);
        E.mGems.textContent = String(p.gems);
    },

    // =====================================================================================
    //  Магазин
    // =====================================================================================

    /** Магазин скрывает меню; hideShop возвращает меню, если оно было открыто. */
    showShop() {
        if (!this.inited) return;
        this.shopOn = true;
        this.el.menu.classList.add('hidden');
        this._renderShop();
        this._show(this.el.shop);
        this.el.shopList.scrollTop = 0;
    },

    hideShop() {
        if (!this.inited) return;
        const was = this.shopOn;
        this.shopOn = false;
        this.el.shop.classList.add('hidden');
        if (was && this.menuOn) { this._fillMenu(); this._show(this.el.menu); }
    },

    /** 0 — бегун (синий), 1 — ловец (красный), 2 — предметы (золотой). */
    _tabKind(tab, i) {
        const id = String(tab.id).toLowerCase();
        if (id.indexOf('runner') >= 0) return 0;
        if (id.indexOf('chaser') >= 0 || id.indexOf('hunter') >= 0) return 1;
        if (id.indexOf('item') >= 0 || id.indexOf('consum') >= 0) return 2;
        return i % 3;
    },

    _renderShop() {
        const E = this.el;
        /** @type {UIShopData} */
        const d = this.handlers.getShop();
        if (!d) return;
        if (this.profile) { this.profile.coins = d.coins; this.profile.gems = d.gems; }
        E.sCoins.textContent = String(d.coins);
        E.sGems.textContent = String(d.gems);
        const tabs = d.tabs || [];
        if (!tabs.some(t => t.id === this._tab)) this._tab = tabs.length ? tabs[0].id : '';
        const COLORS = ['#2f8cff', '#ff3b3b', '#ffc83d'], ICONS = ['runner', 'knife', 'medkit'];
        let ac = COLORS[0];
        E.shopTabs.innerHTML = tabs.map((t, i) => {
            const k = this._tabKind(t, i), on = t.id === this._tab;
            if (on) ac = COLORS[k];
            return '<button class="tab' + (on ? ' on' : '') + '" type="button" data-act="tab" data-tab="' + this._esc(t.id) + '" style="--tc:' + COLORS[k] + '">'
                + this._ic(ICONS[k]) + '<span>' + this._esc(Lang.t(t.titleKey)) + '</span></button>';
        }).join('');
        const st = E.shopList.scrollTop;
        E.shopList.innerHTML = (d.items || []).filter(it => it.tab === this._tab).map(it => this._itemHtml(it, d, ac)).join('');
        E.shopList.scrollTop = st;
    },

    /** Билетик предмета: цветной корешок с иконкой, название и описание, справа цена/кнопка/штамп. */
    _itemHtml(it, d, ac) {
        const T = (k, p) => this._esc(Lang.t(k, p));
        const gem = it.currency !== 'coins';
        const cur = gem ? 'gem' : 'coin';
        const have = gem ? d.gems : d.coins;
        const cons = typeof it.count === 'number' || it.id === 'medkit' || it.id === 'adrenaline';
        const free = !!it.free || !(it.price > 0);
        const can = free || have >= it.price;
        const id = this._esc(it.id);
        const buyBtn = '<button class="btn sm ' + (gem ? 'green' : 'gold') + '" type="button" data-act="buy" data-id="' + id + '"' + (can ? '' : ' disabled') + '>'
            + (free ? T('shopTake') : this._ic(cur) + '<b>' + it.price + '</b>') + '</button>'
            + (can ? '' : '<div class="need"><span>' + T('shopNeed', { n: it.price - have }) + '</span>' + this._ic(cur) + '</div>');
        const equipBtn = '<button class="btn sm blue" type="button" data-act="equip" data-id="' + id + '">' + T('shopEquip') + '</button>';
        const stamp = k => '<div class="stamp">' + T(k) + '</div>';
        let side;
        if (cons) side = buyBtn + (it.count > 0 ? (it.equipped ? stamp('shopChosen') : equipBtn) : '');
        else if (it.equipped) side = stamp('shopEquipped');
        else if (it.owned) side = equipBtn;
        else side = buyBtn;
        const icon = GAMEUI_ICONS[it.id] ? it.id : 'gem';
        return '<div class="item' + (it.equipped ? ' equipped' : '') + '" data-item="' + id + '" style="--ac:' + ac + '">'
            + '<div class="stub">' + this._ic(icon) + '</div>'
            + '<div class="ibody"><div class="iname"><span>' + T(it.nameKey) + '</span>' + (free && it.owned ? '<span class="tag">' + T('shopFree') + '</span>' : '') + '</div>'
            + '<div class="idesc">' + T(it.descKey) + '</div>'
            + (cons ? '<div class="istock">' + T('shopStock', { n: it.count || 0 }) + '</div>' : '') + '</div>'
            + '<div class="iside">' + side + '</div></div>';
    },

    _buy(id) {
        const ok = !!this.handlers.onBuy(id);
        this._renderShop();
        let row = null;
        for (const r of this.el.shopList.children) if (r.getAttribute('data-item') === id) row = r;
        if (!row) return;
        if (ok) {
            row.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.045) rotate(-.6deg)', offset: 0.4 }, { transform: 'scale(1)' }], { duration: 360, easing: 'ease-out' });
        } else {
            row.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-.5em)' }, { transform: 'translateX(.5em)' }, { transform: 'translateX(-.3em)' }, { transform: 'translateX(0)' }], { duration: 320 });
        }
    },

    // =====================================================================================
    //  HUD
    // =====================================================================================

    showHUD(on) {
        if (!this.inited) return;
        this.hudOn = !!on;
        this.el.hud.classList.toggle('hidden', !on);
        if (!on) this._releaseInput();
    },

    /** Класс на элементе только при смене значения. */
    _flag(key, el, cls, on) {
        if (this._h[key] === on) return;
        this._h[key] = on;
        el.classList.toggle(cls, on);
    },

    /** Заливка перезарядки: --p = доля оставшегося времени, шаг 1/40. */
    _cd(name, frac) {
        const v = Math.round(Math.max(0, Math.min(1, frac || 0)) * 40) / 40;
        const k = 'cd_' + name;
        if (this._h[k] === v) return;
        this._h[k] = v;
        this.el['cd_' + name].style.setProperty('--p', String(v));
    },

    /** Вспышка кнопки, когда способность снова готова. */
    _readyPop(el) {
        el.firstElementChild.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.22)', offset: 0.4 }, { transform: 'scale(1)' }], { duration: 380, easing: 'ease-out' });
    },

    /** ~10 раз в секунду: обновляет только изменившееся. */
    setHUD(h) {
        if (!this.inited || !h) return;
        const E = this.el, L = this._h;

        if (L.role !== h.role) {
            const first = L.role === undefined;
            L.role = h.role;
            E.role.className = 'role ' + h.role;
            E.roleIc.innerHTML = this._ic(h.role === 'chaser' ? 'knife' : h.role === 'downed' ? 'ghost' : 'runner');
            E.roleName.textContent = Lang.t(h.role === 'chaser' ? 'roleChaser' : h.role === 'downed' ? 'roleDowned' : 'roleRunner');
            if (!first) E.role.animate([{ transform: 'scale(.6)' }, { transform: 'scale(1.18)', offset: 0.6 }, { transform: 'scale(1)' }], { duration: 380, easing: 'ease-out' });
        }

        const pill = h.phase === 'wait' ? Lang.t('hudWait')
            : h.phase === 'countdown' ? Lang.t('bGetReady')
            : h.phase === 'over' ? Lang.t('hudOver')
            : (h.crossings > 0 ? Lang.t('bCrossing', { n: Math.min(Math.max(1, h.crossing), h.crossings), total: h.crossings }) : '');
        if (L.pill !== pill) {
            L.pill = pill;
            E.pill.textContent = pill;
            E.pill.classList.toggle('hidden', !pill);
        }

        const tl = h.timeLeft == null ? -1 : Math.max(0, Math.ceil(h.timeLeft));
        if (L.tl !== tl) {
            L.tl = tl;
            E.timer.classList.toggle('hidden', tl < 0);
            if (tl >= 0) E.timer.textContent = tl >= 100 ? Math.floor(tl / 60) + ':' + String(tl % 60).padStart(2, '0') : String(tl);
            E.timer.classList.toggle('warn', tl > 3 && tl <= 5);
            E.timer.classList.toggle('crit', tl >= 0 && tl <= 3);
        }

        if (L.runners !== h.runners) { L.runners = h.runners; E.cRun.textContent = String(h.runners); }
        if (L.chasers !== h.chasers) { L.chasers = h.chasers; E.cChs.textContent = String(h.chasers); }
        if (L.gems !== h.gems) {
            if (L.gems !== undefined && h.gems > L.gems) E.gemChip.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.22)', offset: 0.4 }, { transform: 'scale(1)' }], { duration: 300, easing: 'ease-out' });
            L.gems = h.gems;
            E.hGems.textContent = String(h.gems);
        }
        if (L.coins !== h.coins) {
            if (L.coins !== undefined && h.coins > L.coins) E.coinChip.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.22)', offset: 0.4 }, { transform: 'scale(1)' }], { duration: 300, easing: 'ease-out' });
            L.coins = h.coins;
            E.hCoins.textContent = String(h.coins);
        }

        // Способность (Q / кнопка).
        const ab = h.ability, ael = E.a_ability, aid = ab ? ab.id : '';
        if (L.abId !== aid) {
            L.abId = aid;
            if (ab) {
                E.ico_ability.innerHTML = this._ic(GAMEUI_ICONS[aid] ? aid : 'star');
                E.lab_ability.textContent = Lang.has('item_' + aid) ? Lang.t('item_' + aid) : Lang.t('hudAbility');
            }
        }
        this._flag('abGone', ael, 'gone', !ab);
        this._flag('abOff', ael, 'off', !ab);
        this._flag('abCool', ael, 'cool', !!ab && !ab.ready);
        this._flag('abOn', ael, 'on', !!ab && !!ab.active);
        if (ab && ab.ready && L.abReady === false) this._readyPop(ael);
        L.abReady = !!ab && ab.ready;
        this._cd('ability', ab && !ab.ready ? Math.max(ab.cooldown, 0.02) : 0);

        // Рывок (Пробел / кнопка).
        const ds = h.dash, del = E.a_dash;
        this._flag('dsGone', del, 'gone', !ds);
        this._flag('dsOff', del, 'off', !ds);
        this._flag('dsCool', del, 'cool', !!ds && !ds.ready);
        if (ds && ds.ready && L.dsReady === false) this._readyPop(del);
        L.dsReady = !!ds && ds.ready;
        this._cd('dash', ds && !ds.ready ? Math.max(ds.cooldown, 0.02) : 0);

        this._slotAction(h);

        const hint = h.hint || '';
        if (L.hint !== hint) {
            L.hint = hint;
            E.hint.textContent = hint;
            E.hint.classList.toggle('hidden', !hint);
            if (hint) E.hint.animate([{ transform: 'scale(.85)', opacity: 0 }, { transform: 'scale(1)', opacity: 1 }], { duration: 180, easing: 'ease-out' });
        }
    },

    /** Контекстная кнопка действия: удар / спасение / адреналин, прогресс удержания, расходник. */
    _slotAction(h) {
        const E = this.el, L = this._h, el = E.a_action;
        const kind = h.action || null;
        const shown = kind || (h.role === 'chaser' ? 'attack' : 'revive');
        if (L.actKind !== shown) {
            L.actKind = shown;
            const m = shown === 'attack' ? ['knife', 'hudAttack', 'keyLmb', 'attack']
                : shown === 'adrenaline' ? ['bolt', 'hudBoost', 'keyE', 'boost']
                : ['revive', 'hudRevive', 'keyE', 'revive'];
            E.ico_action.innerHTML = this._ic(m[0]);
            E.lab_action.textContent = Lang.t(m[1]);
            E.key_action.textContent = Lang.t(m[2]);
            el.classList.remove('attack', 'boost', 'revive');
            el.classList.add(m[3]);
        }
        const enabled = !!kind;
        this._flag('acOff', el, 'off', !enabled);
        this._flag('acGone', el, 'gone', h.role === 'downed' && !enabled);
        const p = enabled ? Math.round(Math.max(0, Math.min(1, h.actionProgress || 0)) * 50) / 50 : 0;
        if (L.acP !== p) {
            L.acP = p;
            E.ring.style.strokeDashoffset = String(289.03 * (1 - p));
            E.pbar.style.transform = 'scaleX(' + p + ')';
            E.pbarBox.classList.toggle('on', p > 0);
        }
        if (!enabled && this._held.action != null) this._releaseBtn('action');
        const c = h.consumable && h.consumable.count > 0 ? h.consumable : null;
        const ck = c ? c.id + ':' + c.count : '';
        if (L.cons !== ck) {
            L.cons = ck;
            E.cons.classList.toggle('hidden', !c);
            if (c) E.cons.innerHTML = this._ic(GAMEUI_ICONS[c.id] ? c.id : 'star') + '<b>×' + c.count + '</b>';
        }
    },

    // =====================================================================================
    //  Анонсы, лента, всплывающие числа, вспышка
    // =====================================================================================

    /** Большой анонс по центру: вылет с «ударом», пауза, уход вверх. opts: { color, sub, ms, size:'xl'|'l' }. */
    banner(text, opts) {
        if (!this.inited) return;
        const o = opts || {};
        if (this._banner) {
            try { this._banner.anim.cancel(); } catch (e) { /* уже завершён */ }
            this._banner.el.remove();
            this._banner = null;
        }
        const el = document.createElement('div');
        el.className = 'banner ' + (o.size === 'l' ? 'l' : 'xl');
        el.style.setProperty('--bc', o.color || '#ff9a1f');
        const bt = document.createElement('div');
        bt.className = 'bt tx';
        bt.textContent = text;
        el.appendChild(bt);
        if (o.sub) {
            const bs = document.createElement('div');
            bs.className = 'bs';
            bs.textContent = o.sub;
            el.appendChild(bs);
        }
        this.el.bannerLayer.appendChild(el);
        const ms = Math.max(700, Number(o.ms) || 1600);
        const k1 = Math.min(0.18, 260 / ms), k2 = Math.min(0.32, k1 + 0.1), k3 = 1 - Math.min(0.2, 320 / ms);
        const anim = el.animate([
            { transform: 'scale(.25) rotate(-12deg)', opacity: 0, offset: 0, easing: 'cubic-bezier(.2,1.5,.4,1)' },
            { transform: 'scale(1.14) rotate(1.5deg)', opacity: 1, offset: k1, easing: 'ease-out' },
            { transform: 'scale(1) rotate(0deg)', opacity: 1, offset: k2 },
            { transform: 'scale(1) rotate(0deg)', opacity: 1, offset: k3, easing: 'ease-in' },
            { transform: 'translateY(-2.6em) scale(1.18) rotate(3deg)', opacity: 0, offset: 1 },
        ], { duration: ms, fill: 'forwards' });
        const rec = { el, anim };
        this._banner = rec;
        anim.onfinish = () => { el.remove(); if (this._banner === rec) this._banner = null; };
    },

    /** Гигантская цифра 3-2-1; n = 0 убирает. */
    countdown(n) {
        if (!this.inited) return;
        const E = this.el;
        if (this._countAnim) { this._countAnim.cancel(); this._countAnim = null; }
        if (!(n > 0)) { E.count.classList.add('hidden'); return; }
        E.count.classList.remove('hidden');
        E.countNum.textContent = String(Math.floor(n));
        E.count.style.setProperty('--cc', n >= 3 ? '#ff5a4a' : n === 2 ? '#ff9a1f' : '#34e27a');
        this._countAnim = E.countNum.animate([
            { transform: 'scale(2.8) rotate(-8deg)', opacity: 0, offset: 0 },
            { transform: 'scale(.92) rotate(1deg)', opacity: 1, offset: 0.22 },
            { transform: 'scale(1) rotate(0deg)', opacity: 1, offset: 0.36 },
            { transform: 'scale(1)', opacity: 1, offset: 0.72 },
            { transform: 'scale(1.6)', opacity: 0, offset: 1 },
        ], { duration: 950, easing: 'ease-out', fill: 'forwards' });
    },

    /** Строка ленты событий справа под верхней панелью: до 4 строк, гаснет через 4 с. */
    feed(text, color) {
        if (!this.inited) return;
        const box = this.el.feed;
        const line = document.createElement('div');
        line.className = 'feedline';
        line.style.setProperty('--fc', color || '#ffffff');
        line.textContent = text;
        box.appendChild(line);
        while (box.children.length > 4) box.firstElementChild.remove();
        line.animate([{ transform: 'translateX(40%)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 220, easing: 'ease-out' });
        setTimeout(() => {
            if (!line.isConnected) return;
            const a = line.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 400, fill: 'forwards' });
            a.onfinish = () => line.remove();
        }, 4000);
    },

    /** Всплывающий текст в экранных пикселях: поднимается на ~60 px и гаснет за 0.9 с. */
    floatText(x, y, text, color) {
        if (!this.inited) return;
        const layer = this.el.fx;
        const el = document.createElement('div');
        el.className = 'ft tx';
        el.style.color = color || '#ffffff';
        el.textContent = text;
        layer.appendChild(el);
        while (layer.children.length > 30) layer.firstElementChild.remove();
        const px = Math.round(x), py = Math.round(y);
        const base = 'translate3d(' + px + 'px,' + py + 'px,0) translate(-50%,-50%)';
        const a = el.animate([
            { transform: base + ' translateY(0) scale(.5)', opacity: 0, offset: 0 },
            { transform: base + ' translateY(-14px) scale(1.2)', opacity: 1, offset: 0.2 },
            { transform: base + ' translateY(-30px) scale(1)', opacity: 1, offset: 0.55 },
            { transform: base + ' translateY(-60px) scale(1)', opacity: 0, offset: 1 },
        ], { duration: 900, easing: 'ease-out', fill: 'forwards' });
        a.onfinish = () => el.remove();
    },

    /** Вспышка по краям экрана (красная — удар, зелёная — кристалл, золотая — награда). */
    flash(color, ms) {
        if (!this.inited) return;
        const el = this.el.flash;
        el.style.setProperty('--fc', color || '#ff3b3b');
        if (this._flashAnim) this._flashAnim.cancel();
        this._flashAnim = el.animate([{ opacity: 0 }, { opacity: 0.9, offset: 0.2 }, { opacity: 0 }], { duration: ms || 380, easing: 'ease-out' });
    },

    // =====================================================================================
    //  Окна: выбор героя, результаты, пауза
    // =====================================================================================

    /** Модальный выбор «ГЕРОЙ / ТРУС» с убывающим таймером. Конец времени = ТРУС. reward — число в подписи (25). */
    heroChoice(seconds, reward) {
        if (!this.inited) return;
        const E = this.el;
        this._releaseInput();
        this._heroClear();
        this.heroOn = true;
        const sec = Math.max(1, Number(seconds) || 5);
        E.heroReward.textContent = String(reward == null ? 25 : reward);
        E.hero.classList.remove('hidden');
        E.hero.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 180 });
        E.heroCard.animate([
            { transform: 'scale(.5) rotate(-8deg)', opacity: 0 },
            { transform: 'scale(1.06)', opacity: 1, offset: 0.65 },
            { transform: 'none', opacity: 1 }], { duration: 420, easing: 'cubic-bezier(.2,.9,.3,1)' });
        this._heroAnim = E.heroBar.animate([{ transform: 'scaleX(1)' }, { transform: 'scaleX(0)' }], { duration: sec * 1000, easing: 'linear', fill: 'forwards' });
        const t0 = performance.now();
        const tick = () => { E.heroSec.textContent = Lang.t('heroSec', { n: Math.max(0, Math.ceil(sec - (performance.now() - t0) / 1000)) }); };
        tick();
        this._heroTick = setInterval(tick, 200);
        this._heroTimer = setTimeout(() => this._heroDone(false), sec * 1000);
    },

    _heroClear() {
        clearTimeout(this._heroTimer);
        clearInterval(this._heroTick);
        if (this._heroAnim) { this._heroAnim.cancel(); this._heroAnim = null; }
    },

    _heroDone(hero) {
        if (!this.heroOn) return;
        this.heroOn = false;
        this._heroClear();
        this.el.hero.classList.add('hidden');
        this.handlers.onHeroChoice(!!hero);
    },

    /** Результаты раунда: лента ПОБЕДА/ПОРАЖЕНИЕ, статистика, считающиеся награды, всплеск уровня. */
    showResults(r) {
        if (!this.inited || !r) return;
        const E = this.el;
        this._releaseInput();
        this.resultsOn = true;
        this._resBusy = false;
        E.resNextBtn.disabled = false;
        const tok = ++this._resTok;
        clearTimeout(this._lvlTimer);
        E.lvlup.classList.add('hidden');
        E.confetti.innerHTML = '';
        E.results.classList.toggle('lose', !r.win);
        E.resHead.textContent = Lang.t(r.win ? 'resWin' : 'resLose');
        E.resTitle.textContent = r.title || '';
        E.resTitle.classList.toggle('hidden', !r.title);
        const chaser = r.role === 'chaser';
        E.resRole.innerHTML = '<span class="' + (chaser ? 'chaser' : 'runner') + '"><i class="rc">' + this._ic(chaser ? 'knife' : 'runner') + '</i>'
            + this._esc(Lang.t(chaser ? 'roleChaser' : 'roleRunner')) + '</span>';
        const stats = r.stats || [];
        E.resStats.innerHTML = stats.map(s => '<div class="srow"><span class="sl">' + this._esc(s.label) + '</span><span class="sv">' + this._esc(s.value) + '</span></div>').join('');
        E.resStats.classList.toggle('hidden', !stats.length);
        let delay = 450 + stats.length * 70;
        const rows = [['rewCoin', 'rvCoin', r.coins], ['rewGem', 'rvGem', r.gems], ['rewXp', 'rvXp', r.xp]];
        for (const [row, val, n] of rows) {
            E[row].classList.toggle('hidden', !(n > 0));
            E[val].textContent = '+0';
            if (n > 0) { this._countUp(E[val], n, 800, delay, tok); delay += 220; }
        }
        this._resRew = { coins: Number(r.coins) || 0, gems: Number(r.gems) || 0, xp: Number(r.xp) || 0 };
        E.rvLvl.textContent = String(r.level);
        E.rlLvl.textContent = Lang.t('resLevel', { n: r.level });

        E.results.classList.remove('hidden');
        E.results.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 220 });
        E.resCard.animate([
            { transform: 'scale(.7) translateY(10%)', opacity: 0 },
            { transform: 'scale(1.04)', opacity: 1, offset: 0.7 },
            { transform: 'none', opacity: 1 }], { duration: 460, easing: 'cubic-bezier(.2,.8,.3,1)' });
        E.resRibbon.animate([
            { transform: 'translateY(-220%) scale(1.4)', opacity: 0 },
            { transform: 'translateY(8%) scale(.96)', opacity: 1, offset: 0.55 },
            { transform: 'none', opacity: 1 }], { duration: 560, delay: 160, easing: 'cubic-bezier(.3,1.2,.4,1)', fill: 'backwards' });
        Array.from(E.resStats.children).forEach((row, i) => {
            row.animate([{ transform: 'translateX(-30%)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 300, delay: 350 + i * 70, easing: 'ease-out', fill: 'backwards' });
        });
        if (r.win) this._confetti(r.levelUp ? 44 : 30);
        if (r.levelUp) this._lvlTimer = setTimeout(() => this._levelUp(r.level, tok), delay + 400);
    },

    hideResults() {
        if (!this.inited) return;
        this.resultsOn = false;
        this._resTok++;
        clearTimeout(this._lvlTimer);
        const E = this.el;
        E.results.classList.add('hidden');
        E.lvlup.classList.add('hidden');
        E.confetti.innerHTML = '';
        this.setResultsDouble('unavailable');
    },

    /** Счётчик награды от 0 до to (ease-out), отменяется сменой _resTok. */
    _countUp(el, to, ms, delay, tok, from) {
        const t0 = performance.now() + delay;
        const step = now => {
            if (tok !== this._resTok) return;
            const t = Math.min(1, Math.max(0, (now - t0) / ms));
            const f = from || 0;
            el.textContent = '+' + Math.round(f + (to - f) * (1 - Math.pow(1 - t, 3)));
            if (t < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
    },

    /** Вспышка «НОВЫЙ УРОВЕНЬ»: вращающиеся лучи, надпись, конфетти. */
    _levelUp(level, tok) {
        if (tok !== this._resTok || !this.resultsOn) return;
        const E = this.el;
        E.lvlNum.textContent = Lang.t('resLevel', { n: level });
        E.lvlup.classList.remove('hidden');
        E.lvlRays.animate([{ transform: 'rotate(0deg)' }, { transform: 'rotate(90deg)' }], { duration: 2600 });
        const a = E.lvlup.animate([{ opacity: 0 }, { opacity: 1, offset: 0.1 }, { opacity: 1, offset: 0.8 }, { opacity: 0 }], { duration: 2600 });
        a.onfinish = () => E.lvlup.classList.add('hidden');
        const txt = E.lvlup.querySelector('.lvl-txt');
        if (txt) txt.animate([{ transform: 'scale(.2) rotate(-12deg)' }, { transform: 'scale(1.15) rotate(2deg)', offset: 0.5 }, { transform: 'scale(1)' }], { duration: 620, easing: 'ease-out' });
        E.rewLvl.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.12)', offset: 0.4 }, { transform: 'scale(1)' }], { duration: 500, delay: 300 });
        this._confetti(40);
    },

    _confetti(n, layerEl) {
        const layer = layerEl || this.el.confetti;
        const colors = ['#2f8cff', '#ff3b3b', '#34e27a', '#ffc83d', '#ff9a1f', '#ffffff'];
        for (let i = 0; i < n; i++) {
            const p = document.createElement('i');
            p.className = 'cf';
            p.style.background = colors[i % colors.length];
            p.style.left = (Math.random() * 100).toFixed(1) + '%';
            layer.appendChild(p);
            const dx = Math.round((Math.random() - 0.5) * 180), rot = Math.round(Math.random() * 720 - 360);
            const a = p.animate([
                { transform: 'translate3d(0,-12vh,0) rotate(0deg)', opacity: 1 },
                { transform: 'translate3d(' + dx + 'px,112vh,0) rotate(' + rot + 'deg)', opacity: 1 },
            ], { duration: 1800 + Math.random() * 1600, delay: Math.random() * 500, easing: 'cubic-bezier(.3,.1,.6,1)', fill: 'backwards' });
            a.onfinish = () => p.remove();
        }
    },

    /** Оверлей паузы. Показывает игра: handlers.onPause(on) -> Pause.set('manual', on) -> showPause(on). */
    showPause(on) {
        if (!this.inited) return;
        const E = this.el;
        this.pauseOn = !!on;
        if (on) {
            this._releaseInput();
            E.pauseScr.classList.remove('hidden');
            E.pauseScr.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 160 });
            E.pauseCard.animate([{ transform: 'scale(.8) translateY(8%)', opacity: 0 }, { transform: 'scale(1.03)', opacity: 1, offset: 0.7 }, { transform: 'none', opacity: 1 }], { duration: 300, easing: 'ease-out' });
        } else {
            E.pauseScr.classList.add('hidden');
        }
    },

    // =====================================================================================
    //  Туториал
    // =====================================================================================

    /** Карточка шага под верхней панелью + подсветка нужного элемента. */
    tutorialStep(step) {
        if (!this.inited || !step) return;
        const E = this.el;
        const was = this._tutOn;
        this._tutOn = true;
        E.tut.classList.remove('hidden');
        E.tutProg.textContent = step.progress || '';
        E.tutProg.classList.toggle('hidden', !step.progress);
        const changed = step.text !== this._tutText;
        this._tutText = step.text;
        if (changed) E.tutText.innerHTML = this._rich(step.text);
        this._tutTarget(step.target || null);
        if (changed || !was) {
            E.tutCard.animate([
                { transform: 'translateY(-40%) scale(.85)', opacity: 0 },
                { transform: 'translateY(4%) scale(1.03)', opacity: 1, offset: 0.6 },
                { transform: 'none', opacity: 1 }], { duration: 340, easing: 'ease-out' });
        }
    },

    tutorialHide() {
        if (!this.inited) return;
        this._tutOn = false;
        this._tutText = '';
        this.el.tut.classList.add('hidden');
        this._tutTarget(null);
    },

    _tutTargetName: /** @type {string | null} */ (null),

    /** Подсветка: на телефоне — настоящая кнопка, на ПК — «плашка» клавиши; джойстик — призрак или WASD. */
    _tutTarget(target) {
        const E = this.el;
        this._tutTargetName = target;
        for (const k of ['a_dash', 'a_ability', 'a_action', 'gemChip', 'joyGhost']) E[k].classList.remove('tut-target');
        E.wasd.classList.add('hidden');
        if (target === 'dash') E.a_dash.classList.add('tut-target');
        else if (target === 'ability') E.a_ability.classList.add('tut-target');
        else if (target === 'action') E.a_action.classList.add('tut-target');
        else if (target === 'gems') E.gemChip.classList.add('tut-target');
        else if (target === 'joystick') {
            if (this.touch) E.joyGhost.classList.add('tut-target');
            else E.wasd.classList.remove('hidden');
        }
    },

    // =====================================================================================
    //  Таблички над головами (16 штук, обновляются каждый кадр)
    // =====================================================================================

    /** Создать или обновить табличку: { name, sub?, color?, me? } (me — жёлтое имя). */
    plate(id, opts) {
        if (!this.inited) return;
        const o = opts || {};
        let p = this._plates.get(id);
        if (!p) {
            const el = document.createElement('div');
            el.className = 'plate hid';
            el.innerHTML = '<span class="pn"></span><span class="ps"></span>';
            this.el.plates.appendChild(el);
            p = { el, n: el.firstChild, s: el.lastChild, name: null, sub: null, me: false, color: null, vis: false, x: NaN, y: NaN, sc: NaN };
            this._plates.set(id, p);
        }
        if (p.name !== o.name) { p.name = o.name; p.n.textContent = o.name == null ? '' : String(o.name); }
        const sub = o.sub || '';
        if (p.sub !== sub) { p.sub = sub; p.s.textContent = sub; p.s.style.display = sub ? '' : 'none'; }
        const me = !!o.me;
        if (p.me !== me) { p.me = me; p.el.classList.toggle('me', me); }
        const col = o.color || '';
        if (p.color !== col) { p.color = col; p.el.style.setProperty('--pc', col || '#ffffff'); }
    },

    /** Позиция в экранных px (низ-центр таблички = точка x,y), только transform; ничего не читает из layout. */
    platePos(id, x, y, visible, scale) {
        const p = this._plates.get(id);
        if (!p) return;
        if (!visible) {
            if (p.vis) { p.vis = false; p.el.classList.add('hid'); }
            return;
        }
        const sc = scale == null ? 1 : scale;
        const rx = Math.round(x * 2) / 2, ry = Math.round(y * 2) / 2, rs = Math.round(sc * 100) / 100;
        if (rx !== p.x || ry !== p.y || rs !== p.sc) {
            p.x = rx; p.y = ry; p.sc = rs;
            p.el.style.transform = 'translate3d(' + rx + 'px,' + ry + 'px,0) translate(-50%,-100%) scale(' + rs + ')';
        }
        if (!p.vis) { p.vis = true; p.el.classList.remove('hid'); }
    },

    plateRemove(id) {
        const p = this._plates.get(id);
        if (!p) return;
        p.el.remove();
        this._plates.delete(id);
    },

    // =====================================================================================
    //  Мета-экраны: гардероб, подарок, колесо, рекорды, настройки, окно-итог
    //  Все открываются только из меню (не поверх матча, туториала, паузы и результатов),
    //  прячут главное меню и друг друга, закрываются Esc. Обработчики игры — необязательные.
    // =====================================================================================

    _canOpenMeta() {
        return this.inited && !this.hudOn && !this.pauseOn && !this.resultsOn && !this.heroOn && !this.platformPaused && !this._tutOn;
    },

    _metaOpen(name) {
        const E = this.el;
        if (this._meta && this._meta !== name) this._metaHide(this._meta);
        if (this.shopOn) { this.shopOn = false; E.shop.classList.add('hidden'); }
        E.menu.classList.add('hidden');
        this._meta = name;
        this._stopTick();
        this._tickH = setInterval(() => this._tickFn(), 1000);
    },

    _metaHide(name) {
        if (this._meta !== name) return;
        const E = this.el, H = this.handlers;
        this._meta = '';
        this._stopTick();
        E[name].classList.add('hidden');
        if (name === 'wardrobe') {
            if (H.onTryOn) H.onTryOn(null);
            if (H.onWardrobe) H.onWardrobe(false);
        }
        this._popupClose();
    },

    _metaBack() {
        if (this.menuOn && !this._meta && !this.shopOn) { this._fillMenu(); this._show(this.el.menu); }
    },

    _metaEsc() {
        if (this._meta === 'wardrobe') this.hideWardrobe();
        else if (this._meta === 'daily') this.hideDaily();
        else if (this._meta === 'wheel') this.hideWheel();
        else if (this._meta === 'board') this.hideLeaderboard();
    },

    _stopTick() {
        if (this._tickH) { clearInterval(this._tickH); this._tickH = 0; }
    },

    /** Раз в секунду: обратный отсчёт в подарке и колесе; по нулю — обновить окно. */
    _tickFn() {
        const now = Date.now();
        for (const el of this.root.querySelectorAll('[data-cd-end]')) {
            const rem = Math.max(0, Math.ceil((Number(el.getAttribute('data-cd-end')) - now) / 1000));
            const txt = this._fmtT(rem);
            if (el.textContent !== txt) el.textContent = txt;
            if (rem === 0 && !el.getAttribute('data-cd-done')) {
                el.setAttribute('data-cd-done', '1');
                if (this._meta === 'daily') this._renderDaily();
                else if (this._meta === 'wheel') this._renderWheel(false);
            }
        }
    },

    _fmtT(sec) {
        const s = Math.max(0, Math.floor(sec));
        const p = n => String(n).padStart(2, '0');
        return p(Math.floor(s / 3600)) + ':' + p(Math.floor(s % 3600 / 60)) + ':' + p(s % 60);
    },

    /** Разметка с подставленным обратным отсчётом: key содержит {t}. */
    _cdText(key, sec) {
        const end = Date.now() + Math.max(0, sec) * 1000;
        return this._esc(Lang.t(key, { t: '{T}' })).replace('{T}', '<b data-cd-end="' + end + '">' + this._fmtT(sec) + '</b>');
    },

    // ---------- превью предметов (рисуются теми же функциями, что и в игре) ----------

    _chars() {
        return typeof Characters !== 'undefined' ? /** @type {any} */ (Characters) : null;
    },

    _item(id) {
        const w = this._wdItems.get(id);
        if (w) return w;
        const C = typeof Cosmetics !== 'undefined' ? /** @type {any} */ (Cosmetics) : null;
        return C && C.get ? C.get(id) : null;
    },

    _cvNew() {
        const cv = document.createElement('canvas');
        cv.width = 128;
        cv.height = 128;
        return cv;
    },

    /** Рисует функцией игры в холст 256x256 и кладёт на cv в прямоугольник x,y,w,h. */
    _stamp(cv, fnName, args, x, y, w, h) {
        const C = this._chars();
        const f = C && (C[fnName] || C['_' + fnName]);
        if (!f) return false;
        try {
            const t = document.createElement('canvas');
            t.width = 256;
            t.height = 256;
            f.apply(C, [t.getContext('2d')].concat(args));
            cv.getContext('2d').drawImage(t, x, y, w, h);
            return true;
        } catch (e) {
            return false;
        }
    },

    _roundBox(c, x, y, w, h, col, r) {
        c.beginPath();
        if (c.roundRect) c.roundRect(x, y, w, h, r || 3); else c.rect(x, y, w, h);
        c.fillStyle = col;
        c.fill();
        c.stroke();
    },

    /** Мини-фигурка спереди: классическая R6 или мультяшная (Playables, RV_TOON). */
    _cvSkin(d) {
        if (RV_TOON) return this._cvSkinToon(d);
        const cv = this._cvNew(), c = cv.getContext('2d');
        c.lineWidth = 3.5;
        c.strokeStyle = '#161a22';
        c.lineJoin = 'round';
        const arm = d.sleeves ? d.shirt : d.skin;
        this._roundBox(c, 22, 48, 21, 40, arm);
        this._roundBox(c, 85, 48, 21, 40, arm);
        this._roundBox(c, 44, 88, 20, 34, d.pants);
        this._roundBox(c, 64, 88, 20, 34, d.pants);
        this._roundBox(c, 43, 48, 42, 40, d.shirt);
        if (d.decal) this._stamp(cv, 'drawDecal', [d.decal, d.decalColor || '#ffffff'], 47, 51, 34, 34);
        this._roundBox(c, 46, 6, 36, 38, d.skin, 8);
        this._stamp(cv, 'drawFace', ['smile'], 46, 7, 36, 36);
        this._cvMetal(c, d);
        return cv;
    },

    _cvMetal(c, d) {
        if (d.metal) {
            c.globalCompositeOperation = 'source-atop';
            const g = c.createLinearGradient(0, 0, 128, 128);
            g.addColorStop(0, 'rgba(255,255,255,.55)');
            g.addColorStop(0.5, 'rgba(255,255,255,0)');
            g.addColorStop(1, 'rgba(255,255,255,.3)');
            c.fillStyle = g;
            c.fillRect(0, 0, 128, 128);
            c.globalCompositeOperation = 'source-over';
        }
    },

    /** Мультяшная мини-фигурка (как char_toon): кофта с принтом, рукава и кулаки, штаны, кроссовки. */
    _cvSkinToon(d) {
        const cv = this._cvNew(), c = cv.getContext('2d');
        c.lineWidth = 3.5;
        c.strokeStyle = '#161a22';
        c.lineJoin = 'round';
        const arm = d.sleeves ? d.shirt : d.skin;
        const shoes = d.shoes || (d.metal ? d.pants : '#f5f5f5'), sole = d.sole || (d.metal ? d.pants : '#3a3f4a');
        const dot = (x, y, r, col) => { c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fillStyle = col; c.fill(); c.stroke(); };
        this._roundBox(c, 26, 50, 17, 36, arm, 8);
        this._roundBox(c, 85, 50, 17, 36, arm, 8);
        dot(34.5, 88, 8.5, d.skin);
        dot(93.5, 88, 8.5, d.skin);
        this._roundBox(c, 47, 86, 15, 28, d.pants, 5);
        this._roundBox(c, 66, 86, 15, 28, d.pants, 5);
        this._roundBox(c, 43, 113, 21, 9, shoes, 4);
        this._roundBox(c, 64, 113, 21, 9, shoes, 4);
        c.fillStyle = sole; c.fillRect(45, 118.5, 17, 2.5); c.fillRect(66, 118.5, 17, 2.5);
        this._roundBox(c, 43, 47, 42, 43, d.shirt, 11);
        if (d.decal) this._stamp(cv, 'drawDecal', [d.decal, d.decalColor || '#ffffff'], 47, 51, 34, 34);
        if (d.back) {
            c.save(); c.strokeStyle = d.backColor || '#3fa34d'; c.lineWidth = 4;
            c.beginPath(); c.moveTo(53, 48); c.lineTo(53, 78); c.moveTo(75, 48); c.lineTo(75, 78); c.stroke(); c.restore();
        }
        this._roundBox(c, 57, 40, 14, 9, d.skin, 3);
        this._roundBox(c, 46, 5, 36, 38, d.skin, 13);
        this._stamp(cv, 'drawFace', ['hero'], 46, 6, 36, 36);
        this._cvMetal(c, d);
        return cv;
    },

    _cvFace(d) {
        const cv = this._cvNew(), c = cv.getContext('2d');
        c.lineWidth = 5;
        c.strokeStyle = '#161a22';
        if (RV_TOON) this._roundBox(c, 12, 12, 104, 104, '#f2c29b', 30);
        else this._roundBox(c, 12, 12, 104, 104, '#f5cd30', 24);
        this._stamp(cv, 'drawFace', [d.face || (RV_TOON ? 'hero' : 'smile')], 12, 12, 104, 104);
        return cv;
    },

    /** След: 6 спрайтов по диагонали, растут и проявляются; пустой tex — значок «нет». */
    _cvTrail(d) {
        const cv = this._cvNew(), c = cv.getContext('2d');
        if (!d.tex) {
            c.lineCap = 'round';
            for (const [col, w] of [['#161a22', 13], ['#ff5a4a', 7]]) {
                c.strokeStyle = col;
                c.lineWidth = w;
                c.beginPath(); c.arc(64, 64, 38, 0, Math.PI * 2); c.stroke();
                c.beginPath(); c.moveTo(37, 91); c.lineTo(91, 37); c.stroke();
            }
            return cv;
        }
        for (let i = 0; i < 6; i++) {
            const k = i / 5, s = 30 + k * 40, x = 18 + k * 70, y = 100 - k * 66;
            const c1 = d.rainbow ? 'hsl(' + i * 60 + ',90%,60%)' : d.c1, c2 = d.rainbow ? 'hsl(' + (i * 60 + 40) + ',90%,72%)' : d.c2;
            c.globalAlpha = 0.45 + k * 0.55;
            const ok = this._stamp(cv, 'drawSprite', [d.tex, c1, c2], x - s / 2, y - s / 2, s, s);
            if (!ok) { c.beginPath(); c.arc(x, y, s / 3, 0, Math.PI * 2); c.fillStyle = c1; c.fill(); }
        }
        c.globalAlpha = 1;
        return cv;
    },

    /** Запасная иконка шляпы, пока нет рендера модели: голова и купол цвета tint. */
    _cvHat(it) {
        const d = it.data || {}, cv = this._cvNew(), c = cv.getContext('2d');
        c.lineWidth = 4;
        c.strokeStyle = '#161a22';
        c.lineJoin = 'round';
        c.beginPath(); c.arc(64, 88, 32, 0, Math.PI * 2); c.fillStyle = '#ffd9a8'; c.fill(); c.stroke();
        if (!d.acc) {
            c.lineWidth = 7; c.strokeStyle = '#ff5a4a'; c.beginPath(); c.moveTo(36, 62); c.lineTo(92, 114); c.stroke();
            return cv;
        }
        const col = d.tint || ({ crown: '#ffc83d', halo: '#fff3a0', headphones: '#2a3140', tophat: '#2a3140', pirate: '#2a2a35', wizard: '#6b3f9e', viking: '#a3a2a5' }[d.acc]) || '#a05cff';
        c.fillStyle = col;
        c.beginPath(); c.arc(64, 68, 34, Math.PI, 0); c.closePath(); c.fill(); c.stroke();
        if (/cap|cowboy|pirate|propeller/.test(d.acc)) { c.beginPath(); c.roundRect ? c.roundRect(60, 64, 56, 12, 6) : c.rect(60, 64, 56, 12); c.fill(); c.stroke(); }
        if (d.acc === 'crown') { c.beginPath(); c.moveTo(34, 70); c.lineTo(34, 38); c.lineTo(50, 54); c.lineTo(64, 34); c.lineTo(78, 54); c.lineTo(94, 38); c.lineTo(94, 70); c.closePath(); c.fill(); c.stroke(); }
        return cv;
    },

    /** Запасная иконка ножа по модели: нож, кинжал, катана, тесак, леденец, рыба, кристалл. */
    _cvKnife(d) {
        const cv = this._cvNew(), c = cv.getContext('2d');
        const blade = d.blade || '#d8dde3', handle = d.handle || '#2a2a35';
        c.translate(64, 66);
        c.rotate(Math.PI / 4);
        c.lineWidth = 4.5;
        c.strokeStyle = '#161a22';
        c.lineJoin = 'round';
        c.lineCap = 'round';
        const rect = (x, y, w, h, col, r) => { c.beginPath(); c.roundRect ? c.roundRect(x, y, w, h, r || 3) : c.rect(x, y, w, h); c.fillStyle = col; c.fill(); c.stroke(); };
        const poly = (pts, col) => { c.beginPath(); pts.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]))); c.closePath(); c.fillStyle = col; c.fill(); c.stroke(); };
        switch (d.model) {
            case 'cleaver': poly([[-18, -52], [18, -52], [18, 6], [-18, 6]], blade); rect(-5, 6, 10, 42, handle); break;
            case 'katana': poly([[0, -62], [7, -50], [7, 12], [-7, 12], [-7, -48]], blade); rect(-14, 12, 28, 7, '#ffc83d'); rect(-5, 19, 10, 36, handle); break;
            case 'dagger': poly([[0, -58], [10, -34], [8, 8], [-8, 8], [-10, -34]], blade); rect(-22, 8, 44, 8, '#ffc83d'); rect(-5, 16, 10, 24, handle); c.beginPath(); c.arc(0, 46, 7, 0, 7); c.fillStyle = '#34e27a'; c.fill(); c.stroke(); break;
            case 'candy': c.lineWidth = 16; c.strokeStyle = '#161a22'; c.beginPath(); c.moveTo(0, 50); c.lineTo(0, -30); c.arc(-16, -30, 16, 0, -Math.PI, true); c.stroke(); c.lineWidth = 8; c.strokeStyle = blade; c.stroke(); c.setLineDash([9, 9]); c.strokeStyle = handle; c.stroke(); c.setLineDash([]); break;
            case 'fish': c.beginPath(); c.ellipse(0, -20, 18, 38, 0, 0, Math.PI * 2); c.fillStyle = blade; c.fill(); c.stroke(); poly([[0, 14], [-18, 46], [18, 46]], handle); c.beginPath(); c.arc(-6, -38, 3.5, 0, 7); c.fillStyle = '#161a22'; c.fill(); break;
            case 'ice': poly([[0, -62], [16, -30], [10, 8], [-10, 8], [-16, -30]], blade); c.beginPath(); c.moveTo(0, -62); c.lineTo(0, 8); c.stroke(); rect(-16, 8, 32, 8, handle); rect(-5, 16, 10, 28, handle); break;
            default: poly([[0, -60], [12, -30], [10, 8], [-10, 8], [-10, -34]], blade); rect(-18, 8, 36, 8, '#ffc83d'); rect(-6, 16, 12, 34, handle);
        }
        return cv;
    },

    /** Узел-превью предмета: иконка-рендер (COSMETIC_ICONS), иначе рисунок из данных предмета. */
    _pvDraw(it) {
        const d = it.data || {};
        if (it.tab === 'emote') {
            const s = document.createElement('span');
            s.className = 'pvs';
            s.innerHTML = '<svg viewBox="0 0 48 48" fill="none" stroke="#161a22" stroke-width="3" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true">' + gameUiEmote(d.dance) + '</svg>';
            return s;
        }
        let src = this._pvc.get(it.id);
        if (!src) {
            src = it.tab === 'skin' ? this._cvSkin(d) : it.tab === 'face' ? this._cvFace(d) : it.tab === 'trail' ? this._cvTrail(d) : it.tab === 'hat' ? this._cvHat(it) : this._cvKnife(d);
            this._pvc.set(it.id, src);
        }
        const cv = document.createElement('canvas');
        cv.width = src.width;
        cv.height = src.height;
        cv.getContext('2d').drawImage(src, 0, 0);
        return cv;
    },

    _pvNode(it) {
        const wrap = document.createElement('span');
        wrap.className = 'pvi';
        if (!it) { wrap.innerHTML = this._ic('gift'); return wrap; }
        // Playables (RV_TOON) — мультяшный набор иконок, где он есть; ножи общие.
        const toon = RV_TOON && typeof COSMETIC_ICONS_TOON !== 'undefined' ? COSMETIC_ICONS_TOON[it.id] : '';
        const url = toon || (typeof COSMETIC_ICONS !== 'undefined' ? COSMETIC_ICONS[it.id] : '');
        if (url) {
            const im = new Image();
            im.alt = '';
            im.draggable = false;
            im.decoding = 'async';
            im.onerror = () => { wrap.textContent = ''; wrap.appendChild(this._pvDraw(it)); };
            im.src = url;
            wrap.appendChild(im);
            return wrap;
        }
        wrap.appendChild(this._pvDraw(it));
        return wrap;
    },

    /** Разметка-заглушка превью; _hydrate наполняет её после вставки в DOM. */
    _pv(id, cls) {
        return '<span class="pv' + (cls ? ' ' + cls : '') + '" data-pv="' + this._esc(id) + '"></span>';
    },

    _hydrate(root) {
        for (const s of root.querySelectorAll('[data-pv]')) {
            if (s.firstChild) continue;
            s.appendChild(this._pvNode(this._item(s.getAttribute('data-pv'))));
        }
    },

    // ---------- гардероб ----------

    /** Свободная под 3D-персонажа область (css px): слева 42% в альбоме, сверху 40% в портрете. */
    previewRect() {
        const W = this.root.clientWidth || window.innerWidth, H = this.root.clientHeight || window.innerHeight;
        if (W > H) return { x: 0, y: 0, w: Math.round(W * 0.42), h: H };
        return { x: 0, y: 0, w: W, h: Math.round(H * 0.4) };
    },

    showWardrobe() {
        if (!this._canOpenMeta() || !this.handlers.getWardrobe) return;
        this._metaOpen('wardrobe');
        this._wd = { tab: '', sel: '', busy: false };
        if (this.handlers.onWardrobe) this.handlers.onWardrobe(true);
        this._renderWardrobe();
        this._show(this.el.wardrobe);
        this.el.wGrid.scrollTop = 0;
    },

    hideWardrobe() {
        this._metaHide('wardrobe');
        this._metaBack();
    },

    _renderWardrobe() {
        const E = this.el, W = this._wd, d = this.handlers.getWardrobe();
        if (!d || !W) return;
        this._wdData = d;
        this._wdItems = new Map((d.items || []).map(i => [i.id, i]));
        E.wCoins.textContent = String(d.coins);
        E.wGems.textContent = String(d.gems);
        const tabs = d.tabs || [];
        if (!tabs.some(t => t.id === W.tab)) { W.tab = tabs.length ? tabs[0].id : ''; W.sel = ''; }
        const items = (d.items || []).filter(i => i.tab === W.tab);
        if (!items.some(i => i.id === W.sel)) { const eq = items.find(i => i.equipped) || items[0]; W.sel = eq ? eq.id : ''; }
        const COLORS = ['#2f8cff', '#ff3b3b', '#ffc83d', '#34e27a', '#a05cff', '#ff9a1f'];
        const ICONS = { skin: 'shirt', hat: 'hat', face: 'face', knife: 'knife', trail: 'trail', emote: 'emote' };
        E.wdTabs.innerHTML = tabs.map((t, i) => '<button class="tab' + (t.id === W.tab ? ' on' : '') + '" type="button" data-act="wdTab" data-tab="' + this._esc(t.id)
            + '" style="--tc:' + COLORS[i % COLORS.length] + '" aria-label="' + this._esc(Lang.t(t.titleKey)) + '">' + this._ic(ICONS[t.id] || 'star') + '<span>' + this._esc(Lang.t(t.titleKey)) + '</span></button>').join('');
        const cur = tabs.find(t => t.id === W.tab);
        const own = items.filter(i => i.owned).length;
        E.wdSub.innerHTML = '<span>' + this._esc(cur ? Lang.t(cur.titleKey) : '') + '</span><span>' + own + '/' + items.length + '</span>';
        const st = E.wGrid.scrollTop;
        E.wGrid.innerHTML = items.map(it => this._wdCard(it, d, W.sel)).join('');
        E.wGrid.scrollTop = st;
        this._hydrate(E.wGrid);
        this._renderWdDetail();
    },

    _wdCard(it, d, sel) {
        const T = (k, p) => this._esc(Lang.t(k, p));
        let st;
        if (it.equipped) st = '<span class="ws own">' + this._ic('check') + T('wdEquipped') + '</span>';
        else if (it.owned) st = '<span class="ws own">' + T('wdOwned') + '</span>';
        else if (it.currency === 'coins') st = '<span class="ws' + (d.coins < it.price ? ' poor' : '') + '">' + this._ic('coin') + it.price + '</span>';
        else if (it.currency === 'ads') {
            const need = Math.max(1, it.adsNeed || 1), done = Math.min(need, it.adsDone || 0);
            st = '<span class="wad"><small>' + T('adBtn') + '</small><span class="wprog"><i style="transform:scaleX(' + (done / need).toFixed(3) + ')"></i><b>' + done + '/' + need + '</b></span></span>';
        } else st = '<span class="ws">' + this._ic('gift') + T('wdExclusive') + '</span>';
        const mark = it.equipped ? '<i class="wcm">' + this._ic('star') + '</i>' : (it.owned ? '<i class="wcm">' + this._ic('check') + '</i>' : '');
        return '<button class="wcard r-' + this._esc(it.rarity) + (it.id === sel ? ' sel' : '') + (it.owned ? ' own' : '') + (it.equipped ? ' eq' : '') + '" type="button" data-act="wdSel" data-id="' + this._esc(it.id) + '">'
            + this._pv(it.id) + '<span class="wn">' + T(it.nameKey) + '</span>' + st + mark + '</button>';
    },

    /** Нижняя панель выбранного предмета: название, редкость и главное действие. */
    _renderWdDetail() {
        const E = this.el, W = this._wd, d = this._wdData;
        const it = W && this._wdItems.get(W.sel);
        if (!it) { E.wDetail.innerHTML = ''; return; }
        const T = (k, p) => this._esc(Lang.t(k, p));
        const busy = !!W.busy;
        let act;
        if (it.equipped) act = '<button class="btn green" type="button" disabled>' + this._ic('check') + '<span>' + T('wdEquipped') + '</span></button>';
        else if (it.owned) act = '<button class="btn blue" type="button" data-act="wdEquip"' + (busy ? ' disabled' : '') + '><span>' + T('wdEquip') + '</span></button>';
        else if (it.currency === 'coins') {
            const can = d.coins >= it.price;
            act = '<button class="btn gold" type="button" data-act="wdBuy"' + (can && !busy ? '' : ' disabled') + '><span>' + T('wdBuy', { n: it.price }) + '</span>' + this._ic('coin') + '</button>'
                + (can ? '' : '<div class="why">' + T('wdNeedCoins') + '</div>');
        } else if (it.currency === 'ads') {
            act = '<button class="btn orange" type="button" data-act="wdAd"' + (d.adsReady && !busy ? '' : ' disabled') + '>' + this._ic('adplay') + '<span>' + T('wdAdProgress', { k: it.adsDone || 0, n: it.adsNeed || 1 }) + '</span></button>'
                + (d.adsReady ? '' : '<div class="why">' + T('adUnavailable') + '</div>');
        } else act = '<div class="why ok">' + T('wdExclusive') + '</div>';
        const rarKey = { common: 'rarCommon', rare: 'rarRare', epic: 'rarEpic', legendary: 'rarLegendary', mythic: 'rarMythic' }[it.rarity] || 'rarCommon';
        const RC = { common: '#8b93a3', rare: '#2f8cff', epic: '#a05cff', legendary: '#ffc83d', mythic: '#ff3b8a' };
        E.wDetail.style.setProperty('--rc', RC[it.rarity] || RC.common);
        E.wDetail.innerHTML = this._pv(it.id) + '<div class="wd-info"><div class="wd-name">' + T(it.nameKey) + '</div><span class="wd-rar">' + T(rarKey) + '</span>'
            + (it.owned ? '' : '<span class="wd-try">' + T('wdTrying') + '</span>') + '</div><div class="wd-act">' + act + '</div>';
        this._hydrate(E.wDetail);
    },

    _wdSelect(id) {
        const E = this.el, W = this._wd, it = this._wdItems.get(id);
        if (!it || !W) return;
        W.sel = id;
        for (const c of E.wGrid.children) c.classList.toggle('sel', c.getAttribute('data-id') === id);
        this._renderWdDetail();
        if (this.handlers.onTryOn) this.handlers.onTryOn(it.equipped ? null : id);
    },

    _wdTab(id) {
        const W = this._wd;
        if (!W || W.tab === id) return;
        W.tab = id;
        W.sel = '';
        if (this.handlers.onTryOn) this.handlers.onTryOn(null);
        this._renderWardrobe();
        this.el.wGrid.scrollTop = 0;
    },

    /** Покупка за монеты / один просмотр рекламы; кнопка заблокирована, пока ждём ответ. */
    async _wdAction(kind) {
        const W = this._wd, H = this.handlers;
        if (!W || W.busy) return;
        const id = W.sel;
        W.busy = true;
        this._renderWdDetail();
        let ok = false;
        try {
            if (kind === 'buy') ok = !!(await H.onCosBuy(id));
            else if (kind === 'ad') ok = !!(await H.onCosAd(id));
            else if (kind === 'equip') { await H.onCosEquip(id); ok = true; }
        } catch (e) { ok = false; }
        W.busy = false;
        if (this._meta !== 'wardrobe') return;
        const before = this._wdItems.get(id);
        const wasOwned = !!(before && before.owned);
        this._renderWardrobe();
        const after = this._wdItems.get(id);
        if (!ok && kind === 'ad') this._toast(Lang.t('adFailed'));
        if (ok && after && after.owned && !wasOwned) {
            this._confetti(26, this.el.mfx);
            for (const c of this.el.wGrid.children) if (c.getAttribute('data-id') === id) c.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.12)', offset: 0.4 }, { transform: 'scale(1)' }], { duration: 420, easing: 'ease-out' });
        }
    },

    // ---------- ежедневный подарок ----------

    showDaily() {
        if (!this._canOpenMeta() || !this.handlers.getDaily) return;
        this._metaOpen('daily');
        this._dyBusy = false;
        this._renderDaily();
        this._show(this.el.daily);
    },

    hideDaily() {
        this._metaHide('daily');
        this._metaBack();
    },

    _renderDaily() {
        const E = this.el, d = this.handlers.getDaily();
        if (!d) return;
        this._dy = d;
        const T = (k, p) => this._esc(Lang.t(k, p));
        const busy = this._dyBusy;
        const tiles = (d.rewards || []).map((r, i) => this._dayTile(r, i, d)).join('');
        const cur = (d.rewards || [])[d.day];
        let foot;
        if (d.canClaim) {
            foot = '<button class="btn green big" type="button" data-act="dyClaim"' + (busy ? ' disabled' : '') + '>' + this._ic('gift') + '<span>' + T('dayClaim') + '</span></button>';
            if (!cur || cur.day !== 7) {
                foot += '<button class="btn orange" type="button" data-act="dyDouble"' + (busy || !d.adsReady ? ' disabled' : '') + '>' + this._ic('adplay') + '<span>' + T('dayDouble') + '</span></button>'
                    + (d.adsReady ? '' : '<div class="why">' + T('adUnavailable') + '</div>');
            }
        } else {
            foot = '<div class="dy-next">' + this._cdText('dayNext', d.nextIn || 0) + '</div>';
        }
        E.dyBody.innerHTML = '<div class="dy-wrap"><div class="dy-grid">' + tiles + '</div><div class="dy-foot">' + foot + '</div></div>';
        this._hydrate(E.dyBody);
    },

    _dayTile(r, i, d) {
        const T = (k, p) => this._esc(Lang.t(k, p));
        const state = i < d.day ? 'done' : i === d.day ? (d.canClaim ? 'today' : 'next') : 'future';
        const coinL = n => '<span class="da">' + this._ic('coin') + '+' + n + '</span>';
        const gemL = n => '<span class="da">' + this._ic('gem') + '+' + n + '</span>';
        let ico = '', lines = '';
        if (r.kind === 'coins') { ico = this._metaArt('coins_pile', 'coin'); lines = coinL(r.amount) + (r.gems ? gemL(r.gems) : ''); }
        else if (r.kind === 'gems') { ico = this._metaArt('gems_pile', 'gem'); lines = gemL(r.amount) + (r.coins ? coinL(r.coins) : ''); }
        else {
            const known = r.itemId && this._item(r.itemId);
            ico = known ? this._pv(r.itemId) : this._ic('gift');
            lines = '<span class="dn">' + (known ? T('cos_' + r.itemId) : T('dayItem')) + '</span>' + (r.coins ? coinL(r.coins) : '');
        }
        const big = r.day === 7;
        if (big) ico = this._metaArt('chest', 'gift');
        else if (r.kind === 'item') ico = this._metaArt(state === 'done' ? 'gift_open' : 'gift_closed', 'gift');
        return '<div class="dtile ' + state + (big ? ' big' : '') + '"><div class="dh">' + T('dayN', { n: r.day }) + '</div><div class="db">'
            + (big ? '<span class="dgoal">' + T('dayGoal') + '</span>' : '') + '<span class="dico">' + ico + '</span>' + lines + '</div>'
            + (state === 'done' ? '<i class="dchk">' + this._ic('check') + '</i>' : '') + '</div>';
    },

    async _dyClaim(double) {
        if (this._dyBusy) return;
        this._dyBusy = true;
        this._renderDaily();
        let r = null;
        try { r = await this.handlers.onDailyClaim(!!double); } catch (e) { r = null; }
        this._dyBusy = false;
        if (this._meta !== 'daily') return;
        this._renderDaily();
        if (!r) { if (double) this._toast(Lang.t('adFailed')); return; }
        this.setMenuBadges({ daily: false });
        await this._popup(this._gotHtml(r), 'dayGot');
    },

    // ---------- колесо фортуны ----------

    showWheel() {
        if (!this._canOpenMeta() || !this.handlers.getWheel) return;
        this._metaOpen('wheel');
        this._wh = { busy: false };
        this._renderWheel(true);
        this._show(this.el.wheel);
    },

    hideWheel() {
        if (this._spinLock) return;
        this._metaHide('wheel');
        this._metaBack();
    },

    _renderWheel(draw) {
        const E = this.el, d = this.handlers.getWheel();
        if (!d) return;
        this._whData = d;
        if (draw) {
            this._drawWheel(E.whCv, d.sectors || []);
            E.whCv.style.transform = 'rotate(' + this._whRot + 'deg)';
        }
        const T = (k, p) => this._esc(Lang.t(k, p));
        const busy = !!(this._wh && this._wh.busy);
        let ctl;
        if (d.freeAvailable) ctl = '<button class="btn green big" type="button" data-act="whFree"' + (busy ? ' disabled' : '') + '>' + this._ic('wheel') + '<span>' + T('whSpinFree') + '</span></button>';
        else ctl = '<button class="btn gray" type="button" disabled><span>' + this._cdText('whFreeIn', d.nextFreeIn || 0) + '</span></button>';
        const left = d.adSpinsLeft || 0, can = left > 0 && d.adsReady && !busy;
        ctl += '<button class="btn orange" type="button" data-act="whAd"' + (can ? '' : ' disabled') + '>' + this._ic('adplay')
            + '<span class="bt">' + T('whSpinAd') + '<small>' + T('adBtn') + '</small><small>' + T('whAdLeft', { n: left }) + '</small></span></button>';
        if (left <= 0) ctl += '<div class="why ok">' + T('whAdLimit') + '</div>';
        else if (!d.adsReady) ctl += '<div class="why">' + T('adUnavailable') + '</div>';
        E.whCtl.innerHTML = ctl;
    },

    _cvIcon(c, kind, r) {
        const path = ART_META[kind === 'coins' ? 'coins_pile' : kind === 'gems' ? 'gems_pile' : 'prize_box'];
        const img = ArtAssets.image(path);
        if (img) { c.drawImage(img, -r, -r, r * 2, r * 2); return; }
        c.lineWidth = r * 0.24;
        c.strokeStyle = '#161a22';
        c.lineJoin = 'round';
        if (kind === 'coins') {
            c.beginPath(); c.arc(0, 0, r, 0, Math.PI * 2); c.fillStyle = '#ffc83d'; c.fill(); c.stroke();
            c.beginPath(); c.arc(0, 0, r * 0.58, 0, Math.PI * 2); c.lineWidth = r * 0.16; c.strokeStyle = '#c68f12'; c.stroke();
        } else if (kind === 'gems') {
            c.beginPath(); c.moveTo(0, r); c.lineTo(-r, -r * 0.1); c.lineTo(-r * 0.55, -r * 0.9); c.lineTo(r * 0.55, -r * 0.9); c.lineTo(r, -r * 0.1); c.closePath();
            c.fillStyle = '#34e27a'; c.fill(); c.stroke();
            c.beginPath(); c.moveTo(-r, -r * 0.1); c.lineTo(r, -r * 0.1); c.lineWidth = r * 0.14; c.stroke();
        } else {
            c.fillStyle = '#ff3b3b';
            c.beginPath(); c.rect(-r, -r * 0.35, r * 2, r * 1.35); c.fill(); c.stroke();
            c.beginPath(); c.rect(-r * 1.1, -r * 0.85, r * 2.2, r * 0.5); c.fillStyle = '#ff6a5a'; c.fill(); c.stroke();
            c.beginPath(); c.rect(-r * 0.18, -r * 0.85, r * 0.36, r * 1.85); c.fillStyle = '#ffc83d'; c.fill(); c.lineWidth = r * 0.12; c.stroke();
        }
    },

    /** Колесо один раз: сектор 0 начинается наверху и идёт по часовой; обод с лампочками. */
    _drawWheel(cv, sectors) {
        const c = cv.getContext('2d'), W = cv.width, R = W / 2, ink = '#161a22';
        c.clearRect(0, 0, W, W);
        c.beginPath(); c.arc(R, R, R - 5, 0, Math.PI * 2); c.fillStyle = '#2a3140'; c.fill(); c.lineWidth = 9; c.strokeStyle = ink; c.stroke();
        for (let i = 0; i < 20; i++) {
            const a = i / 20 * Math.PI * 2;
            c.beginPath(); c.arc(R + Math.cos(a) * (R - 24), R + Math.sin(a) * (R - 24), 8, 0, Math.PI * 2);
            c.fillStyle = i % 2 ? '#ffffff' : '#ffc83d'; c.fill(); c.lineWidth = 3; c.stroke();
        }
        const rs = R - 46, n = Math.max(1, sectors.length), S = Math.PI * 2 / n;
        c.font = '900 ' + Math.round(rs * 0.16) + 'px RushFont, Montserrat, system-ui, sans-serif';
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.lineJoin = 'round';
        sectors.forEach((s, i) => {
            const a0 = -Math.PI / 2 + i * S;
            c.beginPath(); c.moveTo(R, R); c.arc(R, R, rs, a0, a0 + S); c.closePath();
            c.fillStyle = s.color || '#ffc83d'; c.fill(); c.lineWidth = 7; c.strokeStyle = ink; c.stroke();
            c.save();
            c.translate(R, R);
            c.rotate(a0 + S / 2);
            this._cvIconAt(c, s.kind, rs * 0.79, rs * 0.14);
            if (s.kind !== 'item') {
                c.lineWidth = rs * 0.07; c.strokeStyle = ink;
                c.strokeText(String(s.amount), rs * 0.48, 0);
                c.fillStyle = '#ffffff';
                c.fillText(String(s.amount), rs * 0.48, 0);
            }
            c.restore();
        });
        c.beginPath(); c.arc(R, R, rs * 0.24, 0, Math.PI * 2); c.fillStyle = '#fff7e6'; c.fill(); c.lineWidth = 7; c.strokeStyle = ink; c.stroke();
    },

    _cvIconAt(c, kind, x, r) {
        c.save();
        c.translate(x, 0);
        this._cvIcon(c, kind, r);
        c.restore();
    },

    /** Результат приходит ДО анимации (приз уже начислен игрой); колесо встаёт точно в центр сектора. */
    async _whSpin(byAd) {
        const E = this.el, W = this._wh, H = this.handlers;
        if (!W || W.busy || this._spinLock) return;
        W.busy = true;
        this._renderWheel(false);
        let res = null;
        try { res = await H.onWheelSpin(!!byAd); } catch (e) { res = null; }
        const n = ((this._whData && this._whData.sectors) || []).length;
        if (!res || typeof res.index !== 'number' || !n) {
            W.busy = false;
            if (this._meta === 'wheel') { this._renderWheel(false); if (byAd) this._toast(Lang.t('adFailed')); }
            return;
        }
        this._spinLock = true;
        const S = 360 / n, cur = this._whRot;
        const want = -((res.index + 0.5) * S);
        const target = cur + 360 * 5 + (((want - cur) % 360) + 360) % 360;
        this._whRot = target;
        const anim = E.whCv.animate([{ transform: 'rotate(' + cur + 'deg)' }, { transform: 'rotate(' + target + 'deg)' }],
            { duration: 5200, easing: 'cubic-bezier(.1,.75,.12,1)', fill: 'forwards' });
        this._whAnim = anim;
        const wig = E.whPtr.animate([{ transform: 'rotate(0deg)' }, { transform: 'rotate(-16deg)' }], { duration: 120, iterations: Infinity, direction: 'alternate', easing: 'ease-in-out' });
        try { await anim.finished; } catch (e) { /* отменена */ }
        wig.cancel();
        E.whCv.style.transform = 'rotate(' + target + 'deg)';
        anim.cancel();
        this._whAnim = null;
        this._spinLock = false;
        W.busy = false;
        if (this._meta !== 'wheel') return;
        this._renderWheel(false);
        await this._popup(this._prizeHtml(res.prize || {}), 'whPrize');
    },

    // ---------- рекорды ----------

    showLeaderboard() {
        if (!this._canOpenMeta()) return;
        this._metaOpen('board');
        this.el.bBody.innerHTML = '<div class="lb-msg">' + this._esc(Lang.t('loading')) + '</div>';
        this._show(this.el.board);
        this._loadBoard();
    },

    hideLeaderboard() {
        this._lbTok++;
        this._metaHide('board');
        this._metaBack();
    },

    async _loadBoard() {
        const tok = ++this._lbTok;
        let d = null;
        try { d = this.handlers.getLeaderboard ? await this.handlers.getLeaderboard() : null; } catch (e) { d = null; }
        if (tok !== this._lbTok || this._meta !== 'board') return;
        this._renderBoard(d);
    },

    _renderBoard(d) {
        const E = this.el, T = k => this._esc(Lang.t(k));
        const entries = (d && d.entries) || [];
        let html = '';
        if (d && d.authorized === false) html += '<button class="btn blue nocaps lb-login" type="button" data-act="lbLogin">' + T('lbLogin') + '</button>';
        if (!entries.length) html += '<div class="lb-msg">' + T('lbEmpty') + '</div>';
        const fmt = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
        const hue = s => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360; return h; };
        for (const e of entries) {
            const name = String(e.name == null ? '' : e.name);
            const av = e.avatar
                ? '<span class="lb-av"><img src="' + this._esc(e.avatar) + '" alt="" draggable="false"></span>'
                : '<span class="lb-av" style="background:hsl(' + hue(name) + ',65%,50%)">' + this._esc(name.charAt(0).toUpperCase() || '?') + '</span>';
            html += '<div class="lb-row' + (e.me ? ' me' : '') + (e.rank <= 3 ? ' r' + e.rank : '') + '"><span class="lb-rank">' + this._esc(e.rank) + '</span>' + av
                + '<span class="lb-name">' + this._esc(e.me && name !== Lang.t('plateYou') ? name + ' (' + Lang.t('plateYou') + ')' : name) + '</span><span class="lb-score">' + fmt(e.score) + '</span></div>';
        }
        E.bBody.innerHTML = '<div class="lb-wrap">' + html + '</div>';
        for (const im of E.bBody.querySelectorAll('.lb-av img')) {
            im.addEventListener('error', () => { const p = im.parentElement; if (p) { p.textContent = '?'; p.style.background = '#8b93a3'; } });
        }
    },

    async _lbLogin() {
        if (this._lbBusy) return;
        this._lbBusy = true;
        try { if (this.handlers.onLogin) await this.handlers.onLogin(); } catch (e) { /* игра сама покажет ошибку */ }
        this._lbBusy = false;
        if (this._meta === 'board') this._loadBoard();
    },

    // ---------- окно-итог и подсказка ----------

    _gotHtml(r) {
        const T = (k, p) => this._esc(Lang.t(k, p));
        let h = '<div class="reward-art">' + this._metaArt('gift_open', 'gift') + '</div>';
        if (r.coins) h += '<div class="pop-line c">' + this._ic('coin') + '<b>+' + r.coins + '</b></div>';
        if (r.gems) h += '<div class="pop-line g">' + this._ic('gem') + '<b>+' + r.gems + '</b></div>';
        if (r.itemId) h += this._pv(r.itemId, 'pop-pv') + '<div class="pop-name">' + T('cos_' + r.itemId) + '</div>';
        if (r.converted) h += '<div class="pop-note">' + T('dayConverted') + '</div>';
        return h;
    },

    _prizeHtml(p) {
        const T = (k, n) => this._esc(Lang.t(k, n));
        if (p.itemId) return this._pv(p.itemId, 'pop-pv') + '<div class="pop-name">' + T('cos_' + p.itemId) + '</div>';
        let h = '<div class="reward-art">' + this._metaArt('prize_box', 'gift') + '</div>';
        h += p.kind === 'gems'
            ? '<div class="pop-line g">' + this._ic('gem') + '<b>+' + p.amount + '</b></div>'
            : '<div class="pop-line c">' + this._ic('coin') + '<b>+' + p.amount + '</b></div>';
        if (p.converted) h += '<div class="pop-note">' + T('dayConverted') + '</div>';
        return h;
    },

    /** Окно с наградой поверх экрана; промис выполняется по «Отлично!». */
    _popup(bodyHtml, titleKey) {
        return new Promise(resolve => {
            const E = this.el;
            if (this._popRes) this._popupClose();
            E.popTitle.textContent = Lang.t(titleKey);
            E.popBody.innerHTML = bodyHtml;
            E.popOk.textContent = Lang.t('uiOk');
            this._hydrate(E.popBody);
            this._popRes = resolve;
            E.popup.classList.remove('hidden');
            E.popup.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 160 });
            E.popCard.animate([{ transform: 'scale(.5) rotate(-8deg)', opacity: 0 }, { transform: 'scale(1.06)', opacity: 1, offset: 0.65 }, { transform: 'none', opacity: 1 }], { duration: 420, easing: 'cubic-bezier(.2,.9,.3,1)' });
            E.popConf.innerHTML = '';
            this._confetti(30, E.popConf);
        });
    },

    _popupClose() {
        const E = this.el;
        E.popup.classList.add('hidden');
        E.popConf.innerHTML = '';
        const r = this._popRes;
        this._popRes = null;
        if (r) r();
    },

    _toast(text) {
        const E = this.el;
        E.toast.textContent = text;
        E.toast.classList.remove('hidden');
        E.toast.animate([{ opacity: 0, transform: 'translateY(30%)' }, { opacity: 1, transform: 'none' }], { duration: 200, easing: 'ease-out' });
        clearTimeout(this._toastT);
        this._toastT = setTimeout(() => E.toast.classList.add('hidden'), 2600);
    },

    // ---------- настройки ----------

    showSettings() {
        if (!this.inited || this.settingsOn) return;
        if (this.hudOn && !this.pauseOn) return;
        this.settingsOn = true;
        this._renderSettings();
        this._show(this.el.settings);
    },

    hideSettings() {
        if (!this.settingsOn) return;
        this.settingsOn = false;
        this.el.settings.classList.add('hidden');
    },

    /** state — { outline, muted }; без него спрашиваем игру. */
    _renderSettings(state) {
        const H = this.handlers, E = this.el;
        let s = state || (H.getSettings ? H.getSettings() : null);
        if (!s) s = { outline: false, muted: this.muted };
        this._set = s;
        const T = k => this._esc(Lang.t(k));
        const row = (key, icon, on, label, desc) => '<div class="set-row"><span class="set-ic">' + this._ic(icon) + '</span><div class="set-t"><b>' + T(label) + '</b>' + (desc ? '<small>' + T(desc) + '</small>' : '') + '</div>'
            + '<button class="sw' + (on ? ' on' : '') + '" type="button" role="switch" aria-checked="' + (on ? 'true' : 'false') + '" aria-label="' + T(label) + '" data-act="setTog" data-key="' + key + '"><i class="sw-k"></i><span class="sw-t">' + T(on ? 'setOn' : 'setOff') + '</span></button></div>';
        // Сложность ботов: три кнопки и множитель награды выбранного уровня.
        const dv = s.difficulty || 'normal';
        const diff = '<div class="set-row set-diff"><span class="set-ic">' + this._ic('trophy') + '</span><div class="set-t"><b>' + T('setDifficulty') + '</b><small>' + T('setDiff_' + dv + '_desc') + '</small>'
            + '<div class="seg" role="radiogroup" aria-label="' + T('setDifficulty') + '">'
            + ['easy', 'normal', 'hard'].map(v => '<button class="seg-b d-' + v + (v === dv ? ' on' : '') + '" type="button" role="radio" aria-checked="' + (v === dv ? 'true' : 'false') + '" data-act="setDiff" data-val="' + v + '">' + T('setDiff_' + v) + '</button>').join('')
            + '</div></div></div>';
        E.setBody.innerHTML = diff + row('outline', 'face', !!s.outline, 'setOutline', 'setOutlineDesc')
            + row('water', 'gem', !!s.water, 'setWater', 'setWaterDesc')
            + (this.platform === 'playables' ? '' : row('muted', s.muted ? 'soundOff' : 'soundOn', !s.muted, 'setSound', ''));
    },

    _setDifficulty(value) {
        let r = null;
        try { r = this.handlers.onSetting ? this.handlers.onSetting('difficulty', value) : null; } catch (e) { r = null; }
        this._renderSettings(r || Object.assign({}, this._set || {}, { difficulty: value }));
    },

    _setToggle(key) {
        const s = this._set || { outline: false, muted: this.muted };
        const nextOn = key === 'muted' ? !!s.muted : !s[key];           // новое положение переключателя (ВКЛ)
        const value = key === 'muted' ? !nextOn : nextOn;                // что отдать игре: muted / outline
        let r = null;
        try { r = this.handlers.onSetting ? this.handlers.onSetting(key, value) : null; } catch (e) { r = null; }
        if (!r) r = Object.assign({}, s, { [key]: value });
        if (typeof r.muted === 'boolean') this.setMuted(r.muted);
        this._renderSettings(r);
    },

    // ---------- меню: значки, ускорение, подсказка «встать» ----------

    /** Красные точки на «Подарок» и «Колесо», видимость «Рекорды», состояние «Ускорение на старт». Поля можно слать по одному. */
    setMenuBadges(b) {
        const o = this._badges;
        if (b) for (const k of ['daily', 'wheel', 'leaderboard', 'boostReady']) if (b[k] !== undefined) o[k] = !!b[k];
        if (!this.inited) return;
        const E = this.el;
        E.dotDaily.classList.toggle('hidden', !o.daily);
        E.dotWheel.classList.toggle('hidden', !o.wheel);
        E.bBoard.classList.toggle('hidden', !o.leaderboard || this.platform === 'playables');
        E.boostReady.classList.toggle('hidden', !o.boostReady);
        E.boostBtn.classList.toggle('hidden', o.boostReady || !this.handlers || !this.handlers.onAdBoost);
    },

    async _boost() {
        if (this._boostBusy || this._badges.boostReady || !this.handlers.onAdBoost) return;
        this._boostBusy = true;
        const b = this.el.boostBtn;
        b.disabled = true;
        let ok = false;
        try { ok = !!(await this.handlers.onAdBoost()); } catch (e) { ok = false; }
        this._boostBusy = false;
        b.disabled = false;
        if (ok) this.setMenuBadges({ boostReady: true });
        else b.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-.4em)' }, { transform: 'translateX(.4em)' }, { transform: 'translateX(0)' }], { duration: 300 });
    },

    /** Большая неблокирующая кнопка «Встать — за рекламу», пока игрок повержен; после нажатия прячется до следующего вызова. */
    offerRevive(on) {
        if (!this.inited) return;
        const E = this.el;
        this._reviveBusy = false;
        E.reviveBtn.disabled = false;
        E.revive.classList.toggle('hidden', !on);
        if (on) E.revive.animate([{ transform: 'translateY(60%) scale(.8)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 260, easing: 'ease-out' });
    },

    async _revive() {
        if (this._reviveBusy) return;
        this._reviveBusy = true;
        this.el.revive.classList.add('hidden');
        try { if (this.handlers.onAdRevive) await this.handlers.onAdRevive(); } catch (e) { /* игра решает сама */ }
    },

    /** Кнопка «x2 награда — за рекламу» на экране результатов: 'available' | 'busy' | 'done' | 'unavailable'. rewards — итоговые числа после удвоения (по умолчанию монеты и кристаллы x2). */
    setResultsDouble(state, rewards) {
        if (!this.inited) return;
        const E = this.el, b = E.resDouble, T = k => this._esc(Lang.t(k));
        const was = this._dbl;
        this._dbl = state || '';
        const hide = !state || state === 'unavailable';
        b.classList.toggle('hidden', hide);
        b.disabled = state === 'busy' || state === 'done';
        b.classList.toggle('done', state === 'done');
        b.innerHTML = state === 'done'
            ? this._ic('check') + '<span class="bt">' + T('resDoubled') + '</span>'
            : this._ic('adplay') + '<span class="bt">' + T('resDouble') + '<small>' + T('adBtn') + '</small></span>';
        if (state === 'done' && was !== 'done' && this.resultsOn && this._resRew) {
            const r = this._resRew, tok = this._resTok;
            const to = rewards || { coins: r.coins * 2, gems: r.gems * 2, xp: r.xp };
            for (const [row, val, k] of [['rewCoin', 'rvCoin', 'coins'], ['rewGem', 'rvGem', 'gems'], ['rewXp', 'rvXp', 'xp']]) {
                const n = Number(to[k]) || 0;
                if (n > r[k]) { E[row].classList.remove('hidden'); this._countUp(E[val], n, 700, 0, tok, r[k]); }
            }
            this._resRew = { coins: Number(to.coins) || r.coins, gems: Number(to.gems) || r.gems, xp: Number(to.xp) || r.xp };
            this._confetti(24, E.confetti);
        }
    },

    async _resDouble() {
        if (this._dbl !== 'available') return;
        this.setResultsDouble('busy');
        let ok = false;
        try { ok = this.handlers.onResultsDouble ? !!(await this.handlers.onResultsDouble()) : false; } catch (e) { ok = false; }
        if (this._dbl === 'busy') this.setResultsDouble(ok ? 'done' : 'available');
    },

    /** Playables: полноэкранная «Пауза» без кнопок поверх всего; блокирует весь ввод интерфейса. */
    platformPause(on) {
        if (!this.inited) return;
        this.platformPaused = !!on;
        this.el.plat.classList.toggle('hidden', !on);
        if (on) this._releaseInput();
    },

};
