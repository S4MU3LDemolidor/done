use tauri::{
    menu::{CheckMenuItem, Menu, MenuItem, PredefinedMenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Emitter, Manager, RunEvent, WindowEvent,
};
use tauri_plugin_autostart::{MacosLauncher, ManagerExt};
use tauri_plugin_global_shortcut::{Code, Modifiers, ShortcutState};

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

fn open_focus(app: &AppHandle) {
    let Some(win) = app.get_webview_window("focus") else {
        return;
    };
    let _ = win.center();
    let _ = win.show();
    let _ = win.set_focus();
    // Reinicia o seletor de foco e recarrega as tarefas no front-end
    let _ = app.emit_to("focus", "focus:open", ());
}

fn setup_tray(app: &tauri::App) -> tauri::Result<()> {
    let autostart_enabled = app.autolaunch().is_enabled().unwrap_or(false);

    let open_item = MenuItem::with_id(app, "open", "Abrir Done", true, None::<&str>)?;
    let add_item =
        MenuItem::with_id(app, "quickadd", "Nova tarefa", true, Some("Alt+Space"))?;
    let autostart_item = CheckMenuItem::with_id(
        app,
        "autostart",
        "Iniciar com o sistema",
        true,
        autostart_enabled,
        None::<&str>,
    )?;
    let quit_item = PredefinedMenuItem::quit(app, Some("Encerrar Done"))?;
    let menu = Menu::with_items(
        app,
        &[
            &open_item,
            &add_item,
            &PredefinedMenuItem::separator(app)?,
            &autostart_item,
            &PredefinedMenuItem::separator(app)?,
            &quit_item,
        ],
    )?;

    let icon = tauri::image::Image::from_bytes(include_bytes!("../icons/tray.png"))?;
    TrayIconBuilder::with_id("done-tray")
        .icon(icon)
        .icon_as_template(true)
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| match event.id().as_ref() {
            "open" => show_main(app),
            "quickadd" => toggle_quickadd(app),
            "autostart" => {
                let autolaunch = app.autolaunch();
                if autolaunch.is_enabled().unwrap_or(false) {
                    let _ = autolaunch.disable();
                } else {
                    let _ = autolaunch.enable();
                }
            }
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            // Clique esquerdo no ícone alterna a barra de adição rápida
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                toggle_quickadd(tray.app_handle());
            }
        })
        .build(app)?;
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let app = tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_autostart::init(
            MacosLauncher::LaunchAgent,
            None,
        ))
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                // Alt+Space → adição rápida; Cmd+Alt+Space → janela principal; Alt+F → foco
                .with_shortcuts(["Alt+Space", "Cmd+Alt+Space", "Alt+KeyF"])
                .expect("invalid shortcut definition")
                .with_handler(|app, shortcut, event| {
                    if event.state() != ShortcutState::Pressed {
                        return;
                    }
                    // Alt+F → modo foco; Cmd+Alt+Space → principal; Alt+Space → adição rápida
                    if shortcut.key == Code::KeyF {
                        open_focus(app);
                    } else if shortcut.mods.contains(Modifiers::SUPER) {
                        show_main(app);
                    } else {
                        toggle_quickadd(app);
                    }
                })
                .build(),
        )
        .setup(|app| {
            setup_tray(app)?;
            // App acessório: vive só na barra de menus, sem ícone no Dock (estilo Raycast)
            #[cfg(target_os = "macos")]
            app.set_activation_policy(tauri::ActivationPolicy::Accessory);
            Ok(())
        })
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
