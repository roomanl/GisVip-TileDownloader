import { App } from 'vue';
import { invoke } from '@tauri-apps/api/core';
import { useSettingsStore } from "@/stores/settings";
import { setupTray } from "@/lib/tray";
import { isTauri } from "@/lib/env";

export default {
    install: (app: App) => {
        // 读取持久化设置（主题/暗黑模式）并应用，需晚于 pinia 安装
        useSettingsStore().init();
        window.addEventListener("DOMContentLoaded", () => {
            setTimeout(() => {
                invoke("show_main_window");
            }, 50);
        });
        // 仅在生产环境中禁用右键菜单
        if (import.meta.env.MODE === "production") {
            window.addEventListener("contextmenu", (e) => {
                e.preventDefault();
            }, false);
        }
        // 托盘仅在 Tauri 环境创建（纯浏览器预览时跳过）
        if (isTauri) {
            setupTray().catch((err) => console.error("托盘创建失败:", err));
        }
    }
};