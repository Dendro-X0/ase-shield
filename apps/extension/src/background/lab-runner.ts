import {
  buildDevLabAnalyzePayload,
  DEV_LAB_SCENARIOS,
  evaluateDevLabRun,
  getDevLabScenario,
  type DevLabRunResult,
} from '@ase/core';

import { runThreadAnalysis } from './analysis.js';

export async function runLabScenario(scenarioId: string): Promise<DevLabRunResult> {
  const scenario = getDevLabScenario(scenarioId);
  if (!scenario) {
    throw new Error(`Unknown dev lab scenario: ${scenarioId}`);
  }

  const payload = buildDevLabAnalyzePayload(scenario);
  const response = await runThreadAnalysis(payload, { labMode: true });
  const actualRuleIds = response.result.hits.map((hit) => hit.ruleId);

  const evaluation = evaluateDevLabRun(
    scenario,
    response.result.level,
    actualRuleIds,
    response.timeline?.escalationLabel,
  );

  return {
    ...evaluation,
    hits: response.result.hits.map((hit) => ({ ruleId: hit.ruleId, title: hit.title })),
    timelineLabel: response.timeline?.escalationLabel,
  };
}

export async function runAllLabScenarios(): Promise<DevLabRunResult[]> {
  const results: DevLabRunResult[] = [];
  for (const scenario of DEV_LAB_SCENARIOS) {
    results.push(await runLabScenario(scenario.id));
  }
  return results;
}
