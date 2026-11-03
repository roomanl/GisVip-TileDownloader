import { Menu, MenuItem } from "@tauri-apps/api/menu";
import { TrayIcon, type TrayIconEvent } from "@tauri-apps/api/tray";
import { getCurrentWindow } from "@tauri-apps/api/window";

/**
 * 系统托盘（前端实现，@tauri-apps/api/tray）。
 *
 * - 左键单击：显示并聚焦主窗口
 * - 右键：弹出菜单「打开主界面 / 退出」
 *
 * 依赖：Cargo features ["tray-icon", "image-png"]；图标以字节数组传入
 * （public/tray-icon.png，dev 与打包后均可通过 URL 访问）。
 */

async function showMainWindow() {
    const window = getCurrentWindow();
    await window.unminimize();
    await window.show();
    await window.setFocus();
}

export async function setupTray() {
    const showItem = await MenuItem.new({
        id: "show",
        text: "打开主界面",
        action: () => {
            void showMainWindow();
        },
    });

    const quitItem = await MenuItem.new({
        id: "quit",
        text: "退出",
        action: () => {
            // 关闭主窗口：最后一个窗口关闭后应用随之退出（Tauri 默认行为）
            void getCurrentWindow().close();
        },
    });

    const menu = await Menu.new({ items: [showItem, quitItem] });

    // 读取打包在 public 下的 PNG 字节作为托盘图标
    const iconBytes = new Uint8Array(await (await fetch("/tray-icon.png")).arrayBuffer());

    await TrayIcon.new({
        id: "main-tray",
        tooltip: "GisVip TileDownloader",
        icon: iconBytes,
        menu,
        // 左键只唤窗口，不弹菜单（菜单仅右键展示）
        showMenuOnLeftClick: false,
        action: (event: TrayIconEvent) => {
            if (event.type === "Click" && event.button === "Left" && event.buttonState === "Up") {
                void showMainWindow();
            }
        },
    });
}
