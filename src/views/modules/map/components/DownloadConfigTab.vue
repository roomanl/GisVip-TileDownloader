<script setup lang="ts">
import { toast } from "vue-sonner";
import { open } from "@tauri-apps/plugin-dialog";
import { FolderOpen, Plus } from "lucide-vue-next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { DOWNLOAD_DEFAULT_SUBDIR, DOWNLOAD_LEVEL_RANGE, TILE_FORMATS } from "@/config";
import { useMapStore } from "@/stores/map";
import { useSettingsStore } from "@/stores/settings";

/**
 * 左栏「下载配置」Tab：区域名称 / 下载范围 / 下载层级 / 源坐标系 / 瓦片数量 / 瓦片格式 / 下载路径。
 * 表单状态统一放 useMapStore（区域名称由 selectRegion 自动回填，瓦片数量与下载范围由外部计算赋值）；
 * 下载路径与系统设置共用 useSettingsStore，此处选定目录后即时写盘、两侧同步。
 */
const map = useMapStore();
const settings = useSettingsStore();

/** 打开系统目录选择器，选定后立即持久化下载路径（系统设置页同步生效） */
async function pickDownloadPath() {
  if (!settings.isTauri) {
    toast.warning("浏览器预览环境不支持系统目录选择器");
    return;
  }
  try {
    const selected = await open({
      title: "选择下载目录",
      directory: true,
      default: settings.effectiveDownloadPath || undefined,
    });
    if (typeof selected !== "string" || !selected) return;
    const saved = await settings.setDownloadPath(selected);
    if (!saved) toast.error("下载路径写入失败，详见控制台日志");
  } catch (err) {
    console.error("选择下载目录失败:", err);
    toast.error("打开目录选择器失败，详见控制台日志");
  }
}

/** 添加下载任务：校验各配置项，不通过则逐项提示 */
function addDownloadTask() {
  const { ok, errors, task } = map.addDownloadTask();
  if (!ok || !task) {
    toast.warning(errors.join("；"));
    return;
  }
  toast.success(`已添加下载任务：${task.areaName}（${task.levelMin}-${task.levelMax} 级）`);
}
</script>

<template>
  <div class="flex h-full min-h-0 flex-col gap-4 overflow-auto p-4">
    <!-- 下载区域名称：选中行政区划后自动填入，可手动修改 -->
    <div class="space-y-1.5">
      <Label for="dl-area-name">下载区域名称</Label>
      <Input
        id="dl-area-name"
        v-model="map.downloadAreaName"
        placeholder="选择区域后自动填入"
        class="h-8"
      />
    </div>

    <!-- 下载范围：只读，由外部计算后填入，两行展示 -->
    <div class="space-y-1.5">
      <Label for="dl-extent">下载范围</Label>
      <Textarea
        id="dl-extent"
        :model-value="map.downloadExtent"
        :rows="2"
        readonly
        placeholder="选择区域后自动填入"
        class="h-14 min-h-0 resize-none overflow-auto px-2 py-1.5 font-mono text-xs leading-5"
      />
    </div>

    <!-- 下载层级：0-18 范围滑块，标题括号内数值跟随滑块 -->
    <div class="space-y-2">
      <Label>下载层级({{ map.downloadLevelMin }}-{{ map.downloadLevelMax }})</Label>
      <Slider
        v-model="map.downloadLevels"
        :min="DOWNLOAD_LEVEL_RANGE.min"
        :max="DOWNLOAD_LEVEL_RANGE.max"
        :step="1"
      />
      <div class="flex justify-between text-xs text-muted-foreground">
        <span>{{ DOWNLOAD_LEVEL_RANGE.min }}</span>
        <span>{{ DOWNLOAD_LEVEL_RANGE.max }}</span>
      </div>
    </div>

    <Separator />

    <!-- 只读信息：源坐标系跟随选中图层，瓦片数量仅在 >0 时显示 -->
    <div class="space-y-1.5 text-sm">
      <div class="flex items-center justify-between gap-2">
        <span class="text-muted-foreground">源坐标系</span>
        <span class="truncate font-mono text-xs" :title="map.sourceProjection">
          {{ map.sourceProjection || "未选择地图源" }}
        </span>
      </div>
      <div v-if="map.tileCount > 0" class="flex items-center justify-between gap-2">
        <span class="text-muted-foreground">瓦片数量</span>
        <span class="font-mono text-xs">{{ map.tileCount.toLocaleString() }}</span>
      </div>
    </div>

    <!-- 瓦片格式：下拉选择，默认 jpg -->
    <div class="flex items-center justify-between gap-2">
      <Label for="dl-format">瓦片格式</Label>
      <Select v-model="map.tileFormat">
        <SelectTrigger id="dl-format" size="sm" class="w-24">
          <SelectValue placeholder="请选择格式" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem
            v-for="format in TILE_FORMATS"
            :key="format.value"
            :value="format.value"
          >
            {{ format.label }}
          </SelectItem>
        </SelectContent>
      </Select>
    </div>

    <!-- 同时下载注记：仅当选中图层含注记层时展示，标题居左、复选框+“是”居右 -->
    <div v-if="map.hasLabelLayer" class="flex items-center justify-between gap-2">
      <Label for="dl-with-label">同时下载注记</Label>
      <div class="flex items-center gap-2">
        <span class="text-sm">是</span>
        <Checkbox id="dl-with-label" v-model="map.downloadWithLabel" />
      </div>
    </div>

    <!-- 下载路径：与系统设置共用，选定即写盘 -->
    <div class="space-y-1.5">
      <Label for="dl-path">下载路径</Label>
      <div class="flex items-center gap-2">
        <Input
          id="dl-path"
          readonly
          :model-value="settings.effectiveDownloadPath"
          :placeholder="`应用根目录/${DOWNLOAD_DEFAULT_SUBDIR}`"
          :title="settings.effectiveDownloadPath"
          class="h-8 min-w-0 flex-1 font-mono text-xs"
        />
        <Button type="button" variant="outline" size="icon" class="size-8 shrink-0" @click="pickDownloadPath">
          <FolderOpen />
          <span class="sr-only">选择下载目录</span>
        </Button>
      </div>
    </div>

    <Button type="button" class="mt-auto w-full" @click="addDownloadTask">
      <Plus />
      添加下载任务
    </Button>
  </div>
</template>
