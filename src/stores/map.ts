import { computed, ref } from "vue";
import { defineStore } from "pinia";
import { layerList, type MapLayer } from "@/config/layerList";

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
    /** 选中区域标题：有父级则「父级-本级」，否则仅本级（如 北京市 / 北京市-市辖区） */
    const selectedRegionTitle = computed(() => {
        const r = selectedRegion.value;
        if (!r) return null;
        return r.parentName ? `${r.parentName}-${r.name}` : r.name;
    });

    function selectRegion(region: RegionSelection) {
        selectedRegion.value = region;
    }

    function clearRegion() {
        selectedRegion.value = null;
    }

    function clearSelection() {
        selectedLayer.value = null;
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
    };
});
