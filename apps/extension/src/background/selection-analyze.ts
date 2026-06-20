import type { AnalysisResponse } from '../shared/types.js';
import { runThreadAnalysis } from './analysis.js';

const MENU_ID = 'ase-analyze-selection';

const LEVEL_COLORS: Record<string, string> = {
  safe: '#22c55e',
  caution: '#eab308',
  'high-risk': '#ef4444',
};

const LEVEL_LABELS: Record<string, string> = {
  safe: 'Looks OK',
  caution: 'Caution',
  'high-risk': 'High risk',
};

export function registerSelectionAnalyzeMenu(): void {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: MENU_ID,
      title: 'Analyze selection with Anti-SE Shield',
      contexts: ['selection'],
    });
  });
}

export function listenSelectionAnalyze(): void {
  chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId !== MENU_ID || !tab?.id || !info.selectionText?.trim()) return;
    void analyzeAndShow(tab.id, info.selectionText.trim(), tab.url ?? '');
  });
}

async function analyzeAndShow(tabId: number, text: string, pageUrl: string): Promise<void> {
  try {
    const payload = {
      platform: 'unknown' as const,
      threadId: `selection:${pageUrl}:${text.length}`,
      text,
      url: pageUrl,
    };
    const response = await runThreadAnalysis(payload);
    await chrome.scripting.executeScript({
      target: { tabId },
      func: injectSelectionResult,
      args: [response, LEVEL_COLORS, LEVEL_LABELS],
    });
  } catch {
    await chrome.scripting.executeScript({
      target: { tabId },
      func: injectSelectionError,
    });
  }
}

function injectSelectionResult(
  response: AnalysisResponse,
  levelColors: Record<string, string>,
  levelLabels: Record<string, string>,
): void {
  const existing = document.getElementById('ase-selection-result');
  existing?.remove();

  const { result } = response;
  const level = result.level;
  const color = levelColors[level] ?? '#94a3b8';
  const label = levelLabels[level] ?? level;

  const host = document.createElement('div');
  host.id = 'ase-selection-result';
  host.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    z-index: 2147483647;
    width: min(360px, calc(100vw - 32px));
    font: 13px/1.45 system-ui, sans-serif;
    color: #e2e8f0;
    background: #0f172a;
    border: 1px solid #334155;
    border-radius: 12px;
    box-shadow: 0 12px 40px rgba(0,0,0,0.45);
    overflow: hidden;
  `;

  const hits = result.hits.slice(0, 5);
  const bullets =
    hits.length > 0
      ? hits.map((hit) => `<li>${escapeHtml(hit.title)}</li>`).join('')
      : '<li>No scam patterns detected in this selection.</li>';

  host.innerHTML = `
    <div style="display:flex;align-items:center;gap:8px;padding:12px 14px;border-bottom:1px solid #334155;">
      <span style="width:10px;height:10px;border-radius:50%;background:${color};flex-shrink:0;"></span>
      <strong style="flex:1;">${escapeHtml(label)}</strong>
      <button type="button" aria-label="Close" style="background:none;border:none;color:#94a3b8;font-size:18px;cursor:pointer;line-height:1;">×</button>
    </div>
    <ul style="margin:0;padding:12px 18px 14px;list-style:disc;">${bullets}</ul>
    <p style="margin:0;padding:0 14px 12px;color:#64748b;font-size:11px;">Analyzed locally · Anti-SE Shield</p>
  `;

  host.querySelector('button')?.addEventListener('click', () => host.remove());
  document.body.append(host);

  window.setTimeout(() => host.remove(), 18_000);
}

function injectSelectionError(): void {
  const host = document.createElement('div');
  host.id = 'ase-selection-result';
  host.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    z-index: 2147483647;
    padding: 12px 16px;
    font: 13px system-ui, sans-serif;
    color: #fecaca;
    background: #450a0a;
    border: 1px solid #991b1b;
    border-radius: 8px;
  `;
  host.textContent = 'Anti-SE Shield could not analyze this selection.';
  document.body.append(host);
  window.setTimeout(() => host.remove(), 6000);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
