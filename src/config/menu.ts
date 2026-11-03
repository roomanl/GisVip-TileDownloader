/**
 * 栏一（图标导航栏）菜单配置文件。
 *
 * 每个菜单项有且仅有三种类型（kind）：
 * - "group"：有二级菜单。点击后跳转第一个二级页面，使用 3 栏布局（栏一 + 栏二 + 页面）。
 * - "page" ：无二级菜单。点击后直接跳转页面，使用 2 栏布局（栏一 + 页面）。
 * - "custom"：不打开任何页面，点击行为由开发者在 src/config/menuActions.ts 中
 *   以相同 id 注册自定义处理函数（如弹出 Dialog、toast 等）。
 *
 * 新增模块只需在此文件添加配置项；group 的子页面与 page 页面需同时提供
 * component（懒加载视图），路由会据此自动生成，无需再改 router。
 */
import type { Component } from "vue";
import {
    Activity,
    Blocks,
    Compass,
    Download,
    LayoutDashboard,
    Map,
    MessageSquare,
    Settings,
    SlidersHorizontal,
    Wrench,
} from "lucide-vue-next";

/** 可打开页面的菜单项（栏二子项，或独立的单页模块） */
export interface PageEntry {
    kind: "page";
    id: string;
    title: string;
    icon: Component;
    /** 路由路径，如 "/dashboard" */
    route: string;
    /** 懒加载页面组件（由 router 自动注册为路由） */
    component: unknown;
}

/** 有二级菜单的模块（3 栏布局） */
export interface GroupEntry {
    kind: "group";
    id: string;
    title: string;
    icon: Component;
    children: PageEntry[];
}

/** 开发者自定义动作项（不跳转页面） */
export interface CustomEntry {
    kind: "custom";
    id: string;
    title: string;
    icon: Component;
}

export type RailItem = GroupEntry | PageEntry | CustomEntry;

export interface MenuConfig {
    /** 栏一顶部的 LOGO 图标 */
    logo: Component;
    /** 栏一上方的模块菜单 */
    modules: RailItem[];
    /** 栏一底部的功能按钮（设置等） */
    bottomItems: RailItem[];
}

export const menuConfig: MenuConfig = {
    logo: Compass,
    modules: [
        {
            // 类型 1：有二级菜单 → 3 栏布局
            kind: "group",
            id: "home",
            title: "首页",
            icon: Blocks,
            children: [
                {
                    kind: "page",
                    id: "dashboard",
                    title: "Dashboard",
                    icon: LayoutDashboard,
                    route: "/dashboard",
                    component: () => import("@/views/modules/dashboard/index.vue"),
                },
                {
                    kind: "page",
                    id: "balurus",
                    title: "Balurus",
                    icon: Activity,
                    route: "/balurus",
                    component: () => import("@/views/modules/balurus/index.vue"),
                },
            ],
        },
        {
            // 类型 2：无二级菜单 → 2 栏布局
            kind: "page",
            id: "map",
            title: "地图",
            icon: Map,
            route: "/map",
            component: () => import("@/views/modules/map/index.vue"),
        },
        {
            // 类型 3：自定义动作 → 点击弹出 Dialog，不打开页面
            kind: "custom",
            id: "tools",
            title: "工具",
            icon: Wrench,
        },
    ],
    bottomItems: [
        {
            // 设置：底部栏一的 group 模块 → 3 栏布局，二级菜单为系统设置/下载设置
            kind: "group",
            id: "settings",
            title: "设置",
            icon: Settings,
            children: [
                {
                    kind: "page",
                    id: "settings-system",
                    title: "系统设置",
                    icon: SlidersHorizontal,
                    route: "/settings/system",
                    component: () => import("@/views/modules/settings-system/index.vue"),
                },
                {
                    kind: "page",
                    id: "settings-download",
                    title: "下载设置",
                    icon: Download,
                    route: "/settings/download",
                    component: () => import("@/views/modules/settings-download/index.vue"),
                },
            ],
        },
        {
            kind: "custom",
            id: "feedback",
            title: "反馈",
            icon: MessageSquare,
        },
    ],
};

/** 递归收集所有可打开页面的菜单项（用于自动生成路由） */
export function collectPages(items: RailItem[]): PageEntry[] {
    const pages: PageEntry[] = [];
    for (const item of items) {
        if (item.kind === "page") pages.push(item);
        else if (item.kind === "group") pages.push(...item.children);
    }
    return pages;
}

/** 栏一全部入口（模块 + 底部按钮） */
export function allRailItems(): RailItem[] {
    return [...menuConfig.modules, ...menuConfig.bottomItems];
}

/** 根据路由路径查找所属模块（用于同步栏一高亮与布局切换） */
export function findModuleByPath(path: string): RailItem | undefined {
    return allRailItems().find(
        (m) =>
            (m.kind === "page" && m.route === path)
            || (m.kind === "group" && m.children.some((c) => c.route === path)),
    );
}
