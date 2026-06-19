use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;

pub fn launch_item_in_windows_sandbox(item_dir: &Path, filename: &str) -> Result<PathBuf, String> {
    let host_folder = item_dir
        .canonicalize()
        .map_err(|error| format!("Could not resolve quarantine folder: {error}"))?;
    let folder_name = host_folder
        .file_name()
        .and_then(|name| name.to_str())
        .ok_or("Invalid quarantine folder name.")?;

    let safe_filename = xml_escape(filename);
    let safe_host = xml_escape(&host_folder.to_string_lossy());
    let sandbox_file = format!(
        "C:\\Users\\WDAGUtilityAccount\\Desktop\\{folder_name}\\{safe_filename}"
    );

    let wsb_body = format!(
        r#"<Configuration>
  <Networking>Disable</Networking>
  <ClipboardRedirection>Disable</ClipboardRedirection>
  <PrinterRedirection>Disable</PrinterRedirection>
  <MappedFolders>
    <MappedFolder>
      <HostFolder>{safe_host}</HostFolder>
      <ReadOnly>true</ReadOnly>
    </MappedFolder>
  </MappedFolders>
  <LogonCommand>
    <Command>cmd.exe /c start "" "{sandbox_file}"</Command>
  </LogonCommand>
</Configuration>"#
    );

    let wsb_path = std::env::temp_dir().join(format!("ase-sandbox-{folder_name}.wsb"));
    fs::write(&wsb_path, wsb_body).map_err(|error| error.to_string())?;

    use std::os::windows::process::CommandExt;
    const CREATE_NO_WINDOW: u32 = 0x0800_0000;

    Command::new(r"C:\Windows\System32\WindowsSandbox.exe")
        .arg(&wsb_path)
        .creation_flags(CREATE_NO_WINDOW)
        .spawn()
        .map_err(|error| format!("Could not launch Windows Sandbox: {error}"))?;

    Ok(wsb_path)
}

fn xml_escape(value: &str) -> String {
    value
        .replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
        .replace('\'', "&apos;")
}

#[cfg(not(windows))]
pub fn launch_item_in_windows_sandbox(_item_dir: &Path, _filename: &str) -> Result<PathBuf, String> {
    Err("Windows Sandbox is only available on Windows.".into())
}
