import type { ExtensionSettingsSync } from '@ase/core';

import type { ExtensionSettings } from './types.js';
import { loadSettings, saveSettings } from './settings.js';

export function toSettingsSync(settings: ExtensionSettings): ExtensionSettingsSync {
  return {
    disabledRuleIds: settings.disabledRuleIds,
    allowlistedDomains: settings.allowlistedDomains,
    showJobBrowserHint: settings.showJobBrowserHint,
    overlaysEnabled: settings.overlaysEnabled,
    marketplaceOnlyScan: settings.marketplaceOnlyScan,
  };
}

export async function applySettingsSync(sync: ExtensionSettingsSync): Promise<void> {
  const current = await loadSettings();
  await saveSettings({
    ...current,
    disabledRuleIds: sync.disabledRuleIds,
    allowlistedDomains: sync.allowlistedDomains,
    showJobBrowserHint: sync.showJobBrowserHint,
    overlaysEnabled: sync.overlaysEnabled,
    marketplaceOnlyScan: sync.marketplaceOnlyScan,
  });
}
