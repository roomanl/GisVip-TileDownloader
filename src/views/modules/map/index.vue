<script setup lang="ts">
import { MapLeftPanel, MapCanvasPanel } from "./components";

/**
 * 地图下载页（2 栏布局：栏一 + 本页）：
 * 左栏 = 下载配置/地图源/区域 Tabs 面板，右栏 = 主地图展示区（顶部标题栏）。
 * 地图源选中等跨组件状态由 useMapStore 统一管理，本页仅负责两栏布局。
 * 菜单配置 bleed: true 使壳层内容区无内边距，本页 h-full 直接铺满可用高度。
 */
</script>

<template>
  <div class="flex h-full gap-2 p-2">
    <!-- 左栏：配置面板 -->
    <MapLeftPanel />
    <!-- 右栏：主地图（标题栏显示选中图层名称） -->
    <MapCanvasPanel />
  </div>
</template>
