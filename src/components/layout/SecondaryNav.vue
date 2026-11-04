<script setup lang="ts">
import { useRoute, useRouter } from "vue-router";
import { cn } from "@/lib/utils";
import type { GroupEntry } from "@/config/menu";

defineProps<{ module: GroupEntry }>();

const route = useRoute();
const router = useRouter();
</script>

<template>
  <aside class="flex w-48 shrink-0 flex-col gap-1 border-r bg-background p-3">
    <p class="mb-1 px-2 text-lg font-semibold uppercase tracking-wide text-muted-foreground">
      {{ module.title }}
    </p>
    <button
      v-for="child in module.children"
      :key="child.id"
      :class="cn(
        'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground',
        route.path === child.route && 'bg-accent font-medium text-accent-foreground',
      )"
      @click="router.push(child.route)"
    >
      <component :is="child.icon" class="size-4" />
      <span class="truncate">{{ child.title }}</span>
    </button>
  </aside>
</template>
