mod dashboard;
mod ipc;
mod launch;
mod quarantine;
mod recovery;
mod remote_guard;
mod sandbox;

use std::sync::{Arc, Mutex};

use ipc::{start_ipc_server, IpcRouterState, IpcState, IPC_PORT};
use launch::LaunchState;
use dashboard::DashboardStore;
use quarantine::{default_quarantine_dir, QuarantineItem, QuarantineStore, RiskLevel};
use recovery::{
    ExportRecoveryReportResult, RecoveryChecklist, RecoveryManager, RecoveryWizardState,
    UndoExposurePayload,
};
use remote_guard::{start_poll_loop, RemoteGuardManager, RemoteGuardState};
use sandbox::{
    get_capabilities, open_normally, OpenSafelyResult, SandboxCapabilities, SandboxSessionView,
    SessionEndSummary, SessionManager,
};
use tauri::{
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
    Emitter, Manager, RunEvent,
};

const OPEN_ANYWAY_PHRASE: &str = "OPEN ANYWAY";

#[derive(Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct CompanionStatus {
    extension_last_ping_at: Option<i64>,
    ipc_port: u16,
    version: String,
    quarantine_count: usize,
    quarantine_dir: String,
    windows_sandbox_available: bool,
    remote_shield_active: bool,
}

#[tauri::command]
fn open_dashboard() -> Result<(), String> {
    open::that(format!("http://127.0.0.1:{IPC_PORT}/"))
        .map_err(|error| error.to_string())
}

#[tauri::command]
fn get_companion_status(
    ipc_state: tauri::State<'_, Arc<Mutex<IpcState>>>,
    quarantine: tauri::State<'_, QuarantineStore>,
    remote_guard: tauri::State<'_, RemoteGuardManager>,
) -> CompanionStatus {
    let inner = ipc_state.lock().expect("ipc state poisoned");
    let caps = get_capabilities();
    let guard = remote_guard.state();
    CompanionStatus {
        extension_last_ping_at: inner.extension_last_ping_at,
        ipc_port: IPC_PORT,
        version: env!("CARGO_PKG_VERSION").to_string(),
        quarantine_count: quarantine.quarantine_count(),
        quarantine_dir: quarantine.base_dir().to_string_lossy().to_string(),
        windows_sandbox_available: caps.windows_sandbox_available,
        remote_shield_active: guard.shield_active,
    }
}

#[tauri::command]
fn get_sandbox_capabilities() -> SandboxCapabilities {
    get_capabilities()
}

#[tauri::command]
fn get_remote_guard_state(
    remote_guard: tauri::State<'_, RemoteGuardManager>,
) -> RemoteGuardState {
    remote_guard.state()
}

#[tauri::command]
fn respond_remote_session_alert(
    remote_guard: tauri::State<'_, RemoteGuardManager>,
    app: tauri::AppHandle,
    alert_id: String,
    action: String,
) -> Result<RemoteGuardState, String> {
    let state = remote_guard.respond(&alert_id, &action)?;
    let _ = app.emit("remote-guard-updated", &state);
    Ok(state)
}

#[tauri::command]
fn dismiss_sensitive_warning(
    remote_guard: tauri::State<'_, RemoteGuardManager>,
    app: tauri::AppHandle,
) -> Result<RemoteGuardState, String> {
    remote_guard.dismiss_sensitive_warning()?;
    let state = remote_guard.state();
    let _ = app.emit("remote-guard-updated", &state);
    Ok(state)
}

#[tauri::command]
fn list_quarantine_items(quarantine: tauri::State<'_, QuarantineStore>) -> Vec<QuarantineItem> {
    quarantine.list_items()
}

#[tauri::command]
fn defer_quarantine_item(quarantine: tauri::State<'_, QuarantineStore>, id: String) -> Result<(), String> {
    quarantine.defer_item(&id)?;
    Ok(())
}

