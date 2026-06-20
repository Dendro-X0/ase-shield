import { defineManifest } from '@crxjs/vite-plugin';

/** Universal scanner runs on HTTPS pages (forums, Discord web, marketplaces, etc.). */
const UNIVERSAL_SCAN_MATCHES = ['https://*/*'];

/** Store / browser surfaces where injection is unnecessary or disallowed. */
const UNIVERSAL_SCAN_EXCLUDE = [
  'https://chrome.google.com/*',
  'https://chromewebstore.google.com/*',
];

export default defineManifest({
  manifest_version: 3,
  name: 'Anti-SE Shield',
  version: '1.0.0-beta.3',
  description:
    'Local-first protection against freelance and B2B scam patterns. No data leaves your device.',
  permissions: ['storage', 'downloads', 'management', 'contextMenus', 'scripting', 'activeTab'],
  host_permissions: [
    'http://127.0.0.1:47123/*',
    'https://*/*',
  ],
  background: {
    service_worker: 'src/background/service-worker.ts',
    type: 'module',
  },
  action: {
    default_title: 'Anti-SE Shield',
    default_popup: 'src/popup/popup.html',
  },
  options_ui: {
    page: 'src/options/options.html',
    open_in_tab: true,
  },
  content_scripts: [
    {
      matches: UNIVERSAL_SCAN_MATCHES,
      exclude_matches: UNIVERSAL_SCAN_EXCLUDE,
      js: ['src/content/entry-universal.ts'],
      run_at: 'document_idle',
    },
  ],
});
