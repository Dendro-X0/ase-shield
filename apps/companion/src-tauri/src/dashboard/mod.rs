mod api;
mod export;
mod static_files;

pub use api::mount_api_routes;
pub use static_files::serve_dashboard;

use std::collections::VecDeque;
use std::sync::{Arc, Mutex};

use serde::Serialize;
use uuid::Uuid;

use crate::quarantine::{QuarantineItem, RiskLevel};

const MAX_ACTIVITIES: usize = 100;
const MAX_INCIDENTS: usize = 50;
pub const PRACTICE_THREAD_ID: &str = "ase-practice-mode";
pub const DEV_LAB_THREAD_PREFIX: &str = "ase-dev-lab-";
pub const DEV_LAB_PAGE_PATH: &str = "src/dev-lab/dev-lab.html";

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ActivityEntry {
    pub id: String,
    pub kind: &'static str,
    pub title: String,
    pub detail: Option<String>,
    pub platform: Option<String>,
    pub thread_id: Option<String>,
    pub level: Option<String>,
    pub recorded_at: String,
}

#[derive(Clone, Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct IncidentEntry {
    pub id: String,
    pub platform: String,
    pub thread_id: Option<String>,
    pub level: String,
    pub rule_ids: Vec<String>,
    pub summary: String,
    pub recorded_at: String,
}

#[derive(Default)]
struct DashboardInner {
    activities: VecDeque<ActivityEntry>,
    incidents: VecDeque<IncidentEntry>,
    practice_scan_completed: bool,
}

#[derive(Clone)]
pub struct DashboardStore {
    inner: Arc<Mutex<DashboardInner>>,
}

impl DashboardStore {
    pub fn new() -> Self {
        Self {
            inner: Arc::new(Mutex::new(DashboardInner::default())),
        }
    }

    pub fn record_lab_scenario(&self, title: &str, level: RiskLevel, scenario_id: &str) {
        let level_label = risk_level_label(level);
        self.push_activity(ActivityEntry {
            id: Uuid::new_v4().to_string(),
            kind: "lab_scenario",
            title: format!("Dev lab: {title}"),
            detail: Some(format!("Scenario {scenario_id} — simulated fraud thread (no real data).")),
            platform: Some("dev-lab".to_string()),
            thread_id: Some(format!("{DEV_LAB_THREAD_PREFIX}{scenario_id}")),
            level: Some(level_label),
            recorded_at: iso_now(),
        });
    }

    pub fn record_practice_scan(&self, level: RiskLevel, summary: Option<&str>) {
        let level_label = risk_level_label(level);
        let title = summary
            .map(str::to_string)
            .unwrap_or_else(|| "Practice scan — fake hiring scam detected".to_string());

        let detail = "Safe demo only: remote access + off-platform payment patterns (AnyDesk, wallet redirect). On real LinkedIn or Gmail, the same badge appears on live threads.";

        self.push_activity(ActivityEntry {
            id: Uuid::new_v4().to_string(),
            kind: "practice",
            title,
            detail: Some(detail.to_string()),
            platform: Some("practice".to_string()),
            thread_id: Some(PRACTICE_THREAD_ID.to_string()),
            level: Some(level_label),
            recorded_at: iso_now(),
        });

        let mut inner = self.inner.lock().expect("dashboard poisoned");
        inner.practice_scan_completed = true;
    }

    pub fn has_practice_scan(&self) -> bool {
        self.inner
            .lock()
            .expect("dashboard poisoned")
            .practice_scan_completed
    }

    pub fn record_thread_flagged(
        &self,
        platform: &str,
        thread_id: Option<&str>,
        level: RiskLevel,
        summary: Option<&str>,
    ) {
        if level == RiskLevel::Safe {
            return;
        }

        let level_label = risk_level_label(level);
        let title = summary
            .map(str::to_string)
            .unwrap_or_else(|| format!("Flagged conversation on {platform}"));

        self.push_activity(ActivityEntry {
            id: Uuid::new_v4().to_string(),
            kind: "thread_flagged",
            title,
            detail: Some(format!("Risk level: {level_label}")),
            platform: Some(platform.to_string()),
            thread_id: thread_id.map(str::to_string),
            level: Some(level_label),
            recorded_at: iso_now(),
        });
    }

    pub fn record_quarantine(&self, item: &QuarantineItem) {
        self.push_activity(ActivityEntry {
            id: Uuid::new_v4().to_string(),
            kind: "download_quarantined",
            title: format!("Download quarantined: {}", item.filename),
            detail: item.findings.first().cloned(),
            platform: None,
            thread_id: item.thread_id.clone(),
            level: Some(risk_level_label(item.level)),
            recorded_at: item.received_at.clone(),
        });
    }

    pub fn record_remote_session(
        &self,
        detail: &str,
        platform: Option<String>,
        thread_id: Option<String>,
        level: Option<String>,
    ) {
        self.push_activity(ActivityEntry {
            id: Uuid::new_v4().to_string(),
            kind: "remote_session",
            title: "Remote access tool detected".to_string(),
            detail: Some(detail.to_string()),
            platform,
            thread_id,
            level,
            recorded_at: iso_now(),
        });
    }

    pub fn ingest_incident(&self, entry: IncidentEntry) {
        let activity = ActivityEntry {
            id: entry.id.clone(),
            kind: "incident",
            title: entry.summary.clone(),
            detail: Some(entry.rule_ids.join(", ")),
            platform: Some(entry.platform.clone()),
            thread_id: entry.thread_id.clone(),
            level: Some(entry.level.clone()),
            recorded_at: entry.recorded_at.clone(),
        };

        let mut inner = self.inner.lock().expect("dashboard poisoned");
        inner.incidents.retain(|item| item.id != entry.id);
        inner.incidents.push_front(entry);
        while inner.incidents.len() > MAX_INCIDENTS {
            inner.incidents.pop_back();
        }

        inner.activities.retain(|item| item.id != activity.id);
        inner.activities.push_front(activity);
        while inner.activities.len() > MAX_ACTIVITIES {
            inner.activities.pop_back();
        }
    }

    pub fn list_activities(&self) -> Vec<ActivityEntry> {
        self.inner
            .lock()
            .expect("dashboard poisoned")
            .activities
            .iter()
            .cloned()
            .collect()
    }

    pub fn list_incidents(&self) -> Vec<IncidentEntry> {
        self.inner
            .lock()
            .expect("dashboard poisoned")
            .incidents
            .iter()
            .cloned()
            .collect()
    }

    fn push_activity(&self, entry: ActivityEntry) {
        let mut inner = self.inner.lock().expect("dashboard poisoned");
        inner.activities.push_front(entry);
        while inner.activities.len() > MAX_ACTIVITIES {
            inner.activities.pop_back();
        }
    }
}

fn risk_level_label(level: RiskLevel) -> String {
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
