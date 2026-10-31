/**
 * ============================================================
 * 🐌 УЛИТКА
 * Защита HTTP-мостов: одноразовый токен, Origin, лимит тела
 * ============================================================
 *
 * Правила (п. 1 и п. 4 отчёта):
 *  - Electron генерирует токен при старте (env УЛИТКА_ТОКЕН);
 *  - сервер отдаёт токен странице HttpOnly-cookie (одна точка
 *    доставки — рендереру не нужны правки fetch);
 *  - мосты `/api/*` принимают только запросы с токеном
 *    (cookie или заголовок x-ulitka-token, сравнение по времени
 *    безопасное) и с совпадающим Origin;
 *  - тело запроса больше 2 МБ → ответ 413.
 *
 * Модуль не импортирует другие части «Улитки» — чтобы не было
 * циклов: им используют и vite.config.ts, и мосты_сервера.ts,
 * и мост_файлов_проекта.ts.
 */

import {
    createHash,
    randomBytes,
    timingSafeEqual,
} from "node:crypto";

import type {
    IncomingMessage,
    ServerResponse,
} from "node:http";

/** Подпись HTTP-обработчика — как у connect, который использует Vite. */
export type ОбработчикМоста = (
    запрос: IncomingMessage,
    ответ: ServerResponse,
    следующий: (ошибка?: unknown) => void,
) => void;

/**
 * Имя cookie, в котором сервер отдаёт токен странице.
 * Только латиница: HTTP-заголовки не принимают кириллицу.
 */
export const ИМЯ_COOKIE_ТОКЕНА = "ulitka_token";

/** Заголовок для запросов без cookie (внешние проверки, инструменты).
 *
 * Только латиница: имя HTTP-заголовка по стандарту — ASCII-токен,
 * Node.js отвергает кириллицу (`ERR_INVALID_HTTP_TOKEN`), так что
 * `x-улитка-токен` не дошёл бы до сервера вообще.
 */
export const ЗАГОЛОВОК_ТОКЕНА = "x-ulitka-token";

/** Максимальный размер тела запроса — 2 МБ. */
export const ЛИМИТ_ТЕЛА_ЗАПРОСА = 2 * 1024 * 1024;

let токенСервера: string | null = null;

/**
 * Токен этого серверного процесса.
 *
 * Берётся из env (так Electron передаёт его vite и прод-серверу),
 * а если запуска вручную (`npm run dev`) — генерируется сам.
 */
export function получитьТокен(): string {
    if (токенСервера === null) {
        токенСервера =
            process.env.УЛИТКА_ТОКЕН ||
            randomBytes(32).toString("hex");

        // Фиксируем в env: потомки и коллеги по процессу увидят
        // тот же токен.
        process.env.УЛИТКА_ТОКЕН = токенСервера;
    }

    return токенСервера;
}

/**
 * Сравнение токенов по времени безопасное:
 * длины скрыты хэшированием, сравнение — constant-time.
 */
function совпалоБезопасно(
    первое: string,
    второе: string,
): boolean {
    return timingSafeEqual(
        createHash("sha256").update(первое).digest(),
        createHash("sha256").update(второе).digest(),
    );
}

/**
 * Путь запроса в раскодированном виде (`/api/файлы?путь=…` →
 * `/api/файлы`). `null` — адрес разобрать не удалось.
 */
export function путьЗапроса(
    запрос: IncomingMessage,
): string | null {
    try {
        return decodeURIComponent(
            new URL(
                запрос.url ?? "/",
                "http://localhost",
            ).pathname,
        );
    } catch {
        return null;
    }
}

/** Запрос адресован мостам `/api/*`. */
function этоМаршрутAPI(запрос: IncomingMessage): boolean {
    const путь = путьЗапроса(запрос);

    return путь !== null && путь.startsWith("/api/");
}

/** Достаёт значение cookie по имени из заголовка запроса. */
function прочитатьCookie(
    запрос: IncomingMessage,
    имя: string,
): string | null {
    const сырые = запрос.headers.cookie;

    if (!сырые) {
        return null;
    }

    for (const кусок of сырые.split(";")) {
        const чистый = кусок.trim();
        const раздел = чистый.indexOf("=");

        if (раздел === -1) {
            continue;
        }

        if (чистый.slice(0, раздел).trim() === имя) {
            return decodeURIComponent(
                чистый.slice(раздел + 1).trim(),
            );
        }
    }

    return null;
}

/**
 * Проверка Origin: если браузер прислал Origin — он обязан
 * совпадать с адресом самого сервера (`http://` + Host).
 *
 * Запросы без Origin (curl, инструменты) допускаются, но только
 * с валидным токеном.
 */
function originСовпадает(запрос: IncomingMessage): boolean {
    const origin = запрос.headers.origin;

    if (!origin) {
        return true;
    }

    const host = запрос.headers.host;

    if (!host) {
        return false;
    }

    try {
        const адрес = new URL(origin);

        return (
            адрес.host === host &&
            (адрес.protocol === "http:" ||
                адрес.protocol === "https:")
        );
    } catch {
        return false;
    }
}

/** Токен верен, если совпал cookie или заголовок. */
function токенВерен(запрос: IncomingMessage): boolean {
    const эталон = получитьТокен();

    const изCookie = прочитатьCookie(
        запрос,
        ИМЯ_COOKIE_ТОКЕНА,
    );

    if (изCookie !== null && совпалоБезопасно(изCookie, эталон)) {
        return true;
    }

    const изЗаголовка = запрос.headers[ЗАГОЛОВОК_ТОКЕНА];

    if (
        typeof изЗаголовка === "string" &&
        совпалоБезопасно(изЗаголовка, эталон)
    ) {
        return true;
    }

    return false;
}

