/**
 * 栏一菜单 "custom" 类型动作的注册表（开发者自定义区域）。
 *
 * key 与 src/config/menu.ts 中 CustomEntry.id 一一对应。
 * 点击该类按钮不打开任何页面，仅执行这里注册的函数。
 */
import { toast } from "vue-sonner";
import { useAppStore } from "@/stores/app";

type CustomAction = () => void | Promise<void>;

export const customActions: Record<string, CustomAction> = {
    // 示例 1：弹出工具 Dialog
    tools: () => {
        useAppStore().openDialog("tools");
    },
    // 示例 2：不依赖 Dialog 的任意逻辑（toast、调用 Tauri command、打开新窗口……）
    feedback: () => {
        toast("反馈入口：由开发者自定义行为");
    },
};
