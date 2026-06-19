use sysinfo::{ProcessRefreshKind, RefreshKind, System};

use super::types::{DetectedRemoteTool, RemoteToolDef, REMOTE_TOOLS};

pub fn scan_running_remote_tools() -> Vec<DetectedRemoteTool> {
    let mut system = System::new_with_specifics(
        RefreshKind::nothing().with_processes(ProcessRefreshKind::everything()),
    );
    system.refresh_processes(sysinfo::ProcessesToUpdate::All, true);

    let mut found = Vec::new();

    for tool in REMOTE_TOOLS {
        if process_running(&system, tool) {
            found.push(DetectedRemoteTool {
                label: tool.label.to_string(),
                markers: tool
                    .process_markers
                    .iter()
                    .map(|marker| (*marker).to_string())
                    .collect(),
            });
        }
    }

    found
}

fn process_running(system: &System, tool: &RemoteToolDef) -> bool {
    system.processes().values().any(|process| {
        let name = process.name().to_string_lossy().to_lowercase();
        tool.process_markers
            .iter()
            .any(|marker| name.contains(marker))
    })
}

pub fn kill_processes_matching(markers: &[String]) -> u32 {
    let mut system = System::new_with_specifics(
        RefreshKind::nothing().with_processes(ProcessRefreshKind::everything()),
    );
    system.refresh_processes(sysinfo::ProcessesToUpdate::All, true);

    let mut killed = 0u32;
    for process in system.processes().values() {
        let name = process.name().to_string_lossy().to_lowercase();
        if markers.iter().any(|marker| name.contains(marker)) {
            if process.kill() {
                killed += 1;
            }
        }
    }
    killed
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn scan_does_not_panic_on_empty_system() {
        let tools = scan_running_remote_tools();
        assert!(tools.len() <= REMOTE_TOOLS.len());
    }
}
