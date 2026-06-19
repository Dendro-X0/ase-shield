#[cfg(windows)]
pub fn foreground_window_title() -> Option<String> {
    use std::ffi::OsString;
    use std::os::windows::ffi::OsStringExt;
    use windows::Win32::Foundation::HWND;
    use windows::Win32::UI::WindowsAndMessaging::{GetForegroundWindow, GetWindowTextW};

    unsafe {
        let hwnd: HWND = GetForegroundWindow();
        if hwnd.0.is_null() {
            return None;
        }

        let mut buffer = [0u16; 512];
        let length = GetWindowTextW(hwnd, &mut buffer);
        if length == 0 {
            return None;
        }

        Some(OsString::from_wide(&buffer[..length as usize]).to_string_lossy().into_owned())
    }
}

#[cfg(not(windows))]
pub fn foreground_window_title() -> Option<String> {
    None
}
