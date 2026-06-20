import type { Platform, RiskLevel } from './analysis.js';

export const PRACTICE_THREAD_ID = 'ase-practice-mode';
export const DEV_LAB_THREAD_PREFIX = 'ase-dev-lab-';
/** Extension page path (relative to extension root) for Dev Lab UI. */
export const DEV_LAB_PAGE_PATH = 'src/dev-lab/dev-lab.html' as const;

export function buildDevLabUrl(extensionId: string): string {
  return `chrome-extension://${extensionId}/${DEV_LAB_PAGE_PATH}`;
}

export type DevLabCategory =
  | 'hiring-scam'
  | 'payment-fraud'
  | 'credential-phish'
  | 'off-platform'
  | 'malicious-file'
  | 'suspicious-link'
  | 'benign-control';

export interface DevLabMessage {
  role: 'them' | 'you';
  text: string;
}

export interface DevLabLink {
  label: string;
  url: string;
  expectedLevel: RiskLevel;
  expectedSignals?: string[];
}

export interface DevLabScenario {
  id: string;
  title: string;
  subtitle: string;
  platform: Platform;
  category: DevLabCategory;
  senderLabel: string;
  messages: DevLabMessage[];
  links?: DevLabLink[];
  analysis: {
    text: string;
    messageChunks?: string[];
    senderHints?: string[];
  };
  expectedLevel: RiskLevel;
  expectedRuleIds: string[];
  /** Plain-language outcome for testers */
  teachingPoint: string;
}

export interface DevLabRunResult {
  scenarioId: string;
  title: string;
  expectedLevel: RiskLevel;
  actualLevel: RiskLevel;
  expectedRuleIds: string[];
  actualRuleIds: string[];
  passed: boolean;
  ruleMatch: boolean;
  levelMatch: boolean;
  hits: Array<{ ruleId: string; title: string }>;
  timelineLabel?: string;
}

function threadIdFor(scenarioId: string): string {
  return scenarioId === 'practice-hiring-scam'
    ? PRACTICE_THREAD_ID
    : `${DEV_LAB_THREAD_PREFIX}${scenarioId}`;
}

export function devLabThreadId(scenarioId: string): string {
  return threadIdFor(scenarioId);
}

export function isDevLabThreadId(threadId?: string): boolean {
  if (!threadId) return false;
  return threadId === PRACTICE_THREAD_ID || threadId.startsWith(DEV_LAB_THREAD_PREFIX);
}

