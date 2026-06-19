import { bootstrapLinksOnly, createLightAdapter } from './bootstrap-links.js';

const adapter = createLightAdapter('whatsapp', {
  getThreadId: () => {
    const match = location.hash.match(/#\/chat\/([^/]+)/);
    return match?.[1] ?? null;
  },
  getSenderHints: () => {
    const hints = new Set<string>();
    for (const el of Array.from(document.querySelectorAll('header span[title], .copyable-text'))) {
      const title = el.getAttribute('title')?.trim();
      const text = el.textContent?.trim();
      if (title) hints.add(title);
      if (text && text.length < 80) hints.add(text);
    }
    return [...hints].slice(0, 5);
  },
  observeRoot: () => document.querySelector('#app') ?? document.body,
});

bootstrapLinksOnly(adapter);
