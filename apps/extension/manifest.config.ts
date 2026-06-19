import { defineManifest } from '@crxjs/vite-plugin';

export default defineManifest({
  manifest_version: 3,
  name: 'Anti-SE Shield',
  version: '1.0.0-beta.1',
  description:
    'Local-first protection against freelance and B2B scam patterns. No data leaves your device.',
  permissions: ['storage', 'downloads', 'management'],
  host_permissions: [
    'http://127.0.0.1:47123/*',
    'https://mail.google.com/*',
    'https://www.linkedin.com/*',
    'https://www.upwork.com/*',
    'https://web.whatsapp.com/*',
    'https://web.telegram.org/*',
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
      matches: ['https://mail.google.com/*'],
      js: ['src/content/entry-gmail.ts'],
      run_at: 'document_idle',
    },
    {
      matches: ['https://www.linkedin.com/*'],
      js: ['src/content/entry-linkedin.ts'],
      run_at: 'document_idle',
    },
    {
      matches: ['https://www.upwork.com/*'],
      js: ['src/content/entry-upwork.ts'],
      run_at: 'document_idle',
    },
    {
      matches: ['https://web.whatsapp.com/*'],
      js: ['src/content/entry-whatsapp.ts'],
      run_at: 'document_idle',
    },
    {
      matches: ['https://web.telegram.org/*'],
      js: ['src/content/entry-telegram.ts'],
      run_at: 'document_idle',
    },
  ],
});
