/**
 * ============================================================
 * 🐌 УЛИТКА
 * Конфигурация Vite: локализация Monaco и граф 3D-ядра
 * ============================================================
 *
 * HTTP-мосты `/api/*` живут в общем модуле `исходники/мосты_сервера.ts`
 * (его же использует прод-сервер приложения).
 */

import {
    defineConfig,
    type Plugin,
} from "vite";

import {
    мостGit,
    мостВыполнения,
} from "./исходники/мосты_сервера.js";
import {
    создатьМостФайловПроекта,
} from "./исходники/мост_файлов_проекта.js";
import {
    переводMonaco,
} from "./терминал/локализация/монако_ru.js";

// ============================================================
// ДЕНЬ 7: ЛОКАЛИЗАЦИЯ MONACO (виджеты по-русски)
// ============================================================

/** Подготовленные замены: localize(номер, "Английская строка") → русская. */
const ЛОКАЛИЗАЦИЯ_ЛИТЕРАЛОВ = Object.entries(
    переводMonaco,
).map(([английская, русская]) => ({
    искать: new RegExp(
        `(localize\\(\\s*[\\w.]+\\s*,\\s*)"${английская.replace(
            /[.*+?^${}()|[\]\\]/g,
            "\\$&",
        )}"`,
        "g",
    ),
    замена: `$1${JSON.stringify(русская)}`,
}));

/**
 * Vite-плагин: заменяет английские литералы виджетов Monaco
 * на русские из словаря `терминал/локализация/монако_ru.ts`.
 * Работает и в dev, и в сборке — иначе собранный интерфейс
 * снова заговорит по-английски.
 */
