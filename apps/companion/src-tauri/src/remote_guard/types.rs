use serde::{Deserialize, Serialize};

use crate::quarantine::RiskLevel;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ActiveThreadContext {
    pub platform: String,
    pub thread_id: Option<String>,
    pub sender_label: Option<String>,
    pub level: RiskLevel,
    pub rule_ids: Vec<String>,
    pub summary: Option<String>,
    pub updated_at: i64,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum RemoteAlertStatus {
    Pending,
    ShieldActive,
    Dismissed,
    Ended,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RemoteSessionAlert {
    pub id: String,
    pub tool_label: String,
    pub process_markers: Vec<String>,
    pub detected_at: String,
    pub correlated: bool,
    pub status: RemoteAlertStatus,
    pub thread_context: Option<ActiveThreadContext>,
    pub message: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SensitiveAppWarning {
    pub window_title: String,
    pub matched_label: String,
    pub warned_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RemoteGuardState {
    pub active_thread: Option<ActiveThreadContext>,
    pub alert: Option<RemoteSessionAlert>,
    pub shield_active: bool,
    pub sensitive_warning: Option<SensitiveAppWarning>,
    pub running_remote_tools: Vec<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ThreadContextPayload {
    pub platform: String,
    pub thread_id: Option<String>,
    pub sender_label: Option<String>,
    pub level: Option<RiskLevel>,
    pub rule_ids: Option<Vec<String>>,
    pub summary: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RemoteAlertResponse {
    pub alert_id: String,
    pub action: String,
}

pub struct DetectedRemoteTool {
    pub label: String,
    pub markers: Vec<String>,
}

pub struct RemoteToolDef {
    pub label: &'static str,
    pub process_markers: &'static [&'static str],
}

pub const REMOTE_TOOLS: &[RemoteToolDef] = &[
    RemoteToolDef {
        label: "AnyDesk",
        process_markers: &["anydesk"],
    },
    RemoteToolDef {
        label: "TeamViewer",
        process_markers: &["teamviewer"],
    },
    RemoteToolDef {
        label: "RustDesk",
        process_markers: &["rustdesk"],
    },
    RemoteToolDef {
        label: "Quick Assist",
        process_markers: &["quickassist", "msra"],
    },
    RemoteToolDef {
        label: "UltraViewer",
        process_markers: &["ultraviewer"],
    },
    RemoteToolDef {
        label: "LogMeIn",
        process_markers: &["logmein"],
    },
    RemoteToolDef {
        label: "ScreenConnect",
        process_markers: &["screenconnect"],
    },
    RemoteToolDef {
        label: "Supremo",
        process_markers: &["supremo"],
    },
    RemoteToolDef {
        label: "Remote Desktop",
        process_markers: &["mstsc"],
    },
];

pub const SENSITIVE_APP_MARKERS: &[(&str, &str)] = &[
    ("1Password", "1password"),
    ("Bitwarden", "bitwarden"),
    ("LastPass", "lastpass"),
    ("Dashlane", "dashlane"),
    ("KeePass", "keepass"),
    ("Password manager", "password"),
    ("Online banking", "bank"),
    ("PayPal", "paypal"),
    ("Chase", "chase"),
    ("Capital One", "capital one"),
];
