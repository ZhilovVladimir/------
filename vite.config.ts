/**
 * ============================================================
 * 🐌 УЛИТКА
 * Конфигурация Vite, серверные мосты и граф 3D-ядра
 * ============================================================
 */

import {
    defineConfig,
    type Plugin,
} from "vite";

import {
    разобратьКоманду,
} from "./терминал/исходники/разборщик_команд.js";

import {
    выполнитьБезопаснуюGitКоманду,
} from "./терминал/исходники/связка_команды_git.js";

import {
    СистемаУлитки3D,
} from "./исходники/система_улитки_3d.js";

/**
 * Клиентская визуализация снимка 3D-ядра.
 *
 * Отображает реальные узлы и связи.
 * Для отображения используется двумерная проекция
 * координат узлов x и y.
 */
const клиентГрафа3D = String.raw`
(function () {
    "use strict";

    const пространствоSVG =
        "http://www.w3.org/2000/svg";

    let контейнерГрафа = null;
    let состояниеГрафа = null;

    function создатьЭлементSVG(имя, атрибуты) {
        const элемент = document.createElementNS(
            пространствоSVG,
            имя
        );

        for (const [ключ, значение] of Object.entries(
            атрибуты || {}
        )) {
            элемент.setAttribute(
                ключ,
                String(значение)
            );
        }

        return элемент;
    }

    function добавитьТекст(
        родитель,
        текст,
        атрибуты
    ) {
        const элемент = создатьЭлементSVG(
            "text",
            атрибуты
        );

        элемент.textContent = String(текст);
        родитель.appendChild(элемент);

        return элемент;
    }

    function создатьСтиль() {
        if (document.getElementById("стиль-графа-3d")) {
            return;
        }

        const стиль = document.createElement("style");
        стиль.id = "стиль-графа-3d";

        const css = [
            ".блок-графа-3d {",
            "    margin: 10px;",
            "    padding: 10px;",
            "    border: 1px solid #243949;",
            "    border-radius: 6px;",
            "    background: #0a141d;",
            "}",
            "",
            ".блок-графа-3d h3 {",
            "    margin: 0 0 8px;",
            "    color: #90aabd;",
            "    font-size: 10px;",
            "    font-weight: 700;",
            "    letter-spacing: .8px;",
            "}",
            "",
            ".граф-3d-рамка {",
            "    width: 100%;",
            "    min-width: 0;",
            "    overflow: hidden;",
            "    border: 1px solid #203646;",
            "    border-radius: 5px;",
            "    background: radial-gradient(circle at 50% 40%, #142838, #09121a 75%);",
            "}",
            "",
            ".граф-3d-svg {",
            "    display: block;",
            "    width: 100%;",
            "    height: auto;",
            "    min-height: 150px;",
            "}",
            "",
            ".граф-3d-пусто {",
            "    min-height: 120px;",
            "    display: flex;",
            "    align-items: center;",
            "    justify-content: center;",
            "    padding: 16px;",
            "    color: #71899a;",
            "    font-size: 11px;",
            "    line-height: 1.6;",
            "    text-align: center;",
            "}",
            "",
            ".граф-3d-статус {",
            "    margin-top: 8px;",
            "    color: #91a6b8;",
            "    font-family: Consolas, monospace;",
            "    font-size: 10px;",
            "    line-height: 1.6;",
            "    overflow-wrap: anywhere;",
            "}",
            "",
            ".граф-3d-легенда {",
            "    display: flex;",
            "    flex-wrap: wrap;",
            "    gap: 7px 10px;",
            "    margin-top: 8px;",
            "    color: #91a6b8;",
            "    font-size: 9px;",
            "}",
            "",
            ".граф-3d-легенда span {",
            "    display: inline-flex;",
            "    align-items: center;",
            "    gap: 4px;",
            "}",
            "",
            ".граф-3d-точка {",
            "    width: 7px;",
            "    height: 7px;",
            "    display: inline-block;",
            "    border-radius: 50%;",
            "}",
            "",
            ".граф-3d-подсказка {",
            "    margin-top: 7px;",
            "    color: #71899a;",
            "    font-size: 9px;",
            "    line-height: 1.5;",
            "}",
            ""
        ].join("\n");

        стиль.textContent = css;

        document.head.appendChild(стиль);
    }

    function подготовитьПанель() {
        if (контейнерГрафа?.isConnected) {
            return true;
        }

        const панель = document.querySelector(
            ".панель.наблюдение"
        );

        if (!панель) {
            return false;
        }

        создатьСтиль();

        контейнерГрафа = document.createElement("section");
        контейнерГрафа.className = "блок-графа-3d";

        const заголовок = document.createElement("h3");
        заголовок.textContent = "ГРАФ 3D-ЯДРА";

        const рамка = document.createElement("div");
        рамка.className = "граф-3d-рамка";

        const пустоеСостояние = document.createElement("div");
        пустоеСостояние.className = "граф-3d-пусто";
        пустоеСостояние.textContent =
            "Запусти программу, чтобы увидеть узлы и связи.";

        рамка.appendChild(пустоеСостояние);

        состояниеГрафа = document.createElement("div");
        состояниеГрафа.className = "граф-3d-статус";
        состояниеГрафа.textContent =
            "3D-ядро: ожидание выполнения";

        const легенда = document.createElement("div");
        легенда.className = "граф-3d-легенда";

        const элементыЛегенды = [
            ["#55b9e6", "Переменная"],
            ["#b18ae0", "Функция"],
            ["#71c7a1", "Выполнение"],
            ["#e37d88", "Ошибка"]
        ];

        for (const [цвет, подпись] of элементыЛегенды) {
            const элемент = document.createElement("span");
            const точка = document.createElement("i");

            точка.className = "граф-3d-точка";
            точка.style.background = цвет;

            const текст = document.createElement("span");
            текст.textContent = подпись;

            элемент.appendChild(точка);
            элемент.appendChild(текст);
            легенда.appendChild(элемент);
        }

        const подсказка = document.createElement("div");
        подсказка.className = "граф-3d-подсказка";
        подсказка.textContent =
            "Линии показывают связи между узлами. " +
            "Координаты указаны в снимке ядра.";

        контейнерГрафа.appendChild(заголовок);
        контейнерГрафа.appendChild(рамка);
        контейнерГрафа.appendChild(состояниеГрафа);
        контейнерГрафа.appendChild(легенда);
        контейнерГрафа.appendChild(подсказка);

        const заголовокПанели = панель.querySelector(
            ".заголовок-панели"
        );

        if (заголовокПанели?.nextSibling) {
            панель.insertBefore(
                контейнерГрафа,
                заголовокПанели.nextSibling
            );
        } else {
            панель.prepend(контейнерГрафа);
        }

        return true;
    }

    function получитьЦветУзла(тип) {
        switch (тип) {
            case "переменная":
                return "#55b9e6";

            case "функция":
                return "#b18ae0";

            case "выполнение":
                return "#71c7a1";

            case "ошибка":
                return "#e37d88";

            default:
                return "#91a6b8";
        }
    }

    function показатьПустойГраф(сообщение) {
        if (!подготовитьПанель()) {
            return;
        }

        const рамка = контейнерГрафа.querySelector(
            ".граф-3d-рамка"
        );

        рамка.replaceChildren();

        const пустоеСостояние = document.createElement("div");
        пустоеСостояние.className = "граф-3d-пусто";
        пустоеСостояние.textContent = сообщение;

        рамка.appendChild(пустоеСостояние);

        состояниеГрафа.textContent = сообщение;
    }

    function показатьСнимок(снимок) {
        if (!подготовитьПанель()) {
            return;
        }

        if (
            !снимок ||
            !Array.isArray(снимок.узлы) ||
            !Array.isArray(снимок.связи)
        ) {
            показатьПустойГраф(
                "Сервер не передал корректный снимок 3D-ядра."
            );
            return;
        }

        const узлы = снимок.узлы;
        const связи = снимок.связи;

        const рамка = контейнерГрафа.querySelector(
            ".граф-3d-рамка"
        );

        рамка.replaceChildren();

        if (узлы.length === 0) {
            const пустоеСостояние =
                document.createElement("div");

            пустоеСостояние.className = "граф-3d-пусто";
            пустоеСостояние.textContent =
                "В снимке 3D-ядра пока нет узлов.";

            рамка.appendChild(пустоеСостояние);

            состояниеГрафа.textContent =
                "Узлов: 0 · Связей: " + связи.length;

            return;
        }

        const ширина = 720;
        const высота = Math.max(
            300,
            Math.ceil(узлы.length / 3) * 105 + 90
        );

        const отступ = 65;

        const svg = создатьЭлементSVG("svg", {
            viewBox: "0 0 " + ширина + " " + высота,
            role: "img",
            "aria-label":
                "Граф узлов и связей 3D-ядра Улитки"
        });

        svg.classList.add("граф-3d-svg");

        const defs = создатьЭлементSVG("defs");

        const маркер = создатьЭлементSVG("marker", {
            id: "стрелка-графа-3d",
            markerWidth: 8,
            markerHeight: 8,
            refX: 6,
            refY: 3,
            orient: "auto",
            markerUnits: "strokeWidth"
        });

        маркер.appendChild(
            создатьЭлементSVG("path", {
                d: "M0,0 L6,3 L0,6 Z",
                fill: "#64879c"
            })
        );

        defs.appendChild(маркер);
        svg.appendChild(defs);

        const координаты = new Map();

        const исходныеX = узлы.map(
            узел => Number(узел.позиция?.x) || 0
        );

        const исходныеY = узлы.map(
            узел => Number(узел.позиция?.y) || 0
        );

        const минимумX = Math.min(...исходныеX);
        const максимумX = Math.max(...исходныеX);
        const минимумY = Math.min(...исходныеY);
        const максимумY = Math.max(...исходныеY);

        const координатыОдинаковые =
            максимумX === минимумX &&
            максимумY === минимумY;

        узлы.forEach((узел, индекс) => {
            let x;
            let y;

            if (координатыОдинаковые) {
                const столбцы = Math.min(
                    3,
                    Math.max(1, узлы.length)
                );

                x = 120 +
                    (индекс % столбцы) *
                    ((ширина - 240) / Math.max(1, столбцы - 1));

                y = 65 +
                    Math.floor(индекс / столбцы) * 105;

                if (столбцы === 1) {
                    x = ширина / 2;
                }
            } else {
                const диапазонX = максимумX - минимумX || 1;
                const диапазонY = максимумY - минимумY || 1;

                x = отступ +
                    ((исходныеX[индекс] - минимумX) /
                    диапазонX) *
                    (ширина - отступ * 2);

                y = отступ +
                    ((исходныеY[индекс] - минимумY) /
                    диапазонY) *
                    Math.max(1, высота - отступ * 2);
            }

            координаты.set(узел.идентификатор, {
                x,
                y
            });
        });

        const слойСвязей = создатьЭлементSVG("g");
        слойСвязей.setAttribute("aria-label", "Связи узлов");

        let количествоНарисованныхСвязей = 0;

        for (const связь of связи) {
            const начало = координаты.get(связь.откуда);
            const конец = координаты.get(связь.куда);

            if (!начало || !конец) {
                continue;
            }

            const линия = создатьЭлементSVG("line", {
                x1: начало.x,
                y1: начало.y,
                x2: конец.x,
                y2: конец.y,
                stroke: связь.активна
                    ? "#76d4ff"
                    : "#64879c",
                "stroke-width": связь.активна ? 2.5 : 1.5,
                "stroke-opacity": связь.активна ? 1 : 0.7,
                "marker-end": "url(#стрелка-графа-3d)"
            });

            const описание = создатьЭлементSVG("title");
            описание.textContent =
                String(связь.идентификатор) +
                ": " +
                String(связь.откуда) +
                " → " +
                String(связь.куда) +
                " (" +
                String(связь.тип) +
                ")";

            линия.appendChild(описание);
            слойСвязей.appendChild(линия);

            количествоНарисованныхСвязей += 1;
        }

        svg.appendChild(слойСвязей);

        const слойУзлов = создатьЭлементSVG("g");
        слойУзлов.setAttribute("aria-label", "Узлы ядра");

        for (const узел of узлы) {
            const позиция = координаты.get(
                узел.идентификатор
            );

            const группа = создатьЭлементSVG("g", {
                transform:
                    "translate(" +
                    позиция.x +
                    " " +
                    позиция.y +
                    ")"
            });

            const цвет = получитьЦветУзла(узел.тип);

            const карточка = создатьЭлементSVG("rect", {
                x: -82,
                y: -27,
                width: 164,
                height: 54,
                rx: 8,
                fill: "#10212e",
                stroke: цвет,
                "stroke-width": узел.активен ? 2.5 : 1.4,
                "stroke-opacity": узел.активен ? 1 : 0.8
            });

            группа.appendChild(карточка);

            const название = добавитьТекст(
                группа,
                узел.имя || узел.идентификатор || "Без имени",
                {
                    x: 0,
                    y: -5,
                    fill: "#e0edf5",
                    "font-size": 13,
                    "font-weight": 700,
                    "text-anchor": "middle"
                }
            );

            название.setAttribute(
                "aria-label",
                String(узел.имя || узел.идентификатор)
            );

            добавитьТекст(
                группа,
                String(узел.тип || "узел") +
                    (узел.активен ? " · активен" : ""),
                {
                    x: 0,
                    y: 13,
                    fill: цвет,
                    "font-size": 10,
                    "text-anchor": "middle"
                }
            );

            const описание = создатьЭлементSVG("title");
            описание.textContent =
                "Идентификатор: " +
                String(узел.идентификатор) +
                "\nТип: " +
                String(узел.тип) +
                "\nИмя: " +
                String(узел.имя) +
                "\nX: " +
                String(узел.позиция?.x ?? 0) +
                "\nY: " +
                String(узел.позиция?.y ?? 0) +
                "\nZ: " +
                String(узел.позиция?.z ?? 0);

            группа.appendChild(описание);
            слойУзлов.appendChild(группа);
        }

        svg.appendChild(слойУзлов);
        рамка.appendChild(svg);

        состояниеГрафа.textContent =
            "Узлов: " +
            узлы.length +
            " · Связей в снимке: " +
            связи.length +
            " · Отображено связей: " +
            количествоНарисованныхСвязей +
            " · Событий: " +
            String(снимок.количествоСобытий ?? 0);

        if (количествоНарисованныхСвязей < связи.length) {
            состояниеГрафа.textContent +=
                " · Часть связей не имеет отображаемых конечных узлов";
        }
    }

    function подключитьПерехватВыполнения() {
        const исходныйFetch = window.fetch.bind(window);

        window.fetch = async function (...аргументы) {
            const ответ = await исходныйFetch(...аргументы);

            try {
                const запрос = аргументы[0];
                const адрес = typeof запрос === "string"
                    ? запрос
                    : запрос instanceof Request
                        ? запрос.url
                        : String(запрос);

                const путь = decodeURIComponent(new URL(
                    адрес,
                    window.location.href
                ).pathname);

                if (
                    путь === "/api/выполнение" &&
                    ответ.ok
                ) {
                    ответ.clone()
                        .json()
                        .then(данные => {
                            if (данные && данные.снимок3D) {
                                показатьСнимок(данные.снимок3D);
                            } else {
                                показатьПустойГраф(
                                    "Ответ сервера не содержит снимок 3D-ядра."
                                );
                            }
                        })
                        .catch(() => {
                            показатьПустойГраф(
                                "Не удалось прочитать снимок 3D-ядра."
                            );
                        });
                }
            } catch {
                // Ошибка графа не должна мешать выполнению программы.
            }

            return ответ;
        };
    }

    function запуститьКлиент() {
        подготовитьПанель();
        подключитьПерехватВыполнения();
    }

    if (document.readyState === "loading") {
        document.addEventListener(
            "DOMContentLoaded",
            запуститьКлиент,
            { once: true }
        );
    } else {
        запуститьКлиент();
    }
})();
`;

