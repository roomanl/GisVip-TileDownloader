<script setup lang="ts">
import { ref } from "vue";
import { toast } from "vue-sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  NumberField,
  NumberFieldContent,
  NumberFieldDecrement,
  NumberFieldIncrement,
  NumberFieldInput,
} from "@/components/ui/number-field";
import {
  DOWNLOAD_RETRY_RANGE,
  DOWNLOAD_THREADS_RANGE,
  useSettingsStore,
} from "@/stores/settings";

/** 下载设置：并发线程数 / 失败瓦片重试次数 / 自动下载，仅点击「保存配置」后才写入磁盘 */
const settings = useSettingsStore();
const saving = ref(false);

/** NumberField 只允许整数输入（禁止小数点） */
const integerFormat = { maximumFractionDigits: 0 };

async function saveDownloadConfig() {
  if (saving.value) return;
  saving.value = true;
  try {
    const saved = await settings.saveDownloadConfig();
    if (saved) toast.success("下载配置已保存");
    else if (!settings.isTauri) toast.warning("浏览器预览环境不写盘，配置仅保留在内存");
    else toast.error("保存失败，详见控制台日志");
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <Card class="mx-auto w-full max-w-[720px]">
    <CardHeader>
      <CardTitle>下载设置</CardTitle>
      <CardDescription>瓦片下载并发与重试策略，修改后需点击“保存配置”生效</CardDescription>
    </CardHeader>
    <CardContent class="flex flex-col gap-6">
      <!-- 下载线程数 -->
      <div class="flex items-center justify-between gap-4">
        <div class="space-y-0.5">
          <Label for="download-threads">下载线程数</Label>
          <p class="text-sm text-muted-foreground">
            同一个任务内下载的线程数，不建议设置太大，设置过大可能会触发反爬虫机制。
          </p>
          <p class="text-sm text-muted-foreground">
            总线程数 = 下载中任务数 × 下载线程数
          </p>
        </div>
        <NumberField
          id="download-threads"
          v-model="settings.downloadThreads"
          :min="DOWNLOAD_THREADS_RANGE.min"
          :max="DOWNLOAD_THREADS_RANGE.max"
          :step="1"
          :format-options="integerFormat"
          class="w-32 shrink-0"
        >
          <NumberFieldContent>
            <NumberFieldDecrement />
            <NumberFieldInput />
            <NumberFieldIncrement />
          </NumberFieldContent>
        </NumberField>
      </div>

      <Separator />

      <!-- 下载重试次数 -->
      <div class="flex items-center justify-between gap-4">
        <div class="space-y-0.5">
          <Label for="download-retry">下载重试次数</Label>
          <p class="text-sm text-muted-foreground">
            任务下载完成后，如果有下载失败的瓦片，会自动重试下载失败的瓦片，最多重试
            {{ settings.downloadRetryCount }} 次。
          </p>
        </div>
        <NumberField
          id="download-retry"
          v-model="settings.downloadRetryCount"
          :min="DOWNLOAD_RETRY_RANGE.min"
          :max="DOWNLOAD_RETRY_RANGE.max"
          :step="1"
          :format-options="integerFormat"
          class="w-32 shrink-0"
        >
          <NumberFieldContent>
            <NumberFieldDecrement />
            <NumberFieldInput />
            <NumberFieldIncrement />
          </NumberFieldContent>
        </NumberField>
      </div>

      <Separator />

      <!-- 自动下载 -->
      <div class="flex items-center justify-between gap-4">
        <div class="space-y-0.5">
          <Label for="auto-download">自动下载</Label>
          <p class="text-sm text-muted-foreground">添加任务后，会自动开始下载</p>
        </div>
        <!-- reka-ui Switch 的 v-model 是 modelValue（非 checked） -->
        <Switch id="auto-download" v-model="settings.autoDownload" />
      </div>

      <Separator />

      <!-- 保存操作：点击后才写盘 -->
      <div class="flex justify-end">
        <Button :disabled="!settings.isDownloadConfigDirty || saving" @click="saveDownloadConfig">
          {{ saving ? "保存中…" : "保存配置" }}
        </Button>
      </div>
    </CardContent>
  </Card>
</template>
