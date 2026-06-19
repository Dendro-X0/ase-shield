import type { IncidentRecord } from './types.js';

export interface ExportPackage {
  exportedAt: string;
  version: string;
  incidents: IncidentRecord[];
}

export function buildExportJson(incidents: IncidentRecord[]): string {
  const package_: ExportPackage = {
    exportedAt: new Date().toISOString(),
    version: '1.0.0',
    incidents,
  };
  return JSON.stringify(package_, null, 2);
}

export function buildExportHtml(incidents: IncidentRecord[]): string {
  const rows = incidents
    .map(
      (incident) => `
    <tr>
      <td>${escapeHtml(incident.recordedAt)}</td>
      <td>${escapeHtml(incident.platform)}</td>
      <td>${escapeHtml(incident.level)}</td>
      <td>${escapeHtml(incident.summary)}</td>
      <td>${escapeHtml(incident.ruleIds.join(', '))}</td>
      <td>${escapeHtml(incident.threadId ?? '—')}</td>
    </tr>`,
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Anti-SE Incident Export</title>
  <style>
    body { font-family: system-ui, sans-serif; margin: 24px; color: #111; }
    h1 { font-size: 1.25rem; }
    table { border-collapse: collapse; width: 100%; margin-top: 16px; }
    th, td { border: 1px solid #ccc; padding: 8px; text-align: left; font-size: 14px; }
    th { background: #f3f4f6; }
    .meta { color: #555; font-size: 13px; }
  </style>
</head>
<body>
  <h1>Anti-SE Shield — Incident Report</h1>
  <p class="meta">Generated locally on your device. ${incidents.length} record(s).</p>
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
    <tbody>${rows}</tbody>
  </table>
</body>
</html>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function downloadBlob(filename: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
