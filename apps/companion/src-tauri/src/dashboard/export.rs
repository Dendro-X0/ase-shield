use crate::dashboard::IncidentEntry;

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct IncidentExportResponse {
    pub json: String,
    pub html: String,
    pub filename: String,
    pub count: usize,
}

pub fn build_incident_export(incidents: &[IncidentEntry], filter_id: Option<&str>) -> IncidentExportResponse {
    let selected: Vec<&IncidentEntry> = match filter_id {
        Some(id) => incidents.iter().filter(|item| item.id == id).collect(),
        None => incidents.iter().collect(),
    };

    let stamp = chrono_like_stamp();
    IncidentExportResponse {
        json: build_json(&selected),
        html: build_html(&selected),
        filename: format!("ase-incidents-{stamp}"),
        count: selected.len(),
    }
}

fn build_json(incidents: &[&IncidentEntry]) -> String {
    let exported_at = iso_now_rfc3339();
    let payload = serde_json::json!({
        "exportedAt": exported_at,
        "version": "1.0.0",
        "incidents": incidents,
    });
    serde_json::to_string_pretty(&payload).unwrap_or_else(|_| "{}".to_string())
}

fn build_html(incidents: &[&IncidentEntry]) -> String {
    let rows: String = incidents
        .iter()
        .map(|incident| {
            format!(
                "<tr><td>{}</td><td>{}</td><td>{}</td><td>{}</td><td>{}</td><td>{}</td></tr>",
                escape_html(&incident.recorded_at),
                escape_html(&incident.platform),
                escape_html(&incident.level),
                escape_html(&incident.summary),
                escape_html(&incident.rule_ids.join(", ")),
                escape_html(incident.thread_id.as_deref().unwrap_or("—")),
            )
        })
        .collect();

    format!(
        r#"<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Anti-SE Incident Export</title>
  <style>
    body {{ font-family: system-ui, sans-serif; margin: 24px; color: #111; }}
    h1 {{ font-size: 1.25rem; }}
    table {{ border-collapse: collapse; width: 100%; margin-top: 16px; }}
    th, td {{ border: 1px solid #ccc; padding: 8px; text-align: left; font-size: 14px; }}
    th {{ background: #f3f4f6; }}
    .meta {{ color: #555; font-size: 13px; }}
  </style>
</head>
<body>
  <h1>Anti-SE Shield — Incident Report</h1>
  <p class="meta">Generated locally on your device. {} record(s).</p>
  <table>
    <thead>
      <tr>
        <th>Time</th>
        <th>Platform</th>
        <th>Level</th>
        <th>Summary</th>
        <th>Rules</th>
        <th>Thread</th>
      </tr>
    </thead>
    <tbody>{rows}</tbody>
  </table>
</body>
</html>"#,
        incidents.len(),
        rows = rows
    )
}

fn escape_html(value: &str) -> String {
    value
        .replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
}

fn iso_now_rfc3339() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let millis = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis())
        .unwrap_or(0);
    format!("{millis}")
}

fn chrono_like_stamp() -> String {
    iso_now_rfc3339().replace([':', '.'], "-")
}
