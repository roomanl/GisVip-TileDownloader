<script setup lang="ts">
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
</script>

<template>
  <Card>
    <CardHeader>
      <CardTitle>地图</CardTitle>
      <CardDescription>无二级菜单的模块（2 栏布局），内容待开发</CardDescription>
    </CardHeader>
    <CardContent>
      <p class="text-sm text-muted-foreground">点击栏一的“地图”按钮时不会出现第二栏，本页直接紧贴图标栏显示。</p>
    </CardContent>
  </Card>
</template>
