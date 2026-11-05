<script setup lang="ts">
import { computed } from "vue";
import dayjs from "dayjs";
import {
  CheckCircle2,
  Clock,
  Crosshair,
  Eye,
  FileImage,
  FolderOpen,
  Globe,
  HardDrive,
  Hash,
  Layers,
  MapPin,
  Pause,
  Play,
  Ruler,
  Tags,
  Trash2,
  XCircle,
  ZoomIn,
} from "lucide-vue-next";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TASK_STATUS_META, isCompletedTask, type DownloadTaskItem } from "../mock";

const props = defineProps<{
  task: DownloadTaskItem | null;
}>();

const emit = defineEmits<{
  start: [id: string];
  pause: [id: string];
  openFolder: [id: string];
  preview: [id: string];
  delete: [id: string];
}>();

/** 已完成任务只展示通用信息 + 完成态操作；进行中任务额外展示下载进度块 */
const done = computed(() => (props.task ? isCompletedTask(props.task) : false));

/** 创建时间（详情头部副标题用绝对时间，列表用相对时间） */
const createdText = computed(() =>
  props.task ? dayjs(props.task.createdAt).format("YYYY-MM-DD HH:mm") : "",
);

/** 下载中状态：进度条高亮脉冲（其余进行中状态用静态进度） */
const isDownloading = computed(() => props.task?.status === "downloading");

/** 通用详情项：扁平字段瓦片网格（不再分组） */
const commonFields = computed(() => {
  const t = props.task;
  if (!t) return [];
  return [
    { label: "地图源", value: t.mapSource, icon: Layers },
    { label: "下载区域", value: t.region, icon: MapPin },
    { label: "下载面积", value: t.area, icon: Ruler },
    { label: "下载层级", value: t.levels, icon: ZoomIn },
    { label: "源坐标系", value: t.projection, icon: Globe },
    { label: "瓦片注记", value: t.annotation, icon: Tags },
    { label: "瓦片格式", value: t.tileFormat.toUpperCase(), icon: FileImage },
    { label: "瓦片数量", value: t.tileCount.toLocaleString(), icon: Hash },
  ];
});

/** 长文本字段：整宽展示（等宽字体） */
const wideFields = computed(() => {
  const t = props.task;
  if (!t) return [];
  return [
    { label: "坐标范围", value: t.extent, icon: Crosshair },
    { label: "下载路径", value: t.outputPath, icon: HardDrive },
  ];
});

/** 进行中任务的瓦片统计三宫格 */
const statTiles = computed(() => {
  const t = props.task;
  if (!t) return [];
  return [
    { label: "总瓦片数", value: t.totalTiles.toLocaleString(), icon: Layers, class: "text-foreground" },
    { label: "下载成功", value: t.successCount.toLocaleString(), icon: CheckCircle2, class: "text-emerald-600 dark:text-emerald-400" },
    { label: "失败数", value: t.failCount.toLocaleString(), icon: XCircle, class: t.failCount > 0 ? "text-destructive" : "text-muted-foreground" },
  ];
});
</script>

