import { createIpcMessage } from '@ase/core';

import type { IncidentRecord } from '../shared/types.js';
import { listIncidents } from '../shared/incident-log.js';
import { sendIpcMessage } from './companion.js';

export async function syncIncidentToCompanion(record: IncidentRecord): Promise<void> {
  await sendIpcMessage(
    createIpcMessage('INCIDENT_SYNC', {
      id: record.id,
      platform: record.platform,
      threadId: record.threadId,
      level: record.level,
      ruleIds: record.ruleIds,
      summary: record.summary,
      recordedAt: record.recordedAt,
    }),
  );
}

export async function syncAllIncidentsToCompanion(): Promise<void> {
  const incidents = await listIncidents(50);
  for (const incident of incidents) {
    await syncIncidentToCompanion(incident);
  }
}
