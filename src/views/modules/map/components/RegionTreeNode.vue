<script setup lang="ts">
import { ChevronRight, Loader2 } from "lucide-vue-next";
import { toast } from "vue-sonner";
import { cn } from "@/lib/utils";
import { canExpand, fetchRegionChildren, type RegionNode } from "@/lib/region";
import { useMapStore } from "@/stores/map";

/**
 * 行政区划树的递归节点：默认收起，首次展开时才拉取下一级（懒加载），以此类推。
 * 箭头按钮负责展开/收起，名称区点击选中并写入 useMapStore（父级名由上层传入）。
 */
const props = withDefaults(
  defineProps<{
    node: RegionNode;
    depth?: number;
    /** 父级名称，顶层省级为 null，选中后右栏显示「父级-本级」 */
    parentName?: string | null;
  }>(),
  { depth: 0, parentName: null },
);

const mapStore = useMapStore();

const isSelected = () => mapStore.selectedRegion?.adcode === props.node.adcode;

async function toggle() {
  const node = props.node;
  if (node.expanded) {
    node.expanded = false;
    return;
  }
  // 未加载且可展开时，拉取下级；失败保留可重试（不置 loaded）
  if (canExpand(node) && !node.loaded && !node.loading) {
    node.loading = true;
    try {
      node.children = await fetchRegionChildren(node.adcode);
      node.loaded = true;
    } catch (err) {
      console.error(err);
      toast.error(`加载「${node.name}」下级区划失败`);
    } finally {
      node.loading = false;
    }
  }
  node.expanded = true;
}

function select() {
  mapStore.selectRegion({
    adcode: props.node.adcode,
    name: props.node.name,
    parentName: props.parentName,
  });
}
</script>

<template>
  <li class="select-none">
    <div
      class="flex items-center rounded-md pr-2 hover:bg-accent hover:text-accent-foreground"
      :class="cn(isSelected() && 'bg-accent text-accent-foreground')"
      :style="{ paddingLeft: `${props.depth * 14 + 4}px` }"
    >
      <!-- 展开/收起（仅可展开节点显示箭头，加载中显示 spinner） -->
      <button
        v-if="canExpand(props.node)"
        type="button"
        class="flex size-6 shrink-0 items-center justify-center"
        @click="toggle"
      >
        <Loader2 v-if="props.node.loading" class="size-4 animate-spin text-muted-foreground" />
        <ChevronRight
          v-else
          class="size-4 text-muted-foreground transition-transform"
          :class="cn(props.node.expanded && 'rotate-90')"
        />
      </button>
      <span v-else class="size-6 shrink-0" />

      <!-- 选中区：名称 -->
      <button
        type="button"
        class="flex min-w-0 flex-1 items-center gap-2 py-1.5 text-left text-sm"
        @click="select"
      >
        <span class="truncate">{{ props.node.name }}</span>
      </button>
    </div>

    <ul v-if="props.node.expanded && props.node.children?.length" class="space-y-0.5">
      <RegionTreeNode
        v-for="child in props.node.children"
        :key="child.adcode"
        :node="child"
        :depth="props.depth + 1"
        :parent-name="props.node.name"
      />
    </ul>
  </li>
</template>
