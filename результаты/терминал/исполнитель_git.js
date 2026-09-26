"use strict";
/**
 * ============================================================
 * 🐌 УЛИТКА
 * Безопасный исполнитель команд Git
 * Этап 3.5.2
 * ============================================================
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.выполнитьGit = выполнитьGit;
const node_child_process_1 = require("node:child_process");
function выполнитьGit(параметры) {
    const результат = (0, node_child_process_1.spawnSync)("git", [параметры.команда, ...(параметры.аргументы ?? [])], {
        cwd: process.cwd(),
        encoding: "utf8",
        windowsHide: true,
    });
    const вывод = результат.stdout ?? "";
    const ошибка = результат.stderr ?? "";
    return {
        успешно: результат.status === 0,
        кодЗавершения: результат.status,
        вывод,
        ошибка,
    };
}
