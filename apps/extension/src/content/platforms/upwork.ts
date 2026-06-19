import type { PlatformAdapter } from '../platform-types.js';
import { collectText, debounce, splitTextIntoChunks } from '../platform-types.js';

export const upworkAdapter: PlatformAdapter = {
  platform: 'upwork',

  getThreadId(): string | null {
    const roomMatch = location.pathname.match(/\/room\/([^/]+)/i);
    if (roomMatch) return roomMatch[1];
    const nxMatch = location.pathname.match(/\/nx\/wm\/room\/([^/]+)/i);
    return nxMatch?.[1] ?? null;
  },

  extractVisibleText(): string {
    const messages = document.querySelectorAll(
      '[data-test="message-text"], .up-d-message, .story-message, [data-cy="conversation-message"]',
    );
    const headers = document.querySelectorAll(
      '[data-test="room-title"], .room-title, .fe-proposal-room-title',
    );
    const messageText = collectText(messages);
    const headerText = collectText(headers);
    return [headerText, messageText].filter(Boolean).join('\n\n').slice(0, 12_000);
  },

  getSenderHints(): string[] {
    const hints = new Set<string>();
    for (const el of Array.from(
      document.querySelectorAll('[data-test="sender-name"], .up-d-message__sender, .room-title'),
    )) {
      const text = el.textContent?.trim();
      if (text) hints.add(text);
    }
    return [...hints];
  },

  getMountTarget(): HTMLElement {
    return (
      document.querySelector('[data-test="message-list"]') ??
      document.querySelector('.up-d-message-list') ??
      document.querySelector('main') ??
      document.body
    );
  },

  extractMessageChunks() {
    const messages = document.querySelectorAll(
      '[data-test="message-text"], .up-d-message, .story-message',
    );
    const chunks = Array.from(messages)
      .map((el, index) => ({
        text: (el as HTMLElement).innerText?.trim() ?? '',
        index,
      }))
      .filter((chunk) => chunk.text.length > 0);
    return chunks.length > 0 ? chunks : splitTextIntoChunks(this.extractVisibleText());
  },

  observe(onChange: () => void): () => void {
    const debounced = debounce(onChange, 600);
    const root =
      document.querySelector('[data-test="message-list"]') ??
      document.querySelector('main') ??
      document.body;
    const observer = new MutationObserver(debounced);
    observer.observe(root, { childList: true, subtree: true });
    return () => observer.disconnect();
  },
};
