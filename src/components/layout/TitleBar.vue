<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import { useRoute } from "vue-router";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { Copy, Minus, Square, X } from "lucide-vue-next";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { buttonVariants } from "@/components/ui/button";
import { isTauri } from "@/lib/env";

const route = useRoute();
// getCurrentWindow() 会同步读取 __TAURI_INTERNALS__.metadata，非 Tauri 环境下直接抛错并拖垮整个壳层，必须先判环境
const appWindow = isTauri ? getCurrentWindow() : null;

/** 标题栏文本：取当前路由 meta.title */
const title = computed(() => (route.meta.title as string | undefined) ?? "GisVip TileDownloader");

const isMaximized = ref(false);
let unlistenResized: (() => void) | undefined;

onMounted(async () => {
  if (!appWindow) return;
  isMaximized.value = await appWindow.isMaximized();
  unlistenResized = await appWindow.onResized(async () => {
    isMaximized.value = await appWindow.isMaximized();
  });
});

onUnmounted(() => unlistenResized?.());

/** 窗口控制：浏览器预览环境下 appWindow 为 null，按钮点击不做任何动作 */
function minimizeWindow() {
  void appWindow?.minimize();
}

function toggleMaximizeWindow() {
  void appWindow?.toggleMaximize();
}

function closeWindow() {
  void appWindow?.close();
}
</script>

<template>
  <!-- data-tauri-drag-region：按住拖动窗口，双击切换最大化（需无边框窗口 + 相应在 capabilities 权限） -->
  <header
    class="flex h-10 shrink-0 items-center border-b bg-background select-none"
    data-tauri-drag-region
  >
    <span class="ml-4 truncate text-sm font-medium" data-tauri-drag-region>{{ title }}</span>

    <!-- 窗口控制按钮 -->
    <div class="ml-auto flex h-full">
      <button
        class="flex h-full w-10 cursor-pointer items-center justify-center text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        @click="minimizeWindow"
      >
        <Minus class="size-4" />
      </button>
      <button
        class="flex h-full w-10 cursor-pointer items-center justify-center text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        @click="toggleMaximizeWindow"
      >
        <Copy v-if="isMaximized" class="size-4" />
        <Square v-else class="size-4" />
      </button>
      <!-- 关闭：二次确认后退出 -->
      <AlertDialog>
        <AlertDialogTrigger as-child>
          <button
            class="flex h-full w-10 cursor-pointer items-center justify-center text-muted-foreground transition-colors hover:bg-destructive hover:text-destructive-foreground"
          >
            <X class="size-4" />
          </button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认退出？</AlertDialogTitle>
            <AlertDialogDescription>
              退出后将关闭 GisVip TileDownloader，未保存的任务进度可能丢失。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction :class="buttonVariants({ variant: 'destructive' })" @click="closeWindow">
              退出
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  </header>
</template>
