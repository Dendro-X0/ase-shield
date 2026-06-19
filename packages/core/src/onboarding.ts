/** Practice mode — safe fake scam thread for onboarding (M8). */

import { DEV_LAB_SCENARIOS, PRACTICE_THREAD_ID } from './dev-lab.js';

export { PRACTICE_THREAD_ID };

const practiceScenario = DEV_LAB_SCENARIOS.find((s) => s.id === 'practice-hiring-scam')!;

export const PRACTICE_THREAD = {
  platform: practiceScenario.platform,
  threadId: PRACTICE_THREAD_ID,
  senderLabel: practiceScenario.senderLabel,
  messageChunks: practiceScenario.analysis.messageChunks ?? [],
  text: practiceScenario.analysis.text ?? '',
  expectedLevel: practiceScenario.expectedLevel,
  expectedRuleIds: practiceScenario.expectedRuleIds,
};

export const PRACTICE_SCENARIO =
  'A fake recruiter asks for AnyDesk and off-platform payment — the same pattern real scams use.';

export interface FeedbackReportDraft {
  reportType: 'false-positive' | 'false-negative' | 'other';
  platform: string;
  threadSummary: string;
  expectedLevel: string;
  actualLevel: string;
  ruleIds: string;
  notes: string;
  contactEmail: string;
}

export function buildFeedbackReportMarkdown(draft: FeedbackReportDraft): string {
  const stamp = new Date().toISOString();
  return `# Anti-SE Shield feedback report

Generated locally on your device (${stamp}). Copy this file into email or a support ticket — nothing is sent automatically.

## Report type
${draft.reportType}

## Context
- Platform: ${draft.platform || '—'}
- Thread summary: ${draft.threadSummary || '—'}

## Classification
- Expected level: ${draft.expectedLevel || '—'}
- Actual level: ${draft.actualLevel || '—'}
- Rules involved: ${draft.ruleIds || '—'}

## Notes
${draft.notes || '—'}

## Optional contact (only if you choose to share this file)
${draft.contactEmail || '—'}
`;
}
