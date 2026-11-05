import { App } from 'vue';
import { invoke } from '@tauri-apps/api/core';
import { useSettingsStore } from "@/stores/settings";
import { setupTray } from "@/lib/tray";
import { isTauri } from "@/lib/env";

export default {
    install: (_app: App) => {
        // 读取持久化设置（主题/暗黑模式）并应用，需晚于 pinia 安装
        useSettingsStore().init();
        // 唤窗只在 Tauri 环境有效，浏览器预览下 invoke 会抛异常，跳过
        if (isTauri) {
            window.addEventListener("DOMContentLoaded", () => {
                setTimeout(() => {
                    invoke("show_main_window").catch((err) => console.error("唤窗失败:", err));
                }, 50);
            });
        }
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