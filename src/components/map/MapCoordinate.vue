<script setup lang="ts">
import { computed, ref } from "vue";
import { Crosshair, MousePointerClick, Copy, Check } from "lucide-vue-next";
import { toast } from "vue-sonner";
import { cn } from "@/lib/utils";

/**
 * 地图坐标展示组件：悬浮在地图左下角的坐标信息条，纯展示组件。
 * 坐标值由父级驱动 OlMap 的鼠标事件回填（props.coordinate），本组件不持有地图引用。
 * - mode=move：实时跟随鼠标；mode=click：仅在点击地图后显示（由父级决定何时更新 coordinate）。
 * - 切换图标在两种模式间切换，复制图标把当前坐标写入剪贴板。
 */
const props = withDefaults(
  defineProps<{
    /** 当前展示的经纬度(WGS84)[lng, lat]，无值时为 null */
    coordinate?: [number, number] | null;
    /** 取值模式：move 实时跟随鼠标，click 仅点击地图后更新 */
    mode?: "move" | "click";
  }>(),
  { coordinate: null, mode: "move" },
);

const emit = defineEmits<{
  (e: "toggle-mode"): void;
}>();

/** 复制成功反馈：短暂显示对勾图标 */
const copied = ref(false);

/** 坐标展示文本：保留 6 位小数（约 0.1m），无坐标时显示占位 */
const displayText = computed(() => {
  if (!props.coordinate) return "— , —";
  const [lng, lat] = props.coordinate;
  return `${lng.toFixed(6)}, ${lat.toFixed(6)}`;
});

/** 图标按钮基础样式：与工具栏同款方形图标按钮 */
const buttonClass =
  "flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground";

async function onCopy() {
  if (!props.coordinate) return;
  try {
    await navigator.clipboard.writeText(displayText.value);
    copied.value = true;
    window.setTimeout(() => (copied.value = false), 1200);
  } catch {
    toast.error("复制坐标失败");
  }
}
</script>

<template>
  <div class="flex items-center gap-1 rounded-lg border bg-card/95 p-1 shadow-sm backdrop-blur-sm">
    <!-- 模式切换：实时跟随 / 仅点击获取 -->
    <button
      type="button"
      :class="cn(buttonClass, props.mode === 'click' && 'bg-accent text-accent-foreground')"
      :title="props.mode === 'move' ? '当前：实时跟随鼠标，点击切换为仅点击获取' : '当前：仅点击地图获取，点击切换为实时跟随'"
      :aria-pressed="props.mode === 'click'"
      @click="emit('toggle-mode')"
    >
      <MousePointerClick v-if="props.mode === 'click'" class="size-4" />
      <Crosshair v-else class="size-4" />
    </button>

    <!-- 经纬度数值：定宽 + 等宽数字，避免坐标变化时抖动 -->
    <span
      class="min-w-30 px-1 text-center text-xs font-medium tabular-nums text-foreground"
      :title="props.mode === 'move' ? '鼠标实时经纬度(WGS84)' : '鼠标点击点经纬度(WGS84)'"
    >
      {{ displayText }}
    </span>

    <!-- 复制坐标 -->
    <button type="button" :class="buttonClass" title="复制坐标" @click="onCopy">
      <Check v-if="copied" class="size-4 text-emerald-500" />
      <Copy v-else class="size-4" />
    </button>
  </div>
</template>
