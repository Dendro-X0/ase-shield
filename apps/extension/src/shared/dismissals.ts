import type { Platform } from '@ase/core';

import { DISMISSALS_STORAGE_KEY } from './types.js';
import type { ThreadDismissal } from './types.js';

function dismissalKey(platform: Platform, threadId: string): string {
  return `${platform}:${threadId}`;
}

export async function loadDismissals(): Promise<Record<string, ThreadDismissal>> {
  const stored = await chrome.storage.local.get(DISMISSALS_STORAGE_KEY);
  const raw = stored[DISMISSALS_STORAGE_KEY];
  if (!raw || typeof raw !== 'object') return {};
  return raw as Record<string, ThreadDismissal>;
}

export async function isThreadDismissed(
  platform: Platform,
  threadId: string | undefined,
): Promise<boolean> {
  if (!threadId) return false;
  const dismissals = await loadDismissals();
  return dismissalKey(platform, threadId) in dismissals;
}

export async function dismissThread(platform: Platform, threadId: string): Promise<void> {
  const dismissals = await loadDismissals();
  dismissals[dismissalKey(platform, threadId)] = {
    platform,
    threadId,
    dismissedAt: new Date().toISOString(),
  };
  await chrome.storage.local.set({ [DISMISSALS_STORAGE_KEY]: dismissals });
}
