import { describe, expect, it } from 'vitest';

import { aggregateRiskLevel, analyze } from '@ase/core';

import { BENIGN_FIXTURE, FIXTURES } from './fixtures.js';
import { analyzeMessage, getRuleById, rulePack } from './index.js';

describe('aggregateRiskLevel', () => {
  it('returns safe when no hits', () => {
    expect(aggregateRiskLevel([])).toBe('safe');
  });

  it('returns high-risk when any high severity hit exists', () => {
    expect(
      aggregateRiskLevel([
        {
          ruleId: 'R02',
          title: 't',
          why: 'w',
          whatToDo: 'd',
          severity: 'medium',
        },
        {
          ruleId: 'R04',
          title: 't',
          why: 'w',
          whatToDo: 'd',
          severity: 'high',
        },
      ]),
    ).toBe('high-risk');
  });

  it('returns caution for medium or low hits only', () => {
    expect(
      aggregateRiskLevel([
        {
          ruleId: 'R01',
          title: 't',
          why: 'w',
          whatToDo: 'd',
          severity: 'medium',
        },
      ]),
    ).toBe('caution');
  });
});

describe('rule pack', () => {
  it('contains 12 rules with unique IDs', () => {
    expect(rulePack).toHaveLength(12);
    expect(new Set(rulePack.map((r) => r.id)).size).toBe(12);
  });

  it('sorts hits by priority then severity', () => {
    const result = analyzeMessage({
      kind: 'message',
      text: 'Urgent: install AnyDesk and pay via USDT only using our escrow link.',
      context: { platform: 'upwork' },
    });

    expect(result.hits.length).toBeGreaterThan(1);
    const priorities = result.hits.map((hit) => getRuleById(hit.ruleId)?.priority ?? 999);
    const sorted = [...priorities].sort((a, b) => a - b);
    expect(priorities).toEqual(sorted);
  });
});

describe('fixtures per rule', () => {
  for (const fixture of FIXTURES) {
    it(`${fixture.id} — ${fixture.ruleId} expectMatch=${fixture.expectMatch}`, () => {
      const result = analyze(fixture.request, rulePack, { now: '2026-01-01T00:00:00.000Z' });
      const matched = result.hits.some((hit) => hit.ruleId === fixture.ruleId);

      expect(matched).toBe(fixture.expectMatch);

      if (fixture.expectLevel) {
        expect(result.level).toBe(fixture.expectLevel);
      }
    });
  }

  it('benign message stays safe', () => {
    const result = analyzeMessage(BENIGN_FIXTURE);
    expect(result.level).toBe('safe');
    expect(result.hits).toHaveLength(0);
  });
});

describe('disabled rules', () => {
  it('skips rules in disabledRuleIds', () => {
    const result = analyze(
      {
        kind: 'message',
        text: 'Please install AnyDesk for the interview.',
        context: { platform: 'linkedin' },
      },
      rulePack,
      { disabledRuleIds: ['R04'] },
    );

    expect(result.hits.some((hit) => hit.ruleId === 'R04')).toBe(false);
  });
});

describe('offline operation', () => {
  it('does not require network', () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network blocked'));

    const result = analyzeMessage({
      kind: 'message',
      text: 'Move to WhatsApp to discuss payment.',
      context: { platform: 'fiverr' },
    });

    expect(result.level).not.toBe('safe');
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});
