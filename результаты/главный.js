"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_fs_1 = require("node:fs");
const ____________________________3d_js_1 = require("./\u0441\u0438\u0441\u0442\u0435\u043C\u0430_\u0443\u043B\u0438\u0442\u043A\u0438_3d.js");
const путь = "примеры/тест_3d.ул";
const исходныйКод = (0, node_fs_1.readFileSync)(путь, "utf8");
console.log("🐌 Компилятор «Улитка» запущен.");
console.log("");
console.log("📜 ИСХОДНЫЙ КОД:");
console.log(исходныйКод);
console.log("");
console.log("⚙️ ЗАПУСК ЕДИНОГО КОНВЕЙЕРА:");
const система = new ____________________________3d_js_1.СистемаУлитки3D();
const компилятор = система
    .получитьКомпилятор();
const результат = компилятор
    .выполнить(исходныйКод);
console.log("");
if (!результат.успешно) {
    console.log("❌ ПРОГРАММА ЗАВЕРШИЛАСЬ С ОШИБКОЙ.");
    console.log("");
    console.log("📋 ДИАГНОСТИКА:");
    console.dir(результат.контекст.диагностика, { depth: null });
    process.exitCode = 1;
}
if (результат.успешно) {
    console.log("✅ ПРОГРАММА ВЫПОЛНЕНА УСПЕШНО.");
    console.log("");
    console.log("📊 РЕЗУЛЬТАТ ВЫПОЛНЕНИЯ:");
    console.dir(результат.выполнение, { depth: null });
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
console.log(`3D-узлов: ${узлы.length}`);
console.log(`3D-связей: ${связи.length}`);
console.log(`Событий: ${события.length}`);
console.log("");
console.log("🐌 Путь программы: Код → Компилятор → Исполнитель → Интегратор → Ядро3D.");
