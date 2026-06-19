use std::fs;
use std::path::{Path, PathBuf};

use printpdf::{BuiltinFont, Mm, PdfDocument, PdfDocumentReference, PdfLayerReference};

use super::types::{ExposureDiff, RecoveryChecklist, RecoveryWizardState};

pub fn export_recovery_report(
    state: &RecoveryWizardState,
    diff: Option<&ExposureDiff>,
) -> Result<(PathBuf, PathBuf), String> {
    let dir = reports_dir();
    fs::create_dir_all(&dir).map_err(|error| error.to_string())?;

    let stamp = chrono_like_stamp();
    let html_path = dir.join(format!("ase-recovery-{stamp}.html"));
    let pdf_path = dir.join(format!("ase-recovery-{stamp}.pdf"));

    let html = build_html_report(state, diff);
    fs::write(&html_path, html).map_err(|error| error.to_string())?;
    write_pdf_report(&pdf_path, state, diff)?;

    Ok((html_path, pdf_path))
}

fn reports_dir() -> PathBuf {
    dirs::document_dir()
        .or_else(dirs::data_local_dir)
        .unwrap_or_else(std::env::temp_dir)
        .join("Anti-SE Reports")
}

fn chrono_like_stamp() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let millis = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_millis())
        .unwrap_or(0);
    format!("{millis}")
}

