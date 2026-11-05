export const aliyunDatavBaseUrl = 'https://geo.datav.aliyun.com/areas_v3/bound/'

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

/** 各设置项默认值（无持久化记录时使用），统一定义便于集中管理 */
export const SETTINGS_DEFAULTS = {
    /** 默认主题配色 */
    themeColor: "default",
    /** 默认天地图密钥 */
    tiandituKey: "",
    /** 下载设置默认值 */
    download: { threads: 4, retryCount: 3, autoDownload: false },
};