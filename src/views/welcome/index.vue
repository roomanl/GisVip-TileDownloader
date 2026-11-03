<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";
import { useRouter } from "vue-router";
import { Compass } from "lucide-vue-next";
import { Progress } from "@/components/ui/progress";

/**
 * 欢迎页（独立路由 /welcome）：
 * 无标题栏、整页可拖动，停留 3 秒后跳转 /home（Home 壳层内部再重定向到第一个业务页）。
 */
const router = useRouter();

const DURATION = 3000;
const progress = ref(0);
let timer: number | undefined;

onMounted(() => {
  const start = performance.now();
  timer = window.setInterval(() => {
    const ratio = Math.min((performance.now() - start) / DURATION, 1);
    progress.value = ratio * 100;
    if (ratio >= 1) {
      window.clearInterval(timer);
      // replace 避免回退历史里出现欢迎页
      router.replace("/home");
    }
  }, 50);
});

onUnmounted(() => {
  if (timer) window.clearInterval(timer);
});
</script>

<template>
  <div
    class="relative flex h-full w-full flex-col items-center justify-center overflow-hidden bg-background select-none"
    data-tauri-drag-region
  >
    <!-- 极简装饰：两团低透明度光斑，营造深度而不喧宾夺主 -->
    <div class="pointer-events-none absolute -top-32 -left-32 size-96 rounded-full bg-primary/5 blur-3xl" />
    <div class="pointer-events-none absolute -right-32 -bottom-32 size-96 rounded-full bg-primary/5 blur-3xl" />

    <!-- 玻璃卡片：LOGO + 名称 + 进度 -->
    <div class="welcome-enter flex flex-col items-center gap-8 rounded-2xl border bg-card/60 px-14 py-12 shadow-lg backdrop-blur-xl">
      <div class="flex size-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md">
        <Compass class="size-8" />
      </div>
      <div class="flex flex-col items-center gap-2">
        <h1 class="text-2xl font-semibold tracking-tight text-foreground">GisVip TileDownloader</h1>
        <p class="text-sm text-muted-foreground">高效稳定的地图瓦片下载工具</p>
      </div>
      <div class="w-56">
        <Progress :model-value="progress" class="h-1.5" />
      </div>
    </div>

    <p class="absolute bottom-5 text-xs text-muted-foreground">v0.1.0</p>
  </div>
</template>

<style scoped>
.welcome-enter {
  animation: welcome-in 0.4s ease-out both;
}

@keyframes welcome-in {
  from {
    opacity: 0;
    transform: translateY(8px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@media (prefers-reduced-motion: reduce) {
  .welcome-enter {
    animation: none;
  }
}
</style>
