import {
  COMPANION_IPC_ORIGIN,
  type DashboardSetup,
} from '@ase/core';

import {
  getConnectionState,
  getLastPongAt,
  loadLastPong,
  pingCompanion,
  startPingLoop,
  stopPingLoop,
  COMPANION_CONNECTION_TIMEOUT_MS,
} from './companion.js';
import {
  getSettings,
  inspectLink,
  runThreadAnalysis,
  updateSettings,
} from './analysis.js';
import { registerDownloadListener, setActiveThread } from './downloads.js';
import { runAllLabScenarios, runLabScenario } from './lab-runner.js';
import { syncThreadContextToCompanion } from './thread-context.js';
import { dismissThread } from '../shared/dismissals.js';
import { buildExportHtml, buildExportJson } from '../shared/export.js';
import { listIncidents } from '../shared/incident-log.js';
import {
  buildFeedbackExport,
  completeOnboarding,
  completePractice,
  getOnboardingState,
} from '../shared/onboarding-state.js';
import type { BgRequest } from '../shared/types.js';

chrome.runtime.onInstalled.addListener((details) => {
  void loadLastPong().then(startPingLoop);

  if (details.reason === 'install') {
    void getOnboardingState().then(({ onboardingCompleted }) => {
      if (!onboardingCompleted) {
        void chrome.tabs.create({
          url: chrome.runtime.getURL('src/onboarding/onboarding.html'),
        });
      }
    });
  }
});

chrome.runtime.onStartup.addListener(() => {
  void loadLastPong().then(startPingLoop);
});

void loadLastPong().then(startPingLoop);
registerDownloadListener();

chrome.runtime.onMessage.addListener((message: BgRequest, _sender, sendResponse) => {
  const handle = async () => {
    switch (message.type) {
      case 'ANALYZE_THREAD': {
        setActiveThread({
          platform: message.payload.platform,
          threadId: message.payload.threadId,
          senderLabel: message.payload.senderHints?.[0],
        });
        return { type: 'ANALYSIS_RESULT', payload: await runThreadAnalysis(message.payload) };
      }
      case 'REGISTER_THREAD_CONTEXT': {
        setActiveThread({
          platform: message.payload.platform,
          threadId: message.payload.threadId,
          senderLabel: message.payload.senderHints?.[0],
        });
        await syncThreadContextToCompanion({
          platform: message.payload.platform,
          threadId: message.payload.threadId,
          senderLabel: message.payload.senderHints?.[0],
          level: 'safe',
        });
        return { type: 'DISMISSED' };
      }
      case 'INSPECT_LINK':
        return {
          type: 'LINK_INSPECT',
          payload: await inspectLink(message.payload.url),
        };
      case 'DISMISS_THREAD':
        await dismissThread(message.payload.platform, message.payload.threadId);
        return { type: 'DISMISSED' };
      case 'GET_SETTINGS':
        return { type: 'SETTINGS', payload: await getSettings() };
      case 'SAVE_SETTINGS':
        await updateSettings(message.payload);
        return { type: 'SETTINGS', payload: message.payload };
      case 'LIST_INCIDENTS':
        return { type: 'INCIDENTS_LIST', payload: await listIncidents() };
      case 'EXPORT_INCIDENTS': {
        const all = await listIncidents();
        const incidents = message.payload?.incidentId
          ? all.filter((item) => item.id === message.payload?.incidentId)
          : all;
        const stamp = new Date().toISOString().replace(/[:.]/g, '-');
        return {
          type: 'EXPORT_READY',
          payload: {
            json: buildExportJson(incidents),
            html: buildExportHtml(incidents),
            filename: `ase-incidents-${stamp}`,
          },
        };
      }
      case 'GET_CONNECTION_STATE':
        return {
          type: 'CONNECTION_STATE',
          payload: {
            state: getConnectionState(),
            lastPongAt: getLastPongAt(),
            timeoutMs: COMPANION_CONNECTION_TIMEOUT_MS,
          },
        };
      case 'PING_COMPANION_NOW':
        await pingCompanion();
        return {
          type: 'CONNECTION_STATE',
          payload: {
            state: getConnectionState(),
            lastPongAt: getLastPongAt(),
            timeoutMs: COMPANION_CONNECTION_TIMEOUT_MS,
          },
        };
      case 'GET_ONBOARDING_STATE':
        return { type: 'ONBOARDING_STATE', payload: await getOnboardingState() };
      case 'COMPLETE_ONBOARDING':
        await completeOnboarding();
        return { type: 'ONBOARDING_STATE', payload: await getOnboardingState() };
      case 'COMPLETE_PRACTICE':
        await completePractice();
        return { type: 'ONBOARDING_STATE', payload: await getOnboardingState() };
      case 'GET_SETUP_STATUS': {
        try {
          const response = await fetch(`${COMPANION_IPC_ORIGIN}/api/setup`);
          if (!response.ok) {
            return { type: 'SETUP_STATUS', payload: null };
          }
          const payload = (await response.json()) as DashboardSetup;
          return { type: 'SETUP_STATUS', payload };
        } catch {
          return { type: 'SETUP_STATUS', payload: null };
        }
      }
      case 'EXPORT_FEEDBACK': {
        const payload = buildFeedbackExport(message.payload);
        return { type: 'FEEDBACK_READY', payload };
      }
      case 'RUN_LAB_SCENARIO': {
        const result = await runLabScenario(message.payload.scenarioId);
        return { type: 'LAB_RUN_RESULT', payload: result };
      }
      case 'RUN_ALL_LAB_SCENARIOS': {
        const results = await runAllLabScenarios();
        const passed = results.filter((item) => item.passed).length;
        return { type: 'LAB_SUITE_RESULT', payload: { results, passed, total: results.length } };
      }
      default:
        return null;
    }
  };

  void handle().then(sendResponse);
  return true;
});

self.addEventListener('unload', () => {
  stopPingLoop();
});
