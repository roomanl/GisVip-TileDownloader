import { computed, ref } from "vue";
import { defineStore } from "pinia";
import { layerList, type MapLayer } from "@/config/layerList";
import { DOWNLOAD_CONFIG_DEFAULTS, DOWNLOAD_LEVEL_RANGE } from "@/config";
import { useSettingsStore } from "@/stores/settings";

/** 取第一个可选地图源（首个分组的首个叶子），用于默认选中 */
function findFirstLayer(): MapLayer | null {
    for (const group of layerList) {
        const leaf = group.children?.find((c) => !!c.url);
        if (leaf) return leaf;
    }
    return null;
}

/** 根据叶子 id 反查其所属分组标签 */
function findGroupLabel(id: string): string | null {
    return layerList.find((g) => g.children?.some((c) => c.id === id))?.label ?? null;
}

/** 选中的行政区划（仅记录本级与父级名称，用于标题展示） */
export interface RegionSelection {
    adcode: string;
    name: string;
    /** 父级名称，省级为顶层时为 null */
    parentName: string | null;
}

/** 区域标题：有父级则「父级-本级」，否则仅本级（如 北京市 / 北京市-市辖区） */
function regionTitleOf(r: RegionSelection) {
    return r.parentName ? `${r.parentName}-${r.name}` : r.name;
}

/** 已添加的下载任务（内存保存，下载引擎待实现） */
export interface DownloadTask {
    id: string;
    /** 下载区域名称 */
    areaName: string;
    /** 下载范围（坐标串） */
    extent: string;
    levelMin: number;
    levelMax: number;
    /** 源坐标系（取自选中图层） */
    projection: string;
    tileFormat: string;
    tileCount: number;
    /** 生效的下载目录 */
    outputPath: string;
    sourceLayerId: string;
    sourceLayerTitle: string;
    /** 是否添加后自动开始下载（取自系统设置） */
    autoStart: boolean;
    /** 是否同时下载注记图层（仅当选中图层含注记层时可为 true） */
    withDownloadLabel: boolean;
    createdAt: number;
}

/** 添加下载任务的校验结果 */
export interface AddTaskResult {
    ok: boolean;
    /** 校验不通过的项，供页面 toast 提示 */
    errors: string[];
    /** 校验通过时新建的任务 */
    task: DownloadTask | null;
}

/**
 * 地图模块共享状态（见 src/views/modules/map）：
 * 地图页各组件（左栏配置面板 / 地图源树 / 右栏地图区）跨组件互相读写，
 * 统一以此 store 为单一数据源，避免逐层 props 透传。
 * 后续下载配置、区域选择等共享数据也在此扩展。
 */
