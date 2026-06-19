use std::fs::File;
use std::io::Read;
use std::path::Path;

use super::types::{RiskLevel, ScanResult};

const DOUBLE_EXT: &[(&str, &str)] = &[
    (".pdf", ".exe"),
    (".doc", ".exe"),
    (".docx", ".exe"),
    (".xls", ".exe"),
    (".xlsx", ".exe"),
    (".zip", ".exe"),
    (".jpg", ".exe"),
];

const MACRO_EXT: &[&str] = &[".docm", ".xlsm", ".pptm", ".dotm", ".xltm", ".potm"];

const EXECUTABLE_EXT: &[&str] = &[
    ".exe", ".msi", ".bat", ".cmd", ".ps1", ".scr", ".com", ".vbs", ".js",
];

pub fn scan_file(path: &Path, display_name: &str) -> ScanResult {
    let mut findings = Vec::new();
    let mut level = RiskLevel::Safe;

    let name_lower = display_name.to_lowercase();

    for (left, right) in DOUBLE_EXT {
        let pattern = format!("{left}{right}");
        if name_lower.ends_with(&pattern) {
            findings.push(format!(
                "Double extension detected ({left}{right}) — often used to hide programs as documents."
            ));
            level = RiskLevel::HighRisk;
        }
    }

    for ext in MACRO_EXT {
        if name_lower.ends_with(ext) {
            findings.push(format!(
                "Macro-enabled Office file ({ext}) can run scripts if macros are enabled."
            ));
            if level == RiskLevel::Safe {
                level = RiskLevel::Caution;
            }
        }
    }

    for ext in EXECUTABLE_EXT {
        if name_lower.ends_with(ext) {
            findings.push(format!(
                "Executable file type ({ext}) can run code on your computer."
            ));
            level = RiskLevel::HighRisk;
        }
    }

    if name_lower.ends_with(".zip") || name_lower.ends_with(".rar") || name_lower.ends_with(".7z") {
        if let Some(zip_findings) = scan_zip(path) {
            findings.extend(zip_findings);
            level = max_level(level, RiskLevel::Caution);
        }
    }

    if name_lower.ends_with(".pdf") {
        if let Some(pdf_findings) = scan_pdf(path) {
            findings.extend(pdf_findings);
            level = max_level(level, RiskLevel::Caution);
        }
    }

    if findings.is_empty() {
        findings.push("No obvious static red flags in this offline scan.".to_string());
    }

    ScanResult { level, findings }
}

fn scan_zip(path: &Path) -> Option<Vec<String>> {
    let file = File::open(path).ok()?;
    let mut archive = zip::ZipArchive::new(file).ok()?;
    let mut findings = Vec::new();

    for i in 0..archive.len() {
        let file = archive.by_index(i).ok()?;
        let name = file.name().to_lowercase();
        if name.ends_with(".exe")
            || name.ends_with(".bat")
            || name.ends_with(".cmd")
            || name.ends_with(".ps1")
            || name.ends_with(".js")
            || name.ends_with(".vbs")
        {
            findings.push(format!("Archive contains executable: {name}"));
        }
        if name.contains("..") || name.starts_with('/') || name.contains('\\') {
            findings.push("Archive contains suspicious path entries.".to_string());
        }
    }

    if findings.is_empty() {
        None
    } else {
        Some(findings)
    }
}

fn scan_pdf(path: &Path) -> Option<Vec<String>> {
    let mut file = File::open(path).ok()?;
    let mut buffer = Vec::new();
    file.read_to_end(&mut buffer).ok()?;
    if buffer.len() < 8 {
        return None;
    }

    let sample = String::from_utf8_lossy(&buffer[..buffer.len().min(8192)]).to_lowercase();
    let mut findings = Vec::new();

    if sample.contains("/javascript") || sample.contains("/js") || sample.contains("/launch") {
        findings.push("PDF may contain automatic actions or scripts.".to_string());
    }

    if findings.is_empty() {
        None
    } else {
        Some(findings)
    }
}

fn max_level(current: RiskLevel, next: RiskLevel) -> RiskLevel {
    match (current, next) {
        (RiskLevel::HighRisk, _) | (_, RiskLevel::HighRisk) => RiskLevel::HighRisk,
        (RiskLevel::Caution, _) | (_, RiskLevel::Caution) => RiskLevel::Caution,
        _ => RiskLevel::Safe,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::Path;

    #[test]
    fn detects_double_extension_name() {
        let result = scan_file(Path::new("unused"), "brief.pdf.exe");
        assert_eq!(result.level, RiskLevel::HighRisk);
    }

    #[test]
    fn detects_macro_extension() {
        let result = scan_file(Path::new("unused"), "contract.docm");
        assert_eq!(result.level, RiskLevel::Caution);
    }
}
