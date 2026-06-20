import type { Platform } from '@ase/core';

import { attachLinkInspector } from './link-inspector.js';
import type { PlatformAdapter } from './platform-types.js';

export { createLinksOnlyAdapter as createLightAdapter } from '@ase/core';

const CHIP_ID = 'ase-link-guard-chip';

export function bootstrapLinksOnly(adapter: PlatformAdapter): void {
  let detachLinks: (() => void) | null = null;
  let chip: HTMLElement | null = null;

  const registerContext = () => {
    void chrome.runtime.sendMessage({
      type: 'REGISTER_THREAD_CONTEXT',
      payload: {
        platform: adapter.platform,
        threadId: adapter.getThreadId() ?? undefined,
        senderHints: adapter.getSenderHints(),
      },
    });
  };

  const mount = () => {
    if (!chip) {
      chip = document.createElement('div');
      chip.id = CHIP_ID;
      chip.setAttribute('role', 'status');
      chip.style.cssText = `
        position: fixed;
        bottom: 16px;
        right: 16px;
        z-index: 2147483646;
        padding: 8px 12px;
        border-radius: 999px;
        background: #1a2332;
        border: 1px solid #2a3648;
        color: #93c5fd;
        font: 12px system-ui, sans-serif;
        box-shadow: 0 4px 16px rgba(0,0,0,0.25);
      `;
      chip.textContent = `ASE link guard · ${labelFor(adapter.platform)}`;
      document.body.append(chip);
    }

    if (!detachLinks) detachLinks = attachLinkInspector(document.body);
    registerContext();
  };

  mount();
  const unobserve = adapter.observe(() => {
    mount();
    registerContext();
  });

  window.addEventListener('beforeunload', () => {
    unobserve();
    detachLinks?.();
    chip?.remove();
  });
}

function labelFor(platform: Platform): string {
  if (platform === 'whatsapp') return 'WhatsApp Web';
  if (platform === 'telegram') return 'Telegram Web';
  return platform;
}

