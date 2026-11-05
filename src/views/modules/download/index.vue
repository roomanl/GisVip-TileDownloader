<script setup lang="ts">
import { computed, ref } from "vue";
import { toast } from "vue-sonner";
import TaskListPanel from "./components/TaskListPanel.vue";
import TaskDetailPanel from "./components/TaskDetailPanel.vue";
import { mockTasks, type DownloadTaskItem } from "./mock";

/**
 * 下载管理页（独立一级模块，2 栏布局：栏一 + 本页）：
 * 左栏 = 任务列表（下载中 / 已完成 Tabs），右栏 = 选中任务详情。
 * 当前为静态预览：任务数据来自 mock.ts，选中/删除在本页维护，
 * 开始/暂停/打开文件夹/离线预览等操作仅做占位提示，后续接入下载引擎与 store。
 * 菜单配置 bleed: true 使壳层内容区无内边距，本页 h-full 直接铺满可用高度。
 */
const tasks = ref<DownloadTaskItem[]>(mockTasks);
const selectedId = ref<string | null>(tasks.value[0]?.id ?? null);

const selectedTask = computed(
  () => tasks.value.find((t) => t.id === selectedId.value) ?? null,
);

function onSelect(id: string) {
  selectedId.value = id;
}

function onDelete(id: string) {
  const idx = tasks.value.findIndex((t) => t.id === id);
  if (idx === -1) return;
  tasks.value.splice(idx, 1);
  // 删除当前选中项后，顺延选中相邻任务
  if (selectedId.value === id) {
    selectedId.value = tasks.value[idx]?.id ?? tasks.value[idx - 1]?.id ?? null;
  }
  toast.success("已删除任务");
}

/** 占位操作：静态页仅提示，具体逻辑待下载引擎接入 */
function onStart(id: string) {
  toast.info(`开始下载任务 ${id}（待实现）`);
}
function onPause(id: string) {
  toast.info(`暂停任务 ${id}（待实现）`);
}
function onOpenFolder(id: string) {
  toast.info(`打开所在文件夹 ${id}（待实现）`);
}
function onPreview(id: string) {
  toast.info(`离线预览任务 ${id}（待实现）`);
}
</script>

<template>
  <div class="flex h-full gap-2 p-2">
    <!-- 左栏：任务列表 -->
    <TaskListPanel :tasks="tasks" :selected-id="selectedId" @select="onSelect" />
    <!-- 右栏：任务详情 -->
    <TaskDetailPanel
      :task="selectedTask"
      @start="onStart"
      @pause="onPause"
      @open-folder="onOpenFolder"
      @preview="onPreview"
      @delete="onDelete"
    />
  </div>
</template>
