<script setup lang="ts">
import { onActivated, onBeforeUnmount, onMounted, ref, shallowRef, watch } from "vue";
import { Map as MapIcon, MapPinned, VectorSquare } from "lucide-vue-next";
import { toast } from "vue-sonner";
import "ol/ol.css";
import OlMap, { MAX_ZOOM, MIN_ZOOM } from "@/lib/map/OlMap";
import RegionBoundaryDrawer from "@/lib/map/RegionBoundaryDrawer";
import { MapToolbar, MapZoomSlider, MapCoordinate } from "@/components/map";
import { DOWNLOAD_CONFIG_DEFAULTS } from "@/config";
import { useMapStore } from "@/stores/map";

/**
 * 地图页右栏：主地图展示区，顶部为标题栏。
 * 标题栏依次展示「地图源标题」、「区域标题」（读 useMapStore）与「区域面积」（边界绘制结果），
 * 中间以竖分割线分隔；区域标题格式为「父级-本级」（省为顶层时仅显示省名）。未选择时显示占位文案。
 * 地图由 OlMap 挂载到标题栏下方的容器，切换地图源时重新加载底图；
 * 选中行政区划后由 RegionBoundaryDrawer 把区域边界高亮绘制在底图之上，
 * 并将边界范围（经纬度坐标串）回填到下载配置、面积展示在标题栏。
 * 左上角悬浮工具栏，右上角缩放按钮下方悬浮层级滑块（与视图层级双向同步）。
 */
const mapStore = useMapStore();

const containerRef = ref<HTMLDivElement>();
/** OlMap 是普通类实例，无需深层响应式，用 shallowRef 持有 */
const olMap = shallowRef<OlMap | null>(null);
/** 边界绘制类依附 OlMap 实例，随地图一起创建/销毁，不参与渲染故不用 ref */
let boundaryDrawer: RegionBoundaryDrawer | null = null;
/** 区域面积文本：仅本栏标题栏展示，随边界绘制/清除同步 */
const boundaryAreaText = ref<string | null>(null);
/** 工具栏状态：经纬网格显隐、是否处于矩形范围绘制模式（受控下发给 MapToolbar） */
const gridActive = ref(false);
const drawActive = ref(false);
/** 当前地图层级：滑块与视图双向同步的单一数据源（视图层级取整后写入） */
const zoomLevel = ref(MIN_ZOOM);
/** 鼠标经纬度(WGS84)[lng, lat]：坐标展示组件的单一数据源，由地图鼠标事件回填 */
const coordinate = ref<[number, number] | null>(null);
/** 坐标取值模式：move 实时跟随鼠标，click 仅点击地图后更新 */
const coordMode = ref<"move" | "click">("move");
/** 比例尺容器：把 OL ScaleLine 控件渲染到坐标组件右侧 */
const scaleLineRef = ref<HTMLDivElement>();
let resizeObserver: ResizeObserver | null = null;

/** 绘制选中区域边界：有选中则拉取边界并回填范围与面积，取消选中则一并清除 */
async function renderRegionBoundary() {
  const region = mapStore.selectedRegion;
  if (!boundaryDrawer) return;
  if (!region) {
    boundaryDrawer.clear();
    resetBoundaryResult();
    return;
  }
  try {
    // 返回 null 表示期间已切换/取消选中，结果作废，不回填
    const result = await boundaryDrawer.drawByAdcode(region.adcode);
    if (!result) return;
    mapStore.downloadExtent = result.extentText;
    boundaryAreaText.value = result.areaText;
  } catch (err) {
    console.error(err);
    toast.error(`绘制「${region.name}」边界失败`);
    // 绘制类已清空旧边界，同步清掉残留的范围与面积，避免与画布不一致
    resetBoundaryResult();
  }
}

/** 清空边界相关的回填值（下载范围恢复默认值） */
function resetBoundaryResult() {
  mapStore.downloadExtent = DOWNLOAD_CONFIG_DEFAULTS.extent;
  boundaryAreaText.value = null;
}

/** 工具栏：切换经纬网格显隐 */
function onToggleGrid() {
  const instance = olMap.value;
  if (!instance) return;
  if (gridActive.value) {
    instance.removeGraticule();
    gridActive.value = false;
  } else {
    instance.addGraticule();
    gridActive.value = true;
  }
}

/**
 * 工具栏：进入/退出矩形范围绘制。
 * 未激活时先由绘制类清除上一次的范围与行政区划绘制并挂载 Draw 交互，
 * 绘完矩形后回填下载范围与面积；激活中再次点击则取消未完成的绘制。
 */
function onDraw() {
  if (!boundaryDrawer) return;
  if (drawActive.value) {
    boundaryDrawer.cancelDraw();
    drawActive.value = false;
    return;
  }
  drawActive.value = true;
  boundaryDrawer.startDrawRectangle((result) => {
    // 绘制结束自动退出绘制模式并回填范围/面积；自定义绘制无区划名，下载名固定为“自定义区域”
    drawActive.value = false;
    mapStore.downloadExtent = result.extentText;
    mapStore.downloadAreaName = "自定义区域";
    boundaryAreaText.value = result.areaText;
  });
}

/** 工具栏：清除范围绘制与行政区划绘制，并复位回填值 */
function onClear() {
  boundaryDrawer?.clear();
  drawActive.value = false;
  resetBoundaryResult();
}