function создатьМостGit(): Plugin {
    return {
        name: "улитка-мост-git",

        configureServer(сервер) {
            сервер.middlewares.use(
                (запрос, ответ, следующий) => {
                    const путь =
                        decodeURIComponent(
                            new URL(
                                запрос.url ?? "/",
                                "http://localhost",
                            ).pathname,
                        );

                    if (путь !== "/api/git") {
                        следующий();
                        return;
                    }

                    if (запрос.method !== "POST") {
                        ответ.statusCode = 405;

                        ответ.setHeader(
                            "Content-Type",
                            "application/json; charset=utf-8",
                        );

                        ответ.end(
                            JSON.stringify({
                                успешно: false,
                                сообщение:
                                    "Разрешена только команда POST.",
                            }),
                        );

                        return;
                    }

                    const части: Buffer[] = [];

                    запрос.on(
                        "data",
                        (часть: Buffer) => {
                            части.push(часть);
                        },
                    );

                    запрос.on(
                        "end",
                        () => {
                            try {
                                const тело =
                                    Buffer.concat(части)
                                        .toString("utf8");

                                const данные =
                                    JSON.parse(тело) as {
                                        команда?: unknown;
                                    };

                                if (
                                    typeof данные.команда !==
                                    "string"
                                ) {
                                    ответ.statusCode = 400;

                                    ответ.setHeader(
                                        "Content-Type",
                                        "application/json; charset=utf-8",
                                    );

                                    ответ.end(
                                        JSON.stringify({
                                            успешно: false,
                                            сообщение:
                                                "Не указана команда терминала.",
                                        }),
                                    );

                                    return;
                                }

                                const разобраннаяКоманда =
                                    разобратьКоманду(
                                        данные.команда,
                                    );

                                if (
                                    разобраннаяКоманда ===
                                    undefined
                                ) {
                                    ответ.statusCode = 400;

                                    ответ.setHeader(
                                        "Content-Type",
                                        "application/json; charset=utf-8",
                                    );

                                    ответ.end(
                                        JSON.stringify({
                                            успешно: false,
                                            сообщение:
                                                "Не удалось разобрать команду «" +
                                                данные.команда +
                                                "».",
                                        }),
                                    );

                                    return;
                                }

                                const результат =
                                    выполнитьБезопаснуюGitКоманду(
                                        разобраннаяКоманда,
                                    );

                                ответ.statusCode =
                                    результат.выполнено
                                        ? 200
                                        : 400;

                                ответ.setHeader(
                                    "Content-Type",
                                    "application/json; charset=utf-8",
                                );

                                ответ.end(
                                    JSON.stringify({
                                        успешно:
                                            результат.выполнено,
                                        сообщение:
                                            результат.сообщение,
                                        вывод:
                                            результат.вывод,
                                    }),
                                );
                            } catch (ошибка) {
                                ответ.statusCode = 500;

                                ответ.setHeader(
                                    "Content-Type",
                                    "application/json; charset=utf-8",
                                );

                                const сообщение =
                                    ошибка instanceof Error
                                        ? ошибка.message
                                        : String(ошибка);

                                ответ.end(
                                    JSON.stringify({
                                        успешно: false,
                                        сообщение:
                                            "Ошибка серверного моста Git: " +
                                            сообщение,
                                    }),
                                );
                            }
                        },
                    );
                },
            );
        },
    };
}