#[tauri::command]
fn delete_quarantine_item(
    quarantine: tauri::State<'_, QuarantineStore>,
    app: tauri::AppHandle,
    id: String,
) -> Result<(), String> {
    quarantine.delete_item(&id)?;
    let _ = app.emit("quarantine-updated", ());
    Ok(())
}

#[tauri::command]
fn request_open_safely(
    quarantine: tauri::State<'_, QuarantineStore>,
    sessions: tauri::State<'_, SessionManager>,
    app: tauri::AppHandle,
    id: String,
) -> Result<OpenSafelyResult, String> {
    let item = quarantine
        .get_item(&id)
        .ok_or("Quarantine item not found.")?;
    let (session, result) = sessions.open_safely(&item)?;
    let _ = app.emit("sandbox-session-started", &session);
    Ok(result)
}

#[tauri::command]
fn get_active_sandbox_session(
    sessions: tauri::State<'_, SessionManager>,
) -> Option<SandboxSessionView> {
    sessions.active()
}

#[tauri::command]
fn end_sandbox_session(
    sessions: tauri::State<'_, SessionManager>,
    app: tauri::AppHandle,
    session_id: String,
) -> Result<SessionEndSummary, String> {
    let summary = sessions.end(&session_id)?;
    let _ = app.emit("sandbox-session-ended", &summary);
    Ok(summary)
}

#[tauri::command]
fn open_normally_with_confirm(
    quarantine: tauri::State<'_, QuarantineStore>,
    id: String,
    confirmation: String,
) -> Result<(), String> {
    let item = quarantine
        .get_item(&id)
        .ok_or("Quarantine item not found.")?;

    if item.level == RiskLevel::HighRisk && confirmation.trim() != OPEN_ANYWAY_PHRASE {
        return Err(format!(
            "Type {OPEN_ANYWAY_PHRASE} to open a high-risk file on your PC."
        ));
    }

    open_normally(std::path::Path::new(&item.quarantine_path))
}

#[tauri::command]
fn get_recovery_wizard_state(recovery: tauri::State<'_, RecoveryManager>) -> RecoveryWizardState {
    recovery.get_state()
}

#[tauri::command]
fn start_recovery_wizard(
    recovery: tauri::State<'_, RecoveryManager>,
    app: tauri::AppHandle,
) -> Result<RecoveryWizardState, String> {
    let state = recovery.start_wizard()?;
    let _ = app.emit("recovery-updated", &state);
    Ok(state)
}

#[tauri::command]
fn set_recovery_wizard_step(
    recovery: tauri::State<'_, RecoveryManager>,
    app: tauri::AppHandle,
    step: u8,
) -> Result<RecoveryWizardState, String> {
    let state = recovery.set_step(step)?;
    let _ = app.emit("recovery-updated", &state);
    Ok(state)
}

#[tauri::command]
fn update_recovery_checklist(
    recovery: tauri::State<'_, RecoveryManager>,
    app: tauri::AppHandle,
    checklist: RecoveryChecklist,
) -> Result<RecoveryWizardState, String> {
    let state = recovery.update_checklist(checklist)?;
    let _ = app.emit("recovery-updated", &state);
    Ok(state)
}

#[tauri::command]
fn refresh_exposure_diff(
    recovery: tauri::State<'_, RecoveryManager>,
    app: tauri::AppHandle,
) -> Result<RecoveryWizardState, String> {
    let state = recovery.refresh_exposure_diff()?;
    let _ = app.emit("recovery-updated", &state);
    Ok(state)
}

#[tauri::command]
fn request_browser_extension_snapshot(
    recovery: tauri::State<'_, RecoveryManager>,
) -> Result<bool, String> {
    Ok(recovery.request_extension_snapshot())
}

#[tauri::command]
fn undo_exposure_items(
    recovery: tauri::State<'_, RecoveryManager>,
    app: tauri::AppHandle,
    item_ids: Vec<String>,
) -> Result<RecoveryWizardState, String> {
    let state = recovery.undo_exposure_items(UndoExposurePayload { item_ids })?;
    let _ = app.emit("recovery-updated", &state);
    Ok(state)
}

