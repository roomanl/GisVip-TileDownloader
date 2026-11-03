<script setup lang="ts">
import { useRouter } from "vue-router";
import { cn } from "@/lib/utils";
import { menuConfig, type RailItem } from "@/config/menu";
import { customActions } from "@/config/menuActions";
import { useAppStore } from "@/stores/app";

const router = useRouter();
const appStore = useAppStore();

async function onItemClick(item: RailItem) {
  if (item.kind === "page") {
    // 类型 2：直接进入页面（2 栏布局）
    await router.push(item.route);
  }
  else if (item.kind === "group") {
    // 类型 1：进入第一个二级页面（3 栏布局）
    await router.push(item.children[0]!.route);
  }
  else {
    // 类型 3：开发者自定义动作，不改变当前页面与布局
    await customActions[item.id]?.();
  }
}

function itemActive(item: RailItem) {
  return appStore.activeModuleId === item.id;
}
</script>

<template>
  <nav class="flex w-16 shrink-0 flex-col items-center gap-1 border-r bg-background py-3">
    <!-- LOGO -->
    <div class="mb-3 flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
      <component :is="menuConfig.logo" class="size-5" />
    </div>

    <!-- 模块菜单 -->
    <button
      v-for="item in menuConfig.modules"
      :key="item.id"
      :title="item.title"
      :class="cn(
        'flex size-10 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground',
        itemActive(item) && 'bg-accent text-accent-foreground',
      )"
      @click="onItemClick(item)"
    >
      <component :is="item.icon" class="size-5" />
    </button>

    <!-- 底部功能按钮 -->
    <div class="mt-auto flex flex-col items-center gap-1">
      <button
        v-for="item in menuConfig.bottomItems"
        :key="item.id"
        :title="item.title"
        :class="cn(
          'flex size-10 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground',
          itemActive(item) && 'bg-accent text-accent-foreground',
        )"
        @click="onItemClick(item)"
      >
        <component :is="item.icon" class="size-5" />
      </button>
    </div>
  </nav>
</template>
