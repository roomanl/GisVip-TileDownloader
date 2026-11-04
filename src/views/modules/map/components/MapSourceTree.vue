<script setup lang="ts">
import { ChevronRight, Layers, Check } from "lucide-vue-next";
import type { MapLayer } from "@/config/layerList";
import { cn } from "@/lib/utils";

/**
 * 地图源 tree 的递归节点。
 * - 分组节点（含 children）：可展开/收起，仅做导航；
 * - 叶子节点（含 url）：可被选中，展示投影/图层类型与是否含注记图层。
 * expanded / selectedId 由顶层（MapSourceTab）统一管理并透传，递归各层共享同一状态。
 */
const props = withDefaults(
  defineProps<{
    nodes: MapLayer[];
    depth?: number;
    expanded: Record<string, boolean>;
    selectedId: string | null;
  }>(),
  { depth: 0 },
);

const emit = defineEmits<{
  (e: "toggle", id: string): void;
  (e: "select", layer: MapLayer): void;
}>();

const isGroup = (n: MapLayer) => Array.isArray(n.children) && n.children.length > 0;
</script>

<template>
  <ul class="space-y-0.5 select-none">
    <li v-for="node in props.nodes" :key="node.id">
      <!-- 分组节点 -->
      <template v-if="isGroup(node)">
        <button
          type="button"
          class="flex w-full items-center gap-1.5 rounded-md py-1.5 pr-2 text-sm font-medium text-foreground/90 hover:bg-accent hover:text-accent-foreground"
          :style="{ paddingLeft: `${props.depth * 14 + 8}px` }"
          @click="emit('toggle', node.id)"
        >
          <ChevronRight
            class="size-4 shrink-0 text-muted-foreground transition-transform"
            :class="cn(props.expanded[node.id] && 'rotate-90')"
          />
          <Layers class="size-4 shrink-0 text-muted-foreground" />
          <span class="truncate">{{ node.label }}</span>
          <span class="ml-auto shrink-0 text-xs tabular-nums text-muted-foreground/70">
            {{ node.children?.length }}
          </span>
        </button>

        <MapSourceTree
          v-show="props.expanded[node.id]"
          :nodes="node.children!"
          :depth="props.depth + 1"
          :expanded="props.expanded"
          :selected-id="props.selectedId"
          @toggle="(id) => emit('toggle', id)"
          @select="(l) => emit('select', l)"
        />
      </template>

      <!-- 叶子节点（可选瓦片源） -->
      <button
        v-else
        type="button"
        class="flex w-full items-center gap-2 rounded-md py-1.5 pr-2 text-sm hover:bg-accent hover:text-accent-foreground"
        :class="cn(props.selectedId === node.id && 'bg-accent text-accent-foreground')"
        :style="{ paddingLeft: `${props.depth * 14 + 14}px` }"
        @click="emit('select', node)"
      >
        <span class="flex size-4 shrink-0 items-center justify-center">
          <Check v-if="props.selectedId === node.id" class="size-3.5 text-primary" />
        </span>
        <span class="truncate">{{ node.label }}</span>
        <span
          v-if="node.labelLayer"
          class="shrink-0 rounded bg-muted px-1 text-[10px] leading-4 text-muted-foreground"
          title="含注记图层"
        >
          注记
        </span>
        <!-- <span class="ml-auto shrink-0 text-[10px] text-muted-foreground/70">
          {{ node.projection }}
        </span> -->
      </button>
    </li>
  </ul>
</template>
