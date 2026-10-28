/**
 * ============================================================
 * 🐌 ПРОВЕРКА ЛОКАЛИЗАЦИИ MONACO (день 8)
 * ============================================================
 *
 * Запуск:  node инструменты/проверить_локализацию.cjs
 *
 * Что делает: обходит виджеты Monaco (поиск, подсказки, палитра,
 * переход, hover, сворачивание), извлекает из них localize-литералы
 * и сверяет со словарём `терминал/локализация/монако_ru.ts`.
 *
 * Выход с кодом 1 — если остались видимые английские строки.
 * Служебные строки (описания контекстных ключей) исключены.
 */

const fs = require("fs");
const path = require("path");

const КОРЕНЬ_ПРОЕКТА = path.join(__dirname, "..");

const СЛОВАРЬ_ПУТЬ = path.join(
    КОРЕНЬ_ПРОЕКТА,
    "терминал",
    "локализация",
    "монако_ru.ts",
);

const МОНКО_ПУТЬ = path.join(
    КОРЕНЬ_ПРОЕКТА,
    "node_modules",
    "monaco-editor",
    "esm",
    "vs",
);

/** Папки Monaco, чьи строки видит пользователь. */
const ПАПКИ_ВИДЖЕТОВ = [
    "editor/contrib/find/browser",
    "base/browser/ui/findinput",
    "editor/contrib/suggest/browser",
    "editor/standalone/browser/quickInput",
    "base/browser/ui/quickInput",
    "editor/contrib/quickAccess",
    "editor/contrib/hover/browser",
    "editor/contrib/folding/browser",
    "editor/standalone/browser",
];

/** Служебные строки — их никто не видит, переводить не нужно. */
const СЛУЖЕБНЫЕ = [
    /^A context key that is true/,
    /^Background color behind folded/,
    /^Color of the collapsed text/,
    /^Whether /,
];

// ============================================================
// 1. СЛОВАРЬ ПЕРЕВОДА (читаем .ts простым разбором)
// ============================================================

if (!fs.existsSync(СЛОВАРЬ_ПУТЬ)) {
    console.error("Не найден словарь:", СЛОВАРЬ_ПУТЬ);
    process.exit(1);
}

const кодСлововаря = fs.readFileSync(СЛОВАРЬ_ПУТЬ, "utf8");

const словарь = new Map();

for (const совпадение of кодСлововаря.matchAll(
    /"((?:[^"\\]|\\.)*)"\s*:\s*\n?\s*"((?:[^"\\]|\\.)*)"/g,
)) {
    const английская = совпадение[1]
        .replace(/\\"/g, '"')
        .replace(/\\n/g, "\n");
    const русская = совпадение[2].replace(/\\"/g, '"');

    if (английская && русская && английская !== русская) {
        словарь.set(английская, русская);
    }
}

// ============================================================
// 2. СБОР ЛИТЕРАЛОВ ИЗ MONACO
// ============================================================

const РЕГЕКС = /localize\(\s*[\w.]+\s*,\s*"((?:[^"\\]|\\.)*)"/g;

const видимые = new Map(); // строка -> [файлы]
const служебные = new Map();

function обход(папка) {
    let записи;
    try {
        записи = fs.readdirSync(папка, { withFileTypes: true });
    } catch {
        return;
    }

    for (const запись of записи) {
        const путь = path.join(папка, запись.name);

        if (запись.isDirectory()) {
            обход(путь);
            continue;
        }

        if (!запись.name.endsWith(".js")) {
            continue;
        }

        const код = fs.readFileSync(путь, "utf8");
        const относительный = path.relative(МОНКО_ПУТЬ, путь);

        for (const совпадение of код.matchAll(РЕГЕКС)) {
            const строка = совпадение[1]
                .replace(/\\'/g, "'")
                .replace(/\\"/g, '"');

            // Только «человеческие» строки: начинается с заглавной.
            if (!/^[A-Z]/.test(строка)) {
                continue;
            }

            const цель = СЛУЖЕБНЫЕ.some((маска) =>
                маска.test(строка),
            )
                ? служебные
                : видимые;

            if (!цель.has(строка)) {
                цель.set(строка, []);
            }

            цель.get(строка).push(относительный);
        }
    }
}

for (const папка of ПАПКИ_ВИДЖЕТОВ) {
    обход(path.join(МОНКО_ПУТЬ, папка));
}

// ============================================================
// 3. СВЕРКА
// ============================================================

const непереведённые = [...видимые.keys()]
    .filter((строка) => !словарь.has(строка))
    .sort();

const лишние = [...словарь.keys()]
    .filter((строка) => !видимые.has(строка) && !служебные.has(строка))
    .sort();

console.log("Видимых литералов найдено:", видимые.size);
console.log("Служебных (не переводятся):", служебные.size);
console.log("Строк в словаре:", словарь.size);
console.log("");

if (лишние.length > 0) {
    console.log(
        `⚠ В словаре ${лишние.length} строк, которых больше нет в Monaco (устарели?):`
    );
    for (const строка of лишние) {
        console.log("   -", строка);
    }
    console.log("");
}

if (непереведённые.length === 0) {
    console.log("✅ Непереведённых видимых строк: 0 — английского нет.");
} else {
    console.log(
        `❌ Непереведённых видимых строк: ${непереведённые.length}:`
    );
    for (const строка of непереведённые) {
        console.log("   -", JSON.stringify(строка));
        console.log("     файл:", видимые.get(строка)[0]);
    }
    process.exitCode = 1;
}
