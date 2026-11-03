import { ref } from "vue";
import { defineStore } from "pinia";
import { menuConfig } from "@/config/menu";

/**
 * 全局 UI 状态：当前激活的栏一模块（决定 2/3 栏布局）、自定义弹窗状态。
 */
export const useAppStore = defineStore("app", () => {
    /** 当前激活的栏一模块 id，默认第一个模块 */
    const activeModuleId = ref<string>(menuConfig.modules[0]?.id ?? "");

    /** 当前打开的自定义弹窗 id（对应 menuActions / AppDialogs），null 表示无 */
    const dialogId = ref<string | null>(null);

    function setActiveModule(id: string) {
        activeModuleId.value = id;
    }

    function openDialog(id: string) {
        dialogId.value = id;
    }

    function closeDialog() {
        dialogId.value = null;
    }

    return { activeModuleId, dialogId, setActiveModule, openDialog, closeDialog };
});
