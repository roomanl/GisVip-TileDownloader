import { defineStore } from "pinia";
import { ref, watch } from "vue";
import {
    disable as disableAutostart,
    enable as enableAutostart,
    isEnabled,
} from "@tauri-apps/plugin-autostart";
import { load, type Store } from "@tauri-apps/plugin-store";
import { isTauri } from "@/lib/env";

/** 主题配色选项（value 对应 index.css 中的 .theme-* 类，default 不加类） */
export interface ThemeColorOption {
    value: string;
    label: string;
    /** 色块预览色 */
    swatch: string;
}

export const THEME_COLORS: ThemeColorOption[] = [
    { value: "default", label: "默认", swatch: "oklch(0.205 0 0)" },
    { value: "blue", label: "蓝色", swatch: "oklch(0.546 0.245 262.881)" },
    { value: "red", label: "红色", swatch: "oklch(0.585 0.233 27.711)" },
    { value: "green", label: "绿色", swatch: "oklch(0.627 0.194 149.214)" },
    { value: "orange", label: "橙色", swatch: "oklch(0.666 0.179 58.318)" },
    { value: "purple", label: "紫色", swatch: "oklch(0.558 0.288 302.321)" },
];

/**
 * 应用设置（系统设置页）：
 * - isDark：暗黑模式，切换 <html> 的 .dark 类
 * - themeColor：主题配色（蓝/红/绿…），切换 <html> 的 .theme-* 类
 * - autostart：开机自启，状态以 autostart 插件为准（写入系统注册表/LaunchAgent）
 * isDark/themeColor 持久化到 plugin-store（settings.json）。
 */
export const useSettingsStore = defineStore("settings", () => {
    const isDark = ref(window.matchMedia("(prefers-color-scheme: dark)").matches);
    const themeColor = ref<string>("default");
    const autostart = ref(false);

    let store: Store | null = null;

    function applyAppearance() {
        const root = document.documentElement;
        root.classList.toggle("dark", isDark.value);
        for (const option of THEME_COLORS) root.classList.remove(`theme-${option.value}`);
        if (themeColor.value !== "default") root.classList.add(`theme-${themeColor.value}`);
    }

    /** 启动时调用：读取持久化设置、初始化自启状态 */
    async function init() {
        if (isTauri) {
            try {
                // 文件不存在时 load 返回空 store，首次 save() 时会创建 settings.json
                store = await load("settings.json", { autoSave: false });

                const dark = await store.get<boolean>("isDark");
                if (typeof dark === "boolean") {
                    isDark.value = dark;
                } else {
                    // 兼容旧版持久化的 themeMode（light/dark/system）
                    const legacyMode = await store.get<string>("themeMode");
                    if (legacyMode === "dark") isDark.value = true;
                    else if (legacyMode === "light") isDark.value = false;
                }

                const color = await store.get<string>("themeColor");
                if (color) themeColor.value = color;

                autostart.value = await isEnabled();
            } catch (err) {
                console.error("读取持久化设置失败:", err);
            }
        }

        applyAppearance();

        // 外观/配色变更：即时应用 + 持久化
        watch([isDark, themeColor], async () => {
            applyAppearance();
            if (store) {
                await store.set("isDark", isDark.value);
                await store.set("themeColor", themeColor.value);
                await store.save();
            }
        });
    }

    /** 开关开机自启（浏览器预览环境下仅本地状态，不生效） */
    async function setAutostart(value: boolean) {
        if (!isTauri) {
            autostart.value = value;
            return;
        }
        try {
            if (value) await enableAutostart();
            else await disableAutostart();
            autostart.value = value;
        } catch (err) {
            console.error("设置开机自启失败:", err);
        }
    }

    return { isDark, themeColor, autostart, isTauri, init, setAutostart };
});
