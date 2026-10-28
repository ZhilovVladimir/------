/**
 * Типы для Vite-специальных импортов (день 2 — Monaco).
 */

declare module "*?worker" {
    const СоздатьВоркер: {
        new (): Worker;
    };

    export default СоздатьВоркер;
}
