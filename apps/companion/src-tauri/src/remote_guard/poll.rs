use std::time::Duration;

use tauri::{AppHandle, Emitter, Manager};

use super::manager::{GuardTickEvent, RemoteGuardManager};

const POLL_INTERVAL_MS: u64 = 2000;

pub fn start_poll_loop(guard: RemoteGuardManager, app: AppHandle) {
    tauri::async_runtime::spawn(async move {
        let mut interval = tokio::time::interval(Duration::from_millis(POLL_INTERVAL_MS));
        loop {
            interval.tick().await;
            let events = guard.tick();

            for event in events {
                match event {
                    GuardTickEvent::NewAlert(alert) => {
                        let _ = app.emit("remote-session-alert", &alert);
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                    GuardTickEvent::SensitiveWarning(warning) => {
                        let _ = app.emit("sensitive-app-warning", &warning);
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                        }
                    }
                    GuardTickEvent::AlertCleared => {
                        let _ = app.emit("remote-session-alert-cleared", ());
                    }
                }
            }
        }
    });
}
