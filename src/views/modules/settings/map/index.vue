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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSettingsStore } from "@/stores/settings";

/** 地图配置：天地图 key，仅点击「保存配置」后才写入磁盘 */
const settings = useSettingsStore();
const saving = ref(false);

async function saveMapConfig() {
  if (saving.value) return;
  saving.value = true;
  try {
    const saved = await settings.saveMapConfig();
    if (saved) toast.success("地图配置已保存");
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
      <CardTitle>地图配置</CardTitle>
      <CardDescription>地图服务相关参数，修改后需点击“保存配置”生效</CardDescription>
    </CardHeader>
    <CardContent class="flex flex-col gap-6">
      <!-- 天地图 key -->
      <div class="space-y-2">
        <Label for="tianditu-key">天地图 key</Label>
        <Input
          id="tianditu-key"
          v-model="settings.tiandituKey"
          placeholder="请输入天地图开发密钥"
          autocomplete="off"
          spellcheck="false"
        />
        <p class="text-sm text-muted-foreground">
          用于天地图瓦片服务鉴权，可在天地图开放平台控制台申请对应的开发密钥。
        </p>
      </div>

      <!-- 保存操作：点击后才写盘 -->
      <div class="flex justify-end">
        <Button :disabled="!settings.isMapConfigDirty || saving" @click="saveMapConfig">
          {{ saving ? "保存中…" : "保存配置" }}
        </Button>
      </div>
    </CardContent>
  </Card>
</template>
