/**
 * ============================================================
 * 🐌 УЛИТКА
 * Безопасный мост дерева файлов проекта
 * ============================================================
 */

import {
    realpath,
    readdir,
    readFile,
    stat,
    writeFile,
} from "node:fs/promises";

import {
    isAbsolute,
    relative,
    resolve,
    sep,
} from "node:path";

import type {
    Plugin,
} from "vite";

const КОРЕНЬ_ПРОЕКТА = resolve(process.cwd());
const МАКСИМАЛЬНЫЙ_РАЗМЕР_ФАЙЛА = 2 * 1024 * 1024;

const СЛУЖЕБНЫЕ_КАТАЛОГИ = new Set([
    ".git",
    ".vite",
    "node_modules",
    "dist",
]);

const ТЕКСТОВЫЕ_РАСШИРЕНИЯ = new Set([
    ".ts",
    ".tsx",
    ".js",
    ".mjs",
    ".cjs",
    ".html",
    ".css",
    ".json",
    ".md",
    ".txt",
    ".ps1",
    ".bat",
    ".cmd",
    ".yml",
    ".yaml",
    ".xml",
    ".svg",
    ".gitignore",
    ".editorconfig",
    ".config",
]);

const КЛИЕНТ_ДЕРЕВА = String.raw`
(function () {
    "use strict";

    function инициализироватьДерево() {

    const корень = document.querySelector(".дерево-проекта");
    const редактор = document.getElementById("редактор-исходного-кода");

    if (!корень || !(редактор instanceof HTMLTextAreaElement)) {
        console.error("🐌 Дерево проекта: не найдены корень дерева или редактор.");
        return;
    }

    let открытыйПуть = null;
    let исходноеСодержимое = "";
    let сохраняется = false;

    const состояние = document.createElement("div");
    состояние.className = "состояние-дерева-проекта";
    состояние.setAttribute("role", "status");
    состояние.textContent = "Загрузка файлов проекта…";

    корень.replaceChildren();
    корень.appendChild(состояние);

    const стиль = document.createElement("style");
    стиль.textContent = [
        ".дерево-проекта { overflow: auto; min-height: 80px; }",
        ".элемент-дерева { box-sizing: border-box; width: 100%; padding: 5px 7px; border: 0; border-radius: 4px; background: transparent; color: #b8c9d6; text-align: left; font: inherit; font-size: 12px; cursor: pointer; overflow-wrap: anywhere; }",
        ".элемент-дерева:hover { background: #182a38; color: #ffffff; }",
        ".элемент-дерева.выбран { background: #203b4e; color: #ffffff; }",
        ".содержимое-папки { margin-left: 12px; border-left: 1px solid #243949; padding-left: 4px; }",
        ".состояние-дерева-проекта { padding: 8px; color: #8fa7b8; font-size: 11px; white-space: pre-wrap; }",
        ".имя-файла-дерева { display: block; }",
        ".элемент-дерева:focus-visible { outline: 1px solid #71b7e6; outline-offset: -1px; }"
    ].join("\n");

    document.head.appendChild(стиль);

    function показатьСостояние(текст) {
        состояние.textContent = текст;
    }

    async function запроситьJSON(адрес, настройки) {
        const ответ = await fetch(адрес, настройки);
        let данные;

        try {
            данные = await ответ.json();
        } catch {
            throw new Error("Сервер вернул ответ, который не удалось прочитать.");
        }

        if (!ответ.ok || данные.успешно === false) {
            throw new Error(данные.сообщение || "Не удалось выполнить запрос.");
        }

        return данные;
    }

    function создатьКнопку(имя, путь, тип, отступ) {
        const кнопка = document.createElement("button");
        кнопка.type = "button";
        кнопка.className = "элемент-дерева";
        кнопка.style.paddingLeft = (7 + отступ * 12) + "px";
        кнопка.dataset.путь = путь;
        кнопка.dataset.тип = тип;

        const значок = тип === "папка" ? "📁 " : "📄 ";
        кнопка.textContent = значок + имя;
        кнопка.title = путь;

        return кнопка;
    }

    async function открытьФайл(путь, кнопка) {
        try {
            показатьСостояние("Открываю файл…");

            const данные = await запроситьJSON(
                "/api/файл?путь=" + encodeURIComponent(путь)
            );

            if (typeof данные.содержимое !== "string") {
                throw new Error("Сервер не вернул текст файла.");
            }

            редактор.value = данные.содержимое;
            редактор.dispatchEvent(new Event("input", { bubbles: true }));
            открытыйПуть = путь;
            исходноеСодержимое = данные.содержимое;

            корень.querySelectorAll(".элемент-дерева.выбран")
                .forEach((элемент) => элемент.classList.remove("выбран"));

            кнопка.classList.add("выбран");
            показатьСостояние("Открыт файл: " + путь);
            редактор.focus();

            document.dispatchEvent(new CustomEvent("улитка:файл-открыт", {
                detail: { путь: путь }
            }));
        } catch (ошибка) {
            показатьСостояние(
                "Не удалось открыть файл:\n" +
                (ошибка instanceof Error ? ошибка.message : String(ошибка))
            );
        }
    }

    async function раскрытьПапку(путь, кнопка, отступ) {
        const ужеРаскрыта = кнопка.getAttribute("aria-expanded") === "true";
        const существующийБлок = кнопка.nextElementSibling;

        if (ужеРаскрыта && существующийБлок) {
            существующийБлок.remove();
            кнопка.setAttribute("aria-expanded", "false");
            кнопка.textContent = "📁 " + путь.split("/").pop();
            return;
        }

        try {
            кнопка.disabled = true;
            показатьСостояние("Читаю папку: " + путь);

            const данные = await запроситьJSON(
                "/api/файлы?путь=" + encodeURIComponent(путь)
            );

            if (!Array.isArray(данные.элементы)) {
                throw new Error("Сервер вернул некорректный список файлов.");
            }

            const блок = document.createElement("div");
            блок.className = "содержимое-папки";

            if (данные.элементы.length === 0) {
                const пусто = document.createElement("div");
                пусто.className = "состояние-дерева-проекта";
                пусто.textContent = "Папка пуста";
                блок.appendChild(пусто);
            } else {
                for (const элемент of данные.элементы) {
                    if (
                        !элемент ||
                        typeof элемент.имя !== "string" ||
                        typeof элемент.путь !== "string" ||
                        (элемент.тип !== "папка" && элемент.тип !== "файл")
                    ) {
                        continue;
                    }

                    const дочерняяКнопка = создатьКнопку(
                        элемент.имя,
                        элемент.путь,
                        элемент.тип,
                        отступ + 1
                    );

                    if (элемент.тип === "папка") {
                        дочерняяКнопка.setAttribute("aria-expanded", "false");
                        дочерняяКнопка.addEventListener("click", () => {
                            void раскрытьПапку(
                                элемент.путь,
                                дочерняяКнопка,
                                отступ + 1
                            );
                        });
                    } else {
                        дочерняяКнопка.addEventListener("click", () => {
                            void открытьФайл(элемент.путь, дочерняяКнопка);
                        });
                    }

                    блок.appendChild(дочерняяКнопка);
                }
            }

            const прежнийБлок = кнопка.nextElementSibling;
            if (прежнийБлок) {
                прежнийБлок.remove();
            }

            кнопка.after(блок);
            кнопка.setAttribute("aria-expanded", "true");
            кнопка.textContent = "📂 " + путь.split("/").pop();
            показатьСостояние("Файлов найдено: " + данные.элементы.length);
        } catch (ошибка) {
            показатьСостояние(
                "Не удалось прочитать папку:\n" +
                (ошибка instanceof Error ? ошибка.message : String(ошибка))
            );
        } finally {
            кнопка.disabled = false;
        }
    }

    async function загрузитьКорень() {
        try {
            const данные = await запроситьJSON("/api/файлы?путь=");

            if (!Array.isArray(данные.элементы)) {
                throw new Error("Сервер вернул некорректный список файлов.");
            }

            корень.replaceChildren();

            for (const элемент of данные.элементы) {
                if (
                    !элемент ||
                    typeof элемент.имя !== "string" ||
                    typeof элемент.путь !== "string" ||
                    (элемент.тип !== "папка" && элемент.тип !== "файл")
                ) {
                    continue;
                }

                const кнопка = создатьКнопку(
                    элемент.имя,
                    элемент.путь,
                    элемент.тип,
                    0
                );

                if (элемент.тип === "папка") {
                    кнопка.setAttribute("aria-expanded", "false");
                    кнопка.addEventListener("click", () => {
                        void раскрытьПапку(элемент.путь, кнопка, 0);
                    });
                } else {
                    кнопка.addEventListener("click", () => {
                        void открытьФайл(элемент.путь, кнопка);
                    });
                }

                корень.appendChild(кнопка);
            }

            if (данные.элементы.length === 0) {
                показатьСостояние("В проекте нет доступных файлов.");
            } else {
                показатьСостояние("Загружено элементов: " + данные.элементы.length);
            }
            корень.appendChild(состояние);
        } catch (ошибка) {
            корень.replaceChildren(состояние);
            показатьСостояние(
                "Не удалось загрузить дерево проекта:\n" +
                (ошибка instanceof Error ? ошибка.message : String(ошибка))
            );
        }
    }

    async function сохранитьФайл() {
        if (!открытыйПуть) {
            показатьСостояние("Сначала открой файл в дереве проекта.");
            return;
        }

        if (сохраняется) {
            return;
        }

        if (редактор.value === исходноеСодержимое) {
            показатьСостояние("Изменений нет.");
            return;
        }

        if (!window.confirm("Сохранить изменения в файле «" + открытыйПуть + "»?")) {
            return;
        }

        try {
            сохраняется = true;
            показатьСостояние("Сохраняю файл…");

            await запроситьJSON("/api/файл", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json; charset=utf-8"
                },
                body: JSON.stringify({
                    путь: открытыйПуть,
                    содержимое: редактор.value
                })
            });

            исходноеСодержимое = редактор.value;
            показатьСостояние("Файл сохранён: " + открытыйПуть);
        } catch (ошибка) {
            показатьСостояние(
                "Не удалось сохранить файл:\n" +
                (ошибка instanceof Error ? ошибка.message : String(ошибка))
            );
        } finally {
            сохраняется = false;
        }
    }

    document.addEventListener("keydown", (событие) => {
        if ((событие.ctrlKey || событие.metaKey) && событие.key.toLowerCase() === "s") {
            событие.preventDefault();
            void сохранитьФайл();
        }
    });

    window.addEventListener("focus", () => {
        if (открытыйПуть && редактор.value !== исходноеСодержимое) {
            показатьСостояние("Есть несохранённые изменения: " + открытыйПуть);
        }
    });

    void загрузитьКорень();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", () => {
            queueMicrotask(инициализироватьДерево);
        }, { once: true });
    } else {
        инициализироватьДерево();
    }
})();
`;

