"use strict";

const { app, BrowserWindow, Menu, dialog, ipcMain, shell } = require("electron");
const { spawn } = require("node:child_process");
const path = require("node:path");
const fs = require("node:fs");
const http = require("node:http");
const crypto = require("node:crypto");

const КОРЕНЬ = path.resolve(__dirname, "..");
const АДРЕС = "http://127.0.0.1:5173";
const API_ФАЙЛОВ = "/api/%D1%84%D0%B0%D0%B9%D0%BB%D1%8B";

// Установленная программа (упаковка electron-builder) работает только
// на собранном интерфейсе: dev-зависимостей рядом с ней нет.
const УПАКОВАНО = app.isPackaged;

// Иконка лежит рядом с кодом приложения — тогда она попадает и в сборку.
const ИКОНКА = [
    path.join(__dirname, "иконка.ico"),
    path.join(КОРЕНЬ, "FolderStylerIcon.ico")
].find(путь => fs.existsSync(путь));

// День 9: одноразовый токен доступа к /api/*. Electron генерирует
// его до запуска сервера и передаёт через env; сервер отдаёт токен
// странице HttpOnly-cookie, мосты принимают только запросы с токеном.
if (!process.env.УЛИТКА_ТОКЕН) {
    process.env.УЛИТКА_ТОКЕН = crypto.randomBytes(32).toString("hex");
}

let окно = null;
let РАБОЧАЯ_ПАПКА = КОРЕНЬ;
let серверVite = null;
let серверЗапущенПриложением = false;
let текущийАдрес = АДРЕС;
let продСерверЗапущен = false;
let журнал = null;

app.setAppUserModelId("ru.ulitka.desktop");

const первыйЗапуск = app.requestSingleInstanceLock();

