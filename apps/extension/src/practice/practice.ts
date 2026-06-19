import { PRACTICE_THREAD } from '@ase/core';

import type { AnalysisResponse } from '../shared/types.js';

const senderLabel = document.getElementById('sender-label')!;
const messagesEl = document.getElementById('messages')!;
const analyzeBtn = document.getElementById('analyze-btn') as HTMLButtonElement;
const resultSection = document.getElementById('result-section')!;
const resultLevel = document.getElementById('result-level')!;
const resultRules = document.getElementById('result-rules')!;
const resultHint = document.getElementById('result-hint')!;
const completeBtn = document.getElementById('complete-btn') as HTMLButtonElement;

senderLabel.textContent = PRACTICE_THREAD.senderLabel;
messagesEl.replaceChildren(
  ...PRACTICE_THREAD.messageChunks.map((chunk) => {
    const p = document.createElement('p');
    p.className = 'message';
    p.textContent = chunk;
    return p;
  }),
);

analyzeBtn.addEventListener('click', () => {
  void runAnalysis();
});

completeBtn.addEventListener('click', () => {
  void chrome.runtime.sendMessage({ type: 'COMPLETE_PRACTICE' }).then(() => window.close());
});

async function runAnalysis(): Promise<void> {
  analyzeBtn.disabled = true;
  analyzeBtn.textContent = 'Analyzing…';

  const response = await chrome.runtime.sendMessage({
    type: 'ANALYZE_THREAD',
    payload: {
      platform: PRACTICE_THREAD.platform,
      threadId: PRACTICE_THREAD.threadId,
      text: PRACTICE_THREAD.text,
      messageChunks: PRACTICE_THREAD.messageChunks,
      senderHints: [PRACTICE_THREAD.senderLabel],
    },
  });

  const payload = response?.payload as AnalysisResponse | undefined;
  analyzeBtn.disabled = false;
  analyzeBtn.textContent = 'Analyze again';

  if (!payload?.result) {
    resultHint.textContent = 'Analysis failed. Try again.';
    resultSection.hidden = false;
    return;
  }

  const { result } = payload;
  resultSection.hidden = false;
  resultLevel.textContent = `Risk level: ${result.level}`;
  resultLevel.className = `level ${result.level}`;

  resultRules.replaceChildren(
    ...result.hits.map((hit) => {
      const li = document.createElement('li');
      li.textContent = `${hit.ruleId} — ${hit.title}`;
      return li;
    }),
  );

  const matchedExpected = result.level === PRACTICE_THREAD.expectedLevel;
  resultHint.replaceChildren();
  const hintText = document.createElement('span');
  hintText.textContent = matchedExpected
    ? 'Good catch — this thread matches the high-risk patterns we expect in real scams.'
    : `Expected ${PRACTICE_THREAD.expectedLevel}. Review the rules above; your rule pack may differ slightly.`;
  resultHint.append(hintText);

  if (matchedExpected) {
    const dash = document.createElement('a');
    dash.className = 'dashboard-link';
    dash.href = 'http://127.0.0.1:47123/';
    dash.target = '_blank';
    dash.rel = 'noopener noreferrer';
    dash.textContent = 'Open dashboard to see this practice scan in Recent activity →';
    resultHint.append(document.createElement('br'), dash);
  }
}
