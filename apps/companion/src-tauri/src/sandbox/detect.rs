use super::types::SandboxCapabilities;

pub fn get_capabilities() -> SandboxCapabilities {
    #[cfg(windows)]
    {
        let state = windows_sandbox_state();
        SandboxCapabilities {
            windows_sandbox_available: state.eq_ignore_ascii_case("Enabled"),
            windows_sandbox_state: state,
            platform: "windows".to_string(),
        }
    }

    #[cfg(not(windows))]
    {
        SandboxCapabilities {
            windows_sandbox_available: false,
            windows_sandbox_state: "unsupported-platform".to_string(),
            platform: std::env::consts::OS.to_string(),
        }
    }
}

#[cfg(windows)]
fn windows_sandbox_state() -> String {
    use std::os::windows::process::CommandExt;
    use std::process::Command;

    const CREATE_NO_WINDOW: u32 = 0x0800_0000;

    let output = Command::new("powershell")
        .args([
            "-NoProfile",
            "-NonInteractive",
            "-Command",
            "(Get-WindowsOptionalFeature -Online -FeatureName Containers-DisposableClientVM -ErrorAction SilentlyContinue).State",
        ])
        .creation_flags(CREATE_NO_WINDOW)
        .output();

    match output {
        Ok(result) if result.status.success() => {
            let state = String::from_utf8_lossy(&result.stdout).trim().to_string();
            if state.is_empty() {
                "Unknown".to_string()
            } else {
                state
            }
        }
        _ => "Unavailable".to_string(),
    }
}
