import type { RouteRecordRaw } from "vue-router";
import { createRouter, createWebHashHistory } from "vue-router";
import { collectPages, allRailItems } from "@/config/menu";

// Tauri 生产环境下资源通过 tauri:// 协议加载，使用 hash 模式最稳妥

/** 页面路由由菜单配置自动生成（含底部栏一项）：新增页面只需改 src/config/menu.ts */
const pages = collectPages(allRailItems());

const routes: RouteRecordRaw[] = [
    {
        // 欢迎页：无壳层，3 秒后跳转 /home
        path: "/welcome",
        name: "welcome",
        component: () => import("@/views/welcome/index.vue"),
        meta: { title: "欢迎" },
    },
    {
        // Home：主界面壳层（布局路由），业务页面都是它的子路由
        path: "/home",
        component: () => import("@/views/home/index.vue"),
        children: [
            { path: "", redirect: pages[0]?.route ?? "/home" },
            // 子路由用绝对路径（与菜单配置 route 一致），vue-router 原生支持
            ...pages.map<RouteRecordRaw>((page) => ({
                path: page.route,
                name: page.id,
                component: page.component,
                meta: { title: page.title },
            } as RouteRecordRaw)),
        ],
    },
    {
        path: "/",
        redirect: "/welcome",
    },
];

const router = createRouter({
    history: createWebHashHistory(),
    routes,
});

export default router;
