import type { RuleDefinition } from '@ase/core';
import {
  containsAny,
  containsWord,
  DOUBLE_EXTENSION_PATTERN,
  hostnameLooksLikeBrand,
  isAuthLikeUrl,
  isOfficialAuthDomain,
  isPunycodeHostname,
  MACRO_FILE_PATTERN,
  matchesAnyPattern,
  parseHostname,
} from '@ase/core';

const MESSAGE_AND_PAGE = ['message', 'page'] as const;
const LINK_AND_PAGE = ['link', 'page'] as const;
const FILE_ONLY = ['file-metadata'] as const;

const OFF_PLATFORM_PHRASES = [
  'move to telegram',
  'chat on telegram',
  'whatsapp',
  'whats app',
  'signal app',
  'off platform',
  'off-platform',
  'outside upwork',
  'outside fiverr',
  'leave the platform',
  'personal email',
  'email me directly',
  'reach me on',
  'contact me on discord',
  'google chat',
  'we use telegram',
  'switch to whatsapp',
];

const URGENCY_PHRASES = [
  'urgent',
  'asap',
  'as soon as possible',
  'within 24 hours',
  'within 48 hours',
  'today only',
  'deadline today',
  'immediate action',
  'time sensitive',
  'time-sensitive',
  'must be done today',
  'right away',
  'act now',
  'expires today',
];

const CREDENTIAL_PHRASES = [
  'verify your account',
  'confirm your login',
  'enter your password',
  'sign in here',
  'log in here',
  'login here',
  'validate your credentials',
  'confirm your identity',
  'update your payment info',
  'verify your identity',
];

const REMOTE_ACCESS_TOOLS = [
  'anydesk',
  'teamviewer',
  'team viewer',
  'rustdesk',
  'quick assist',
  'ultraviewer',
  'logmein',
  'log me in',
  'remote desktop',
  'screen connect',
  'supremo',
  'ammyy admin',
];

const CRYPTO_WIRE_PHRASES = [
  'bitcoin only',
  'crypto only',
  'usdt',
  'usdc',
  'wire transfer only',
  'bank wire only',
  'ethereum payment',
  'pay in crypto',
  'cryptocurrency only',
  'gift card payment',
  'steam card',
];

const OVERPAYMENT_PHRASES = [
  'overpaid',
  'over payment',
  'accidental payment',
  'refund the difference',
  'refund the excess',
  'send back the extra',
  'return the difference',
  'excess amount',
  'paid too much',
  'mistaken transfer',
];

const FAKE_ESCROW_PHRASES = [
  'our escrow',
  'secure payment portal',
  'custom escrow',
  'pay outside the platform',
  'pay outside upwork',
  'pay outside fiverr',
  'use our payment link',
  'private payment page',
  'direct bank transfer before',
];

const HIRING_TRAP_PHRASES = [
  'install our software',
  'install our app',
  'download our client',
  'run npm install',
  'run this repo',
  'clone this repository',
  'clone the repo',
  'run our test project',
  'technical assessment tool',
  'skills test application',
  'run the attached script',
];

const MARKETPLACE_PLATFORMS = new Set(['upwork', 'fiverr']);

function allUrls(ctx: { url: string; urlsInText: string[] }): string[] {
  const urls = [...ctx.urlsInText];
  if (ctx.url) urls.unshift(ctx.url);
  return urls;
}

function allHostnames(ctx: { url: string; urlsInText: string[]; domainsInText: string[] }): string[] {
  const hostnames = new Set<string>(ctx.domainsInText);
  for (const url of allUrls(ctx)) {
    const hostname = parseHostname(url);
    if (hostname) hostnames.add(hostname);
  }
  return [...hostnames];
}

/** R01 — Off-platform communication pressure */
export const r01OffPlatform: RuleDefinition = {
  id: 'R01',
  title: 'Off-platform communication requested',
  why: 'Scammers often move conversations off marketplaces to avoid platform protections and monitoring.',
  whatToDo: 'Keep negotiation and payment on the official platform until a contract is verified.',
  severity: 'medium',
  priority: 10,
  kinds: [...MESSAGE_AND_PAGE],
  match: (ctx) => {
    const onMarketplace = MARKETPLACE_PLATFORMS.has(ctx.platform);
    const phraseHit = containsAny(ctx.textLower, OFF_PLATFORM_PHRASES);
    if (onMarketplace && phraseHit) return true;
    return phraseHit && containsAny(ctx.textLower, ['upwork', 'fiverr', 'platform', 'marketplace']);
  },
};

