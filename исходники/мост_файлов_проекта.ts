/**
 * ============================================================
 * 🐌 УЛИТКА
 * Безопасный мост дерева файлов проекта
 * ============================================================
 */

import {
    mkdir,
    realpath,
    readdir,
    readFile,
    cp,
    lstat,
    stat,
    writeFile,
} from "node:fs/promises";

import {
    basename,
    isAbsolute,
    join,
    relative,
    resolve,
    sep,
} from "node:path";

import type {
    IncomingMessage,
    ServerResponse,
} from "node:http";

import type {
    Plugin,
} from "vite";

let КОРЕНЬ_ПРОЕКТА = resolve(process.cwd());

const МАКСИМАЛЬНЫЙ_РАЗМЕР_ФАЙЛА = 2 * 1024 * 1024;

const СЛУЖЕБНЫЕ_КАТАЛОГИ = new Set([
    ".git",
    ".vite",
    "node_modules",
    "dist",
]);

const ТЕКСТОВЫЕ_РАСШИРЕНИЯ = new Set([
    ".ул",
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

    // День 2: редактором управляет Monaco. Дереву нужен привычный
    // интерфейс (.value / .focus() / "input"), поэтому даём ему адаптер.
    function получитьРедактор() {
        const монако =
            typeof window.УЛИТКА_Редактор === "function"
                ? window.УЛИТКА_Редактор()
                : null;

        if (монако && typeof монако.getValue === "function") {
            return {
                get value() {
                    return монако.getValue();
                },
                set value(текст) {
                    монако.setValue(текст);
                },
                focus() {
                    монако.focus();
                },
                addEventListener(тип, обработчик) {
                    if (тип === "input") {
                        монако.onDidChangeModelContent(() =>
                            обработчик({ type: "input" })
                        );
                    }
                },
            };
        }

        // Запасной путь: старый textarea (если Monaco ещё не создан).
        const редактор = document.getElementById("редактор-исходного-кода");

        return редактор instanceof HTMLTextAreaElement
            ? редактор
            : null;
    }

    function инициализироватьДерево() {
        const корень = document.querySelector(".дерево-проекта");
        const редактор = получитьРедактор();

        if (!корень || !редактор) {
            console.error("🐌 Дерево проекта: не найдены корень дерева или редактор.");
            return;
        }

        let открытыйПуть = null;
        let исходноеСодержимое = "";
        let сохраняется = false;
        let таймерАвтосохранения = null;
        let повторитьСохранение = false;
        let путьРабочейПапки = "";

        // Внутренний буфер копирования элементов дерева.
        let путиДляКопирования = [];

        // Множественное выделение элементов дерева.
        const выбранныеПути = new Set();
        let последнийВыбранныйПуть = null;

        const состояние = document.createElement("div");
        состояние.className = "состояние-дерева-проекта";
        состояние.setAttribute("role", "status");
        состояние.textContent = "Загрузка файлов проекта…";

        корень.replaceChildren(состояние);

        const стиль = document.createElement("style");
        стиль.textContent = [
            ".дерево-проекта { overflow: auto; min-height: 80px; }",
            ".элемент-дерева { box-sizing: border-box; width: 100%; padding: 5px 7px; border: 0; border-radius: 4px; background: transparent; color: #b8c9d6; text-align: left; font: inherit; font-size: 12px; cursor: pointer; overflow-wrap: anywhere; }",
            ".значок-файла { display: inline-flex; flex: 0 0 18px; width: 18px; height: 18px; margin-right: 5px; vertical-align: -5px; filter: drop-shadow(0 1px 1px #0008); }",
            ".значок-файла svg { display: block; width: 18px; height: 18px; overflow: visible; }",
            ".название-элемента-дерева { vertical-align: middle; }",
            ".элемент-дерева:hover { background: #182a38; color: #fff; }",
            ".элемент-дерева.выбран { background: #203b4e; color: #fff; }",
            ".элемент-дерева.выделен { background: #31536b; color: #fff; outline: 1px solid #527b96; }",
            ".содержимое-папки { margin-left: 12px; border-left: 1px solid #243949; padding-left: 4px; }",
            ".состояние-дерева-проекта { padding: 8px; color: #8fa7b8; font-size: 11px; white-space: pre-wrap; overflow-wrap: anywhere; }",
            ".панель-дерева { display: flex; flex-wrap: wrap; gap: 5px; padding: 6px; border-bottom: 1px solid #243949; }",
            ".кнопка-панели-дерева { padding: 5px 8px; border: 1px solid #36566b; border-radius: 4px; background: #172936; color: #c8dbe8; cursor: pointer; font: inherit; font-size: 11px; }",
            ".кнопка-панели-дерева:hover { background: #25465a; color: #fff; }",
            ".кнопка-панели-дерева:disabled { opacity: .55; cursor: wait; }",
            ".элемент-дерева:focus-visible { outline: 1px solid #71b7e6; outline-offset: -1px; }",
            ".меню-дерева { position: fixed; z-index: 99999; min-width: 210px; max-width: calc(100vw - 16px); padding: 5px; border: 1px solid #36566b; border-radius: 6px; background: #14232f; box-shadow: 0 8px 24px #0008; }",
            ".пункт-меню-дерева { display: block; width: 100%; padding: 8px 10px; border: 0; border-radius: 4px; background: transparent; color: #d7e6ef; text-align: left; font: inherit; font-size: 12px; cursor: pointer; }",
            ".пункт-меню-дерева:hover { background: #25465a; color: #fff; }",
            ".уведомления-улитки { position: fixed; top: 18px; right: 18px; z-index: 2147483647; display: flex; flex-direction: column; gap: 9px; width: min(360px, calc(100vw - 36px)); pointer-events: none; }",
            ".уведомление-улитки { box-sizing: border-box; padding: 12px 15px; border: 1px solid; border-radius: 9px; background: #14232f; color: #eaf5fc; box-shadow: 0 8px 28px #0009; font: 13px/1.45 system-ui, sans-serif; overflow-wrap: anywhere; opacity: 0; transform: translateX(16px); transition: opacity .22s ease, transform .22s ease; }",
            ".уведомление-улитки.показано { opacity: 1; transform: translateX(0); }",
            ".уведомление-улитки.исчезает { opacity: 0; transform: translateX(12px); }",
            ".уведомление-успех { border-color: #398d69; background: #15352b; color: #a9f0cd; }",
            ".уведомление-информация { border-color: #367da5; background: #142e40; color: #b7e4ff; }",
            ".уведомление-ошибка { border-color: #a94855; background: #3b2027; color: #ffc0c6; }",
            ".пункт-меню-дерева.опасное { color: #ff9b9b; }"
        ].join("\n");

        document.head.appendChild(стиль);

        const контейнерУведомлений = document.createElement("div");
        контейнерУведомлений.className = "уведомления-улитки";
        контейнерУведомлений.setAttribute("aria-live", "polite");
        контейнерУведомлений.setAttribute("aria-relevant", "additions text");
        document.body.appendChild(контейнерУведомлений);

        function показатьУведомление(текст, тип = "информация", длительность = 2800) {
            const уведомление = document.createElement("div");
            уведомление.className = "уведомление-улитки уведомление-" + тип;
            уведомление.setAttribute("role", тип === "ошибка" ? "alert" : "status");
            уведомление.textContent = текст;
            контейнерУведомлений.appendChild(уведомление);

            requestAnimationFrame(() => {
                уведомление.classList.add("показано");
            });

            window.setTimeout(() => {
                уведомление.classList.remove("показано");
                уведомление.classList.add("исчезает");
                window.setTimeout(() => уведомление.remove(), 250);
            }, длительность);
        }

        function показатьОшибку(заголовок, ошибка) {
            const подробности = ошибка instanceof Error
                ? ошибка.message
                : String(ошибка);

            показатьУведомление(
                заголовок + "\n" + подробности,
                "ошибка",
                6500
            );

            состояние.textContent = заголовок + "\n" + подробности;
        }

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

        let открытоеКонтекстноеМеню = null;

        function закрытьКонтекстноеМеню() {
            if (открытоеКонтекстноеМеню) {
                открытоеКонтекстноеМеню.remove();
                открытоеКонтекстноеМеню = null;
            }
        }

        function очиститьВыделение() {
            выбранныеПути.clear();

            корень.querySelectorAll(".элемент-дерева.выделен")
                .forEach((элемент) => элемент.classList.remove("выделен"));
        }

        function выделитьПуть(путь) {
            const кнопка = Array.from(
                корень.querySelectorAll(".элемент-дерева")
            ).find((элемент) => элемент.dataset.путь === путь);

            if (кнопка) {
                выбранныеПути.add(путь);
                кнопка.classList.add("выделен");
            }
        }

        function получитьПутиДляКопирования(путьКонтекстногоЭлемента) {
            if (
                выбранныеПути.has(путьКонтекстногоЭлемента) &&
                выбранныеПути.size > 0
            ) {
                return Array.from(выбранныеПути);
            }

            очиститьВыделение();
            выделитьПуть(путьКонтекстногоЭлемента);
            последнийВыбранныйПуть = путьКонтекстногоЭлемента;

            return [путьКонтекстногоЭлемента];
        }

        // Копирование абсолютных путей в системный буфер Windows.
        async function скопироватьПутиВWindows(пути) {
            if (!Array.isArray(пути) || пути.length === 0) {
                показатьСостояние("Нет выбранных файлов и папок.");
                return;
            }

            if (!путьРабочейПапки) {
                показатьСостояние(
                    "Не удалось определить путь рабочей папки."
                );
                return;
            }

            const абсолютныеПути = пути.map((путь) => {
                const части = String(путь)
                    .replace(/\\/g, "/")
                    .split("/")
                    .filter(Boolean);

                const кореньПути = путьРабочейПапки.replace(/[\\/]+$/, "");

                return кореньПути + "\\" + части.join("\\");
            });

            const текст = абсолютныеПути.join("\r\n");

            try {
                if (
                    navigator.clipboard &&
                    typeof navigator.clipboard.writeText === "function"
                ) {
                    await navigator.clipboard.writeText(текст);
                } else {
                    const поле = document.createElement("textarea");

                    поле.value = текст;
                    поле.setAttribute("readonly", "");
                    поле.style.position = "fixed";
                    поле.style.left = "-10000px";
                    поле.style.top = "0";
                    поле.style.opacity = "0";

                    document.body.appendChild(поле);
                    поле.focus();
                    поле.select();

                    const успешно = document.execCommand("copy");
                    поле.remove();

                    if (!успешно) {
                        throw new Error(
                            "Windows не разрешила запись в буфер обмена."
                        );
                    }
                }

                показатьСостояние(
                    "Пути скопированы в буфер Windows: " +
                    абсолютныеПути.length +
                    ".\nМожно вставить их через Ctrl+V в Блокнот или чат."
                );
            } catch (ошибка) { показатьОшибку("Не удалось скопировать пути в Windows:", ошибка); }
        }

        function получитьПапкуНазначения(путь, тип) {
            const нормализованныйПуть = (путь || "").replace(/\\/g, "/");

            if (тип === "папка") {
                return нормализованныйПуть;
            }

            const позицияРазделителя = нормализованныйПуть.lastIndexOf("/");

            return позицияРазделителя >= 0
                ? нормализованныйПуть.slice(0, позицияРазделителя)
                : "";
        }

        async function удалитьЭлементДерева(путь, тип) {
            const имя = путьИмени(путь);
            const открытыйНормализованныйПуть = (открытыйПуть || "")
                .replace(/\\/g, "/");
            const целевойПуть = путь.replace(/\\/g, "/");
            const открытУдаляемыйФайл = открытыйНормализованныйПуть === целевойПуть;
            const открытФайлВУдаляемойПапке =
                тип === "папка" &&
                открытыйНормализованныйПуть.startsWith(целевойПуть + "/");

            if (
                (открытУдаляемыйФайл || открытФайлВУдаляемойПапке) &&
                редактор.value !== исходноеСодержимое
            ) {
                показатьСостояние(
                    "Удаление отменено: сначала сохраните изменения или восстановите исходный текст."
                );
                return;
            }

            const предупреждение = тип === "папка"
                ? "Переместить папку «" + имя +
                  "» и всё её содержимое в корзину Windows?"
                : "Переместить файл «" + имя + "» в корзину Windows?";

            if (!window.confirm(предупреждение)) {
                показатьСостояние("Удаление отменено.");
                return;
            }

            try {
                показатьСостояние("Проверяю безопасность удаления: " + путь);

                const проверка = await запроситьJSON(
                    "/api/проверить-удаление",
                    {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ путь: путь })
                    }
                );

                if (
                    !проверка.успешно ||
                    typeof проверка.путь !== "string" ||
                    !window.улитка ||
                    typeof window.улитка.переместитьВКорзину !== "function"
                ) {
                    throw new Error(
                        "Удаление доступно только в приложении «Улитка» с проверенным мостом Electron."
                    );
                }

                const результат = await window.улитка.переместитьВКорзину(
                    проверка.путь
                );

                if (!результат || результат.успешно !== true) {
                    throw new Error("Electron не подтвердил перемещение в корзину.");
                }

                if (открытУдаляемыйФайл || открытФайлВУдаляемойПапке) {
                    if (таймерАвтосохранения !== null) {
                        clearTimeout(таймерАвтосохранения);
                        таймерАвтосохранения = null;
                    }

                    открытыйПуть = null;
                    исходноеСодержимое = "";
                    редактор.value = "";

                    document.dispatchEvent(new CustomEvent("улитка:файл-открыт", {
                        detail: { путь: null }
                    }));
                }

                выбранныеПути.delete(путь);
                путиДляКопирования = путиДляКопирования.filter(
                    (путьБуфера) => путьБуфера !== путь
                );

                await загрузитьКорень();
                показатьСостояние(
                    "Элемент перемещён в корзину Windows: " + путь
                );
            } catch (ошибка) { показатьОшибку("Не удалось переместить элемент в корзину:", ошибка); }
        }

        async function вставитьСкопированныеЭлементы(путь, тип) {
            if (путиДляКопирования.length === 0) {
                показатьСостояние(
                    "Сначала выберите элементы и нажмите «Копировать»."
                );
                return;
            }

            const назначение = получитьПапкуНазначения(путь, тип);

            const источники = [...путиДляКопирования];
            const успешноСкопированные = [];
            const ошибкиКопирования = [];

            for (const источник of источники) {
                try {
                    показатьСостояние(
                        "Копирую " +
                        путьИмени(источник) +
                        " (" +
                        (успешноСкопированные.length + ошибкиКопирования.length + 1) +
                        " из " +
                        источники.length +
                        ")…"
                    );

                    const результат = await запроситьJSON(
                        "/api/копировать",
                        {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json"
                            },
                            body: JSON.stringify({
                                источник: источник,
                                назначение: назначение
                            })
                        }
                    );

                    if (!результат.успешно) {
                        throw new Error(
                            результат.сообщение ||
                            "Не удалось скопировать элемент."
                        );
                    }

                    успешноСкопированные.push(источник);
                } catch (ошибка) {
                    ошибкиКопирования.push({
                        путь: источник,
                        сообщение: ошибка instanceof Error
                            ? ошибка.message
                            : String(ошибка)
                    });
                }
            }

            // Удаляем из внутреннего буфера только успешно скопированные элементы.
            путиДляКопирования = путиДляКопирования.filter(
                (источник) => !успешноСкопированные.includes(источник)
            );

            await загрузитьКорень();

            if (ошибкиКопирования.length === 0) {
                показатьУведомление(
                    "Копирование завершено. Элементов: " +
                    успешноСкопированные.length,
                    "успех"
                );
                return;
            }

            const подробности = ошибкиКопирования
                .map((ошибка) => путьИмени(ошибка.путь) + ": " + ошибка.сообщение)
                .join("\n");

            показатьСостояние(
                "Скопировано: " +
                успешноСкопированные.length +
                " из " +
                источники.length +
                ".\nНе удалось скопировать: " +
                ошибкиКопирования.length +
                ". Эти элементы остались в буфере для повторной попытки.\n" +
                подробности
            );
        }

        function открытьКонтекстноеМеню(событие, кнопка) {
            событие.preventDefault();
            закрытьКонтекстноеМеню();

            const меню = document.createElement("div");
            меню.className = "меню-дерева";
            меню.setAttribute("role", "menu");

            function добавитьПункт(надпись, класс, действие) {
                const пункт = document.createElement("button");
                пункт.type = "button";
                пункт.className = "пункт-меню-дерева" + (класс ? " " + класс : "");
                пункт.textContent = надпись;
                пункт.setAttribute("role", "menuitem");
                пункт.addEventListener("click", действие);
                меню.appendChild(пункт);
                return пункт;
            }

            const путьЭлемента = кнопка.dataset.путь;
            const типЭлемента = кнопка.dataset.тип;

            if (
                путьЭлемента &&
                !выбранныеПути.has(путьЭлемента)
            ) {
                очиститьВыделение();
                выделитьПуть(путьЭлемента);
                последнийВыбранныйПуть = путьЭлемента;
            }

            if (
                путьЭлемента &&
                (типЭлемента === "файл" || типЭлемента === "папка")
            ) {
                const папкаНазначения = получитьПапкуНазначения(
                    путьЭлемента,
                    типЭлемента
                );

                добавитьПункт("Создать файл здесь", "", () => {
                    закрытьКонтекстноеМеню();
                    void создатьЭлемент("файл", папкаНазначения);
                });

                добавитьПункт("Создать папку здесь", "", () => {
                    закрытьКонтекстноеМеню();
                    void создатьЭлемент("папка", папкаНазначения);
                });
            }

            const количествоВыделенных = выбранныеПути.size;
            const надписьКопирования = количествоВыделенных > 1
                ? "Копировать выбранные (" + количествоВыделенных + ")"
                : "Копировать";

            добавитьПункт(надписьКопирования, "", () => {
                const путь = кнопка.dataset.путь;

                if (!путь) {
                    закрытьКонтекстноеМеню();
                    показатьСостояние("Не удалось определить путь элемента.");
                    return;
                }

                путиДляКопирования = получитьПутиДляКопирования(путь);

                const количество = путиДляКопирования.length;
                закрытьКонтекстноеМеню();

                показатьСостояние(
                    "В буфере Улитки элементов: " +
                    количество +
                    ". Выберите папку и нажмите «Вставить сюда»."
                );
            });

            // Новый пункт: копирование абсолютных путей в буфер Windows.
            const количествоПутей = выбранныеПути.size;
            const надписьПутей = количествоПутей > 1
                ? "Копировать пути в Windows (" + количествоПутей + ")"
                : "Копировать путь в Windows";

            добавитьПункт(надписьПутей, "", () => {
                const путь = кнопка.dataset.путь;

                if (!путь) {
                    закрытьКонтекстноеМеню();
                    показатьСостояние("Не удалось определить путь элемента.");
                    return;
                }

                const пути = получитьПутиДляКопирования(путь);

                закрытьКонтекстноеМеню();
                void скопироватьПутиВWindows(пути);
            });

            const надписьВставки = путиДляКопирования.length > 1
                ? "Вставить сюда (" + путиДляКопирования.length + ")"
                : "Вставить сюда";

            добавитьПункт(надписьВставки, "", () => {
                const путь = кнопка.dataset.путь;
                const тип = кнопка.dataset.тип;

                закрытьКонтекстноеМеню();

                if (путь && (тип === "файл" || тип === "папка")) {
                    void вставитьСкопированныеЭлементы(путь, тип);
                }
            });

            добавитьПункт("Переместить в корзину", "опасное", () => {
                const путь = кнопка.dataset.путь;
                const тип = кнопка.dataset.тип;

                закрытьКонтекстноеМеню();

                if (путь && (тип === "файл" || тип === "папка")) {
                    void удалитьЭлементДерева(путь, тип);
                }
            });

            document.body.appendChild(меню);

            const ширина = меню.offsetWidth;
            const высота = меню.offsetHeight;

            меню.style.left = Math.max(
                4,
                Math.min(событие.clientX, window.innerWidth - ширина - 4)
            ) + "px";

            меню.style.top = Math.max(
                4,
                Math.min(событие.clientY, window.innerHeight - высота - 4)
            ) + "px";

            открытоеКонтекстноеМеню = меню;
        }

        document.addEventListener("click", (событие) => {
            if (
                открытоеКонтекстноеМеню &&
                !открытоеКонтекстноеМеню.contains(событие.target)
            ) {
                закрытьКонтекстноеМеню();
            }
        });

        document.addEventListener("keydown", (событие) => {
            if (событие.key === "Escape") {
                закрытьКонтекстноеМеню();
            }
        });

        function получитьSVGЗначкаФайла(имя) {
            const название = имя.toLocaleLowerCase("ru-RU");
            const точка = название.lastIndexOf(".");
            const расширение = точка >= 0 ? название.slice(точка) : "";

            let цвет = "#8b9aaa";
            let символ = "TXT";
            let ключ = "текст";

            if (название.endsWith(".ул")) {
                цвет = "#27c6b2";
                символ = "🐌";
                ключ = "улитка";
            } else if (/тест|test|spec/.test(название)) {
                цвет = "#a783ef";
                символ = "✓";
                ключ = "тест";
            } else if (/ошибк|error|\\.log$/.test(название)) {
                цвет = "#ef777d";
                символ = "!";
                ключ = "ошибка";
            } else if (/результат|отч[её]т|report/.test(название)) {
                цвет = "#42c9a0";
                символ = "▥";
                ключ = "отчёт";
            } else {
                const языки = {
                    ".ts": ["#318bd4", "TS", "typescript"],
                    ".tsx": ["#318bd4", "TS", "typescript"],
                    ".js": ["#e4b83f", "JS", "javascript"],
                    ".mjs": ["#e4b83f", "JS", "javascript"],
                    ".cjs": ["#e4b83f", "JS", "javascript"],
                    ".py": ["#4b9bd5", "Py", "python"],
                    ".c": ["#6495df", "C", "c"],
                    ".h": ["#6495df", "H", "c"],
                    ".cpp": ["#6089df", "C+", "cpp"],
                    ".hpp": ["#6089df", "C+", "cpp"],
                    ".cs": ["#9c78d4", "C#", "csharp"],
                    ".java": ["#dc8854", "J", "java"],
                    ".go": ["#45b9cf", "Go", "go"],
                    ".rs": ["#d88a58", "Rs", "rust"],
                    ".php": ["#8a91db", "PHP", "php"],
                    ".rb": ["#dc777b", "Rb", "ruby"],
                    ".html": ["#e98b54", "</>", "html"],
                    ".htm": ["#e98b54", "</>", "html"],
                    ".css": ["#58a8e9", "CSS", "css"],
                    ".scss": ["#cc83b8", "SC", "scss"],
                    ".json": ["#76bb7b", "{}", "json"],
                    ".yaml": ["#59bdb0", "Y", "yaml"],
                    ".yml": ["#59bdb0", "Y", "yaml"],
                    ".xml": ["#d7a65a", "XML", "xml"],
                    ".md": ["#a58de0", "MD", "markdown"],
                    ".txt": ["#8b9aaa", "TXT", "текст"],
                    ".ps1": ["#5799df", ">_", "powershell"],
                    ".bat": ["#5799df", ">", "команда"],
                    ".cmd": ["#5799df", ">", "команда"],
                    ".pdf": ["#e87575", "PDF", "pdf"],
                    ".svg": ["#e2b55b", "SVG", "svg"],
                    ".png": ["#67b9a2", "IMG", "изображение"],
                    ".jpg": ["#67b9a2", "IMG", "изображение"],
                    ".jpeg": ["#67b9a2", "IMG", "изображение"],
                    ".gif": ["#67b9a2", "IMG", "изображение"],
                    ".lock": ["#d5ad58", "L", "замок"],
                    ".toml": ["#70a5c9", "T", "настройки"],
                    ".env": ["#d5ad58", "ENV", "настройки"],
                    ".gitignore": ["#e58c61", "G", "git"],
                    ".editorconfig": ["#8b9aaa", "E", "настройки"]
                };

                const данные = языки[расширение];

                if (данные) {
                    цвет = данные[0];
                    символ = данные[1];
                    ключ = данные[2];
                } else if (название === "package.json") {
                    цвет = "#76bb7b";
                    символ = "{}";
                    ключ = "json";
                }
            }

            const безопасныйСимвол = символ
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;");

            return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" role="img">' +
                '<defs><linearGradient id="верх-' + ключ + '" x1="0" y1="0" x2="1" y2="1">' +
                '<stop offset="0%" stop-color="#ffffff" stop-opacity=".42"/>' +
                '<stop offset="100%" stop-color="' + цвет + '"/></linearGradient></defs>' +
                '<path d="M6 2.5h8l5 5V21H6a2 2 0 0 1-2-2V4.5a2 2 0 0 1 2-2Z" fill="#000" opacity=".3" transform="translate(1 1)"/>' +
                '<path d="M6 2.5h8l5 5V19a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4.5a2 2 0 0 1 2-2Z" fill="' + цвет + '" stroke="#ffffff" stroke-opacity=".45" stroke-width=".7"/>' +
                '<path d="M14 2.5v5h5" fill="none" stroke="#ffffff" stroke-opacity=".75" stroke-width="1.2"/>' +
                '<path d="M6 4h7" stroke="#ffffff" stroke-opacity=".35" stroke-width=".7"/>' +
                '<rect x="5.5" y="10" width="13" height="8" rx="1.5" fill="#07121c" fill-opacity=".28"/>' +
                '<text x="12" y="15.7" font-family="Arial,sans-serif" font-size="' +
                (символ.length > 3 ? "4.5" : символ.length > 2 ? "6" : "8") +
                '" font-weight="bold" text-anchor="middle" fill="#ffffff">' +
                безопасныйСимвол + '</text>' +
                '<path d="M6 3.5h6" stroke="#ffffff" stroke-opacity=".5" stroke-width=".6" stroke-linecap="round"/>' +
                '</svg>';
        }

        function создатьКнопку(имя, путь, тип, отступ) {
            const кнопка = document.createElement("button");
            кнопка.type = "button";
            кнопка.className = "элемент-дерева";
            кнопка.style.paddingLeft = (7 + отступ * 12) + "px";
            кнопка.dataset.путь = путь;
            кнопка.dataset.тип = тип;
            if (тип === "папка") {
                кнопка.textContent = "📁 " + имя;
            } else {
                const значок = document.createElement("span");
                значок.className = "значок-файла";
                значок.setAttribute("aria-hidden", "true");
                значок.innerHTML = получитьSVGЗначкаФайла(имя);

                const название = document.createElement("span");
                название.className = "название-элемента-дерева";
                название.textContent = имя;

                кнопка.append(значок, название);
            }
            кнопка.title = путь;

            кнопка.addEventListener("contextmenu", (событие) => {
                открытьКонтекстноеМеню(событие, кнопка);
            });

            // Обычный щелчок открывает файл или раскрывает папку.
            // Ctrl/Cmd переключает выделение элемента.
            // Shift выделяет диапазон видимых элементов дерева.
            кнопка.addEventListener("click", (событие) => {
                const множественныйВыбор =
                    событие.ctrlKey ||
                    событие.metaKey ||
                    событие.shiftKey;

                if (!множественныйВыбор) {
                    очиститьВыделение();
                    последнийВыбранныйПуть = путь;
                    return;
                }

                событие.preventDefault();
                событие.stopImmediatePropagation();

                const кнопки = Array.from(
                    корень.querySelectorAll(".элемент-дерева")
                );

                if (событие.shiftKey && последнийВыбранныйПуть) {
                    const первыйИндекс = кнопки.findIndex(
                        (элемент) =>
                            элемент.dataset.путь === последнийВыбранныйПуть
                    );

                    const последнийИндекс = кнопки.findIndex(
                        (элемент) => элемент.dataset.путь === путь
                    );

                    if (первыйИндекс >= 0 && последнийИндекс >= 0) {
                        if (!событие.ctrlKey && !событие.metaKey) {
                            очиститьВыделение();
                        }

                        const начало = Math.min(
                            первыйИндекс,
                            последнийИндекс
                        );

                        const конец = Math.max(
                            первыйИндекс,
                            последнийИндекс
                        );

                        for (let индекс = начало; индекс <= конец; индекс++) {
                            const элемент = кнопки[индекс];
                            const путьЭлемента = элемент.dataset.путь;

                            if (путьЭлемента) {
                                выбранныеПути.add(путьЭлемента);
                                элемент.classList.add("выделен");
                            }
                        }
                    }
                } else {
                    if (выбранныеПути.has(путь)) {
                        выбранныеПути.delete(путь);
                        кнопка.classList.remove("выделен");
                    } else {
                        выбранныеПути.add(путь);
                        кнопка.classList.add("выделен");
                    }
                }

                последнийВыбранныйПуть = путь;

                показатьСостояние(
                    "Выбрано элементов: " + выбранныеПути.size
                );
            });

            return кнопка;
        }

        function путьИмени(путь) {
            const части = путь.replace(/\\/g, "/").split("/");
            return части[части.length - 1] || путь;
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

                if (таймерАвтосохранения !== null) {
                    clearTimeout(таймерАвтосохранения);
                    таймерАвтосохранения = null;
                }

                редактор.value = данные.содержимое;
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
            } catch (ошибка) { показатьОшибку("Не удалось открыть файл:", ошибка); }
        }

        async function раскрытьПапку(путь, кнопка, отступ) {
            const ужеРаскрыта = кнопка.getAttribute("aria-expanded") === "true";
            const существующийБлок = кнопка.nextElementSibling;

            if (
                ужеРаскрыта &&
                существующийБлок instanceof HTMLElement &&
                существующийБлок.classList.contains("содержимое-папки")
            ) {
                существующийБлок.remove();
                кнопка.setAttribute("aria-expanded", "false");
                кнопка.textContent = "📁 " + путьИмени(путь);
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
                if (
                    прежнийБлок instanceof HTMLElement &&
                    прежнийБлок.classList.contains("содержимое-папки")
                ) {
                    прежнийБлок.remove();
                }

                кнопка.after(блок);
                кнопка.setAttribute("aria-expanded", "true");
                кнопка.textContent = "📂 " + путьИмени(путь);

                показатьСостояние("Элементов в папке: " + данные.элементы.length);
            } catch (ошибка) { показатьОшибку("Не удалось прочитать папку:", ошибка); } finally {
                кнопка.disabled = false;
            }
        }

        function запроситьИмяЭлемента(тип) {
            return new Promise((resolve) => {
                const слой = document.createElement("div");
                слой.style.cssText = [
                    "position:fixed",
                    "inset:0",
                    "z-index:100000",
                    "display:flex",
                    "align-items:center",
                    "justify-content:center",
                    "padding:20px",
                    "background:rgba(0,0,0,0.72)"
                ].join(";");

                const форма = document.createElement("form");
                форма.setAttribute("role", "dialog");
                форма.setAttribute("aria-modal", "true");
                форма.style.cssText = [
                    "width:100%",
                    "max-width:380px",
                    "box-sizing:border-box",
                    "padding:22px",
                    "border:1px solid #36566b",
                    "border-radius:8px",
                    "background:#101c27",
                    "color:#d6e4ec",
                    "box-shadow:0 16px 48px rgba(0,0,0,0.5)",
                    "font:inherit"
                ].join(";");

                const заголовок = document.createElement("div");
                заголовок.textContent = тип === "файл"
                    ? "Создание файла"
                    : "Создание папки";
                заголовок.style.cssText =
                    "font-size:16px;font-weight:600;margin-bottom:10px";

                const описание = document.createElement("div");
                описание.textContent = тип === "файл"
                    ? "Введите имя файла вместе с расширением."
                    : "Введите имя новой папки.";
                описание.style.cssText =
                    "font-size:12px;color:#9bb0bf;margin-bottom:12px";

                const поле = document.createElement("input");
                поле.type = "text";
                поле.name = "имя";
                поле.required = true;
                поле.maxLength = 120;
                поле.autocomplete = "off";
                поле.placeholder = тип === "файл"
                    ? "тест_редактора.txt"
                    : "новая_папка";
                поле.setAttribute("aria-label", "Имя нового элемента");
                поле.style.cssText = [
                    "display:block",
                    "box-sizing:border-box",
                    "width:100%",
                    "padding:10px",
                    "border:1px solid #36566b",
                    "border-radius:5px",
                    "outline:none",
                    "background:#0b141d",
                    "color:#e7f4fb",
                    "font:inherit",
                    "font-size:13px"
                ].join(";");

                const кнопки = document.createElement("div");
                кнопки.style.cssText =
                    "display:flex;justify-content:flex-end;gap:8px;margin-top:18px";

                const отмена = document.createElement("button");
                отмена.type = "button";
                отмена.textContent = "Отмена";
                отмена.style.cssText =
                    "padding:8px 12px;border:1px solid #36566b;border-radius:5px;background:#172936;color:#c8dbe8;cursor:pointer;font:inherit";

                const создать = document.createElement("button");
                создать.type = "submit";
                создать.textContent = "Создать";
                создать.style.cssText =
                    "padding:8px 12px;border:1px solid #3979a0;border-radius:5px;background:#245675;color:#fff;cursor:pointer;font:inherit";

                кнопки.append(отмена, создать);
                форма.append(заголовок, описание, поле, кнопки);
                слой.appendChild(форма);

                let завершено = false;

                function закрыть(значение) {
                    if (завершено) {
                        return;
                    }

                    завершено = true;
                    document.removeEventListener("keydown", обработатьКлавишу);
                    слой.remove();
                    resolve(значение);
                }

                function обработатьКлавишу(событие) {
                    if (событие.key === "Escape") {
                        событие.preventDefault();
                        закрыть(null);
                    }
                }

                форма.addEventListener("submit", (событие) => {
                    событие.preventDefault();
                    const имя = поле.value.trim();

                    if (!имя) {
                        поле.setCustomValidity("Введите имя файла или папки.");
                        поле.reportValidity();
                        return;
                    }

                    закрыть(имя);
                });

                поле.addEventListener("input", () => {
                    поле.setCustomValidity("");
                });

                отмена.addEventListener("click", () => закрыть(null));

                слой.addEventListener("click", (событие) => {
                    if (событие.target === слой) {
                        закрыть(null);
                    }
                });

                document.addEventListener("keydown", обработатьКлавишу);
                document.body.appendChild(слой);
                поле.focus();
            });
        }

        async function создатьЭлемент(тип, папкаНазначения = "") {
            const имя = await запроситьИмяЭлемента(тип);

            if (имя === null) {
                return;
            }

            const чистоеИмя = имя.trim();

            if (!чистоеИмя) {
                показатьСостояние("Имя не может быть пустым.");
                return;
            }

            try {
                показатьСостояние("Создаю элемент: " + чистоеИмя);

                const данные = await запроситьJSON(
                    тип === "файл" ? "/api/создать-файл" : "/api/создать-папку",
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json; charset=utf-8"
                        },
                        body: JSON.stringify({ имя: чистоеИмя, путь: папкаНазначения })
                    }
                );

                await загрузитьКорень();

                if (typeof данные.путь === "string") {
                    const путьРодителя = папкаНазначения ||
                        данные.путь.replace(/\\/g, "/").split("/").slice(0, -1).join("/");

                    if (путьРодителя) {
                        const частиПути = путьРодителя
                            .replace(/\\/g, "/")
                            .split("/")
                            .filter(Boolean);

                        let накопленныйПуть = "";

                        for (let индекс = 0; индекс < частиПути.length; индекс++) {
                            накопленныйПуть = накопленныйПуть
                                ? накопленныйПуть + "/" + частиПути[индекс]
                                : частиПути[индекс];

                            const кнопкаПапки = Array.from(
                                корень.querySelectorAll("button[data-тип='папка']")
                            ).find(
                                (кнопка) => кнопка.dataset.путь === накопленныйПуть
                            );

                            if (!кнопкаПапки) {
                                break;
                            }

                            if (кнопкаПапки.getAttribute("aria-expanded") !== "true") {
                                await раскрытьПапку(
                                    накопленныйПуть,
                                    кнопкаПапки,
                                    индекс
                                );
                            }
                        }
                    }
                }

                if (тип === "файл" && typeof данные.путь === "string") {
                    const кнопкиФайлов = Array.from(
                        корень.querySelectorAll("button[data-тип='файл']")
                    );

                    const новаяКнопка = кнопкиФайлов.find(
                        (кнопка) => кнопка.dataset.путь === данные.путь
                    );

                    if (новаяКнопка) {
                        await открытьФайл(данные.путь, новаяКнопка);
                    } else {
                        показатьУведомление(данные.сообщение || "Файл создан.", "успех");
                    }
                } else {
                    показатьУведомление(данные.сообщение || "Папка создана.", "успех");
                }
            } catch (ошибка) { показатьОшибку("Не удалось создать элемент:", ошибка); }
        }

        async function сохранитьФайл() {
            if (!открытыйПуть) {
                показатьСостояние("Сначала открой файл в дереве проекта.");
                return false;
            }

            if (сохраняется) {
                повторитьСохранение = true;
                return false;
            }

            if (редактор.value === исходноеСодержимое) {
                показатьСостояние("Все изменения сохранены.");
                return true;
            }

            const путьДляСохранения = открытыйПуть;
            const содержимоеДляСохранения = редактор.value;

            try {
                сохраняется = true;
                показатьСостояние("Сохраняю файл…");

                await запроситьJSON("/api/файл", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json; charset=utf-8"
                    },
                    body: JSON.stringify({
                        путь: путьДляСохранения,
                        содержимое: содержимоеДляСохранения
                    })
                });

                if (открытыйПуть === путьДляСохранения) {
                    исходноеСодержимое = содержимоеДляСохранения;

                    if (редактор.value === исходноеСодержимое) {
                        показатьУведомление("Файл сохранён: " + путьДляСохранения, "успех");
                    } else {
                        повторитьСохранение = true;
                    }
                }

                return true;
            } catch (ошибка) { показатьОшибку("Не удалось сохранить файл:", ошибка); return false;
            } finally {
                сохраняется = false;

                if (повторитьСохранение) {
                    повторитьСохранение = false;

                    if (
                        открытыйПуть &&
                        редактор.value !== исходноеСодержимое
                    ) {
                        setTimeout(() => {
                            void сохранитьФайл();
                        }, 100);
                    }
                }
            }
        }

        async function выбратьРабочуюПапку(кнопка) {
            try {
                if (сохраняется) {
                    показатьСостояние("Дождись завершения сохранения файла.");
                    return;
                }

                if (
                    открытыйПуть &&
                    редактор.value !== исходноеСодержимое
                ) {
                    показатьСостояние(
                        "Сначала сохрани изменения сочетанием Ctrl+S."
                    );
                    редактор.focus();
                    return;
                }

                if (
                    !window.улитка ||
                    typeof window.улитка.выбратьПапку !== "function"
                ) {
                    throw new Error(
                        "Системный выбор папки недоступен. Перезапусти «Улитку»."
                    );
                }

                кнопка.disabled = true;

                const выбранныйПуть = await window.улитка.выбратьПапку();

                if (!выбранныйПуть) {
                    показатьСостояние("Выбор папки отменён.");
                    return;
                }

                показатьСостояние("Переключаю рабочую папку…");

                await запроситьJSON("/api/рабочая-папка", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json; charset=utf-8"
                    },
                    body: JSON.stringify({ путь: выбранныйПуть })
                });

                if (
                    !window.улитка ||
                    typeof window.улитка.синхронизироватьРабочуюПапку !== "function"
                 ) {
                    throw new Error(
                    "Синхронизация рабочей папки недоступна. Перезапусти «Улитку»."
                );
}

