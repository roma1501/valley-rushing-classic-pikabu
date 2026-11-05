// Platform.js — платформа игры: Яндекс Игры (YaGames), YouTube Playables (ytgame),
// Playgama Bridge (bridge) или локальный запуск. Игра зовёт только Platform — SDK знает этот файл.
// SDK подключает сборка: build.bat yandex вписывает в index.html скрипт /sdk.js,
// build.bat playables — SDK Playables первым скриптом, node tools/build.mjs playgama —
// Bridge с CDN Playgama и playgama-bridge-config.json рядом с index.html. Без SDK (run.bat, web-сборка)
// работает локальный адаптер: сохранения — в Store, реклама — ничего (с ?mockads в
// адресе — заглушка-оверлей на секунду: проверить паузу, звук и выдачу награды).
//
//   await Platform.init()        SDK, язык платформы, события паузы (main.js)
//   Platform.firstFrame()        экран загрузки на экране (Playables firstFrameReady; main.js)
//   Platform.ready()             игра готова к вводу: Яндекс LoadingAPI.ready, Playables gameReady (main.js)
//   Platform.gameplay(on)        идёт ли игровой процесс (Яндекс GameplayAPI start/stop);
//                                на паузе (Pause.js) движок сам шлёт stop, после — start
//   Platform.ads.roundEnded()    раунд завершён (победа или поражение) — ОДИН раз на раунд
//   Platform.ads.next(go)        переход по кнопке «Далее/Заново/Меню»: после двух результатов
//                                (Playables — после каждого) сначала interstitial, потом go(); защита от двойного клика
//   await Platform.rewarded(id)  true — ТОЛЬКО если SDK подтвердил просмотр
//   Platform.submitScore(n)      рекорд: Яндекс — лидерборд 'Score' (не чаще раза в секунду), Playables — sendScore
//   await Platform.leaderboard() [{ rank, name, score, me }] или null (Яндекс)
//   await Platform.load()        сохранение игры (объект) или null
//   await Platform.save(obj)     записать сохранение (Яндекс — облако игрока + Store, Playables — saveData,
//                                Playgama — bridge.storage, ключ 'save')
//   Platform.track(name, data)   событие аналитики Playgama (bridge.analytics.send); на других — ничего
// На время рекламы игра и звук стоят (Pause 'ad'), после — прежнее состояние.

