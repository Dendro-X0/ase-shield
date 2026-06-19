/** Localhost port for extension ↔ companion IPC (M0 dev transport). */
import type { Platform } from './analysis.js';
import type { ExtensionSnapshotPayload } from './recovery.js';
import type { IncidentSyncPayload } from './dashboard.js';

export const COMPANION_IPC_PORT = 47123;

export const COMPANION_IPC_ORIGIN = `http://127.0.0.1:${COMPANION_IPC_PORT}` as const;

/** Protocol version — bump when breaking IPC shape. */
export const IPC_VERSION = 1 as const;

export type IpcMessageType =
  | 'PING'
  | 'PONG'
  | 'DOWNLOAD_QUEUED'
  | 'QUARANTINE_STATUS'
  | 'OPEN_SAFELY_REQUEST'
  | 'SESSION_EVENT'
  | 'THREAD_CONTEXT'
  | 'EXTENSION_SNAPSHOT'
  | 'INCIDENT_SYNC';

export interface IpcEnvelope<T extends IpcMessageType = IpcMessageType, P = unknown> {
  v: typeof IPC_VERSION;
  type: T;
  payload: P;
  /** ISO-8601 timestamp from sender's local clock */
  sentAt: string;
}

export interface PingPayload {
  source: 'extension';
  /** chrome.runtime.id — lets companion build extension page URLs for the dashboard. */
  extensionId?: string;
}

export interface PongPayload {
  source: 'companion';
  companionVersion: string;
  pendingEvents?: SessionEventPayload[];
  requestExtensionSnapshot?: boolean;
}

export interface DownloadQueuedPayload {
  downloadId: number;
  filename: string;
  url?: string;
  sha256?: string;
  threadId?: string;
  sourcePath?: string;
}

export interface QuarantineStatusPayload {
  downloadId: number;
  status: 'queued' | 'scanning' | 'ready' | 'error';
  level?: 'safe' | 'caution' | 'high-risk';
  message?: string;
  quarantineId?: string;
  findings?: string[];
}

export interface OpenSafelyRequestPayload {
  quarantineId: string;
}

export interface SessionEventPayload {
  event: 'sandbox_started' | 'sandbox_ended' | 'remote_session_detected';
  detail?: string;
  tier?: 'tier1' | 'tier2' | 'tier3';
  sessionId?: string;
  quarantineId?: string;
  platform?: Platform;
  threadId?: string;
  level?: 'safe' | 'caution' | 'high-risk';
  ruleIds?: string[];
}

export interface ThreadContextPayload {
  platform: Platform;
  threadId?: string;
  senderLabel?: string;
  level?: 'safe' | 'caution' | 'high-risk';
  ruleIds?: string[];
  summary?: string;
}

export type { BrowserExtensionSnapshotEntry, ExtensionSnapshotPayload } from './recovery.js';

export type PingMessage = IpcEnvelope<'PING', PingPayload>;
export type PongMessage = IpcEnvelope<'PONG', PongPayload>;
export type DownloadQueuedMessage = IpcEnvelope<'DOWNLOAD_QUEUED', DownloadQueuedPayload>;
export type QuarantineStatusMessage = IpcEnvelope<'QUARANTINE_STATUS', QuarantineStatusPayload>;
export type OpenSafelyRequestMessage = IpcEnvelope<'OPEN_SAFELY_REQUEST', OpenSafelyRequestPayload>;
export type SessionEventMessage = IpcEnvelope<'SESSION_EVENT', SessionEventPayload>;
export type ThreadContextMessage = IpcEnvelope<'THREAD_CONTEXT', ThreadContextPayload>;
export type ExtensionSnapshotMessage = IpcEnvelope<'EXTENSION_SNAPSHOT', ExtensionSnapshotPayload>;
export type IncidentSyncMessage = IpcEnvelope<'INCIDENT_SYNC', IncidentSyncPayload>;

export type IpcMessage =
  | PingMessage
  | PongMessage
  | DownloadQueuedMessage
  | QuarantineStatusMessage
  | OpenSafelyRequestMessage
  | SessionEventMessage
  | ThreadContextMessage
  | ExtensionSnapshotMessage
  | IncidentSyncMessage;

export type { IncidentSyncPayload } from './dashboard.js';

export function createIpcMessage<T extends IpcMessageType, P>(
  type: T,
  payload: P,
): IpcEnvelope<T, P> {
  return {
    v: IPC_VERSION,
    type,
    payload,
    sentAt: new Date().toISOString(),
  };
}

export function isIpcEnvelope(value: unknown): value is IpcEnvelope {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    record.v === IPC_VERSION &&
    typeof record.type === 'string' &&
    'payload' in record &&
    typeof record.sentAt === 'string'
  );
}

export function parseIpcMessage(raw: unknown): IpcMessage | null {
  if (!isIpcEnvelope(raw)) return null;
  return raw as IpcMessage;
}

/** Companion connection considered alive if last PONG within this window (ms). */
export const COMPANION_CONNECTION_TIMEOUT_MS = 10_000;

export type ConnectionState = 'connected' | 'disconnected' | 'unknown';

export function connectionStateFromLastPong(lastPongAt: number | null): ConnectionState {
  if (lastPongAt === null) return 'unknown';
  return Date.now() - lastPongAt <= COMPANION_CONNECTION_TIMEOUT_MS
    ? 'connected'
    : 'disconnected';
}
