import type {
  ConnectionState,
  DashboardActivity,
  DashboardIncident,
  DashboardSettingsResponse,
  DashboardSetup,
  DashboardSummary,
  ExtensionSettingsSync,
  IncidentExportFiles,
  RiskLevel,
} from '@ase/core';

const API = '';

export async function fetchSetup(): Promise<DashboardSetup> {
  const response = await fetch(`${API}/api/setup`);
  if (!response.ok) throw new Error('Failed to load setup status');
  return response.json() as Promise<DashboardSetup>;
}

export async function fetchSummary(): Promise<DashboardSummary> {
  const response = await fetch(`${API}/api/summary`);
  if (!response.ok) throw new Error('Companion not reachable');
  return response.json() as Promise<DashboardSummary>;
}

export async function fetchActivity(): Promise<DashboardActivity[]> {
  const response = await fetch(`${API}/api/activity`);
  if (!response.ok) throw new Error('Failed to load activity');
  return response.json() as Promise<DashboardActivity[]>;
}

export async function fetchIncidents(): Promise<DashboardIncident[]> {
  const response = await fetch(`${API}/api/incidents`);
  if (!response.ok) throw new Error('Failed to load incidents');
  return response.json() as Promise<DashboardIncident[]>;
}

export async function exportIncidents(incidentId?: string): Promise<IncidentExportFiles> {
  const query = incidentId ? `?id=${encodeURIComponent(incidentId)}` : '';
  const response = await fetch(`${API}/api/incidents/export${query}`);
  if (response.status === 404) throw new Error('Incident not found.');
  if (!response.ok) throw new Error('Failed to export incidents.');
  return response.json() as Promise<IncidentExportFiles>;
}

export interface QuarantineRow {
  id: string;
  filename: string;
  level: RiskLevel;
  status: string;
  findings: string[];
  receivedAt: string;
  threadId?: string;
}

export async function fetchQuarantine(): Promise<QuarantineRow[]> {
  const response = await fetch(`${API}/api/quarantine`);
  if (!response.ok) throw new Error('Failed to load quarantine');
  return response.json() as Promise<QuarantineRow[]>;
}

export interface RemoteGuardView {
  activeThread?: {
    platform: string;
    threadId?: string;
    senderLabel?: string;
    level: RiskLevel;
    summary?: string;
  };
  alert?: {
    id: string;
    toolLabel: string;
    message: string;
    status: string;
  };
  shieldActive: boolean;
  sensitiveWarning?: { windowTitle: string; matchedLabel: string };
  runningRemoteTools: string[];
}

export async function fetchRemoteGuard(): Promise<RemoteGuardView> {
  const response = await fetch(`${API}/api/remote-guard`);
  if (!response.ok) throw new Error('Failed to load remote guard');
  return response.json() as Promise<RemoteGuardView>;
}

export async function deferQuarantine(id: string): Promise<void> {
  const response = await fetch(`${API}/api/quarantine/${id}/defer`, { method: 'POST' });
  if (!response.ok) throw new Error('Defer failed');
}

export async function deleteQuarantine(id: string): Promise<void> {
  const response = await fetch(`${API}/api/quarantine/${id}/delete`, { method: 'POST' });
  if (!response.ok) throw new Error('Delete failed');
}

export async function openSafely(id: string): Promise<void> {
  const response = await fetch(`${API}/api/quarantine/${id}/open-safely`, { method: 'POST' });
  if (!response.ok) throw new Error('Open safely failed — use the companion window for Safe Workspace.');
}

export async function respondRemoteAlert(
  alertId: string,
  action: 'end' | 'shield' | 'user_started',
): Promise<void> {
  const response = await fetch(`${API}/api/remote-guard/respond`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ alertId, action }),
  });
  if (!response.ok) throw new Error('Response failed');
}

export async function fetchSettings(): Promise<DashboardSettingsResponse> {
  const response = await fetch(`${API}/api/settings`);
  if (!response.ok) throw new Error('Failed to load settings');
  return response.json() as Promise<DashboardSettingsResponse>;
}

export async function saveSettings(settings: ExtensionSettingsSync): Promise<void> {
  const response = await fetch(`${API}/api/settings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  });
  if (response.status === 503) {
    throw new Error('Extension not connected. Open the extension popup and wait for Connected.');
  }
  if (!response.ok) throw new Error('Failed to save settings');
}

export function formatTime(value: string): string {
  const asNumber = Number(value);
  const date = Number.isFinite(asNumber) ? new Date(asNumber) : new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

export const STATE_LABELS: Record<ConnectionState, string> = {
  connected: 'Extension connected',
  disconnected: 'Extension disconnected',
  unknown: 'Extension unknown',
};