await window.улитка.синхронизироватьРабочуюПапку(
    выбранныйПуть
);

                if (таймерАвтосохранения !== null) {
                    clearTimeout(таймерАвтосохранения);
                    таймерАвтосохранения = null;
                }

                открытыйПуть = null;
                исходноеСодержимое = "";
                редактор.value = "";
                путьРабочейПапки = выбранныйПуть;

                очиститьВыделение();
                последнийВыбранныйПуть = null;
                путиДляКопирования = [];

                await загрузитьКорень();

                показатьСостояние(
                    "Рабочая папка изменена:\n" + путьРабочейПапки
                );
            } catch (ошибка) { показатьОшибку("Не удалось изменить рабочую папку:", ошибка); } finally {
                кнопка.disabled = false;
            }
        }

        async function загрузитьКорень(восстановитьРаскрытие = true) {
            const раскрытыеПути = восстановитьРаскрытие
                ? Array.from(
                    корень.querySelectorAll(
                        "button.элемент-дерева[data-тип='папка'][aria-expanded='true']"
                    )
                )
                    .map((кнопка) => кнопка.dataset.путь)
                    .filter((путь) => typeof путь === "string" && путь.length > 0)
                : [];

            const позицияПрокрутки = корень.scrollTop;

            раскрытыеПути.sort((первый, второй) => {
                const глубинаПервого = первый.replace(/\\/g, "/").split("/").filter(Boolean).length;
                const глубинаВторого = второй.replace(/\\/g, "/").split("/").filter(Boolean).length;
                return глубинаПервого - глубинаВторого;
            });

            try {
                const данные = await запроситьJSON("/api/файлы?путь=");

                if (!Array.isArray(данные.элементы)) {
                    throw new Error("Сервер вернул некорректный список файлов.");
                }

                корень.replaceChildren();

                const панель = document.createElement("div");
                панель.className = "панель-дерева";

                function добавитьКнопкуПанели(надпись, действие) {
                    const кнопка = document.createElement("button");
                    кнопка.type = "button";
                    кнопка.className = "кнопка-панели-дерева";
                    кнопка.textContent = надпись;
                    кнопка.addEventListener("click", действие);
                    панель.appendChild(кнопка);
                    return кнопка;
                }

                добавитьКнопкуПанели("Файл +", () => {
                    void создатьЭлемент("файл");
                });

                добавитьКнопкуПанели("Папка +", () => {
                    void создатьЭлемент("папка");
                });

                добавитьКнопкуПанели("Обновить", () => {
                    void загрузитьКорень();
                });

                const кнопкаВыбора = добавитьКнопкуПанели(
                    "Выбрать папку",
                    () => {
                        void выбратьРабочуюПапку(кнопкаВыбора);
                    }
                );

                корень.appendChild(панель);

                for (const элемент of данные.элементы) {
                    if (
                        !элемент ||
                        typeof элемент.имя !== "string" ||
                        typeof элемент.путь !== "string" ||
                        (
                            элемент.тип !== "папка" &&
                            элемент.тип !== "файл"
                        )
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
                            void раскрытьПапку(
                                элемент.путь,
                                кнопка,
                                0
                            );
                        });
                    } else {
                        кнопка.addEventListener("click", () => {
                            void открытьФайл(
                                элемент.путь,
                                кнопка
                            );
                        });
                    }

                    корень.appendChild(кнопка);
                }

                корень.appendChild(состояние);

                for (const путь of раскрытыеПути) {
                    const кнопкаПапки = Array.from(
                        корень.querySelectorAll(
                            "button.элемент-дерева[data-тип='папка']"
                        )
                    ).find(
                        (кнопка) => кнопка.dataset.путь === путь
                    );

                    if (!кнопкаПапки) {
                        continue;
                    }

                    if (
                        кнопкаПапки.getAttribute("aria-expanded") !== "true"
                    ) {
                        const глубина = путь.replace(/\\/g, "/").split("/").filter(Boolean).length;

                        await раскрытьПапку(
                            путь,
                            кнопкаПапки,
                            Math.max(0, глубина - 1)
                        );
                    }
                }

                корень.scrollTop = позицияПрокрутки;

                показатьСостояние(
                    данные.элементы.length === 0
                        ? "В рабочей папке нет доступных файлов."
                        : "Загружено элементов: " + данные.элементы.length
                );
            } catch (ошибка) {
                корень.replaceChildren(состояние);

                показатьОшибку("Не удалось загрузить дерево проекта:", ошибка);}
        }
        редактор.addEventListener("input", () => {
            if (!открытыйПуть) {
                return;
            }

            if (таймерАвтосохранения !== null) {
                clearTimeout(таймерАвтосохранения);
            }

            показатьСостояние("Есть несохранённые изменения…");

            таймерАвтосохранения = setTimeout(() => {
                таймерАвтосохранения = null;
                void сохранитьФайл();
            }, 500);
        });

        document.addEventListener("keydown", (событие) => {
            if (
                (событие.ctrlKey || событие.metaKey) &&
                событие.key.toLowerCase() === "s"
            ) {
                событие.preventDefault();
                void сохранитьФайл();
            }
        });

        window.addEventListener("focus", () => {
            if (открытыйПуть && редактор.value !== исходноеСодержимое) {
                показатьСостояние(
                    "Есть несохранённые изменения: " + открытыйПуть
                );
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
        throw new Error("Доступ за пределы рабочей папки запрещён.");
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
        throw new Error("Доступ к файлам за пределами рабочей папки запрещён.");
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
    ответ: ServerResponse,
    код: number,
    данные: Record<string, unknown>,
): void {
    ответ.statusCode = код;
    ответ.setHeader("Content-Type", "application/json; charset=utf-8");
    ответ.setHeader("Cache-Control", "no-store");
    ответ.end(JSON.stringify(данные));
}

async function прочитатьТело(
    запрос: IncomingMessage,
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

function проверитьИмяЭлемента(имя: string, этоФайл: boolean): void {
    if (
        имя.length === 0 ||
        имя.length > 120 ||
        имя === "." ||
        имя === ".." ||
        имя.includes("/") ||
        имя.includes("\\") ||
        /[<>:"|?*\x00-\x1F]/.test(имя) ||
        /[. ]$/.test(имя) ||
        /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(?:\.|$)/i.test(имя)
    ) {
        throw new Error("Имя содержит недопустимые символы или запрещено Windows.");
    }
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

                let путьЗапроса: string;

                try {
                    путьЗапроса = decodeURIComponent(адрес.pathname);
                } catch {
                    отправитьJSON(ответ, 400, {
                        успешно: false,
                        сообщение: "Адрес запроса содержит некорректное кодирование.",
                    });
                    return;
                }

                const известныеМаршруты = new Set([
                    "/api/рабочая-папка",
                    "/api/файлы",
                    "/api/файл",
                    "/api/создать-файл",
                    "/api/создать-папку",
                    "/api/проверить-удаление",
                    "/api/копировать",
                ]);

                if (!известныеМаршруты.has(путьЗапроса)) {
                    следующий();
                    return;
                }

                void (async () => {
                    try {
                        if (путьЗапроса === "/api/рабочая-папка") {
                            if (запрос.method !== "POST") {
                                ответ.setHeader("Allow", "POST");
                                отправитьJSON(ответ, 405, {
                                    успешно: false,
                                    сообщение: "Для выбора рабочей папки разрешён только POST.",
                                });
                                return;
                            }

                            const тело = await прочитатьТело(запрос);

                            if (
                                typeof тело !== "object" ||
                                тело === null ||
                                !("путь" in тело) ||
                                typeof тело.путь !== "string" ||
                                !isAbsolute(тело.путь)
                            ) {
                                отправитьJSON(ответ, 400, {
                                    успешно: false,
                                    сообщение: "Не указан корректный абсолютный путь к папке.",
                                });
                                return;
                            }

                            const выбранныйПуть = await realpath(тело.путь);
                            const сведения = await stat(выбранныйПуть);

                            if (!сведения.isDirectory()) {
                                отправитьJSON(ответ, 400, {
                                    успешно: false,
                                    сообщение: "Выбранный путь не является папкой.",
                                });
                                return;
                            }

                            КОРЕНЬ_ПРОЕКТА = выбранныйПуть;

                            отправитьJSON(ответ, 200, {
                                успешно: true,
                                сообщение: "Рабочая папка изменена.",
                            });
                            return;
                        }

                        if (путьЗапроса === "/api/проверить-удаление") {
                            if (запрос.method !== "POST") {
                                ответ.setHeader("Allow", "POST");
                                отправитьJSON(ответ, 405, {
                                    успешно: false,
                                    сообщение: "Для проверки удаления разрешён только POST.",
                                });
                                return;
                            }

                            const тело = await прочитатьТело(запрос);

                            if (
                                typeof тело !== "object" ||
                                тело === null ||
                                !("путь" in тело) ||
                                typeof тело.путь !== "string" ||
                                !тело.путь.trim()
                            ) {
                                отправитьJSON(ответ, 400, {
                                    успешно: false,
                                    сообщение: "Не указан путь к удаляемому элементу.",
                                });
                                return;
                            }

                            const путь = путьВнутриПроекта(тело.путь);

                            if (путь === resolve(КОРЕНЬ_ПРОЕКТА)) {
                                отправитьJSON(ответ, 400, {
                                    успешно: false,
                                    сообщение: "Нельзя удалить корень рабочей папки.",
                                });
                                return;
                            }

                            const относительныйПуть = relative(
                                КОРЕНЬ_ПРОЕКТА,
                                путь,
                            );

                            const частиПути = относительныйПуть
                                .split(sep)
                                .filter(Boolean);

                            if (
                                !относительныйПуть ||
                                относительныйПуть === ".." ||
                                относительныйПуть.startsWith(".." + sep) ||
                                isAbsolute(относительныйПуть)
                            ) {
                                отправитьJSON(ответ, 400, {
                                    успешно: false,
                                    сообщение: "Удаление за пределами рабочей папки запрещено.",
                                });
                                return;
                            }

                            if (
                                частиПути.some(часть =>
                                    СЛУЖЕБНЫЕ_КАТАЛОГИ.has(часть.toLowerCase())
                                )
                            ) {
                                отправитьJSON(ответ, 403, {
                                    успешно: false,
                                    сообщение: "Нельзя удалить служебный каталог.",
                                });
                                return;
                            }

                            const сведения = await lstat(путь);

                            if (сведения.isSymbolicLink()) {
                                отправитьJSON(ответ, 403, {
                                    успешно: false,
                                    сообщение: "Удаление символических ссылок через дерево запрещено.",
                                });
                                return;
                            }

                            if (!сведения.isFile() && !сведения.isDirectory()) {
                                отправитьJSON(ответ, 400, {
                                    успешно: false,
                                    сообщение: "Можно удалить только файл или папку.",
                                });
                                return;
                            }

                            await проверитьРеальныйПуть(путь);

                            отправитьJSON(ответ, 200, {
                                успешно: true,
                                сообщение: "Проверка безопасности пройдена.",
                                путь: относительныйПуть.split(sep).join("/"),
                                тип: сведения.isDirectory() ? "папка" : "файл",
                            });
                            return;
                        }

                        if (путьЗапроса === "/api/копировать") {
                            if (запрос.method !== "POST") {
                                ответ.setHeader("Allow", "POST");
                                отправитьJSON(ответ, 405, {
                                    успешно: false,
                                    сообщение: "Для копирования разрешён только POST.",
                                });
                                return;
                            }

                            const тело = await прочитатьТело(запрос);

                            if (
                                typeof тело !== "object" ||
                                тело === null ||
                                !("источник" in тело) ||
                                typeof тело.источник !== "string" ||
                                !тело.источник.trim() ||
                                !("назначение" in тело) ||
                                typeof тело.назначение !== "string"
                            ) {
                                отправитьJSON(ответ, 400, {
                                    успешно: false,
                                    сообщение: "Укажите источник и папку назначения.",
                                });
                                return;
                            }

                            const источник = путьВнутриПроекта(тело.источник);
                            const папкаНазначения = путьВнутриПроекта(тело.назначение);

                            if (источник === resolve(КОРЕНЬ_ПРОЕКТА)) {
                                отправитьJSON(ответ, 400, {
                                    успешно: false,
                                    сообщение: "Нельзя копировать корень рабочей папки.",
                                });
                                return;
                            }

                            const относительныйИсточник = relative(
                                КОРЕНЬ_ПРОЕКТА,
                                источник,
                            );

                            const частиИсточника = относительныйИсточник
                                .split(sep)
                                .filter(Boolean);

                            if (
                                !относительныйИсточник ||
                                относительныйИсточник === ".." ||
                                относительныйИсточник.startsWith(".." + sep) ||
                                isAbsolute(относительныйИсточник)
                            ) {
                                отправитьJSON(ответ, 400, {
                                    успешно: false,
                                    сообщение: "Источник находится за пределами рабочей папки.",
                                });
                                return;
                            }

                            const сведенияИсточника = await lstat(источник);

                            if (сведенияИсточника.isSymbolicLink()) {
                                отправитьJSON(ответ, 403, {
                                    успешно: false,
                                    сообщение: "Копирование символических ссылок запрещено.",
                                });
                                return;
                            }

                            if (
                                !сведенияИсточника.isFile() &&
                                !сведенияИсточника.isDirectory()
                            ) {
                                отправитьJSON(ответ, 400, {
                                    успешно: false,
                                    сообщение: "Можно копировать только файлы и папки.",
                                });
                                return;
                            }

                            await проверитьРеальныйПуть(источник);
                            await проверитьРеальныйПуть(папкаНазначения);

                            const относительнаяПапкаНазначения = relative(
                                КОРЕНЬ_ПРОЕКТА,
                                папкаНазначения,
                            );

                            if (
                                относительнаяПапкаНазначения === ".." ||
                                относительнаяПапкаНазначения.startsWith(".." + sep) ||
                                isAbsolute(относительнаяПапкаНазначения)
                            ) {
                                отправитьJSON(ответ, 400, {
                                    успешно: false,
                                    сообщение: "Папка назначения находится за пределами рабочей папки.",
                                });
                                return;
                            }

                            const сведенияНазначения = await lstat(папкаНазначения);

                            if (
                                сведенияНазначения.isSymbolicLink() ||
                                !сведенияНазначения.isDirectory()
                            ) {
                                отправитьJSON(ответ, 400, {
                                    успешно: false,
                                    сообщение: "Назначение должно быть обычной папкой.",
                                });
                                return;
                            }

                            const имяИсточника = basename(источник);
                            const путьКопии = join(папкаНазначения, имяИсточника);
                            const относительныйПутьКопии = relative(
                                КОРЕНЬ_ПРОЕКТА,
                                путьКопии,
                            );

                            if (
                                относительныйПутьКопии === ".." ||
                                относительныйПутьКопии.startsWith(".." + sep) ||
                                isAbsolute(относительныйПутьКопии)
                            ) {
                                отправитьJSON(ответ, 400, {
                                    успешно: false,
                                    сообщение: "Путь копии выходит за пределы рабочей папки.",
                                });
                                return;
                            }

                            if (сведенияИсточника.isDirectory()) {
                                const относительныйПутьВНазначение = relative(
                                    источник,
                                    папкаНазначения,
                                );

                                if (
                                    относительныйПутьВНазначение === "" ||
                                    (
                                        относительныйПутьВНазначение !== ".." &&
                                        !относительныйПутьВНазначение.startsWith(".." + sep) &&
                                        !isAbsolute(относительныйПутьВНазначение)
                                    )
                                ) {
                                    отправитьJSON(ответ, 400, {
                                        успешно: false,
                                        сообщение: "Нельзя копировать папку внутрь самой себя.",
                                    });
                                    return;
                                }

                                const проверитьДерево = async (папка: string): Promise<void> => {
                                    const записи = await readdir(папка, {
                                        withFileTypes: true,
                                    });

                                    for (const запись of записи) {
                                        const путьЗаписи = join(папка, запись.name);

                                        if (запись.isSymbolicLink()) {
                                            throw new Error(
                                                "В исходной папке обнаружена символическая ссылка.",
                                            );
                                        }

                                        const сведенияЗаписи = await lstat(путьЗаписи);

                                        if (сведенияЗаписи.isDirectory()) {
                                            await проверитьДерево(путьЗаписи);
                                        } else if (!сведенияЗаписи.isFile()) {
                                            throw new Error(
                                                "В исходной папке найден неподдерживаемый элемент.",
                                            );
                                        }

                                        await проверитьРеальныйПуть(путьЗаписи);
                                    }
                                };

                                await проверитьДерево(источник);
                            }

                            try {
                                await cp(источник, путьКопии, {
                                    recursive: сведенияИсточника.isDirectory(),
                                    force: false,
                                    errorOnExist: true,
                                    dereference: false,
                                });
                            } catch (ошибка) {
                                if (
                                    typeof ошибка === "object" &&
                                    ошибка !== null &&
                                    "code" in ошибка &&
                                    (
                                        ошибка.code === "EEXIST" ||
                                        ошибка.code === "ERR_FS_CP_EEXIST"
                                    )
                                ) {
                                    отправитьJSON(ответ, 409, {
                                        успешно: false,
                                        сообщение: "Элемент с таким именем уже существует. Перезапись запрещена.",
                                    });
                                    return;
                                }

                                throw ошибка;
                            }

                            отправитьJSON(ответ, 200, {
                                успешно: true,
                                сообщение: "Элемент скопирован.",
                                путь: относительныйПутьКопии.split(sep).join("/"),
                            });
                            return;
                        }

                        if (
                            путьЗапроса === "/api/создать-файл" ||
                            путьЗапроса === "/api/создать-папку"
                        ) {
                            if (запрос.method !== "POST") {
                                ответ.setHeader("Allow", "POST");
                                отправитьJSON(ответ, 405, {
                                    успешно: false,
                                    сообщение: "Для создания элемента разрешён только POST.",
                                });
                                return;
                            }

                            const тело = await прочитатьТело(запрос);

                            if (
                                typeof тело !== "object" ||
                                тело === null ||
                                !("имя" in тело) ||
                                typeof тело.имя !== "string"
                            ) {
                                отправитьJSON(ответ, 400, {
                                    успешно: false,
                                    сообщение: "Не указано имя нового элемента.",
                                });
                                return;
                            }

                            const имя = тело.имя.trim();
                            const этоФайл = путьЗапроса === "/api/создать-файл";
                            const папка = "путь" in тело && typeof тело.путь === "string"
                                ? тело.путь
                                : "";

                            проверитьИмяЭлемента(имя, этоФайл);

                            const путьПапки = путьВнутриПроекта(папка);
                            const проверенныйКаталог =
                                путьПапки === КОРЕНЬ_ПРОЕКТА
                                    ? await realpath(КОРЕНЬ_ПРОЕКТА)
                                    : await проверитьРеальныйПуть(путьПапки);

                            const сведенияКаталога = await stat(проверенныйКаталог);

                            if (!сведенияКаталога.isDirectory()) {
                                отправитьJSON(ответ, 400, {
                                    успешно: false,
                                    сообщение: "Папка назначения не существует.",
                                });
                                return;
                            }

                            const новыйПуть = resolve(проверенныйКаталог, имя);

                            if (этоФайл) {
                                await writeFile(
                                    новыйПуть,
                                    "",
                                    { encoding: "utf8", flag: "wx" }
                                );
                            } else {
                                await mkdir(новыйПуть);
                            }

                            отправитьJSON(ответ, 201, {
                                успешно: true,
                                путь: relative(КОРЕНЬ_ПРОЕКТА, новыйПуть).split(sep).join("/"),
                                сообщение: этоФайл
                                    ? "Файл создан."
                                    : "Папка создана.",
                            });
                            return;
                        }

                        if (путьЗапроса === "/api/файлы") {
                            if (запрос.method !== "GET") {
                                ответ.setHeader("Allow", "GET");
                                отправитьJSON(ответ, 405, {
                                    успешно: false,
                                    сообщение: "Для чтения дерева разрешён только GET.",
                                });
                                return;
                            }

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
                                if (!запись.isDirectory() && !запись.isFile()) {
                                    continue;
                                }

                                if (запись.isSymbolicLink()) {
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

                        if (путьЗапроса === "/api/файл") {
                            if (запрос.method === "GET") {
                                const путь = путьВнутриПроекта(
                                    адрес.searchParams.get("путь"),
                                );

                                const проверенныйПуть =
                                    await проверитьРеальныйПуть(путь);

                                const сведения = await stat(проверенныйПуть);

                                if (
                                    !сведения.isFile() ||
                                    сведения.size > МАКСИМАЛЬНЫЙ_РАЗМЕР_ФАЙЛА ||
                                    !разрешённыйТекстовыйФайл(
                                        проверенныйПуть.split(sep).pop() ?? ""
                                    )
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

                            if (запрос.method === "POST") {
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
                                    !разрешённыйТекстовыйФайл(
                                        проверенныйПуть.split(sep).pop() ?? ""
                                    )
                                ) {
                                    отправитьJSON(ответ, 400, {
                                        успешно: false,
                                        сообщение: "Сохранять разрешено только существующие текстовые файлы рабочей папки.",
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
                        }
                    } catch (ошибка) {
                        const сообщение = ошибка instanceof Error
                            ? ошибка.message
                            : String(ошибка);

                        const код = /ENOENT|ENOTDIR/.test(сообщение)
                            ? 404
                            : 400;

                        отправитьJSON(ответ, код, {
                            успешно: false,
                            сообщение: "Ошибка работы с файлами рабочей папки: " + сообщение,
                        });
                    }
                })();
            });
        },
    };
}