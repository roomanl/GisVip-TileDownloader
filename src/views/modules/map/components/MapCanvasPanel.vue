<script setup lang="ts">
import { Map as MapIcon, MapPinned } from "lucide-vue-next";
import { useMapStore } from "@/stores/map";

/**
 * 地图页右栏：主地图展示区，顶部为标题栏。
 * 标题栏依次展示「地图源标题」与「区域标题」（读 useMapStore），中间以竖分割线分隔；
 * 区域标题格式为「父级-本级」（省为顶层时仅显示省名）。未选择时显示占位文案。
 */
const mapStore = useMapStore();
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

    <!-- 地图主体 -->
    <div class="min-h-0 flex-1" />
  </div>
</template>