function путьВнутриПроекта(путь: unknown): string {
    if (typeof путь !== "string") {
        throw new Error("Не указан путь к файлу или папке.");
    }

    const очищенныйПуть = путь.trim().replace(/[\\/]+/g, sep);

    if (
        очищенныйПуть.includes("\0") ||
        isAbsolute(очищенныйПуть)
    ) {
        throw new Error("Абсолютные пути и недопустимые символы запрещены.");
    }

    const полныйПуть = resolve(КОРЕНЬ_ПРОЕКТА, очищенныйПуть);
    const относительныйПуть = relative(КОРЕНЬ_ПРОЕКТА, полныйПуть);

    if (
        относительныйПуть === ".." ||
        относительныйПуть.startsWith(".." + sep) ||
        isAbsolute(относительныйПуть)
    ) {
        throw new Error("Доступ за пределы папки проекта запрещён.");
    }

    return полныйПуть;
}

async function проверитьРеальныйПуть(полныйПуть: string): Promise<string> {
    const реальныйКорень = await realpath(КОРЕНЬ_ПРОЕКТА);
    const реальныйПуть = await realpath(полныйПуть);
    const относительныйПуть = relative(реальныйКорень, реальныйПуть);

    if (
        относительныйПуть === ".." ||
        относительныйПуть.startsWith(".." + sep) ||
        isAbsolute(относительныйПуть)
    ) {
        throw new Error("Доступ к файлам за пределами проекта запрещён.");
    }

    return реальныйПуть;
}

