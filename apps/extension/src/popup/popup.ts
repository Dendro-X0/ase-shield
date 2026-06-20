import {
  connectionTroubleshootingSteps,
  DASHBOARD_URL,
  SETUP_CHECKLIST,
  type ConnectionState,
  type DashboardSetup,
} from '@ase/core';

const indicator = document.getElementById('connection-indicator')!;
const label = document.getElementById('connection-label')!;
const detail = document.getElementById('connection-detail')!;
const refreshBtn = document.getElementById('refresh-btn')!;
const setupSection = document.getElementById('setup-section')!;
const setupList = document.getElementById('setup-list')!;
const troubleshootSection = document.getElementById('troubleshoot-section')!;
const troubleshootList = document.getElementById('troubleshoot-list')!;

const LABELS: Record<ConnectionState, string> = {
  connected: 'Connected',
  disconnected: 'Disconnected',
  unknown: 'Unknown',
};

const DETAILS: Record<ConnectionState, string> = {
  connected: 'Desktop companion is running on this device.',
  disconnected: 'Start the Anti-SE companion app on Windows.',
  unknown: 'Waiting for first connection check…',
};

function renderTroubleshooting(show: boolean): void {
  troubleshootSection.hidden = !show;
  if (!show) return;

  troubleshootList.replaceChildren(
    ...connectionTroubleshootingSteps('extension-disconnected').map((line) => {
      const li = document.createElement('li');
      li.textContent = line;
      return li;
    }),
  );
}

function renderSetup(setup: DashboardSetup | null, connectionState: ConnectionState): void {
  const practiceDone = setup?.hasPracticeScan ?? false;
  const companionConnected = connectionState === 'connected' || setup?.extensionConnected === true;
  const hasActivity = setup?.hasActivity ?? false;
  const showSetup = !practiceDone;

  setupSection.hidden = !showSetup;
  if (!showSetup) return;

  const states = {
    companion: companionConnected,
    practice: practiceDone,
    dashboard: hasActivity,
  };

  setupList.replaceChildren(
    ...SETUP_CHECKLIST.map((item) => {
      const done = states[item.id as keyof typeof states];
      const li = document.createElement('li');
      li.className = done ? 'done' : 'pending';
      const strong = document.createElement('strong');
      strong.textContent = item.label;
      const span = document.createElement('span');
      span.textContent = done ? item.hintConnected : item.hintPending;
      li.append(strong, span);
      return li;
    }),
  );
}

function render(state: ConnectionState, lastPongAt: number | null, setup: DashboardSetup | null): void {
  indicator.className = `indicator ${state}`;
  label.textContent = LABELS[state];
  detail.textContent =
    lastPongAt !== null && state === 'connected'
      ? `${DETAILS.connected} Last seen ${new Date(lastPongAt).toLocaleTimeString()}.`
      : DETAILS[state];

  renderSetup(setup, state);
  renderTroubleshooting(state !== 'connected');
}

async function fetchSetup(): Promise<DashboardSetup | null> {
  const response = await chrome.runtime.sendMessage({ type: 'GET_SETUP_STATUS' });
  return (response?.payload as DashboardSetup | null | undefined) ?? null;
}

async function refresh(): Promise<void> {
  const [connectionResponse, setup] = await Promise.all([
    chrome.runtime.sendMessage({ type: 'GET_CONNECTION_STATE' }),
    fetchSetup(),
  ]);
  const payload = connectionResponse?.payload as
    | { state: ConnectionState; lastPongAt: number | null }
    | undefined;
  if (!payload) return;
  render(payload.state, payload.lastPongAt ?? null, setup);
}

refreshBtn.addEventListener('click', () => {
  void chrome.runtime.sendMessage({ type: 'PING_COMPANION_NOW' }).then(refresh);
});

const dashboardLink = document.getElementById('dashboard-link') as HTMLAnchorElement;
dashboardLink.href = DASHBOARD_URL;

void refresh();
setInterval(() => {
  void refresh();
}, 3000);
