<script setup lang="ts">
import { computed } from "vue";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAppStore } from "@/stores/app";

/**
 * 栏一 custom 菜单项对应的弹窗集合。
 * menuActions 里 openDialog("tools")，这里按 dialogId 展示对应 Dialog。
 * （设置已改为 group 模块，页面在 views/modules/settings/*）
 */
const appStore = useAppStore();

const toolsOpen = computed({
  get: () => appStore.dialogId === "tools",
  set: (v) => { if (!v) appStore.closeDialog(); },
});
</script>

<template>
  <!-- 工具 Dialog -->
  <Dialog v-model:open="toolsOpen">
    <DialogContent>
      <DialogHeader>
        <DialogTitle>工具</DialogTitle>
        <DialogDescription>点击栏一菜单但不打开页面的示例：动作完全由开发者定义。</DialogDescription>
      </DialogHeader>
      <div class="mt-2 flex justify-end">
        <Button variant="secondary" @click="appStore.closeDialog()">关闭</Button>
      </div>
    </DialogContent>
  </Dialog>
</template>
