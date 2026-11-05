import { defineStore } from "pinia";
import { computed, ref, watch } from "vue";
import {
    disable as disableAutostart,
    enable as enableAutostart,
    isEnabled,
} from "@tauri-apps/plugin-autostart";
import { load, type Store } from "@tauri-apps/plugin-store";
import { join, resourceDir } from "@tauri-apps/api/path";
import { isTauri } from "@/lib/env";
import {
    DOWNLOAD_DEFAULT_SUBDIR,
    DOWNLOAD_RETRY_RANGE,
    DOWNLOAD_THREADS_RANGE,
    SETTINGS_DEFAULTS,
    THEME_COLORS,
    type ThemeColorOption,
} from "@/config";

// 设置项选项/范围/默认值统一在 @/config 中配置，这里转发导出以兼容页面既有引用
export { THEME_COLORS, DOWNLOAD_THREADS_RANGE, DOWNLOAD_RETRY_RANGE };
export type { ThemeColorOption };

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
 * - downloadThreads/downloadRetryCount/autoDownload/downloadPath：下载设置（线程数/重试次数/自动下载/下载路径）
 * isDark/themeColor 即时持久化；地图配置与下载设置不自动保存，
 * 由页面「保存配置」按钮调用 saveMapConfig / saveDownloadConfig 写入 plugin-store（settings.json）。
 */
export const useSettingsStore = defineStore("settings", () => {
    const isDark = ref(window.matchMedia("(prefers-color-scheme: dark)").matches);
    const themeColor = ref<string>(SETTINGS_DEFAULTS.themeColor);
    const autostart = ref(false);
    const tiandituKey = ref(SETTINGS_DEFAULTS.tiandituKey);
    /** 最后一次写盘的天地图 key，用于判断是否有未保存修改 */
    const savedTiandituKey = ref("");

    const downloadThreads = ref(SETTINGS_DEFAULTS.download.threads);
    const downloadRetryCount = ref(SETTINGS_DEFAULTS.download.retryCount);
    const autoDownload = ref(SETTINGS_DEFAULTS.download.autoDownload);
    /** 自定义下载路径，空字符串表示使用默认下载目录 */
    const downloadPath = ref(SETTINGS_DEFAULTS.download.path);
    /** 默认下载目录：资源目录（Windows 下即应用根目录）/downloads，启动时解析 */
    const defaultDownloadPath = ref("");
    /** 最后一次写盘的下载设置快照，用于判断是否有未保存修改 */
    const savedDownload = ref({ ...SETTINGS_DEFAULTS.download });

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
                const path = await store.get<string>("downloadPath");
                if (path) downloadPath.value = path;
                // 默认下载目录：资源目录下的 downloads 子目录
                // 不用 executableDir()（它转发 dirs::executable_dir()，Windows/macOS 固定返回 None 并报 unknown path）
                try {
                    defaultDownloadPath.value = await join(await resourceDir(), DOWNLOAD_DEFAULT_SUBDIR);
                } catch (err) {
                    console.error("解析默认下载目录失败:", err);
                }
                snapshotDownload();

                autostart.value = await isEnabled();
            } catch (err) {
                console.error("读取持久化设置失败:", err);
            }
        }

        // 浏览器预览环境无法解析可执行文件目录，回退为相对路径占位，以免下载任务被路径校验永远拦住
        if (!isTauri && !defaultDownloadPath.value) {
            defaultDownloadPath.value = `./${DOWNLOAD_DEFAULT_SUBDIR}`;
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
            path: downloadPath.value,
        };
    }

    /** 是否仍使用默认下载目录（未自定义路径） */
    const isUsingDefaultDownloadPath = computed(() => !downloadPath.value.trim());

    /** 当前生效的下载目录（自定义路径优先，否则为默认目录） */
    const effectiveDownloadPath = computed(
        () => downloadPath.value.trim() || defaultDownloadPath.value,
    );

    /** 下载设置是否有未保存的修改 */
    const isDownloadConfigDirty = computed(() =>
        downloadThreads.value !== savedDownload.value.threads
        || downloadRetryCount.value !== savedDownload.value.retryCount
        || autoDownload.value !== savedDownload.value.autoDownload
        || downloadPath.value.trim() !== savedDownload.value.path,
    );

    /**
     * 保存下载配置（写盘）：线程数/重试次数先限定到各自区间，路径去首尾空白后写入 settings.json。
     * 返回 true 表示已落盘；非 Tauri 环境或写入失败返回 false。
     */
    async function saveDownloadConfig() {
        downloadThreads.value = clampInt(downloadThreads.value, DOWNLOAD_THREADS_RANGE.min, DOWNLOAD_THREADS_RANGE.max);
        downloadRetryCount.value = clampInt(downloadRetryCount.value, DOWNLOAD_RETRY_RANGE.min, DOWNLOAD_RETRY_RANGE.max);
        downloadPath.value = downloadPath.value.trim();
        if (!isTauri || !store) return false;
        try {
            await store.set("downloadThreads", downloadThreads.value);
            await store.set("downloadRetryCount", downloadRetryCount.value);
            await store.set("autoDownload", autoDownload.value);
            await store.set("downloadPath", downloadPath.value);
            await store.save();
            snapshotDownload();
            return true;
        } catch (err) {
            console.error("保存下载配置失败:", err);
            return false;
        }
    }

    /**
     * 设置并立即持久化下载路径（供地图页下载配置面板直接修改，与本页共用同一份状态）。
     * 仅刷新快照中的 path，不影响线程数等其他项的 dirty 判定。返回 true 表示已落盘。
     */
    async function setDownloadPath(path: string) {
        downloadPath.value = path.trim();
        if (!isTauri || !store) return false;
        try {
            await store.set("downloadPath", downloadPath.value);
            await store.save();
            savedDownload.value = { ...savedDownload.value, path: downloadPath.value };
            return true;
        } catch (err) {
            console.error("保存下载路径失败:", err);
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
        downloadPath,
        defaultDownloadPath,
        effectiveDownloadPath,
        isUsingDefaultDownloadPath,
        isMapConfigDirty,
        isDownloadConfigDirty,
        isTauri,
        init,
        setAutostart,
        saveMapConfig,
        saveDownloadConfig,
        setDownloadPath,
    };
});
