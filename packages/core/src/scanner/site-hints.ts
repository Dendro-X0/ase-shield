/** Optional per-site tuning for the universal scanner (precision, not correctness). */
export type SiteScanHints = {
  readonly ignoreSelectors?: readonly string[];
  readonly boostSelectors?: readonly string[];
};

export type SiteHintPack = {
  readonly id: string;
  readonly hostPattern: RegExp;
  readonly hints: SiteScanHints;
};

export const EMPTY_SITE_HINTS: SiteScanHints = {
  ignoreSelectors: [],
  boostSelectors: [],
};

export function mergeSiteHints(packs: readonly SiteScanHints[]): SiteScanHints {
  const ignoreSelectors: string[] = [];
  const boostSelectors: string[] = [];
  for (const pack of packs) {
    if (pack.ignoreSelectors) ignoreSelectors.push(...pack.ignoreSelectors);
    if (pack.boostSelectors) boostSelectors.push(...pack.boostSelectors);
  }
  return { ignoreSelectors, boostSelectors };
}

export function resolveSiteHints(hostname: string, packs: readonly SiteHintPack[]): SiteScanHints | null {
  const matched = packs.filter((pack) => pack.hostPattern.test(hostname));
  if (matched.length === 0) return null;
  return mergeSiteHints(matched.map((pack) => pack.hints));
}

/** Bundled hint packs for supported freelance / B2B surfaces. */
export const ASE_SITE_HINT_PACKS: readonly SiteHintPack[] = [
  {
    id: 'gmail',
    hostPattern: /mail\.google\.com$/i,
    hints: {
      ignoreSelectors: ['nav', '[role="navigation"]', '[role="banner"]', '[role="complementary"]'],
      boostSelectors: ['[role="main"]', '.nH', '.aDP'],
    },
  },
  {
    id: 'linkedin',
    hostPattern: /linkedin\.com$/i,
    hints: {
      ignoreSelectors: ['nav', 'header', 'footer', '[role="navigation"]', '.global-nav'],
      boostSelectors: ['[data-test-id="message-thread"]', '.msg-thread', 'main'],
    },
  },
  {
    id: 'upwork',
    hostPattern: /upwork\.com$/i,
    hints: {
      ignoreSelectors: ['nav', 'header', 'footer', '[role="navigation"]'],
      boostSelectors: ['[data-test="message-list"]', '.up-d-message-list', 'main'],
    },
  },
  {
    id: 'fiverr',
    hostPattern: /fiverr\.com$/i,
    hints: {
      ignoreSelectors: ['nav', 'header', 'footer', '[role="navigation"]', '[role="banner"]'],
      boostSelectors: ['[role="log"]', '[data-testid*="conversation" i]', 'main'],
    },
  },
  {
    id: 'freelancer',
    hostPattern: /freelancer\.com$/i,
    hints: {
      ignoreSelectors: ['nav', 'header', 'footer', '#sidebar'],
      boostSelectors: ['#main', '[role="log"]', 'main'],
    },
  },
  {
    id: 'whatsapp',
    hostPattern: /web\.whatsapp\.com$/i,
    hints: {
      ignoreSelectors: ['#pane-side', '[data-testid="chat-list"]', 'header'],
      boostSelectors: ['[data-testid="conversation-panel"]', 'main'],
    },
  },
  {
    id: 'telegram',
    hostPattern: /web\.telegram\.org$/i,
    hints: {
      ignoreSelectors: ['.chat-list', '.sidebar', 'nav'],
      boostSelectors: ['.chat-content', 'main'],
    },
  },
  {
    id: 'discord',
    hostPattern: /discord\.com$/i,
    hints: {
      ignoreSelectors: [
        'nav',
        'header',
        '[class*="sidebar" i]',
        '[class*="channelList" i]',
        '[class*="memberList" i]',
        '[class*="guilds" i]',
      ],
      boostSelectors: [
        '[class*="chatContent" i]',
        '[class*="messageList" i]',
        '[role="log"]',
        'main',
      ],
    },
  },
  {
    id: 'reddit',
    hostPattern: /reddit\.com$/i,
    hints: {
      ignoreSelectors: ['nav', 'header', 'footer', '[role="navigation"]', 'aside'],
      boostSelectors: [
        'shreddit-post',
        '[data-testid="post-content"]',
        '[data-testid="comment"]',
        'article',
        '[role="main"]',
      ],
    },
  },
  {
    id: 'discourse',
    hostPattern: /(discourse|forum)\./i,
    hints: {
      ignoreSelectors: ['nav', 'header', 'footer', '.sidebar', '[role="navigation"]'],
      boostSelectors: ['[role="main"]', '.topic-body', '.cooked', 'article'],
    },
  },
];