/** @satisfies {Record<string, any>} */
const Platform = {
    name: 'local',        // 'yandex' | 'playables' | 'playgama' | 'local'
    sdk: null,            // объект SDK: Яндекс (ysdk) или Playgama (bridge)
    lang: null,           // язык платформы (BCP-47) или null
    player: null,         // игрок Яндекса
    LEADERBOARD: 'Score', // технический id лидерборда Яндекса (в интерфейсе — «Рекорды»)
    _readySent: false,
    _firstFrameSent: false,
    _playing: false,
    _gameplaySent: false, // последнее, что ушло в GameplayAPI: stop без start не шлётся
    _adBusy: false,
    _loaded: null,        // Promise первого load() — Playables: saveData только после loadData
    _scoreAt: 0,
    _scoreTimer: 0,
    _scorePending: null,
    _lastInterstitial: 0, // Playgama: время закрытия прошлого interstitial (минимальный интервал Bridge)
    _loadOk: false,       // Playgama: сохранение прочитано — только после этого можно писать
    _perf: null,          // Playgama: окно замера performance_sample

    async init() {
        try {
            if (typeof YaGames !== 'undefined') await this._initYandex();
            else if (typeof ytgame !== 'undefined' && ytgame.IN_PLAYABLES_ENV) await this._initPlayables();
            else if (typeof bridge !== 'undefined' && bridge && typeof bridge.initialize === 'function') await this._initPlaygama();
        } catch (e) {
            // В Playables нельзя незаметно перейти на локальные сохранения или
            // потерять обязательные SDK-события. Загрузка покажет ошибку/повтор.
            if (typeof ytgame !== 'undefined' && ytgame.IN_PLAYABLES_ENV) throw e;
            console.warn('Platform: SDK не поднялся, играем локально — ' + ((e && e.message) || e));
            this.name = 'local';
            this.sdk = null;
        }
        Pause.onChange(() => this._syncGameplay());
        console.log('Platform: ' + this.name + (this.lang ? ', язык платформы ' + this.lang : ''));
        return this;
    },

    async _initYandex() {
        let timer = 0;
        const timeout = new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('YaGames.init timeout')), 8000); });
        try { this.sdk = await Promise.race([YaGames.init(), timeout]); } finally { clearTimeout(timer); }
        this.name = 'yandex';
        try { this.lang = this.sdk.environment.i18n.lang || null; } catch (e) { /* язык по умолчанию */ }
        if (typeof this.sdk.on === 'function') {
            this.sdk.on('game_api_pause', () => Pause.set('platform', true));
            this.sdk.on('game_api_resume', () => Pause.set('platform', false));
        }
        try { this.player = await this.sdk.getPlayer({ scopes: false }); } catch (e) { this.player = null; }
    },

    async _initPlayables() {
        this.name = 'playables';
        const sys = ytgame.system;
        sys.onPause(() => Pause.set('platform', true));
        sys.onResume(() => Pause.set('platform', false));
        sys.onAudioEnabledChange((on) => Sound.setPlatformMuted(!on));
        Sound.setPlatformMuted(!sys.isAudioEnabled());
        try { this.lang = await sys.getLanguage(); } catch (e) { this.lang = null; }
        // Требование модерации Playables: interstitial после КАЖДОГО раунда по кнопке, без таймера.
        this.ads.every = 1;
    },

    // Playgama Bridge: initialize до любого bridge.*, язык платформы, пауза и звук хоста.
    // Вне платформы Bridge сам поднимает mock — тот же код, безопасные ответы.
    async _initPlaygama() {
        const b = bridge;
        let timer = 0;
        const timeout = new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('bridge.initialize timeout')), 10000); });
        try { await Promise.race([b.initialize(), timeout]); } finally { clearTimeout(timer); }
        this.name = 'playgama';
        this.sdk = b;
        try { this.lang = b.platform.language || null; } catch (e) { this.lang = null; }
        const E = b.EVENT_NAME;
        b.platform.on(E.PAUSE_STATE_CHANGED, (paused) => Pause.set('platform', !!paused));
        b.platform.on(E.AUDIO_STATE_CHANGED, (on) => Sound.setPlatformMuted(!on));
        // Событие приходит только на смену: начальное состояние звука — сразу.
        Sound.setPlatformMuted(b.platform.isAudioEnabled === false);
        // Реклама уже открыта на старте: игра стоит и молчит, пока она не закроется.
        if (b.advertisement && b.advertisement.interstitialState === 'opened') {
            Pause.set('ad', true);
            const off = (s) => {
                if (s !== 'closed' && s !== 'failed') return;
                try { b.advertisement.off(E.INTERSTITIAL_STATE_CHANGED, off); } catch (e) { /* старый Bridge */ }
                Pause.set('ad', false);
            };
            b.advertisement.on(E.INTERSTITIAL_STATE_CHANGED, off);
        }
        this._perfInit();
    },

    // --- Жизненный цикл -------------------------------------------------------

    firstFrame() {
        if (!this._firstFrameSent && typeof ytgame !== 'undefined' && ytgame.IN_PLAYABLES_ENV) {
            ytgame.game.firstFrameReady();
            this._firstFrameSent = true;
        }
    },

    ready() {
        if (this._readySent) return;
        try {
            if (this.name === 'yandex') this.sdk.features.LoadingAPI && this.sdk.features.LoadingAPI.ready();
            else if (this.name === 'playables') {
                this.firstFrame();
                ytgame.game.gameReady();
            } else if (this.name === 'playgama') this.sdk.platform.sendMessage('game_ready');
            this._readySent = true;
        } catch (e) {
            if (this.name === 'playables') throw e;
            console.warn('Platform.ready:', e);
        }
    },

    // on — игрок в игровом процессе (раунд идёт). Меню, экран результата, пауза — false.
    gameplay(on) {
        this._playing = !!on;
        this._syncGameplay();
    },

    _syncGameplay() {
        const want = this._playing && !Pause.active;
        if (this._gameplaySent === want || this.name !== 'yandex') { this._gameplaySent = want; return; }
        this._gameplaySent = want;
        try {
            const api = this.sdk.features.GameplayAPI;
            if (api) { if (want) api.start(); else api.stop(); }
        } catch (e) { /* SDK без GameplayAPI */ }
    },

    // --- Реклама ----------------------------------------------------------------

    // Interstitial. true — запрос успешен (Playables НЕ подтверждает факт показа).
    // Яндекс возвращает shown. Ошибка/нет API — false, переход всё равно продолжается.
    async interstitial() {
        if (this._adBusy) return false;
        this._adBusy = true;
        Pause.set('ad', true);
        try {
            if (this.name === 'yandex') {
                return await new Promise((resolve) => this.sdk.adv.showFullscreenAdv({ callbacks: {
                    onClose: (shown) => resolve(!!shown),
                    onError: () => resolve(false),
                    onOffline: () => resolve(false),
                } }));
            }
            if (this.name === 'playables') {
                if (!ytgame.ads || !ytgame.ads.requestInterstitialAd) return false;
                await ytgame.ads.requestInterstitialAd();
                return true;
            }
            if (this.name === 'playgama') return await this._playgamaAd(false);
            return await this._mockAd(false);
        } catch (e) {
            return false;
        } finally {
            Pause.set('ad', false);
            this._adBusy = false;
        }
    },

    // Rewarded. id — стабильный id награды без данных игрока ('continue', 'coins-x2').
    // true — ТОЛЬКО по подтверждению SDK; закрытие и ошибка — false. Награду выдаёт
    // игра по true и один раз.
    async rewarded(id) {
        if (this._adBusy) return false;
        this._adBusy = true;
        Pause.set('ad', true);
        try {
            if (this.name === 'yandex') {
                return await new Promise((resolve) => {
                    let got = false;
                    this.sdk.adv.showRewardedVideo({ callbacks: {
                        onRewarded: () => { got = true; },
                        onClose: () => resolve(got),
                        onError: () => resolve(false),
                    } });
                });
            }
            if (this.name === 'playables') {
                if (!ytgame.ads || !ytgame.ads.requestRewardedAd) return false;
                return (await ytgame.ads.requestRewardedAd(String(id || 'reward'))) === true;
            }
            if (this.name === 'playgama') return await this._playgamaAd(true);
            return await this._mockAd(true);
        } catch (e) {
            return false;
        } finally {
            Pause.set('ad', false);
            this._adBusy = false;
        }
    },

    // Playgama: показ по событиям состояния Bridge. Interstitial — true, если закрыт после
    // показа; rewarded — true ТОЛЬКО после состояния 'rewarded' (закрытие без него — false).
    // Нет ответа за 5 с (не загрузилась, Bridge пропустил по интервалу) — false, игра идёт дальше.
    _playgamaAd(reward) {
        const adv = this.sdk.advertisement, E = this.sdk.EVENT_NAME;
        if (!adv || !(reward ? adv.isRewardedSupported : adv.isInterstitialSupported)) return Promise.resolve(false);
        if (!reward) {
            const gap = (Number(adv.minimumDelayBetweenInterstitial) || 60) * 1000;
            if (this._lastInterstitial && Date.now() - this._lastInterstitial < gap) return Promise.resolve(false);
        }
        const event = reward ? E.REWARDED_STATE_CHANGED : E.INTERSTITIAL_STATE_CHANGED;
        return new Promise((resolve) => {
            let opened = false, got = false, over = false, timer = 0;
            const done = (v) => {
                if (over) return;
                over = true;
                clearTimeout(timer);
                try { adv.off(event, on); } catch (e) { /* старый Bridge */ }
                if (!reward && opened) this._lastInterstitial = Date.now();
                resolve(v);
            };
            const arm = (ms) => { clearTimeout(timer); timer = setTimeout(() => { if (!opened) done(false); }, ms); };
            const on = (s) => {
                if (s === 'loading') arm(15000);
                else if (s === 'opened') { opened = true; clearTimeout(timer); }
                else if (s === 'rewarded') got = true;
                else if (s === 'closed') done(reward ? got : opened);
                else if (s === 'failed') done(false);
            };
            adv.on(event, on);
            arm(5000);
            try {
                const p = reward ? adv.showRewarded() : adv.showInterstitial();
                Promise.resolve(p).catch(() => done(false));
            } catch (e) { done(false); }
        });
    },

    // Локальная заглушка рекламы: только с ?mockads в адресе — оверлей на секунду,
    // rewarded засчитывается. Без флага — рекламы нет (false).
    _mockAd(reward) {
        if (!/[?&#]mockads\b/.test(location.search + location.hash)) return Promise.resolve(false);
        return new Promise((resolve) => {
            const el = document.createElement('div');
            el.style.cssText = 'position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;' +
                'background:rgba(0,0,0,.85);color:#fff;font:bold 22px system-ui,sans-serif;text-align:center';
            el.textContent = (reward ? 'REWARDED' : 'INTERSTITIAL') + ' — local mock';
            document.body.appendChild(el);
            setTimeout(() => { el.remove(); resolve(true); }, 1000);
        });
    },

    // Счётчик interstitial по правилу игры: реклама — после каждых ДВУХ завершённых
    // раундов (любой исход; Playables — после каждого, every = 1), и только по кнопке
    // перехода, не в момент результата.
    ads: {
        results: 0,
        every: 2,
        busy: false,

        // Раунд завершён (победа или поражение) — звать ОДИН раз на раунд.
        roundEnded() { this.results++; },

        // Переход по кнопке: после every результатов — сначала реклама, затем go().
        // Повторный клик, пока идёт переход, игнорируется. Реклама не пришла или
        // ошибка — переход без задержки, новый цикл.
        async next(go) {
            if (this.busy) return;
            this.busy = true;
            try {
                if (this.results >= this.every) {
                    this.results = 0;
                    await Platform.interstitial();
                }
                if (go) await go();
            } finally {
                this.busy = false;
            }
        },
    },

    // --- Рекорды -------------------------------------------------------------------

    // Рекорд игрока. Яндекс: лидерборд 'Score', не чаще раза в секунду (лишнее — последним
    // значением через секунду). Playables: sendScore.
    submitScore(value) {
        const number = Number(value);
        if (!Number.isFinite(number)) return;
        const v = Math.max(0, Math.floor(number));
        if (!Number.isSafeInteger(v)) return;
        if (this.name === 'playables') {
            try { ytgame.engagement.sendScore({ value: v }).catch(() => {}); } catch (e) { /* SDK старый */ }
            return;
        }
        if (this.name !== 'yandex') return;
        this._scorePending = v;
        const wait = this._scoreAt + 1100 - Date.now();
        if (wait > 0) {
            if (!this._scoreTimer) this._scoreTimer = setTimeout(() => { this._scoreTimer = 0; this.submitScore(this._scorePending); }, wait);
            return;
        }
        this._scoreAt = Date.now();
        this._scorePending = null;
        const lb = this.sdk.leaderboards;
        const p = lb && lb.setScore ? lb.setScore(this.LEADERBOARD, v)
            : this.sdk.getLeaderboards().then((old) => old.setLeaderboardScore(this.LEADERBOARD, v));
        Promise.resolve(p).catch((e) => console.warn('Platform.submitScore:', (e && e.message) || e));
    },

    // Таблица рекордов (Яндекс): [{ rank, name, score, me }] или null — нет SDK,
    // нет лидерборда или ошибка. Лимит Яндекса — 20 запросов за 5 минут: кэшировать в игре.
    async leaderboard(opts) {
        if (this.name !== 'yandex') return null;
        const o = Object.assign({ quantityTop: 10, includeUser: true, quantityAround: 3 }, opts || {});
        try {
            const lb = this.sdk.leaderboards;
            const res = lb && lb.getEntries ? await lb.getEntries(this.LEADERBOARD, o)
                : await (await this.sdk.getLeaderboards()).getLeaderboardEntries(this.LEADERBOARD, o);
            let myId = '';
            try { myId = this.player ? this.player.getUniqueID() : ''; } catch (e) { /* аноним */ }
            return (res.entries || []).map((e) => ({
                rank: e.rank, score: e.score,
                avatar: (e.player && typeof e.player.getAvatarSrc === 'function' && e.player.getAvatarSrc('small')) || '',
                name: (e.player && e.player.publicName) || '',
                me: !!(myId && e.player && e.player.uniqueID === myId),
            }));
        } catch (e) {
            return null;
        }
    },

    // Игрок вошёл в аккаунт платформы (Яндекс: режим не 'lite'). Вне Яндекса — true.
    authorized() {
        if (this.name !== 'yandex') return true;
        try {
            if (!this.player) return false;
            if (typeof this.player.isAuthorized === 'function') return !!this.player.isAuthorized();
            return this.player.getMode() !== 'lite';
        } catch (e) { return false; }
    },

    // Окно входа платформы (кнопка «Войдите в аккаунт»). true — вошёл.
    async login() {
        if (this.name !== 'yandex' || !this.sdk || !this.sdk.auth) return false;
        try {
            await this.sdk.auth.openAuthDialog();
            this.player = await this.sdk.getPlayer({ scopes: false });
            return this.authorized();
        } catch (e) { return false; }
    },

    // --- Сохранения ------------------------------------------------------------------

    _storeKey() { return (typeof GAME_ID !== 'undefined' ? GAME_ID : 'lory-game') + '.save'; },

    // Сохранение игры: объект или null.
    load() {
        if (!this._loaded) this._loaded = this._load().catch((error) => {
            this._loaded = null; // ошибка сети/данных не означает пустое сохранение; возможен повтор
            throw error;
        });
        return this._loaded;
    },

    async _load() {
        if (this.name === 'playgama') {
            // Только bridge.storage, одним вызовом. Ошибка — не «пустое сохранение»:
            // save() тогда не пишет, чтобы новая игра не затёрла прогресс игрока.
            let timer = 0;
            const timeout = new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('bridge.storage.get timeout')), 8000); });
            let values;
            try { values = await Promise.race([this.sdk.storage.get(['save']), timeout]); } finally { clearTimeout(timer); }
            const raw = Array.isArray(values) ? values[0] : values;
            this._loadOk = true;
            if (raw == null || raw === '') return null;
            const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
            if (!data || typeof data !== 'object') return null;
            return data;
        }
        if (this.name === 'playables') {
            // Только SDK. Успешный loadData обязателен ДО saveData; ошибку нельзя
            // превращать в null и затем перезаписывать облако новой игрой.
            const raw = await ytgame.game.loadData();
            if (!raw) return null;
            const data = JSON.parse(raw);
            if (!data || typeof data !== 'object') throw new Error('Invalid Playables save data');
            return data;
        }
        const local = Store.getJSON(this._storeKey(), null);
        try {
            if (this.name === 'yandex' && this.player) {
                const data = await this.player.getData(['save']);
                if (data && data.save && typeof data.save === 'object') return data.save;
            }
        } catch (e) {
            console.warn('Platform.load:', (e && e.message) || e);
        }
        return local;
    },

    // Записать JSON. Playables: только SDK, после УСПЕШНОГО load; без localStorage.
    // До начала новой игры нужно await Platform.load() и применить загруженный
    // прогресс; rejected load следует показать как ошибку с повтором.
    async save(obj) {
        try {
            const data = JSON.stringify(obj);
            if (typeof data !== 'string') return false;
            if (this.name === 'playables') {
                // Консервативная проверка обоих представлений: < 3 MiB (MUST).
                // JSON.stringify экранирует непарные суррогаты: строка well-formed UTF-16.
                const bytes = Math.max(data.length * 2, new TextEncoder().encode(data).byteLength);
                if (bytes >= 3 * 1024 * 1024) throw new Error('Playables save must be smaller than 3 MiB');
                await this.load();
                await ytgame.game.saveData(data);
            } else if (this.name === 'playgama') {
                if (!this._loadOk) return false;
                await this.sdk.storage.set(['save'], [data]);
            } else {
                const stored = Store.set(this._storeKey(), data);
                if (this.name === 'yandex' && this.player) await this.player.setData({ save: obj }, true);
                else if (!stored) return false;
            }
            return true;
        } catch (e) {
            console.warn('Platform.save:', (e && e.message) || e);
            return false;
        }
    },

    // --- Аналитика Playgama -------------------------------------------------------------

    // Событие игры: стабильное имя в snake_case, плоские данные (строки, числа, bool) без
    // данных игрока. Вне Playgama — ничего.
    track(name, data) {
        if (this.name !== 'playgama') return;
        try {
            const a = this.sdk.analytics;
            if (a && typeof a.send === 'function') a.send(name, data);
        } catch (e) { /* старый Bridge без analytics */ }
    },

    // performance_sample: кадры только активной видимой игры (раунд идёт, нет паузы,
    // вкладка на экране); одна агрегированная запись примерно за 30 с такой игры.
    _perfInit() {
        if (this._perf || typeof requestAnimationFrame !== 'function') return;
        const P = this._perf = { last: 0, start: 0, active: 0, frames: [], errors: 0, rejections: 0, lost: 0, longOk: false, longN: 0, longMs: 0, longMax: 0 };
        const reset = () => { P.last = 0; };
        document.addEventListener('visibilitychange', reset);
        Pause.onChange(reset);
        window.addEventListener('error', () => { P.errors++; });
        window.addEventListener('unhandledrejection', () => { P.rejections++; });
        const cv = document.getElementById('world3d');
        if (cv) cv.addEventListener('webglcontextlost', () => { P.lost++; });
        try {
            if (typeof PerformanceObserver !== 'undefined' && (PerformanceObserver.supportedEntryTypes || []).includes('longtask')) {
                new PerformanceObserver((list) => {
                    for (const t of list.getEntries()) { P.longN++; P.longMs += t.duration; P.longMax = Math.max(P.longMax, t.duration); }
                }).observe({ type: 'longtask', buffered: false });
                P.longOk = true;
            }
        } catch (e) { P.longOk = false; }
        const tick = (now) => {
            requestAnimationFrame(tick);
            const live = this._playing && !Pause.active && !document.hidden;
            if (!live) { P.last = 0; return; }
            if (!P.last) { P.last = now; if (!P.start) P.start = now; return; }
            const dt = now - P.last;
            P.last = now;
            if (dt <= 0) return;
            P.frames.push(dt);
            P.active += dt;
            if (P.active >= 30000) this._perfSend(now);
        };
        requestAnimationFrame(tick);
    },

    _perfSend(now) {
        const P = this._perf, f = P.frames.slice().sort((a, b) => a - b), n = f.length;
        if (!n) return;
        const q = (p) => f[Math.min(n - 1, Math.floor(p * (n - 1)))];
        const over = (ms) => f.filter((x) => x > ms).length;
        const r2 = (v) => Math.round(v * 100) / 100;
        const data = {
            target_fps: 60, window_ms: Math.round(now - P.start), active_ms: Math.round(P.active), frame_count: n,
            fps_avg: r2(n / (P.active / 1000)), fps_p10: r2(1000 / q(0.9)),
            frame_time_p50_ms: r2(q(0.5)), frame_time_p95_ms: r2(q(0.95)), frame_time_p99_ms: r2(q(0.99)), frame_time_max_ms: r2(f[n - 1]),
            frames_over_50ms: over(50), frames_over_100ms: over(100), frames_over_250ms: over(250), frames_over_500ms: over(500), frames_over_1000ms: over(1000),
            js_error_count: P.errors, unhandled_rejection_count: P.rejections, webgl_context_loss_count: P.lost,
            game_version: typeof GAME_VERSION !== 'undefined' ? GAME_VERSION : '',
        };
        if (P.longOk) Object.assign(data, { long_task_count: P.longN, long_task_total_ms: Math.round(P.longMs), long_task_max_ms: Math.round(P.longMax) });
        Object.assign(P, { start: now, active: 0, frames: [], errors: 0, rejections: 0, lost: 0, longN: 0, longMs: 0, longMax: 0 });
        this.track('performance_sample', data);
    },
};
