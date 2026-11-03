<script setup lang="ts">
import { ref } from "vue";
import { invoke } from "@tauri-apps/api/core";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useCounterStore } from "@/stores/counter";

const counter = useCounterStore();
const greetMsg = ref("");
const name = ref("");

async function greet() {
  // Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
  greetMsg.value = await invoke("greet", { name: name.value });
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <Card>
      <CardHeader>
        <CardTitle>Dashboard</CardTitle>
        <CardDescription>框架自检页：Tauri 后端调用 + Pinia 状态</CardDescription>
      </CardHeader>
      <CardContent class="flex flex-col gap-4">
        <form class="flex flex-col gap-2" @submit.prevent="greet">
          <Label for="greet-input">Tauri 后端交互测试</Label>
          <div class="flex gap-2">
            <Input id="greet-input" v-model="name" placeholder="Enter a name..." />
            <Button type="submit">Greet</Button>
          </div>
          <p v-if="greetMsg" class="text-sm text-muted-foreground">{{ greetMsg }}</p>
        </form>

        <Separator />

        <div class="flex items-center justify-between">
          <span class="text-sm text-muted-foreground">Pinia 状态计数：{{ counter.count }}</span>
          <Button variant="secondary" @click="counter.increment()">+1</Button>
        </div>
      </CardContent>
    </Card>
  </div>
</template>
