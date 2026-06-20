import type { DashboardIncident } from './dashboard.js';

export interface IncidentExportPackage {
  exportedAt: string;
  version: string;
  incidents: DashboardIncident[];
}

export interface IncidentExportFiles {
  json: string;
  html: string;
  filename: string;
  count: number;
}

export function buildIncidentExportPackage(
  incidents: DashboardIncident[],
): IncidentExportPackage {
  return {
    exportedAt: new Date().toISOString(),
    version: '1.0.0',
    incidents,
  };
}

export function buildIncidentExportJson(incidents: DashboardIncident[]): string {
  return JSON.stringify(buildIncidentExportPackage(incidents), null, 2);
}

export function buildIncidentExportHtml(incidents: DashboardIncident[]): string {
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

export function buildIncidentExportFiles(incidents: DashboardIncident[]): IncidentExportFiles {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  return {
    json: buildIncidentExportJson(incidents),
    html: buildIncidentExportHtml(incidents),
    filename: `ase-incidents-${stamp}`,
    count: incidents.length,
  };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