function локализацияMonaco(): Plugin {
    return {
        name: "улитка-локализация-monaco",
        enforce: "pre",

        transform(код, id) {
            if (!id.includes("monaco-editor")) {
                return null;
            }

            let итог = код;
            let изменено = false;

            for (const { искать, замена } of ЛОКАЛИЗАЦИЯ_ЛИТЕРАЛОВ) {
                искать.lastIndex = 0;

                if (искать.test(код)) {
                    искать.lastIndex = 0;

                    итог = итог.replace(искать, замена);

                    изменено = true;
                }
            }

            if (!изменено) {
                return null;
            }

            console.log(
                "🐌 Локализация Monaco:",
                id.split(/[\\/]/).slice(-1)[0],
            );

            return {
                code: итог,
                map: null,
            };
        },
    };
}

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
    let полотноЖивогоФона = null;
    let кнопкаРазвернутьГрафа = null;

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

    function добавитьКинематографическийФон(svg, ширина, высота) {
        const defs = создатьЭлементSVG("defs");

        const градиентКосмоса = создатьЭлементSVG("linearGradient", {
            id: "ultra3d-cinematic-scene-gradient",
            x1: "0%",
            y1: "0%",
            x2: "100%",
            y2: "100%"
        });

        градиентКосмоса.appendChild(создатьЭлементSVG("stop", {
            offset: "0%",
            "stop-color": "#102e50"
        }));
        градиентКосмоса.appendChild(создатьЭлементSVG("stop", {
            offset: "42%",
            "stop-color": "#071725"
        }));
        градиентКосмоса.appendChild(создатьЭлементSVG("stop", {
            offset: "100%",
            "stop-color": "#02050c"
        }));

        defs.appendChild(градиентКосмоса);

        const голубаяТуманность = создатьЭлементSVG("radialGradient", {
            id: "ultra3d-nebula-blue",
            cx: "50%",
            cy: "45%",
            r: "65%"
        });

        голубаяТуманность.appendChild(создатьЭлементSVG("stop", {
            offset: "0%",
            "stop-color": "#2799d5",
            "stop-opacity": "0.48"
        }));
        голубаяТуманность.appendChild(создатьЭлементSVG("stop", {
            offset: "48%",
            "stop-color": "#15518e",
            "stop-opacity": "0.2"
        }));
        голубаяТуманность.appendChild(создатьЭлементSVG("stop", {
            offset: "100%",
            "stop-color": "#07101c",
            "stop-opacity": "0"
        }));

        defs.appendChild(голубаяТуманность);

        const фиолетоваяТуманность = создатьЭлементSVG("radialGradient", {
            id: "ultra3d-nebula-violet",
            cx: "50%",
            cy: "50%",
            r: "60%"
        });

        фиолетоваяТуманность.appendChild(создатьЭлементSVG("stop", {
            offset: "0%",
            "stop-color": "#8054db",
            "stop-opacity": "0.4"
        }));
        фиолетоваяТуманность.appendChild(создатьЭлементSVG("stop", {
            offset: "100%",
            "stop-color": "#8054db",
            "stop-opacity": "0"
        }));

        defs.appendChild(фиолетоваяТуманность);

        const горизонтГрадиент = создатьЭлементSVG("linearGradient", {
            id: "ultra3d-horizon-light",
            x1: "0%",
            y1: "0%",
            x2: "100%",
            y2: "0%"
        });

        горизонтГрадиент.appendChild(создатьЭлементSVG("stop", {
            offset: "0%",
            "stop-color": "#38a8e8",
            "stop-opacity": "0"
        }));
        горизонтГрадиент.appendChild(создатьЭлементSVG("stop", {
            offset: "50%",
            "stop-color": "#9beaff",
            "stop-opacity": "0.95"
        }));
        горизонтГрадиент.appendChild(создатьЭлементSVG("stop", {
            offset: "100%",
            "stop-color": "#9672ff",
            "stop-opacity": "0"
        }));

        defs.appendChild(горизонтГрадиент);

        const градиентПланеты = создатьЭлементSVG("radialGradient", {
            id: "ultra3d-planet-surface",
            cx: "30%",
            cy: "25%",
            r: "75%"
        });

        градиентПланеты.appendChild(создатьЭлементSVG("stop", {
            offset: "0%",
            "stop-color": "#ddf8ff"
        }));
        градиентПланеты.appendChild(создатьЭлементSVG("stop", {
            offset: "35%",
            "stop-color": "#51bde9"
        }));
        градиентПланеты.appendChild(создатьЭлементSVG("stop", {
            offset: "72%",
            "stop-color": "#24508c"
        }));
        градиентПланеты.appendChild(создатьЭлементSVG("stop", {
            offset: "100%",
            "stop-color": "#101a47"
        }));

        defs.appendChild(градиентПланеты);

        const фильтрСвечения = создатьЭлементSVG("filter", {
            id: "ultra3d-glow",
            x: "-100%",
            y: "-100%",
            width: "300%",
            height: "300%"
        });

        фильтрСвечения.appendChild(создатьЭлементSVG("feGaussianBlur", {
            stdDeviation: "2.5",
            result: "свечение"
        }));

        const объединение = создатьЭлементSVG("feMerge");
        объединение.appendChild(создатьЭлементSVG("feMergeNode", {
            in: "свечение"
        }));
        объединение.appendChild(создатьЭлементSVG("feMergeNode", {
            in: "SourceGraphic"
        }));

        фильтрСвечения.appendChild(объединение);
        defs.appendChild(фильтрСвечения);

        svg.appendChild(defs);

        const фон = создатьЭлементSVG("rect", {
            x: 0,
            y: 0,
            width: ширина,
            height: высота,
            fill: "url(#ultra3d-cinematic-scene-gradient)",
            "data-scene": "ultra3d-cinematic-scene"
        });

        svg.appendChild(фон);

        const голубоеСвечение = создатьЭлементSVG("ellipse", {
            cx: ширина * 0.48,
            cy: высота * 0.38,
            rx: ширина * 0.7,
            ry: высота * 0.68,
            fill: "url(#ultra3d-nebula-blue)"
        });

        svg.appendChild(голубоеСвечение);

        голубоеСвечение.appendChild(создатьЭлементSVG("animateTransform", {
            attributeName: "transform",
            attributeType: "XML",
            type: "translate",
            values: "-12 -6; 15 8; -12 -6",
            dur: "19s",
            repeatCount: "indefinite"
        }));

        const фиолетовоеСвечение = создатьЭлементSVG("ellipse", {
            cx: ширина * 0.83,
            cy: высота * 0.53,
            rx: ширина * 0.35,
            ry: высота * 0.65,
            fill: "url(#ultra3d-nebula-violet)"
        });

        svg.appendChild(фиолетовоеСвечение);

        фиолетовоеСвечение.appendChild(создатьЭлементSVG("animateTransform", {
            attributeName: "transform",
            attributeType: "XML",
            type: "translate",
            values: "13 7; -11 -5; 13 7",
            dur: "24s",
            repeatCount: "indefinite"
        }));

        const звёзды = создатьЭлементSVG("g", {
            "aria-label": "Звёзды космического пространства"
        });

        for (let индекс = 0; индекс < 100; индекс++) {
            const случайноеX = Math.abs(
                Math.sin((индекс + 1) * 12.9898) * 43758.5453
            );
            const случайноеY = Math.abs(
                Math.sin((индекс + 1) * 78.233) * 24634.6345
            );

            const x = (случайноеX % 1) * ширина;
            const y = (случайноеY % 1) * высота;
            const радиус = 0.55 + (индекс % 5) * 0.27;

            const звезда = создатьЭлементSVG("circle", {
                cx: x,
                cy: y,
                r: радиус,
                fill: индекс % 7 === 0 ? "#b69cff" : "#a6e8ff",
                opacity: 0.25 + (индекс % 6) * 0.1
            });

            if (индекс % 4 === 0) {
                звезда.setAttribute("filter", "url(#ultra3d-glow)");

                звезда.appendChild(создатьЭлементSVG("animate", {
                    attributeName: "opacity",
                    values: "0.22;0.95;0.22",
                    dur: (3 + индекс % 5) + "s",
                    begin: "-" + (индекс % 4) + "s",
                    repeatCount: "indefinite"
                }));
            }

            звёзды.appendChild(звезда);
        }

        svg.appendChild(звёзды);

        const горизонт = высота * 0.39;
        const центрX = ширина * 0.5;

        const планетаX = ширина * 0.81;
        const планетаY = высота * 0.23;
        const радиусПланеты = Math.max(
            17,
            Math.min(37, высота * 0.13)
        );

        // ========================================================
        // САТУРН — КИНОМАТОГРАФИЧЕСКАЯ ПЛАНЕТНАЯ СИСТЕМА
        // ========================================================

        const градиентСатурна = создатьЭлементSVG("radialGradient", {
            id: "ultra3d-saturn-surface",
            cx: "29%",
            cy: "23%",
            r: "78%"
        });

        const цветаСатурна = [
            ["0%", "#fff3cb"],
            ["18%", "#f3dbab"],
            ["34%", "#d9b47d"],
            ["49%", "#c79b65"],
            ["61%", "#e7ca94"],
            ["73%", "#a97b52"],
            ["86%", "#785b50"],
            ["100%", "#322b3d"]
        ];

        for (const [положение, цвет] of цветаСатурна) {
            градиентСатурна.appendChild(
                создатьЭлементSVG("stop", {
                    offset: положение,
                    "stop-color": цвет
                })
            );
        }

        defs.appendChild(градиентСатурна);

        const градиентКолец = создатьЭлементSVG("linearGradient", {
            id: "ultra3d-saturn-ring-gradient",
            x1: "0%",
            y1: "0%",
            x2: "100%",
            y2: "100%"
        });

        const цветаКолец = [
            ["0%", "#6c584a", "0.9"],
            ["14%", "#e6cea3", "0.95"],
            ["27%", "#a78a68", "0.92"],
            ["41%", "#f4e1b8", "1"],
            ["53%", "#79634f", "0.9"],
            ["67%", "#e6c99c", "0.98"],
            ["82%", "#b18b61", "0.9"],
            ["100%", "#514354", "0.85"]
        ];

        for (const [положение, цвет, прозрачность] of цветаКолец) {
            градиентКолец.appendChild(
                создатьЭлементSVG("stop", {
                    offset: положение,
                    "stop-color": цвет,
                    "stop-opacity": прозрачность
                })
            );
        }

        defs.appendChild(градиентКолец);

        const клипСатурна = создатьЭлементSVG("clipPath", {
            id: "ultra3d-saturn-disc-clip",
            clipPathUnits: "userSpaceOnUse"
        });

        клипСатурна.appendChild(
            создатьЭлементSVG("circle", {
                cx: 0,
                cy: 0,
                r: радиусПланеты
            })
        );

        defs.appendChild(клипСатурна);

        const сценаСатурна = создатьЭлементSVG("g", {
            transform:
                "translate(" +
                планетаX +
                " " +
                планетаY +
                ")"
        });

        сценаСатурна.appendChild(
            создатьЭлементSVG("animateTransform", {
                attributeName: "transform",
                attributeType: "XML",
                type: "translate",
                values:
                    "0 0; 0 -2.5; 1.5 0; 0 2.5; 0 0",
                dur: "22s",
                repeatCount: "indefinite",
                additive: "sum"
            })
        );

        svg.appendChild(сценаСатурна);

        const радиусКольцаX = радиусПланеты * 2.12;
        const радиусКольцаY = радиусПланеты * 0.57;
        const наклонКолец = -18;

        // Тонкая орбитальная линия вокруг всей системы.

        const внешняяОрбита = создатьЭлементSVG("ellipse", {
            cx: 0,
            cy: 0,
            rx: радиусПланеты * 2.58,
            ry: радиусПланеты * 1.2,
            fill: "none",
            stroke: "#6dcfff",
            "stroke-width": 0.8,
            "stroke-opacity": 0.16,
            transform: "rotate(" + наклонКолец + ")"
        });

        внешняяОрбита.appendChild(
            создатьЭлементSVG("animate", {
                attributeName: "stroke-opacity",
                values: "0.08; 0.3; 0.08",
                dur: "12s",
                repeatCount: "indefinite"
            })
        );

        сценаСатурна.appendChild(внешняяОрбита);

        // Кольца на дальней стороне планеты.

        const кольцаСзади = создатьЭлементSVG("g", {
            transform: "rotate(" + наклонКолец + ")"
        });

        const слоиКолец = [
            {
                коэффициент: 1,
                толщина: 4.8,
                цвет: "url(#ultra3d-saturn-ring-gradient)",
                прозрачность: 0.78
            },
            {
                коэффициент: 0.94,
                толщина: 1.6,
                цвет: "#f4e1bd",
                прозрачность: 0.78
            },
            {
                коэффициент: 0.87,
                толщина: 3.2,
                цвет: "#8b7059",
                прозрачность: 0.85
            },
            {
                коэффициент: 0.79,
                толщина: 2.2,
                цвет: "#e5c99b",
                прозрачность: 0.83
            },
            {
                коэффициент: 0.72,
                толщина: 4.2,
                цвет: "#56483e",
                прозрачность: 0.92
            },
            {
                коэффициент: 0.64,
                толщина: 2.1,
                цвет: "#f1dcb5",
                прозрачность: 0.89
            }
        ];

        for (const слой of слоиКолец) {
            кольцаСзади.appendChild(
                создатьЭлементSVG("ellipse", {
                    cx: 0,
                    cy: 0,
                    rx: радиусКольцаX * слой.коэффициент,
                    ry: радиусКольцаY * слой.коэффициент,
                    fill: "none",
                    stroke: слой.цвет,
                    "stroke-width": слой.толщина,
                    "stroke-opacity": слой.прозрачность
                })
            );
        }

        кольцаСзади.appendChild(
            создатьЭлементSVG("animate", {
                attributeName: "opacity",
                values: "0.8; 1; 0.86; 0.8",
                dur: "15s",
                repeatCount: "indefinite"
            })
        );

        сценаСатурна.appendChild(кольцаСзади);

        // Сферическая поверхность планеты.

        const телоСатурна = создатьЭлементSVG("g", {
            transform: "rotate(" + наклонКолец + ")"
        });

        const дискСатурна = создатьЭлементSVG("circle", {
            cx: 0,
            cy: 0,
            r: радиусПланеты,
            fill: "url(#ultra3d-saturn-surface)",
            stroke: "#f4d9a8",
            "stroke-width": 0.8,
            "stroke-opacity": 0.75,
            filter: "url(#ultra3d-glow)"
        });

        дискСатурна.appendChild(
            создатьЭлементSVG("animate", {
                attributeName: "opacity",
                values: "0.94; 1; 0.96; 0.94",
                dur: "9s",
                repeatCount: "indefinite"
            })
        );

        телоСатурна.appendChild(дискСатурна);

        // Мягкая теневая сторона.

        const слойТени = создатьЭлементSVG("g", {
            "clip-path": "url(#ultra3d-saturn-disc-clip)"
        });

        слойТени.appendChild(
            создатьЭлементSVG("ellipse", {
                cx: радиусПланеты * 0.57,
                cy: 0,
                rx: радиусПланеты * 0.48,
                ry: радиусПланеты * 0.95,
                fill: "#171b35",
                opacity: 0.33
            })
        );

        телоСатурна.appendChild(слойТени);

        // Атмосферные полосы внутри контура планеты.

        const атмосферныеПолосы = создатьЭлементSVG("g", {
            "clip-path": "url(#ultra3d-saturn-disc-clip)"
        });

        const цветаАтмосферы = [
            "#fff0c6",
            "#bd8d5c",
            "#f6dba6",
            "#977052",
            "#f2d4a0",
            "#cfaa76",
            "#f9e9be",
            "#9f7957",
            "#e7c28b",
            "#f8e5bb"
        ];

        for (let индекс = 0; индекс < 10; индекс++) {
            const уровень =
                -радиусПланеты * 0.84 +
                индекс * радиусПланеты * 1.68 / 9;

            const изгиб =
                уровень +
                (индекс % 2 === 0 ? 1 : -1) *
                радиусПланеты * 0.065;

            const полоса = создатьЭлементSVG("path", {
                d:
                    "M " + (-радиусПланеты * 1.08) +
                    " " + уровень +
                    " Q 0 " + изгиб +
                    " " + (радиусПланеты * 1.08) +
                    " " + уровень,
                fill: "none",
                stroke: цветаАтмосферы[индекс],
                "stroke-width":
                    радиусПланеты * (0.055 + (индекс % 3) * 0.022),
                "stroke-opacity": 0.32 + (индекс % 3) * 0.08
            });

            атмосферныеПолосы.appendChild(полоса);
        }

        атмосферныеПолосы.appendChild(
            создатьЭлементSVG("animateTransform", {
                attributeName: "transform",
                attributeType: "XML",
                type: "translate",
                values:
                    (-радиусПланеты * 0.08) + " 0; " +
                    (радиусПланеты * 0.08) + " 0; " +
                    (-радиусПланеты * 0.08) + " 0",
                dur: "30s",
                repeatCount: "indefinite",
                additive: "sum"
            })
        );

        телоСатурна.appendChild(атмосферныеПолосы);

        // Холодный свет на освещённой стороне атмосферы.

        телоСатурна.appendChild(
            создатьЭлементSVG("ellipse", {
                cx: -радиусПланеты * 0.31,
                cy: -радиусПланеты * 0.3,
                rx: радиусПланеты * 0.23,
                ry: радиусПланеты * 0.12,
                fill: "#fff5dc",
                opacity: 0.24,
                filter: "url(#ultra3d-glow)",
                transform: "rotate(-24)"
            })
        );

        сценаСатурна.appendChild(телоСатурна);

        // Ближняя сторона колец проходит поверх диска планеты.

        const кольцаСпереди = создатьЭлементSVG("g", {
            transform: "rotate(" + наклонКолец + ")"
        });

        const нижняяДуга =
            "M " + (-радиусКольцаX) + " 0" +
            " A " + радиусКольцаX +
            " " + радиусКольцаY +
            " 0 0 1 " + радиусКольцаX + " 0";

        кольцаСпереди.appendChild(
            создатьЭлементSVG("path", {
                d: нижняяДуга,
                fill: "none",
                stroke: "#5b453c",
                "stroke-width": 8,
                "stroke-opacity": 0.86
            })
        );

        кольцаСпереди.appendChild(
            создатьЭлементSVG("path", {
                d: нижняяДуга,
                fill: "none",
                stroke: "url(#ultra3d-saturn-ring-gradient)",
                "stroke-width": 5,
                "stroke-opacity": 0.97,
                filter: "url(#ultra3d-glow)"
            })
        );

        кольцаСпереди.appendChild(
            создатьЭлементSVG("path", {
                d: нижняяДуга,
                fill: "none",
                stroke: "#f6e6c6",
                "stroke-width": 0.9,
                "stroke-opacity": 0.9
            })
        );

        кольцаСпереди.appendChild(
            создатьЭлементSVG("animate", {
                attributeName: "opacity",
                values: "0.88; 1; 0.92; 0.88",
                dur: "11s",
                repeatCount: "indefinite"
            })
        );

        сценаСатурна.appendChild(кольцаСпереди);

        // Маленький спутник, плавно проходящий по орбите.

        const спутникОрбитыX = радиусПланеты * 2.54;
        const спутникОрбитыY = радиусПланеты * 1.13;

        const спутник = создатьЭлементSVG("circle", {
            cx: 0,
            cy: 0,
            r: Math.max(1.3, радиусПланеты * 0.055),
            fill: "#c6f0ff",
            stroke: "#9edcff",
            "stroke-width": 0.55,
            filter: "url(#ultra3d-glow)"
        });

        спутник.appendChild(
            создатьЭлементSVG("animateMotion", {
                path:
                    "M " + (-спутникОрбитыX) + " 0" +
                    " A " + спутникОрбитыX +
                    " " + спутникОрбитыY +
                    " 0 1 1 " + спутникОрбитыX + " 0" +
                    " A " + спутникОрбитыX +
                    " " + спутникОрбитыY +
                    " 0 1 1 " + (-спутникОрбитыX) + " 0",
                dur: "28s",
                repeatCount: "indefinite"
            })
        );

        спутник.appendChild(
            создатьЭлементSVG("animate", {
                attributeName: "opacity",
                values: "0.25; 1; 0.55; 0.25",
                dur: "7s",
                repeatCount: "indefinite"
            })
        );

        сценаСатурна.appendChild(спутник);

        const сетка = создатьЭлементSVG("g", {
            fill: "none",
            "stroke-linecap": "round",
            "aria-label": "Перспективная трёхмерная сетка"
        });

        сетка.appendChild(создатьЭлементSVG("animateTransform", {
            attributeName: "transform",
            attributeType: "XML",
            type: "translate",
            values: "0 0; 0 7; 0 0",
            dur: "20s",
            repeatCount: "indefinite"
        }));

        for (let индекс = 0; индекс <= 20; индекс++) {
            const доля = индекс / 20;
            const началоX = доля * ширина;
            const непрозрачность =
                0.1 + Math.abs(доля - 0.5) * 0.23;

            const луч = создатьЭлементSVG("path", {
                d:
                    "M " + началоX + " " + высота +
                    " L " + центрX + " " + горизонт,
                stroke: "#55cbff",
                "stroke-width": индекс % 5 === 0 ? 1.1 : 0.65,
                "stroke-opacity": непрозрачность
            });

            сетка.appendChild(луч);
        }

        for (let индекс = 1; индекс <= 16; индекс++) {
            const доля = индекс / 16;
            const перспектива = Math.pow(доля, 2.1);
            const y = горизонт + (высота - горизонт) * перспектива;

            const линия = создатьЭлементSVG("path", {
                d: "M 0 " + y + " L " + ширина + " " + y,
                stroke: "#4bbdf2",
                "stroke-width": 0.7,
                "stroke-opacity": 0.1 + доля * 0.18
            });

            сетка.appendChild(линия);
        }

        svg.appendChild(сетка);

        const светГоризонта = создатьЭлементSVG("path", {
            d:
                "M 0 " + горизонт +
                " Q " + центрX + " " + (горизонт - 13) +
                " " + ширина + " " + горизонт,
            fill: "none",
            stroke: "url(#ultra3d-horizon-light)",
            "stroke-width": 1.5,
            filter: "url(#ultra3d-glow)"
        });

        svg.appendChild(светГоризонта);

        const дальняяОрбита = создатьЭлементSVG("ellipse", {
            cx: ширина * 0.49,
            cy: высота * 0.48,
            rx: ширина * 0.34,
            ry: высота * 0.075,
            fill: "none",
            stroke: "#6bd8ff",
            "stroke-width": 0.8,
            "stroke-opacity": 0.34,
            transform:
                "rotate(-9 " +
                ширина * 0.49 +
                " " +
                высота * 0.48 +
                ")"
        });

        svg.appendChild(дальняяОрбита);
    }

    function создатьФоновуюСцену(ширина, высота) {
        if (полотноЖивогоФона) {
            return полотноЖивогоФона;
        }

        const canvas = document.createElement("canvas");
        canvas.className = "фон-webgl-графа";
        canvas.setAttribute("aria-hidden", "true");

        canvas.style.position = "absolute";
        canvas.style.inset = "0";
        canvas.style.width = "100%";
        canvas.style.height = "100%";
        canvas.style.minHeight = "0";
        canvas.style.display = "block";
        canvas.style.zIndex = "0";
        canvas.style.pointerEvents = "none";
        canvas.style.background =
            "radial-gradient(ellipse at 50% 50%, #132c55, #030611 75%)";

        полотноЖивогоФона = canvas;

        if (!document.getElementById("стиль-webgl-живого-фона")) {
            const стиль = document.createElement("style");
            стиль.id = "стиль-webgl-живого-фона";

            стиль.textContent = [
                ".граф-3d-рамка.граф-3d-webgl { position: relative; overflow: hidden; background: #030611; }",
                ".граф-3d-рамка.граф-3d-webgl::before, .граф-3d-рамка.граф-3d-webgl::after { display: none !important; }",
                ".граф-3d-рамка.граф-3d-webgl > .фон-webgl-графа { position: absolute; inset: 0; width: 100%; height: 100%; min-height: 0; z-index: 0; pointer-events: none; }",
                ".граф-3d-рамка.граф-3d-webgl > .граф-3d-svg { position: relative; z-index: 1; background: transparent; }",
                ".граф-3d-рамка.граф-3d-webgl > .граф-3d-пусто { position: relative; z-index: 1; background: rgba(3, 7, 17, 0.28); }"
            ].join("\n");

            document.head.appendChild(стиль);
        }

        requestAnimationFrame(() => {
            if (canvas.parentElement) {
                canvas.parentElement.classList.add("граф-3d-webgl");
            }
        });

        let gl = null;

        try {
            gl = canvas.getContext("webgl", {
                alpha: false,
                antialias: false,
                depth: false,
                stencil: false,
                powerPreference: "low-power"
            });
        } catch {
            gl = null;
        }

        if (!gl) {
            console.warn(
                "🐌 WebGL недоступен. Используется резервный фон."
            );
            return canvas;
        }

        const вершина = [
            "attribute vec2 aPosition;",
            "void main() {",
            "    gl_Position = vec4(aPosition, 0.0, 1.0);",
            "}"
        ].join("\n");

        const фрагмент = [
            "precision highp float;",
            "uniform vec2 u_resolution;",
            "uniform float u_time;",
            "uniform vec2 u_mouse;",
            "",
            "float hash(vec2 p) {",
            "    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);",
            "}",
            "",
            "float noise(vec2 p) {",
            "    vec2 i = floor(p);",
            "    vec2 f = fract(p);",
            "    f = f * f * (3.0 - 2.0 * f);",
            "    float a = hash(i);",
            "    float b = hash(i + vec2(1.0, 0.0));",
            "    float c = hash(i + vec2(0.0, 1.0));",
            "    float d = hash(i + vec2(1.0, 1.0));",
            "    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);",
            "}",
            "",
            "float fbm(vec2 p) {",
            "    float value = 0.0;",
            "    float amplitude = 0.5;",
            "    for (int i = 0; i < 5; i++) {",
            "        value += amplitude * noise(p);",
            "        p = mat2(1.6, -1.2, 1.2, 1.6) * p;",
            "        amplitude *= 0.5;",
            "    }",
            "    return value;",
            "}",
            "",
            "void main() {",
            "    vec2 uv = gl_FragCoord.xy / u_resolution.xy;",
            "    vec2 p = uv * 2.0 - 1.0;",
            "    p.x *= u_resolution.x / max(u_resolution.y, 1.0);",
            "    p += u_mouse * 0.16;",
            "",
            "    float t = u_time * 0.105;",
            "    float radius = length(p);",
            "    float angle = atan(p.y, p.x);",
            "",
            "    vec2 warp = vec2(",
            "        fbm(p * 1.35 + vec2(t * 0.45, -t * 0.24)),",
            "        fbm(p * 1.35 + vec2(5.7, 2.3) + vec2(-t * 0.2, t * 0.31))",
            "    );",
            "",
            "    vec2 warped = p + (warp - 0.5) * 0.95;",
            "    float cloud = fbm(warped * 2.15 + vec2(t * 0.22, -t * 0.17));",
            "    float fineCloud = fbm(warped * 4.1 + vec2(-t * 0.19, t * 0.27));",
            "    float spiralLine = sin(angle * 4.0 - radius * 11.5 - t * 1.15 + cloud * 5.4);",
            "    float spiral = exp(-abs(spiralLine) * 2.65) * (1.0 - smoothstep(0.06, 1.65, radius));",
            "",
            "    vec3 deepSpace = vec3(0.002, 0.006, 0.022);",
            "    vec3 blueSpace = vec3(0.008, 0.035, 0.105);",
            "    vec3 color = mix(deepSpace, blueSpace, cloud * 0.82);",
            "",
            "    vec3 cyan = vec3(0.015, 0.77, 0.98);",
            "    vec3 violet = vec3(0.52, 0.075, 0.93);",
            "    vec3 plasma = mix(cyan, violet, 0.5 + 0.5 * sin(angle * 2.0 + t * 0.55 + cloud * 4.0));",
            "",
            "    float broadCloud = smoothstep(0.42, 0.82, cloud) * (0.35 + 0.65 * fineCloud);",
            "    color += mix(cyan, violet, fineCloud) * broadCloud * 0.48;",
            "    color += plasma * spiral * (0.46 + cloud * 0.9);",
            "",
            "    float softMist = smoothstep(0.28, 0.82, fbm(warped * 1.65 + vec2(t * 0.12, -t * 0.08)));",
            "    color += mix(vec3(0.015, 0.16, 0.38), vec3(0.16, 0.035, 0.32), fineCloud) * softMist * 0.19;",
            "",
            "    float core = exp(-radius * 4.2);",
            "    color += vec3(0.025, 0.13, 0.34) * core;",
            "",
            "    vec2 starGrid = uv * vec2(88.0, 52.0);",
            "    vec2 cell = floor(starGrid);",
            "    vec2 local = fract(starGrid) - 0.5;",
            "    float seed = hash(cell);",
            "    vec2 jitter = vec2(hash(cell + vec2(3.1, 7.7)), hash(cell + vec2(8.2, 1.3))) - 0.5;",
            "    float star = 1.0 - smoothstep(0.012, 0.052, length(local - jitter * 0.58));",
            "    star *= step(0.965, seed);",
            "    float twinkle = 0.24 + 0.76 * (0.5 + 0.5 * sin(u_time * (1.5 + seed * 5.0) + seed * 90.0));",
            "    color += vec3(0.45, 0.75, 1.0) * star * twinkle;",
            "",
            "    vec2 secondGrid = uv * vec2(43.0, 26.0);",
            "    vec2 secondCell = floor(secondGrid);",
            "    vec2 secondLocal = fract(secondGrid) - 0.5;",
            "    float secondSeed = hash(secondCell + 37.2);",
            "    float secondStar = 1.0 - smoothstep(0.009, 0.032, length(secondLocal));",
            "    secondStar *= step(0.94, secondSeed);",
            "    color += vec3(0.65, 0.35, 1.0) * secondStar * (0.35 + 0.65 * abs(sin(u_time + secondSeed * 50.0)));",
            "",
            "    float vignette = 1.0 - smoothstep(0.28, 1.9, radius) * 0.64;",
            "    color *= vignette;",
            "    color = pow(max(color, vec3(0.0)), vec3(0.88));",
            "    gl_FragColor = vec4(color, 1.0);",
            "}"
        ].join("\n");

        function скомпилировать(тип, исходник) {
            const шейдер = gl.createShader(тип);

            if (!шейдер) {
                throw new Error("Не удалось создать WebGL-шейдер.");
            }

            gl.shaderSource(шейдер, исходник);
            gl.compileShader(шейдер);

            if (!gl.getShaderParameter(шейдер, gl.COMPILE_STATUS)) {
                const сообщение = gl.getShaderInfoLog(шейдер) || "Неизвестная ошибка GLSL.";
                gl.deleteShader(шейдер);
                throw new Error(сообщение);
            }

            return шейдер;
        }

        let программа;
        let буфер;
        let расположениеПозиции;
        let время;
        let разрешение;
        let положениеМыши;

        try {
            const шейдерВершин = скомпилировать(gl.VERTEX_SHADER, вершина);
            const шейдерФрагментов = скомпилировать(gl.FRAGMENT_SHADER, фрагмент);

            программа = gl.createProgram();

            if (!программа) {
                throw new Error("Не удалось создать WebGL-программу.");
            }

            gl.attachShader(программа, шейдерВершин);
            gl.attachShader(программа, шейдерФрагментов);
            gl.linkProgram(программа);

            gl.deleteShader(шейдерВершин);
            gl.deleteShader(шейдерФрагментов);

            if (!gl.getProgramParameter(программа, gl.LINK_STATUS)) {
                throw new Error(
                    gl.getProgramInfoLog(программа) ||
                    "Не удалось связать WebGL-шейдеры."
                );
            }

            расположениеПозиции = gl.getAttribLocation(программа, "aPosition");
            время = gl.getUniformLocation(программа, "u_time");
            разрешение = gl.getUniformLocation(программа, "u_resolution");
            положениеМыши = gl.getUniformLocation(программа, "u_mouse");

            буфер = gl.createBuffer();

            if (!буфер || расположениеПозиции < 0) {
                throw new Error("Не удалось подготовить геометрию WebGL.");
            }

            gl.bindBuffer(gl.ARRAY_BUFFER, буфер);
            gl.bufferData(
                gl.ARRAY_BUFFER,
                new Float32Array([
                    -1, -1,
                    3, -1,
                    -1, 3
                ]),
                gl.STATIC_DRAW
            );

            gl.disable(gl.DEPTH_TEST);
            gl.disable(gl.BLEND);
        } catch (ошибка) {
            console.warn(
                "🐌 Не удалось включить живой WebGL-фон:",
                ошибка
            );
            canvas.style.background =
                "radial-gradient(ellipse at 45% 45%, #172f61, #090717 50%, #02050d 85%)";
            return canvas;
        }

        let целеваяМышьX = 0;
        let целеваяМышьY = 0;
        let мышьX = 0;
        let мышьY = 0;

        window.addEventListener("pointermove", (событие) => {
            const родитель = canvas.parentElement;

            if (!родитель) {
                return;
            }

            const границы = родитель.getBoundingClientRect();

            if (границы.width <= 0 || границы.height <= 0) {
                return;
            }

            целеваяМышьX =
                ((событие.clientX - границы.left) / границы.width) * 2 - 1;

            целеваяМышьY =
                1 - ((событие.clientY - границы.top) / границы.height) * 2;

            целеваяМышьX = Math.max(-1, Math.min(1, целеваяМышьX));
            целеваяМышьY = Math.max(-1, Math.min(1, целеваяМышьY));
        });

        let времяНачала = null;

        function рисовать(текущееВремя) {
            if (времяНачала === null) {
                времяНачала = текущееВремя;
            }

            requestAnimationFrame(рисовать);

            if (document.hidden) {
                return;
            }

            const родитель = canvas.parentElement;

            if (!родитель) {
                return;
            }

            const границы = родитель.getBoundingClientRect();
            const ширинаCSS = Math.max(1, границы.width || ширина || 720);
            const высотаCSS = Math.max(1, границы.height || высота || 260);
            const плотность = Math.min(window.devicePixelRatio || 1, 1.5);

            const новаяШирина = Math.max(
                1,
                Math.floor(ширинаCSS * плотность)
            );

            const новаяВысота = Math.max(
                1,
                Math.floor(высотаCSS * плотность)
            );

            if (
                canvas.width !== новаяШирина ||
                canvas.height !== новаяВысота
            ) {
                canvas.width = новаяШирина;
                canvas.height = новаяВысота;
                gl.viewport(0, 0, canvas.width, canvas.height);
            }

            мышьX += (целеваяМышьX - мышьX) * 0.025;
            мышьY += (целеваяМышьY - мышьY) * 0.025;

            gl.useProgram(программа);
            gl.bindBuffer(gl.ARRAY_BUFFER, буфер);
            gl.enableVertexAttribArray(расположениеПозиции);
            gl.vertexAttribPointer(
                расположениеПозиции,
                2,
                gl.FLOAT,
                false,
                0,
                0
            );

            gl.uniform1f(
                время,
                (текущееВремя - времяНачала) * 0.001
            );

            gl.uniform2f(
                разрешение,
                canvas.width,
                canvas.height
            );

            gl.uniform2f(
                положениеМыши,
                мышьX,
                мышьY
            );

            gl.drawArrays(gl.TRIANGLES, 0, 3);
        }

        requestAnimationFrame(рисовать);

        return canvas;
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
            "    position: relative;",
            "    isolation: isolate;",
            "    perspective: 1000px;",
            "    width: 100%;",
            "    min-width: 0;",
            "    overflow: hidden;",
            "    border: 1px solid #29485e;",
            "    border-radius: 7px;",
            "    background: radial-gradient(ellipse at 50% 35%, rgba(27, 101, 135, .42), transparent 48%), radial-gradient(ellipse at 82% 76%, rgba(111, 60, 176, .2), transparent 36%), linear-gradient(160deg, #07101b 0%, #091827 48%, #03070d 100%);",
            "}",
            "",
            ".граф-3d-рамка::before {",
            "    content: ';",
            "    position: absolute;",
            "    inset: 0;",
            "    z-index: 0;",
            "    pointer-events: none;",
            "    background-image: radial-gradient(circle at 8% 17%, rgba(170, 231, 255, .98) 0 1px, transparent 2px), radial-gradient(circle at 17% 68%, rgba(80, 190, 255, .85) 0 1px, transparent 2px), radial-gradient(circle at 28% 36%, rgba(175, 225, 255, .8) 0 1px, transparent 2px), radial-gradient(circle at 43% 15%, rgba(104, 204, 255, .8) 0 1px, transparent 2px), radial-gradient(circle at 57% 73%, rgba(177, 218, 255, .9) 0 1px, transparent 2px), radial-gradient(circle at 69% 29%, rgba(81, 190, 255, .85) 0 1px, transparent 2px), radial-gradient(circle at 82% 50%, rgba(190, 222, 255, .9) 0 1px, transparent 2px), radial-gradient(circle at 93% 22%, rgba(81, 180, 255, .8) 0 1px, transparent 2px), radial-gradient(circle at 75% 88%, rgba(167, 117, 255, .7) 0 1px, transparent 2px), radial-gradient(circle at 36% 87%, rgba(83, 180, 255, .8) 0 1px, transparent 2px);",
            "    opacity: .78;",
            "    animation: граф-звёзды-пульсация 7s ease-in-out infinite alternate;",
            "}",
            "",
            ".граф-3d-рамка::after {",
            "    content: ';",
            "    position: absolute;",
            "    left: -20%;",
            "    right: -20%;",
            "    top: 25%;",
            "    bottom: -68%;",
            "    z-index: 0;",
            "    pointer-events: none;",
            "    background-image: linear-gradient(rgba(82, 188, 233, .2) 1px, transparent 1px), linear-gradient(90deg, rgba(82, 188, 233, .2) 1px, transparent 1px), radial-gradient(ellipse at 50% 0%, rgba(76, 175, 225, .28), transparent 68%);",
            "    background-size: 42px 42px, 42px 42px, 100% 100%;",
            "    transform: perspective(460px) rotateX(63deg) scale(1.25);",
            "    transform-origin: center top;",
            "    opacity: .7;",
            "    mask-image: linear-gradient(to bottom, transparent, black 18%, black 78%, transparent);",
            "    animation: граф-сетка-поток 22s linear infinite;",
            "}",
            "",
            "@keyframes граф-звёзды-пульсация {",
            "    from { opacity: .5; transform: translate3d(0, 0, 0) scale(1); }",
            "    to { opacity: .92; transform: translate3d(0, -5px, 0) scale(1.015); }",
            "}",
            "",
            "@keyframes граф-сетка-поток {",
            "    from { background-position: 0 0, 0 0, 0 0; }",
            "    to { background-position: 0 84px, 84px 0, 0 0; }",
            "}",
            "",
            "@media (prefers-reduced-motion: reduce) {",
            "    .граф-3d-рамка::before,",
            "    .граф-3d-рамка::after { animation: none; }",
            "}",
            "",
            ".граф-3d-рамка > .граф-3d-пусто {",
            "    position: relative;",
            "    z-index: 1;",
            "}",
            "",
            ".граф-3d-svg {",
            "    position: relative;",
            "    z-index: 1;",
            "    display: block;",
            "    width: 100%;",
            "    height: auto;",
            "    min-height: 150px;",
            "    overflow: visible;",
            "    filter: drop-shadow(0 0 12px rgba(52, 162, 221, .16));",
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
            "",
            ".кнопка-развернуть-графа-3d {",
            "    display: block;",
            "    width: 100%;",
            "    margin: 0 0 8px;",
            "    padding: 8px 10px;",
            "    border: 1px solid #35566b;",
            "    border-radius: 5px;",
            "    background: #10212e;",
            "    color: #dce7f0;",
            "    cursor: pointer;",
            "    font: inherit;",
            "    font-size: 11px;",
            "}",
            "",
            ".кнопка-развернуть-графа-3d:hover {",
            "    background: #1b3445;",
            "}",
            "",
            ".блок-графа-3d:fullscreen {",
            "    box-sizing: border-box;",
            "    display: flex;",
            "    flex-direction: column;",
            "    position: fixed;",
            "    inset: 0;",
            "    width: 100vw;",
            "    height: 100vh;",
            "    margin: 0;",
            "    padding: 16px;",
            "    border: 0;",
            "    border-radius: 0;",
            "    background: #07111a;",
            "    overflow: auto;",
            "    z-index: 2147483647;",
            "}",
            "",
            ".блок-графа-3d:fullscreen .граф-3d-рамка {",
            "    flex: 1 0 auto;",
            "    min-height: 0;",
            "    overflow: auto;",
            "}",
            "",
            ".блок-графа-3d:fullscreen .граф-3d-svg {",
            "    width: 100%;",
            "    height: auto;",
            "    min-height: 70vh;",
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

        кнопкаРазвернутьГрафа = document.createElement("button");
        кнопкаРазвернутьГрафа.type = "button";
        кнопкаРазвернутьГрафа.className = "кнопка-развернуть-графа-3d";
        кнопкаРазвернутьГрафа.textContent = "⛶ Развернуть граф";
        кнопкаРазвернутьГрафа.setAttribute("aria-label", "Развернуть граф 3D-ядра");

        кнопкаРазвернутьГрафа.addEventListener("click", async () => {
            try {
                if (document.fullscreenElement === контейнерГрафа) {
                    await document.exitFullscreen();
                } else if (
                    контейнерГрафа &&
                    typeof контейнерГрафа.requestFullscreen === "function"
                ) {
                    await контейнерГрафа.requestFullscreen();
                } else if (состояниеГрафа) {
                    состояниеГрафа.textContent =
                        "Полноэкранный режим не поддерживается этим браузером.";
                }
            } catch (ошибка) {
                if (состояниеГрафа) {
                    состояниеГрафа.textContent =
                        "Не удалось развернуть граф: " +
                        (ошибка instanceof Error ? ошибка.message : String(ошибка));
                }
            }
        });

        document.addEventListener("fullscreenchange", () => {
            if (!кнопкаРазвернутьГрафа) {
                return;
            }

            const графРазвернут =
                document.fullscreenElement === контейнерГрафа;

            кнопкаРазвернутьГрафа.textContent = графРазвернут
                ? "↙ Вернуть обычный размер"
                : "⛶ Развернуть граф";

            кнопкаРазвернутьГрафа.setAttribute(
                "aria-label",
                графРазвернут
                    ? "Вернуть обычный размер графа"
                    : "Развернуть граф 3D-ядра"
            );
        });

        const рамка = document.createElement("div");
        рамка.className = "граф-3d-рамка";
        рамка.style.position = "relative";
        рамка.style.minHeight = "160px";
        рамка.style.overflow = "hidden";

        const пустоеСостояние = document.createElement("div");
        пустоеСостояние.className = "граф-3d-пусто";
        пустоеСостояние.textContent =
            "Запусти программу, чтобы увидеть узлы и связи.";
        пустоеСостояние.style.position = "relative";
        пустоеСостояние.style.zIndex = "1";
        пустоеСостояние.style.background = "rgba(3, 9, 17, 0.35)";

        
        рамка.appendChild(создатьФоновуюСцену(720, 240));
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
        контейнерГрафа.appendChild(кнопкаРазвернутьГрафа);
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
        рамка.appendChild(создатьФоновуюСцену(720, 300));
        рамка.style.position = "relative";
        рамка.style.minHeight = "160px";
        рамка.style.overflow = "hidden";

        const пустоеСостояние = document.createElement("div");
        пустоеСостояние.className = "граф-3d-пусто";
        пустоеСостояние.textContent = сообщение;
        пустоеСостояние.style.position = "relative";
        пустоеСостояние.style.zIndex = "1";
        пустоеСостояние.style.background = "rgba(3, 9, 17, 0.35)";

        
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
        рамка.appendChild(создатьФоновуюСцену(720, 300));

        if (узлы.length === 0) {
            рамка.style.position = "relative";
            рамка.style.minHeight = "160px";
            рамка.style.overflow = "hidden";

            const пустоеСостояние =
                document.createElement("div");

            пустоеСостояние.className = "граф-3d-пусто";
            пустоеСостояние.textContent =
                "В снимке 3D-ядра пока нет узлов.";
            пустоеСостояние.style.position = "relative";
            пустоеСостояние.style.zIndex = "1";
            пустоеСостояние.style.background = "rgba(3, 9, 17, 0.35)";

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

        const отступ = 100;

        const svg = создатьЭлементSVG("svg", {
            viewBox: "0 0 " + ширина + " " + высота,
            role: "img",
            "aria-label":
                "Граф узлов и связей 3D-ядра Улитки"
        });

        svg.classList.add("граф-3d-svg");
        svg.style.position = "relative";
        svg.style.zIndex = "1";
        svg.style.background = "transparent";

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

        // Фон теперь рисуется отдельным WebGL-канвасом под узлами.

        const координаты = new Map();

        const исходныеX = узлы.map(
            узел => Number(узел.позиция?.x) || 0
        );

        const исходныеY = узлы.map(
            узел => Number(узел.позиция?.y) || 0
        );

        const исходныеZ = узлы.map(
            узел => Number(узел.позиция?.z) || 0
        );

        const минимумX = Math.min(...исходныеX);
        const максимумX = Math.max(...исходныеX);
        const минимумY = Math.min(...исходныеY);
        const максимумY = Math.max(...исходныеY);
        const минимумZ = Math.min(...исходныеZ);
        const максимумZ = Math.max(...исходныеZ);
        const диапазонZ = максимумZ - минимумZ || 1;

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

            const нормализованнаяГлубина = максимумZ !== минимумZ
                ? (исходныеZ[индекс] - минимумZ) / диапазонZ
                : (координатыОдинаковые
                    ? (узлы.length > 1 ? (индекс % 3) / 2 : 0.5)
                    : 0.5);

            const смещениеГлубины =
                максимумZ !== минимумZ || координатыОдинаковые
                    ? нормализованнаяГлубина - 0.5
                    : 0;

            x += смещениеГлубины * 24;
            y -= смещениеГлубины * 34;

            const масштаб =
                максимумZ !== минимумZ || координатыОдинаковые
                    ? 0.88 + нормализованнаяГлубина * 0.22
                    : 1;

            координаты.set(узел.идентификатор, {
                x,
                y,
                масштаб
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

            линия.setAttribute(
                "stroke-dasharray",
                связь.активна ? "7 5" : "3 8"
            );

            линия.setAttribute("stroke-linecap", "round");

            линия.appendChild(создатьЭлементSVG("animate", {
                attributeName: "stroke-dashoffset",
                values: "0; -48",
                dur: (3.5 + (количествоНарисованныхСвязей % 6) * 0.55) + "s",
                begin: "-" + ((количествоНарисованныхСвязей % 7) * 0.4) + "s",
                repeatCount: "indefinite"
            }));

            линия.appendChild(создатьЭлементSVG("animate", {
                attributeName: "stroke-opacity",
                values: "0.35; 1; 0.35",
                dur: (4 + (количествоНарисованныхСвязей % 5) * 0.7) + "s",
                repeatCount: "indefinite"
            }));
            слойСвязей.appendChild(линия);

            const частицаПотока = создатьЭлементSVG("circle", {
                r: связь.активна ? 3.5 : 2.3,
                fill: связь.активна ? "#d7fbff" : "#76d4ff",
                filter: "url(#ultra3d-glow)",
                opacity: 0.95,
                "pointer-events": "none"
            });

            частицаПотока.appendChild(
                создатьЭлементSVG("animateMotion", {
                    path:
                        "M " + начало.x + " " + начало.y +
                        " L " + конец.x + " " + конец.y,
                    dur:
                        (2.8 + (количествоНарисованныхСвязей % 6) * 0.55) + "s",
                    begin:
                        "-" + ((количествоНарисованныхСвязей % 7) * 0.47) + "s",
                    repeatCount: "indefinite"
                })
            );

            слойСвязей.appendChild(частицаПотока);

            количествоНарисованныхСвязей += 1;
        }

        svg.appendChild(слойСвязей);

        const слойУзлов = создатьЭлементSVG("g");
        слойУзлов.setAttribute("aria-label", "Узлы ядра");

        for (const [индексУзла, узел] of узлы.entries()) {
            const позиция = координаты.get(
                узел.идентификатор
            );

            const группа = создатьЭлементSVG("g", {
                transform:
                    "translate(" +
                    позиция.x +
                    " " +
                    позиция.y +
                    ") scale(" +
                    позиция.масштаб +
                    ")"
            });

            const цвет = получитьЦветУзла(узел.тип);

            группа.appendChild(
                создатьЭлементSVG("animateTransform", {
                    attributeName: "transform",
                    attributeType: "XML",
                    type: "translate",
                    values: "0 0; 2 -3; 0 -6; -2 -3; 0 0",
                    dur: (5 + (индексУзла % 7) * 0.65) + "s",
                    begin: "-" + ((индексУзла % 6) * 0.55) + "s",
                    repeatCount: "indefinite",
                    additive: "sum"
                })
            );

            const ореол = создатьЭлементSVG("ellipse", {
                cx: 0,
                cy: 0,
                rx: 101,
                ry: 43,
                fill: цвет,
                "fill-opacity": 0.08,
                stroke: цвет,
                "stroke-width": 1.5,
                "stroke-opacity": 0.34,
                filter: "url(#ultra3d-glow)",
                "pointer-events": "none"
            });

            ореол.appendChild(создатьЭлементSVG("animate", {
                attributeName: "opacity",
                values: "0.22; 0.8; 0.22",
                dur: (3.5 + (индексУзла % 5) * 0.7) + "s",
                begin: "-" + ((индексУзла % 4) * 0.6) + "s",
                repeatCount: "indefinite"
            }));

            группа.appendChild(ореол);

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
            сервер.middlewares.use(мостGit);
        },
    };
}

function создатьМостВыполнения(): Plugin {

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
            сервер.middlewares.use(мостВыполнения);
        },
    };
}

export default defineConfig(({ command }) => ({
    root: "./терминал",

    // Признак dev-режима для кода терминала (см. __УЛИТКА_DEV__
    // в терминал/исходники/главный.ts): в dev — true, в сборке — false.
    define: {
        __УЛИТКА_DEV__: JSON.stringify(command === "serve"),
    },

    // Monaco грузится модулями (не бандлом) — иначе Vite-плагин
    // локализации не увидит его файлы.
    optimizeDeps: {
        exclude: ["monaco-editor"],
    },

    plugins: [
        локализацияMonaco(),
        создатьМостGit(),
        создатьМостФайловПроекта(),
        создатьМостВыполнения(),
    ],
}));

