import { readFileSync } from "node:fs";

import {
    СистемаУлитки3D
} from "./система_улитки_3d.js";

const путь = "примеры/тест_3d.ул";

const исходныйКод = readFileSync(
    путь,
    "utf8"
);

console.log("🐌 Компилятор «Улитка» запущен.");
console.log("");

console.log("📜 ИСХОДНЫЙ КОД:");
console.log(исходныйКод);

console.log("");
console.log("⚙️ ЗАПУСК ЕДИНОГО КОНВЕЙЕРА:");

const система = new СистемаУлитки3D();

const компилятор = система
    .получитьКомпилятор();

const результат = компилятор
    .выполнить(исходныйКод);

console.log("");

if (!результат.успешно) {
    console.log("❌ ПРОГРАММА ЗАВЕРШИЛАСЬ С ОШИБКОЙ.");

    console.log("");
    console.log("📋 ДИАГНОСТИКА:");

    console.dir(
        результат.контекст.диагностика,
        { depth: null }
    );

    process.exitCode = 1;
}

if (результат.успешно) {
    console.log("✅ ПРОГРАММА ВЫПОЛНЕНА УСПЕШНО.");

    console.log("");
    console.log("📊 РЕЗУЛЬТАТ ВЫПОЛНЕНИЯ:");

    console.dir(
        результат.выполнение,
        { depth: null }
    );
}

const ядро = система
    .получитьЯдро();

const узлы = ядро
    .получитьУзлы();

const связи = ядро
    .получитьСвязи();

const события = ядро
    .получитьСобытия();

console.log("");
console.log("🌐 СОСТОЯНИЕ 3D-СИСТЕМЫ:");

console.log(
    `3D-узлов: ${узлы.length}`
);

console.log(
    `3D-связей: ${связи.length}`
);

console.log(
    `Событий: ${события.length}`
);

console.log("");
console.log(
    "🐌 Путь программы: Код → Компилятор → Исполнитель → Интегратор → Ядро3D."
);
