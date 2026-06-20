use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    routing::{get, post},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use tauri::Emitter;

use crate::dashboard::export::build_incident_export;
use crate::dashboard::DEV_LAB_PAGE_PATH;
use crate::ipc::{IpcRouterState, IPC_PORT};
use crate::quarantine::RiskLevel;
use crate::sandbox::get_capabilities;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct SummaryResponse {
    extension_state: &'static str,
    companion_version: String,
    quarantine_count: usize,
    incident_count: usize,
    activity_count: usize,
    remote_shield_active: bool,
    windows_sandbox_available: bool,
    active_thread_level: Option<String>,
    running_remote_tools: Vec<String>,
    last_extension_ping_at: Option<i64>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct RemoteRespondBody {
    alert_id: String,
    action: String,
}

pub fn mount_api_routes() -> Router<IpcRouterState> {
    Router::new()
        .route("/api/setup", get(api_setup))
        .route("/api/summary", get(api_summary))
        .route("/api/activity", get(api_activity))
        .route("/api/incidents", get(api_incidents))
        .route("/api/incidents/export", get(api_incidents_export))
        .route("/api/quarantine", get(api_quarantine))
        .route("/api/remote-guard", get(api_remote_guard))
        .route("/api/quarantine/{id}/defer", post(api_defer))
        .route("/api/quarantine/{id}/delete", post(api_delete))
        .route("/api/quarantine/{id}/open-safely", post(api_open_safely))
        .route("/api/remote-guard/respond", post(api_remote_respond))
        .route("/api/settings", get(api_settings).post(api_settings_save))
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct SettingsResponse {
    extension_connected: bool,
    synced_at: Option<i64>,
    pending_save: bool,
    settings: Option<serde_json::Value>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct SettingsSaveBody {
    disabled_rule_ids: Vec<String>,
    allowlisted_domains: Vec<String>,
    show_job_browser_hint: bool,
    overlays_enabled: bool,
    marketplace_only_scan: bool,
}

async fn api_settings(State(state): State<IpcRouterState>) -> Json<SettingsResponse> {
    let inner = state.ipc_state.lock().ok();
    let (last_ping, synced_at, settings, pending_save) = inner
        .as_ref()
        .map(|ipc| {
            (
                ipc.extension_last_ping_at,
                ipc.extension_settings_synced_at,
                ipc.extension_settings.clone(),
                ipc.pending_settings_update.is_some(),
            )
        })
        .unwrap_or((None, None, None, false));

    Json(SettingsResponse {
        extension_connected: connection_state_from_last_ping(last_ping) == "connected",
        synced_at,
        pending_save,
        settings,
    })
}

async fn api_settings_save(
    State(state): State<IpcRouterState>,
    Json(body): Json<SettingsSaveBody>,
) -> Result<StatusCode, StatusCode> {
    let mut inner = state
        .ipc_state
        .lock()
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let last_ping = inner.extension_last_ping_at;
    if connection_state_from_last_ping(last_ping) != "connected" {
        return Err(StatusCode::SERVICE_UNAVAILABLE);
    }

    inner.pending_settings_update = Some(serde_json::json!({
        "disabledRuleIds": body.disabled_rule_ids,
        "allowlistedDomains": body.allowlisted_domains,
        "showJobBrowserHint": body.show_job_browser_hint,
        "overlaysEnabled": body.overlays_enabled,
        "marketplaceOnlyScan": body.marketplace_only_scan,
    }));

    Ok(StatusCode::ACCEPTED)
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct SetupResponse {
    extension_connected: bool,
    has_activity: bool,
    has_practice_scan: bool,
    recommended_next: &'static str,
    practice_scenario: &'static str,
    dev_lab_url: Option<String>,
}

async fn api_setup(State(state): State<IpcRouterState>) -> Json<SetupResponse> {
    let (last_ping, dev_lab_url) = state
        .ipc_state
        .lock()
        .ok()
        .map(|inner| {
            let url = inner.extension_id.as_ref().map(|id| {
                format!("chrome-extension://{id}/{DEV_LAB_PAGE_PATH}")
            });
            (inner.extension_last_ping_at, url)
        })
        .unwrap_or((None, None));
    let extension_connected = connection_state_from_last_ping(last_ping) == "connected";
    let activities = state.dashboard.list_activities();
    let has_practice = state.dashboard.has_practice_scan();
    let has_activity = !activities.is_empty();

    let recommended_next = if !extension_connected {
        "Install the extension from Chrome Web Store or Edge Add-ons, then open the popup — it should say Connected."
    } else if !has_practice {
        "Open the extension popup → Practice → Analyze this thread. This page will show proof it works."
    } else if has_activity {
        "You are set up. Browse Gmail, LinkedIn, or Upwork — flagged threads appear here automatically."
    } else {
        "Browse a supported site with the extension enabled."
    };

    Json(SetupResponse {
        extension_connected,
        has_activity,
        has_practice_scan: has_practice,
        recommended_next,
        practice_scenario:
            "A fake recruiter asks for AnyDesk and off-platform payment — the same pattern real scams use.",
        dev_lab_url,
    })
}

async fn api_summary(State(state): State<IpcRouterState>) -> Json<SummaryResponse> {
    let last_ping = state
        .ipc_state
        .lock()
        .ok()
        .and_then(|inner| inner.extension_last_ping_at);
    let extension_state = connection_state_from_last_ping(last_ping);
    let guard = state.remote_guard.state();
    let active_thread_level = guard.active_thread.as_ref().map(|thread| {
        match thread.level {
            RiskLevel::Safe => "safe".to_string(),
            RiskLevel::Caution => "caution".to_string(),
            RiskLevel::HighRisk => "high-risk".to_string(),
        }
    });

    Json(SummaryResponse {
        extension_state,
        companion_version: env!("CARGO_PKG_VERSION").to_string(),
        quarantine_count: state.quarantine.quarantine_count(),
        incident_count: state.dashboard.list_incidents().len(),
        activity_count: state.dashboard.list_activities().len(),
        remote_shield_active: guard.shield_active,
        windows_sandbox_available: get_capabilities().windows_sandbox_available,
        active_thread_level,
        running_remote_tools: guard.running_remote_tools,
        last_extension_ping_at: last_ping,
    })
}

async fn api_activity(State(state): State<IpcRouterState>) -> Json<serde_json::Value> {
    Json(serde_json::json!(state.dashboard.list_activities()))
}

async fn api_incidents(State(state): State<IpcRouterState>) -> Json<serde_json::Value> {
    Json(serde_json::json!(state.dashboard.list_incidents()))
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct IncidentExportQuery {
    id: Option<String>,
}

async fn api_incidents_export(
    State(state): State<IpcRouterState>,
    Query(query): Query<IncidentExportQuery>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let incidents = state.dashboard.list_incidents();
    if query.id.as_ref().is_some_and(|id| !incidents.iter().any(|item| item.id == *id)) {
        return Err(StatusCode::NOT_FOUND);
    }

    let export = build_incident_export(&incidents, query.id.as_deref());
    Ok(Json(
        serde_json::to_value(export).map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?,
    ))
}

async fn api_quarantine(State(state): State<IpcRouterState>) -> Json<serde_json::Value> {
    Json(serde_json::json!(state.quarantine.list_items()))
}

async fn api_remote_guard(State(state): State<IpcRouterState>) -> Json<serde_json::Value> {
    Json(serde_json::to_value(state.remote_guard.state()).unwrap_or(serde_json::Value::Null))
}

async fn api_defer(
    State(state): State<IpcRouterState>,
    Path(id): Path<String>,
) -> Result<StatusCode, StatusCode> {
    state
        .quarantine
        .defer_item(&id)
        .map(|_| StatusCode::OK)
        .map_err(|_| StatusCode::BAD_REQUEST)
}

async fn api_delete(
    State(state): State<IpcRouterState>,
    Path(id): Path<String>,
) -> Result<StatusCode, StatusCode> {
    state
        .quarantine
        .delete_item(&id)
        .map(|_| {
            let _ = state.app_handle.emit("quarantine-updated", ());
            StatusCode::OK
        })
        .map_err(|_| StatusCode::BAD_REQUEST)
}

async fn api_open_safely(
    State(state): State<IpcRouterState>,
    Path(id): Path<String>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let item = state
        .quarantine
        .get_item(&id)
        .ok_or(StatusCode::NOT_FOUND)?;

    let (session, result) = state
        .sessions
        .open_safely(&item)
        .map_err(|_| StatusCode::BAD_REQUEST)?;

    let _ = state.app_handle.emit("sandbox-session-started", &session);
    let value = serde_json::to_value(result).map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    Ok(Json(value))
}

async fn api_remote_respond(
    State(state): State<IpcRouterState>,
    Json(body): Json<RemoteRespondBody>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let next = state
        .remote_guard
        .respond(&body.alert_id, &body.action)
        .map_err(|_| StatusCode::BAD_REQUEST)?;
    let _ = state.app_handle.emit("remote-guard-updated", &next);
    let value = serde_json::to_value(next).map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    Ok(Json(value))
}

pub fn connection_state_from_last_ping(last_ping: Option<i64>) -> &'static str {
    const TIMEOUT_MS: i64 = 10_000;
    match last_ping {
        None => "unknown",
        Some(ts) => {
            let now = chrono_now_ms();
            if now - ts <= TIMEOUT_MS {
                "connected"
            } else {
                "disconnected"
            }
        }
    }
}

fn chrono_now_ms() -> i64 {
    use std::time::{SystemTime, UNIX_EPOCH};
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as i64)
        .unwrap_or(0)
}

#[allow(dead_code)]
pub fn dashboard_port() -> u16 {
    IPC_PORT
}
