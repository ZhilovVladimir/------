/**
 * ============================================================
 * 🐌 УЛИТКА — ТЕРМИНАЛ
 * Управляющее ядро интерфейса
 * ============================================================
 */

// Признак dev-режима: Vite подставляет true в dev-режиме
// и false в собранном интерфейсе (см. define в vite.config.ts).
declare const __УЛИТКА_DEV__: boolean;

import * as monaco from "monaco-editor";

import РедакторВоркер from "monaco-editor/editor/editor.worker?worker";

// Monaco должен получить воркер ДО первого создания редактора.
Object.assign(self, {
    MonacoEnvironment: {
        getWorker: (): Worker => new РедакторВоркер(),
    },
});

// Единый словарь языка — его же читает компилятор.
import {
    КлючевыеСлова,
    ЛогическиеОператоры,
    ОдносимвольныеОператоры,
    ДвухсимвольныеОператоры,
    СимволКомментария,
} from "../../исходники/словарь_языка.js";

// Внутренние системные идентификаторы — Monaco требует латиницу.
// Всё, что видит пользователь, остаётся по-русски.
const ИДЕНТИФИКАТОР_ЯЗЫКА = "ulitka";

const ИДЕНТИФИКАТОР_ТЕМЫ = "ulitka";

/**
 * День 3: язык «улитка» — Monarch-токенизатор по общему словарю.
 * Плюс языковая конфигурация: комментарий `#`, скобки, автозакрытие.
 */
