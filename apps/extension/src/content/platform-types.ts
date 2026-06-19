import type { Platform } from '@ase/core';

export interface MessageChunk {
  text: string;
  index: number;
}

export type AdapterMode = 'full' | 'links-only';

export interface PlatformAdapter {
  platform: Platform;
  mode?: AdapterMode;
  getThreadId(): string | null;
  extractVisibleText(): string;
  getSenderHints(): string[];
  getMountTarget(): HTMLElement;
  observe(onChange: () => void): () => void;
  extractMessageChunks?(): MessageChunk[];
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

export function splitTextIntoChunks(text: string, maxChunk = 500): MessageChunk[] {
  const paragraphs = text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
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
