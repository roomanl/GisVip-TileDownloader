<script setup lang="ts">
import { CloudDownload } from "lucide-vue-next";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
</script>

<template>
  <!-- 下载设置：占位空页面 -->
  <Card class="mx-auto w-full max-w-[720px]">
    <CardHeader>
      <CardTitle>下载设置</CardTitle>
      <CardDescription>瓦片下载相关配置</CardDescription>
    </CardHeader>
    <CardContent class="flex flex-col items-center justify-center gap-2 py-10 text-center text-muted-foreground">
      <CloudDownload class="size-8" />
      <p class="text-sm">设置项建设中，敬请期待</p>
    </CardContent>
  </Card>
</template>
