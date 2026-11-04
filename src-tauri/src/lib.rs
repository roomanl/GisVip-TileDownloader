use tauri::Manager;
//use tokio::time::{Duration, sleep};

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

// 显示主窗口
#[tauri::command]
async fn show_main_window(window: tauri::Window) -> Result<(), String> {
    let main_window = window.get_webview_window("main").unwrap();
    main_window.show().unwrap();
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            None,
        ))
        .plugin(tauri_plugin_store::Builder::new().build())
        .invoke_handler(tauri::generate_handler![greet, show_main_window])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
