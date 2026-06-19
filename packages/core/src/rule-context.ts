import type { AnalysisKind, AnalysisRequest, Platform, RuleSeverity } from './analysis.js';

/** Normalized input passed to each rule's matcher. Built once per analysis run. */
export interface RuleContext {
  kind: AnalysisKind;
  platform: Platform;
  text: string;
  textLower: string;
  url: string;
  urlLower: string;
  fileName: string;
  fileNameLower: string;
  urlsInText: string[];
  domainsInText: string[];
  senderHints: string[];
}

export interface RuleDefinition {
  id: string;
  title: string;
  /** Default explanation when the rule matches. */
  why: string;
  whatToDo: string;
  severity: RuleSeverity;
  /** Lower numbers sort first in hit lists (higher visibility). */
  priority: number;
  kinds: AnalysisKind[];
  match: (ctx: RuleContext) => boolean;
}

export function buildRuleContext(request: AnalysisRequest): RuleContext {
  const text = request.text ?? '';
  const url = request.url ?? '';
  const fileName = request.file?.name ?? '';
  const urlsInText = extractUrls(text);
  const domainsInText = urlsInText
    .map((item) => parseHostname(item))
    .filter((hostname): hostname is string => hostname !== null);

  const hints = new Set<string>();
  if (request.context.senderLabel) hints.add(request.context.senderLabel);
  for (const hint of request.context.senderHints ?? []) {
    if (hint.trim()) hints.add(hint.trim());
  }

  return {
    kind: request.kind,
    platform: request.context.platform,
    text,
    textLower: text.toLowerCase(),
    url,
    urlLower: url.toLowerCase(),
    fileName,
    fileNameLower: fileName.toLowerCase(),
    urlsInText,
    domainsInText,
    senderHints: [...hints],
  };
}

const URL_PATTERN = /\bhttps?:\/\/[^\s<>"']+/gi;
const BARE_DOMAIN_PATTERN =
  /\b(?:www\.)?(?:[a-z0-9-]+\.)+(?:com|net|org|io|co|me|info|biz|xyz|ru|cn|uk)\b/gi;

export function extractUrls(text: string): string[] {
  const found = new Set<string>();
  for (const match of text.matchAll(URL_PATTERN)) {
    found.add(normalizeUrl(match[0]));
  }
  for (const match of text.matchAll(BARE_DOMAIN_PATTERN)) {
    found.add(normalizeUrl(match[0]));
  }
  return [...found];
}

function normalizeUrl(raw: string): string {
  const trimmed = raw.replace(/[),.;!?]+$/, '');
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export function parseHostname(rawUrl: string): string | null {
  try {
    const hostname = new URL(rawUrl).hostname.toLowerCase();
    return hostname || null;
  } catch {
    return null;
  }
}

export function isPunycodeHostname(hostname: string): boolean {
  return hostname.toLowerCase().includes('xn--');
}

export function containsAny(haystack: string, needles: readonly string[]): boolean {
  const lower = haystack.toLowerCase();
  return needles.some((needle) => lower.includes(needle.toLowerCase()));
}

export function containsWord(haystack: string, word: string): boolean {
  const pattern = new RegExp(`\\b${escapeRegExp(word)}\\b`, 'i');
  return pattern.test(haystack);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function matchesAnyPattern(haystack: string, patterns: readonly RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(haystack));
}

export const BRAND_DOMAINS = {
  linkedin: ['linkedin.com', 'www.linkedin.com'],
  google: ['accounts.google.com', 'google.com', 'www.google.com'],
  upwork: ['upwork.com', 'www.upwork.com'],
  fiverr: ['fiverr.com', 'www.fiverr.com'],
  microsoft: ['login.microsoftonline.com', 'microsoft.com', 'www.microsoft.com'],
} as const;

export type BrandName = keyof typeof BRAND_DOMAINS;

export function hostnameLooksLikeBrand(hostname: string, brand: BrandName): boolean {
  const normalized = hostname.toLowerCase();
  const official = BRAND_DOMAINS[brand];
  if (official.some((domain) => normalized === domain || normalized.endsWith(`.${domain}`))) {
    return false;
  }

  const typoPatterns: Record<BrandName, RegExp[]> = {
    linkedin: [/linkedln/, /lnked?in/, /linked[i1]n-/, /linked-in-login/],
    google: [/gooogle/, /google-login/, /accounts-google(?!\.com)/],
    upwork: [/upw0rk/, /upwrk/, /up-work-/, /upwork-login(?!\.com)/],
    fiverr: [/fiverrr/, /fivver/, /fiverr-pay/],
    microsoft: [/micros0ft/, /microsoft-login(?!\.com)/],
  };

  if (typoPatterns[brand].some((pattern) => pattern.test(normalized))) return true;

  const brandToken = brand === 'microsoft' ? 'microsoft' : brand;
  return normalized.includes(brandToken);
}

export function isAuthLikeUrl(url: string): boolean {
  const lower = url.toLowerCase();
  return (
    /\/oauth/i.test(lower) ||
    /\/authorize/i.test(lower) ||
    /\/login/i.test(lower) ||
    /\/signin/i.test(lower) ||
    /\/sign-in/i.test(lower) ||
    /\/auth/i.test(lower) ||
    /[?&]client_id=/i.test(lower) ||
    /[?&]response_type=/i.test(lower)
  );
}

export function isOfficialAuthDomain(hostname: string): boolean {
  const normalized = hostname.toLowerCase();
  const allOfficial = Object.values(BRAND_DOMAINS).flat();
  return allOfficial.some(
    (domain) => normalized === domain || normalized.endsWith(`.${domain}`),
  );
}

export const DOUBLE_EXTENSION_PATTERN =
  /\.(pdf|doc|docx|xls|xlsx|ppt|pptx|txt|jpg|jpeg|png|gif|zip|rar|7z)\.(exe|msi|bat|cmd|com|scr|ps1|vbs|js|jar|app|dmg)$/i;

export const MACRO_FILE_PATTERN = /\.(docm|xlsm|pptm|dotm|xltm|potm|ppam|xlam)$/i;
