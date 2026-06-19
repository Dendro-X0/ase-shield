import {
  buildDevLabAnalyzePayload,
  DEV_LAB_SCENARIOS,
  evaluateDevLabRun,
} from '@ase/core';
import { describe, expect, it } from 'vitest';

import { analyzeMessage } from './index.js';

describe('dev lab scenarios', () => {
  it.each(DEV_LAB_SCENARIOS.map((scenario) => [scenario.id, scenario] as const))(
    '%s matches expected risk level and rules',
    (_id, scenario) => {
      const payload = buildDevLabAnalyzePayload(scenario);
      const result = analyzeMessage({
        kind: 'message',
        text: payload.text,
        context: {
          platform: payload.platform,
          threadId: payload.threadId,
          senderLabel: scenario.senderLabel,
          senderHints: payload.senderHints,
          messageChunks: payload.messageChunks,
        },
      });

      const actualRuleIds = result.hits.map((hit) => hit.ruleId);
      const evaluation = evaluateDevLabRun(scenario, result.level, actualRuleIds);

      expect(
        evaluation,
        `expected ${scenario.expectedLevel} [${scenario.expectedRuleIds.join(', ')}], got ${result.level} [${actualRuleIds.join(', ')}]`,
      ).toMatchObject({ passed: true });
    },
  );
});
