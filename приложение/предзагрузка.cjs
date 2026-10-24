"use strict";

const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("улитка", {
    выбратьПапку: () =>
        ipcRenderer.invoke("улитка:выбрать-папку"),

    синхронизироватьРабочуюПапку: (путь) =>
        ipcRenderer.invoke("улитка:синхронизировать-рабочую-папку", путь),

    переместитьВКорзину: (путь) =>
        ipcRenderer.invoke("улитка:переместить-в-корзину", путь)
});