import type { AnalysisResult, TimelineInsight } from '@ase/core';

const OVERLAY_ID = 'ase-shield-root';

const LEVEL_LABELS: Record<AnalysisResult['level'], string> = {
  safe: 'Looks OK',
  caution: 'Caution',
  'high-risk': 'High risk',
};

export interface OverlayInsights {
  timeline?: TimelineInsight;
  contactWarnings?: string[];
}

export class ThreadOverlay {
  private host: HTMLElement | null = null;
  private shadow: ShadowRoot | null = null;
  private panelOpen = false;

  mount(target: HTMLElement): void {
    if (this.host) this.host.remove();

    this.host = document.createElement('div');
    this.host.id = OVERLAY_ID;
    this.shadow = this.host.attachShadow({ mode: 'open' });

    const style = document.createElement('style');
    style.textContent = OVERLAY_CSS;
    this.shadow.append(style);

    const container = document.createElement('div');
    container.className = 'ase-wrap';
    container.innerHTML = `
      <button type="button" class="ase-badge safe" aria-expanded="false" aria-label="Anti-SE Shield status">
        <span class="ase-dot"></span>
        <span class="ase-label">Checking…</span>
      </button>
      <div class="ase-panel hidden" role="dialog" aria-label="Risk details">
        <header class="ase-panel-head">
          <strong class="ase-panel-title">Why?</strong>
          <button type="button" class="ase-close" aria-label="Close">×</button>
        </header>
        <p class="ase-timeline hidden"></p>
        <ul class="ase-contact hidden"></ul>
        <ul class="ase-bullets"></ul>
        <p class="ase-next"></p>
        <button type="button" class="ase-dismiss">Not a scam — dismiss for this thread</button>
      </div>
    `;
    this.shadow.append(container);

    target.style.position = target.style.position || 'relative';
    target.append(this.host);

    const badge = container.querySelector('.ase-badge') as HTMLButtonElement;
    const panel = container.querySelector('.ase-panel') as HTMLElement;
    const closeBtn = container.querySelector('.ase-close') as HTMLButtonElement;

    badge.addEventListener('click', () => {
      this.panelOpen = !this.panelOpen;
      panel.classList.toggle('hidden', !this.panelOpen);
      badge.setAttribute('aria-expanded', String(this.panelOpen));
    });

    closeBtn.addEventListener('click', () => {
      this.panelOpen = false;
      panel.classList.add('hidden');
      badge.setAttribute('aria-expanded', 'false');
    });
  }

  render(result: AnalysisResult, insights: OverlayInsights, onDismiss: () => void): void {
    if (!this.shadow) return;

    const badge = this.shadow.querySelector('.ase-badge') as HTMLButtonElement;
    const label = this.shadow.querySelector('.ase-label') as HTMLElement;
    const panel = this.shadow.querySelector('.ase-panel') as HTMLElement;
    const timelineEl = this.shadow.querySelector('.ase-timeline') as HTMLElement;
    const contactEl = this.shadow.querySelector('.ase-contact') as HTMLUListElement;
    const bullets = this.shadow.querySelector('.ase-bullets') as HTMLUListElement;
    const next = this.shadow.querySelector('.ase-next') as HTMLElement;
    const dismissBtn = this.shadow.querySelector('.ase-dismiss') as HTMLButtonElement;

    badge.className = `ase-badge ${result.level}`;
    label.textContent = LEVEL_LABELS[result.level];

    const timeline = insights.timeline;
    if (timeline && timeline.stages.some((s) => s !== 'normal')) {
      timelineEl.textContent = `Pattern: ${timeline.escalationLabel}`;
      timelineEl.classList.remove('hidden');
    } else {
      timelineEl.classList.add('hidden');
    }

    const contactWarnings = insights.contactWarnings ?? [];
    if (contactWarnings.length > 0) {
      contactEl.replaceChildren(
        ...contactWarnings.map((warning) => {
          const li = document.createElement('li');
          li.textContent = warning;
          return li;
        }),
      );
      contactEl.classList.remove('hidden');
    } else {
      contactEl.classList.add('hidden');
    }

    if (result.level === 'safe') {
      panel.classList.add('hidden');
      this.panelOpen = false;
      badge.setAttribute('aria-expanded', 'false');
      return;
    }

    const topHits = result.hits.slice(0, 3);
    bullets.replaceChildren(
      ...topHits.map((hit) => {
        const li = document.createElement('li');
        li.textContent = hit.why;
        return li;
      }),
    );

    const actions = topHits.map((hit) => hit.whatToDo).filter(Boolean);
    next.textContent = actions[0] ?? 'Pause and verify before clicking links or sharing credentials.';

    dismissBtn.onclick = () => {
      onDismiss();
      this.render(
        { level: 'safe', hits: [], analyzedAt: result.analyzedAt },
        insights,
        onDismiss,
      );
    };
  }

  destroy(): void {
    this.host?.remove();
    this.host = null;
    this.shadow = null;
  }
}

const OVERLAY_CSS = `
  :host { all: initial; }
  .ase-wrap {
    position: absolute;
    top: 12px;
    right: 12px;
    z-index: 2147483646;
    font-family: system-ui, -apple-system, Segoe UI, sans-serif;
    font-size: 13px;
    line-height: 1.4;
  }
  .ase-badge {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    border: 1px solid #2a3648;
    border-radius: 999px;
    padding: 8px 12px;
    background: #1a2332;
    color: #e7ecf3;
    cursor: pointer;
    box-shadow: 0 4px 16px rgba(0,0,0,0.25);
  }
  .ase-badge.safe { border-color: #166534; }
  .ase-badge.caution { border-color: #a16207; }
  .ase-badge.high-risk { border-color: #b91c1c; }
  .ase-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: #22c55e;
  }
  .ase-badge.caution .ase-dot { background: #eab308; }
  .ase-badge.high-risk .ase-dot { background: #ef4444; }
  .ase-panel {
    margin-top: 8px;
    width: min(320px, 90vw);
    background: #0f1419;
    border: 1px solid #2a3648;
    border-radius: 12px;
    padding: 12px;
    color: #e7ecf3;
    box-shadow: 0 8px 24px rgba(0,0,0,0.35);
  }
  .ase-panel.hidden { display: none; }
  .ase-panel-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
  }
  .ase-close {
    border: none;
    background: transparent;
    color: #9aa7b8;
    font-size: 18px;
    cursor: pointer;
  }
  .ase-timeline {
    margin: 0 0 8px;
    font-size: 12px;
    color: #fbbf24;
  }
  .ase-timeline.hidden { display: none; }
  .ase-contact {
    margin: 0 0 8px;
    padding-left: 18px;
    font-size: 12px;
    color: #fca5a5;
  }
  .ase-contact.hidden { display: none; }
  .ase-bullets {
    margin: 0 0 8px;
    padding-left: 18px;
  }
  .ase-bullets li { margin-bottom: 4px; }
  .ase-next {
    margin: 0 0 10px;
    color: #93c5fd;
    font-size: 12px;
  }
  .ase-dismiss {
    width: 100%;
    border: 1px solid #374151;
    border-radius: 8px;
    padding: 8px;
    background: transparent;
    color: #9aa7b8;
    cursor: pointer;
    font-size: 12px;
  }
  .ase-dismiss:hover { background: #1f2937; }
`;
