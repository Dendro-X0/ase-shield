import { splitTextIntoChunks, type MessageChunk, type PlatformAdapter } from '@ase/core';

import { fetchFiverrConversation } from './fiverr-api.js';
import {
  extractFiverrMessagesFromDom,
  findFiverrMountTarget,
  findFiverrObserveRoot,
  parseFiverrThreadUsername,
  snapshotFromApiMessages,
  type FiverrDomSnapshot,
} from './fiverr-dom.js';
import { debounce } from '../platform-types.js';

const API_POLL_MS = 8_000;

type FiverrCache = FiverrDomSnapshot & { source: 'api' | 'dom' | 'empty' };

const emptyCache = (): FiverrCache => ({
  text: '',
  chunks: [],
  senderHints: [],
  source: 'empty',
});

let cache: FiverrCache = emptyCache();

async function refreshCache(): Promise<void> {
  const threadUsername = parseFiverrThreadUsername();

  if (threadUsername) {
    try {
      const messages = await fetchFiverrConversation(threadUsername);
      if (messages.length > 0) {
        const snapshot = snapshotFromApiMessages(messages, threadUsername);
        cache = { ...snapshot, source: 'api' };
        return;
      }
    } catch {
      // Fall back to DOM when API is unavailable (logged out, rate limit, etc.).
    }
  }

  const dom = extractFiverrMessagesFromDom();
  cache = {
    ...dom,
    source: dom.text.length > 0 ? 'dom' : 'empty',
  };
}

export const fiverrAdapter: PlatformAdapter = {
  platform: 'fiverr',

  prepare: refreshCache,

  getThreadId(): string | null {
    return parseFiverrThreadUsername();
  },

  extractVisibleText(): string {
    if (cache.text.length > 0) return cache.text;
    return extractFiverrMessagesFromDom().text;
  },

  getSenderHints(): string[] {
    if (cache.senderHints.length > 0) return cache.senderHints;
    return extractFiverrMessagesFromDom().senderHints;
  },

  getMountTarget(): HTMLElement {
    return findFiverrMountTarget();
  },

  extractMessageChunks(): MessageChunk[] {
    if (cache.chunks.length > 0) return cache.chunks;
    const dom = extractFiverrMessagesFromDom();
    return dom.chunks.length > 0 ? dom.chunks : splitTextIntoChunks(dom.text);
  },

  observe(onChange: () => void): () => void {
    const trigger = debounce(() => {
      void refreshCache().then(onChange);
    }, 700);

    void refreshCache().then(onChange);

    const root = findFiverrObserveRoot();
    const observer = new MutationObserver(trigger);
    observer.observe(root, { childList: true, subtree: true, characterData: true });

    const threadUsername = parseFiverrThreadUsername();
    const poll = threadUsername ? window.setInterval(trigger, API_POLL_MS) : null;

    return () => {
      observer.disconnect();
      if (poll != null) window.clearInterval(poll);
    };
  },
};

/** Exposed for unit tests and manual debugging in DevTools. */
export const __fiverrDebug = {
  refreshCache,
  getCache: () => cache,
  parseFiverrThreadUsername,
  extractFiverrMessagesFromDom,
};
