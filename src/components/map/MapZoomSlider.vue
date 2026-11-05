<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { Slider } from "@/components/ui/slider";

/**
 * 地图层级滑块：竖向滑块，悬浮在缩放按钮下方，展示当前层级并控制地图缩放。
 * 采用受控 + 拖动自闭合设计（v-model:level）：
 * - 外部（地图滚轮、缩放按钮、定位动画）改 level 时滑块跟随；
 * - 用户拖动期间以内部值驱动滑块，忽略外部回写，
 *   因为 setZoom 触发的缩放动画会产生小数层级，回写会把拇指拽回并打断拖动。
 */
const props = withDefaults(
  defineProps<{
    /** 当前地图层级（视图层级取整后的值） */
    level: number;
    /** 最小层级：与 OlMap 视图 minZoom 保持一致 */
    min?: number;
    /** 最大层级：与 OlMap 视图 maxZoom 保持一致 */
    max?: number;
  }>(),
  { min: 0, max: 18 },
);

const emit = defineEmits<{
  (e: "update:level", level: number): void;
}>();

/** 是否处于拖动中：pointerdown 置位，松手或 value-commit 后复位 */
const dragging = ref(false);
/** Slider 的 modelValue 为数组，单值滑块固定一个元素 */
const sliderValue = ref<number[]>([props.level]);
/** 面板展示的层级数值：跟随拇指，拖动时即时变化 */
const currentLevel = computed(() => sliderValue.value[0] ?? props.min);

watch(
  () => props.level,
  (value) => {
    if (!dragging.value) sliderValue.value = [value];
  },
);

/** Slider 回传数组：取单值同步给内部与外部 */
function onInput(value: number[] | undefined) {
  if (!value?.length) return;
  sliderValue.value = value;
  emit("update:level", value[0]);
}

/** 松手结束拖动：交回外部状态主导，并把可能被忽略的回写补回滑块 */
function endDrag() {
  if (!dragging.value) return;
  dragging.value = false;
  sliderValue.value = [props.level];
}

onMounted(() => {
  // 拇指被拖出组件后松开也需复位，故监听 window 而非组件自身
  window.addEventListener("pointerup", endDrag);
});

onBeforeUnmount(() => {
  window.removeEventListener("pointerup", endDrag);
});
</script>

<template>
  <div
    class="flex w-11 flex-col items-center gap-1.5 rounded-lg border bg-card/95 px-2 py-2 shadow-sm backdrop-blur-sm"
    title="地图层级"
  >
    <!-- 当前层级数值 -->
    <span class="min-w-6 rounded bg-muted px-1 text-center text-xs font-semibold tabular-nums text-foreground">
      {{ currentLevel }}
    </span>

    <!-- 竖向滑块：Slider 内置 orientation=vertical 样式依赖父级高度，故外套定高容器 -->
    <div class="h-44">
      <Slider
        :model-value="sliderValue"
        :min="props.min"
        :max="props.max"
        :step="1"
        orientation="vertical"
        @pointerdown="dragging = true"
        @update:model-value="onInput"
        @value-commit="endDrag"
      />
    </div>

    <!-- 层级区间：提示滑块可取值范围 -->
    <span class="text-[10px] leading-none text-muted-foreground tabular-nums">
      {{ props.min }}-{{ props.max }}
    </span>
  </div>
</template>