if (!первыйЗапуск) {
    app.quit();
} else {
    app.on("second-instance", () => {
        if (окно) {
            if (окно.isMinimized()) {
                окно.restore();
            }

            окно.show();
            окно.focus();
        }
    });


// Безопасный системный выбор рабочей папки.
ipcMain.handle("улитка:выбрать-папку", async (событие) => {
    if (!окно || событие.sender !== окно.webContents) {
        throw new Error("Запрос выбора папки поступил от неизвестного окна.");
    }

    const результат = await dialog.showOpenDialog(окно, {
        title: "Выберите рабочую папку для «Улитки»",
        buttonLabel: "Выбрать папку",
        properties: ["openDirectory", "createDirectory"]
    });

    if (результат.canceled || результат.filePaths.length === 0) {
        return null;
    }

    const выбраннаяПапка = await fs.promises.realpath(
        результат.filePaths[0]
    );

    const сведения = await fs.promises.stat(выбраннаяПапка);

    if (!сведения.isDirectory()) {
        throw new Error("Выбранный путь не является папкой.");
    }

    РАБОЧАЯ_ПАПКА = выбраннаяПапка;

    return выбраннаяПапка;
});

// Синхронизация рабочего пути с файловым деревом.
ipcMain.handle(
    "улитка:синхронизировать-рабочую-папку",
    async (событие, путь) => {
        if (!окно || событие.sender !== окно.webContents) {
            throw new Error("Запрос смены рабочей папки поступил от неизвестного окна.");
        }

        if (typeof путь !== "string" || !path.isAbsolute(путь)) {
            throw new Error("Указан некорректный путь рабочей папки.");
        }

        const настоящийПуть = await fs.promises.realpath(путь);
        const сведения = await fs.promises.stat(настоящийПуть);

        if (!сведения.isDirectory()) {
            throw new Error("Рабочий путь не является папкой.");
        }

        РАБОЧАЯ_ПАПКА = настоящийПуть;

        записатьЖурнал(
            "\nРабочая папка Electron: " + РАБОЧАЯ_ПАПКА + "\n"
        );

        return РАБОЧАЯ_ПАПКА;
    }
);

// Безопасное перемещение элемента в корзину Windows.
ipcMain.handle("улитка:переместить-в-корзину", async (событие, путь) => {
    if (!окно || событие.sender !== окно.webContents) {
        throw new Error("Запрос удаления поступил от неизвестного окна.");
    }

    if (
        typeof путь !== "string" ||
        путь.length === 0 ||
        path.isAbsolute(путь) ||
        путь.includes("\0")
    ) {
        throw new Error("Указан некорректный относительный путь.");
    }

    const полныйПуть = path.resolve(РАБОЧАЯ_ПАПКА, путь);
    const относительныйПуть = path.relative(
        РАБОЧАЯ_ПАПКА,
        полныйПуть
    );

    if (
        !относительныйПуть ||
        относительныйПуть === ".." ||
        относительныйПуть.startsWith(".." + path.sep) ||
        path.isAbsolute(относительныйПуть)
    ) {
        throw new Error("Нельзя удалять корень или элементы вне рабочей папки.");
    }

    const защищённыеКаталоги = new Set([
        ".git",
        ".vite",
        "node_modules",
        "dist"
    ]);

    if (
        относительныйПуть
            .split(/[\\/]+/)
            .some(часть => защищённыеКаталоги.has(часть.toLowerCase()))
    ) {
        throw new Error("Нельзя перемещать служебные каталоги в корзину.");
    }

    const сведенияДоПроверки = await fs.promises.lstat(полныйПуть);

    if (сведенияДоПроверки.isSymbolicLink()) {
        throw new Error("Символические ссылки удалять через дерево запрещено.");
    }

    const настоящийКорень = await fs.promises.realpath(РАБОЧАЯ_ПАПКА);
    const настоящийПуть = await fs.promises.realpath(полныйПуть);
    const относительныйНастоящийПуть = path.relative(
        настоящийКорень,
        настоящийПуть
    );

    if (
        !относительныйНастоящийПуть ||
        относительныйНастоящийПуть === ".." ||
        относительныйНастоящийПуть.startsWith(".." + path.sep) ||
        path.isAbsolute(относительныйНастоящийПуть)
    ) {
        throw new Error("Проверка безопасности пути не пройдена.");
    }

    await shell.trashItem(настоящийПуть);

    // После перемещения в корзину оставляем «Улитку» открытой.
    if (окно && !окно.isDestroyed()) {
        if (окно.isMinimized()) {
            окно.restore();
        }

        if (!окно.isVisible()) {
            окно.show();
        }

        окно.focus();
    }

    return {
        успешно: true,
        сообщение: "Элемент перемещён в корзину Windows."
    };
});

    function задержка(миллисекунды) {
        return new Promise(resolve => setTimeout(resolve, миллисекунды));
    }

    function проверитьСервер() {
        return new Promise(resolve => {
            let завершено = false;

            const закончить = результат => {
                if (завершено) {
                    return;
                }

                завершено = true;
                resolve(результат);
            };

            let запрос;

            try {
                запрос = http.get(
                    АДРЕС + API_ФАЙЛОВ,
                    {
                        timeout: 1500,
                        headers: {
                            // Имя заголовка — только латиница: Node.js
                            // отвергает кириллицу (ERR_INVALID_HTTP_TOKEN).
                            "x-ulitka-token": process.env.УЛИТКА_ТОКЕН
                        }
                    },
                    ответ => {
                        let тело = "";

                        ответ.setEncoding("utf8");

                        ответ.on("data", часть => {
                            тело += часть;
                        });

                        ответ.on("end", () => {
                            // Сервер отвечает — значит, жив. Ответ 401/403
                            // (сервер запущен с другим токеном, например
                            // вручную через npm run dev) тоже считаем успехом:
                            // страница получит cookie от того сервера, и всё
                            // сработает. Главное — не поднимать второй сервер
                            // на занятом порту.
                            if (ответ.statusCode !== 200) {
                                закончить(
                                    ответ.statusCode === 401 ||
                                    ответ.statusCode === 403
                                );
                                return;
                            }

                            try {
                                const данные = JSON.parse(тело);

                                закончить(
                                    данные.успешно === true &&
                                    Array.isArray(данные.элементы)
                                );
                            } catch {
                                закончить(false);
                            }
                        });
                    }
                );
            } catch (ошибка) {
                записатьЖурнал(
                    "\nПроверка сервера не удалась: " +
                        ошибка.message +
                        "\n"
                );

                закончить(false);

                return;
            }

            запрос.on("timeout", () => {
                запрос.destroy();
                закончить(false);
            });

            запрос.on("error", () => закончить(false));
        });
    }

    function записатьЖурнал(данные) {
        if (!журнал) {
            return;
        }

        try {
            fs.appendFileSync(
                журнал,
                Buffer.isBuffer(данные) ? данные : String(данные),
                "utf8"
            );
        } catch {
            // Ошибка журнала не должна останавливать приложение.
        }
    }

    function подготовитьЖурнал() {
        fs.mkdirSync(app.getPath("userData"), { recursive: true });

        журнал = path.join(
            app.getPath("userData"),
            "журнал-сервера.txt"
        );
    }

    function запуститьVite() {
        подготовитьЖурнал();

        записатьЖурнал(
            "\n\n=== Запуск Vite: " + new Date().toLocaleString("ru-RU") + " ===\n"
        );

        const команднаяОболочка = process.env.ComSpec || "cmd.exe";

        серверVite = spawn(
            команднаяОболочка,
            ["/d", "/s", "/c", "npm.cmd run dev"],
            {
                cwd: КОРЕНЬ,
                windowsHide: true,
                stdio: ["ignore", "pipe", "pipe"]
            }
        );

        серверЗапущенПриложением = true;

        серверVite.stdout.on("data", записатьЖурнал);
        серверVite.stderr.on("data", записатьЖурнал);

        серверVite.on("error", ошибка => {
            записатьЖурнал("\nОшибка запуска Vite: " + ошибка.message + "\n");
        });

        серверVite.on("exit", (код, сигнал) => {
            записатьЖурнал(
                "\nVite завершился. Код: " + код +
                ", сигнал: " + сигнал + "\n"
            );
        });
    }

    /**
     * Установленная программа не должна работать внутри своей папки:
     * файлы приложения только для чтения. Рабочая папка по умолчанию —
     * «Документы\Улитка»; её же видит файловый мост (процесс переходит
     * в неё до загрузки серверных модулей).
     */
    function подготовитьРабочуюПапку() {
        if (!УПАКОВАНО) {
            return;
        }

        try {
            // Журнал нужен до записи первой строки.
            подготовитьЖурнал();

            const папка = path.join(app.getPath("documents"), "Улитка");

            fs.mkdirSync(папка, { recursive: true });

            РАБОЧАЯ_ПАПКА = папка;

            process.chdir(папка);

            записатьЖурнал("\nРабочая папка: " + папка + "\n");
        } catch (ошибка) {
            записатьЖурнал(
                "\nНе удалось подготовить рабочую папку: " +
                    ошибка.message +
                    "\n"
            );
        }
    }

    async function дождатьсяСервера() {
        подготовитьРабочуюПапку();

        // Прод-режим: только собранный интерфейс, без dev-сервера.
        // Упакованное приложение всегда работает так.
        if (УПАКОВАНО || process.env.УЛИТКА_ПРОД === "1") {
            await запуститьПродСервер();
            return;
        }

        try {
            await дождатьсяСервераVite();
            return;
        } catch (ошибка) {
            const собранныйИнтерфейс = path.join(
                КОРЕНЬ,
                "терминал",
                "dist",
                "index.html"
            );

            if (!fs.existsSync(собранныйИнтерфейс)) {
                throw ошибка;
            }

            // Dev-сервер не поднялся, но сборка есть — открываем её.
            записатьЖурнал(
                "\nDev-сервер недоступен: " +
                (ошибка instanceof Error ? ошибка.message : String(ошибка)) +
                "\nОткрываю собранный вариант интерфейса.\n"
            );

            await запуститьПродСервер();
        }
    }

    async function запуститьПродСервер() {
        подготовитьЖурнал();

        const { запустить } = require(
            path.join(КОРЕНЬ, "приложение", "прод_сервер.cjs")
        );

        текущийАдрес = await запустить();
        продСерверЗапущен = true;

        записатьЖурнал(
            "\nПрод-сервер запущен: " + текущийАдрес + "\n"
        );
    }

    function остановитьПродСервер() {
        if (!продСерверЗапущен) {
            return;
        }

        продСерверЗапущен = false;

        try {
            const { остановить } = require(
                path.join(КОРЕНЬ, "приложение", "прод_сервер.cjs")
            );

            остановить();
        } catch {
            // Модуль мог не загрузиться — закрывать нечего.
        }
    }

    async function дождатьсяСервераVite() {
        if (await проверитьСервер()) {
            return;
        }

        запуститьVite();

        for (let попытка = 0; попытка < 100; попытка++) {
            if (await проверитьСервер()) {
                return;
            }

            if (серверVite && серверVite.exitCode !== null) {
                throw new Error(
                    "Сервер Vite завершился до открытия терминала. " +
                    "Проверь файл журнала:\n" + журнал
                );
            }

            await задержка(350);
        }

        throw new Error(
            "Сервер терминала не ответил за отведённое время.\n\n" +
            "Проверь файл:\n" + журнал
        );
    }

    function создатьМеню() {
        const шаблон = [
            {
                label: "Файл",
                submenu: [
                    {
                        label: "Перезагрузить терминал",
                        accelerator: "Ctrl+R",
                        click: () => {
                            if (окно) {
                                окно.loadURL(текущийАдрес);
                            }
                        }
                    },
                    { type: "separator" },
                    {
                        label: "Выход",
                        accelerator: "Alt+F4",
                        click: () => app.quit()
                    }
                ]
            },
            {
                label: "Вид",
                submenu: [
                    {
                        label: "Полный экран",
                        accelerator: "F11",
                        click: () => {
                            if (окно) {
                                окно.setFullScreen(!окно.isFullScreen());
                            }
                        }
                    },
                    {
                        label: "Увеличить масштаб",
                        accelerator: "Ctrl+Plus",
                        click: () => {
                            if (окно) {
                                окно.webContents.setZoomLevel(
                                    окно.webContents.getZoomLevel() + 0.5
                                );
                            }
                        }
                    },
                    {
                        label: "Уменьшить масштаб",
                        accelerator: "Ctrl+-",
                        click: () => {
                            if (окно) {
                                окно.webContents.setZoomLevel(
                                    окно.webContents.getZoomLevel() - 0.5
                                );
                            }
                        }
                    },
                    {
                        label: "Сбросить масштаб",
                        accelerator: "Ctrl+0",
                        click: () => {
                            if (окно) {
                                окно.webContents.setZoomLevel(0);
                            }
                        }
                    },
                    { type: "separator" },
                    {
                        label: "Инструменты разработчика",
                        accelerator: "Ctrl+Shift+I",
                        click: () => {
                            if (окно) {
                                окно.webContents.toggleDevTools();
                            }
                        }
                    }
                ]
            },
            {
                label: "Справка",
                submenu: [
                    {
                        label: "О программе",
                        click: () => {
                            dialog.showMessageBox(окно, {
                                type: "info",
                                title: "🐌 Улитка",
                                message: "Улитка — русская среда программирования",
                                detail:
                                    "Версия 0.1.0\n\n" +
                                    "Редактор, файловое дерево, Git и живое 3D-ядро."
                            });
                        }
                    }
                ]
            }
        ];

        Menu.setApplicationMenu(Menu.buildFromTemplate(шаблон));
    }

    async function создатьОкно() {
        окно = new BrowserWindow({
            title: "🐌 Улитка — русская среда программирования",
            width: 1600,
            height: 960,
            minWidth: 1100,
            minHeight: 680,
            show: false,
            autoHideMenuBar: false,
            backgroundColor: "#07111a",
            icon: ИКОНКА,
            webPreferences: {
                preload: path.join(__dirname, "предзагрузка.cjs"),
                nodeIntegration: false,
                contextIsolation: true,
                sandbox: true
            }
        });

        окно.once("ready-to-show", () => {
            if (окно) {
                окно.show();
                окно.focus();
            }
        });

        окно.webContents.on("will-navigate", (событие, адрес) => {
            if (!адрес.startsWith(текущийАдрес)) {
                событие.preventDefault();
            }
        });

        окно.webContents.setWindowOpenHandler(() => ({
            action: "deny"
        }));

        окно.webContents.on("render-process-gone", (_событие, сведения) => {
            записатьЖурнал(
                "\nОшибка процесса интерфейса: " +
                JSON.stringify(сведения) + "\n"
            );
        });

        await окно.loadURL(текущийАдрес);

        окно.on("closed", () => {
            окно = null;
        });
    }

    function остановитьСвойСервер() {
        if (
            !серверЗапущенПриложением ||
            !серверVite ||
            серверVite.killed ||
            серверVite.exitCode !== null
        ) {
            return;
        }

        if (process.platform === "win32" && серверVite.pid) {
            const завершение = spawn(
                "taskkill.exe",
                ["/pid", String(серверVite.pid), "/t", "/f"],
                {
                    windowsHide: true,
                    stdio: "ignore"
                }
            );

            завершение.on("error", () => {
                try {
                    серверVite.kill();
                } catch {
                    // Процесс мог уже завершиться.
                }
            });
        } else {
            серверVite.kill();
        }
    }

    app.whenReady().then(async () => {
        создатьМеню();

        try {
            await дождатьсяСервера();
            await создатьОкно();
        } catch (ошибка) {
            dialog.showErrorBox(
                "Не удалось запустить «Улитку»",
                (ошибка instanceof Error ? ошибка.message : String(ошибка)) +
                "\n\nПроект: " + КОРЕНЬ
            );

            остановитьСвойСервер();
            остановитьПродСервер();
            app.quit();
        }
    });

    app.on("before-quit", () => {
        остановитьСвойСервер();
        остановитьПродСервер();
    });

    app.on("window-all-closed", () => {
        app.quit();
    });
}
