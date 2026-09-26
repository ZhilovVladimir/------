/**
 * ============================================================
 * 🐌 УЛИТКА
 * Безопасный исполнитель команд Git
 * Этап 3.5.2
 * ============================================================
 */

import {
    spawnSync,
} from "node:child_process";

export interface РезультатGit {
    успешно: boolean;
    кодЗавершения: number | null;
    вывод: string;
    ошибка: string;
}

export interface ПараметрыGit {
    команда: string;
    аргументы?: string[];
}

export function выполнитьGit(
    параметры: ПараметрыGit,
): РезультатGit {
    const результат = spawnSync(
        "git",
        [параметры.команда, ...(параметры.аргументы ?? [])],
        {
            cwd: process.cwd(),
            encoding: "utf8",
            windowsHide: true,
        },
    );

    const вывод = результат.stdout ?? "";
    const ошибка = результат.stderr ?? "";

    return {
        успешно: результат.status === 0,
        кодЗавершения: результат.status,
        вывод,
        ошибка,
    };
}