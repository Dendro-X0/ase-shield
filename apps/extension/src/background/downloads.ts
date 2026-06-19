import { analyze, createIpcMessage } from '@ase/core';
import { rulePack } from '@ase/rules';

import { sendIpcMessage, setOnCompanionConnected } from './companion.js';
import { appendIncident } from '../shared/incident-log.js';

interface ActiveThreadContext {
  platform: string;
  threadId?: string;
  senderLabel?: string;
}

interface PendingQuarantineDownload {
  downloadId: number;
  filename: string;
  url?: string;
  threadId?: string;
  sourcePath?: string;
}

const PENDING_QUARANTINE_KEY = 'pendingQuarantineDownloads';

const flaggedDownloads = new Set<number>();

let activeThread: ActiveThreadContext | null = null;

export function setActiveThread(context: ActiveThreadContext | null): void {
  activeThread = context;
}

export function registerDownloadListener(): void {
  chrome.downloads.onCreated.addListener((item) => {
    void handleDownloadCreated(item);
  });

  chrome.downloads.onChanged.addListener((delta) => {
    if (delta.state?.current === 'complete') {
      void handleDownloadComplete(delta.id);
    }
  });
}

export async function flushPendingQuarantineDownloads(): Promise<void> {
  const stored = await chrome.storage.local.get(PENDING_QUARANTINE_KEY);
  const pending = (stored[PENDING_QUARANTINE_KEY] as PendingQuarantineDownload[] | undefined) ?? [];
  if (pending.length === 0) return;

  const remaining: PendingQuarantineDownload[] = [];

  for (const entry of pending) {
    const path = entry.sourcePath ?? (await resolveDownloadPath(entry.downloadId));
    const payload = { ...entry, sourcePath: path };
    const accepted = await queueForQuarantine(payload);
    if (!accepted) {
      remaining.push(payload);
    } else if (path) {
      await removeBrowserDownload(entry.downloadId);
    }
  }

  await chrome.storage.local.set({ [PENDING_QUARANTINE_KEY]: remaining });
}

async function handleDownloadCreated(item: chrome.downloads.DownloadItem): Promise<void> {
  const filename = basename(item.filename ?? item.url ?? 'unknown');
  const result = analyze(
    {
      kind: 'file-metadata',
      file: {
        name: filename,
        size: item.fileSize ?? item.totalBytes ?? 0,
      },
      context: { platform: 'unknown' },
    },
    rulePack,
  );

  if (result.level === 'safe') return;

  flaggedDownloads.add(item.id);

  await appendIncident({
    platform: 'unknown',
    threadId: activeThread?.threadId,
    level: result.level,
    ruleIds: result.hits.map((hit) => hit.ruleId),
    summary: `Download flagged: ${filename}`,
  });

  void chrome.action.setBadgeText({ text: '!' });
  void chrome.action.setBadgeBackgroundColor({ color: '#ef4444' });

  await notifyCompanionEarly(item.id, filename, item.url);
}

async function handleDownloadComplete(downloadId: number): Promise<void> {
  if (!flaggedDownloads.has(downloadId)) return;

  const [item] = await chrome.downloads.search({ id: downloadId });
  if (!item) {
    flaggedDownloads.delete(downloadId);
    return;
  }

  const filename = basename(item.filename ?? item.url ?? 'unknown');
  const sourcePath = item.filename?.includes('\\') || item.filename?.includes('/')
    ? item.filename
    : undefined;

  const payload: PendingQuarantineDownload = {
    downloadId,
    filename,
    url: item.url,
    threadId: activeThread?.threadId,
    sourcePath,
  };

  const accepted = await queueForQuarantine(payload);
  flaggedDownloads.delete(downloadId);

  if (accepted) {
    await removeBrowserDownload(downloadId);
  } else {
    await enqueuePending(payload);
  }
}

async function notifyCompanionEarly(
  downloadId: number,
  filename: string,
  url?: string,
): Promise<void> {
  const message = createIpcMessage('DOWNLOAD_QUEUED', {
    downloadId,
    filename,
    url,
    threadId: activeThread?.threadId,
  });

  await sendIpcMessage(message);

  if (activeThread?.platform && activeThread.platform !== 'unknown') {
    await sendIpcMessage(
      createIpcMessage('THREAD_CONTEXT', {
        platform: activeThread.platform as 'gmail' | 'linkedin',
        threadId: activeThread.threadId,
        senderLabel: activeThread.senderLabel,
      }),
    );
  }
}

async function queueForQuarantine(payload: PendingQuarantineDownload): Promise<boolean> {
  const message = createIpcMessage('DOWNLOAD_QUEUED', {
    downloadId: payload.downloadId,
    filename: payload.filename,
    url: payload.url,
    threadId: payload.threadId,
    sourcePath: payload.sourcePath,
  });

  const response = await sendIpcMessage(message);
  if (!response || response.type !== 'QUARANTINE_STATUS') return false;

  const status = response.payload.status;
  return status === 'ready' || status === 'scanning';
}

async function enqueuePending(entry: PendingQuarantineDownload): Promise<void> {
  const stored = await chrome.storage.local.get(PENDING_QUARANTINE_KEY);
  const pending = (stored[PENDING_QUARANTINE_KEY] as PendingQuarantineDownload[] | undefined) ?? [];
  pending.push(entry);
  await chrome.storage.local.set({ [PENDING_QUARANTINE_KEY]: pending });
}

async function resolveDownloadPath(downloadId: number): Promise<string | undefined> {
  const [item] = await chrome.downloads.search({ id: downloadId });
  if (!item?.filename) return undefined;
  if (item.filename.includes('\\') || item.filename.includes('/')) return item.filename;
  return undefined;
}

async function removeBrowserDownload(downloadId: number): Promise<void> {
  try {
    await chrome.downloads.removeFile(downloadId);
  } catch {
    // File may already be gone.
  }
  try {
    await chrome.downloads.erase({ id: downloadId });
  } catch {
    // History entry may already be removed.
  }
}

function basename(path: string): string {
  const parts = path.split(/[/\\]/);
  return parts[parts.length - 1] || path;
}

setOnCompanionConnected(flushPendingQuarantineDownloads);
