<script setup lang="ts">
import { onActivated, onBeforeUnmount, onMounted, ref, shallowRef, watch } from "vue";
import { Map as MapIcon, MapPinned } from "lucide-vue-next";
import "ol/ol.css";
import OlMap from "@/lib/map/OlMap";
import { useMapStore } from "@/stores/map";

/**
 * 地图页右栏：主地图展示区，顶部为标题栏。
 * 标题栏依次展示「地图源标题」与「区域标题」（读 useMapStore），中间以竖分割线分隔；
 * 区域标题格式为「父级-本级」（省为顶层时仅显示省名）。未选择时显示占位文案。
 * 地图由 OlMap 挂载到标题栏下方的容器，切换地图源时重新加载底图。
 */
const mapStore = useMapStore();

const containerRef = ref<HTMLDivElement>();
/** OlMap 是普通类实例，无需深层响应式，用 shallowRef 持有 */
const olMap = shallowRef<OlMap | null>(null);
let resizeObserver: ResizeObserver | null = null;

onMounted(() => {
  const container = containerRef.value;
  if (!container) return;

  const instance = new OlMap();
  instance.initMap(container);
  instance.addScaleLine();
  olMap.value = instance;

  if (mapStore.selectedLayer) instance.loadBaseMap(mapStore.selectedLayer);

  // 容器尺寸变化（左右分栏拖拽、窗口缩放）后重算画布，避免瓦片错位
  resizeObserver = new ResizeObserver(() => instance.updateSize());
  resizeObserver.observe(container);
});

// 切换地图源：重新加载底图、注记层与总览图；清空选中则移除已挂载图层
watch(
  () => mapStore.selectedLayer,
  (layer) => {
    if (layer) olMap.value?.loadBaseMap(layer);
    else olMap.value?.clearLayer();
  },
);

// 页面被 KeepAlive 缓存，重新显示时容器宽度可能已变，需刷新一次尺寸
onActivated(() => olMap.value?.updateSize());

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
  resizeObserver = null;
  olMap.value?.destroy();
  olMap.value = null;
});
</script>

<template>
  <div class="flex h-full min-w-0 flex-1 flex-col overflow-hidden rounded-lg border bg-card">
    <!-- 顶部标题栏：地图源标题 | 区域标题 -->
    <div class="flex h-11 shrink-0 items-center gap-2 border-b bg-muted/50 px-3">
      <MapIcon class="size-4 shrink-0 text-muted-foreground" />
      <span class="truncate text-sm font-medium text-foreground">
        {{ mapStore.selectedLayerTitle ?? "未选择地图源" }}
      </span>

      <!-- 竖分割线（选中区域时显示） -->
      <template v-if="mapStore.selectedRegionTitle">
        <div class="h-4 w-px shrink-0 bg-border" />
        <MapPinned class="size-4 shrink-0 text-muted-foreground" />
        <span class="truncate text-sm font-medium text-foreground">
          {{ mapStore.selectedRegionTitle }}
        </span>
      </template>
    </div>

    <!-- 地图主体：OlMap 挂载容器 -->
    <div ref="containerRef" class="min-h-0 flex-1 overflow-hidden" />
  </div>
</template>
