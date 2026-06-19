use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RecoveryChecklist {
    pub rotate_passwords: bool,
    pub revoke_oauth: bool,
    pub verify_payout: bool,
    pub reviewed_extensions: bool,
    pub reviewed_startup: bool,
}

impl Default for RecoveryChecklist {
    fn default() -> Self {
        Self {
            rotate_passwords: false,
            revoke_oauth: false,
            verify_payout: false,
            reviewed_extensions: false,
            reviewed_startup: false,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StartupEntry {
    pub id: String,
    pub source: String,
    pub name: String,
    pub command: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ScheduledTaskEntry {
    pub id: String,
    pub name: String,
    pub path: String,
    pub state: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BrowserExtensionEntry {
    pub id: String,
    pub name: String,
    pub version: Option<String>,
    pub enabled: bool,
    pub install_type: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExposureSnapshot {
    pub captured_at: String,
    pub startup_entries: Vec<StartupEntry>,
    pub scheduled_tasks: Vec<ScheduledTaskEntry>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExposureDiffItem {
    pub id: String,
    pub kind: String,
    pub label: String,
    pub detail: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExposureDiff {
    pub scanned_at: String,
    pub new_startup_entries: Vec<ExposureDiffItem>,
    pub new_scheduled_tasks: Vec<ExposureDiffItem>,
    pub suspicious_extensions: Vec<BrowserExtensionEntry>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RecoveryWizardState {
    pub active: bool,
    pub step: u8,
    pub started_at: Option<String>,
    pub checklist: RecoveryChecklist,
    pub baseline: Option<ExposureSnapshot>,
    pub latest_diff: Option<ExposureDiff>,
    pub browser_extensions: Vec<BrowserExtensionEntry>,
    pub last_undo_summary: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UndoResult {
    pub removed: Vec<String>,
    pub failed: Vec<String>,
    pub summary: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportRecoveryReportResult {
    pub html_path: String,
    pub pdf_path: String,
    pub message: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateRecoveryChecklistPayload {
    pub checklist: RecoveryChecklist,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UndoExposurePayload {
    pub item_ids: Vec<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExtensionSnapshotPayload {
    pub extensions: Vec<BrowserExtensionEntry>,
}
