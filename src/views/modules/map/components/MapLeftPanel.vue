<script setup lang="ts">
import { ref } from "vue";
import { Download, Map as MapIcon, MapPinned } from "lucide-vue-next";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DownloadConfigTab from "./DownloadConfigTab.vue";
import MapSourceTab from "./MapSourceTab.vue";
import MapRegionTab from "./MapRegionTab.vue";

/**
 * 地图页左栏：Tabs 配置面板（下载配置 / 地图源 / 区域）。
 * 各 Tab 内容拆分为独立组件，面板间共享的选中状态后续可提升到 map 页面或 store。
 */
const activeTab = ref("download");
</script>

<template>
  <div class="flex h-full min-h-0 w-70 shrink-0 flex-col overflow-hidden rounded-lg border bg-card text-card-foreground">
    <!-- Tabs 默认 flex-col：Tab 头在上、内容区在下，内容区自行滚动 -->
    <Tabs v-model="activeTab" class="min-h-0 flex-1">
      <TabsList class="h-11 w-full shrink-0 justify-start rounded-none border-b bg-muted/50 p-1">
        <TabsTrigger value="download" class="px-3">
          <Download />下载配置
        </TabsTrigger>
        <TabsTrigger value="source" class="px-3">
          <MapIcon />地图源
        </TabsTrigger>
        <TabsTrigger value="region" class="px-3">
          <MapPinned />区域
        </TabsTrigger>
      </TabsList>
      <TabsContent value="download" class="min-h-0 flex-1 overflow-hidden">
        <DownloadConfigTab />
      </TabsContent>
      <TabsContent value="source" class="min-h-0 flex-1 overflow-hidden">
        <MapSourceTab />
      </TabsContent>
      <TabsContent value="region" class="min-h-0 flex-1 overflow-hidden">
        <MapRegionTab />
      </TabsContent>
    </Tabs>
  </div>
</template>
