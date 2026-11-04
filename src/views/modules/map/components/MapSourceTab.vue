<script setup lang="ts">
import { reactive } from "vue";
import { layerList } from "@/config/layerList";
import { useMapStore } from "@/stores/map";
import MapSourceTree from "./MapSourceTree.vue";

/**
 * 左栏「地图源」Tab：以 tree 形式展示各厂商瓦片源。
 * 分组展开状态为本地 UI 状态；图层选中统一走 useMapStore，供右栏标题等跨组件共享。
 */
const mapStore = useMapStore();

// 默认展开所有厂商分组，便于直接看到可选源
const expanded = reactive<Record<string, boolean>>(
  Object.fromEntries(layerList.map((g) => [g.id, true])),
);

function toggle(id: string) {
  expanded[id] = !expanded[id];
}
</script>

<template>
  <div class="h-full min-h-0 overflow-auto p-2">
    <MapSourceTree
      :nodes="layerList"
      :expanded="expanded"
      :selected-id="mapStore.selectedLayerId"
      @toggle="toggle"
      @select="mapStore.selectLayer"
    />
  </div>
</template>
