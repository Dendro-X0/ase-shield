import { describe, expect, it } from 'vitest';

import { aggregateRiskLevel, buildRuleContext, extractUrls, parseHostname } from './engine.js';

describe('buildRuleContext', () => {
  it('collects sender hints and urls from text', () => {
    const ctx = buildRuleContext({
      kind: 'message',
      text: 'See https://example.com and mail hiring@fake-upwork.io',
      context: {
        platform: 'gmail',
        senderLabel: 'Hiring Manager',
        senderHints: ['hr-team'],
      },
    });

    expect(ctx.senderHints).toEqual(['Hiring Manager', 'hr-team']);
    expect(ctx.urlsInText.length).toBeGreaterThan(0);
    expect(ctx.domainsInText).toContain('example.com');
  });
});

describe('extractUrls', () => {
  it('extracts bare domains and full urls', () => {
    const urls = extractUrls('Visit linkedin-auth.io or https://safe.test/path');
    expect(urls.some((u) => u.includes('linkedin-auth.io'))).toBe(true);
    expect(urls.some((u) => u.includes('safe.test'))).toBe(true);
  });
});

describe('parseHostname', () => {
  it('returns null for invalid urls', () => {
    expect(parseHostname('not a url')).toBeNull();
  });
});

describe('aggregateRiskLevel', () => {
  it('returns safe for empty hits', () => {
    expect(aggregateRiskLevel([])).toBe('safe');
  });
});
