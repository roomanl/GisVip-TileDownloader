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
/** 默认下载目录相对资源目录（resourceDir，Windows 下即应用根目录）的子目录名（下载路径未自定义时使用） */
export const DOWNLOAD_DEFAULT_SUBDIR = "downloads";

/** 各设置项默认值（无持久化记录时使用），统一定义便于集中管理 */
export const SETTINGS_DEFAULTS = {
    /** 默认主题配色 */
    themeColor: "default",
    /** 默认天地图密钥 */
    tiandituKey: "",
    /** 下载设置默认值（path 为空字符串表示使用默认下载目录） */
    download: { threads: 4, retryCount: 3, autoDownload: false, path: "" },
};

/** 下载层级区间（范围滑块取值范围，包含端点） */
export const DOWNLOAD_LEVEL_RANGE = { min: 0, max: 18 };

/** 瓦片格式选项（单选组/下拉选共用） */
export const TILE_FORMATS: { value: string; label: string }[] = [
    { value: "jpg", label: "JPG" },
    { value: "png", label: "PNG" },
];

/** 地图页「下载配置」各字段默认值（与系统设置同理，统一在此维护） */
export const DOWNLOAD_CONFIG_DEFAULTS = {
    /** 下载区域名称，选中行政区划后自动填入 */
    areaName: "",
    /** 下载范围（坐标串），由外部计算或手动输入 */
    extent: "",
    /** 下载层级起止 [起始, 结束] */
    levels: [5, 10],
    /** 源坐标系来自选中图层的 projection，无默认值 */
    tileFormat: "jpg",
    /** 瓦片数量，默认 0（隐藏），由外部计算后赋值 */
    tileCount: 0,
    /** 是否同时下载注记图层（仅当地层含注记层时生效），默认不勾选 */
    withLabel: false,
};