<script setup lang="ts">
import { computed, watch } from "vue";
import { useRoute } from "vue-router";
import IconRail from "@/components/layout/IconRail.vue";
import SecondaryNav from "@/components/layout/SecondaryNav.vue";
import TitleBar from "@/components/layout/TitleBar.vue";
import { findModuleByPath, allRailItems } from "@/config/menu";
import { useAppStore } from "@/stores/app";

/**
 * Home = 主界面壳层（布局路由）：
 * 栏一 + 栏二（group 模块时）+ 标题栏 + 业务页面（子路由 RouterView）。
 */
const route = useRoute();
const appStore = useAppStore();

// 路由变化时同步激活模块（决定栏一高亮与 2/3 栏布局）
watch(
  () => route.path,
  (path) => {
    const module = findModuleByPath(path);
    if (module) appStore.setActiveModule(module.id);
  },
  { immediate: true },
);

const activeModule = computed(() =>
  allRailItems().find((m) => m.id === appStore.activeModuleId),
);

// 仅当激活模块有二级菜单时使用 3 栏布局
const showSecondary = computed(() => activeModule.value?.kind === "group");
</script>

<template>
  <div class="flex h-full min-w-0 flex-1 overflow-hidden">
    <!-- 栏一：LOGO + 模块菜单 + 底部按钮 -->
    <IconRail />

    <!-- 栏二：二级菜单（仅 group 模块显示） -->
    <SecondaryNav v-if="showSecondary && activeModule?.kind === 'group'" :module="activeModule" />

    <!-- 页面栏：标题栏 + 内容 -->
    <div class="flex min-w-0 flex-1 flex-col">
      <TitleBar />
      <div class="min-h-0 flex-1 overflow-auto p-6">
        <!-- KeepAlive 缓存全部业务页面，切换路由时保留页面状态（如表单输入） -->
        <RouterView v-slot="{ Component }">
          <KeepAlive>
            <component :is="Component" />
          </KeepAlive>
        </RouterView>
      </div>
    </div>
  </div>
</template>
