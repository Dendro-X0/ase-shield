import {
  hostnameLooksLikeBrand,
  isPunycodeHostname,
  parseHostname,
  type RiskLevel,
} from '@ase/core';

import type { DomainInspectResult } from './types.js';

const SUSPICIOUS_TLDS = new Set([
  'xyz',
  'top',
  'click',
  'link',
  'work',
  'live',
  'icu',
  'cam',
  'rest',
  'monster',
  'sbs',
  'cfd',
]);

const BRANDS = ['linkedin', 'google', 'upwork', 'fiverr', 'microsoft'] as const;

export function inspectDomain(url: string): DomainInspectResult | null {
  const hostname = parseHostname(url);
  if (!hostname) return null;

  const signals: string[] = [];
  let level: RiskLevel = 'safe';

  const bump = (next: RiskLevel) => {
    if (next === 'high-risk') level = 'high-risk';
    else if (next === 'caution' && level === 'safe') level = 'caution';
  };

  const punycode = isPunycodeHostname(hostname);
  if (punycode) {
    signals.push('Punycode domain (may disguise letters).');
    bump('high-risk');
  }

  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)) {
    signals.push('Uses a raw IP address instead of a normal domain.');
    bump('caution');
  }

  const parts = hostname.split('.');
  const tld = parts[parts.length - 1] ?? '';
  if (SUSPICIOUS_TLDS.has(tld)) {
    signals.push(`Uncommon TLD ".${tld}" often appears in phishing links.`);
    bump('caution');
  }

  if ((hostname.match(/-/g) ?? []).length >= 2) {
    signals.push('Multiple hyphens can indicate a lookalike domain.');
    bump('caution');
  }

  for (const brand of BRANDS) {
    if (hostnameLooksLikeBrand(hostname, brand)) {
      signals.push(`Domain resembles ${brand} but is not official.`);
      bump('high-risk');
    }
  }

  if (signals.length === 0) {
    signals.push('No local red flags. Domain age cannot be verified offline.');
  } else {
    signals.push('Domain age cannot be verified offline — check manually.');
  }

  return { hostname, signals, level, punycode };
}
