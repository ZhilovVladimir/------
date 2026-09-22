"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ____________________________3d_js_1 = require("./\u0441\u0438\u0441\u0442\u0435\u043C\u0430_\u0443\u043B\u0438\u0442\u043A\u0438_3d.js");
const код = `
программа проверка

начало

    пусть а = 10
    пусть б = 20
    пусть сумма = а + б

    показать сумма

конец
`;
console.log("🐌 ДИАГНОСТИКА КОМПИЛЯТОРА 3D");
console.log("");
const система = new ____________________________3d_js_1.СистемаУлитки3D();
console.log("⚙️ Выполнение программы...");
const результат = система
    .получитьКомпилятор()
    .выполнить(код);
console.log("");
console.log("📊 ПОЛНЫЙ РЕЗУЛЬТАТ:");
console.dir(результат, { depth: null });
console.log("");
console.log("🌐 СОСТОЯНИЕ 3D-ЯДРА:");
const ядро = система.получитьЯдро();
console.log("Узлы:", ядро.получитьУзлы().length);
console.log("Связи:", ядро.получитьСвязи().length);
console.log("События:", ядро.получитьСобытия().length);
