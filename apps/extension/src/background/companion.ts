import {
  COMPANION_IPC_ORIGIN,
  COMPANION_CONNECTION_TIMEOUT_MS,
  connectionStateFromLastPong,
  createIpcMessage,
  parseIpcMessage,
  type ConnectionState,
  type IpcMessage,
  type PongPayload,
} from '@ase/core';

import { handleCompanionPendingEvents } from './thread-context.js';
import { syncAllIncidentsToCompanion } from './incident-sync.js';
import { sendExtensionSnapshot } from './recovery-snapshot.js';

const STORAGE_KEY_LAST_PONG = 'companionLastPongAt';
const PING_INTERVAL_MS = 3_000;

let lastPongAt: number | null = null;
let pingTimer: ReturnType<typeof setInterval> | null = null;
let onCompanionConnected: (() => Promise<void>) | null = null;
let incidentsSynced = false;

export function setOnCompanionConnected(handler: () => Promise<void>): void {
  onCompanionConnected = handler;
}

export async function loadLastPong(): Promise<void> {
  const stored = await chrome.storage.local.get(STORAGE_KEY_LAST_PONG);
  const value = stored[STORAGE_KEY_LAST_PONG];
  lastPongAt = typeof value === 'number' ? value : null;
}

async function saveLastPong(at: number): Promise<void> {
  lastPongAt = at;
  await chrome.storage.local.set({ [STORAGE_KEY_LAST_PONG]: at });
}

export function getConnectionState(): ConnectionState {
  return connectionStateFromLastPong(lastPongAt);
}

export function getLastPongAt(): number | null {
  return lastPongAt;
}

export async function sendIpcMessage(message: IpcMessage): Promise<IpcMessage | null> {
  try {
    const response = await fetch(`${COMPANION_IPC_ORIGIN}/ipc`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message),
    });

    if (!response.ok) return null;

    const body: unknown = await response.json();
    return parseIpcMessage(body);
  } catch {
    return null;
  }
}

export async function pingCompanion(): Promise<void> {
  const message = createIpcMessage('PING', {
    source: 'extension' as const,
    extensionId: chrome.runtime.id,
  });
  const response = await sendIpcMessage(message);

  if (response?.type === 'PONG') {
    await saveLastPong(Date.now());
    const payload = response.payload as PongPayload;
    await handleCompanionPendingEvents(payload.pendingEvents);
    if (payload.requestExtensionSnapshot) {
      await sendExtensionSnapshot();
    }
    if (onCompanionConnected) {
      await onCompanionConnected();
    }
    if (!incidentsSynced) {
      await syncAllIncidentsToCompanion();
      incidentsSynced = true;
    }
  }
}

export function startPingLoop(): void {
  if (pingTimer !== null) return;
  void pingCompanion();
  pingTimer = setInterval(() => {
    void pingCompanion();
  }, PING_INTERVAL_MS);
}

export function stopPingLoop(): void {
  if (pingTimer !== null) {
    clearInterval(pingTimer);
    pingTimer = null;
  }
}

export { COMPANION_CONNECTION_TIMEOUT_MS };
