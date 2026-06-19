#[cfg(windows)]
mod platform {
    use std::process::Command;

    use serde_json::Value;

    use crate::recovery::types::{ExposureSnapshot, ScheduledTaskEntry, StartupEntry};

    pub fn capture_exposure_snapshot() -> Result<ExposureSnapshot, String> {
        let script = r#"
$startup = @()
foreach ($hive in @(
  @{ Source = 'run-hkcu'; Path = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Run' },
  @{ Source = 'run-hklm'; Path = 'HKLM:\Software\Microsoft\Windows\CurrentVersion\Run' }
)) {
  if (Test-Path $hive.Path) {
    $props = Get-ItemProperty -Path $hive.Path
    $props.PSObject.Properties | Where-Object { $_.Name -notmatch '^PS' } | ForEach-Object {
      $startup += [ordered]@{
        id = "$($hive.Source):$($_.Name)"
        source = $hive.Source
        name = [string]$_.Name
        command = [string]$_.Value
      }
    }
  }
}
$startupFolder = Join-Path $env:APPDATA 'Microsoft\Windows\Start Menu\Programs\Startup'
if (Test-Path $startupFolder) {
  Get-ChildItem -Path $startupFolder -File | ForEach-Object {
    $startup += [ordered]@{
      id = "startup-file:$($_.Name)"
      source = 'startup-folder'
      name = $_.Name
      command = $_.FullName
    }
  }
}
$tasks = @()
Get-ScheduledTask | Where-Object { $_.State -ne 'Disabled' } | ForEach-Object {
  $tasks += [ordered]@{
    id = "task:$($_.TaskPath)|$($_.TaskName)"
    name = $_.TaskName
    path = $_.TaskPath
    state = [string]$_.State
  }
}
[ordered]@{
  capturedAt = [DateTimeOffset]::UtcNow.ToString('o')
  startupEntries = $startup
  scheduledTasks = $tasks
} | ConvertTo-Json -Depth 6 -Compress
"#;

        let raw = run_powershell(script)?;
        let value: Value = serde_json::from_str(&raw).map_err(|error| error.to_string())?;

        let startup_entries: Vec<StartupEntry> =
            serde_json::from_value(value.get("startupEntries").cloned().unwrap_or(Value::Array(vec![])))
                .map_err(|error| error.to_string())?;
        let scheduled_tasks: Vec<ScheduledTaskEntry> =
            serde_json::from_value(value.get("scheduledTasks").cloned().unwrap_or(Value::Array(vec![])))
                .map_err(|error| error.to_string())?;

        Ok(ExposureSnapshot {
            captured_at: value
                .get("capturedAt")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string(),
            startup_entries,
            scheduled_tasks,
        })
    }

    pub fn undo_item(item_id: &str) -> Result<(), String> {
        let script = format!(
            r#"
$id = '{item_id}'
if ($id -like 'run-hkcu:*') {{
  $name = $id.Substring(8)
  Remove-ItemProperty -Path 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Run' -Name $name -ErrorAction Stop
}} elseif ($id -like 'run-hklm:*') {{
  $name = $id.Substring(8)
  Remove-ItemProperty -Path 'HKLM:\Software\Microsoft\Windows\CurrentVersion\Run' -Name $name -ErrorAction Stop
}} elseif ($id -like 'startup-file:*') {{
  $name = $id.Substring(13)
  $path = Join-Path $env:APPDATA "Microsoft\Windows\Start Menu\Programs\Startup\$name"
  Remove-Item -Path $path -Force -ErrorAction Stop
}} elseif ($id -like 'task:*') {{
  $parts = $id.Substring(5).Split('|', 2)
  if ($parts.Count -lt 2) {{ throw "Invalid task id" }}
  Unregister-ScheduledTask -TaskName $parts[1] -TaskPath $parts[0] -Confirm:$false -ErrorAction Stop
}} else {{
  throw "Unsupported item id"
}}
"#
        );
        run_powershell(&script)?;
        Ok(())
    }

    pub fn open_path(path: &str) -> Result<(), String> {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x0800_0000;
        std::process::Command::new("cmd")
            .args(["/C", "start", "", path])
            .creation_flags(CREATE_NO_WINDOW)
            .spawn()
            .map_err(|error| error.to_string())?;
        Ok(())
    }

    fn run_powershell(script: &str) -> Result<String, String> {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x0800_0000;

        let output = Command::new("powershell")
            .args([
                "-NoProfile",
                "-NonInteractive",
                "-ExecutionPolicy",
                "Bypass",
                "-Command",
                script,
            ])
            .creation_flags(CREATE_NO_WINDOW)
            .output()
            .map_err(|error| format!("PowerShell failed to start: {error}"))?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(stderr.trim().to_string());
        }

        Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
    }
}

#[cfg(not(windows))]
mod platform {
    use crate::recovery::types::ExposureSnapshot;

    pub fn capture_exposure_snapshot() -> Result<ExposureSnapshot, String> {
        Err("Exposure snapshots are only supported on Windows.".into())
    }

    pub fn undo_item(_item_id: &str) -> Result<(), String> {
        Err("Undo is only supported on Windows.".into())
    }

    pub fn open_path(_path: &str) -> Result<(), String> {
        Err("Open path is only supported on Windows.".into())
    }
}

pub use platform::{capture_exposure_snapshot, open_path, undo_item};