/** R02 — Urgency / artificial deadline */
export const r02Urgency: RuleDefinition = {
  id: 'R02',
  title: 'Artificial urgency detected',
  why: 'Pressure to act quickly is a common social-engineering tactic that bypasses careful review.',
  whatToDo: 'Pause and verify the request through an independent channel before paying or installing anything.',
  severity: 'medium',
  priority: 20,
  kinds: [...MESSAGE_AND_PAGE],
  match: (ctx) => containsAny(ctx.textLower, URGENCY_PHRASES),
};

/** R03 — Credential or login link request */
export const r03CredentialRequest: RuleDefinition = {
  id: 'R03',
  title: 'Credential or login verification requested',
  why: 'Legitimate clients rarely ask you to sign in through unfamiliar links in a message thread.',
  whatToDo: 'Do not enter passwords. Open the official site manually and check for alerts in your account.',
  severity: 'high',
  priority: 5,
  kinds: [...MESSAGE_AND_PAGE, 'link'],
  match: (ctx) => {
    if (containsAny(ctx.textLower, CREDENTIAL_PHRASES)) return true;
    return allUrls(ctx).some(
      (url) =>
        isAuthLikeUrl(url) &&
        !isOfficialAuthDomain(parseHostname(url) ?? '') &&
        ctx.kind !== 'file-metadata',
    );
  },
};

/** R04 — Remote access tool mention */
export const r04RemoteAccess: RuleDefinition = {
  id: 'R04',
  title: 'Remote access tool mentioned',
  why: 'Remote desktop tools give someone full control of your computer and accounts during a session.',
  whatToDo: 'Decline remote access unless you initiated support with a verified company. Never install RAT tools for a "job test".',
  severity: 'high',
  priority: 6,
  kinds: [...MESSAGE_AND_PAGE],
  match: (ctx) => containsAny(ctx.textLower, REMOTE_ACCESS_TOOLS),
};

/** R05 — Crypto-only or wire-transfer-only payment */
export const r05CryptoWirePayment: RuleDefinition = {
  id: 'R05',
  title: 'Unusual payment method required',
  why: 'Crypto-only, wire-only, or gift-card payment demands are common in refund and fake-client scams.',
  whatToDo: 'Use platform escrow or verifiable business payment rails. Reject irreversible payment methods for new clients.',
  severity: 'high',
  priority: 7,
  kinds: [...MESSAGE_AND_PAGE],
  match: (ctx) => containsAny(ctx.textLower, CRYPTO_WIRE_PHRASES),
};

/** R06 — Overpayment / refund difference language */
export const r06Overpayment: RuleDefinition = {
  id: 'R06',
  title: 'Overpayment or refund-difference pattern',
  why: 'Overpayment scams ask you to return money before the original transfer clears, leaving you liable.',
  whatToDo: 'Never refund "extra" funds quickly. Wait for official settlement and confirm with your bank or platform.',
  severity: 'high',
  priority: 8,
  kinds: [...MESSAGE_AND_PAGE],
  match: (ctx) => containsAny(ctx.textLower, OVERPAYMENT_PHRASES),
};

/** R07 — Fake escrow / off-platform payment */
export const r07FakeEscrow: RuleDefinition = {
  id: 'R07',
  title: 'Off-platform or custom payment flow',
  why: 'Fake escrow pages mimic platform payment UIs to steal credentials or redirect payouts.',
  whatToDo: 'Pay only through the marketplace or a vendor portal you opened yourself — not a link from the thread.',
  severity: 'high',
  priority: 9,
  kinds: [...MESSAGE_AND_PAGE, 'link'],
  match: (ctx) => {
    if (containsAny(ctx.textLower, FAKE_ESCROW_PHRASES)) return true;
    return matchesAnyPattern(ctx.textLower, [
      /\bescrow\b.*\blink\b/i,
      /\bpayment portal\b/i,
      /\bsecure checkout\b.*\bhttp/i,
    ]);
  },
};

