/** Extension settings mirrored on the dashboard (excludes onboarding flags). */
export interface ExtensionSettingsSync {
  disabledRuleIds: string[];
  allowlistedDomains: string[];
  showJobBrowserHint: boolean;
  overlaysEnabled: boolean;
  /** When true, automatic universal scan runs only on freelance/B2B marketplaces. */
  marketplaceOnlyScan: boolean;
}

export interface DashboardSettingsResponse {
  extensionConnected: boolean;
  syncedAt: number | null;
  pendingSave: boolean;
  settings: ExtensionSettingsSync | null;
}

export const DEFAULT_EXTENSION_SETTINGS_SYNC: ExtensionSettingsSync = {
  disabledRuleIds: [],
  allowlistedDomains: [],
  showJobBrowserHint: true,
  overlaysEnabled: true,
  marketplaceOnlyScan: true,
};
