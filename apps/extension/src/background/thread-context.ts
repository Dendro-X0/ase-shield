import {
  createIpcMessage,
  type Platform,
  type RiskLevel,
  type SessionEventPayload,
} from '@ase/core';

import { appendIncident } from '../shared/incident-log.js';
import { syncIncidentToCompanion } from './incident-sync.js';
import { sendIpcMessage } from './companion.js';

export interface ThreadContextSyncPayload {
  platform: Platform;
  threadId?: string;
  senderLabel?: string;
  level?: RiskLevel;
  ruleIds?: string[];
  summary?: string;
}

export async function syncThreadContextToCompanion(
  payload: ThreadContextSyncPayload,
): Promise<void> {
  const message = createIpcMessage('THREAD_CONTEXT', {
    platform: payload.platform,
    threadId: payload.threadId,
    senderLabel: payload.senderLabel,
    level: payload.level,
    ruleIds: payload.ruleIds,
    summary: payload.summary,
  });

  await sendIpcMessage(message);
}

export async function handleCompanionPendingEvents(
  events: SessionEventPayload[] | undefined,
): Promise<void> {
  if (!events?.length) return;

  for (const event of events) {
    if (event.event !== 'remote_session_detected') continue;

    const record = await appendIncident({
      platform: event.platform ?? 'unknown',
      threadId: event.threadId,
      level: event.level ?? 'caution',
      ruleIds: event.ruleIds?.length ? event.ruleIds : ['R04'],
      summary: event.detail ?? 'Remote access tool detected during flagged job thread.',
    });
    await syncIncidentToCompanion(record);
  }
}
