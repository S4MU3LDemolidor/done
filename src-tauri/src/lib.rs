use tauri::{AppHandle, Emitter, Manager};
use tauri_plugin_global_shortcut::ShortcutState;

fn toggle_quickadd(app: &AppHandle) {
    let Some(win) = app.get_webview_window("quickadd") else {
        return;
    };
    if win.is_visible().unwrap_or(false) {
        let _ = win.hide();
    } else {
        let _ = win.center();
        let _ = win.show();
        let _ = win.set_focus();
        let _ = app.emit_to("quickadd", "quickadd:shown", ());
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_shortcuts(["Alt+Space"])
                .expect("invalid shortcut definition")
                .with_handler(|app, _shortcut, event| {
                    if event.state() == ShortcutState::Pressed {
                        toggle_quickadd(app);
                    }
                })
                .build(),
        )
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
