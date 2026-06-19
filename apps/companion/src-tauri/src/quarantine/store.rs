use std::fs;
use std::io::Read;
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};

use sha2::{Digest, Sha256};
use uuid::Uuid;

use super::scan::scan_file;
use super::types::{DownloadQueuedPayload, QuarantineItem, QuarantineStatus};

const INDEX_FILE: &str = "index.json";
const PENDING_FILE: &str = "pending-downloads.json";

#[derive(Clone)]
pub struct QuarantineStore {
    inner: Arc<Mutex<StoreInner>>,
}

struct StoreInner {
    base_dir: PathBuf,
    items: Vec<QuarantineItem>,
}

impl QuarantineStore {
    pub fn new(base_dir: PathBuf) -> Self {
        let store = Self {
            inner: Arc::new(Mutex::new(StoreInner {
                base_dir,
                items: Vec::new(),
            })),
        };
        store.load_index();
        store.process_pending_on_startup();
        store
    }

    pub fn base_dir(&self) -> PathBuf {
        self.inner.lock().expect("quarantine poisoned").base_dir.clone()
    }

    pub fn list_items(&self) -> Vec<QuarantineItem> {
        self.inner.lock().expect("quarantine poisoned").items.clone()
    }

    pub fn get_item(&self, id: &str) -> Option<QuarantineItem> {
        self.inner
            .lock()
            .expect("quarantine poisoned")
            .items
            .iter()
            .find(|item| item.id == id)
            .cloned()
    }

    pub fn quarantine_count(&self) -> usize {
        let inner = self.inner.lock().expect("quarantine poisoned");
        inner
            .items
            .iter()
            .filter(|item| item.status != QuarantineStatus::Deferred)
            .count()
    }

    pub fn ingest_download(&self, payload: DownloadQueuedPayload) -> Result<QuarantineItem, String> {
        if let Some(path_str) = &payload.source_path {
            let source = PathBuf::from(path_str);
            if source.exists() {
                let mut inner = self.inner.lock().expect("quarantine poisoned");
                return ingest_from_path_inner(&mut inner, payload, &source);
            }
        }

        self.queue_pending(payload)?;
        Err("File not ready yet — queued for quarantine when the download path is available.".into())
    }

    pub fn defer_item(&self, id: &str) -> Result<(), String> {
        let mut inner = self.inner.lock().expect("quarantine poisoned");
        let item = inner
            .items
            .iter_mut()
            .find(|item| item.id == id)
            .ok_or("Quarantine item not found.")?;
        item.status = QuarantineStatus::Deferred;
        save_index(&inner)?;
        Ok(())
    }

    pub fn delete_item(&self, id: &str) -> Result<(), String> {
        let mut inner = self.inner.lock().expect("quarantine poisoned");
        let index = inner
            .items
            .iter()
            .position(|item| item.id == id)
            .ok_or("Quarantine item not found.")?;
        let item = inner.items.remove(index);

        let item_dir = inner.base_dir.join(&item.id);
        if item_dir.exists() {
            fs::remove_dir_all(item_dir).map_err(|e| e.to_string())?;
        }

        save_index(&inner)?;
        Ok(())
    }

    fn queue_pending(&self, payload: DownloadQueuedPayload) -> Result<(), String> {
        let inner = self.inner.lock().expect("quarantine poisoned");
        let pending_path = pending_file_path(&inner.base_dir);
        let mut pending: Vec<DownloadQueuedPayload> = if pending_path.exists() {
            let raw = fs::read_to_string(&pending_path).unwrap_or_default();
            serde_json::from_str(&raw).unwrap_or_default()
        } else {
            Vec::new()
        };

        pending.push(payload);
        let serialized = serde_json::to_string_pretty(&pending).map_err(|e| e.to_string())?;
        fs::write(&pending_path, serialized).map_err(|e| e.to_string())?;
        Ok(())
    }

