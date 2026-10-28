"use strict";

/**
 * ============================================================
 * 🐌 УЛИТКА
 * Прод-сервер интерфейса (без dev-зависимостей)
 * ============================================================
 *
 * Отдаёт собранный интерфейс из `терминал/dist` и обрабатывает
 * `/api/*` через общий модуль `исходники/мосты_сервера.ts`
 * (скомпилированный в `результаты_сервера/`).
 *
 * Используется приложением (приложение/главный.cjs), когда
 * dev-сервер Vite недоступен или задан режим УЛИТКА_ПРОД=1.
 *
 * Сборка перед запуском: npm run сборка
 */

const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const КОРЕНЬ = path.resolve(__dirname, "..");
const ДИСТ = path.join(КОРЕНЬ, "терминал", "dist");
const ПУТЬ_МОСТОВ = path.join(
    КОРЕНЬ,
    "результаты_сервера",
    "исходники",
    "мосты_сервера.js"
);

const ТИПЫ_ФАЙЛОВ = {
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".mjs": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".map": "application/json; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".ico": "image/x-icon",
    ".woff": "font/woff",
    ".woff2": "font/woff2",
    ".ttf": "font/ttf",
    ".wasm": "application/wasm",
};

let текущийСервер = null;

function отправить(ответ, код, тип, тело, заголовки = {}) {
    ответ.statusCode = код;
    ответ.setHeader("Content-Type", тип);

    for (const [имя, значение] of Object.entries(заголовки)) {
        ответ.setHeader(имя, значение);
    }

    ответ.end(тело);
}

function отдатьФайл(полныйПуть, запрос, ответ, сведения) {
    const расширение = path
        .extname(полныйПуть)
        .toLowerCase();

    const тип = ТИПЫ_ФАЙЛОВ[расширение] ?? "application/octet-stream";

    // Хэшированные ассеты можно кэшировать надолго, главную — никогда.
    const кэш = полныйПуть.includes(
        path.sep + "assets" + path.sep
    )
        ? "public, max-age=31536000, immutable"
        : "no-cache";

    ответ.statusCode = 200;
    ответ.setHeader("Content-Type", тип);
    ответ.setHeader("Cache-Control", кэш);
    ответ.setHeader("Content-Length", сведения.size);

    if (запрос.method === "HEAD") {
        ответ.end();
        return;
    }

    const поток = fs.createReadStream(полныйПуть);

    поток.on("error", () => {
        if (!ответ.headersSent) {
            ответ.statusCode = 500;
        }

        ответ.end();
    });

    поток.pipe(ответ);
}

function статика(запрос, ответ) {
    if (
        запрос.method !== "GET" &&
        запрос.method !== "HEAD"
    ) {
        отправить(
            ответ,
            405,
            "application/json; charset=utf-8",
            JSON.stringify({
                успешно: false,
                сообщение: "Разрешены только GET и HEAD.",
            }),
        );
        return;
    }

    let путьЗапроса;

    try {
        путьЗапроса = decodeURIComponent(
            new URL(
                запрос.url ?? "/",
                "http://localhost",
            ).pathname,
        );
    } catch {
        отправить(
            ответ,
            400,
            "application/json; charset=utf-8",
            JSON.stringify({
                успешно: false,
                сообщение: "Некорректный адрес запроса.",
            }),
        );
        return;
    }

    // Главная страница и «чистые» адреса ведут на index.html.
    const относительныйПуть =
        путьЗапроса === "/"
            ? "index.html"
            : путьЗапроса.replace(/^[/\\]+/, "");

    const полныйПуть = path.resolve(ДИСТ, относительныйПуть);

    // Защита от выхода за пределы каталога сборки.
    if (
        полныйПуть !== ДИСТ &&
        !полныйПуть.startsWith(ДИСТ + path.sep)
    ) {
        отправить(
            ответ,
            403,
            "application/json; charset=utf-8",
            JSON.stringify({
                успешно: false,
                сообщение: "Доступ к этому пути закрыт.",
            }),
        );
        return;
    }

    let сведения = null;

    try {
        сведения = fs.statSync(полныйПуть);
    } catch {
        сведения = null;
    }

    if (сведения && сведения.isFile()) {
        отдатьФайл(полныйПуть, запрос, ответ, сведения);
        return;
    }

    // Строка без расширения — маршрут одностраничного интерфейса.
    if (!path.extname(полныйПуть)) {
        const индекс = path.join(ДИСТ, "index.html");

        try {
            отдатьФайл(
                индекс,
                запрос,
                ответ,
                fs.statSync(индекс),
            );
            return;
        } catch {
            // Ни сборки, ни главной страницы — сообщаем ниже.
        }
    }

    отправить(
        ответ,
        404,
        "application/json; charset=utf-8",
        JSON.stringify({
            успешно: false,
            сообщение:
                "Файл не найден. Если интерфейс ещё не собран — выполни: npm run сборка",
        }),
    );
}

/**
 * Запускает прод-сервер на свободном порту 127.0.0.1.
 * Возвращает адрес вида "http://127.0.0.1:12345".
 */
function запустить() {
    const индекс = path.join(ДИСТ, "index.html");

    if (!fs.existsSync(индекс)) {
        return Promise.reject(
            new Error(
                "Собранный интерфейс не найден: " +
                индекс +
                "\n\nВыполни: npm run сборка"
            )
        );
    }

    if (!fs.existsSync(ПУТЬ_МОСТОВ)) {
        return Promise.reject(
            new Error(
                "Серверная часть не скомпилирована: " +
                ПУТЬ_МОСТОВ +
                "\n\nВыполни: npm run сборка"
            )
        );
    }

    const { мостAPI } = require(ПУТЬ_МОСТОВ);

    const сервер = http.createServer((запрос, ответ) => {
        мостAPI(запрос, ответ, () => {
            статика(запрос, ответ);
        });
    });

    return new Promise((разрешить, отклонить) => {
        сервер.once("error", отклонить);

        сервер.listen(0, "127.0.0.1", () => {
            текущийСервер = сервер;

            const адресСервера = сервер.address();

            if (
                typeof адресСервера !== "object" ||
                адресСервера === null
            ) {
                отклонить(
                    new Error("Не удалось определить адрес прод-сервера."),
                );
                return;
            }

            разрешить("http://127.0.0.1:" + адресСервера.port);
        });
    });
}

function остановить() {
    if (текущийСервер) {
        текущийСервер.close();
        текущийСервер = null;
    }
}

module.exports = { запустить, остановить };