#[tauri::command]
fn export_recovery_report(
    recovery: tauri::State<'_, RecoveryManager>,
) -> Result<ExportRecoveryReportResult, String> {
    recovery.export_report()
}

#[tauri::command]
fn close_recovery_wizard(
    recovery: tauri::State<'_, RecoveryManager>,
    app: tauri::AppHandle,
) -> Result<RecoveryWizardState, String> {
    let state = recovery.close_wizard()?;
    let _ = app.emit("recovery-updated", &state);
    Ok(state)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| tracing_subscriber::EnvFilter::new("info")),
        )
        .init();

    let ipc_state: Arc<Mutex<IpcState>> = Arc::new(Mutex::new(IpcState::default()));
    let quarantine = QuarantineStore::new(default_quarantine_dir());
    let sessions = SessionManager::new();
    let remote_guard = RemoteGuardManager::new();
    let recovery = RecoveryManager::new();
    let dashboard = DashboardStore::new();

    tauri::Builder::default()
        .manage(ipc_state.clone())
        .manage(quarantine.clone())
        .manage(sessions.clone())
        .manage(remote_guard.clone())
        .manage(recovery.clone())
        .manage(dashboard.clone())
        .invoke_handler(tauri::generate_handler![
            open_dashboard,
            get_companion_status,
            get_sandbox_capabilities,
            get_remote_guard_state,
            respond_remote_session_alert,
            dismiss_sensitive_warning,
            get_recovery_wizard_state,
            start_recovery_wizard,
            set_recovery_wizard_step,
            update_recovery_checklist,
            refresh_exposure_diff,
            request_browser_extension_snapshot,
            undo_exposure_items,
            export_recovery_report,
            close_recovery_wizard,
            list_quarantine_items,
            defer_quarantine_item,
            delete_quarantine_item,
            request_open_safely,
            get_active_sandbox_session,
            end_sandbox_session,
            open_normally_with_confirm,
        ])
        .setup(move |app| {
            let show_item = MenuItem::with_id(app, "show", "Show", true, None::<&str>)?;
            let quit_item = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let tray_menu = Menu::with_items(app, &[&show_item, &quit_item])?;

            let _tray = TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&tray_menu)
                .tooltip("Anti-SE Companion")
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "show" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                    "quit" => {
                        app.exit(0);
                    }
                    _ => {}
                })
                .build(app)?;

            let router_state = IpcRouterState {
                ipc_state: ipc_state.clone(),
                quarantine: quarantine.clone(),
                remote_guard: remote_guard.clone(),
                recovery: recovery.clone(),
                dashboard: dashboard.clone(),
                sessions: sessions.clone(),
                app_handle: app.handle().clone(),
            };
            start_ipc_server(router_state);
            start_poll_loop(remote_guard, app.handle().clone());

            let companion_dir = default_quarantine_dir()
                .parent()
                .map(std::path::Path::to_path_buf)
                .unwrap_or_else(std::env::temp_dir);
            if LaunchState::new(companion_dir.clone()).should_show_welcome() {
                let welcome_url = format!("http://127.0.0.1:{IPC_PORT}/?welcome=1");
                let launch_state = LaunchState::new(companion_dir);
                tauri::async_runtime::spawn(async move {
                    tokio::time::sleep(std::time::Duration::from_millis(900)).await;
                    let _ = open::that(welcome_url);
                    let _ = launch_state.mark_welcome_shown();
                });
            }

            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("failed to build tauri application")
        .run(|app_handle, event| {
            if let RunEvent::ExitRequested { api, .. } = event {
                api.prevent_exit();
                if let Some(window) = app_handle.get_webview_window("main") {
                    let _ = window.hide();
                }
            }
        });
}
