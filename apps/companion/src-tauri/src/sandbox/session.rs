use std::path::Path;
use std::sync::{Arc, Mutex};

use uuid::Uuid;

use super::detect::get_capabilities;
use super::preview::{build_document_preview, build_restricted_preview};
use super::router::route_tier;
use super::tier2::launch_item_in_windows_sandbox;
use super::types::{
    OpenSafelyResult, SandboxSessionView, SandboxTier, SessionEndSummary, SessionPreview,
};
use crate::quarantine::QuarantineItem;

#[derive(Clone)]
pub struct SessionManager {
    inner: Arc<Mutex<Option<SandboxSessionView>>>,
}

impl SessionManager {
    pub fn new() -> Self {
        Self {
            inner: Arc::new(Mutex::new(None)),
        }
    }

    pub fn active(&self) -> Option<SandboxSessionView> {
        self.inner.lock().expect("session poisoned").clone()
    }

    pub fn end(&self, session_id: &str) -> Result<SessionEndSummary, String> {
        let mut guard = self.inner.lock().expect("session poisoned");
        let session = guard
            .as_ref()
            .ok_or("No active Safe Workspace session.")?;

        if session.id != session_id {
            return Err("Session id does not match the active Safe Workspace.".into());
        }

        let summary = build_end_summary(session);
        *guard = None;
        Ok(summary)
    }

    pub fn open_safely(&self, item: &QuarantineItem) -> Result<(SandboxSessionView, OpenSafelyResult), String> {
        let caps = get_capabilities();
        let file_path = Path::new(&item.quarantine_path);
        if !file_path.exists() {
            return Err("Quarantined file is missing on disk.".into());
        }

        let mut tier = route_tier(&item.filename, item.level);
        let mut used_fallback = false;
        let (preview, message) = match tier {
            SandboxTier::Tier2 if caps.windows_sandbox_available => {
                let item_dir = file_path
                    .parent()
                    .ok_or("Quarantine file has no parent folder.")?;
                launch_item_in_windows_sandbox(item_dir, &item.filename)?;
                let preview = SessionPreview::ExternalVm {
                    note: "Windows Sandbox started with networking disabled. The disposable VM is destroyed when you close it.".to_string(),
                };
                let message = format!(
                    "{} opened inside Windows Sandbox. Nothing from the VM is saved to your PC.",
                    item.filename
                );
                (preview, message)
            }
            SandboxTier::Tier2 => {
                used_fallback = true;
                tier = SandboxTier::Tier1;
                let preview = build_restricted_preview(file_path, &item.filename)?;
                let message = format!(
                    "Full isolation needs Windows Sandbox (Windows Pro, feature enabled). Opening {} with limited protection instead.",
                    item.filename
                );
                (preview, message)
            }
            SandboxTier::Tier3 => {
                let preview = build_document_preview(file_path, &item.filename)?;
                let message = format!(
                    "This document can contain automatic scripts. Showing a safe preview of {} — host Office macros are not run.",
                    item.filename
                );
                (preview, message)
            }
            SandboxTier::Tier1 => {
                let preview = build_restricted_preview(file_path, &item.filename)?;
                let message = format!(
                    "{} opened in Safe Workspace. Outbound network is not blocked on the host for this preview.",
                    item.filename
                );
                (preview, message)
            }
        };

        let network_policy = match tier {
            SandboxTier::Tier2 if !used_fallback => "disabled-vm",
            _ => "host-preview",
        }
        .to_string();

        let session = SandboxSessionView {
            id: Uuid::new_v4().to_string(),
            quarantine_id: item.id.clone(),
            filename: item.filename.clone(),
            tier: tier.as_str().to_string(),
            tier_label: tier.label().to_string(),
            started_at: iso_now(),
            message: message.clone(),
            used_fallback,
            network_policy: network_policy.clone(),
            preview,
        };

        let result = OpenSafelyResult {
            session_id: session.id.clone(),
            tier: session.tier.clone(),
            tier_label: session.tier_label.clone(),
            status: "started".to_string(),
            message,
            used_fallback,
            network_policy,
        };

        *self.inner.lock().expect("session poisoned") = Some(session.clone());
        Ok((session, result))
    }
}

pub fn open_normally(path: &Path) -> Result<(), String> {
    if !path.exists() {
        return Err("Quarantined file is missing on disk.".into());
    }

    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        use std::process::Command;

        const CREATE_NO_WINDOW: u32 = 0x0800_0000;
        let path_str = path.to_string_lossy().to_string();

        Command::new("cmd")
            .args(["/C", "start", "", &path_str])
            .creation_flags(CREATE_NO_WINDOW)
            .spawn()
            .map_err(|error| format!("Could not open file on host: {error}"))?;
        Ok(())
    }

    #[cfg(not(windows))]
    {
        Err("Open normally is only supported on Windows.".into())
    }
}

fn build_end_summary(session: &SandboxSessionView) -> SessionEndSummary {
    let summary = match session.tier.as_str() {
        "tier2" if !session.used_fallback => {
            "Isolated Windows Sandbox was destroyed; nothing remains on your PC.".to_string()
        }
        "tier3" => {
            "Safe document preview ended. No files were saved to your PC.".to_string()
        }
        _ => {
            "Safe Workspace ended. No files were saved to your PC.".to_string()
        }
    };

    SessionEndSummary {
        session_id: session.id.clone(),
        summary,
        exported_files: Vec::new(),
    }
}

fn iso_now() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let millis = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_millis())
        .unwrap_or(0);
    format!("{millis}")
}

#[cfg(test)]
mod tests {
    use super::build_end_summary;
    use crate::sandbox::types::{SandboxSessionView, SessionPreview};

    #[test]
    fn tier2_summary_mentions_vm_destroyed() {
        let session = SandboxSessionView {
            id: "s".into(),
            quarantine_id: "q".into(),
            filename: "test.exe".into(),
            tier: "tier2".into(),
            tier_label: "Windows Sandbox".into(),
            started_at: "0".into(),
            message: "ok".into(),
            used_fallback: false,
            network_policy: "disabled-vm".into(),
            preview: SessionPreview::ExternalVm { note: "x".into() },
        };

        let summary = build_end_summary(&session);
        assert!(summary.summary.contains("destroyed"));
    }
}
