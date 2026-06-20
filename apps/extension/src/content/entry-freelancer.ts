import { bootstrapLinksOnly, createLightAdapter } from './bootstrap-links.js';

const adapter = createLightAdapter('unknown', {
  getThreadId: () => {
    const match = location.pathname.match(/\/messages\/thread\/(\d+)/i);
    return match?.[1] ?? null;
  },
  getSenderHints: () => {
    const hints = new Set<string>();
    for (const el of Array.from(document.querySelectorAll('header h1, .thread-title, .username'))) {
      const text = el.textContent?.trim();
      if (text && text.length < 80) hints.add(text);
    }
    return [...hints].slice(0, 5);
  },
  observeRoot: () => document.querySelector('#main') ?? document.body,
});

bootstrapLinksOnly(adapter);