function разрешённыйТекстовыйФайл(имя: string): boolean {
    if (имя.endsWith(".резерв")) {
        return false;
    }

    const последняяТочка = имя.lastIndexOf(".");
    const расширение = последняяТочка >= 0
        ? имя.slice(последняяТочка).toLowerCase()
        : "";

    return ТЕКСТОВЫЕ_РАСШИРЕНИЯ.has(расширение);
}

function отправитьJSON(
    ответ: import("node:http").ServerResponse,
    код: number,
    данные: Record<string, unknown>,
): void {
    ответ.statusCode = код;
    ответ.setHeader(
        "Content-Type",
        "application/json; charset=utf-8",
    );
    ответ.setHeader("Cache-Control", "no-store");
    ответ.end(JSON.stringify(данные));
}

async function прочитатьТело(
    запрос: import("node:http").IncomingMessage,
): Promise<unknown> {
    const части: Buffer[] = [];
    let размер = 0;

    for await (const часть of запрос) {
        const буфер = Buffer.isBuffer(часть)
            ? часть
            : Buffer.from(часть);

        размер += буфер.length;

        if (размер > МАКСИМАЛЬНЫЙ_РАЗМЕР_ФАЙЛА) {
            throw new Error("Размер запроса превышает допустимые 2 МБ.");
        }

        части.push(буфер);
    }

    return JSON.parse(Buffer.concat(части).toString("utf8"));
}

