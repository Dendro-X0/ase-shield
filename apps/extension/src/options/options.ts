import { RULE_IDS, rulePack } from '@ase/rules';

import { downloadBlob } from '../shared/export.js';
import type { ExtensionSettings, IncidentRecord } from '../shared/types.js';

const rulesList = document.getElementById('rules-list')!;
const allowlistEl = document.getElementById('allowlist') as HTMLTextAreaElement;
const overlaysEl = document.getElementById('overlays-enabled') as HTMLInputElement;
const marketplaceOnlyEl = document.getElementById('marketplace-only-scan') as HTMLInputElement;
const jobHintEl = document.getElementById('job-browser-hint') as HTMLInputElement;
const saveBtn = document.getElementById('save-btn')!;
const saveStatus = document.getElementById('save-status')!;
const exportAllBtn = document.getElementById('export-all-btn')!;
const incidentList = document.getElementById('incident-list')!;
const exportStatus = document.getElementById('export-status')!;
const exportFeedbackBtn = document.getElementById('export-feedback-btn')!;
const feedbackStatus = document.getElementById('feedback-status')!;

let loadedSettings: ExtensionSettings = {
  disabledRuleIds: [],
  allowlistedDomains: [],
  showJobBrowserHint: true,
  overlaysEnabled: true,
  marketplaceOnlyScan: true,
  onboardingCompleted: false,
  practiceCompleted: false,
};

function renderRules(disabled: Set<string>): void {
  rulesList.replaceChildren(
    ...rulePack.map((rule) => {
      const label = document.createElement('label');
      label.className = 'rule-row';

      const input = document.createElement('input');
      input.type = 'checkbox';
      input.checked = !disabled.has(rule.id);
      input.dataset.ruleId = rule.id;

      const text = document.createElement('span');
      text.innerHTML = `<strong>${rule.id}</strong> — ${rule.title}`;

      label.append(input, text);
      return label;
    }),
  );
}

function parseAllowlist(raw: string): string[] {
  return raw
    .split('\n')
    .map((line) => line.trim().toLowerCase())
    .filter(Boolean);
}

function collectSettings(): ExtensionSettings {
  const disabledRuleIds = RULE_IDS.filter((id) => {
    const input = rulesList.querySelector<HTMLInputElement>(`input[data-rule-id="${id}"]`);
    return input ? !input.checked : false;
  });

  return {
    disabledRuleIds,
    allowlistedDomains: parseAllowlist(allowlistEl.value),
    showJobBrowserHint: jobHintEl.checked,
    overlaysEnabled: overlaysEl.checked,
    marketplaceOnlyScan: marketplaceOnlyEl.checked,
    onboardingCompleted: loadedSettings.onboardingCompleted,
    practiceCompleted: loadedSettings.practiceCompleted,
  };
}

async function loadSettings(): Promise<void> {
  const response = await chrome.runtime.sendMessage({ type: 'GET_SETTINGS' });
  const settings = response?.payload as ExtensionSettings | undefined;
  if (!settings) return;

  loadedSettings = settings;
  overlaysEl.checked = settings.overlaysEnabled;
  marketplaceOnlyEl.checked = settings.marketplaceOnlyScan;
  jobHintEl.checked = settings.showJobBrowserHint;
  allowlistEl.value = settings.allowlistedDomains.join('\n');
  renderRules(new Set(settings.disabledRuleIds));
}

async function loadIncidents(): Promise<void> {
  const response = await chrome.runtime.sendMessage({ type: 'LIST_INCIDENTS' });
  const incidents = (response?.payload as IncidentRecord[] | undefined) ?? [];

  if (incidents.length === 0) {
    incidentList.replaceChildren();
    const empty = document.createElement('li');
    empty.textContent = 'No incidents recorded yet.';
    incidentList.append(empty);
    return;
  }

  incidentList.replaceChildren(
    ...incidents.slice(0, 10).map((incident) => {
      const li = document.createElement('li');
      li.className = 'incident-row';

      const meta = document.createElement('span');
      meta.textContent = `${new Date(incident.recordedAt).toLocaleString()} · ${incident.level} · ${incident.summary}`;

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = 'Export';
      btn.addEventListener('click', () => {
        void exportIncidents(incident.id);
      });

      li.append(meta, btn);
      return li;
    }),
  );
}

async function exportIncidents(incidentId?: string): Promise<void> {
  exportStatus.textContent = 'Preparing export…';
  const response = await chrome.runtime.sendMessage({
    type: 'EXPORT_INCIDENTS',
    payload: incidentId ? { incidentId } : undefined,
  });

  const payload = response?.payload as
    | { json: string; html: string; filename: string }
    | undefined;

  if (!payload) {
    exportStatus.textContent = 'Export failed.';
    return;
  }

  downloadBlob(`${payload.filename}.json`, payload.json, 'application/json');
  downloadBlob(`${payload.filename}.html`, payload.html, 'text/html');
  exportStatus.textContent = `Exported ${incidentId ? '1 incident' : 'all incidents'}.`;
}

async function save(): Promise<void> {
  const settings = collectSettings();
  await chrome.runtime.sendMessage({ type: 'SAVE_SETTINGS', payload: settings });
  saveStatus.textContent = 'Saved.';
  setTimeout(() => {
    saveStatus.textContent = '';
  }, 2000);
}

saveBtn.addEventListener('click', () => {
  void save();
});

exportAllBtn.addEventListener('click', () => {
  void exportIncidents();
});

async function exportFeedback(): Promise<void> {
  feedbackStatus.textContent = 'Preparing report…';

  const response = await chrome.runtime.sendMessage({
    type: 'EXPORT_FEEDBACK',
    payload: {
      reportType: (document.getElementById('feedback-type') as HTMLSelectElement).value as
        | 'false-positive'
        | 'false-negative'
        | 'other',
      platform: (document.getElementById('feedback-platform') as HTMLInputElement).value,
      threadSummary: (document.getElementById('feedback-summary') as HTMLTextAreaElement).value,
      expectedLevel: (document.getElementById('feedback-expected') as HTMLInputElement).value,
      actualLevel: (document.getElementById('feedback-actual') as HTMLInputElement).value,
      ruleIds: (document.getElementById('feedback-rules') as HTMLInputElement).value,
      notes: (document.getElementById('feedback-notes') as HTMLTextAreaElement).value,
      contactEmail: (document.getElementById('feedback-email') as HTMLInputElement).value,
    },
  });

  const payload = response?.payload as { markdown: string; filename: string } | undefined;
  if (!payload) {
    feedbackStatus.textContent = 'Export failed.';
    return;
  }

  downloadBlob(`${payload.filename}.md`, payload.markdown, 'text/markdown');
  feedbackStatus.textContent = 'Feedback report downloaded.';
}

exportFeedbackBtn.addEventListener('click', () => {
  void exportFeedback();
});

void loadSettings();
void loadIncidents();
