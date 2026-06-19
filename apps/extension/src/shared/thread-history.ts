import type { Platform } from '@ase/core';

const HISTORY_KEY = 'aseThreadHistory';

export interface ThreadHistoryRecord {
  platform: Platform;
  threadId: string;
  chunks: string[];
  senderHints: string[];
  updatedAt: string;
}

export async function mergeThreadHistory(
  platform: Platform,
  threadId: string,
  newChunks: string[],
  senderHints: string[],
): Promise<ThreadHistoryRecord> {
  const all = await loadAllHistory();
  const key = `${platform}:${threadId}`;
  const existing = all[key];

  const chunkSet = new Set(existing?.chunks ?? []);
  for (const chunk of newChunks) {
    if (chunk.trim()) chunkSet.add(chunk.trim());
  }

  const hintSet = new Set(existing?.senderHints ?? []);
  for (const hint of senderHints) {
    if (hint.trim()) hintSet.add(hint.trim());
  }

  const record: ThreadHistoryRecord = {
    platform,
    threadId,
    chunks: [...chunkSet].slice(-40),
    senderHints: [...hintSet],
    updatedAt: new Date().toISOString(),
  };

  all[key] = record;
  await chrome.storage.local.set({ [HISTORY_KEY]: all });
  return record;
}

export async function getThreadHistory(
  platform: Platform,
  threadId: string,
): Promise<ThreadHistoryRecord | null> {
  const all = await loadAllHistory();
  return all[`${platform}:${threadId}`] ?? null;
}

async function loadAllHistory(): Promise<Record<string, ThreadHistoryRecord>> {
  const stored = await chrome.storage.local.get(HISTORY_KEY);
  const raw = stored[HISTORY_KEY];
  if (!raw || typeof raw !== 'object') return {};
  return raw as Record<string, ThreadHistoryRecord>;
}