export const DEV_LAB_SCENARIOS: DevLabScenario[] = [
  {
    id: 'practice-hiring-scam',
    title: 'Fake recruiter + remote access',
    subtitle: 'LinkedIn hiring thread',
    platform: 'linkedin',
    category: 'hiring-scam',
    senderLabel: 'Alex Morgan — Talent Acquisition',
    messages: [
      { role: 'them', text: 'Hi! Your portfolio looks great for our remote contract role.' },
      {
        role: 'them',
        text: 'Before we schedule the technical interview, please install AnyDesk so we can pair on a sample task.',
      },
      {
        role: 'them',
        text: 'We also need a quick identity check — use our secure payment portal instead of Upwork escrow and pay in USDT to our preferred wallet.',
      },
    ],
    analysis: {
      text: `Hi! Your portfolio looks great for our remote contract role.

Before we schedule the technical interview, please install AnyDesk so we can pair on a sample task.

We also need a quick identity check — use our secure payment portal instead of Upwork escrow and pay in USDT to our preferred wallet.`,
      messageChunks: [
        'Hi! Your portfolio looks great for our remote contract role.',
        'Before we schedule the technical interview, please install AnyDesk so we can pair on a sample task.',
        'We also need a quick identity check — use our secure payment portal instead of Upwork escrow and pay in USDT to our preferred wallet.',
      ],
      senderHints: ['Alex Morgan — Talent Acquisition'],
    },
    expectedLevel: 'high-risk',
    expectedRuleIds: ['R04', 'R05', 'R07'],
    teachingPoint:
      'Real scams combine remote-access tools with payment redirection before you have a verified employer.',
  },
  {
    id: 'upwork-telegram-pivot',
    title: 'Move chat off Upwork',
    subtitle: 'Marketplace → Telegram',
    platform: 'upwork',
    category: 'off-platform',
    senderLabel: 'New Client — unverified',
    messages: [
      { role: 'them', text: 'Great portfolio! Let us move to Telegram to discuss the contract faster.' },
      { role: 'them', text: 'I will send the NDA and payment details there — Upwork is too slow.' },
    ],
    analysis: {
      text: 'Great portfolio! Let us move to Telegram to discuss the contract faster. I will send the NDA and payment details there — Upwork is too slow.',
      messageChunks: [
        'Great portfolio! Let us move to Telegram to discuss the contract faster.',
        'I will send the NDA and payment details there — Upwork is too slow.',
      ],
      senderHints: ['New Client — unverified'],
    },
    expectedLevel: 'caution',
    expectedRuleIds: ['R01'],
    teachingPoint: 'Pressure to leave the platform removes escrow protection and audit trails.',
  },
  {
    id: 'fiverr-off-platform-payment',
    title: 'Pay outside Fiverr',
    subtitle: 'Fiverr inbox thread',
    platform: 'fiverr',
    category: 'off-platform',
    senderLabel: 'Buyer — new account',
    messages: [
      {
        role: 'them',
        text: 'Love your gig! Let us chat on WhatsApp so I can send the full brief faster.',
      },
      {
        role: 'them',
        text: 'Fiverr fees are too high — I will pay you directly via PayPal or USDT once you start.',
      },
    ],
    analysis: {
      text: `Love your gig! Let us chat on WhatsApp so I can send the full brief faster.

Fiverr fees are too high — I will pay you directly via PayPal or USDT once you start.`,
      messageChunks: [
        'Love your gig! Let us chat on WhatsApp so I can send the full brief faster.',
        'Fiverr fees are too high — I will pay you directly via PayPal or USDT once you start.',
      ],
      senderHints: ['Buyer — new account'],
    },
    expectedLevel: 'high-risk',
    expectedRuleIds: ['R01', 'R05'],
    teachingPoint:
      'Buyers who push off-platform chat and direct payment bypass Fiverr protection and often disappear after delivery.',
  },
  {
    id: 'gmail-credential-phish',
    title: 'Urgent login verification',
    subtitle: 'Gmail thread with fake portal',
    platform: 'gmail',
    category: 'credential-phish',
    senderLabel: 'HR Onboarding',
    messages: [
      {
        role: 'them',
        text: 'Please verify your account using the link below and enter your password to view the contract brief.',
      },
      { role: 'them', text: 'This must be completed within 24 hours or the offer expires.' },
    ],
    links: [
      {
        label: 'Verify account now',
        url: 'https://linkedln-login.com/signin',
        expectedLevel: 'high-risk',
      },
    ],
    analysis: {
      text: 'Please verify your account using the link below and enter your password to view the contract brief. This must be completed within 24 hours or the offer expires.',
      messageChunks: [
        'Please verify your account using the link below and enter your password to view the contract brief.',
        'This must be completed within 24 hours or the offer expires.',
      ],
      senderHints: ['HR Onboarding'],
    },
    expectedLevel: 'high-risk',
    expectedRuleIds: ['R02', 'R03'],
    teachingPoint: 'Legitimate employers do not ask for passwords over email; urgency is a classic pressure tactic.',
  },
  {
    id: 'overpayment-wire',
    title: 'Overpayment refund scam',
    subtitle: 'B2B invoice thread',
    platform: 'gmail',
    category: 'payment-fraud',
    senderLabel: 'Accounts Payable',
    messages: [
      {
        role: 'them',
        text: 'We overpaid your invoice by $2,000. Please refund the difference via wire transfer only today.',
      },
      { role: 'them', text: 'Use the attached banking details — our finance team is waiting.' },
    ],
    analysis: {
      text: 'We overpaid your invoice by $2,000. Please refund the difference via wire transfer only today. Use the attached banking details — our finance team is waiting.',
      messageChunks: [
        'We overpaid your invoice by $2,000. Please refund the difference via wire transfer only today.',
        'Use the attached banking details — our finance team is waiting.',
      ],
      senderHints: ['Accounts Payable'],
    },
    expectedLevel: 'high-risk',
    expectedRuleIds: ['R05', 'R06'],
    teachingPoint: 'Refund-the-difference scams use fake overpayments; verify with your bank before sending money.',
  },
  {
    id: 'fake-escrow-portal',
    title: 'Fake escrow portal',
    subtitle: 'Upwork payment bypass',
    platform: 'upwork',
    category: 'payment-fraud',
    senderLabel: 'Project Manager',
    messages: [
      {
        role: 'them',
        text: 'Use our secure payment portal instead of Upwork escrow for faster onboarding.',
      },
      { role: 'them', text: 'Everyone on our team uses it — you will get paid same day.' },
    ],
    analysis: {
      text: 'Use our secure payment portal instead of Upwork escrow for faster onboarding. Everyone on our team uses it — you will get paid same day.',
      messageChunks: [
        'Use our secure payment portal instead of Upwork escrow for faster onboarding.',
        'Everyone on our team uses it — you will get paid same day.',
      ],
      senderHints: ['Project Manager'],
    },
    expectedLevel: 'high-risk',
    expectedRuleIds: ['R07'],
    teachingPoint: 'Marketplace escrow exists for a reason — off-platform payment is the #1 freelance scam vector.',
  },
  {
    id: 'hiring-repo-trap',
    title: 'Malicious skills test',
    subtitle: 'LinkedIn technical screen',
    platform: 'linkedin',
    category: 'hiring-scam',
    senderLabel: 'Engineering Lead',
    messages: [
      {
        role: 'them',
        text: 'Before we hire you, clone this repository and run npm install to complete the skills test.',
      },
      { role: 'them', text: 'It is a standard take-home — takes about 10 minutes.' },
    ],
    analysis: {
      text: 'Before we hire you, clone this repository and run npm install to complete the skills test. It is a standard take-home — takes about 10 minutes.',
      messageChunks: [
        'Before we hire you, clone this repository and run npm install to complete the skills test.',
        'It is a standard take-home — takes about 10 minutes.',
      ],
      senderHints: ['Engineering Lead'],
    },
    expectedLevel: 'high-risk',
    expectedRuleIds: ['R08'],
    teachingPoint: 'Untrusted repos + install scripts are a common malware delivery path in fake hiring.',
  },
  {
    id: 'escalation-timeline',
    title: 'Escalation pattern',
    subtitle: 'Normal → urgent → install',
    platform: 'linkedin',
    category: 'hiring-scam',
    senderLabel: 'Startup Founder',
    messages: [
      { role: 'them', text: 'Thanks for connecting! We are building a fintech MVP.' },
      { role: 'them', text: 'Budget is approved — can we start this week?' },
      {
        role: 'them',
        text: 'Install AnyDesk tonight so we can pair on the codebase before the contract is signed.',
      },
    ],
    analysis: {
      text: `Thanks for connecting! We are building a fintech MVP.
Budget is approved — can we start this week?
Install AnyDesk tonight so we can pair on the codebase before the contract is signed.`,
      messageChunks: [
        'Thanks for connecting! We are building a fintech MVP.',
        'Budget is approved — can we start this week?',
        'Install AnyDesk tonight so we can pair on the codebase before the contract is signed.',
      ],
      senderHints: ['Startup Founder'],
    },
    expectedLevel: 'high-risk',
    expectedRuleIds: ['R04'],
    teachingPoint: 'Timeline analysis should flag conversations that escalate from friendly to access requests.',
  },
  {
    id: 'benign-milestone',
    title: 'Legitimate client (control)',
    subtitle: 'Should stay safe',
    platform: 'upwork',
    category: 'benign-control',
    senderLabel: 'Verified Client Co.',
    messages: [
      { role: 'them', text: 'Thanks for submitting the milestone. I left feedback on Upwork.' },
      { role: 'you', text: 'Great, I will start the next draft tomorrow.' },
      { role: 'them', text: 'No rush on the next draft — quality over speed.' },
    ],
    analysis: {
      text: 'Thanks for submitting the milestone. I left feedback on Upwork. No rush on the next draft — quality over speed.',
      messageChunks: [
        'Thanks for submitting the milestone. I left feedback on Upwork.',
        'No rush on the next draft — quality over speed.',
      ],
      senderHints: ['Verified Client Co.'],
    },
    expectedLevel: 'safe',
    expectedRuleIds: [],
    teachingPoint: 'False positives erode trust — the engine should stay quiet on normal client chatter.',
  },
];

