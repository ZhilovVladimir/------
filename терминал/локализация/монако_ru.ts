/**
 * ============================================================
 * 🐌 СЛОВАРЬ ПЕРЕВОДА MONACO (день 7)
 * ============================================================
 *
 * Переводит видимые пользователю строки виджетов Monaco
 * (поиск и замена, подсказки, палитра команд, быстрый переход,
 * всплывающие подсказки, сворачивание).
 *
 * Применяется Vite-плагином `локализацияMonaco()` из `vite.config.ts`:
 * плагин находит `localize(номер, "Английская строка")` в файлах
 * `monaco-editor/esm/**` и подставляет русский текст.
 *
 * Служебные строки (описания контекстных ключей вроде "Whether…")
 * не переводятся — их никто не видит; скрипт `инструменты/
 * проверить_локализацию.cjs` проверяет, что видимых английских
 * строк не осталось.
 */

export const переводMonaco: Readonly<Record<string, string>> = {
    // --------------------------------------------------------
    // Поиск и замена
    // --------------------------------------------------------

    "Find / Replace": "Поиск и замена",
    "Find": "Найти",
    "Replace": "Заменить",
    "Replace All": "Заменить всё",
    "Toggle Replace": "Показать замену",
    "Find in Selection": "Искать в выделенном",
    "Previous Match": "Предыдущее совпадение",
    "Next Match": "Следующее совпадение",
    "No results": "Ничего не найдено",
    "No matches. Try searching for something else.":
        "Совпадений нет. Попробуйте другой запрос.",
    "The file is too large to perform a replace all operation.":
        "Файл слишком большой для замены всех вхождений.",

    // Переключатели поля поиска
    "Match Case": "С учётом регистра",
    "Match Whole Word": "По целым словам",
    "Use Regular Expression": "Регулярное выражение",
    "Preserve Case": "Сохранять регистр",

    // --------------------------------------------------------
    // Подсказки кода
    // --------------------------------------------------------

    "No suggestions.": "Нет подсказок.",
    "Loading...": "Загрузка…",
    "Suggest": "Подсказки",
    "Insert": "Вставить",
    "Select": "Выбрать",
    "Show More": "Показать больше",
    "Show Less": "Показать меньше",
    "Read More": "Подробнее",
    "Close": "Закрыть",

    // --------------------------------------------------------
    // Палитра, быстрый переход
    // --------------------------------------------------------

    "Go to line. Type a line number, optionally followed by colon and column number.":
        "Перейти к строке. Введите номер строки, при необходимости — двоеточие и номер столбца.",
    "Open a text editor first to go to a line or an offset.":
        "Сначала откройте текстовый файл, чтобы перейти к строке.",
    "Toggle Zero-Based Offset": "Нумерация с нуля",
    "No editor symbols": "Нет символов в файле",
    "No matching editor symbols": "Совпадающих символов нет",
    "Open to the Bottom": "Открыть внизу",
    "Open to the Side": "Открыть справа",
    "To go to a symbol, first open a text editor with symbol information.":
        "Чтобы перейти к символу, сначала откройте файл со сведениями о символах.",
    "The active text editor does not provide symbol information.":
        "Активный редактор не предоставляет сведения о символах.",

    // --------------------------------------------------------
    // Всплывающие подсказки (hover)
    // --------------------------------------------------------

    "Copy": "Копировать",
    "Copied to clipboard": "Скопировано в буфер обмена",
    "Checking for quick fixes...": "Проверка быстрых исправлений…",
    "No quick fixes available": "Быстрых исправлений нет",
    "Quick Fix...": "Быстрое исправление…",
    "View Problem": "Показать проблему",
    "Increase Hover Verbosity": "Увеличить подробность подсказки",
    "Decrease Hover Verbosity": "Уменьшить подробность подсказки",
    "Increase Hover Verbosity Level": "Увеличить подробность подсказки",
    "Decrease Hover Verbosity Level": "Уменьшить подробность подсказки",

    // --------------------------------------------------------
    // Сворачивание кода
    // --------------------------------------------------------

    "Click to collapse the range.": "Нажмите, чтобы свернуть.",
    "Click to expand the range.": "Нажмите, чтобы развернуть.",

    // --------------------------------------------------------
    // Строки с подстановками ({0}, {1} — как в оригинале)
    // --------------------------------------------------------

    "Accepting '{0}' made {1} additional edits":
        "Применение «{0}» добавило ещё {1} правок",
    "Go to line {0}, column {1}. Press Enter to navigate.":
        "Перейти к строке {0}, столбец {1}. Нажмите Enter.",
    "Line {0}, column {1}: {2}": "Строка {0}, столбец {1}: {2}",
    "Only the first {0} results are highlighted, but all find operations work on the entire text.":
        "Подсвечены только первые {0} совпадений, но поиск работает по всему тексту.",
    "Please type a number between 1 and {0}":
        "Введите число от 1 до {0}",
    "Press 'Enter' to go to line {0} at column {1}.":
        "Нажмите Enter, чтобы перейти к строке {0}, столбец {1}.",
    "Press 'Enter' to go to line {0} or enter a column number (from 1 to {1}).":
        "Нажмите Enter, чтобы перейти к строке {0}, или введите номер столбца (от 1 до {1}).",
    "Press 'Enter' to go to line {0} or enter colon : to add a column number.":
        "Нажмите Enter, чтобы перейти к строке {0}, или введите двоеточие : и номер столбца.",
    "Press {0} for accessibility help":
        "Нажмите {0} — откроется справка",
    "Rendering paused for long line for performance reasons. This can be configured via `editor.stopRenderingLineAfter`. [Don't Show Again](command:{0})":
        "Отрисовка длинной строки приостановлена ради скорости. Настройка: `editor.stopRenderingLineAfter`. [Больше не показывать](command:{0})",
    "Tokenization is skipped for long lines for performance reasons. This can be configured via `editor.maxTokenizationLineLength`. [Don't Show Again](command:{0})":
        "Подсветка длинной строки пропущена ради скорости. Настройка: `editor.maxTokenizationLineLength`. [Больше не показывать](command:{0})",
    "Type a character position to go to (from 0 to {0}).":
        "Введите позицию символа (от 0 до {0}).",
    "Type a character position to go to (from 1 to {0}).":
        "Введите позицию символа (от 1 до {0}).",
    "Type a line number to go to (from 1 to {0}).":
        "Введите номер строки (от 1 до {0}).",
    "Type a number to go to a specific match (between 1 and {0})":
        "Введите число, чтобы перейти к совпадению (от 1 до {0})",
};
