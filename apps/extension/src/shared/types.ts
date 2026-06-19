import type { AnalysisResult, DevLabRunResult, FeedbackReportDraft, Platform, RiskLevel, TimelineInsight } from '@ase/core';

/** User preferences stored in chrome.storage.local */
export interface ExtensionSettings {
  disabledRuleIds: string[];
  allowlistedDomains: string[];
  showJobBrowserHint: boolean;
  overlaysEnabled: boolean;
  onboardingCompleted: boolean;
  practiceCompleted: boolean;
}

export const DEFAULT_SETTINGS: ExtensionSettings = {
  disabledRuleIds: [],
  allowlistedDomains: [],
  showJobBrowserHint: true,
  overlaysEnabled: true,
  onboardingCompleted: false,
  practiceCompleted: false,
};

export interface ThreadDismissal {
  platform: Platform;
  threadId: string;
  dismissedAt: string;
}

export interface DomainInspectResult {
  hostname: string;
  signals: string[];
  level: RiskLevel;
  punycode: boolean;
}

export interface IncidentRecord {
  id: string;
  platform: Platform;
  threadId?: string;
  level: RiskLevel;
  ruleIds: string[];
  summary: string;
  recordedAt: string;
}

export interface AnalysisResponse {
  result: AnalysisResult;
  dismissed: boolean;
  timeline?: TimelineInsight;
  contactWarnings?: string[];
}

export type BgRequest =
  | { type: 'ANALYZE_THREAD'; payload: AnalyzeThreadPayload }
  | { type: 'INSPECT_LINK'; payload: { url: string } }
  | { type: 'DISMISS_THREAD'; payload: { platform: Platform; threadId: string } }
  | { type: 'GET_SETTINGS' }
  | { type: 'SAVE_SETTINGS'; payload: ExtensionSettings }
  | { type: 'GET_CONNECTION_STATE' }
  | { type: 'PING_COMPANION_NOW' }
  | { type: 'REGISTER_THREAD_CONTEXT'; payload: RegisterThreadContextPayload }
  | { type: 'EXPORT_INCIDENTS'; payload?: { incidentId?: string } }
  | { type: 'LIST_INCIDENTS' }
  | { type: 'GET_ONBOARDING_STATE' }
  | { type: 'COMPLETE_ONBOARDING' }
  | { type: 'COMPLETE_PRACTICE' }
  | { type: 'EXPORT_FEEDBACK'; payload: FeedbackReportDraft }
  | { type: 'GET_SETUP_STATUS' }
  | { type: 'RUN_LAB_SCENARIO'; payload: { scenarioId: string } }
  | { type: 'RUN_ALL_LAB_SCENARIOS' };

export interface AnalyzeThreadPayload {
  platform: Platform;
  threadId?: string;
  text: string;
  senderHints?: string[];
  url?: string;
  messageChunks?: string[];
}

export interface RegisterThreadContextPayload {
  platform: Platform;
  threadId?: string;
  senderHints?: string[];
}

export type BgResponse =
  | { type: 'ANALYSIS_RESULT'; payload: AnalysisResponse }
  | { type: 'LINK_INSPECT'; payload: DomainInspectResult }
  | { type: 'SETTINGS'; payload: ExtensionSettings }
  | { type: 'DISMISSED' }
  | { type: 'CONNECTION_STATE'; payload: { state: string; lastPongAt: number | null } }
  | { type: 'INCIDENTS_LIST'; payload: IncidentRecord[] }
  | { type: 'EXPORT_READY'; payload: { json: string; html: string; filename: string } }
  | { type: 'ONBOARDING_STATE'; payload: { onboardingCompleted: boolean; practiceCompleted: boolean } }
  | { type: 'SETUP_STATUS'; payload: import('@ase/core').DashboardSetup | null }
  | { type: 'FEEDBACK_READY'; payload: { markdown: string; filename: string } }
  | { type: 'LAB_RUN_RESULT'; payload: DevLabRunResult }
  | { type: 'LAB_SUITE_RESULT'; payload: { results: DevLabRunResult[]; passed: number; total: number } };

export const SETTINGS_STORAGE_KEY = 'aseSettings';
export const DISMISSALS_STORAGE_KEY = 'aseDismissals';
export const CRYPTO_KEY_STORAGE_KEY = 'aseIncidentCryptoKey';
