use std::fs;
use std::path::PathBuf;

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
struct LaunchStateFile {
    welcome_shown: bool,
}

pub struct LaunchState {
    path: PathBuf,
}

impl LaunchState {
    pub fn new(base_dir: PathBuf) -> Self {
        Self {
            path: base_dir.join("launch-state.json"),
        }
    }

    pub fn should_show_welcome(&self) -> bool {
        match self.read() {
            Ok(state) => !state.welcome_shown,
            Err(_) => true,
        }
    }

    pub fn mark_welcome_shown(&self) -> Result<(), String> {
        let mut state = self.read().unwrap_or_default();
        state.welcome_shown = true;
        self.write(&state)
    }

    fn read(&self) -> Result<LaunchStateFile, String> {
        let raw = fs::read_to_string(&self.path).map_err(|error| error.to_string())?;
        serde_json::from_str(&raw).map_err(|error| error.to_string())
    }

    fn write(&self, state: &LaunchStateFile) -> Result<(), String> {
        if let Some(parent) = self.path.parent() {
            fs::create_dir_all(parent).map_err(|error| error.to_string())?;
        }
        let raw = serde_json::to_string_pretty(state).map_err(|error| error.to_string())?;
        fs::write(&self.path, raw).map_err(|error| error.to_string())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn welcome_shown_once() {
        let dir = std::env::temp_dir().join("ase-launch-test");
        let _ = fs::remove_dir_all(&dir);
        let state = LaunchState::new(dir.clone());
        assert!(state.should_show_welcome());
        state.mark_welcome_shown().unwrap();
        assert!(!state.should_show_welcome());
        let _ = fs::remove_dir_all(dir);
    }
}
