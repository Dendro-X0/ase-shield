import {
  DEV_LAB_LINK_FIXTURES,
  DEV_LAB_SCENARIOS,
  type DevLabRunResult,
  type DevLabScenario,
} from '@ase/core';

const scenarioList = document.getElementById('scenario-list')!;
const platformChrome = document.getElementById('platform-chrome')!;
const platformLabel = document.getElementById('platform-label')!;
const categoryLabel = document.getElementById('category-label')!;
const senderLabel = document.getElementById('sender-label')!;
const scenarioSubtitle = document.getElementById('scenario-subtitle')!;
const messageThread = document.getElementById('message-thread')!;
const linkFixtures = document.getElementById('link-fixtures')!;
const teachingPoint = document.getElementById('teaching-point')!;
const resultPanel = document.getElementById('result-panel')!;
const resultVerdict = document.getElementById('result-verdict')!;
const resultRules = document.getElementById('result-rules')!;
const resultTimeline = document.getElementById('result-timeline')!;
const suiteSummary = document.getElementById('suite-summary')!;
const globalLinkFixtures = document.getElementById('global-link-fixtures')!;

let activeId = DEV_LAB_SCENARIOS[0]?.id ?? '';
const suiteResults = new Map<string, DevLabRunResult>();

function platformLabelFor(platform: DevLabScenario['platform']): string {
  const labels: Record<DevLabScenario['platform'], string> = {
    gmail: 'Gmail',
    linkedin: 'LinkedIn',
    upwork: 'Upwork',
    fiverr: 'Fiverr',
    whatsapp: 'WhatsApp',
    telegram: 'Telegram',
    unknown: 'Unknown',
  };
  return labels[platform];
}

function renderScenarioList(): void {
  scenarioList.replaceChildren(
    ...DEV_LAB_SCENARIOS.map((scenario) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `scenario-btn${scenario.id === activeId ? ' active' : ''}`;
      const run = suiteResults.get(scenario.id);
      if (run) btn.classList.add(run.passed ? 'pass' : 'fail');

      btn.innerHTML = `
        <span class="title">${scenario.title}</span>
        <span class="meta">${scenario.subtitle} · expect ${scenario.expectedLevel}</span>
        ${run ? `<span class="badge">${run.passed ? 'PASS' : 'FAIL'}</span>` : ''}
      `;
      btn.addEventListener('click', () => {
        activeId = scenario.id;
        renderScenarioList();
        renderStage();
        resultPanel.classList.add('hidden');
      });
      return btn;
    }),
  );
}

function renderStage(): void {
  const scenario = DEV_LAB_SCENARIOS.find((item) => item.id === activeId);
  if (!scenario) return;

  platformChrome.className = `platform-chrome ${scenario.platform}`;
  platformLabel.textContent = platformLabelFor(scenario.platform);
  categoryLabel.textContent = scenario.category.replace(/-/g, ' ');
  senderLabel.textContent = scenario.senderLabel;
  scenarioSubtitle.textContent = scenario.subtitle;
  teachingPoint.textContent = scenario.teachingPoint;

  messageThread.replaceChildren(
    ...scenario.messages.map((message) => {
      const div = document.createElement('div');
      div.className = `bubble ${message.role}`;
      div.textContent = message.text;
      return div;
    }),
  );

  if (scenario.links?.length) {
    linkFixtures.classList.remove('hidden');
    linkFixtures.replaceChildren(
      ...scenario.links.map((link) => {
        const anchor = document.createElement('a');
        anchor.href = link.url;
        anchor.textContent = link.label;
        anchor.target = '_blank';
        anchor.rel = 'noopener';
        anchor.addEventListener('click', (event) => {
          event.preventDefault();
          void inspectLink(link.url, anchor);
        });
        return anchor;
      }),
    );
  } else {
    linkFixtures.classList.add('hidden');
    linkFixtures.replaceChildren();
  }
}

