import type { Platform } from './analysis.js';

export type AdapterMode = 'full' | 'links-only';

export interface MessageChunk {
  text: string;
  index: number;
}

/** DOM contract for platform content scripts (extension implements; rules stay agnostic). */
export interface PlatformAdapter {
  platform: Platform;
  mode?: AdapterMode;
  getThreadId(): string | null;
  extractVisibleText(): string;
  getSenderHints(): string[];
  getMountTarget(): HTMLElement;
  observe(onChange: () => void): () => void;
  extractMessageChunks?(): MessageChunk[];
  /** Optional async warm-up (e.g. platform inbox API) before text extraction. */
  prepare?(): Promise<void>;
}

export function splitTextIntoChunks(text: string, maxChunk = 500): MessageChunk[] {
  const paragraphs = text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
  const chunks: MessageChunk[] = [];
  let index = 0;

  for (const paragraph of paragraphs) {
    if (paragraph.length <= maxChunk) {
      chunks.push({ text: paragraph, index });
      index += 1;
      continue;
    }

    for (let i = 0; i < paragraph.length; i += maxChunk) {
      chunks.push({ text: paragraph.slice(i, i + maxChunk), index });
      index += 1;
    }
  }

  return chunks;
}

export function collectText(nodes: NodeListOf<Element> | Element[]): string {
  const parts: string[] = [];
  for (const node of Array.from(nodes)) {
    const text = (node as HTMLElement).innerText?.trim();
    if (text) parts.push(text);
  }
  return parts.join('\n\n');
}

export function debounce<T extends (...args: never[]) => void>(fn: T, ms: number): T {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return ((...args: never[]) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  }) as T;
}

/** Build a links-only adapter for messaging surfaces without full thread DOM. */
export function createLinksOnlyAdapter(
  platform: Platform,
  options: {
    getThreadId: () => string | null;
    getSenderHints: () => string[];
    observeRoot: () => HTMLElement;
  },
): PlatformAdapter {
  return {
    platform,
    mode: 'links-only',
    getThreadId: options.getThreadId,
    extractVisibleText: () => '',
    getSenderHints: options.getSenderHints,
    getMountTarget: () => document.body,
    observe: (onChange) => {
      const root = options.observeRoot();
      const debounced = debounce(onChange, 600);
      const observer = new MutationObserver(debounced);
      observer.observe(root, { childList: true, subtree: true });
      return () => observer.disconnect();
    },
  };
}
