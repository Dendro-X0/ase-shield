import type { AnalysisRequest, AnalysisResult } from '@ase/core';
import { analyze } from '@ase/core';

import { rulePack } from './rules.js';

export const RULE_PACK_VERSION = '1.0.0';

export { rulePack, RULE_IDS } from './rules.js';
export * from './rules.js';

export function getRulePackVersion(): string {
  return RULE_PACK_VERSION;
}

export function analyzeMessage(request: AnalysisRequest): AnalysisResult {
  return analyze(request, rulePack);
}

export function getRuleById(id: string) {
  return rulePack.find((rule) => rule.id === id);
}
