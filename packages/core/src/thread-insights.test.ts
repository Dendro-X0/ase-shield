import { describe, expect, it } from 'vitest';

import { buildTimelineInsight, checkContactConsistency, detectChunkStage } from './thread-insights.js';

describe('detectChunkStage', () => {
  it('detects technical stage', () => {
    expect(detectChunkStage('Please install AnyDesk for the interview')).toBe('technical');
  });

  it('detects payment stage', () => {
    expect(detectChunkStage('Send the wire transfer today')).toBe('payment');
  });
});

describe('buildTimelineInsight', () => {
  it('builds escalation label across chunks', () => {
    const insight = buildTimelineInsight([
      'Thanks for your portfolio',
      'Let us move to Telegram',
      'Pay via our escrow link',
      'Install our test application',
    ]);

    expect(insight.stages).toEqual(['off-platform', 'payment', 'technical']);
    expect(insight.escalationLabel).toContain('off-platform');
    expect(insight.escalationLabel).toContain('payment');
    expect(insight.escalationLabel).toContain('install');
  });
});

describe('checkContactConsistency', () => {
  it('warns on multiple org names', () => {
    const warnings = checkContactConsistency(['Acme Corp LLC', 'Global Ventures Inc']);
    expect(warnings.length).toBeGreaterThan(0);
  });

  it('warns on mixed business domains', () => {
    const warnings = checkContactConsistency(
      ['hiring@client-one.com', 'finance@other-vendor.net'],
      '',
    );
    expect(warnings.some((w) => w.includes('domains'))).toBe(true);
  });
});
