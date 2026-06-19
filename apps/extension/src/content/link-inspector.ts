import type { DomainInspectResult } from '../shared/types.js';

const TOOLTIP_ID = 'ase-link-tooltip';

let hoverTimer: ReturnType<typeof setTimeout> | null = null;
let tooltipEl: HTMLElement | null = null;

export function attachLinkInspector(root: ParentNode = document.body): () => void {
  const onOver = (event: Event) => {
    const target = (event.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
    if (!target?.href || !target.href.startsWith('http')) return;

    if (hoverTimer) clearTimeout(hoverTimer);
    hoverTimer = setTimeout(() => {
      void showTooltip(target.href, target);
    }, 280);
  };

  const onOut = () => {
    if (hoverTimer) clearTimeout(hoverTimer);
    hideTooltip();
  };

  root.addEventListener('mouseover', onOver, true);
  root.addEventListener('mouseout', onOut, true);

  return () => {
    root.removeEventListener('mouseover', onOver, true);
    root.removeEventListener('mouseout', onOut, true);
    hideTooltip();
  };
}

async function showTooltip(url: string, anchor: HTMLElement): Promise<void> {
  const response = await chrome.runtime.sendMessage({ type: 'INSPECT_LINK', payload: { url } });
  const inspection = response?.payload as DomainInspectResult | null | undefined;
  if (!inspection) return;

  hideTooltip();
  tooltipEl = document.createElement('div');
  tooltipEl.id = TOOLTIP_ID;
  tooltipEl.setAttribute('role', 'tooltip');

  const rect = anchor.getBoundingClientRect();
  tooltipEl.style.cssText = `
    position: fixed;
    left: ${Math.min(rect.left, window.innerWidth - 280)}px;
    top: ${rect.bottom + 6}px;
    z-index: 2147483647;
    max-width: 280px;
    padding: 10px 12px;
    border-radius: 10px;
    background: #0f1419;
    border: 1px solid ${inspection.level === 'high-risk' ? '#b91c1c' : inspection.level === 'caution' ? '#a16207' : '#2a3648'};
    color: #e7ecf3;
    font: 12px/1.4 system-ui, sans-serif;
    box-shadow: 0 8px 24px rgba(0,0,0,0.35);
    pointer-events: none;
  `;

  const title = document.createElement('strong');
  title.textContent = inspection.hostname;
  tooltipEl.append(title);

  const list = document.createElement('ul');
  list.style.cssText = 'margin: 6px 0 0; padding-left: 16px;';
  for (const signal of inspection.signals.slice(0, 3)) {
    const li = document.createElement('li');
    li.textContent = signal;
    list.append(li);
  }
  tooltipEl.append(list);

  document.body.append(tooltipEl);
}

function hideTooltip(): void {
  tooltipEl?.remove();
  tooltipEl = null;
}
