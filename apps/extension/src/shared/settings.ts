import type { ExtensionSettings } from './types.js';
import { DEFAULT_SETTINGS, SETTINGS_STORAGE_KEY } from './types.js';

export async function loadSettings(): Promise<ExtensionSettings> {
  const stored = await chrome.storage.local.get(SETTINGS_STORAGE_KEY);
  const raw = stored[SETTINGS_STORAGE_KEY];
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_SETTINGS };
  return { ...DEFAULT_SETTINGS, ...(raw as ExtensionSettings) };
}

export async function saveSettings(settings: ExtensionSettings): Promise<void> {
  await chrome.storage.local.set({ [SETTINGS_STORAGE_KEY]: settings });
}

export function isDomainAllowlisted(hostname: string, allowlist: string[]): boolean {
  const normalized = hostname.toLowerCase();
  return allowlist.some((entry) => {
    const domain = entry.trim().toLowerCase();
    if (!domain) return false;
    return normalized === domain || normalized.endsWith(`.${domain}`);
  });
}
