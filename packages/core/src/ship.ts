import { DASHBOARD_URL } from './dashboard.js';
import { COMPANION_DOWNLOAD_URL, EXTENSION_DOWNLOAD_URL, PRIVACY_POLICY_URL } from './repo.js';

export {
  COMPANION_DOWNLOAD_URL,
  EXTENSION_DOWNLOAD_URL,
  GITHUB_CI_URL,
  GITHUB_REPO,
  GITHUB_PAGES_BASE,
  GITHUB_RELEASES_URL,
  GITHUB_RELEASE_LATEST_URL,
  GITHUB_ISSUES_URL,
  PRIVACY_POLICY_URL,
  RELEASE_VERSION,
} from './repo.js';

/** Update when Chrome Web Store listing is approved. */
export const CHROME_WEB_STORE_LISTING_URL =
  'https://chrome.google.com/webstore/search/anti-se%20shield' as const;

/** Update when Edge Add-ons listing is approved. */
export const EDGE_ADDONS_LISTING_URL =
  'https://microsoftedge.microsoft.com/addons/search/anti-se%20shield' as const;

export const PRIVACY_POLICY_PATH = 'privacy.html' as const;

export {
  COMPANION_OFFLINE_STEPS,
  CONNECTION_TROUBLESHOOTING,
  connectionTroubleshootingSteps,
  EXTENSION_DISCONNECTED_STEPS,
  type ConnectionIssueKind,
} from './connection.js';

export interface OnboardingLink {
  label: string;
  href: string;
  external?: boolean;
}

export interface OnboardingStep {
  title: string;
  body: string;
  links?: OnboardingLink[];
}

export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    title: 'Welcome to Anti-SE Shield',
    body: 'This extension warns you about common freelance and B2B scam patterns before you trust a client or open a risky file. Everything runs on your device — no cloud uploads.',
  },
  {
    title: 'Install the extension',
    body: 'Install from GitHub Releases (zip) until the browser store listing is live. Keep the extension pinned. On Gmail, LinkedIn, and Upwork, a badge appears when patterns look risky.',
    links: [
      { label: 'Download extension (zip)', href: EXTENSION_DOWNLOAD_URL, external: true },
      { label: 'Chrome Web Store (coming soon)', href: CHROME_WEB_STORE_LISTING_URL, external: true },
      { label: 'Microsoft Edge Add-ons (coming soon)', href: EDGE_ADDONS_LISTING_URL, external: true },
    ],
  },
  {
    title: 'Install the Windows companion',
    body: 'For download quarantine, safe file opening, remote-session guard, and recovery tools, install Anti-SE Companion on Windows. It talks to this extension over localhost only (127.0.0.1).',
    links: [
      { label: 'Download companion (Windows)', href: COMPANION_DOWNLOAD_URL, external: true },
      { label: 'Open web dashboard', href: DASHBOARD_URL, external: true },
    ],
  },
  {
    title: 'Prove it works (2 minutes)',
    body: 'Run practice mode on a safe fake scam thread, then open the dashboard — you should see a high-risk practice row in Recent activity. That is your proof the shield and companion are linked.',
    links: [
      { label: 'Open practice mode', href: '../practice/practice.html' },
      { label: 'Open dashboard', href: DASHBOARD_URL, external: true },
    ],
  },
  {
    title: 'Your privacy',
    body: 'No telemetry. No cloud uploads. Incident logs stay encrypted on this device. You can export them yourself if you need platform support.',
    links: [{ label: 'Privacy policy', href: PRIVACY_POLICY_URL, external: true }],
  },
];

export const SETUP_CHECKLIST = [
  {
    id: 'companion',
    label: 'Companion connected',
    hintConnected: 'Popup shows Connected.',
    hintPending: 'Install and start Anti-SE Companion, then click Check now.',
  },
  {
    id: 'practice',
    label: 'Run practice scan',
    hintConnected: 'Practice row appears on the dashboard.',
    hintPending: 'Open Practice → Analyze this thread.',
  },
  {
    id: 'dashboard',
    label: 'Proof on dashboard',
    hintConnected: 'Recent activity shows your practice scan.',
    hintPending: `Open ${DASHBOARD_URL} after practice.`,
  },
] as const;
