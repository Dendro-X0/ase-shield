use std::fs;
use std::io::Read;
use std::path::Path;

use base64::{engine::general_purpose::STANDARD, Engine as _};

use super::types::SessionPreview;

const MAX_TEXT_BYTES: usize = 64 * 1024;
const MAX_PREVIEW_BYTES: usize = 4 * 1024 * 1024;

const MACRO_EXT: &[&str] = &[".docm", ".xlsm", ".pptm", ".dotm", ".xltm", ".potm"];

const TEXT_EXT: &[&str] = &[
    ".txt", ".md", ".csv", ".json", ".xml", ".html", ".htm", ".log",
];

const IMAGE_EXT: &[(&str, &str)] = &[
    (".png", "image/png"),
    (".jpg", "image/jpeg"),
    (".jpeg", "image/jpeg"),
    (".gif", "image/gif"),
    (".webp", "image/webp"),
    (".bmp", "image/bmp"),
];

pub fn build_document_preview(path: &Path, filename: &str) -> Result<SessionPreview, String> {
    let lower = filename.to_lowercase();

    if ends_with_any(&lower, MACRO_EXT) {
        return Ok(SessionPreview::DocumentBlocked {
            reason: "Macro-enabled Office files are not opened on your PC. Use Windows Sandbox (Pro) or ask for a PDF export.".to_string(),
        });
    }

    if lower.ends_with(".pdf") {
        return read_pdf_preview(path);
    }

    if ends_with_any(&lower, TEXT_EXT) {
        return read_text_preview(path);
    }

    Ok(SessionPreview::DocumentBlocked {
        reason: "This document type is shown as a safe preview only — host Office apps are not launched.".to_string(),
    })
}

pub fn build_restricted_preview(path: &Path, filename: &str) -> Result<SessionPreview, String> {
    let lower = filename.to_lowercase();

    if lower.ends_with(".zip") {
        return list_zip(path);
    }

    if let Some((_, mime)) = IMAGE_EXT.iter().find(|(ext, _)| lower.ends_with(ext)) {
        return read_image_preview(path, mime);
    }

    if ends_with_any(&lower, TEXT_EXT) {
        return read_text_preview(path);
    }

    Ok(SessionPreview::Unsupported {
        note: "Preview is not available for this file type. Contents stay in quarantine until you choose another action.".to_string(),
    })
}

fn read_text_preview(path: &Path) -> Result<SessionPreview, String> {
    let bytes = read_limited(path, MAX_TEXT_BYTES)?;
    let content = String::from_utf8_lossy(&bytes).to_string();
    Ok(SessionPreview::Text { content })
}

fn read_image_preview(path: &Path, mime_type: &str) -> Result<SessionPreview, String> {
    let bytes = read_limited(path, MAX_PREVIEW_BYTES)?;
    Ok(SessionPreview::Image {
        mime_type: mime_type.to_string(),
        data_base64: STANDARD.encode(bytes),
    })
}

fn read_pdf_preview(path: &Path) -> Result<SessionPreview, String> {
    let metadata = fs::metadata(path).map_err(|error| error.to_string())?;
    if metadata.len() as usize > MAX_PREVIEW_BYTES {
        return Ok(SessionPreview::DocumentBlocked {
            reason: "PDF is too large for an in-app preview. Use Windows Sandbox or delete if unexpected.".to_string(),
        });
    }

    let bytes = fs::read(path).map_err(|error| error.to_string())?;
    Ok(SessionPreview::Pdf {
        data_base64: STANDARD.encode(bytes),
    })
}

fn list_zip(path: &Path) -> Result<SessionPreview, String> {
    let file = fs::File::open(path).map_err(|error| error.to_string())?;
    let mut archive = zip::ZipArchive::new(file).map_err(|error| error.to_string())?;
    let mut entries = Vec::new();

    for index in 0..archive.len() {
        let entry = archive.by_index(index).map_err(|error| error.to_string())?;
        entries.push(entry.name().to_string());
        if entries.len() >= 100 {
            entries.push("… truncated".to_string());
            break;
        }
    }

    if entries.is_empty() {
        entries.push("(empty archive)".to_string());
    }

    Ok(SessionPreview::ArchiveListing { entries })
}

fn read_limited(path: &Path, max_bytes: usize) -> Result<Vec<u8>, String> {
    let mut file = fs::File::open(path).map_err(|error| error.to_string())?;
    let mut buffer = vec![0u8; max_bytes];
    let read = file.read(&mut buffer).map_err(|error| error.to_string())?;
    buffer.truncate(read);
    Ok(buffer)
}

fn ends_with_any(name: &str, extensions: &[&str]) -> bool {
    extensions.iter().any(|ext| name.ends_with(ext))
}