fn build_html_report(state: &RecoveryWizardState, diff: Option<&ExposureDiff>) -> String {
    let checklist = checklist_rows(&state.checklist);
    let diff_section = diff
        .map(render_diff_html)
        .unwrap_or_else(|| "<p>No exposure diff captured yet.</p>".to_string());
    let extensions = if state.browser_extensions.is_empty() {
        "<p>No browser extension snapshot yet.</p>".to_string()
    } else {
        let rows = state
            .browser_extensions
            .iter()
            .map(|ext| {
                format!(
                    "<tr><td>{}</td><td>{}</td><td>{}</td><td>{}</td></tr>",
                    escape_html(&ext.name),
                    escape_html(ext.version.as_deref().unwrap_or("—")),
                    if ext.enabled { "enabled" } else { "disabled" },
                    escape_html(ext.install_type.as_deref().unwrap_or("—")),
                )
            })
            .collect::<Vec<_>>()
            .join("");
        format!(
            "<table><thead><tr><th>Name</th><th>Version</th><th>Status</th><th>Install type</th></tr></thead><tbody>{rows}</tbody></table>"
        )
    };

    format!(
        r#"<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Anti-SE Recovery Report</title>
  <style>
    body {{ font-family: system-ui, sans-serif; margin: 32px; color: #111; line-height: 1.5; }}
    h1 {{ font-size: 1.4rem; }}
    h2 {{ font-size: 1rem; margin-top: 24px; text-transform: uppercase; letter-spacing: 0.05em; color: #444; }}
    table {{ border-collapse: collapse; width: 100%; margin-top: 8px; }}
    th, td {{ border: 1px solid #ccc; padding: 8px; text-align: left; font-size: 14px; vertical-align: top; }}
    th {{ background: #f3f4f6; }}
    .meta {{ color: #555; font-size: 13px; }}
    .done {{ color: #166534; }}
    .pending {{ color: #92400e; }}
    @media print {{ body {{ margin: 16px; }} }}
  </style>
</head>
<body>
  <h1>Anti-SE Recovery Report</h1>
  <p class="meta">Generated locally on your device. Share with platform support if needed.</p>
  <h2>Recovery checklist</h2>
  <ul>{checklist}</ul>
  <h2>Exposure changes since baseline</h2>
  {diff_section}
  <h2>Browser extensions snapshot</h2>
  {extensions}
  <h2>Undo summary</h2>
  <p>{undo_summary}</p>
</body>
</html>"#,
        checklist = checklist,
        diff_section = diff_section,
        extensions = extensions,
        undo_summary = escape_html(state.last_undo_summary.as_deref().unwrap_or("No undo actions taken.")),
    )
}

fn checklist_rows(checklist: &RecoveryChecklist) -> String {
    [
        ("Rotate passwords", checklist.rotate_passwords),
        ("Revoke OAuth sessions", checklist.revoke_oauth),
        ("Verify payout details", checklist.verify_payout),
        ("Review browser extensions", checklist.reviewed_extensions),
        ("Review startup entries", checklist.reviewed_startup),
    ]
    .iter()
    .map(|(label, done)| {
        let class = if *done { "done" } else { "pending" };
        let status = if *done { "Done" } else { "Pending" };
        format!("<li class=\"{class}\"><strong>{label}</strong> — {status}</li>")
    })
    .collect::<Vec<_>>()
    .join("")
}

fn render_diff_html(diff: &ExposureDiff) -> String {
    let mut rows = Vec::new();
    for item in diff
        .new_startup_entries
        .iter()
        .chain(diff.new_scheduled_tasks.iter())
    {
        rows.push(format!(
            "<tr><td>{}</td><td>{}</td><td>{}</td></tr>",
            escape_html(&item.kind),
            escape_html(&item.label),
            escape_html(&item.detail),
        ));
    }

    if rows.is_empty() {
        return "<p>No new startup entries or scheduled tasks since the baseline snapshot.</p>".to_string();
    }

    format!(
        "<table><thead><tr><th>Kind</th><th>Name</th><th>Detail</th></tr></thead><tbody>{}</tbody></table>",
        rows.join("")
    )
}

fn write_pdf_report(
    path: &Path,
    state: &RecoveryWizardState,
    diff: Option<&ExposureDiff>,
) -> Result<(), String> {
    let (doc, page1, layer1) =
        PdfDocument::new("Anti-SE Recovery Report", Mm(210.0), Mm(297.0), "Layer 1");
    let current_layer = doc.get_page(page1).get_layer(layer1);
    let font = doc
        .add_builtin_font(BuiltinFont::Helvetica)
        .map_err(|error| error.to_string())?;
    let font_bold = doc
        .add_builtin_font(BuiltinFont::HelveticaBold)
        .map_err(|error| error.to_string())?;

    write_line(&current_layer, &font_bold, 16.0, Mm(20.0), Mm(280.0), "Anti-SE Recovery Report");
    write_line(
        &current_layer,
        &font,
        10.0,
        Mm(20.0),
        Mm(272.0),
        "Generated locally on your device.",
    );

    let mut y = 258.0;
    y = write_section(
        &doc,
        &current_layer,
        &font,
        &font_bold,
        y,
        "Recovery checklist",
        checklist_lines(&state.checklist),
    );

    let diff_lines = diff
        .map(diff_lines)
        .unwrap_or_else(|| vec!["No exposure diff captured yet.".to_string()]);
    y = write_section(
        &doc,
        &current_layer,
        &font,
        &font_bold,
        y,
        "Exposure changes",
        diff_lines,
    );

    let undo = state
        .last_undo_summary
        .clone()
        .unwrap_or_else(|| "No undo actions taken.".to_string());
    let _ = write_section(
        &doc,
        &current_layer,
        &font,
        &font_bold,
        y,
        "Undo summary",
        vec![undo],
    );

    doc.save(&mut std::io::BufWriter::new(
        fs::File::create(path).map_err(|error| error.to_string())?,
    ))
    .map_err(|error| error.to_string())?;

    Ok(())
}

fn write_section(
    _doc: &PdfDocumentReference,
    layer: &PdfLayerReference,
    font: &printpdf::IndirectFontRef,
    font_bold: &printpdf::IndirectFontRef,
    mut y: f32,
    title: &str,
    lines: Vec<String>,
) -> f32 {
    write_line(layer, font_bold, 12.0, Mm(20.0), Mm(y), title);
    y -= 8.0;
    for line in lines {
        if y < 20.0 {
            break;
        }
        write_line(layer, font, 10.0, Mm(24.0), Mm(y), &line);
        y -= 6.0;
    }
    y - 8.0
}

fn write_line(
    layer: &PdfLayerReference,
    font: &printpdf::IndirectFontRef,
    size: f32,
    x: Mm,
    y: Mm,
    text: &str,
) {
    layer.use_text(text, size, x, y, font);
}

fn checklist_lines(checklist: &RecoveryChecklist) -> Vec<String> {
    vec![
        format!(
            "[{}] Rotate passwords",
            if checklist.rotate_passwords { "x" } else { " " }
        ),
        format!(
            "[{}] Revoke OAuth sessions",
            if checklist.revoke_oauth { "x" } else { " " }
        ),
        format!(
            "[{}] Verify payout details",
            if checklist.verify_payout { "x" } else { " " }
        ),
        format!(
            "[{}] Review browser extensions",
            if checklist.reviewed_extensions { "x" } else { " " }
        ),
        format!(
            "[{}] Review startup entries",
            if checklist.reviewed_startup { "x" } else { " " }
        ),
    ]
}

fn diff_lines(diff: &ExposureDiff) -> Vec<String> {
    let mut lines = Vec::new();
    for item in diff
        .new_startup_entries
        .iter()
        .chain(diff.new_scheduled_tasks.iter())
    {
        lines.push(format!("+ {} — {}", item.kind, item.label));
    }
    if lines.is_empty() {
        lines.push("No new startup entries or scheduled tasks.".to_string());
    }
    lines
}

fn escape_html(value: &str) -> String {
    value
        .replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
}
