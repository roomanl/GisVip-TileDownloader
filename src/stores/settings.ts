import { defineStore } from "pinia";
import { computed, ref, watch } from "vue";
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

/** 下载线程数取值范围（NumberField 与写盘前限定共用） */
export const DOWNLOAD_THREADS_RANGE = { min: 1, max: 256 };
/** 下载重试次数取值范围 */
export const DOWNLOAD_RETRY_RANGE = { min: 1, max: 100 };

/** 下载设置默认值（无持久化记录时使用） */
const DOWNLOAD_DEFAULTS = { threads: 4, retryCount: 3, autoDownload: true };

/** 限定到 [min, max] 区间并取整（非法值回退到 min） */
function clampInt(value: number, min: number, max: number) {
    if (!Number.isFinite(value)) return min;
    return Math.min(max, Math.max(min, Math.round(value)));
}

/**
 * 应用设置（设置模块，见 src/views/modules/settings）：
 * - isDark：暗黑模式，切换 <html> 的 .dark 类
 * - themeColor：主题配色（蓝/红/绿…），切换 <html> 的 .theme-* 类
 * - autostart：开机自启，状态以 autostart 插件为准（写入系统注册表/LaunchAgent）
 * - tiandituKey：天地图开发密钥（地图配置）
 * - downloadThreads/downloadRetryCount/autoDownload：下载设置（线程数/重试次数/自动下载）
 * isDark/themeColor 即时持久化；地图配置与下载设置不自动保存，
 * 由页面「保存配置」按钮调用 saveMapConfig / saveDownloadConfig 写入 plugin-store（settings.json）。
 */
export const useSettingsStore = defineStore("settings", () => {
    const isDark = ref(window.matchMedia("(prefers-color-scheme: dark)").matches);
    const themeColor = ref<string>("default");
    const autostart = ref(false);
    const tiandituKey = ref("");
    /** 最后一次写盘的天地图 key，用于判断是否有未保存修改 */
    const savedTiandituKey = ref("");

    const downloadThreads = ref(DOWNLOAD_DEFAULTS.threads);
    const downloadRetryCount = ref(DOWNLOAD_DEFAULTS.retryCount);
    const autoDownload = ref(DOWNLOAD_DEFAULTS.autoDownload);
    /** 最后一次写盘的下载设置快照，用于判断是否有未保存修改 */
    const savedDownload = ref({ ...DOWNLOAD_DEFAULTS });

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

                const key = await store.get<string>("tiandituKey");
                if (key) tiandituKey.value = key;
                savedTiandituKey.value = tiandituKey.value;

                const threads = await store.get<number>("downloadThreads");
                if (typeof threads === "number") {
                    downloadThreads.value = clampInt(threads, DOWNLOAD_THREADS_RANGE.min, DOWNLOAD_THREADS_RANGE.max);
                }
                const retries = await store.get<number>("downloadRetryCount");
                if (typeof retries === "number") {
                    downloadRetryCount.value = clampInt(retries, DOWNLOAD_RETRY_RANGE.min, DOWNLOAD_RETRY_RANGE.max);
                }
                const auto = await store.get<boolean>("autoDownload");
                if (typeof auto === "boolean") autoDownload.value = auto;
                snapshotDownload();

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

    /** 地图配置是否有未保存的修改 */
    const isMapConfigDirty = computed(() => tiandituKey.value.trim() !== savedTiandituKey.value);

    /**
     * 保存地图配置（写盘）：去除首尾空白后写入 settings.json。
     * 返回 true 表示已落盘；非 Tauri 环境或写入失败返回 false。
     */
    async function saveMapConfig() {
        tiandituKey.value = tiandituKey.value.trim();
        if (!isTauri || !store) return false;
        try {
            await store.set("tiandituKey", tiandituKey.value);
            await store.save();
            savedTiandituKey.value = tiandituKey.value;
            return true;
        } catch (err) {
            console.error("保存地图配置失败:", err);
            return false;
        }
    }

    /** 把当前下载设置写入已保存快照（初始化读取后、写盘成功后调用） */
    function snapshotDownload() {
        savedDownload.value = {
            threads: downloadThreads.value,
            retryCount: downloadRetryCount.value,
            autoDownload: autoDownload.value,
        };
    }

    /** 下载设置是否有未保存的修改 */
    const isDownloadConfigDirty = computed(() =>
        downloadThreads.value !== savedDownload.value.threads
        || downloadRetryCount.value !== savedDownload.value.retryCount
        || autoDownload.value !== savedDownload.value.autoDownload,
    );

    /**
     * 保存下载配置（写盘）：线程数/重试次数先限定到各自区间再写入 settings.json。
     * 返回 true 表示已落盘；非 Tauri 环境或写入失败返回 false。
     */
    async function saveDownloadConfig() {
        downloadThreads.value = clampInt(downloadThreads.value, DOWNLOAD_THREADS_RANGE.min, DOWNLOAD_THREADS_RANGE.max);
        downloadRetryCount.value = clampInt(downloadRetryCount.value, DOWNLOAD_RETRY_RANGE.min, DOWNLOAD_RETRY_RANGE.max);
        if (!isTauri || !store) return false;
        try {
            await store.set("downloadThreads", downloadThreads.value);
            await store.set("downloadRetryCount", downloadRetryCount.value);
            await store.set("autoDownload", autoDownload.value);
            await store.save();
            snapshotDownload();
            return true;
        } catch (err) {
            console.error("保存下载配置失败:", err);
            return false;
        }
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

    return {
        isDark,
        themeColor,
        autostart,
        tiandituKey,
        downloadThreads,
        downloadRetryCount,
        autoDownload,
        isMapConfigDirty,
        isDownloadConfigDirty,
        isTauri,
        init,
        setAutostart,
        saveMapConfig,
        saveDownloadConfig,
    };
});
