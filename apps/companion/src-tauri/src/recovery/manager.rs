use std::fs;
use std::path::PathBuf;
use std::sync::{Arc, Mutex};

use super::diff::{allowed_undo_ids, diff_exposure};
use super::report::export_recovery_report;
use super::snapshot::{capture_exposure_snapshot, open_path, undo_item};
use super::types::{
    ExportRecoveryReportResult, ExtensionSnapshotPayload, RecoveryChecklist,
    RecoveryWizardState, UndoExposurePayload,
};

#[derive(Clone)]
pub struct RecoveryManager {
    inner: Arc<Mutex<RecoveryInner>>,
}

struct RecoveryInner {
    data_dir: PathBuf,
    state: RecoveryWizardState,
    extension_snapshot_requested: bool,
}

impl RecoveryManager {
    pub fn new() -> Self {
        let data_dir = default_recovery_dir();
        let state = load_state(&data_dir).unwrap_or_default();
        Self {
            inner: Arc::new(Mutex::new(RecoveryInner {
                data_dir,
                state,
                extension_snapshot_requested: false,
            })),
        }
    }

    pub fn get_state(&self) -> RecoveryWizardState {
        self.inner.lock().expect("recovery poisoned").state.clone()
    }

    pub fn start_wizard(&self) -> Result<RecoveryWizardState, String> {
        let mut inner = self.inner.lock().expect("recovery poisoned");
        let baseline = capture_exposure_snapshot()?;
        inner.state = RecoveryWizardState {
            active: true,
            step: 0,
            started_at: Some(iso_now()),
            checklist: RecoveryChecklist::default(),
            baseline: Some(baseline),
            latest_diff: None,
            browser_extensions: inner.state.browser_extensions.clone(),
            last_undo_summary: None,
        };
        save_state(&inner.data_dir, &inner.state)?;
        Ok(inner.state.clone())
    }

    pub fn set_step(&self, step: u8) -> Result<RecoveryWizardState, String> {
        let mut inner = self.inner.lock().expect("recovery poisoned");
        if !inner.state.active {
            return Err("Recovery wizard is not active.".into());
        }
        inner.state.step = step.min(4);
        save_state(&inner.data_dir, &inner.state)?;
        Ok(inner.state.clone())
    }

    pub fn update_checklist(&self, checklist: RecoveryChecklist) -> Result<RecoveryWizardState, String> {
        let mut inner = self.inner.lock().expect("recovery poisoned");
        inner.state.checklist = checklist;
        save_state(&inner.data_dir, &inner.state)?;
        Ok(inner.state.clone())
    }

    pub fn refresh_exposure_diff(&self) -> Result<RecoveryWizardState, String> {
        let mut inner = self.inner.lock().expect("recovery poisoned");
        let baseline = inner
            .state
            .baseline
            .clone()
            .ok_or("Capture a baseline by starting the recovery wizard first.")?;
        let current = capture_exposure_snapshot()?;
        let diff = diff_exposure(&baseline, &current, &inner.state.browser_extensions);
        inner.state.latest_diff = Some(diff);
        save_state(&inner.data_dir, &inner.state)?;
        Ok(inner.state.clone())
    }

    pub fn request_extension_snapshot(&self) -> bool {
        let mut inner = self.inner.lock().expect("recovery poisoned");
        inner.extension_snapshot_requested = true;
        true
    }

    pub fn take_extension_snapshot_request(&self) -> bool {
        let mut inner = self.inner.lock().expect("recovery poisoned");
        let requested = inner.extension_snapshot_requested;
        inner.extension_snapshot_requested = false;
        requested
    }

    pub fn ingest_extension_snapshot(
        &self,
        payload: ExtensionSnapshotPayload,
    ) -> Result<RecoveryWizardState, String> {
        let mut inner = self.inner.lock().expect("recovery poisoned");
        inner.state.browser_extensions = payload.extensions;
        if let Some(baseline) = inner.state.baseline.clone() {
            let current = capture_exposure_snapshot().unwrap_or(baseline.clone());
            inner.state.latest_diff = Some(diff_exposure(
                &baseline,
                &current,
                &inner.state.browser_extensions,
            ));
        }
        save_state(&inner.data_dir, &inner.state)?;
        Ok(inner.state.clone())
    }