<template>
  <div
    class="flex h-full min-h-0 flex-1 flex-col overflow-hidden rounded-lg border bg-card text-card-foreground"
  >
    <!-- 未选中任务时的空状态 -->
    <div
      v-if="!task"
      class="flex flex-1 flex-col items-center justify-center gap-3 text-muted-foreground"
    >
      <div class="flex size-14 items-center justify-center rounded-full bg-muted">
        <FolderOpen class="size-6 opacity-50" />
      </div>
      <div class="text-center">
        <p class="text-sm font-medium">未选择任务</p>
        <p class="mt-0.5 text-xs">从左侧列表选择一个任务查看详情</p>
      </div>
    </div>

    <template v-else>
      <!-- 标题栏：任务名 + 状态 + 创建时间 -->
      <div class="flex shrink-0 items-start justify-between gap-3 border-b px-5 py-4">
        <div class="min-w-0 space-y-1.5">
          <h2 class="truncate text-base font-semibold leading-tight">{{ task.name }}</h2>
          <div class="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock class="size-3.5" />
            <span>创建于 {{ createdText }}</span>
          </div>
        </div>
        <span
          class="inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
          :class="TASK_STATUS_META[task.status].badgeClass"
        >
          <span
            class="size-1.5 rounded-full bg-current opacity-70"
            :class="isDownloading && 'animate-pulse'"
          />
          {{ TASK_STATUS_META[task.status].label }}
        </span>
      </div>

      <ScrollArea class="min-h-0 flex-1">
        <div class="flex flex-col gap-6 p-5">
          <!-- 进行中：下载概览（进度 + 统计） -->
          <section v-if="!done" class="space-y-4">
            <div class="space-y-2">
              <div class="flex items-end justify-between">
                <span class="text-sm text-muted-foreground">下载进度</span>
                <span class="text-2xl font-semibold tabular-nums leading-none">{{ task.progressPercent }}<span class="text-base">%</span></span>
              </div>
              <Progress :model-value="task.progressPercent" class="h-2.5" />
              <div class="flex items-center justify-between text-xs text-muted-foreground">
                <span>{{ task.statusText }}</span>
                <span class="tabular-nums">剩余 {{ (task.totalTiles - task.successCount - task.failCount).toLocaleString() }} 张</span>
              </div>
            </div>
            <div class="grid grid-cols-3 gap-2.5">
              <div
                v-for="tile in statTiles"
                :key="tile.label"
                class="rounded-lg border bg-muted/40 p-3"
              >
                <div class="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <component :is="tile.icon" class="size-3.5" />
                  {{ tile.label }}
                </div>
                <p class="mt-1 text-lg font-semibold tabular-nums" :class="tile.class">
                  {{ tile.value }}
                </p>
              </div>
            </div>
          </section>

          <!-- 已完成：成功横幅 -->
          <section
            v-else
            class="flex items-center gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4"
          >
            <div class="flex size-10 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 class="size-5" />
            </div>
            <div>
              <p class="text-sm font-semibold text-emerald-700 dark:text-emerald-400">下载完成</p>
              <p class="mt-0.5 text-xs text-muted-foreground">
                共 {{ task.totalTiles.toLocaleString() }} 张瓦片，成功 {{ task.successCount.toLocaleString() }} 张
              </p>
            </div>
          </section>

          <!-- 通用详情：扁平字段瓦片网格 -->
          <section>
            <dl class="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              <div
                v-for="field in commonFields"
                :key="field.label"
                class="rounded-lg border bg-muted/40 p-3"
              >
                <dt class="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <component :is="field.icon" class="size-3.5" />
                  {{ field.label }}
                </dt>
                <dd class="mt-1 truncate text-sm font-medium" :title="field.value">
                  {{ field.value }}
                </dd>
              </div>
            </dl>
          </section>

          <!-- 长文本字段：整宽 -->
          <section class="space-y-2.5">
            <div
              v-for="field in wideFields"
              :key="field.label"
              class="rounded-lg border bg-muted/40 p-3"
            >
              <div class="flex items-center gap-1.5 text-xs text-muted-foreground">
                <component :is="field.icon" class="size-3.5" />
                {{ field.label }}
              </div>
              <p class="mt-1 break-all font-mono text-xs leading-relaxed" :title="field.value">
                {{ field.value }}
              </p>
            </div>
          </section>
        </div>
      </ScrollArea>

      <!-- 操作区：固定在底部，按任务状态区分 -->
      <div class="flex shrink-0 items-center gap-2 border-t bg-muted/30 px-5 py-3">
        <!-- 未下载完成 -->
        <template v-if="!done">
          <Button size="sm" @click="emit('start', task.id)">
            <Play />开始下载
          </Button>
          <Button size="sm" variant="outline" @click="emit('pause', task.id)">
            <Pause />暂停任务
          </Button>
          <Button
            size="sm"
            variant="ghost"
            class="ml-auto text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            @click="emit('delete', task.id)"
          >
            <Trash2 />删除任务
          </Button>
        </template>

        <!-- 已完成 -->
        <template v-else>
          <Button size="sm" @click="emit('openFolder', task.id)">
            <FolderOpen />打开所在文件夹
          </Button>
          <Button size="sm" variant="outline" @click="emit('preview', task.id)">
            <Eye />离线预览
          </Button>
          <Button
            size="sm"
            variant="ghost"
            class="ml-auto text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            @click="emit('delete', task.id)"
          >
            <Trash2 />删除任务
          </Button>
        </template>
      </div>
    </template>
  </div>
</template>
