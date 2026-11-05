/**
 * 下载管理模块静态数据（页面预览用）。
 * 后续接入下载引擎后，任务列表改由 store / 持久化提供，此处仅作展示契约与占位数据。
 */

/** 任务状态：等待下载 / 下载中 / 暂停 / 下载失败 / 下载完成 */
export type TaskStatus = "pending" | "downloading" | "paused" | "failed" | "completed";

/** 下载管理任务项（列表 + 详情共用一套字段） */
export interface DownloadTaskItem {
    id: string;
    /** 任务名称（标题） */
    name: string;
    status: TaskStatus;
    /** 创建/下载时间戳（毫秒），列表用 dayjs 相对时间展示 */
    createdAt: number;

    // ===== 详情：通用展示项 =====
    /** 地图源（分组-图层） */
    mapSource: string;
    /** 下载区域 */
    region: string;
    /** 下载面积（已格式化文本） */
    area: string;
    /** 下载层级（如 5-10） */
    levels: string;
    /** 坐标范围（WGS84 坐标串） */
    extent: string;
    /** 源坐标系 */
    projection: string;
    /** 瓦片注记（同时下载注记：是/否） */
    annotation: string;
    /** 瓦片格式 */
    tileFormat: string;
    /** 瓦片数量（总数） */
    tileCount: number;
    /** 下载路径 */
    outputPath: string;

    // ===== 详情：未完成任务独有 =====
    /** 下载进度百分比 0-100 */
    progressPercent: number;
    /** 下载状态文案 */
    statusText: string;
    /** 总瓦片数 */
    totalTiles: number;
    /** 下载成功数 */
    successCount: number;
    /** 失败数 */
    failCount: number;
}

/** 状态元信息：标签文案 + Badge 样式类 */
export const TASK_STATUS_META: Record<TaskStatus, { label: string; badgeClass: string }> = {
    pending: { label: "等待下载", badgeClass: "border-transparent bg-secondary text-secondary-foreground" },
    downloading: { label: "下载中", badgeClass: "border-transparent bg-primary text-primary-foreground" },
    paused: { label: "暂停", badgeClass: "border-transparent bg-muted text-muted-foreground" },
    failed: { label: "下载失败", badgeClass: "border-transparent bg-destructive text-white" },
    completed: { label: "下载完成", badgeClass: "border-transparent bg-emerald-500 text-white" },
};

/** 是否归入「已完成」Tab（其余都归「下载中」Tab） */
export function isCompletedTask(task: DownloadTaskItem): boolean {
    return task.status === "completed";
}

const DAY = 24 * 60 * 60 * 1000;
const now = Date.now();

/** 静态示例任务：覆盖 5 种状态，时间错开以展示相对时间效果 */
export const mockTasks: DownloadTaskItem[] = [
    {
        id: "t-1",
        name: "北京市-城区影像",
        status: "downloading",
        createdAt: now - 3 * 60 * 1000,
        mapSource: "高德地图-卫星影像",
        region: "北京市-市辖区",
        area: "1,641 km²",
        levels: "12-16",
        extent: "115.42,39.44,117.51,41.06",
        projection: "EPSG:3857 (WGS84 / 高德墨卡托)",
        annotation: "否",
        tileFormat: "jpg",
        tileCount: 45200,
        outputPath: "D:/GisVip/downloads/beijing",
        progressPercent: 62,
        statusText: "下载中",
        totalTiles: 45200,
        successCount: 28024,
        failCount: 12,
    },
    {
        id: "t-2",
        name: "上海市-电子地图",
        status: "paused",
        createdAt: now - 2 * 60 * 60 * 1000,
        mapSource: "天地图-矢量底图",
        region: "上海市-市辖区",
        area: "6,341 km²",
        levels: "10-15",
        extent: "120.85,30.68,122.00,31.88",
        projection: "EPSG:4326 (WGS84)",
        annotation: "是",
        tileFormat: "png",
        tileCount: 128000,
        outputPath: "D:/GisVip/downloads/shanghai",
        progressPercent: 34,
        statusText: "已暂停",
        totalTiles: 128000,
        successCount: 43520,
        failCount: 0,
    },
    {
        id: "t-3",
        name: "广东省-全省影像",
        status: "failed",
        createdAt: now - 26 * 60 * 60 * 1000,
        mapSource: "百度地图-卫星影像",
        region: "广东省",
        area: "179,725 km²",
        levels: "8-14",
        extent: "109.62,20.18,117.19,25.40",
        projection: "EPSG:3857 (BD09 / 百度墨卡托)",
        annotation: "否",
        tileFormat: "jpg",
        tileCount: 986000,
        outputPath: "D:/GisVip/downloads/guangdong",
        progressPercent: 78,
        statusText: "下载失败（连续请求超时）",
        totalTiles: 986000,
        successCount: 769080,
        failCount: 5320,
    },
    {
        id: "t-4",
        name: "浙江省-电子地图",
        status: "pending",
        createdAt: now - 5 * DAY,
        mapSource: "高德地图-电子地图",
        region: "浙江省",
        area: "105,500 km²",
        levels: "9-13",
        extent: "118.42,27.10,122.98,31.18",
        projection: "EPSG:3857 (WGS84 / 高德墨卡托)",
        annotation: "否",
        tileFormat: "jpg",
        tileCount: 210000,
        outputPath: "D:/GisVip/downloads/zhejiang",
        progressPercent: 0,
        statusText: "等待下载",
        totalTiles: 210000,
        successCount: 0,
        failCount: 0,
    },
    {
        id: "t-5",
        name: "成都市-城区矢量",
        status: "completed",
        createdAt: now - 12 * DAY,
        mapSource: "天地图-矢量底图",
        region: "成都市-市辖区",
        area: "14,335 km²",
        levels: "10-16",
        extent: "103.20,30.07,104.90,31.10",
        projection: "EPSG:4326 (WGS84)",
        annotation: "是",
        tileFormat: "png",
        tileCount: 76000,
        outputPath: "D:/GisVip/downloads/chengdu",
        progressPercent: 100,
        statusText: "下载完成",
        totalTiles: 76000,
        successCount: 76000,
        failCount: 0,
    },
    {
        id: "t-6",
        name: "全国-低层级概览",
        status: "completed",
        createdAt: now - 2 * 30 * DAY,
        mapSource: "OpenStreetMap-标准",
        region: "中国",
        area: "9,596,961 km²",
        levels: "3-6",
        extent: "73.50,18.15,135.08,53.55",
        projection: "EPSG:3857 (WGS84 / Web 墨卡托)",
        annotation: "否",
        tileFormat: "jpg",
        tileCount: 5460,
        outputPath: "D:/GisVip/downloads/china-overview",
        progressPercent: 100,
        statusText: "下载完成",
        totalTiles: 5460,
        successCount: 5460,
        failCount: 0,
    },
];