    pub fn undo_exposure_items(&self, payload: UndoExposurePayload) -> Result<RecoveryWizardState, String> {
        let mut inner = self.inner.lock().expect("recovery poisoned");
        let allowed = inner
            .state
            .latest_diff
            .as_ref()
            .map(allowed_undo_ids)
            .unwrap_or_default();

        let mut removed = Vec::new();
        let mut failed = Vec::new();

        for item_id in payload.item_ids {
            if !allowed.contains(&item_id) {
                failed.push(format!("{item_id} (not in approved diff)"));
                continue;
            }
            match undo_item(&item_id) {
                Ok(()) => removed.push(item_id),
                Err(error) => failed.push(format!("{item_id} ({error})")),
            }
        }

        let summary = if removed.is_empty() && failed.is_empty() {
            "No items selected.".to_string()
        } else {
            format!(
                "Removed {} item(s). {} failed.",
                removed.len(),
                failed.len()
            )
        };

        inner.state.last_undo_summary = Some(summary.clone());
        if inner.state.baseline.is_some() {
            if let Ok(current) = capture_exposure_snapshot() {
                if let Some(baseline) = inner.state.baseline.clone() {
                    inner.state.latest_diff = Some(diff_exposure(
                        &baseline,
                        &current,
                        &inner.state.browser_extensions,
                    ));
                }
            }
        }
        save_state(&inner.data_dir, &inner.state)?;

        if !failed.is_empty() {
            return Err(format!("Undo completed with errors: {}", failed.join("; ")));
        }

        Ok(inner.state.clone())
    }

    pub fn export_report(&self) -> Result<ExportRecoveryReportResult, String> {
        let inner = self.inner.lock().expect("recovery poisoned");
        let diff = inner.state.latest_diff.clone();
        let (html_path, pdf_path) = export_recovery_report(&inner.state, diff.as_ref())?;
        open_path(pdf_path.to_string_lossy().as_ref())?;
        Ok(ExportRecoveryReportResult {
            html_path: html_path.to_string_lossy().to_string(),
            pdf_path: pdf_path.to_string_lossy().to_string(),
            message: "Recovery report saved and opened in your PDF viewer.".to_string(),
        })
    }

    pub fn close_wizard(&self) -> Result<RecoveryWizardState, String> {
        let mut inner = self.inner.lock().expect("recovery poisoned");
        inner.state.active = false;
        save_state(&inner.data_dir, &inner.state)?;
        Ok(inner.state.clone())
    }
}

impl Default for RecoveryWizardState {
    fn default() -> Self {
        Self {
            active: false,
            step: 0,
            started_at: None,
            checklist: RecoveryChecklist::default(),
            baseline: None,
            latest_diff: None,
            browser_extensions: Vec::new(),
            last_undo_summary: None,
        }
    }
}

pub fn default_recovery_dir() -> PathBuf {
    dirs::data_local_dir()
        .unwrap_or_else(std::env::temp_dir)
        .join("Anti-SE Companion")
        .join("recovery")
}

fn state_file(dir: &PathBuf) -> PathBuf {
    dir.join("wizard-state.json")
}

fn load_state(dir: &PathBuf) -> Result<RecoveryWizardState, String> {
    let path = state_file(dir);
    if !path.exists() {
        return Ok(RecoveryWizardState::default());
    }
    let raw = fs::read_to_string(path).map_err(|error| error.to_string())?;
    serde_json::from_str(&raw).map_err(|error| error.to_string())
}

fn save_state(dir: &PathBuf, state: &RecoveryWizardState) -> Result<(), String> {
    fs::create_dir_all(dir).map_err(|error| error.to_string())?;
    let serialized = serde_json::to_string_pretty(state).map_err(|error| error.to_string())?;
    fs::write(state_file(dir), serialized).map_err(|error| error.to_string())
}

fn iso_now() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let millis = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_millis())
        .unwrap_or(0);
    format!("{millis}")
}
