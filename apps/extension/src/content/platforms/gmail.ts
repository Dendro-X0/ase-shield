import type { PlatformAdapter } from '../platform-types.js';
import { collectText, debounce } from '../platform-types.js';

export const gmailAdapter: PlatformAdapter = {
  platform: 'gmail',

  getThreadId(): string | null {
    const hash = location.hash;
    const match = hash.match(/[#/]([a-f0-9]{16,})/i);
    return match?.[1] ?? null;
  },

  extractVisibleText(): string {
    const bodies = document.querySelectorAll('.a3s.aiL, .ii.gt div');
    const headers = document.querySelectorAll('.gD, .go span[email], h2.hP');
    const bodyText = collectText(bodies);
    const headerText = collectText(headers);
    return [headerText, bodyText].filter(Boolean).join('\n\n').slice(0, 12_000);
  },

  getSenderHints(): string[] {
    const hints = new Set<string>();
    for (const el of Array.from(document.querySelectorAll('.gD, .go span[email], .qu span[email]'))) {
      const email = el.getAttribute('email') ?? el.textContent?.trim();
      if (email) hints.add(email);
    }
    return [...hints];
  },

  getMountTarget(): HTMLElement {
    return document.querySelector('[role="main"]') ?? document.body;
  },

  observe(onChange: () => void): () => void {
    const debounced = debounce(onChange, 600);
    const observer = new MutationObserver(debounced);
    const main = document.querySelector('[role="main"]') ?? document.body;
    observer.observe(main, { childList: true, subtree: true });
    window.addEventListener('hashchange', debounced);
    return () => {
      observer.disconnect();
      window.removeEventListener('hashchange', debounced);
    };
  },
};
