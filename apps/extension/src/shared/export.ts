import type { DashboardIncident } from '@ase/core';
import {
  buildIncidentExportFiles,
  buildIncidentExportHtml,
  buildIncidentExportJson,
  type IncidentExportPackage,
} from '@ase/core';

import type { IncidentRecord } from './types.js';

export type { IncidentExportPackage };

export function buildExportJson(incidents: IncidentRecord[]): string {
  return buildIncidentExportJson(toDashboardIncidents(incidents));
}

export function buildExportHtml(incidents: IncidentRecord[]): string {
  return buildIncidentExportHtml(toDashboardIncidents(incidents));
}

export function buildExportFiles(incidents: IncidentRecord[]) {
  return buildIncidentExportFiles(toDashboardIncidents(incidents));
}

function toDashboardIncidents(incidents: IncidentRecord[]): DashboardIncident[] {
  return incidents.map((incident) => ({
    id: incident.id,
    platform: incident.platform,
    threadId: incident.threadId,
    level: incident.level,
    ruleIds: incident.ruleIds,
    summary: incident.summary,
    recordedAt: incident.recordedAt,
  }));
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
