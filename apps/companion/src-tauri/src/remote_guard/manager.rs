use std::collections::{HashSet, VecDeque};
use std::sync::{Arc, Mutex};

use uuid::Uuid;

use super::sensitive::foreground_window_title;
use super::types::{
    ActiveThreadContext, DetectedRemoteTool, RemoteAlertStatus, RemoteGuardState,
    RemoteSessionAlert, SensitiveAppWarning, ThreadContextPayload, SENSITIVE_APP_MARKERS,
};
use super::watch::{kill_processes_matching, scan_running_remote_tools};
use crate::quarantine::RiskLevel;

const THREAD_TTL_MS: i64 = 45 * 60 * 1000;

#[derive(Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PendingSessionEvent {
    pub event: &'static str,
    pub detail: String,
    pub session_id: String,
    pub platform: Option<String>,
    pub thread_id: Option<String>,
    pub level: Option<String>,
    pub rule_ids: Vec<String>,
}

#[derive(Default)]
struct GuardInner {
    active_thread: Option<ActiveThreadContext>,
    alert: Option<RemoteSessionAlert>,
    shield_active: bool,
    sensitive_warning: Option<SensitiveAppWarning>,
    approved_tools: HashSet<String>,
    running_tools: HashSet<String>,
    pending_events: VecDeque<PendingSessionEvent>,
}

#[derive(Clone)]
pub struct RemoteGuardManager {
    inner: Arc<Mutex<GuardInner>>,
}

pub enum GuardTickEvent {
    NewAlert(RemoteSessionAlert),
    SensitiveWarning(SensitiveAppWarning),
    AlertCleared,
}

impl RemoteGuardManager {
    pub fn new() -> Self {
        Self {
            inner: Arc::new(Mutex::new(GuardInner::default())),
        }
    }

    pub fn update_thread_context(&self, payload: ThreadContextPayload) {
        let mut inner = self.inner.lock().expect("remote guard poisoned");
        inner.active_thread = Some(ActiveThreadContext {
            platform: payload.platform,
            thread_id: payload.thread_id,
            sender_label: payload.sender_label,
            level: payload.level.unwrap_or(RiskLevel::Safe),
            rule_ids: payload.rule_ids.unwrap_or_default(),
            summary: payload.summary,
            updated_at: now_ms(),
        });
    }

    pub fn state(&self) -> RemoteGuardState {
        let inner = self.inner.lock().expect("remote guard poisoned");
        RemoteGuardState {
            active_thread: inner.active_thread.clone(),
            alert: inner.alert.clone(),
            shield_active: inner.shield_active,
            sensitive_warning: inner.sensitive_warning.clone(),
            running_remote_tools: inner.running_tools.iter().cloned().collect(),
        }
    }

    pub fn drain_pending_events(&self) -> Vec<PendingSessionEvent> {
        let mut inner = self.inner.lock().expect("remote guard poisoned");
        inner.pending_events.drain(..).collect()
    }

    pub fn respond(&self, alert_id: &str, action: &str) -> Result<RemoteGuardState, String> {
        let mut inner = self.inner.lock().expect("remote guard poisoned");
        let alert = inner
            .alert
            .as_ref()
            .ok_or("No remote session alert is active.")?;

        if alert.id != alert_id {
            return Err("Alert id does not match the active prompt.".into());
        }

        let tool_label = alert.tool_label.clone();
        let markers = alert.process_markers.clone();
        let thread = alert.thread_context.clone();

        match action {
            "end" => {
                let killed = kill_processes_matching(&markers);
                inner.shield_active = false;
                inner.sensitive_warning = None;
                inner.approved_tools.remove(&tool_label);
                inner.running_tools.remove(&tool_label);
                if let Some(alert) = inner.alert.as_mut() {
                    alert.status = RemoteAlertStatus::Ended;
                }
                inner.alert = None;
                queue_incident(
                    &mut inner,
                    &tool_label,
                    &format!("Remote session ended — closed {killed} process(es)."),
                    thread,
                );
            }
            "shield" => {
                inner.shield_active = true;
                inner.alert = None;
                queue_incident(
                    &mut inner,
                    &tool_label,
                    "Remote session continuing with sensitive-app shield.",
                    thread,
                );
            }
            "user_started" => {
                inner.approved_tools.insert(tool_label.clone());
                inner.shield_active = false;
                inner.sensitive_warning = None;
                if let Some(alert) = inner.alert.as_mut() {
                    alert.status = RemoteAlertStatus::Dismissed;
                }
                inner.alert = None;
            }
            _ => return Err("Unknown remote session response.".into()),
        }

        Ok(RemoteGuardState {
            active_thread: inner.active_thread.clone(),
            alert: inner.alert.clone(),
            shield_active: inner.shield_active,
            sensitive_warning: inner.sensitive_warning.clone(),
            running_remote_tools: inner.running_tools.iter().cloned().collect(),
        })
    }

    pub fn dismiss_sensitive_warning(&self) -> Result<(), String> {
        let mut inner = self.inner.lock().expect("remote guard poisoned");
        inner.sensitive_warning = None;
        Ok(())
    }

