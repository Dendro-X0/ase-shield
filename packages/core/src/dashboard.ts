import type { RiskLevel } from './analysis.js';
import type { ConnectionState } from './ipc.js';

export const DASHBOARD_URL = 'http://127.0.0.1:47123/' as const;

export interface DashboardSummary {
  extensionState: ConnectionState;
  companionVersion: string;
  quarantineCount: number;
  incidentCount: number;
  activityCount: number;
  remoteShieldActive: boolean;
  windowsSandboxAvailable: boolean;
  activeThreadLevel: RiskLevel | null;
  runningRemoteTools: string[];
  lastExtensionPingAt: number | null;
}

export interface DashboardActivity {
  id: string;
  kind: 'thread_flagged' | 'download_quarantined' | 'remote_session' | 'incident' | 'practice' | 'lab_scenario';
  title: string;
  detail?: string;
  platform?: string;
  threadId?: string;
  level?: RiskLevel;
  recordedAt: string;
}

export interface DashboardSetup {
  extensionConnected: boolean;
  hasActivity: boolean;
  hasPracticeScan: boolean;
  recommendedNext: string;
  practiceScenario: string;
  /** Present after extension pings companion with its runtime ID. */
  devLabUrl: string | null;
}

export interface DashboardIncident {
  id: string;
  platform: string;
  threadId?: string;
  level: RiskLevel;
  ruleIds: string[];
  summary: string;
  recordedAt: string;
}

export interface IncidentSyncPayload {
  id: string;
  platform: string;
  threadId?: string;
  level: RiskLevel;
  ruleIds: string[];
  summary: string;
  recordedAt: string;
}