function зарегистрироватьЯзыкУлитки(): void {
    monaco.languages.register({
        id: ИДЕНТИФИКАТОР_ЯЗЫКА,
        extensions: [".ул"],
        aliases: ["Улитка", "улитка"],
    });

    monaco.languages.setLanguageConfiguration(
        ИДЕНТИФИКАТОР_ЯЗЫКА,
        {
            comments: {
                lineComment: СимволКомментария,
            },

            brackets: [
                ["(", ")"],
                ["[", "]"],
                ["{", "}"],
            ],

            autoClosingPairs: [
                { open: "(", close: ")" },
                { open: "[", close: "]" },
                { open: "{", close: "}" },
                { open: '"', close: '"', notIn: ["string"] },
            ],

            surroundingPairs: [
                { open: "(", close: ")" },
                { open: "[", close: "]" },
                { open: "{", close: "}" },
                { open: '"', close: '"' },
            ],
        },
    );

    monaco.languages.setMonarchTokensProvider(
        ИДЕНТИФИКАТОР_ЯЗЫКА,
        {
            defaultToken: "",

            keywords: [...КлючевыеСлова],

            logical: [...ЛогическиеОператоры],

            tokenizer: {
                root: [
                    // Комментарий — до конца строки.
                    [/#.*$/, "comment"],

                    // Текст в кавычках (внутри — что угодно, кроме кавычки).
                    [/"/, { token: "string", next: "@string" }],

                    // Целые числа — как в компиляторе.
                    [/\d+/, "number"],

                    // Слова: ключевое / логическое / имя.
                    [
                        /[А-Яа-яЁёA-Za-z_][А-Яа-яЁёA-Za-z0-9_]*/,
                        {
                            cases: {
                                "@keywords": "keyword",
                                "@logical": "keyword.logical",
                                "@default": "identifier",
                            },
                        },
                    ],

                    [/[()[\]{}.,]/, "delimiter"],

                    [
                        new RegExp(
                            [...ДвухсимвольныеОператоры, ...ОдносимвольныеОператоры]
                                .map((оператор) =>
                                    оператор.replace(
                                        /[.*+?^${}()|[\]\\]/g,
                                        "\\$&",
                                    ),
                                )
                                .join("|"),
                        ),
                        "operator",
                    ],

                    [/[ \t\r\n]+/, "white"],
                ],

                string: [
                    [/[^"]+/, "string"],
                    [/"/, { token: "string", next: "@pop" }],
                ],
            },
        },
    );
}

/**
 * День 4: своя тема — палитра терминала (глубокий тёмно-синий фон,
 * янтарный курсор и ключевые слова, циановые строки).
 */
function создатьТемуУлитки(): void {
    monaco.editor.defineTheme(ИДЕНТИФИКАТОР_ТЕМЫ, {
        base: "vs-dark",
        inherit: true,

        rules: [
            { token: "", foreground: "CFE3FF" },
            { token: "keyword", foreground: "F0A830", fontStyle: "bold" },
            { token: "keyword.logical", foreground: "E8C87A" },
            { token: "comment", foreground: "4A6A8A", fontStyle: "italic" },
            { token: "string", foreground: "4FD1FF" },
            { token: "number", foreground: "FFD166" },
            { token: "operator", foreground: "9FD8FF" },
            { token: "delimiter", foreground: "6F8EA8" },
            { token: "identifier", foreground: "CFE3FF" },
            { token: "white", foreground: "CFE3FF" },
        ],

        colors: {
            "editor.background": "#07111A",
            "editor.foreground": "#CFE3FF",
            "editorCursor.foreground": "#F0A830",
            "editor.lineHighlightBackground": "#0A1622",
            "editor.lineHighlightBorder": "#0A1622",
            "editor.selectionBackground": "#123A52",
            "editor.inactiveSelectionBackground": "#0E2A3C",
            "editorLineNumber.foreground": "#4A6A8A",
            "editorLineNumber.activeForeground": "#F0A830",
            "editorIndentGuide.background": "#12222E",
            "editorIndentGuide.activeBackground": "#1C2D3A",
            "editorWhitespace.foreground": "#1C2D3A",
            "editorWidget.background": "#07111A",
            "editorWidget.border": "#1C2D3A",
            "editorSuggestWidget.background": "#07111A",
            "editorSuggestWidget.border": "#1C2D3A",
            "editorSuggestWidget.selectedBackground": "#123A52",
            "input.background": "#030611",
            "input.border": "#1C2D3A",
            "scrollbarSlider.background": "#12222EAA",
            "scrollbarSlider.hoverBackground": "#1C2D3ACC",
            "scrollbarSlider.activeBackground": "#4FD1FFAA",
        },
    });
}


// ============================================================
// ДЕНЬ 5: АВТОДОПОЛНЕНИЕ — СЛОВА, ОПИСАНИЯ, СНИППЕТЫ
// ============================================================

/**
 * Описания ключевых слов для подсказок.
 * Честно: что работает — так и описано, резерв помечен как резерв.
 */
const описанияСлов: Record<string, string> = {

    // Работает
    программа: "Каркас программы: `программа имя` + `начало` … `конец`",
    начало: "Начало тела программы (после имени)",
    конец: "Закрывает блок: программу, функцию или условие",
    показать: "Вывести значение в консоль",
    пусть: "Объявить переменную: `пусть имя = значение`",
    если: "Условие: `если выражение тогда` … `конец`",
    тогда: "Блок условия — выполняется, если условие верно",
    иначе: "Альтернативный блок условия",
    функция: "Описать функцию: `функция имя(аргументы)` … `конец`",
    вернуть: "Вернуть результат из функции",

    // Резерв — заявлено в языке, пока не реализовано
    и: "Логическое «и» — резерв, пока не работает",
    или: "Логическое «или» — резерв, пока не работает",
    не: "Логическое отрицание — резерв, пока не работает",
    истина: "Логическое «истина» — резерв, пока не работает",
    ложь: "Логическое «ложь» — резерв, пока не работает",
    пока: "Цикл «пока» — резерв, пока не работает",
    для: "Цикл «для» — резерв, пока не работает",
    из: "Слово языка — резерв, пока не работает",
    в: "Слово языка — резерв, пока не работает",
    новый: "Создание объекта — резерв, пока не работает",
};

/** Готовые конструкции (Tab разворачивает подсказку в блок). */
const сниппетыЯзыка: ReadonlyArray<{
    метка: string;
    подробно: string;
    текст: string;
}> = [
    {
        метка: "программа (каркас)",
        подробно: "Имя, начало, тело, конец",
        текст:
            "программа ${1:имя_программы}\n\nначало\n\t$0\nконец",
    },
    {
        метка: "если … тогда … конец",
        подробно: "Условный блок",
        текст: "если ${1:условие} тогда\n\t$0\nконец",
    },
    {
        метка: "если … иначе … конец",
        подробно: "Условие с веткой иначе",
        текст: "если ${1:условие} тогда\n\t$2\nиначе\n\t$0\nконец",
    },
    {
        метка: "функция (каркас)",
        подробно: "Описание функции с возвратом",
        текст: "функция ${1:имя}(${2:аргументы})\n\t$0\nконец",
    },
    {
        метка: "пусть (переменная)",
        подробно: "Объявление переменной",
        текст: "пусть ${1:имя} = ${2:значение}",
    },
    {
        метка: "показать (вывод)",
        подробно: "Вывод значения в консоль",
        текст: "показать ${1:значение}",
    },
];

/** Регистрация провайдера автодополнения для языка «улитка». */
function зарегистрироватьДополнение(): void {

    // Кириллица не входит в стандартные «словообразующие» символы —
    // объявляем свои, чтобы подсказки появлялись при вводе русских букв.
    const буквы =
        "абвгдеёжзийклмнопрстуфхцчшщъыьэюя" +
        "abcdefghijklmnopqrstuvwxyz_";

    monaco.languages.registerCompletionItemProvider(
        ИДЕНТИФИКАТОР_ЯЗЫКА,
        {
            triggerCharacters: [...буквы],

            provideCompletionItems(
                модель,
                позиция,
            ): monaco.languages.CompletionList {
                const слово =
                    модель.getWordUntilPosition(позиция);

                const диапазон = new monaco.Range(
                    позиция.lineNumber,
                    слово.startColumn,
                    позиция.lineNumber,
                    слово.endColumn,
                );

                const общий = {
                    range: диапазон,
                    kind: monaco.languages.CompletionItemKind.Keyword,
                };

                const список: monaco.languages.CompletionList = {
                    incomplete: false,
                    suggestions: [],
                };

                for (const ключевое of КлючевыеСлова) {
                    список.suggestions.push({
                        ...общий,
                        label: ключевое,
                        insertText: ключевое,
                        detail:
                            описанияСлов[ключевое] ??
                            "ключевое слово «Улитки»",
                    });
                }

                for (const сниппет of сниппетыЯзыка) {
                    список.suggestions.push({
                        ...общий,
                        label: сниппет.метка,
                        kind: monaco.languages.CompletionItemKind.Snippet,
                        insertText: сниппет.текст,
                        insertTextRules:
                            monaco.languages.CompletionItemInsertTextRule
                                .InsertAsSnippet,
                        detail: сниппет.подробно,
                    });
                }

                return список;
            },
        },
    );
}


// ============================================================
// ДЕНЬ 6: СВОЁ КОНТЕКСТНОЕ МЕНЮ (ПОЛНОСТЬЮ ПО-РУССКИ)
// ============================================================

type ПунктМеню =
    | { разделитель: true }
    | {
          подпись: string;
          хоткей: string;
          команда: string;
          доступно?: () => boolean;
      };

const пунктыКонтекстногоМеню: ПунктМеню[] = [
    {
        подпись: "Отменить",
        хоткей: "Ctrl+Z",
        команда: "undo",
        доступно: () => редакторМонако?.getModel()?.canUndo() ?? false,
    },
    {
        подпись: "Повторить",
        хоткей: "Ctrl+Y",
        команда: "redo",
        доступно: () => редакторМонако?.getModel()?.canRedo() ?? false,
    },
    { разделитель: true },
    {
        подпись: "Вырезать",
        хоткей: "Ctrl+X",
        команда: "editor.action.clipboardCutAction",
    },
    {
        подпись: "Копировать",
        хоткей: "Ctrl+C",
        команда: "editor.action.clipboardCopyAction",
    },
    {
        подпись: "Вставить",
        хоткей: "Ctrl+V",
        команда: "editor.action.clipboardPasteAction",
    },
    { разделитель: true },
    {
        подпись: "Выделить всё",
        хоткей: "Ctrl+A",
        команда: "selectAll",
    },
];

/**
 * Перехват правой кнопки + своё меню без единого английского слова.
 */
function настроитьКонтекстноеМеню(
    редактор: monaco.editor.IStandaloneCodeEditor,
): void {

    const контейнер = редактор.getContainerDomNode();

    let открытоеМеню: HTMLDivElement | null = null;

    const снятьОбработчики: Array<() => void> = [];

    const закрытьМеню = (): void => {
        открытоеМеню?.remove();
        открытоеМеню = null;

        for (const снять of снятьОбработчики) {
            снять();
        }

        снятьОбработчики.length = 0;
    };

    const добавитьСлушатель = (
        цель: EventTarget,
        тип: string,
        обработчик: (событие: Event) => void,
        опции?: boolean | AddEventListenerOptions,
    ): void => {
        цель.addEventListener(тип, обработчик, опции);

        снятьОбработчики.push(() =>
            цель.removeEventListener(тип, обработчик, опции),
        );
    };

    контейнер.addEventListener("contextmenu", (событие) => {
        событие.preventDefault();

        закрытьМеню();

        const меню = document.createElement("div");

        меню.className = "контекстное-меню-редактора";

        меню.setAttribute("role", "menu");

        меню.setAttribute(
            "aria-label",
            "Контекстное меню редактора",
        );

        for (const пункт of пунктыКонтекстногоМеню) {
            if ("разделитель" in пункт) {
                const линия = document.createElement("div");

                линия.className =
                    "разделитель-контекстного-меню";

                линия.setAttribute("aria-hidden", "true");

                меню.append(линия);

                continue;
            }

            const кнопка = document.createElement("button");

            кнопка.type = "button";

            кнопка.className =
                "пункт-контекстного-меню";

            кнопка.setAttribute("role", "menuitem");

            const подпись =
                document.createElement("span");

            подпись.className =
                "подпись-контекстного-меню";

            подпись.textContent = пункт.подпись;

            const хоткей =
                document.createElement("span");

            хоткей.className =
                "хоткей-контекстного-меню";

            хоткей.textContent = пункт.хоткей;

            кнопка.append(подпись, хоткей);

            if (пункт.доступно && !пункт.доступно()) {
                кнопка.disabled = true;
            }

            кнопка.addEventListener("click", () => {
                закрытьМеню();

                редактор.trigger(
                    "контекстное-меню",
                    пункт.команда,
                    null,
                );

                редактор.focus();
            });

            меню.append(кнопка);
        }

        document.body.append(меню);

        открытоеМеню = меню;

        // Не вылезать за края окна.
        const габарит = меню.getBoundingClientRect();

        const слева = Math.min(
            событие.clientX,
            window.innerWidth - габарит.width - 8,
        );

        const сверху = Math.min(
            событие.clientY,
            window.innerHeight - габарит.height - 8,
        );

        меню.style.left = `${Math.max(8, слева)}px`;

        меню.style.top = `${Math.max(8, сверху)}px`;

        // Закрытие: клик вне, Escape, прокрутка, потеря окна.
        добавитьСлушатель(
            document,
            "mousedown",
            (событие) => {
                const цель = событие.target as Node;

                if (!меню.contains(цель)) {
                    закрытьМеню();
                }
            },
            true,
        );

        добавитьСлушатель(
            document,
            "keydown",
            (событие) => {
                if (
                    (событие as KeyboardEvent).key ===
                    "Escape"
                ) {
                    закрытьМеню();

                    редактор.focus();
                }
            },
            true,
        );

        добавитьСлушатель(
            window,
            "blur",
            закрытьМеню,
        );

        добавитьСлушатель(
            document,
            "scroll",
            закрытьМеню,
            true,
        );
    });
}

type СостояниеТерминала =
    | "готов"
    | "выполнение"
    | "остановлено"
    | "завершено";

type ТипРазделителя =
    | "проект"
    | "наблюдение"
    | "консоль";

interface ЭлементыТерминала {
    кнопкаЗапуск: HTMLButtonElement | null;
    кнопкаОстановка: HTMLButtonElement | null;
    кнопкаСостояниеGit: HTMLButtonElement | null;
    кнопкаИзмененияGit: HTMLButtonElement | null;
    кнопкаИсторияGit: HTMLButtonElement | null;

    вывод: HTMLElement | null;
    состояние: HTMLElement | null;
    состояниеСистемы: HTMLElement | null;
    состояниеРедактора: HTMLElement | null;

    редакторИсходногоКода: HTMLTextAreaElement | null;
    подсветкаКода: HTMLElement | null;
    номераСтрок: HTMLElement | null;
    полеРедактора: HTMLElement | null;

    переменные: HTMLElement | null;
    функции: HTMLElement | null;

    приложение: HTMLElement | null;

    разделительПроекта: HTMLElement | null;
    разделительНаблюдения: HTMLElement | null;
    разделительКонсоли: HTMLElement | null;
}

interface ОтветGit {
    успешно: boolean;
    сообщение: string;
    вывод?: string;
}

interface ОбъявленнаяФункция {
    имя: string;
    параметры: string[];
}

interface РезультатВыполнения {
    успешно: boolean;
    сообщение: string;
    вывод?: string[];
    переменные?: Record<string, unknown>;
    события?: unknown[];
    диагностика?: unknown;
    состояние?: string;
    дерево?: unknown;
    функции?: ОбъявленнаяФункция[];
    трехмернаяСистема?: {
        узлов: number;
        связей: number;
        событий: number;
    };
}

const элементы: ЭлементыТерминала = {
    кнопкаЗапуск:
        document.getElementById(
            "кнопка-запуск",
        ) as HTMLButtonElement | null,

    кнопкаОстановка:
        document.getElementById(
            "кнопка-остановка",
        ) as HTMLButtonElement | null,

    кнопкаСостояниеGit:
        document.getElementById(
            "кнопка-состояние-git",
        ) as HTMLButtonElement | null,

    кнопкаИзмененияGit:
        document.getElementById(
            "кнопка-изменения-git",
        ) as HTMLButtonElement | null,

    кнопкаИсторияGit:
        document.getElementById(
            "кнопка-история-git",
        ) as HTMLButtonElement | null,

    вывод:
        document.getElementById(
            "вывод",
        ),

    состояние:
        document.getElementById(
            "состояние",
        ),

    состояниеСистемы:
        document.getElementById(
            "состояние-системы",
        ),

    состояниеРедактора:
        document.getElementById(
            "состояние-редактора",
        ),

    редакторИсходногоКода:
        document.getElementById(
            "редактор-исходного-кода",
        ) as HTMLTextAreaElement | null,

    подсветкаКода:
        document.getElementById(
            "подсветка-кода",
        ),

    номераСтрок:
        document.getElementById(
            "номера-строк",
        ),

    полеРедактора:
        document.getElementById(
            "поле-редактора",
        ),

    переменные:
        document.getElementById(
            "переменные",
        ),

    функции:
        document.getElementById(
            "функции",
        ),

    приложение:
        document.getElementById(
            "приложение",
        ),

    разделительПроекта:
        document.getElementById(
            "разделитель-проекта",
        ),

    разделительНаблюдения:
        document.getElementById(
            "разделитель-наблюдения",
        ),

    разделительКонсоли:
        document.getElementById(
            "разделитель-консоли",
        ),
};

let состояниеТерминала:
    СостояниеТерминала = "готов";

let запросВыполнения:
    AbortController | null = null;

/**
 * Экземпляр Monaco-редактора (день 2).
 * Старые функции подсветки (подсветитьКод, обновитьПодсветкуКода
 * и др.) пока сохранены, но не вызываются.
 */
let редакторМонако:
    monaco.editor.IStandaloneCodeEditor | null = null;

/**
 * ============================================================
 * ВЫВОД
 * ============================================================
 */

function добавитьВывод(
    сообщение: string,
): void {
    if (!элементы.вывод) {
        return;
    }

    const строки =
        сообщение.split(/\r?\n/);

    for (const строкаТекста of строки) {
        const строка =
            document.createElement("div");

        строка.textContent =
            строкаТекста;

        элементы.вывод.appendChild(
            строка,
        );
    }

    элементы.вывод.scrollTop =
        элементы.вывод.scrollHeight;
}

function очиститьКонсоль(): void {
    if (!элементы.вывод) {
        return;
    }

    элементы.вывод.innerHTML = "";
}

/**
 * ============================================================
 * СОСТОЯНИЕ
 * ============================================================
 */

function установитьСостояние(
    новоеСостояние: СостояниеТерминала,
): void {
    состояниеТерминала =
        новоеСостояние;

    if (элементы.состояние) {
        switch (новоеСостояние) {
            case "готов":
                элементы.состояние.textContent =
                    "● Готово";
                break;

            case "выполнение":
                элементы.состояние.textContent =
                    "● Выполнение";
                break;

            case "остановлено":
                элементы.состояние.textContent =
                    "● Остановлено";
                break;

            case "завершено":
                элементы.состояние.textContent =
                    "● Завершено";
                break;
        }
    }

    if (элементы.состояниеСистемы) {
        switch (новоеСостояние) {
            case "готов":
                элементы.состояниеСистемы.textContent =
                    "● Система готова";
                break;

            case "выполнение":
                элементы.состояниеСистемы.textContent =
                    "● Программа выполняется";
                break;

            case "остановлено":
                элементы.состояниеСистемы.textContent =
                    "● Выполнение остановлено";
                break;

            case "завершено":
                элементы.состояниеСистемы.textContent =
                    "● Программа завершена";
                break;
        }
    }

    if (элементы.состояниеРедактора) {
        switch (новоеСостояние) {
            case "готов":
                элементы.состояниеРедактора.textContent =
                    "готов";
                break;

            case "выполнение":
                элементы.состояниеРедактора.textContent =
                    "выполнение";
                break;

            case "остановлено":
                элементы.состояниеРедактора.textContent =
                    "остановлено";
                break;

            case "завершено":
                элементы.состояниеРедактора.textContent =
                    "завершено";
                break;
        }
    }
}

/**
 * ============================================================
 * РЕДАКТОР
 * ============================================================
 */

function экранироватьHTML(
    текст: string,
): string {
    return текст
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function подсветитьСтроку(
    строка: string,
): string {
    if (строка.length === 0) {
        return "";
    }

    let результат = "";
    let позиция = 0;

    const добавитьТекст =
        (
            начало: number,
            конец: number,
        ): void => {
            if (конец <= начало) {
                return;
            }

            const фрагмент =
                строка.slice(
                    начало,
                    конец,
                );

            let экранированный =
                экранироватьHTML(
                    фрагмент,
                );

            экранированный =
                экранированный.replace(
                    /(\b\d+(?:\.\d+)?\b)/g,
                    '<span class="число">$1</span>',
                );

            экранированный =
                экранированный.replace(
                    /\b(истина|ложь)\b/g,
                    '<span class="логическое">$1</span>',
                );

            экранированный =
                экранированный.replace(
                    /\b(программа|начало|конец|пусть|показать|если|тогда|иначе|повторить|раз|функция|вернуть)\b/g,
                    '<span class="ключевое">$1</span>',
                );

            экранированный =
                экранированный.replace(
                    /(==|!=|>=|<=|>|<|\+|-|\*|\/|%|=|\bи\b|\bили\b|\bне\b)/g,
                    '<span class="оператор">$1</span>',
                );

            результат +=
                экранированный;
        };

    while (позиция < строка.length) {
        const символ =
            строка[позиция];

        if (символ === "#") {
            добавитьТекст(
                0,
                позиция,
            );

            результат +=
                `<span class="комментарий">${экранироватьHTML(
                    строка.slice(позиция),
                )}</span>`;

            return результат;
        }

        if (символ === '"') {
            добавитьТекст(
                0,
                позиция,
            );

            let конец =
                позиция + 1;

            while (
                конец < строка.length
            ) {
                if (
                    строка[конец] === "\\" &&
                    конец + 1 < строка.length
                ) {
                    конец += 2;
                    continue;
                }

                if (
                    строка[конец] === '"'
                ) {
                    конец++;
                    break;
                }

                конец++;
            }

            результат +=
                `<span class="текст">${экранироватьHTML(
                    строка.slice(
                        позиция,
                        конец,
                    ),
                )}</span>`;

            строка =
                строка.slice(
                    конец,
                );

            позиция = 0;
            continue;
        }

        позиция++;
    }

    if (позиция > 0) {
        добавитьТекст(
            0,
            позиция,
        );

        if (
            позиция < строка.length
        ) {
            результат +=
                экранироватьHTML(
                    строка.slice(
                        позиция,
                    ),
                );
        }

        return результат;
    }

    добавитьТекст(
        0,
        строка.length,
    );

    return результат;
}

function подсветитьКод(
    исходныйКод: string,
): string {
    const строки =
        исходныйКод.split("\n");

    return строки
        .map(
            (строка) =>
                подсветитьСтроку(
                    строка,
                ) || " ",
        )
        .join("\n");
}

function обновитьНомераСтрок(
    исходныйКод: string,
): void {
    if (!элементы.номераСтрок) {
        return;
    }

    const количествоСтрок =
        Math.max(
            1,
            исходныйКод.split("\n").length,
        );

    const фрагмент =
        document.createDocumentFragment();

    for (
        let номер = 1;
        номер <= количествоСтрок;
        номер++
    ) {
        const строка =
            document.createElement("div");

        строка.className = "номер";
        строка.textContent =
            String(номер);

        фрагмент.appendChild(
            строка,
        );
    }

    элементы.номераСтрок.innerHTML =
        "";

    элементы.номераСтрок.appendChild(
        фрагмент,
    );
}

function обновитьПодсветкуКода(): void {
    if (
        !элементы.редакторИсходногоКода ||
        !элементы.подсветкаКода
    ) {
        return;
    }

    const исходныйКод =
        элементы.редакторИсходногоКода.value;

    элементы.подсветкаКода.innerHTML =
        подсветитьКод(
            исходныйКод,
        );

    обновитьНомераСтрок(
        исходныйКод,
    );

    синхронизироватьПрокруткуРедактора();
}

function синхронизироватьПрокруткуРедактора(): void {
    if (
        !элементы.редакторИсходногоКода
    ) {
        return;
    }

    const редактор =
        элементы.редакторИсходногоКода;

    if (элементы.подсветкаКода) {
        элементы.подсветкаКода.scrollTop =
            редактор.scrollTop;

        элементы.подсветкаКода.scrollLeft =
            редактор.scrollLeft;
    }

    if (элементы.номераСтрок) {
        элементы.номераСтрок.scrollTop =
            редактор.scrollTop;
    }
}

function вставитьТекстВРедактор(
    текст: string,
): void {
    if (!элементы.редакторИсходногоКода) {
        return;
    }

    const редактор =
        элементы.редакторИсходногоКода;

    const начало =
        редактор.selectionStart;

    const конец =
        редактор.selectionEnd;

    const исходныйКод =
        редактор.value;

    редактор.value =
        исходныйКод.slice(
            0,
            начало,
        ) +
        текст +
        исходныйКод.slice(
            конец,
        );

    const новаяПозиция =
        начало + текст.length;

    редактор.selectionStart =
        новаяПозиция;

    редактор.selectionEnd =
        новаяПозиция;

    обновитьПодсветкуКода();

    редактор.dispatchEvent(
        new Event(
            "input",
            {
                bubbles: true,
            },
        ),
    );
}

function обработатьВводРедактора(): void {
    обновитьПодсветкуКода();

    if (
        состояниеТерминала !==
        "выполнение"
    ) {
        if (элементы.состояниеРедактора) {
            элементы.состояниеРедактора.textContent =
                "изменён";
        }
    }
}

function обработатьНажатиеКлавишиРедактора(
    событие: KeyboardEvent,
): void {
    if (
        событие.key !== "Tab" ||
        !элементы.редакторИсходногоКода
    ) {
        return;
    }

    событие.preventDefault();

    вставитьТекстВРедактор(
        "    ",
    );
}

function настроитьРедактор(): void {
    const контейнер =
        document.getElementById(
            "редактор-монако",
        );

    if (!контейнер) {
        return;
    }

    редакторМонако =
        monaco.editor.create(
            контейнер,
            {
                value: "",
                language: ИДЕНТИФИКАТОР_ЯЗЫКА,
                theme: ИДЕНТИФИКАТОР_ТЕМЫ,
                fontFamily:
                    'Consolas, "Cascadia Code", monospace',
                fontSize: 14,
                lineHeight: 24,
                minimap: {
                    enabled: false,
                },
                scrollBeyondLastLine: false,
                automaticLayout: true,
                renderLineHighlight: "all",
                smoothScrolling: true,
                padding: {
                    top: 12,
                    bottom: 12,
                },
            },
        );

    редакторМонако.onDidChangeModelContent(
        () => {
            if (
                состояниеТерминала !==
                    "выполнение" &&
                элементы.состояниеРедактора
            ) {
                элементы.состояниеРедактора.textContent =
                    "изменён";
            }
        },
    );

    // Официальный мост «страница ↔ редактор»: его используют
    // клиентские скрипты страницы (дерево файлов, см. адаптер
    // в мост_файлов_проекта). Работает и в dev, и в сборке.
    Object.assign(self, {
        УЛИТКА_Редактор: () =>
            редакторМонако,
    });

    // Отладочная ручка к API Monaco — только в dev: проверки, замеры.
    // В собранном интерфейсе её быть не должно.
    if (__УЛИТКА_DEV__) {
        Object.assign(self, {
            УЛИТКА_монако: monaco,
        });
    }

    // День 6: своё контекстное меню вместо системного.
    настроитьКонтекстноеМеню(редакторМонако);
}

/**
 * ============================================================
 * НАБЛЮДЕНИЕ
 * ============================================================
 */

function очиститьНаблюдение(
    элемент: HTMLElement | null,
): void {
    if (!элемент) {
        return;
    }

    элемент.innerHTML = "";
}

function показатьСообщениеНаблюдения(
    элемент: HTMLElement | null,
    сообщение: string,
): void {
    if (!элемент) {
        return;
    }

    const строка =
        document.createElement("div");

    строка.className =
        "элемент-наблюдения";

    строка.textContent =
        сообщение;

    элемент.appendChild(
        строка,
    );
}

function безопасноеЗначение(
    значение: unknown,
): string {
    if (typeof значение === "string") {
        return значение;
    }

    if (
        typeof значение === "number" ||
        typeof значение === "boolean" ||
        typeof значение === "bigint"
    ) {
        return String(значение);
    }

    if (значение === null) {
        return "пусто";
    }

    if (значение === undefined) {
        return "не определено";
    }

    try {
        return JSON.stringify(
            значение,
            null,
            2,
        );
    } catch {
        return String(значение);
    }
}

function показатьПеременные(
    переменные:
        | Record<string, unknown>
        | undefined,
): void {
    очиститьНаблюдение(
        элементы.переменные,
    );

    if (!переменные) {
        показатьСообщениеНаблюдения(
            элементы.переменные,
            "ядро не передало переменные",
        );
        return;
    }

    const имена =
        Object.keys(переменные);

    if (имена.length === 0) {
        показатьСообщениеНаблюдения(
            элементы.переменные,
            "переменных пока нет",
        );
        return;
    }

    for (const имя of имена) {
        const элемент =
            document.createElement("div");

        элемент.className =
            "элемент-наблюдения";

        const название =
            document.createElement("strong");

        название.textContent =
            имя;

        const значение =
            document.createElement("span");

        значение.textContent =
            ` = ${безопасноеЗначение(
                переменные[имя],
            )}`;

        элемент.appendChild(
            название,
        );

        элемент.appendChild(
            значение,
        );

        элементы.переменные?.appendChild(
            элемент,
        );
    }
}

/**
 * ============================================================
 * ФУНКЦИИ
 *
 * Объявленные функции берутся из семантического анализа.
 * Вызовы функций берутся только из событий выполнения.
 *
 * Объявлена функция ≠ функция вызвана.
 *
 * Терминал не делает предположений.
 * ============================================================
 */

function получитьЗаписьСобытия(
    событие: unknown,
): Record<string, unknown> | null {
    if (
        typeof событие !== "object" ||
        событие === null
    ) {
        return null;
    }

    return событие as Record<
        string,
        unknown
    >;
}

function получитьДанныеСобытия(
    событие: unknown,
): Record<string, unknown> | null {
    const запись =
        получитьЗаписьСобытия(
            событие,
        );

    if (!запись) {
        return null;
    }

    const данные =
        запись["данные"];

    if (
        typeof данные !== "object" ||
        данные === null
    ) {
        return null;
    }

    return данные as Record<
        string,
        unknown
    >;
}

function получитьИмяСобытия(
    событие: unknown,
): string | null {
    const запись =
        получитьЗаписьСобытия(
            событие,
        );

    if (!запись) {
        return null;
    }

    const возможныеИмена = [
        "имя",
        "функция",
        "название",
        "тип",
        "событие",
    ];

    for (const ключ of возможныеИмена) {
        const значение =
            запись[ключ];

        if (
            typeof значение === "string"
        ) {
            return значение;
        }
    }

    return null;
}

function являетсяСобытиемВызоваФункции(
    событие: unknown,
): boolean {
    const запись =
        получитьЗаписьСобытия(
            событие,
        );

    if (!запись) {
        return false;
    }

    const значения: string[] = [];

    for (const ключ of [
        "тип",
        "событие",
        "название",
        "имя",
        "функция",
    ]) {
        const значение =
            запись[ключ];

        if (
            typeof значение === "string"
        ) {
            значения.push(
                значение.toLowerCase(),
            );
        }
    }

    const источник =
        запись["источник"];

    if (
        typeof источник === "string"
    ) {
        значения.push(
            источник.toLowerCase(),
        );
    }

    const данные =
        получитьДанныеСобытия(
            событие,
        );

    if (данные) {
        for (const ключ of [
            "тип",
            "событие",
            "название",
            "имя",
            "функция",
        ]) {
            const значение =
                данные[ключ];

            if (
                typeof значение === "string"
            ) {
                значения.push(
                    значение.toLowerCase(),
                );
            }
        }
    }

    return значения.some(
        (значение) =>
            значение.includes(
                "вызов_функции",
            ) ||
            значение.includes(
                "вызов функции",
            ) ||
            значение === "вызов" ||
            значение.startsWith(
                "вызов:",
            ),
    );
}

function получитьИмяВызваннойФункции(
    событие: unknown,
): string | null {
    const запись =
        получитьЗаписьСобытия(
            событие,
        );

    if (!запись) {
        return null;
    }

    const данные =
        получитьДанныеСобытия(
            событие,
        );

    if (данные) {
        for (const ключ of [
            "имя",
            "имяФункции",
            "функция",
            "название",
        ]) {
            const значение =
                данные[ключ];

            if (
                typeof значение === "string" &&
                значение.trim().length > 0
            ) {
                return значение.trim();
            }
        }
    }

    for (const ключ of [
        "имяФункции",
        "функция",
        "имя",
        "название",
    ]) {
        const значение =
            запись[ключ];

        if (
            typeof значение === "string" &&
            значение.trim().length > 0
        ) {
            return значение.trim();
        }
    }

    const источник =
        запись["источник"];

    if (
        typeof источник === "string"
    ) {
        const начало =
            "функция:";

        if (
            источник.startsWith(
                начало,
            )
        ) {
            const имя =
                источник
                    .slice(
                        начало.length,
                    )
                    .trim();

            if (имя.length > 0) {
                return имя;
            }
        }
    }

    return null;
}

function показатьФункции(
    функции:
        | ОбъявленнаяФункция[]
        | undefined,
    события:
        | unknown[]
        | undefined,
): void {
    очиститьНаблюдение(
        элементы.функции,
    );

    if (!функции) {
        показатьСообщениеНаблюдения(
            элементы.функции,
            "сведения о функциях не переданы",
        );
        return;
    }

    const заголовокОбъявленных =
        document.createElement("div");

    заголовокОбъявленных.className =
        "элемент-наблюдения";

    const сильныйЗаголовок =
        document.createElement("strong");

    сильныйЗаголовок.textContent =
        "Объявленные функции";

    заголовокОбъявленных.appendChild(
        сильныйЗаголовок,
    );

    элементы.функции?.appendChild(
        заголовокОбъявленных,
    );

    if (функции.length === 0) {
        показатьСообщениеНаблюдения(
            элементы.функции,
            "  • функций не объявлено",
        );
    } else {
        for (const функция of функции) {
            const параметры =
                функция.параметры.join(
                    ", ",
                );

            const строка =
                document.createElement("div");

            строка.className =
                "элемент-наблюдения";

            строка.textContent =
                `  • ${функция.имя}(${параметры})`;

            элементы.функции?.appendChild(
                строка,
            );
        }
    }

    const заголовокВызовов =
        document.createElement("div");

    заголовокВызовов.className =
        "элемент-наблюдения";

    const сильныйЗаголовокВызовов =
        document.createElement("strong");

    сильныйЗаголовокВызовов.textContent =
        "Вызовы функций";

    заголовокВызовов.appendChild(
        сильныйЗаголовокВызовов,
    );

    элементы.функции?.appendChild(
        заголовокВызовов,
    );

    const вызванныеФункции =
        new Set<string>();

    if (события) {
        for (const событие of события) {
            if (
                !являетсяСобытиемВызоваФункции(
                    событие,
                )
            ) {
                continue;
            }

            const имя =
                получитьИмяВызваннойФункции(
                    событие,
                );

            if (!имя) {
                continue;
            }

            const данные =
                получитьДанныеСобытия(
                    событие,
                );

            const аргументы =
                данные?.["аргументы"];

            const текстАргументов =
                Array.isArray(аргументы)
                    ? аргументы
                        .map((значение: unknown) => {
                            if (значение === null) {
                                return "пусто";
                            }

                            if (значение === undefined) {
                                return "не определено";
                            }

                            if (typeof значение === "boolean") {
                                return значение
                                    ? "истина"
                                    : "ложь";
                            }

                            if (typeof значение === "string") {
                                return JSON.stringify(значение);
                            }

                            if (
                                typeof значение === "number"
                            ) {
                                return String(значение);
                            }

                            try {
                                const текст =
                                    JSON.stringify(значение);

                                return текст ?? String(значение);
                            } catch {
                                return String(значение);
                            }
                        })
                        .join(", ")
                    : "";

            вызванныеФункции.add(
                `${имя}(${текстАргументов})`,
            );
        }
    }

    if (
        вызванныеФункции.size === 0
    ) {
        показатьСообщениеНаблюдения(
            элементы.функции,
            "  • вызовы не зафиксированы",
        );
        return;
    }

    for (
        const вызов of вызванныеФункции
    ) {
        показатьСообщениеНаблюдения(
            элементы.функции,
            `  • ${вызов}`,
        );
    }
}

function показатьДанные3D(
    данные:
        РезультатВыполнения["трехмернаяСистема"],
): void {
    if (!данные) {
        return;
    }

    добавитьВывод(
        `🧩 3D-система: узлов ${данные.узлов}, связей ${данные.связей}, событий ${данные.событий}.`,
    );
}

/**
 * ============================================================
 * ДИАГНОСТИКА
 * ============================================================
 */

function показатьДиагностикуОшибки(
    диагностика: unknown,
): void {
    const диагностикаСписок =
        Array.isArray(диагностика)
            ? диагностика
            : [];

    if (
        диагностикаСписок.length === 0
    ) {
        return;
    }

    const последниеОшибки =
        диагностикаСписок
            .slice(-5)
            .filter(
                (
                    запись,
                ): запись is Record<
                    string,
                    unknown
                > =>
                    typeof запись ===
                        "object" &&
                    запись !== null,
            );

    if (
        последниеОшибки.length === 0
    ) {
        return;
    }

    добавитьВывод(
        "🧾 Последние сообщения диагностики:",
    );

    for (
        const запись of последниеОшибки
    ) {
        const этап =
            строковоеЗначение(
                запись.этап,
                "система",
            );

        const сообщение =
            строковоеЗначение(
                запись.сообщение,
                "Неизвестная ошибка.",
            );

        добавитьВывод(
            `   • [${этап}] ${сообщение}`,
        );
    }
}

function строковоеЗначение(
    значение: unknown,
    значениеПоУмолчанию: string,
): string {
    if (
        typeof значение === "string"
    ) {
        return значение;
    }

    if (
        typeof значение === "number" ||
        typeof значение === "boolean"
    ) {
        return String(значение);
    }

    return значениеПоУмолчанию;
}

/**
 * ============================================================
 * РЕЗУЛЬТАТ ВЫПОЛНЕНИЯ
 * ============================================================
 */

function показатьРезультатВыполнения(
    результат: РезультатВыполнения,
): void {
    if (
        результат.вывод &&
        результат.вывод.length > 0
    ) {
        for (
            const строка of результат.вывод
        ) {
            добавитьВывод(
                строка,
            );
        }
    }

    показатьПеременные(
        результат.переменные,
    );

    показатьФункции(
        результат.функции,
        результат.события,
    );

    if (результат.состояние) {
        добавитьВывод(
            `📌 Состояние программы: ${результат.состояние}`,
        );
    }

    показатьДанные3D(
        результат.трехмернаяСистема,
    );

    if (результат.успешно) {
        установитьСостояние(
            "завершено",
        );

        добавитьВывод(
            "✓ Выполнение завершено.",
        );

        добавитьВывод(
            "👍 Программа выполнена успешно.",
        );

        return;
    }

    установитьСостояние(
        "готов",
    );

    const краткаяОшибка =
        typeof результат.сообщение ===
        "string"
            ? результат.сообщение.trim()
            : "";

    if (
        краткаяОшибка.length > 0
    ) {
        добавитьВывод(
            `❌ ${краткаяОшибка}`,
        );
    } else {
        добавитьВывод(
            "❌ Программа завершилась с ошибкой.",
        );
    }

    показатьДиагностикуОшибки(
        результат.диагностика,
    );
}

/**
 * ============================================================
 * GIT
 * ============================================================
 */

async function выполнитьКомандуGit(
    команда: string,
): Promise<void> {
    добавитьВывод("");

    добавитьВывод(
        `🐌 Выполняется команда «${команда}»...`,
    );

    try {
        const ответ =
            await fetch(
                "/api/git",
                {
                    method: "POST",
                    headers: {
                        "Content-Type":
                            "application/json; charset=utf-8",
                    },
                    body: JSON.stringify({
                        команда,
                    }),
                },
            );

        const результат =
            (await ответ.json()) as ОтветGit;

        if (!результат.успешно) {
            добавитьВывод(
                `❌ ${результат.сообщение}`,
            );

            if (результат.вывод) {
                добавитьВывод(
                    результат.вывод,
                );
            }

            установитьСостояние(
                "готов",
            );

            return;
        }

        добавитьВывод(
            `✓ ${результат.сообщение}`,
        );

        if (
            результат.вывод &&
            результат.вывод.trim().length > 0
        ) {
            добавитьВывод(
                результат.вывод,
            );
        } else if (
            команда === "состояние"
        ) {
            добавитьВывод(
                "✓ Git не сообщил об изменениях.",
            );
        } else if (
            команда === "изменения"
        ) {
            добавитьВывод(
                "✓ Изменений в рабочем дереве нет.",
            );
        } else if (
            команда === "история"
        ) {
            добавитьВывод(
                "✓ История Git пуста.",
            );
        }

        установитьСостояние(
            "готов",
        );
    } catch (ошибка) {
        const сообщение =
            ошибка instanceof Error
                ? ошибка.message
                : String(ошибка);

        добавитьВывод(
            "❌ Не удалось связаться с серверной частью «Улитки».",
        );

        добавитьВывод(
            `Причина: ${сообщение}`,
        );

        установитьСостояние(
            "готов",
        );
    }
}

async function получитьСостояниеGit(): Promise<void> {
    установитьСостояние(
        "выполнение",
    );

    await выполнитьКомандуGit(
        "состояние",
    );
}

async function получитьИзмененияGit(): Promise<void> {
    установитьСостояние(
        "выполнение",
    );

    await выполнитьКомандуGit(
        "изменения",
    );
}

async function получитьИсториюGit(): Promise<void> {
    установитьСостояние(
        "выполнение",
    );

    добавитьВывод(
        "📜 Последние пять сохранений Git:",
    );

    await выполнитьКомандуGit(
        "история",
    );
}

/**
 * ============================================================
 * ЗАПУСК ПРОГРАММЫ
 * ============================================================
 */

async function запуститьПрограмму(): Promise<void> {
    if (
        состояниеТерминала ===
        "выполнение"
    ) {
        добавитьВывод(
            "⚠ Программа уже выполняется.",
        );

        return;
    }

    if (!редакторМонако) {
        добавитьВывод(
            "❌ Не найден редактор исходного кода.",
        );

        return;
    }

    const исходныйКод =
        редакторМонако.getValue();

    if (
        исходныйКод.trim().length === 0
    ) {
        добавитьВывод(
            "❌ Исходный код программы пуст.",
        );

        return;
    }

    if (запросВыполнения) {
        запросВыполнения.abort();
        запросВыполнения = null;
    }

    запросВыполнения =
        new AbortController();

    установитьСостояние(
        "выполнение",
    );

    добавитьВывод("");

    добавитьВывод(
        "▶ Запуск программы...",
    );

    добавитьВывод(
        "🐌 Терминал передал управление системе выполнения.",
    );

    try {
        const ответ =
            await fetch(
                "/api/выполнение",
                {
                    method: "POST",
                    headers: {
                        "Content-Type":
                            "application/json; charset=utf-8",
                    },
                    body: JSON.stringify({
                        код: исходныйКод,
                    }),
                    signal:
                        запросВыполнения.signal,
                },
            );

        if (!ответ.ok) {
            let детали:
                string | null = null;

            try {
                const тело =
                    await ответ.text();

                if (
                    тело.trim().length > 0
                ) {
                    const данные =
                        JSON.parse(
                            тело,
                        ) as {
                            сообщение?: unknown;
                        };

                    if (
                        typeof данные.сообщение ===
                        "string"
                    ) {
                        детали =
                            данные.сообщение;
                    } else {
                        детали =
                            тело;
                    }
                }
            } catch {
                детали = null;
            }

            установитьСостояние(
                "готов",
            );

            добавитьВывод(
                `❌ Сервер завершил запрос с ошибкой HTTP ${ответ.status}.`,
            );

            if (детали) {
                добавитьВывод(
                    `Причина: ${детали}`,
                );
            }

            return;
        }

        let результат:
            РезультатВыполнения;

        try {
            результат =
                (await ответ.json()) as
                    РезультатВыполнения;
        } catch {
            установитьСостояние(
                "готов",
            );

            добавитьВывод(
                `❌ Сервер вернул ответ, который «Улитка» не смогла прочитать. Код ответа: ${ответ.status}.`,
            );

            return;
        }

        показатьРезультатВыполнения(
            результат,
        );
    } catch (ошибка) {
        if (
            ошибка instanceof DOMException &&
            ошибка.name === "AbortError"
        ) {
            return;
        }

        const сообщение =
            ошибка instanceof Error
                ? ошибка.message
                : String(ошибка);

        установитьСостояние(
            "готов",
        );

        добавитьВывод(
            "❌ Не удалось связаться с системой выполнения «Улитки».",
        );

        добавитьВывод(
            `Причина: ${сообщение}`,
        );
    } finally {
        запросВыполнения = null;
    }
}

/**
 * ============================================================
 * ОСТАНОВКА
 * ============================================================
 */

function остановитьПрограмму(): void {
    if (
        состояниеТерминала !==
        "выполнение"
    ) {
        добавитьВывод(
            "⚠ Сейчас нет выполняемой программы.",
        );

        установитьСостояние(
            "остановлено",
        );

        return;
    }

    if (запросВыполнения) {
        запросВыполнения.abort();
        запросВыполнения = null;
    }

    установитьСостояние(
        "остановлено",
    );

    добавитьВывод(
        "■ Выполнение остановлено пользователем.",
    );
}

/**
 * ============================================================
 * ИЗМЕНЕНИЕ РАЗМЕРОВ ПАНЕЛЕЙ
 * ============================================================
 */

function установитьСтиль(
    имя: string,
    значение: string,
): void {
    if (!элементы.приложение) {
        return;
    }

    элементы.приложение.style.setProperty(
        имя,
        значение,
    );
}

function начатьИзменениеРазмера(
    разделитель: HTMLElement,
    тип: ТипРазделителя,
    событие: PointerEvent,
): void {
    событие.preventDefault();

    разделитель.setPointerCapture(
        событие.pointerId,
    );

    document.body.classList.add(
        "изменение-размера",
    );

    if (
        тип === "проект" ||
        тип === "наблюдение"
    ) {
        document.body.classList.add(
            "изменение-размера-вертикальное",
        );
    } else {
        document.body.classList.add(
            "изменение-размера-горизонтальное",
        );
    }

    const обработатьПеремещение =
        (
            перемещение: PointerEvent,
        ): void => {
            if (!элементы.приложение) {
                return;
            }

            const прямоугольник =
                элементы.приложение.getBoundingClientRect();

            if (тип === "проект") {
                const ширина =
                    перемещение.clientX -
                    прямоугольник.left;

                const ограниченнаяШирина =
                    Math.max(
                        170,
                        Math.min(
                            ширина,
                            360,
                        ),
                    );

                установитьСтиль(
                    "--ширина-проекта",
                    `${Math.round(
                        ограниченнаяШирина,
                    )}px`,
                );

                return;
            }

            if (
                тип === "наблюдение"
            ) {
                const ширина =
                    прямоугольник.right -
                    перемещение.clientX;

                const ограниченнаяШирина =
                    Math.max(
                        210,
                        Math.min(
                            ширина,
                            420,
                        ),
                    );

                установитьСтиль(
                    "--ширина-наблюдения",
                    `${Math.round(
                        ограниченнаяШирина,
                    )}px`,
                );

                return;
            }

            const высота =
                прямоугольник.bottom -
                перемещение.clientY;

            const максимальнаяВысота =
                Math.max(
                    140,
                    Math.round(
                        window.innerHeight *
                            0.60,
                    ),
                );

            const ограниченнаяВысота =
                Math.max(
                    140,
                    Math.min(
                        высота,
                        максимальнаяВысота,
                    ),
                );

            установитьСтиль(
                "--высота-консоли",
                `${Math.round(
                    ограниченнаяВысота,
                )}px`,
            );
        };

    const завершитьИзменение =
        (): void => {
            разделитель.removeEventListener(
                "pointermove",
                обработатьПеремещение,
            );

            разделитель.removeEventListener(
                "pointerup",
                завершитьИзменение,
            );

            разделитель.removeEventListener(
                "pointercancel",
                завершитьИзменение,
            );

            document.body.classList.remove(
                "изменение-размера",
                "изменение-размера-вертикальное",
                "изменение-размера-горизонтальное",
            );

            if (
                разделитель.hasPointerCapture(
                    событие.pointerId,
                )
            ) {
                разделитель.releasePointerCapture(
                    событие.pointerId,
                );
            }
        };

    разделитель.addEventListener(
        "pointermove",
        обработатьПеремещение,
    );

    разделитель.addEventListener(
        "pointerup",
        завершитьИзменение,
        {
            once: true,
        },
    );

    разделитель.addEventListener(
        "pointercancel",
        завершитьИзменение,
        {
            once: true,
        },
    );
}

function настроитьИзменениеРазмеров(): void {
    if (
        элементы.разделительПроекта
    ) {
        элементы.разделительПроекта.addEventListener(
            "pointerdown",
            (событие) => {
                начатьИзменениеРазмера(
                    элементы.разделительПроекта!,
                    "проект",
                    событие,
                );
            },
        );
    }

    if (
        элементы.разделительНаблюдения
    ) {
        элементы.разделительНаблюдения.addEventListener(
            "pointerdown",
            (событие) => {
                начатьИзменениеРазмера(
                    элементы.разделительНаблюдения!,
                    "наблюдение",
                    событие,
                );
            },
        );
    }

    if (
        элементы.разделительКонсоли
    ) {
        элементы.разделительКонсоли.addEventListener(
            "pointerdown",
            (событие) => {
                начатьИзменениеРазмера(
                    элементы.разделительКонсоли!,
                    "консоль",
                    событие,
                );
            },
        );
    }
}

/**
 * ============================================================
 * ПРОВЕРКА ИНТЕРФЕЙСА
 * ============================================================
 */

function проверитьИнтерфейс(): void {
    const отсутствующие: string[] =
        [];

    if (!элементы.кнопкаЗапуск) {
        отсутствующие.push(
            "кнопка-запуск",
        );
    }

    if (!элементы.кнопкаОстановка) {
        отсутствующие.push(
            "кнопка-остановка",
        );
    }

    if (!элементы.кнопкаСостояниеGit) {
        отсутствующие.push(
            "кнопка-состояние-git",
        );
    }

    if (!элементы.кнопкаИзмененияGit) {
        отсутствующие.push(
            "кнопка-изменения-git",
        );
    }

    if (!элементы.кнопкаИсторияGit) {
        отсутствующие.push(
            "кнопка-история-git",
        );
    }

    if (!элементы.вывод) {
        отсутствующие.push(
            "вывод",
        );
    }

    if (!элементы.состояние) {
        отсутствующие.push(
            "состояние",
        );
    }

    if (!элементы.состояниеСистемы) {
        отсутствующие.push(
            "состояние-системы",
        );
    }

    if (!элементы.состояниеРедактора) {
        отсутствующие.push(
            "состояние-редактора",
        );
    }

    if (
        !document.getElementById(
            "редактор-монако",
        )
    ) {
        отсутствующие.push(
            "редактор-монако",
        );
    }

    if (!элементы.переменные) {
        отсутствующие.push(
            "переменные",
        );
    }

    if (!элементы.функции) {
        отсутствующие.push(
            "функции",
        );
    }

    if (!элементы.разделительПроекта) {
        отсутствующие.push(
            "разделитель-проекта",
        );
    }

    if (!элементы.разделительНаблюдения) {
        отсутствующие.push(
            "разделитель-наблюдения",
        );
    }

    if (!элементы.разделительКонсоли) {
        отсутствующие.push(
            "разделитель-консоли",
        );
    }

    if (
        отсутствующие.length > 0
    ) {
        console.error(
            "🐌 Ошибка интерфейса. Отсутствуют элементы:",
            отсутствующие,
        );

        return;
    }

    console.log(
        "🐌 Интерфейс терминала «Улитки» проверен.",
    );
}

/**
 * ============================================================
 * СОБЫТИЯ
 * ============================================================
 */

элементы.кнопкаЗапуск?.addEventListener(
    "click",
    () => {
        void запуститьПрограмму();
    },
);

элементы.кнопкаОстановка?.addEventListener(
    "click",
    остановитьПрограмму,
);

элементы.кнопкаСостояниеGit?.addEventListener(
    "click",
    () => {
        void получитьСостояниеGit();
    },
);

элементы.кнопкаИзмененияGit?.addEventListener(
    "click",
    () => {
        void получитьИзмененияGit();
    },
);

элементы.кнопкаИсторияGit?.addEventListener(
    "click",
    () => {
        void получитьИсториюGit();
    },
);

/**
 * ============================================================
 * ЗАПУСК ИНИЦИАЛИЗАЦИИ
 * ============================================================
 */

проверитьИнтерфейс();

зарегистрироватьЯзыкУлитки();

создатьТемуУлитки();

зарегистрироватьДополнение();

настроитьРедактор();

настроитьИзменениеРазмеров();

установитьСостояние(
    "готов",
);

console.log(
    "🐌 Терминал «Улитки» загружен.",
);

console.log(
    "Состояние:",
    состояниеТерминала,
);