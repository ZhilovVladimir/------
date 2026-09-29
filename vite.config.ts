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

function создатьМостGit(): Plugin {
    return {
        name: "улитка-мост-git",

        configureServer(сервер) {
            сервер.middlewares.use(
                "/api/git",
                async (запрос, ответ) => {
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

export default defineConfig({
    root: "./терминал",

    plugins: [
        создатьМостGit(),
    ],
});
