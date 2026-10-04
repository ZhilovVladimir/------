/**
 * ============================================================
 * 🐌 УЛИТКА
 * Конфигурация Vite и серверный мост терминала
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
                                        функцииДля3D
                                    );

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
                                            ядро
                                                .получитьУзлы()
                                                .length,
                                        связей:
                                            ядро
                                                .получитьСвязи()
                                                .length,
                                        событий:
                                            ядро
                                                .получитьСобытия()
                                                .length,
                                    },
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

