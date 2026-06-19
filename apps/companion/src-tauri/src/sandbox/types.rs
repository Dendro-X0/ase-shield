use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum SandboxTier {
    Tier1,
    Tier2,
    Tier3,
}

impl SandboxTier {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Tier1 => "tier1",
            Self::Tier2 => "tier2",
            Self::Tier3 => "tier3",
        }
    }

    pub fn label(self) -> &'static str {
        match self {
            Self::Tier1 => "Restricted viewer",
            Self::Tier2 => "Windows Sandbox",
            Self::Tier3 => "Document preview",
        }
    }

    pub fn bump(self) -> Self {
        match self {
            Self::Tier1 => Self::Tier3,
            Self::Tier2 => Self::Tier2,
            Self::Tier3 => Self::Tier2,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SandboxCapabilities {
    pub windows_sandbox_available: bool,
    pub windows_sandbox_state: String,
    pub platform: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OpenSafelyResult {
    pub session_id: String,
    pub tier: String,
    pub tier_label: String,
    pub status: String,
    pub message: String,
    pub used_fallback: bool,
    pub network_policy: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "kind", rename_all = "camelCase")]
pub enum SessionPreview {
    Text { content: String },
    Image { mime_type: String, data_base64: String },
    Pdf { data_base64: String },
    ArchiveListing { entries: Vec<String> },
    DocumentBlocked { reason: String },
    ExternalVm { note: String },
    Unsupported { note: String },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SandboxSessionView {
    pub id: String,
    pub quarantine_id: String,
    pub filename: String,
    pub tier: String,
    pub tier_label: String,
    pub started_at: String,
    pub message: String,
    pub used_fallback: bool,
    pub network_policy: String,
    pub preview: SessionPreview,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SessionEndSummary {
    pub session_id: String,
    pub summary: String,
    pub exported_files: Vec<String>,
}