async function inspectLink(url: string, anchor: HTMLElement): Promise<void> {
  const response = await chrome.runtime.sendMessage({ type: 'INSPECT_LINK', payload: { url } });
  const payload = response?.payload as { level: string; signals: string[] } | undefined;
  if (!payload) return;

  let note = anchor.nextElementSibling as HTMLElement | null;
  if (!note?.classList.contains('link-inspect-result')) {
    note = document.createElement('span');
    note.className = 'link-inspect-result';
    anchor.insertAdjacentElement('afterend', note);
  }
  note.textContent = `${payload.level}: ${payload.signals[0] ?? 'checked'}`;
}

function renderResult(result: DevLabRunResult): void {
  resultPanel.classList.remove('hidden');
  resultVerdict.className = `verdict ${result.passed ? 'pass' : 'fail'}`;
  resultVerdict.textContent = result.passed
    ? `PASS — ${result.actualLevel} (expected ${result.expectedLevel})`
    : `FAIL — got ${result.actualLevel}, expected ${result.expectedLevel}`;

  resultRules.replaceChildren(
    ...result.hits.map((hit) => {
      const li = document.createElement('li');
      li.textContent = `${hit.ruleId} — ${hit.title}`;
      return li;
    }),
  );

  if (result.timelineLabel) {
    resultTimeline.classList.remove('hidden');
    resultTimeline.textContent = `Timeline: ${result.timelineLabel}`;
  } else {
    resultTimeline.classList.add('hidden');
  }
}

async function runActiveScenario(): Promise<void> {
  const btn = document.getElementById('run-scenario-btn') as HTMLButtonElement;
  btn.disabled = true;
  btn.textContent = 'Analyzing…';

  const response = await chrome.runtime.sendMessage({
    type: 'RUN_LAB_SCENARIO',
    payload: { scenarioId: activeId },
  });

  const result = response?.payload as DevLabRunResult | undefined;
  btn.disabled = false;
  btn.textContent = 'Analyze this thread';

  if (!result) return;
  suiteResults.set(result.scenarioId, result);
  renderResult(result);
  renderScenarioList();
}

async function runAllScenarios(): Promise<void> {
  const btn = document.getElementById('run-all-btn') as HTMLButtonElement;
  btn.disabled = true;
  btn.textContent = 'Running suite…';

  const response = await chrome.runtime.sendMessage({ type: 'RUN_ALL_LAB_SCENARIOS' });
  const payload = response?.payload as
    | { results: DevLabRunResult[]; passed: number; total: number }
    | undefined;

  btn.disabled = false;
  btn.textContent = 'Run all scenarios';

  if (!payload) return;

  for (const result of payload.results) {
    suiteResults.set(result.scenarioId, result);
  }

  suiteSummary.classList.remove('hidden');
  suiteSummary.classList.toggle('all-pass', payload.passed === payload.total);
  suiteSummary.classList.toggle('has-fail', payload.passed !== payload.total);
  suiteSummary.textContent = `Regression suite: ${payload.passed}/${payload.total} passed. Failed scenarios are marked in the list.`;

  const firstFail = payload.results.find((item) => !item.passed);
  if (firstFail) {
    activeId = firstFail.scenarioId;
    renderStage();
    renderResult(firstFail);
  }

  renderScenarioList();
}

function renderGlobalLinks(): void {
  globalLinkFixtures.replaceChildren(
    ...DEV_LAB_LINK_FIXTURES.map((link) => {
      const li = document.createElement('li');
      const anchor = document.createElement('a');
      anchor.href = link.url;
      anchor.textContent = link.label;
      anchor.addEventListener('click', (event) => {
        event.preventDefault();
        void inspectLink(link.url, anchor);
      });
      const expect = document.createElement('span');
      expect.className = 'link-inspect-result';
      expect.textContent = `expected: ${link.expectedLevel}`;
      li.append(anchor, expect);
      return li;
    }),
  );
}

document.getElementById('run-scenario-btn')!.addEventListener('click', () => {
  void runActiveScenario();
});

document.getElementById('run-all-btn')!.addEventListener('click', () => {
  void runAllScenarios();
});

renderScenarioList();
renderStage();
renderGlobalLinks();
