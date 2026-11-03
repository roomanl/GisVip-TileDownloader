<script setup lang="ts">
import type { WithClassAsProps } from "./interface"
import type { ComponentPublicInstance } from "vue"
import { cn } from "@/lib/utils"
import { useCarousel } from "./useCarousel"

defineOptions({
  inheritAttrs: false,
})

const props = defineProps<WithClassAsProps>()

const { carouselRef, orientation } = useCarousel()

// 显式将内容节点绑定给 embla，替代字符串模板 ref（避免 TS 未引用误报）
function setContentRef(el: Element | ComponentPublicInstance | null) {
  carouselRef.value = (el as HTMLElement | null) ?? undefined
}
</script>

<template>
  <div
    :ref="setContentRef"
    data-slot="carousel-content"
    class="overflow-hidden"
  >
    <div
      :class="
        cn(
          'flex',
          orientation === 'horizontal' ? '-ml-4' : '-mt-4 flex-col',
          props.class,
        )"
      v-bind="$attrs"
    >
      <slot />
    </div>
  </div>
</template>
