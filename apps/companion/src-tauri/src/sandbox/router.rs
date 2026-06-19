use super::types::SandboxTier;
use crate::quarantine::RiskLevel;

const EXECUTABLE_EXT: &[&str] = &[
    ".exe", ".msi", ".bat", ".cmd", ".ps1", ".scr", ".com", ".vbs", ".js",
];

const DOCUMENT_EXT: &[&str] = &[
    ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx", ".odt", ".ods", ".rtf",
];

const MACRO_EXT: &[&str] = &[".docm", ".xlsm", ".pptm", ".dotm", ".xltm", ".potm"];

const ARCHIVE_EXT: &[&str] = &[".zip", ".rar", ".7z"];

const TEXT_EXT: &[&str] = &[
    ".txt", ".md", ".csv", ".json", ".xml", ".html", ".htm", ".log",
];

const IMAGE_EXT: &[&str] = &[".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp"];

pub fn route_tier(filename: &str, level: RiskLevel) -> SandboxTier {
    let lower = filename.to_lowercase();
    let mut tier = if ends_with_any(&lower, EXECUTABLE_EXT) {
        SandboxTier::Tier2
    } else if ends_with_any(&lower, MACRO_EXT) || ends_with_any(&lower, DOCUMENT_EXT) {
        SandboxTier::Tier3
    } else if ends_with_any(&lower, ARCHIVE_EXT)
        || ends_with_any(&lower, TEXT_EXT)
        || ends_with_any(&lower, IMAGE_EXT)
    {
        SandboxTier::Tier1
    } else {
        SandboxTier::Tier1
    };

    if level == RiskLevel::HighRisk {
        tier = tier.bump();
    }

    tier
}

fn ends_with_any(name: &str, extensions: &[&str]) -> bool {
    extensions.iter().any(|ext| name.ends_with(ext))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::quarantine::RiskLevel;

    #[test]
    fn routes_executables_to_tier2() {
        assert_eq!(route_tier("setup.exe", RiskLevel::Safe), SandboxTier::Tier2);
    }

    #[test]
    fn routes_pdf_to_tier3() {
        assert_eq!(route_tier("brief.pdf", RiskLevel::Safe), SandboxTier::Tier3);
    }

    #[test]
    fn bumps_high_risk_zip_to_tier3() {
        assert_eq!(route_tier("files.zip", RiskLevel::HighRisk), SandboxTier::Tier3);
    }

    #[test]
    fn bumps_high_risk_pdf_to_tier2() {
        assert_eq!(route_tier("brief.pdf", RiskLevel::HighRisk), SandboxTier::Tier2);
    }
}
