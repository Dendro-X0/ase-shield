import type { Platform, RiskLevel } from '@ase/core';

import type { IncidentRecord } from './types.js';
import { CRYPTO_KEY_STORAGE_KEY } from './types.js';

const DB_NAME = 'ase-incident-log';
const DB_VERSION = 1;
const STORE_NAME = 'incidents';

async function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function getCryptoKey(): Promise<CryptoKey> {
  const stored = await chrome.storage.local.get(CRYPTO_KEY_STORAGE_KEY);
  const jwk = stored[CRYPTO_KEY_STORAGE_KEY] as JsonWebKey | undefined;

  if (jwk) {
    return crypto.subtle.importKey('jwk', jwk, { name: 'AES-GCM', length: 256 }, true, [
      'encrypt',
      'decrypt',
    ]);
  }

  const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, [
    'encrypt',
    'decrypt',
  ]);
  const exported = await crypto.subtle.exportKey('jwk', key);
  await chrome.storage.local.set({ [CRYPTO_KEY_STORAGE_KEY]: exported });
  return key;
}

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function fromBase64(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function encryptRecord(record: IncidentRecord): Promise<{ iv: string; data: string }> {
  const key = await getCryptoKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(JSON.stringify(record));
  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);
  return { iv: toBase64(iv), data: toBase64(new Uint8Array(cipher)) };
}

async function decryptRecord(ivB64: string, dataB64: string): Promise<IncidentRecord> {
  const key = await getCryptoKey();
  const iv = fromBase64(ivB64);
  const cipher = fromBase64(dataB64);
  const plain = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv as BufferSource },
    key,
    cipher as BufferSource,
  );
  return JSON.parse(new TextDecoder().decode(plain)) as IncidentRecord;
}

interface StoredCipher {
  id: string;
  iv: string;
  data: string;
}

export async function appendIncident(entry: {
  platform: Platform;
  threadId?: string;
  level: RiskLevel;
  ruleIds: string[];
  summary: string;
}): Promise<IncidentRecord> {
  const record: IncidentRecord = {
    id: crypto.randomUUID(),
    ...entry,
    recordedAt: new Date().toISOString(),
  };

  const encrypted = await encryptRecord(record);
  const db = await openDb();

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const stored: StoredCipher = { id: record.id, iv: encrypted.iv, data: encrypted.data };
    store.put(stored);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });

  db.close();
  return record;
}

export async function listIncidents(limit = 50): Promise<IncidentRecord[]> {
  const db = await openDb();

  const ciphers = await new Promise<StoredCipher[]>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result as StoredCipher[]);
    request.onerror = () => reject(request.error);
  });

  db.close();

  const records: IncidentRecord[] = [];
  for (const cipher of ciphers.slice(-limit)) {
    try {
      records.push(await decryptRecord(cipher.iv, cipher.data));
    } catch {
      // Skip corrupted entries.
    }
  }

  return records.sort((a, b) => b.recordedAt.localeCompare(a.recordedAt));
}
