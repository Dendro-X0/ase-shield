use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "kebab-case")]
pub enum RiskLevel {
    Safe,
    Caution,
    #[serde(rename = "high-risk")]
    HighRisk,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum QuarantineStatus {
    Scanning,
    Ready,
    Deferred,
    Error,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct QuarantineItem {
    pub id: String,
    pub download_id: Option<i64>,
    pub filename: String,
    pub quarantine_path: String,
    pub source_url: Option<String>,
    pub thread_id: Option<String>,
    pub sha256: Option<String>,
    pub status: QuarantineStatus,
    pub level: RiskLevel,
    pub findings: Vec<String>,
    pub received_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScanResult {
    pub level: RiskLevel,
    pub findings: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DownloadQueuedPayload {
    pub download_id: i64,
    pub filename: String,
    pub url: Option<String>,
    pub sha256: Option<String>,
    pub thread_id: Option<String>,
    pub source_path: Option<String>,
}
