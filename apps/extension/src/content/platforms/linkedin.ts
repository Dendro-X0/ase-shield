import type { PlatformAdapter } from '../platform-types.js';
import { collectText, debounce } from '../platform-types.js';

export const linkedinAdapter: PlatformAdapter = {
  platform: 'linkedin',

  getThreadId(): string | null {
    const match = location.pathname.match(/\/messaging\/thread\/([^/]+)/i);
    return match?.[1] ?? null;
  },

  extractVisibleText(): string {
    const messages = document.querySelectorAll(
      '.msg-s-message-list-content, .msg-s-event-listitem, .msg-s-message-group__meta',
    );
    const headings = document.querySelectorAll(
      '.msg-entity-lockup__entity-title, .msg-thread__link-to-profile',
    );
    const messageText = collectText(messages);
    const headingText = collectText(headings);
    return [headingText, messageText].filter(Boolean).join('\n\n').slice(0, 12_000);
  },

  getSenderHints(): string[] {
    const hints = new Set<string>();
    for (const el of Array.from(
      document.querySelectorAll('.msg-s-message-group__name, .msg-entity-lockup__entity-title'),
    )) {
      const text = el.textContent?.trim();
      if (text) hints.add(text);
    }
    return [...hints];
  },

  getMountTarget(): HTMLElement {
    return (
      document.querySelector('.msg-thread') ??
      document.querySelector('[data-test-messaging-conversation]') ??
      document.body
    );
  },

  observe(onChange: () => void): () => void {
    const debounced = debounce(onChange, 600);
    const observer = new MutationObserver(debounced);
    const root =
      document.querySelector('.msg-thread') ??
      document.querySelector('[data-test-messaging-conversation]') ??
      document.body;
    observer.observe(root, { childList: true, subtree: true });
    return () => observer.disconnect();
  },
};
