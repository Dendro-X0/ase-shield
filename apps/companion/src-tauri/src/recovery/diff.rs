use std::collections::HashSet;

use super::types::{
    BrowserExtensionEntry, ExposureDiff, ExposureDiffItem, ExposureSnapshot, StartupEntry,
    ScheduledTaskEntry,
};

const SUSPICIOUS_EXTENSION_MARKERS: &[&str] = &[
    "wallet",
    "crypto",
    "remote",
    "anydesk",
    "password",
    "vpn proxy",
];

pub fn diff_exposure(
    baseline: &ExposureSnapshot,
    current: &ExposureSnapshot,
    extensions: &[BrowserExtensionEntry],
) -> ExposureDiff {
    let baseline_startup: HashSet<String> = baseline
        .startup_entries
        .iter()
        .map(|entry| entry.id.clone())
        .collect();
    let baseline_tasks: HashSet<String> = baseline
        .scheduled_tasks
        .iter()
        .map(|entry| entry.id.clone())
        .collect();

    let new_startup_entries = current
        .startup_entries
        .iter()
        .filter(|entry| !baseline_startup.contains(&entry.id))
        .map(startup_to_diff_item)
        .collect();

    let new_scheduled_tasks = current
        .scheduled_tasks
        .iter()
        .filter(|entry| !baseline_tasks.contains(&entry.id))
        .map(task_to_diff_item)
        .collect();

    let suspicious_extensions = extensions
        .iter()
        .filter(|ext| ext.enabled && looks_suspicious_extension(ext))
        .cloned()
        .collect();

    ExposureDiff {
        scanned_at: current.captured_at.clone(),
        new_startup_entries,
        new_scheduled_tasks,
        suspicious_extensions,
    }
}

fn startup_to_diff_item(entry: &StartupEntry) -> ExposureDiffItem {
    ExposureDiffItem {
        id: entry.id.clone(),
        kind: "startup".to_string(),
        label: entry.name.clone(),
        detail: entry.command.clone(),
    }
}

fn task_to_diff_item(entry: &ScheduledTaskEntry) -> ExposureDiffItem {
    ExposureDiffItem {
        id: entry.id.clone(),
        kind: "scheduled-task".to_string(),
        label: entry.name.clone(),
        detail: format!("{}{}", entry.path, entry.state),
    }
}

fn looks_suspicious_extension(entry: &BrowserExtensionEntry) -> bool {
    if entry.install_type.as_deref() == Some("development") {
        return true;
    }

    let name = entry.name.to_lowercase();
    SUSPICIOUS_EXTENSION_MARKERS
        .iter()
        .any(|marker| name.contains(marker))
}

pub fn merge_diff_items(diff: &ExposureDiff) -> Vec<ExposureDiffItem> {
    let mut items = diff.new_startup_entries.clone();
    items.extend(diff.new_scheduled_tasks.clone());
    items
}

pub fn allowed_undo_ids(diff: &ExposureDiff) -> HashSet<String> {
    merge_diff_items(diff)
        .into_iter()
        .map(|item| item.id)
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn detects_new_startup_entry() {
        let baseline = ExposureSnapshot {
            captured_at: "t0".into(),
            startup_entries: vec![StartupEntry {
                id: "run-hkcu:One".into(),
                source: "run-hkcu".into(),
                name: "One".into(),
                command: "one.exe".into(),
            }],
            scheduled_tasks: vec![],
        };
        let current = ExposureSnapshot {
            captured_at: "t1".into(),
            startup_entries: vec![
                StartupEntry {
                    id: "run-hkcu:One".into(),
                    source: "run-hkcu".into(),
                    name: "One".into(),
                    command: "one.exe".into(),
                },
                StartupEntry {
                    id: "run-hkcu:Two".into(),
                    source: "run-hkcu".into(),
                    name: "Two".into(),
                    command: "two.exe".into(),
                },
            ],
            scheduled_tasks: vec![],
        };

        let diff = diff_exposure(&baseline, &current, &[]);
        assert_eq!(diff.new_startup_entries.len(), 1);
        assert_eq!(diff.new_startup_entries[0].label, "Two");
    }
}
