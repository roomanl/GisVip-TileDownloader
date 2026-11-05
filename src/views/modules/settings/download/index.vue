<script setup lang="ts">
import { ref } from "vue";
import { toast } from "vue-sonner";
import { open } from "@tauri-apps/plugin-dialog";
import { FolderOpen, RotateCcw } from "lucide-vue-next";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { DOWNLOAD_DEFAULT_SUBDIR, SETTINGS_DEFAULTS } from "@/config";
import {
  DOWNLOAD_RETRY_RANGE,
  DOWNLOAD_THREADS_RANGE,
  useSettingsStore,
} from "@/stores/settings";

/** 下载设置：保存路径 / 并发线程数 / 失败瓦片重试次数 / 自动下载，仅点击「保存配置」后才写入磁盘 */
const settings = useSettingsStore();
const saving = ref(false);

/** NumberField 只允许整数输入（禁止小数点） */
const integerFormat = { maximumFractionDigits: 0 };

/** 打开系统目录选择器，选中后写入 store（仍需点「保存配置」才落盘） */
async function pickDownloadPath() {
  if (!settings.isTauri) {
    toast.warning("浏览器预览环境不支持系统目录选择器");
    return;
  }
  try {
    const selected = await open({
      title: "选择下载目录",
      directory: true,
      default: settings.effectiveDownloadPath || undefined,
    });
    if (typeof selected === "string" && selected) settings.downloadPath = selected;
  } catch (err) {
    console.error("选择下载目录失败:", err);
    toast.error("打开目录选择器失败，详见控制台日志");
  }
}

/** 清除自定义路径，回退到默认下载目录（应用根目录/downloads） */
function resetDownloadPath() {
  settings.downloadPath = SETTINGS_DEFAULTS.download.path;
}

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
      <CardDescription>瓦片下载目录与并发重试策略，修改后需点击“保存配置”生效</CardDescription>
    </CardHeader>
    <CardContent class="flex flex-col gap-6">
      <!-- 下载路径 -->
      <div class="space-y-2">
        <div class="space-y-0.5">
          <Label for="download-path">下载路径</Label>
          <p class="text-sm text-muted-foreground">
            瓦片文件的保存目录，默认为应用根目录下的 {{ DOWNLOAD_DEFAULT_SUBDIR }} 文件夹。
          </p>
        </div>
        <div class="flex items-center gap-2">
          <Input
            id="download-path"
            readonly
            :title="settings.effectiveDownloadPath"
            :model-value="settings.effectiveDownloadPath"
            :placeholder="`应用根目录/${DOWNLOAD_DEFAULT_SUBDIR}`"
            class="min-w-0 flex-1 font-mono text-xs"
          />
          <Button type="button" variant="outline" @click="pickDownloadPath">
            <FolderOpen />
            选择目录
          </Button>
          <Button
            type="button"
            variant="ghost"
            :disabled="settings.isUsingDefaultDownloadPath"
            @click="resetDownloadPath"
          >
            <RotateCcw />
            恢复默认
          </Button>
        </div>
      </div>

      <Separator />

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
