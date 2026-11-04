<script setup lang="ts">
import { onMounted, ref } from "vue";
import { Loader2 } from "lucide-vue-next";
import { toast } from "vue-sonner";
import { fetchRegionChildren, type RegionNode } from "@/lib/region";
import RegionTreeNode from "./RegionTreeNode.vue";

/**
 * 左栏「区域」Tab：全国行政区划树（阿里云 DataV 接口）。
 * 第一级直接展示省级（进入即加载 100000 的下级），默认全部收起；
 * 展开某节点时按需加载下一级，以此类推。点击节点行选中 → 右栏标题联动。
 */
const provinces = ref<RegionNode[]>([]);
const loading = ref(false);

onMounted(async () => {
  loading.value = true;
  try {
    provinces.value = await fetchRegionChildren("100000");
  } catch (err) {
    console.error(err);
    toast.error("加载省级行政区划失败");
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div class="h-full min-h-0 overflow-auto p-2">
    <div v-if="loading" class="flex items-center gap-2 px-2 py-1.5 text-sm text-muted-foreground">
      <Loader2 class="size-4 animate-spin" />
      加载行政区划…
    </div>
    <ul v-else class="space-y-0.5">
      <RegionTreeNode
        v-for="province in provinces"
        :key="province.adcode"
        :node="province"
        :depth="0"
        :parent-name="null"
      />
    </ul>
  </div>
</template>