/** Ответ-отказ по-русски, в формате JSON. */
function отклонить(
    запрос: IncomingMessage,
    ответ: ServerResponse,
    код: number,
    сообщение: string,
): void {
    if (ответ.headersSent) {
        запрос.destroy();

        return;
    }

    ответ.statusCode = код;

    ответ.setHeader(
        "Content-Type",
        "application/json; charset=utf-8",
    );

    ответ.end(
        JSON.stringify({
            успешно: false,
            сообщение,
        }),
    );

    дочитатьТело(запрос);
}

/**
 * Дочитывает и выбрасывает остаток тела после отказа.
 *
 * Оборвать соединение сразу нельзя: браузер ещё отправляет тело,
 * получит ECONNRESET и не увидит наш ответ (именно так «ломался»
 * 413 на большом теле). Поэтому дочитываем остаток, но не дольше
 * пяти секунд — чтобы медленный клиент не держал сокет вечно.
 */
function дочитатьТело(запрос: IncomingMessage): void {
    if (запрос.readableEnded || запрос.destroyed) {
        return;
    }

    const сторож = setTimeout(() => {
        запрос.destroy();
    }, 5000);

    // Сторож не должен сам держать процесс живым.
    сторож.unref();

    запрос.on("error", () => {
        clearTimeout(сторож);
    });

    запрос.once("end", () => {
        clearTimeout(сторож);
    });

    запрос.once("close", () => {
        clearTimeout(сторож);
    });

    запрос.resume();
}

/**
 * Лимит тела запроса (п. 4): сначала по Content-Length, затем
 * счётчиком по фактическим кускам — сверх лимита → 413.
 */
function ограничитьТело(
    запрос: IncomingMessage,
    ответ: ServerResponse,
): boolean {
    const сыраяДлина = запрос.headers["content-length"];

    if (сыраяДлина !== undefined) {
        const размер = Number(сыраяДлина);

        if (Number.isFinite(размер) && размер > ЛИМИТ_ТЕЛА_ЗАПРОСА) {
            отклонить(
                запрос,
                ответ,
                413,
                `Тело запроса больше ${Math.round(ЛИМИТ_ТЕЛА_ЗАПРОСА / 1024 / 1024)} МБ.`,
            );

            return false;
        }
    }

    let накоплено = 0;

    const считать = (часть: Buffer): void => {
        накоплено += часть.length;

        if (накоплено <= ЛИМИТ_ТЕЛА_ЗАПРОСА) {
            return;
        }

        // Мост больше не должен отвечать на этот запрос — ответ 413
        // отправляем мы. Снимаем свой счётчик и обработчики моста;
        // остаток тела дочитает отклонить().
        запрос.removeAllListeners("data");
        запрос.removeAllListeners("end");
        запрос.removeAllListeners("error");

        // Ошибка «оборванного» тела нас больше не волнует.
        запрос.on("error", () => {
            // намеренно пусто
        });

        отклонить(
            запрос,
            ответ,
            413,
            `Тело запроса больше ${Math.round(ЛИМИТ_ТЕЛА_ЗАПРОСА / 1024 / 1024)} МБ.`,
        );
    };

    запрос.on("data", считать);

    запрос.once("end", () => {
        запрос.removeListener("data", считать);
    });

    return true;
}

/**
 * Обёртка для мостов `/api/*`: Origin → токен → лимит тела,
 * и только затем — сам обработчик.
 *
 * Всё, что не начинается с `/api/` (страница, статика, исходники,
 * HMR, служебные ручки Vite), уходит дальше по цепочке без проверок:
 * иначе первая же загрузка страницы получала бы 401.
 */
export function защититьМост(
    обработчик: ОбработчикМоста,
): ОбработчикМоста {
    return (запрос, ответ, следующий) => {
        if (!этоМаршрутAPI(запрос)) {
            следующий();

            return;
        }

        if (!originСовпадает(запрос)) {
            отклонить(
                запрос,
                ответ,
                403,
                "Запрос с чужого Origin отклонён.",
            );

            return;
        }

        if (!токенВерен(запрос)) {
            отклонить(
                запрос,
                ответ,
                401,
                "Запрос без токена «Улитки». Обнови страницу терминала.",
            );

            return;
        }

        if (!ограничитьТело(запрос, ответ)) {
            return;
        }

        обработчик(запрос, ответ, следующий);
    };
}

/**
 * Отдаёт странице HttpOnly-cookie с токеном (вызывается на GET
 * главной страницы и статики). Уже валидный cookie не трогаем.
 */
export function выдатьCookieТокена(
    запрос: IncomingMessage,
    ответ: ServerResponse,
): void {
    if (
        запрос.method !== "GET" &&
        запрос.method !== "HEAD"
    ) {
        return;
    }

    const путь = путьЗапроса(запрос);

    if (путь === null) {
        return;
    }

    // Cookie нужна странице, а не самим API-запросам.
    if (путь.startsWith("/api/")) {
        return;
    }

    if (токенВерен(запрос)) {
        return;
    }

    ответ.setHeader(
        "Set-Cookie",
        `${ИМЯ_COOKIE_ТОКЕНА}=${получитьТокен()}; Path=/; HttpOnly; SameSite=Strict; Max-Age=86400`,
    );
}
