import { bootstrapLinksOnly, createLightAdapter } from './bootstrap-links.js';

const adapter = createLightAdapter('telegram', {
  getThreadId: () => {
    const match = location.hash.match(/#(-?\d+)/);
    return match?.[1] ?? null;
  },
  getSenderHints: () => {
    const hints = new Set<string>();
    for (const el of Array.from(
      document.querySelectorAll('.chat-info .fullName, .message .name, .peer-title'),
    )) {
      const text = el.textContent?.trim();
      if (text) hints.add(text);
    }
    return [...hints].slice(0, 5);
  },
  observeRoot: () => document.querySelector('#column-center') ?? document.body,
});

bootstrapLinksOnly(adapter);
