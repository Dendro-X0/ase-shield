use std::net::SocketAddr;
use std::sync::{Arc, Mutex};

use axum::{
    extract::State,
    http::{Method, StatusCode},
    routing::{get, post},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use tauri::Emitter;
use tower_http::cors::{Any, CorsLayer};

use crate::dashboard::{mount_api_routes, serve_dashboard, DashboardStore, IncidentEntry, DEV_LAB_THREAD_PREFIX, PRACTICE_THREAD_ID};
use crate::quarantine::{DownloadQueuedPayload, QuarantineItem, QuarantineStore, RiskLevel};
use crate::recovery::{ExtensionSnapshotPayload, RecoveryManager};
use crate::remote_guard::{RemoteGuardManager, ThreadContextPayload};
use crate::sandbox::SessionManager;

pub const IPC_PORT: u16 = 47123;
pub const IPC_VERSION: u32 = 1;

#[derive(Default)]
pub struct IpcState {
    pub extension_last_ping_at: Option<i64>,
    pub extension_id: Option<String>,
}

pub type SharedIpcState = Arc<Mutex<IpcState>>;

#[derive(Clone)]
pub struct IpcRouterState {
    pub ipc_state: SharedIpcState,
    pub quarantine: QuarantineStore,
    pub remote_guard: RemoteGuardManager,
    pub recovery: RecoveryManager,
    pub dashboard: DashboardStore,
    pub sessions: SessionManager,
    pub app_handle: tauri::AppHandle,
}

#[derive(Debug, Deserialize)]
struct IpcEnvelope {
    v: u32,
    #[serde(rename = "type")]
    message_type: String,
    payload: Value,
    #[allow(dead_code)]
    sent_at: String,
}

#[derive(Serialize)]
struct IpcResponse {
    v: u32,
    #[serde(rename = "type")]
    message_type: String,
    payload: Value,
    sent_at: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct PongPayload {
    source: &'static str,
    companion_version: String,
    pending_events: Vec<Value>,
    request_extension_snapshot: bool,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct QuarantineStatusPayload {
    download_id: i64,
    status: &'static str,
    level: Option<String>,
    message: Option<String>,
    quarantine_id: Option<String>,
    findings: Vec<String>,
}

pub fn start_ipc_server(state: IpcRouterState) {
    tauri::async_runtime::spawn(async move {
        let cors = CorsLayer::new()
            .allow_origin(Any)
            .allow_methods([Method::GET, Method::POST, Method::OPTIONS])
            .allow_headers(Any);

        let app = Router::new()
            .route("/health", get(health))
            .route("/ipc", post(handle_ipc))
            .merge(mount_api_routes())
            .fallback(get(serve_dashboard))
            .layer(cors)
            .with_state(state);

        let addr = SocketAddr::from(([127, 0, 0, 1], IPC_PORT));

        match tokio::net::TcpListener::bind(addr).await {
            Ok(listener) => {
                tracing::info!("IPC server listening on http://{addr}");
                if let Err(error) = axum::serve(listener, app).await {
                    tracing::error!("IPC server error: {error}");
                }
            }
            Err(error) => {
                tracing::error!("Failed to bind IPC server on {addr}: {error}");
            }
        }
    });
}

async fn health() -> StatusCode {
    StatusCode::OK
}

async fn handle_ipc(
    State(state): State<IpcRouterState>,
    Json(envelope): Json<IpcEnvelope>,
) -> Result<Json<IpcResponse>, StatusCode> {
    if envelope.v != IPC_VERSION {
        return Err(StatusCode::BAD_REQUEST);
    }

    match envelope.message_type.as_str() {
        "PING" => {
            let mut inner = state
                .ipc_state
                .lock()
                .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
            inner.extension_last_ping_at = Some(chrono_now_ms());
            if let Some(id) = envelope
                .payload
                .get("extensionId")
                .and_then(|value| value.as_str())
            {
                inner.extension_id = Some(id.to_string());
            }

            let pending_events: Vec<Value> = state
                .remote_guard
                .drain_pending_events()
                .into_iter()
                .map(|event| {
                    state.dashboard.record_remote_session(
                        &event.detail,
                        event.platform.clone(),
                        event.thread_id.clone(),
                        event.level.clone(),
                    );
                    serde_json::json!({
                        "event": event.event,
                        "detail": event.detail,
                        "sessionId": event.session_id,
                        "platform": event.platform,
                        "threadId": event.thread_id,
                        "level": event.level,
                        "ruleIds": event.rule_ids,
                    })
                })
                .collect();

            let request_extension_snapshot = state.recovery.take_extension_snapshot_request();

            let payload = serde_json::to_value(PongPayload {
                source: "companion",
                companion_version: env!("CARGO_PKG_VERSION").to_string(),
                pending_events,
                request_extension_snapshot,
            })
            .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

            Ok(Json(IpcResponse {
                v: IPC_VERSION,
                message_type: "PONG".to_string(),
                payload,
                sent_at: iso_now(),
            }))
        }
        "DOWNLOAD_QUEUED" => {
            let payload: DownloadQueuedPayload =
                serde_json::from_value(envelope.payload.clone()).map_err(|error| {
                    tracing::warn!("Invalid DOWNLOAD_QUEUED payload: {error}");
                    StatusCode::BAD_REQUEST
                })?;

            match state.quarantine.ingest_download(payload.clone()) {
                Ok(item) => {
                    state.dashboard.record_quarantine(&item);
                    let _ = state.app_handle.emit("quarantine-updated", &item);
                    Ok(Json(build_quarantine_response(
                        payload.download_id,
                        "ready",
                        Some(&item),
                        Some(format!(
                            "{} is in quarantine and has not been opened.",
                            item.filename
                        )),
                    )))
                }
                Err(message) => {
                    tracing::info!("Download queue deferred: {message}");
                    Ok(Json(build_quarantine_response(
                        payload.download_id,
                        "queued",
                        None,
                        Some(message),
                    )))
                }
            }
        }
        "THREAD_CONTEXT" => {
            let payload: ThreadContextPayload =
                serde_json::from_value(envelope.payload.clone()).map_err(|error| {
                    tracing::warn!("Invalid THREAD_CONTEXT payload: {error}");
                    StatusCode::BAD_REQUEST
                })?;

            state.remote_guard.update_thread_context(payload.clone());

            if payload.thread_id.as_deref() == Some(PRACTICE_THREAD_ID) {
                state.dashboard.record_practice_scan(
                    payload.level.unwrap_or(RiskLevel::Safe),
                    payload.summary.as_deref(),
                );
            } else if payload
                .thread_id
                .as_deref()
                .is_some_and(|id| id.starts_with(DEV_LAB_THREAD_PREFIX))
            {
                let scenario_id = payload
                    .thread_id
                    .as_deref()
                    .unwrap_or("")
                    .trim_start_matches(DEV_LAB_THREAD_PREFIX);
                state.dashboard.record_lab_scenario(
                    payload.summary.as_deref().unwrap_or("Simulated thread"),
                    payload.level.unwrap_or(RiskLevel::Safe),
                    scenario_id,
                );
            } else {
                state.dashboard.record_thread_flagged(
                    &payload.platform,
                    payload.thread_id.as_deref(),
                    payload.level.unwrap_or(RiskLevel::Safe),
                    payload.summary.as_deref(),
                );
            }

            Ok(Json(IpcResponse {
                v: IPC_VERSION,
                message_type: "SESSION_EVENT".to_string(),
                payload: serde_json::json!({
                    "event": "sandbox_started",
                    "detail": "thread_context_updated"
                }),
                sent_at: iso_now(),
            }))
        }
        "EXTENSION_SNAPSHOT" => {
            let payload: ExtensionSnapshotPayload =
                serde_json::from_value(envelope.payload.clone()).map_err(|error| {
                    tracing::warn!("Invalid EXTENSION_SNAPSHOT payload: {error}");
                    StatusCode::BAD_REQUEST
                })?;

            match state.recovery.ingest_extension_snapshot(payload) {
                Ok(_) => {
                    let _ = state.app_handle.emit("recovery-updated", ());
                    Ok(Json(IpcResponse {
                        v: IPC_VERSION,
                        message_type: "SESSION_EVENT".to_string(),
                        payload: serde_json::json!({
                            "event": "sandbox_started",
                            "detail": "extension_snapshot_received"
                        }),
                        sent_at: iso_now(),
                    }))
                }
                Err(message) => {
                    tracing::warn!("Failed to store extension snapshot: {message}");
                    Err(StatusCode::INTERNAL_SERVER_ERROR)
                }
            }
        }
        "INCIDENT_SYNC" => {
            let entry: IncidentEntry =
                serde_json::from_value(envelope.payload.clone()).map_err(|error| {
                    tracing::warn!("Invalid INCIDENT_SYNC payload: {error}");
                    StatusCode::BAD_REQUEST
                })?;

            state.dashboard.ingest_incident(entry);

            Ok(Json(IpcResponse {
                v: IPC_VERSION,
                message_type: "SESSION_EVENT".to_string(),
                payload: serde_json::json!({
                    "event": "sandbox_started",
                    "detail": "incident_synced"
                }),
                sent_at: iso_now(),
            }))
        }
        _ => Err(StatusCode::NOT_IMPLEMENTED),
    }
}

fn build_quarantine_response(
    download_id: i64,
    status: &'static str,
    item: Option<&QuarantineItem>,
    message: Option<String>,
) -> IpcResponse {
    let payload = if let Some(item) = item {
        QuarantineStatusPayload {
            download_id,
            status,
            level: Some(risk_level_label(&item.level)),
            message,
            quarantine_id: Some(item.id.clone()),
            findings: item.findings.clone(),
        }
    } else {
        QuarantineStatusPayload {
            download_id,
            status,
            level: None,
            message,
            quarantine_id: None,
            findings: Vec::new(),
        }
    };

    IpcResponse {
        v: IPC_VERSION,
        message_type: "QUARANTINE_STATUS".to_string(),
        payload: serde_json::to_value(payload).unwrap_or(Value::Null),
        sent_at: iso_now(),
    }
}

fn risk_level_label(level: &RiskLevel) -> String {
    match level {
        RiskLevel::Safe => "safe".to_string(),
        RiskLevel::Caution => "caution".to_string(),
        RiskLevel::HighRisk => "high-risk".to_string(),
    }
}

fn iso_now() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let millis = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis())
        .unwrap_or(0);
    format!("{millis}")
}

fn chrono_now_ms() -> i64 {
    use std::time::{SystemTime, UNIX_EPOCH};
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as i64)
        .unwrap_or(0)
}
