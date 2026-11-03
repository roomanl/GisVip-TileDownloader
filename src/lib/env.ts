/**
 * 运行环境判断：Tauri 桌面环境 vs 纯浏览器预览环境。
 * 供 main.ts、stores、组件等多处调用，避免重复书写 "__TAURI_INTERNALS__" in window。
 */
export const isTauri =
    typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
