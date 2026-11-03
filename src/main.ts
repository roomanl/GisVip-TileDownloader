import { createApp } from "vue";
import { createPinia } from "pinia";
import router from "./router";
import App from "./App.vue";
import { setupTray } from "@/lib/tray";
import { isTauri } from "@/lib/env";
import { useSettingsStore } from "@/stores/settings";
import "./assets/index.css";

const app = createApp(App);
app.use(createPinia());
app.use(router);
app.mount("#app");

// 读取持久化设置（主题/暗黑模式）并应用，需晚于 pinia 安装
void useSettingsStore().init();

// 托盘仅在 Tauri 环境创建（纯浏览器预览时跳过）
if (isTauri) {
    setupTray().catch((err) => console.error("托盘创建失败:", err));
}