/** 坐标组件：切换“实时跟随鼠标”与“仅点击地图获取”两种取值模式 */
function onToggleCoordMode() {
  coordMode.value = coordMode.value === "move" ? "click" : "move";
}

onMounted(() => {
  const container = containerRef.value;
  if (!container) return;

  const instance = new OlMap();
  instance.initMap(container);
  // 比例尺渲染到坐标组件右侧的容器，与坐标展示同处左下角一行
  instance.addScaleLine(scaleLineRef.value);
  olMap.value = instance;
  boundaryDrawer = new RegionBoundaryDrawer(instance);

  // 层级双向同步：初始值取视图当前层级，后续由视图变化回写（取整，缩放动画中为小数）
  zoomLevel.value = Math.round(instance.getZoom());
  instance.onChangeZoom((zoom) => (zoomLevel.value = Math.round(zoom)));

  // 坐标：实时模式下鼠标移动跟随，点击模式下仅点击地图后更新
  instance.onPointerMove((lonlat) => {
    if (coordMode.value === "move") coordinate.value = lonlat;
  });
  instance.onPointerClick((lonlat) => {
    if (coordMode.value === "click") coordinate.value = lonlat;
  });

  if (mapStore.selectedLayer) instance.loadBaseMap(mapStore.selectedLayer);
  // 地图重建后补画已选中区域的边界（store 中的选中状态跨组件实例保留）
  void renderRegionBoundary();

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

// 选中行政区划变化：绘制/清除区域边界，并同步回填的下载范围与面积
watch(() => mapStore.selectedRegion, () => void renderRegionBoundary());

// 滑块拖动/键盘调层：地图跟随缩放（视图变化后又会把层级写回本值，同值不会抖动）
watch(zoomLevel, (level) => olMap.value?.setZoom(level));

// 页面被 KeepAlive 缓存，重新显示时容器宽度可能已变，需刷新一次尺寸
onActivated(() => olMap.value?.updateSize());

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
  resizeObserver = null;
  // 先释放边界图层再销毁地图，避免向已 dispose 的 Map 移除图层
  boundaryDrawer?.destroy();
  boundaryDrawer = null;
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

      <!-- 区域面积：边界绘制完成后显示 -->
      <template v-if="boundaryAreaText">
        <div class="h-4 w-px shrink-0 bg-border" />
        <VectorSquare class="size-4 shrink-0 text-muted-foreground" />
        <span class="truncate text-sm font-medium text-foreground">
          {{ boundaryAreaText }}
        </span>
      </template>
    </div>

    <!-- 地图主体：OlMap 挂载容器，左上角悬浮工具栏，右上角缩放按钮下方悬浮层级滑块 -->
    <div class="relative min-h-0 flex-1 overflow-hidden">
      <div ref="containerRef" class="h-full w-full" />
      <MapToolbar
        class="absolute left-2 top-2 z-10"
        :grid-active="gridActive"
        :draw-active="drawActive"
        @toggle-grid="onToggleGrid"
        @draw="onDraw"
        @clear="onClear"
      />
      <!-- 层级滑块：紧跟缩放按钮下方 -->
      <MapZoomSlider
        v-model:level="zoomLevel"
        class="map-zoom-slider"
        :min="MIN_ZOOM"
        :max="MAX_ZOOM"
      />

      <!-- 左下角：坐标展示 + 比例尺（比例尺渲染到坐标组件右侧容器） -->
      <div class="absolute bottom-2 left-2 z-10 flex items-center gap-2">
        <MapCoordinate
          :coordinate="coordinate"
          :mode="coordMode"
          @toggle-mode="onToggleCoordMode"
        />
        <div ref="scaleLineRef" class="flex items-center" />
      </div>
    </div>
  </div>
</template>

<style scoped>
/*
 * 缩放控件外观与 MapZoomSlider 面板对齐：同宽（2.75rem）、同圆角（0.5rem）、同阴影（shadow-sm）、同卡片底。
 * 默认在左上角（与工具栏同位），移到地图右上角。用 rem 而非 em，令缩放控件与滑块共享同一尺寸基准。
 */
:deep(.ol-zoom) {
  top: 0.5rem;
  right: 0.5rem;
  left: auto;
  width: 2.75rem;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 0.5rem;
  border-radius: 0.5rem;
  border: 1px solid var(--color-border);
  background-color: color-mix(in oklab, var(--color-card) 95%, transparent);
  box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  backdrop-filter: blur(4px);
}

/* 按钮撑满面板内容宽、用主色底呼应滑块数值块，字形居中 */
:deep(.ol-zoom button) {
  width: 100%;
  height: 1.75rem;
  margin: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: normal;
  border-radius: 0.25rem;
  background-color: var(--color-muted);
  color: var(--color-foreground);
}

/* 总览图默认在左下角，移到地图右下角（工具栏在左上，避免相左下堆叠） */
:deep(.ol-overviewmap) {
  left: auto;
  right: 0.5rem;
  bottom: 0.5rem;
}

/* 比例尺改用 target 渲染到坐标组件右侧的弹性容器，取消 OL 默认的左下角绝对定位 */
:deep(.ol-scale-line) {
  position: static;
  right: auto;
  bottom: auto;
  left: auto;
}

/* 层级滑块：紧贴在放大/缩小控件下方（缩放控件高约 78px + 上偏移 8px + 间隙 → top 5.625rem，与滑块同 right 对齐） */
.map-zoom-slider {
  position: absolute;
  top: 5.625rem;
  right: 0.5rem;
  z-index: 10;
}
</style>