/** R08 — “Install our software / run this repo” hiring trap */
export const r08HiringTrap: RuleDefinition = {
  id: 'R08',
  title: 'Software install or repo execution requested',
  why: 'Malicious "skills tests" often deliver malware through installers or postinstall scripts.',
  whatToDo: 'Do not run unknown repos or installers. Offer a sandboxed code review or ask for a written spec instead.',
  severity: 'high',
  priority: 11,
  kinds: [...MESSAGE_AND_PAGE],
  match: (ctx) => containsAny(ctx.textLower, HIRING_TRAP_PHRASES),
};

/** R09 — Domain typo / punycode / brand mismatch */
export const r09DomainMismatch: RuleDefinition = {
  id: 'R09',
  title: 'Suspicious or lookalike domain',
  why: 'Typosquatting and punycode domains impersonate brands to harvest credentials.',
  whatToDo: 'Do not click. Compare the domain letter-by-letter with the official site you open manually.',
  severity: 'high',
  priority: 12,
  kinds: [...LINK_AND_PAGE, 'message'],
  match: (ctx) => {
    for (const hostname of allHostnames(ctx)) {
      if (isPunycodeHostname(hostname)) return true;
      if (hostnameLooksLikeBrand(hostname, 'linkedin')) return true;
      if (hostnameLooksLikeBrand(hostname, 'google')) return true;
      if (hostnameLooksLikeBrand(hostname, 'upwork')) return true;
      if (hostnameLooksLikeBrand(hostname, 'fiverr')) return true;
      if (hostnameLooksLikeBrand(hostname, 'microsoft')) return true;
    }
    return false;
  },
};

/** R10 — Double file extension */
export const r10DoubleExtension: RuleDefinition = {
  id: 'R10',
  title: 'Double file extension detected',
  why: 'Files like "brief.pdf.exe" disguise executables as documents.',
  whatToDo: 'Do not open on your host. Use the companion quarantine "Open safely" flow if you must inspect it.',
  severity: 'high',
  priority: 13,
  kinds: [...FILE_ONLY],
  match: (ctx) => DOUBLE_EXTENSION_PATTERN.test(ctx.fileName),
};

/** R11 — Macro-enabled document hint */
export const r11MacroDocument: RuleDefinition = {
  id: 'R11',
  title: 'Macro-enabled Office document',
  why: 'Macro malware often arrives as job briefs or contracts with embedded scripts.',
  whatToDo: 'Preview in a sandbox. Never enable macros from unknown senders.',
  severity: 'medium',
  priority: 14,
  kinds: [...FILE_ONLY],
  match: (ctx) =>
    MACRO_FILE_PATTERN.test(ctx.fileName) ||
    containsWord(ctx.textLower, 'enable macros') ||
    containsWord(ctx.textLower, 'enable content'),
};

/** R12 — OAuth on non-official domain */
export const r12OAuthPhishing: RuleDefinition = {
  id: 'R12',
  title: 'Login/OAuth page on unofficial domain',
  why: 'Fake OAuth pages capture tokens and passwords without breaking your password directly.',
  whatToDo: 'Close the tab. Sign in only by typing the official URL yourself or using a saved bookmark.',
  severity: 'high',
  priority: 4,
  kinds: [...LINK_AND_PAGE],
  match: (ctx) => {
    for (const url of allUrls(ctx)) {
      if (!isAuthLikeUrl(url)) continue;
      const hostname = parseHostname(url);
      if (!hostname) continue;
      if (!isOfficialAuthDomain(hostname)) return true;
    }
    return false;
  },
};

export const rulePack: RuleDefinition[] = [
  r12OAuthPhishing,
  r03CredentialRequest,
  r04RemoteAccess,
  r05CryptoWirePayment,
  r06Overpayment,
  r07FakeEscrow,
  r01OffPlatform,
  r08HiringTrap,
  r09DomainMismatch,
  r10DoubleExtension,
  r11MacroDocument,
  r02Urgency,
];

export const RULE_IDS = rulePack.map((rule) => rule.id);