    pub fn tick(&self) -> Vec<GuardTickEvent> {
        let mut events = Vec::new();
        let detected = scan_running_remote_tools();
        let detected_labels: HashSet<String> = detected.iter().map(|tool| tool.label.clone()).collect();

        let mut inner = self.inner.lock().expect("remote guard poisoned");
        inner.running_tools = detected_labels.clone();

        for tool in detected {
            if inner.approved_tools.contains(&tool.label) {
                continue;
            }

            if inner.alert.as_ref().is_some_and(|alert| alert.tool_label == tool.label) {
                continue;
            }

            let correlated = inner
                .active_thread
                .as_ref()
                .is_some_and(|thread| thread_is_flagged(thread));

            if !correlated {
                continue;
            }

            let thread = inner.active_thread.clone();
            let message = build_alert_message(&tool, thread.as_ref());
            let alert = RemoteSessionAlert {
                id: Uuid::new_v4().to_string(),
                tool_label: tool.label.clone(),
                process_markers: tool.markers.clone(),
                detected_at: iso_now(),
                correlated,
                status: RemoteAlertStatus::Pending,
                thread_context: thread.clone(),
                message: message.clone(),
            };

            queue_incident(
                &mut inner,
                &tool.label,
                &message,
                thread,
            );

            inner.alert = Some(alert.clone());
            events.push(GuardTickEvent::NewAlert(alert));
        }

        for label in inner.approved_tools.clone() {
            if !detected_labels.contains(&label) {
                inner.approved_tools.remove(&label);
            }
        }

        if inner.shield_active && inner.alert.is_none() {
            if let Some(title) = foreground_window_title() {
                let lower = title.to_lowercase();
                if let Some((label, _)) = SENSITIVE_APP_MARKERS
                    .iter()
                    .find(|(_, marker)| lower.contains(marker))
                {
                    let already = inner
                        .sensitive_warning
                        .as_ref()
                        .is_some_and(|warning| warning.window_title == title);

                    if !already {
                        let warning = SensitiveAppWarning {
                            window_title: title.clone(),
                            matched_label: (*label).to_string(),
                            warned_at: iso_now(),
                        };
                        inner.sensitive_warning = Some(warning.clone());
                        events.push(GuardTickEvent::SensitiveWarning(warning));
                    }
                }
            }
        }

        events
    }
}

fn thread_is_flagged(thread: &ActiveThreadContext) -> bool {
    if now_ms() - thread.updated_at > THREAD_TTL_MS {
        return false;
    }

    thread.level != RiskLevel::Safe
        || thread.rule_ids.iter().any(|rule| rule == "R04")
}

fn build_alert_message(tool: &DetectedRemoteTool, thread: Option<&ActiveThreadContext>) -> String {
    match thread {
        Some(ctx) => format!(
            "{} is running while you have a flagged {} conversation open. Someone may be trying to control your screen.",
            tool.label, ctx.platform
        ),
        None => format!(
            "{} is running on your PC during a flagged job thread.",
            tool.label
        ),
    }
}

fn queue_incident(
    inner: &mut GuardInner,
    tool_label: &str,
    detail: &str,
    thread: Option<ActiveThreadContext>,
) {
    let (platform, thread_id, level, rule_ids) = match thread {
        Some(ctx) => (
            Some(ctx.platform),
            ctx.thread_id,
            Some(risk_level_label(ctx.level)),
            ctx.rule_ids,
        ),
        None => (None, None, Some("caution".to_string()), vec!["R04".to_string()]),
    };

    inner.pending_events.push_back(PendingSessionEvent {
        event: "remote_session_detected",
        detail: format!("{tool_label}: {detail}"),
        session_id: Uuid::new_v4().to_string(),
        platform,
        thread_id,
        level,
        rule_ids,
    });
}

fn risk_level_label(level: RiskLevel) -> String {
    match level {
        RiskLevel::Safe => "safe".to_string(),
        RiskLevel::Caution => "caution".to_string(),
        RiskLevel::HighRisk => "high-risk".to_string(),
    }
}

fn now_ms() -> i64 {
    use std::time::{SystemTime, UNIX_EPOCH};
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_millis() as i64)
        .unwrap_or(0)
}

fn iso_now() -> String {
    format!("{}", now_ms())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn flagged_thread_requires_recent_update() {
        let thread = ActiveThreadContext {
            platform: "gmail".into(),
            thread_id: Some("t1".into()),
            sender_label: None,
            level: RiskLevel::Caution,
            rule_ids: vec![],
            summary: None,
            updated_at: now_ms(),
        };
        assert!(thread_is_flagged(&thread));
    }

    #[test]
    fn stale_thread_is_not_flagged() {
        let thread = ActiveThreadContext {
            platform: "gmail".into(),
            thread_id: Some("t1".into()),
            sender_label: None,
            level: RiskLevel::HighRisk,
            rule_ids: vec![],
            summary: None,
            updated_at: now_ms() - THREAD_TTL_MS - 1,
        };
        assert!(!thread_is_flagged(&thread));
    }
}
