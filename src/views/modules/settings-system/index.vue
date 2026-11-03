<script setup lang="ts">
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { THEME_COLORS, useSettingsStore } from "@/stores/settings";

/** 系统设置：开机自启 / 暗黑模式 / 主题配色（持久化到 plugin-store） */
const settings = useSettingsStore();
</script>

<template>
  <Card class="mx-auto w-full max-w-[720px]">
    <CardHeader>
      <CardTitle>系统设置</CardTitle>
      <CardDescription>应用启动行为与界面外观，修改后自动保存</CardDescription>
    </CardHeader>
    <CardContent class="flex flex-col gap-6">
      <!-- 开机自启 -->
      <div class="flex items-center justify-between gap-4">
        <div class="space-y-0.5">
          <Label for="autostart">开机自启</Label>
          <p class="text-sm text-muted-foreground">登录系统后自动运行本程序</p>
        </div>
        <Switch
          id="autostart"
          :model-value="settings.autostart"
          @update:model-value="settings.setAutostart"
        />
      </div>

      <Separator />

      <!-- 暗黑模式 -->
      <div class="flex items-center justify-between gap-4">
        <div class="space-y-0.5">
          <Label for="dark-mode">暗黑模式</Label>
          <p class="text-sm text-muted-foreground">开启后立即切换深色界面</p>
        </div>
        <!-- reka-ui Switch 的 v-model 是 modelValue（非 checked） -->
        <Switch id="dark-mode" v-model="settings.isDark" />
      </div>

      <Separator />

      <!-- 主题配色 -->
      <div class="flex items-center justify-between gap-4">
        <div class="space-y-0.5">
          <Label>主题设置</Label>
          <p class="text-sm text-muted-foreground">选择应用主色调，与暗黑模式互不影响</p>
        </div>
        <div class="flex items-center gap-2.5" role="radiogroup" aria-label="主题配色">
          <button
            v-for="option in THEME_COLORS"
            :key="option.value"
            type="button"
            role="radio"
            :aria-checked="settings.themeColor === option.value"
            :title="option.label"
            :class="cn(
              'size-6 rounded-full border border-input transition-transform hover:scale-110',
              settings.themeColor === option.value && 'ring-2 ring-ring ring-offset-2 ring-offset-background',
            )"
            :style="{ backgroundColor: option.swatch }"
            @click="settings.themeColor = option.value"
          />
        </div>
      </div>
    </CardContent>
  </Card>
</template>
