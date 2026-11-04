<script setup lang="ts">
import 'vue-sonner/style.css'
import AppDialogs from "@/components/app/AppDialogs.vue";
import { Toaster } from "@/components/ui/sonner";
</script>

<template>
  <main class="flex h-screen overflow-hidden bg-background text-foreground">
    <!-- 路由页面（欢迎页 / Home 壳层）带淡入淡出切换 -->
    <RouterView v-slot="{ Component }">
      <Transition name="page-fade" mode="out-in">
        <component :is="Component" />
      </Transition>
    </RouterView>

    <!-- custom 菜单项对应的弹窗与全局通知 -->
    <AppDialogs />
    <Toaster position="top-center" :offset="48" :gap="12" />
  </main>
</template>

<style scoped>
/* 入场 ease-out，退场 ease-in；尊重 reduced-motion */
.page-fade-enter-active {
  transition: opacity 0.4s ease-out;
}
.page-fade-leave-active {
  transition: opacity 0.3s ease-in;
}
.page-fade-enter-from,
.page-fade-leave-to {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .page-fade-enter-active,
  .page-fade-leave-active {
    transition: none;
  }
}
</style>
