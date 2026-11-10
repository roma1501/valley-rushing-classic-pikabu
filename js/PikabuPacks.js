// @ts-nocheck
// PikabuPacks.js — наборы за рубли в сборке Пикабу Игр (js/PikabuShop.js). Цены и названия товаров — в Студии
// (каталог CSV: coins_s 19 ₽, coins_m 49 ₽, coins_l 99 ₽, starter 29 ₽, no_ads 59 ₽), здесь — что игрок получает.
// Монеты и кристаллы — Game.save.coins / gems, облики набора — из Cosmetics (иначе только за рекламу).
const PIKABU_GIVE = (coins, gems) => {
    const s = Game.save;
    s.coins = (Number(s.coins) || 0) + coins;
    s.gems = (Number(s.gems) || 0) + gems;
    Game.persist();
};
PikabuShop.setup({
    colors: ['#43a047', '#f9a825'],
    ready: () => !!(typeof Game !== 'undefined' && Game.save && typeof Cosmetics !== 'undefined' && Cosmetics.items),
    visible: () => Game.mode === 'menu',
    persist: () => Game.persist(),
    button: { corner: 'tr', x: 12, y: 74 },
    packs: [
        { id: 'coins_s', type: 'consumable', icon: '🪙', name: 'Горсть монет', desc: '1 500 монет на облики бегуна и ловца', grant: () => PIKABU_GIVE(1500, 0) },
        { id: 'coins_m', type: 'consumable', icon: '💰', name: 'Мешок монет', desc: '5 000 монет и 20 кристаллов', grant: () => PIKABU_GIVE(5000, 20) },
        { id: 'coins_l', type: 'consumable', icon: '💎', name: 'Сундук сокровищ', desc: '12 000 монет и 60 кристаллов', best: true, grant: () => PIKABU_GIVE(12000, 60) },
        {
            id: 'starter', type: 'non_consumable', icon: '✨', name: 'Золотой набор', best: 'Один раз',
            desc: '2 000 монет, облики «Золото», «Алмаз» и «Крокодилло Пилотто»',
            grant: () => PIKABU_GIVE(2000, 0),
            apply: () => {
                for (const id of ['skin_golden', 'skin_diamond', 'myth_croc']) if (!Cosmetics.owned(Game.save, id)) Cosmetics.grant(Game.save, id);
                Game.persist();
            },
        },
        { id: 'no_ads', type: 'non_consumable', icon: '🚫', name: 'Без рекламы', desc: 'Убирает рекламу между матчами навсегда. Награды за рекламу остаются', noAds: true },
    ],
});
