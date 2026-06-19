import { buildFeedbackReportMarkdown, type FeedbackReportDraft } from '@ase/core';

import { loadSettings, saveSettings } from './settings.js';

export async function getOnboardingState(): Promise<{
  onboardingCompleted: boolean;
  practiceCompleted: boolean;
}> {
  const settings = await loadSettings();
  return {
    onboardingCompleted: settings.onboardingCompleted,
    practiceCompleted: settings.practiceCompleted,
  };
}

export async function completeOnboarding(): Promise<void> {
  const settings = await loadSettings();
  await saveSettings({ ...settings, onboardingCompleted: true });
}

export async function completePractice(): Promise<void> {
  const settings = await loadSettings();
  await saveSettings({ ...settings, practiceCompleted: true });
}

export function buildFeedbackExport(draft: FeedbackReportDraft): {
  markdown: string;
  filename: string;
} {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  return {
    markdown: buildFeedbackReportMarkdown(draft),
    filename: `ase-feedback-${stamp}`,
  };
}
