// Maps.js — карты игры: земля, рельеф и объекты каждой карты. Пишет редактор
// (вкладки Maps и Objects) — файл целиком, формат держать.
// Карта: id — латиница, цифры, _ и - (по нему игра грузит карту: app.loadMap(id));
//   name — название для редактора; width, height — px мира; ground — текстура земли
//   (0 — трава, 1 — песок, 2 — снег); terrain — рельеф: amp — высота холмов px (0 —
//   плоско), scale — размер холма px, seed — сид шума, base — уровень земли px.
// Объект карты: kind — 'prop' (окружение) | 'actor' (главный объект кадра) | 'marker'
//   (точка для логики игры без модели: спавн, враг, финиш — location.markers(имя));
//   model — путь модели от assets/ (.fbx, .obj, .glb, .gltf) строковым литералом: сборщик
//   берёт в архив только ассеты с такими ссылками; x, y — px карты; h — px над землёй;
//   rot — [x, y, z] градусы: y — курс (0 — вдоль +x, 90 — вниз по карте), x и z — наклон;
//   scale — [x, y, z] к размеру модели (1 см = 1 px); anim — вращение части модели
//   (необязательно): part — объект внутри модели, axis — его ось 'x' | 'y' | 'z' (с
//   минусом — обратный конец), speed — об/мин, dir — 'cw' | 'ccw' с конца оси.
const GAME_MAPS = [
    {
        id: 'valley', name: 'Rush Valley', width: 8000, height: 9600, ground: 3,
        terrain: { amp: 0, scale: 800, seed: 1, base: 0 },
        objects: [
            { name: 'baseplate', model: 'assets/models/baseplate.glb', kind: 'prop', x: 4000, y: 4800, h: 80, rot: [0, 0, 0], scale: [1, 1, 1] },
            { name: 'field', kind: 'marker', x: 4000, y: 4800, h: 80, rot: [0, 0, 0], scale: [28, 1, 40] },
            { name: 'line-a', kind: 'marker', x: 4000, y: 6400, h: 80, rot: [0, 0, 0], scale: [1, 1, 1] },
            { name: 'line-b', kind: 'marker', x: 4000, y: 3200, h: 80, rot: [0, 0, 0], scale: [1, 1, 1] },
            { name: 'chaser', kind: 'marker', x: 4000, y: 4800, h: 80, rot: [0, 0, 0], scale: [1, 1, 1] },
            { name: 'flag', model: 'assets/models/flag.glb', kind: 'prop', x: 2640, y: 6400, h: 80, rot: [0, 0, 0], scale: [1, 1, 1] },
            { name: 'flag', model: 'assets/models/flag.glb', kind: 'prop', x: 5360, y: 6400, h: 80, rot: [0, 180, 0], scale: [1, 1, 1] },
            { name: 'flag', model: 'assets/models/flag.glb', kind: 'prop', x: 2640, y: 3200, h: 80, rot: [0, 0, 0], scale: [1, 1, 1] },
            { name: 'flag', model: 'assets/models/flag.glb', kind: 'prop', x: 5360, y: 3200, h: 80, rot: [0, 180, 0], scale: [1, 1, 1] },
            { name: 'island_a', model: 'assets/models/island_a.glb', kind: 'prop', x: 3300, y: 2250, h: 0, rot: [0, 15, 0], scale: [0.9, 0.9, 0.9] },
            { name: 'island_d', model: 'assets/models/island_d.glb', kind: 'prop', x: 4900, y: 2150, h: 0, rot: [0, -10, 0], scale: [0.8, 0.8, 0.8] },
            { name: 'island_b', model: 'assets/models/island_b.glb', kind: 'prop', x: 2420, y: 1650, h: 0, rot: [0, 30, 0], scale: [1.1, 1.1, 1.1] },
            { name: 'island_c', model: 'assets/models/island_c.glb', kind: 'prop', x: 4200, y: 1150, h: 0, rot: [0, 5, 0], scale: [1.2, 1, 1.2] },
            { name: 'island_b', model: 'assets/models/island_b.glb', kind: 'prop', x: 6150, y: 800, h: 0, rot: [0, -25, 0], scale: [1.5, 1.2, 1.5] },
            { name: 'island_c', model: 'assets/models/island_c.glb', kind: 'prop', x: 900, y: 250, h: 0, rot: [0, 20, 0], scale: [1.3, 1, 1.3] },
            { name: 'island_d', model: 'assets/models/island_d.glb', kind: 'prop', x: 2900, y: 300, h: 0, rot: [0, 80, 0], scale: [1.3, 1.3, 1.3] },
            { name: 'island_a', model: 'assets/models/island_a.glb', kind: 'prop', x: 4700, y: 7400, h: 0, rot: [0, -20, 0], scale: [1, 1, 1] },
            { name: 'island_d', model: 'assets/models/island_d.glb', kind: 'prop', x: 3000, y: 7400, h: 0, rot: [0, 8, 0], scale: [0.8, 0.8, 0.8] },
            { name: 'island_b', model: 'assets/models/island_b.glb', kind: 'prop', x: 5800, y: 7950, h: 0, rot: [0, 35, 0], scale: [1.2, 1.2, 1.2] },
            { name: 'island_c', model: 'assets/models/island_c.glb', kind: 'prop', x: 1900, y: 8450, h: 0, rot: [0, -15, 0], scale: [1.25, 1, 1.25] },
            { name: 'island_b', model: 'assets/models/island_b.glb', kind: 'prop', x: 4100, y: 9150, h: 0, rot: [0, 0, 0], scale: [1.6, 1.3, 1.6] },
            { name: 'island_c', model: 'assets/models/island_c.glb', kind: 'prop', x: 7400, y: 9250, h: 0, rot: [0, 75, 0], scale: [1.5, 0.95, 1.5] },
            { name: 'island_a', model: 'assets/models/island_a.glb', kind: 'prop', x: 2050, y: 4300, h: 0, rot: [0, 50, 0], scale: [0.8, 0.8, 0.8] },
            { name: 'island_d', model: 'assets/models/island_d.glb', kind: 'prop', x: 1300, y: 5900, h: 0, rot: [0, 95, 0], scale: [1.1, 1.1, 1.1] },
            { name: 'island_c', model: 'assets/models/island_c.glb', kind: 'prop', x: 650, y: 3450, h: 0, rot: [0, -30, 0], scale: [1.45, 1, 1.45] },
            { name: 'island_a', model: 'assets/models/island_a.glb', kind: 'prop', x: 5950, y: 5300, h: 0, rot: [0, -35, 0], scale: [0.85, 0.85, 0.85] },
            { name: 'island_b', model: 'assets/models/island_b.glb', kind: 'prop', x: 6650, y: 3500, h: 0, rot: [0, 20, 0], scale: [1.15, 1.15, 1.15] },
            { name: 'island_c', model: 'assets/models/island_c.glb', kind: 'prop', x: 7350, y: 6350, h: 0, rot: [0, 100, 0], scale: [1.35, 1, 1.35] },
            { name: 'island_d', model: 'assets/models/island_d.glb', kind: 'prop', x: 7300, y: 2200, h: 0, rot: [0, 60, 0], scale: [1, 1, 1] },
            { name: 'tree_a', model: 'assets/models/tree_a.glb', kind: 'prop', x: 4674.9, y: 1504.7, h: 120, rot: [0, 10, 0], scale: [1, 1, 1] },
            { name: 'tree_b', model: 'assets/models/tree_b.glb', kind: 'prop', x: 4708.5, y: 845.2, h: 120, rot: [0, 75, 0], scale: [1.1, 1.1, 1.1] },
            { name: 'tree_b', model: 'assets/models/tree_b.glb', kind: 'prop', x: 4338.7, y: 1354.9, h: 320, rot: [0, 140, 0], scale: [0.9, 0.9, 0.9] },
            { name: 'tree_a', model: 'assets/models/tree_a.glb', kind: 'prop', x: 3998.3, y: 1252.8, h: 780, rot: [0, 0, 0], scale: [0.8, 0.8, 0.8] },
            { name: 'tree_b', model: 'assets/models/tree_b.glb', kind: 'prop', x: 2719.7, y: 1746.8, h: 176, rot: [0, 200, 0], scale: [1, 1, 1] },
            { name: 'tree_a', model: 'assets/models/tree_a.glb', kind: 'prop', x: 2419.2, y: 1827.4, h: 374, rot: [0, 45, 0], scale: [0.85, 0.85, 0.85] },
            { name: 'tree_b', model: 'assets/models/tree_b.glb', kind: 'prop', x: 3342.8, y: 2298.7, h: 216, rot: [0, 300, 0], scale: [0.8, 0.8, 0.8] },
            { name: 'tree_a', model: 'assets/models/tree_a.glb', kind: 'prop', x: 1404.4, y: 5842.9, h: 110, rot: [0, 20, 0], scale: [0.9, 0.9, 0.9] },
            { name: 'tree_b', model: 'assets/models/tree_b.glb', kind: 'prop', x: 1332.6, y: 5527.4, h: 198, rot: [0, 90, 0], scale: [0.9, 0.9, 0.9] },
            { name: 'tree_a', model: 'assets/models/tree_a.glb', kind: 'prop', x: 5627, y: 7946, h: 576, rot: [0, 30, 0], scale: [0.9, 0.9, 0.9] },
            { name: 'tree_b', model: 'assets/models/tree_b.glb', kind: 'prop', x: 5967.1, y: 8360, h: 192, rot: [0, 160, 0], scale: [1, 1, 1] },
            { name: 'tree_b', model: 'assets/models/tree_b.glb', kind: 'prop', x: 1980.2, y: 8169.7, h: 320, rot: [0, 250, 0], scale: [0.9, 0.9, 0.9] },
            { name: 'tree_a', model: 'assets/models/tree_a.glb', kind: 'prop', x: 2371.3, y: 7987.3, h: 120, rot: [0, 0, 0], scale: [1.1, 1.1, 1.1] },
            { name: 'tree_b', model: 'assets/models/tree_b.glb', kind: 'prop', x: 7045, y: 3423.5, h: 184, rot: [0, 120, 0], scale: [1, 1, 1] },
            { name: 'tree_a', model: 'assets/models/tree_a.glb', kind: 'prop', x: 4212, y: 9390, h: 442, rot: [0, 15, 0], scale: [1, 1, 1] },
            { name: 'cloud_a', model: 'assets/models/cloud_a.glb', kind: 'prop', x: 7187.6, y: 5654.1, h: 3200, rot: [0, 10, 0], scale: [1.6, 1.6, 1.6] },
            { name: 'cloud_b', model: 'assets/models/cloud_b.glb', kind: 'prop', x: 5950, y: 8177.5, h: 2700, rot: [0, 40, 0], scale: [1.8, 1.8, 1.8] },
            { name: 'cloud_a', model: 'assets/models/cloud_a.glb', kind: 'prop', x: 3068.3, y: 8277.3, h: 3800, rot: [0, -15, 0], scale: [1.9, 1.9, 1.9] },
            { name: 'cloud_b', model: 'assets/models/cloud_b.glb', kind: 'prop', x: 1228.7, y: 6400, h: 3000, rot: [0, 80, 0], scale: [1.5, 1.5, 1.5] },
            { name: 'cloud_a', model: 'assets/models/cloud_a.glb', kind: 'prop', x: 523.1, y: 3534.5, h: 2600, rot: [0, 25, 0], scale: [1.7, 1.7, 1.7] },
            { name: 'cloud_b', model: 'assets/models/cloud_b.glb', kind: 'prop', x: 2605.4, y: 1809.2, h: 3500, rot: [0, -40, 0], scale: [2, 2, 2] },
            { name: 'cloud_a', model: 'assets/models/cloud_a.glb', kind: 'prop', x: 5299.7, y: 1229.2, h: 4200, rot: [0, 5, 0], scale: [2, 2, 2] },
            { name: 'cloud_b', model: 'assets/models/cloud_b.glb', kind: 'prop', x: 7172.1, y: 3320.8, h: 2900, rot: [0, 60, 0], scale: [1.6, 1.6, 1.6] },
        ],
    },
];
