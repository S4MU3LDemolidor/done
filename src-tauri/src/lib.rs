use tauri::{AppHandle, Emitter, Manager, RunEvent, WindowEvent};
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

fn show_main(app: &AppHandle) {
    if let Some(win) = app.get_webview_window("main") {
        let _ = win.show();
        let _ = win.set_focus();
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let app = tauri::Builder::default()
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
        .on_window_event(|window, event| {
            // Fechar a janela principal apenas a esconde (padrão macOS); ⌘Q encerra de verdade
            if window.label() == "main" {
                if let WindowEvent::CloseRequested { api, .. } = event {
                    api.prevent_close();
                    let _ = window.hide();
                }
            }
        })
        .build(tauri::generate_context!())
        .expect("error while building tauri application");

    app.run(|app_handle, event| {
        // Clique no ícone do Dock reabre a janela principal
        if let RunEvent::Reopen { .. } = event {
            show_main(app_handle);
        }
    });
}