function создатьМостВыполнения(): Plugin {
    const система = new СистемаУлитки3D();

    return {
        name: "улитка-мост-выполнения",

        transformIndexHtml: {
            order: "pre",

            handler(html) {
                return {
                    html,

                    tags: [
                        {
                            tag: "script",
                            children: клиентГрафа3D,
                            injectTo: "head",
                        },
                    ],
                };
            },
        },

        configureServer(сервер) {
            сервер.middlewares.use(
                (запрос, ответ, следующий) => {
                    const путь =
                        decodeURIComponent(
                            new URL(
                                запрос.url ?? "/",
                                "http://localhost",
                            ).pathname,
                        );

                    if (путь !== "/api/выполнение") {
                        следующий();
                        return;
                    }

                    if (запрос.method !== "POST") {
                        ответ.statusCode = 405;

                        ответ.setHeader(
                            "Content-Type",
                            "application/json; charset=utf-8",
                        );

                        ответ.end(
                            JSON.stringify({
                                успешно: false,
                                сообщение:
                                    "Разрешена только команда POST.",
                            }),
                        );

                        return;
                    }

                    const части: Buffer[] = [];

                    запрос.on(
                        "data",
                        (часть: Buffer) => {
                            части.push(часть);
                        },
                    );

                    запрос.on(
                        "end",
                        () => {
                            try {
                                const тело =
                                    Buffer.concat(части)
                                        .toString("utf8");

                                const данные =
                                    JSON.parse(тело) as {
                                        код?: unknown;
                                    };

                                if (
                                    typeof данные.код !== "string"
                                ) {
                                    ответ.statusCode = 400;

                                    ответ.setHeader(
                                        "Content-Type",
                                        "application/json; charset=utf-8",
                                    );

                                    ответ.end(
                                        JSON.stringify({
                                            успешно: false,
                                            сообщение:
                                                "Не указан исходный код программы.",
                                        }),
                                    );

                                    return;
                                }

                                const компилятор =
                                    система.получитьКомпилятор();

                                const результат =
                                    компилятор
                                        .выполнить(данные.код);

                                const интегратор =
                                    система
                                        .получитьИнтегратор();

                                const ядро =
                                    система
                                        .получитьЯдро();

                                const сообщениеОбОшибке =
                                    результат.успешно
                                        ? "Программа выполнена успешно."
                                        : (
                                            результат.семантика?.ошибки?.[0]?.сообщение ??
                                            результат.контекст?.диагностика?.at(-1)?.сообщение ??
                                            "Программа завершилась с ошибкой."
                                        );

                                const функции =
                                    результат
                                        .семантика
                                        .глобальныеСимволы
                                        .filter(
                                            символ =>
                                                символ.вид ===
                                                "функция",
                                        )
                                        .map(
                                            символ => ({
                                                имя:
                                                    символ.имя,
                                                параметры:
                                                    символ.параметры
                                                        ? [
                                                            ...символ.параметры,
                                                        ]
                                                        : [],
                                            }),
                                        );

                                const функцииДля3D =
                                    результат
                                        .семантика
                                        .глобальныеСимволы
                                        .filter(
                                            символ =>
                                                символ.вид ===
                                                "функция",
                                        )
                                        .map(
                                            символ => ({
                                                вид:
                                                    "функция" as const,
                                                имя:
                                                    символ.имя,
                                            }),
                                        );

                                интегратор
                                    .синхронизироватьОбъявленныеФункции(
                                        функцииДля3D,
                                    );

                                const снимок3D =
                                    ядро.получитьСнимок3D();

                                const ответТело = {
                                    успешно: результат.успешно,
                                    сообщение: сообщениеОбОшибке,
                                    вывод: результат.контекст.вывод,
                                    переменные:
                                        результат.контекст.переменные,
                                    события:
                                        результат.контекст.события,
                                    диагностика:
                                        результат.контекст.диагностика,
                                    состояние:
                                        результат.контекст.фаза,
                                    дерево:
                                        результат.контекст.дерево,
                                    функции,

                                    трехмернаяСистема: {
                                        узлов:
                                            снимок3D.узлы.length,
                                        связей:
                                            снимок3D.связи.length,
                                        событий:
                                            снимок3D.количествоСобытий,
                                    },

                                    снимок3D,
                                };

                                ответ.statusCode = 200;

                                ответ.setHeader(
                                    "Content-Type",
                                    "application/json; charset=utf-8",
                                );

                                ответ.end(
                                    JSON.stringify(
                                        ответТело,
                                    ),
                                );
                            } catch (ошибка) {
                                ответ.statusCode = 500;

                                ответ.setHeader(
                                    "Content-Type",
                                    "application/json; charset=utf-8",
                                );

                                const сообщение =
                                    ошибка instanceof Error
                                        ? ошибка.message
                                        : String(ошибка);

                                ответ.end(
                                    JSON.stringify({
                                        успешно: false,
                                        сообщение:
                                            "Ошибка серверной части выполнения: " +
                                            сообщение,
                                    }),
                                );
                            }
                        },
                    );
                },
            );
        },
    };
}

export default defineConfig({
    root: "./терминал",

    plugins: [
        создатьМостGit(),
        создатьМостВыполнения(),
    ],
});