export const useMapStore = defineStore("map", () => {
    /** 当前选中的地图源图层（树叶子节点），默认选中第一个 */
    const selectedLayer = ref<MapLayer | null>(findFirstLayer());

    /** 选中图层 id，供地图源树高亮受控 */
    const selectedLayerId = computed(() => selectedLayer.value?.id ?? null);
    /** 选中图层标题，格式「分组-图层」（如 高德地图-电子地图），供右栏标题栏显示 */
    const selectedLayerTitle = computed(() => {
        const layer = selectedLayer.value;
        if (!layer) return null;
        const groupLabel = findGroupLabel(layer.id);
        return groupLabel ? `${groupLabel}-${layer.label}` : layer.label;
    });

    function selectLayer(layer: MapLayer) {
        selectedLayer.value = layer;
        // TODO: 后续据此驱动右栏地图引擎切换底图
    }

    /** 当前选中的行政区划，null 表示未选择 */
    const selectedRegion = ref<RegionSelection | null>(null);
    /** 下载配置表单：区域名称 / 下载范围 / 层级起止 / 瓦片格式 / 瓦片数量（区域名称由选中区域自动填入） */
    const downloadAreaName = ref(DOWNLOAD_CONFIG_DEFAULTS.areaName);
    const downloadExtent = ref(DOWNLOAD_CONFIG_DEFAULTS.extent);
    const downloadLevels = ref<number[]>([...DOWNLOAD_CONFIG_DEFAULTS.levels]);
    const tileFormat = ref<string>(DOWNLOAD_CONFIG_DEFAULTS.tileFormat);
    /** 瓦片数量，默认 0（页面隐藏），由外部计算后赋值 */
    const tileCount = ref(DOWNLOAD_CONFIG_DEFAULTS.tileCount);
    /** 是否同时下载注记图层，默认不勾选（仅当选中图层含注记层时展示） */
    const downloadWithLabel = ref(DOWNLOAD_CONFIG_DEFAULTS.withLabel);
    /** 选中区域标题：有父级则「父级-本级」，否则仅本级（如 北京市 / 北京市-市辖区） */
    const selectedRegionTitle = computed(() => {
        const r = selectedRegion.value;
        return r ? regionTitleOf(r) : null;
    });

    function selectRegion(region: RegionSelection) {
        selectedRegion.value = region;
        // 选中区域后自动填入下载区域名称
        downloadAreaName.value = regionTitleOf(region);
    }

    function clearRegion() {
        selectedRegion.value = null;
        downloadAreaName.value = DOWNLOAD_CONFIG_DEFAULTS.areaName;
    }

    function clearSelection() {
        selectedLayer.value = null;
    }

    /** 层级起止（保证起始 <= 结束，供标题与任务快照使用） */
    const downloadLevelMin = computed(() => downloadLevels.value[0] ?? DOWNLOAD_LEVEL_RANGE.min);
    const downloadLevelMax = computed(() => {
        const max = downloadLevels.value[1] ?? DOWNLOAD_LEVEL_RANGE.max;
        return max < downloadLevelMin.value ? downloadLevelMin.value : max;
    });

    /** 源坐标系：选中图层的 projection，未选图层时为空 */
    const sourceProjection = computed(() => selectedLayer.value?.projection ?? "");

    /** 选中图层是否含注记图层，决定「同时下载注记」配置项是否展示 */
    const hasLabelLayer = computed(() => !!selectedLayer.value?.labelLayer);

    /** 已添加的下载任务列表（内存，最新的在前） */
    const downloadTasks = ref<DownloadTask[]>([]);

    /** 校验下载配置，返回不符合要求的项（空数组表示通过） */
    function validateDownloadConfig(): string[] {
        const settings = useSettingsStore();
        const errors: string[] = [];
        if (!selectedLayer.value) errors.push("请选择地图源");
        if (!downloadAreaName.value.trim()) errors.push("请输入下载区域名称");
        if (!downloadExtent.value.trim()) errors.push("请输入下载范围");
        if (downloadLevels.value.length < 2) errors.push("请选择下载层级");
        else if (downloadLevelMin.value > downloadLevelMax.value) errors.push("起始层级不能大于结束层级");
        if (!tileFormat.value) errors.push("请选择瓦片格式");
        if (!settings.effectiveDownloadPath) errors.push("请选择下载路径");
        return errors;
    }

    /**
     * 添加下载任务：先校验配置，不通过则直接返回错误项（由各调用方提示）；
     * 通过则将当前配置快照写入 downloadTasks（仅内存，下载引擎待实现）。
     */
    function addDownloadTask(): AddTaskResult {
        const errors = validateDownloadConfig();
        if (errors.length) return { ok: false, errors, task: null };
        const settings = useSettingsStore();
        const layer = selectedLayer.value!;
        const task: DownloadTask = {
            id: `${layer.id}-${Date.now()}`,
            areaName: downloadAreaName.value.trim(),
            extent: downloadExtent.value.trim(),
            levelMin: downloadLevelMin.value,
            levelMax: downloadLevelMax.value,
            projection: sourceProjection.value,
            tileFormat: tileFormat.value,
            tileCount: tileCount.value,
            outputPath: settings.effectiveDownloadPath,
            sourceLayerId: layer.id,
            sourceLayerTitle: selectedLayerTitle.value ?? layer.label,
            autoStart: settings.autoDownload,
            // 仅当图层含注记层且勾选时才下载注记
            withDownloadLabel: hasLabelLayer.value && downloadWithLabel.value,
            createdAt: Date.now(),
        };
        downloadTasks.value.unshift(task);
        return { ok: true, errors: [], task };
    }

    return {
        selectedLayer,
        selectedLayerId,
        selectedLayerTitle,
        selectLayer,
        clearSelection,
        selectedRegion,
        selectedRegionTitle,
        selectRegion,
        clearRegion,
        downloadAreaName,
        downloadExtent,
        downloadLevels,
        downloadLevelMin,
        downloadLevelMax,
        tileFormat,
        tileCount,
        downloadWithLabel,
        hasLabelLayer,
        sourceProjection,
        downloadTasks,
        validateDownloadConfig,
        addDownloadTask,
    };
});