export const DEV_LAB_LINK_FIXTURES: DevLabLink[] = [
  {
    label: 'Official LinkedIn profile',
    url: 'https://www.linkedin.com/in/example',
    expectedLevel: 'safe',
  },
  {
    label: 'Typo-domain login (phish)',
    url: 'https://linkedln-login.com/signin',
    expectedLevel: 'high-risk',
  },
  {
    label: 'Fake OAuth on wrong domain',
    url: 'https://linkedin-auth-verify.net/oauth/authorize?client_id=fake',
    expectedLevel: 'high-risk',
  },
];

export function getDevLabScenario(id: string): DevLabScenario | undefined {
  return DEV_LAB_SCENARIOS.find((scenario) => scenario.id === id);
}

export function evaluateDevLabRun(
  scenario: DevLabScenario,
  actualLevel: RiskLevel,
  actualRuleIds: string[],
  timelineLabel?: string,
): DevLabRunResult {
  const levelMatch = actualLevel === scenario.expectedLevel;
  const actualSet = new Set(actualRuleIds);
  const ruleMatch =
    scenario.expectedRuleIds.length === 0
      ? actualRuleIds.length === 0
      : scenario.expectedRuleIds.every((id) => actualSet.has(id));

  return {
    scenarioId: scenario.id,
    title: scenario.title,
    expectedLevel: scenario.expectedLevel,
    actualLevel,
    expectedRuleIds: scenario.expectedRuleIds,
    actualRuleIds,
    passed: levelMatch && ruleMatch,
    ruleMatch,
    levelMatch,
    hits: [],
    timelineLabel,
  };
}

export function buildDevLabAnalyzePayload(scenario: DevLabScenario) {
  return {
    platform: scenario.platform,
    threadId: threadIdFor(scenario.id),
    text: scenario.analysis.text ?? '',
    messageChunks: scenario.analysis.messageChunks,
    senderHints: scenario.analysis.senderHints ?? [scenario.senderLabel],
  };
}
