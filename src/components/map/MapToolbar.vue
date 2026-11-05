<script setup lang="ts">
import { Grid3x3, SquareDashedMousePointer, Eraser } from "lucide-vue-next";
import { cn } from "@/lib/utils";

/**
 * 地图工具栏：悬浮在地图左上角的图标按钮组，纯展示组件。
 * 通过 props 接收「网格」「绘制」两态的激活状态（受控），交互结果由父级驱动地图实例完成，
 * 本组件只负责发出语义化事件：toggle-grid 切换网格、draw 进入/退出范围绘制、clear 清除全部绘制。
 */
const props = withDefaults(
  defineProps<{
    /** 经纬网格是否显示 */
    gridActive?: boolean;
    /** 是否处于矩形范围绘制模式 */
    drawActive?: boolean;
  }>(),
  { gridActive: false, drawActive: false },
);

const emit = defineEmits<{
  (e: "toggle-grid"): void;
  (e: "draw"): void;
  (e: "clear"): void;
}>();

/** 工具按钮基础样式：图标+文字横向按钮，激活态高亮 */
const buttonClass = "flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground";
/** 激活态样式：与 hover 区分，用主色描边+浅色底表明工具正在生效 */
const activeClass = "bg-accent text-accent-foreground";
</script>

<template>
  <div class="flex items-center gap-1 rounded-lg border bg-card/95 p-1 shadow-sm backdrop-blur-sm">
    <!-- 显示网格：切换地图经纬网格 -->
    <button
      type="button"
      :class="cn(buttonClass, props.gridActive && activeClass)"
      :title="props.gridActive ? '隐藏网格' : '显示网格'"
      :aria-pressed="props.gridActive"
      @click="emit('toggle-grid')"
    >
      <Grid3x3 class="size-4" />
      <span>{{ props.gridActive ? "隐藏网格" : "显示网格" }}</span>
    </button>

    <!-- 绘制范围：进入矩形绘制模式，再次点击取消 -->
    <button
      type="button"
      :class="cn(buttonClass, props.drawActive && activeClass)"
      :title="props.drawActive ? '取消绘制' : '绘制范围'"
      :aria-pressed="props.drawActive"
      @click="emit('draw')"
    >
      <SquareDashedMousePointer class="size-4" />
      <span>{{ props.drawActive ? "取消绘制" : "绘制范围" }}</span>
    </button>

    <!-- 清除：清除范围绘制与行政区划绘制 -->
    <button
      type="button"
      :class="buttonClass"
      title="清除"
      @click="emit('clear')"
    >
      <Eraser class="size-4" />
      <span>清除</span>
    </button>
  </div>
</template>