    fn process_pending_on_startup(&self) {
        let mut inner = self.inner.lock().expect("quarantine poisoned");
        let pending_path = pending_file_path(&inner.base_dir);
        if !pending_path.exists() {
            return;
        }

        let raw = fs::read_to_string(&pending_path).unwrap_or_default();
        let pending: Vec<DownloadQueuedPayload> = serde_json::from_str(&raw).unwrap_or_default();
        if pending.is_empty() {
            return;
        }

        let mut remaining = Vec::new();
        for payload in pending {
            if let Some(path_str) = &payload.source_path {
                let source = PathBuf::from(path_str);
                if source.exists() {
                    if ingest_from_path_inner(&mut inner, payload.clone(), &source).is_ok() {
                        continue;
                    }
                }
            }
            remaining.push(payload);
        }

        if remaining.is_empty() {
            let _ = fs::remove_file(&pending_path);
        } else {
            let serialized = serde_json::to_string_pretty(&remaining).unwrap_or_default();
            let _ = fs::write(&pending_path, serialized);
        }

        let _ = save_index(&inner);
    }

    fn load_index(&self) {
        let mut inner = self.inner.lock().expect("quarantine poisoned");
        fs::create_dir_all(&inner.base_dir).ok();
        let index_path = inner.base_dir.join(INDEX_FILE);
        if !index_path.exists() {
            return;
        }
        let raw = fs::read_to_string(index_path).unwrap_or_default();
        inner.items = serde_json::from_str(&raw).unwrap_or_default();
    }
}

fn ingest_from_path_inner(
    inner: &mut StoreInner,
    payload: DownloadQueuedPayload,
    source: &Path,
) -> Result<QuarantineItem, String> {
    let id = Uuid::new_v4().to_string();
    let item_dir = inner.base_dir.join(&id);
    fs::create_dir_all(&item_dir).map_err(|e| e.to_string())?;

    let safe_name = sanitize_filename(&payload.filename);
    let dest = item_dir.join(&safe_name);
    fs::copy(source, &dest).map_err(|e| format!("Could not copy file to quarantine: {e}"))?;

    let sha256 = hash_file(&dest).ok();
    let scan = scan_file(&dest, &payload.filename);

    let item = QuarantineItem {
        id,
        download_id: Some(payload.download_id),
        filename: payload.filename.clone(),
        quarantine_path: dest.to_string_lossy().to_string(),
        source_url: payload.url.clone(),
        thread_id: payload.thread_id.clone(),
        sha256,
        status: QuarantineStatus::Ready,
        level: scan.level,
        findings: scan.findings,
        received_at: iso_now(),
    };

    inner.items.insert(0, item.clone());
    save_index(inner)?;
    Ok(item)
}

fn save_index(inner: &StoreInner) -> Result<(), String> {
    fs::create_dir_all(&inner.base_dir).map_err(|e| e.to_string())?;
    let index_path = inner.base_dir.join(INDEX_FILE);
    let serialized = serde_json::to_string_pretty(&inner.items).map_err(|e| e.to_string())?;
    fs::write(index_path, serialized).map_err(|e| e.to_string())?;
    Ok(())
}

pub fn default_quarantine_dir() -> PathBuf {
    let base = dirs::data_local_dir()
        .unwrap_or_else(std::env::temp_dir)
        .join("Anti-SE Companion");
    base.join("quarantine")
}

fn pending_file_path(quarantine_dir: &Path) -> PathBuf {
    quarantine_dir
        .parent()
        .unwrap_or(quarantine_dir)
        .join(PENDING_FILE)
}

fn sanitize_filename(name: &str) -> String {
    name.chars()
        .map(|c| {
            if c.is_ascii_alphanumeric() || c == '.' || c == '-' || c == '_' {
                c
            } else {
                '_'
            }
        })
        .collect()
}

fn hash_file(path: &Path) -> Result<String, std::io::Error> {
    let mut file = fs::File::open(path)?;
    let mut hasher = Sha256::new();
    let mut buffer = [0u8; 8192];
    loop {
        let read = file.read(&mut buffer)?;
        if read == 0 {
            break;
        }
        hasher.update(&buffer[..read]);
    }
    Ok(hex::encode(hasher.finalize()))
}

fn iso_now() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let millis = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis())
        .unwrap_or(0);
    format!("{millis}")
}