export function создатьМостФайловПроекта(): Plugin {
    return {
        name: "улитка-мост-файлов-проекта",

        transformIndexHtml: {
            order: "pre",

            handler(html) {
                return {
                    html,
                    tags: [
                        {
                            tag: "script",
                            children: КЛИЕНТ_ДЕРЕВА,
                            injectTo: "body",
                        },
                    ],
                };
            },
        },

        configureServer(сервер) {
            сервер.middlewares.use((запрос, ответ, следующий) => {
                let адрес: URL;

                try {
                    адрес = new URL(
                        запрос.url ?? "/",
                        "http://localhost",
                    );
                } catch {
                    следующий();
                    return;
                }

                const путьЗапроса = decodeURIComponent(адрес.pathname);

                if (
                    путьЗапроса !== "/api/файлы" &&
                    путьЗапроса !== "/api/файл"
                ) {
                    следующий();
                    return;
                }

                void (async () => {
                    try {
                        if (
                            путьЗапроса === "/api/файлы" &&
                            запрос.method === "GET"
                        ) {
                            const путь = путьВнутриПроекта(
                                адрес.searchParams.get("путь") ?? "",
                            );

                            const проверенныйПуть =
                                путь === КОРЕНЬ_ПРОЕКТА
                                    ? await realpath(КОРЕНЬ_ПРОЕКТА)
                                    : await проверитьРеальныйПуть(путь);

                            const сведения = await stat(проверенныйПуть);

                            if (!сведения.isDirectory()) {
                                отправитьJSON(ответ, 400, {
                                    успешно: false,
                                    сообщение: "Указанный путь не является папкой.",
                                });
                                return;
                            }

                            const записи = await readdir(
                                проверенныйПуть,
                                { withFileTypes: true },
                            );

                            const элементы: {
                                имя: string;
                                путь: string;
                                тип: "папка" | "файл";
                            }[] = [];

                            for (const запись of записи) {
                                if (
                                    запись.name.startsWith(".") &&
                                    запись.name !== ".gitignore" &&
                                    запись.name !== ".editorconfig"
                                ) {
                                    if (!запись.isDirectory()) {
                                        if (!разрешённыйТекстовыйФайл(запись.name)) {
                                            continue;
                                        }
                                    } else {
                                        continue;
                                    }
                                }

                                if (
                                    запись.isDirectory() &&
                                    (
                                        СЛУЖЕБНЫЕ_КАТАЛОГИ.has(запись.name) ||
                                        запись.name.endsWith(".резерв")
                                    )
                                ) {
                                    continue;
                                }

                                if (!запись.isDirectory() && !запись.isFile()) {
                                    continue;
                                }

                                if (
                                    запись.isFile() &&
                                    !разрешённыйТекстовыйФайл(запись.name)
                                ) {
                                    continue;
                                }

                                const полныйПутьЭлемента = resolve(
                                    проверенныйПуть,
                                    запись.name,
                                );

                                const путьОтКорня = relative(
                                    КОРЕНЬ_ПРОЕКТА,
                                    полныйПутьЭлемента,
                                ).split(sep).join("/");

                                элементы.push({
                                    имя: запись.name,
                                    путь: путьОтКорня,
                                    тип: запись.isDirectory()
                                        ? "папка"
                                        : "файл",
                                });
                            }

                            элементы.sort((первый, второй) => {
                                if (первый.тип !== второй.тип) {
                                    return первый.тип === "папка" ? -1 : 1;
                                }

                                return первый.имя.localeCompare(
                                    второй.имя,
                                    "ru",
                                );
                            });

                            отправитьJSON(ответ, 200, {
                                успешно: true,
                                элементы,
                            });
                            return;
                        }

                        if (
                            путьЗапроса === "/api/файл" &&
                            запрос.method === "GET"
                        ) {
                            const путь = путьВнутриПроекта(
                                адрес.searchParams.get("путь"),
                            );

                            const проверенныйПуть =
                                await проверитьРеальныйПуть(путь);

                            const сведения = await stat(проверенныйПуть);

                            if (
                                !сведения.isFile() ||
                                сведения.size > МАКСИМАЛЬНЫЙ_РАЗМЕР_ФАЙЛА ||
                                !разрешённыйТекстовыйФайл(проверенныйПуть.split(sep).pop() ?? "")
                            ) {
                                отправитьJSON(ответ, 400, {
                                    успешно: false,
                                    сообщение: "Этот файл нельзя открыть в текстовом редакторе.",
                                });
                                return;
                            }

                            const содержимое = await readFile(
                                проверенныйПуть,
                                "utf8",
                            );

                            отправитьJSON(ответ, 200, {
                                успешно: true,
                                путь: relative(
                                    КОРЕНЬ_ПРОЕКТА,
                                    проверенныйПуть,
                                ).split(sep).join("/"),
                                содержимое,
                            });
                            return;
                        }

                        if (
                            путьЗапроса === "/api/файл" &&
                            запрос.method === "POST"
                        ) {
                            const тело = await прочитатьТело(запрос);

                            if (
                                typeof тело !== "object" ||
                                тело === null ||
                                !("путь" in тело) ||
                                !("содержимое" in тело) ||
                                typeof тело.содержимое !== "string"
                            ) {
                                отправитьJSON(ответ, 400, {
                                    успешно: false,
                                    сообщение: "Запрос сохранения имеет неверный формат.",
                                });
                                return;
                            }

                            const путь = путьВнутриПроекта(тело.путь);
                            const проверенныйПуть =
                                await проверитьРеальныйПуть(путь);

                            const сведения = await stat(проверенныйПуть);

                            if (
                                !сведения.isFile() ||
                                !разрешённыйТекстовыйФайл(проверенныйПуть.split(sep).pop() ?? "")
                            ) {
                                отправитьJSON(ответ, 400, {
                                    успешно: false,
                                    сообщение: "Сохранять разрешено только существующие текстовые файлы проекта.",
                                });
                                return;
                            }

                            if (
                                Buffer.byteLength(тело.содержимое, "utf8") >
                                МАКСИМАЛЬНЫЙ_РАЗМЕР_ФАЙЛА
                            ) {
                                отправитьJSON(ответ, 413, {
                                    успешно: false,
                                    сообщение: "Файл слишком большой для сохранения через редактор.",
                                });
                                return;
                            }

                            await writeFile(
                                проверенныйПуть,
                                тело.содержимое,
                                "utf8",
                            );

                            отправитьJSON(ответ, 200, {
                                успешно: true,
                                сообщение: "Файл сохранён.",
                            });
                            return;
                        }

                        ответ.setHeader("Allow", "GET, POST");
                        отправитьJSON(ответ, 405, {
                            успешно: false,
                            сообщение: "Для этого адреса разрешены только GET и POST.",
                        });
                    } catch (ошибка) {
                        const сообщение = ошибка instanceof Error
                            ? ошибка.message
                            : String(ошибка);

                        const код = /ENOENT|ENOTDIR/.test(сообщение)
                            ? 404
                            : 400;

                        отправитьJSON(ответ, код, {
                            успешно: false,
                            сообщение: "Ошибка работы с файлами проекта: " + сообщение,
                        });
                    }
                })();
            });
        },
    };
}