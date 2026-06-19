import type { AnalysisRequest, AnalysisResult, RiskLevel, RuleHit, RuleSeverity } from './analysis.js';
import { buildRuleContext, type RuleDefinition } from './rule-context.js';

export type { RuleContext, RuleDefinition } from './rule-context.js';
export {
  buildRuleContext,
  extractUrls,
  parseHostname,
  isPunycodeHostname,
  containsAny,
  containsWord,
  matchesAnyPattern,
  hostnameLooksLikeBrand,
  isAuthLikeUrl,
  isOfficialAuthDomain,
  BRAND_DOMAINS,
  DOUBLE_EXTENSION_PATTERN,
  MACRO_FILE_PATTERN,
} from './rule-context.js';

const SEVERITY_RANK: Record<RuleSeverity, number> = {
  low: 1,
  medium: 2,
  high: 3,
};

/**
 * Aggregate matched rule severities into a traffic-light level.
 * - high-risk: any high-severity hit
 * - caution: any hit without high severity
 * - safe: no hits
 */
export function aggregateRiskLevel(hits: RuleHit[]): RiskLevel {
  if (hits.length === 0) return 'safe';
  if (hits.some((hit) => hit.severity === 'high')) return 'high-risk';
  return 'caution';
}

export interface AnalyzeOptions {
  /** ISO timestamp override (tests). */
  now?: string;
  /** Skip rules with these IDs (user allowlist / options page). */
  disabledRuleIds?: readonly string[];
}

export function analyze(
  request: AnalysisRequest,
  rules: readonly RuleDefinition[],
  options: AnalyzeOptions = {},
): AnalysisResult {
  const ctx = buildRuleContext(request);
  const disabled = new Set(options.disabledRuleIds ?? []);

  const hits = rules
    .filter((rule) => !disabled.has(rule.id))
    .filter((rule) => rule.kinds.includes(ctx.kind))
    .filter((rule) => rule.match(ctx))
    .map(
      (rule): RuleHit => ({
        ruleId: rule.id,
        title: rule.title,
        why: rule.why,
        whatToDo: rule.whatToDo,
        severity: rule.severity,
      }),
    )
    .sort((a, b) => {
      const ruleA = rules.find((r) => r.id === a.ruleId);
      const ruleB = rules.find((r) => r.id === b.ruleId);
      const priorityA = ruleA?.priority ?? 999;
      const priorityB = ruleB?.priority ?? 999;
      if (priorityA !== priorityB) return priorityA - priorityB;
      return SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity];
    });

  return {
    level: aggregateRiskLevel(hits),
    hits,
    analyzedAt: options.now ?? new Date().toISOString(),
  };
}
