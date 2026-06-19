import {
  buildTimelineInsight,
  checkContactConsistency,
  aggregateRiskLevel,
  analyze,
  parseHostname,
  isDevLabThreadId,
} from '@ase/core';
import { rulePack } from '@ase/rules';

import { isThreadDismissed } from '../shared/dismissals.js';
import { inspectDomain } from '../shared/domain-inspect.js';
import { appendIncident } from '../shared/incident-log.js';
import { isDomainAllowlisted, loadSettings, saveSettings } from '../shared/settings.js';
import { mergeThreadHistory } from '../shared/thread-history.js';
import { syncIncidentToCompanion } from './incident-sync.js';
import { syncThreadContextToCompanion } from './thread-context.js';
import type {
  AnalyzeThreadPayload,
  AnalysisResponse,
  ExtensionSettings,
} from '../shared/types.js';

export async function runThreadAnalysis(
  payload: AnalyzeThreadPayload,
  options?: { labMode?: boolean },
): Promise<AnalysisResponse> {
  const settings = await loadSettings();

  if (!options?.labMode && !settings.overlaysEnabled) {
    return emptyResponse();
  }

  const dismissed = await isThreadDismissed(payload.platform, payload.threadId);
  if (dismissed) {
    return {
      dismissed: true,
      result: {
        level: 'safe',
        hits: [],
        analyzedAt: new Date().toISOString(),
      },
    };
  }

  let historyChunks = payload.messageChunks ?? [];
  let senderHints = payload.senderHints ?? [];

  if (payload.threadId) {
    const record = await mergeThreadHistory(
      payload.platform,
      payload.threadId,
      historyChunks.length > 0 ? historyChunks : [payload.text],
      senderHints,
    );
    historyChunks = record.chunks;
    senderHints = record.senderHints;
  }

  let result = analyze(
    {
      kind: 'message',
      text: payload.text,
      url: payload.url,
      context: {
        platform: payload.platform,
        threadId: payload.threadId,
        senderHints,
      },
    },
    rulePack,
    { disabledRuleIds: settings.disabledRuleIds },
  );

  result = {
    ...result,
    hits: filterAllowlistedHits(result.hits, payload.text, settings.allowlistedDomains),
  };
  result = { ...result, level: aggregateRiskLevel(result.hits) };

  const timeline = buildTimelineInsight(historyChunks.length > 0 ? historyChunks : [payload.text]);
  const contactWarnings = checkContactConsistency(senderHints, payload.text);

  if (result.level !== 'safe' && !isDevLabThreadId(payload.threadId)) {
    const record = await appendIncident({
      platform: payload.platform,
      threadId: payload.threadId,
      level: result.level,
      ruleIds: result.hits.map((hit) => hit.ruleId),
      summary: result.hits
        .slice(0, 3)
        .map((hit) => hit.title)
        .join('; '),
    });
    await syncIncidentToCompanion(record);
  }

  await syncThreadContextToCompanion({
    platform: payload.platform,
    threadId: payload.threadId,
    senderLabel: senderHints[0],
    level: result.level,
    ruleIds: result.hits.map((hit) => hit.ruleId),
    summary: result.hits[0]?.title,
  });

  return { result, dismissed: false, timeline, contactWarnings };
}

function emptyResponse(): AnalysisResponse {
  return {
    dismissed: false,
    result: {
      level: 'safe',
      hits: [],
      analyzedAt: new Date().toISOString(),
    },
  };
}

function filterAllowlistedHits(
  hits: AnalysisResponse['result']['hits'],
  text: string,
  allowlist: string[],
): AnalysisResponse['result']['hits'] {
  if (allowlist.length === 0) return hits;

  const domainRules = new Set(['R09', 'R12']);
  const urls = text.match(/\bhttps?:\/\/[^\s<>"']+/gi) ?? [];

  const allAllowlisted =
    urls.length > 0 &&
    urls.every((url) => {
      const hostname = parseHostname(url);
      return hostname ? isDomainAllowlisted(hostname, allowlist) : false;
    });

  if (!allAllowlisted) return hits;

  return hits.filter((hit) => !domainRules.has(hit.ruleId));
}

export async function inspectLink(url: string) {
  const settings = await loadSettings();
  const inspection = inspectDomain(url);
  if (!inspection) return null;

  const hostname = parseHostname(url);
  if (hostname && isDomainAllowlisted(hostname, settings.allowlistedDomains)) {
    return {
      ...inspection,
      level: 'safe' as const,
      signals: ['Domain is on your allowlist.', ...inspection.signals.slice(0, 2)],
    };
  }

  return inspection;
}

export async function getSettings(): Promise<ExtensionSettings> {
  return loadSettings();
}

export async function updateSettings(settings: ExtensionSettings): Promise<void> {
  await saveSettings(settings);
}
