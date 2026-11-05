<script setup lang="ts">
import { computed, ref } from "vue";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/zh-cn";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { isCompletedTask, TASK_STATUS_META, type DownloadTaskItem } from "../mock";

dayjs.extend(relativeTime);

const props = defineProps<{
  tasks: DownloadTaskItem[];
  selectedId: string | null;
}>();

const emit = defineEmits<{
  select: [id: string];
}>();

const activeTab = ref<"active" | "done">("active");

/** 下载中列表：非 completed 状态 */
const activeTasks = computed(() => props.tasks.filter((t) => !isCompletedTask(t)));
/** 已完成列表 */
const doneTasks = computed(() => props.tasks.filter(isCompletedTask));

/** dayjs 相对时间（中文） */
function fromNow(ts: number): string {
  return dayjs(ts).locale("zh-cn").fromNow();
}
</script>

<template>
  <div
    class="flex h-full min-h-0 w-70 shrink-0 flex-col overflow-hidden rounded-lg border bg-card text-card-foreground"
  >
    <Tabs v-model="activeTab" class="min-h-0 flex-1">
      <TabsList class="h-11 w-full shrink-0 justify-start rounded-none border-b bg-muted/50 p-1">
        <TabsTrigger value="active" class="px-3">
          下载中
          <span class="ml-1 text-xs opacity-70">({{ activeTasks.length }})</span>
        </TabsTrigger>
        <TabsTrigger value="done" class="px-3">
          已完成
          <span class="ml-1 text-xs opacity-70">({{ doneTasks.length }})</span>
        </TabsTrigger>
      </TabsList>

      <!-- 下载中列表 -->
      <TabsContent value="active" class="min-h-0 flex-1 overflow-hidden">
        <ScrollArea class="h-full">
          <div class="flex flex-col gap-1 p-2">
            <button
              v-for="task in activeTasks"
              :key="task.id"
              :class="cn(
                'flex w-full cursor-pointer flex-col gap-1.5 rounded-md border p-3 text-left text-sm transition-colors hover:bg-accent',
                selectedId === task.id && 'border-primary/50 bg-accent',
              )"
              @click="emit('select', task.id)"
            >
              <span class="truncate font-medium leading-tight">{{ task.name }}</span>
              <div class="flex items-center justify-between gap-2">
                <Badge :class="TASK_STATUS_META[task.status].badgeClass" class="text-[11px] leading-4">
                  {{ TASK_STATUS_META[task.status].label }}
                </Badge>
                <span class="text-xs text-muted-foreground">{{ fromNow(task.createdAt) }}</span>
              </div>
            </button>

            <!-- 空状态 -->
            <div v-if="!activeTasks.length" class="flex flex-col items-center gap-1 py-10 text-muted-foreground">
              <span class="text-sm">暂无进行中的任务</span>
            </div>
          </div>
        </ScrollArea>
      </TabsContent>

      <!-- 已完成列表 -->
      <TabsContent value="done" class="min-h-0 flex-1 overflow-hidden">
        <ScrollArea class="h-full">
          <div class="flex flex-col gap-1 p-2">
            <button
              v-for="task in doneTasks"
              :key="task.id"
              :class="cn(
                'flex w-full cursor-pointer flex-col gap-1.5 rounded-md border p-3 text-left text-sm transition-colors hover:bg-accent',
                selectedId === task.id && 'border-primary/50 bg-accent',
              )"
              @click="emit('select', task.id)"
            >
              <span class="truncate font-medium leading-tight">{{ task.name }}</span>
              <div class="flex items-center justify-between gap-2">
                <Badge :class="TASK_STATUS_META[task.status].badgeClass" class="text-[11px] leading-4">
                  {{ TASK_STATUS_META[task.status].label }}
                </Badge>
                <span class="text-xs text-muted-foreground">{{ fromNow(task.createdAt) }}</span>
              </div>
            </button>

            <div v-if="!doneTasks.length" class="flex flex-col items-center gap-1 py-10 text-muted-foreground">
              <span class="text-sm">暂无已完成的任务</span>
            </div>
          </div>
        </ScrollArea>
      </TabsContent>
    </Tabs>
  </div>
</template>
