export type ScanProfile = 'prose' | 'messaging';

export type ScanThresholds = {
  minChars: number;
  minWords: number;
};

export const SCAN_PROFILE_THRESHOLDS: Record<ScanProfile, ScanThresholds> = {
  prose: { minChars: 40, minWords: 8 },
  messaging: { minChars: 12, minWords: 3 },
};

const SKIP_TAGS = new Set([
  'script',
  'style',
  'noscript',
  'iframe',
  'svg',
  'canvas',
  'pre',
  'code',
  'nav',
  'header',
  'footer',
  'aside',
  'button',
  'input',
  'textarea',
  'select',
  'label',
]);

const CHROME_ROLES = new Set(['navigation', 'banner', 'complementary', 'contentinfo', 'menubar']);

const CHROME_CLASS_PATTERNS = [
  'navbar',
  'navigation',
  'sidebar',
  'breadcrumb',
  'pagination',
  'toolbar',
  'topbar',
  'footer',
  'header',
  'dropdown',
  'popover',
  'tooltip',
];

export function normalizeText(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

export function wordCount(text: string): number {
  return normalizeText(text).split(/\s+/).filter((word) => word.length > 0).length;
}

export function hasSubstantiveText(text: string, profile: ScanProfile = 'messaging'): boolean {
  const { minChars, minWords } = SCAN_PROFILE_THRESHOLDS[profile];
  const normalized = normalizeText(text);
  if (normalized.length < minChars) return false;
  if (wordCount(normalized) < minWords) return false;
  return true;
}

export function isChromeElement(element: HTMLElement): boolean {
  const tag = element.tagName.toLowerCase();
  if (SKIP_TAGS.has(tag)) return true;

  const role = element.getAttribute('role')?.toLowerCase();
  if (role && CHROME_ROLES.has(role)) return true;

  if (
    element.closest(
      'nav, header, footer, aside, button, [role="navigation"], [role="banner"], [role="complementary"], [role="contentinfo"]',
    )
  ) {
    return true;
  }

  if (element.closest('pre, code, .code, .highlight')) return true;

  const classAndId = `${element.className} ${element.id}`.toLowerCase();
  if (CHROME_CLASS_PATTERNS.some((pattern) => classAndId.includes(pattern))) return true;

  return false;
}
