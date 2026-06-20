import type { MessageChunk } from '@ase/core';

/** Reserved inbox path segments — not usernames. */
const RESERVED_INBOX_SEGMENTS = new Set(['contacts', 'search', 'settings']);

/** Fiverr inbox thread URLs: /inbox/{username} */
export const FIVERR_INBOX_THREAD_RE = /\/inbox\/([^/?#]+)/i;

export interface FiverrDomSnapshot {
  text: string;
  chunks: MessageChunk[];
  senderHints: string[];
}

export function parseFiverrThreadUsername(href = location.href): string | null {
  let pathname: string;
  try {
    pathname = new URL(href).pathname;
  } catch {
    return null;
  }

  const match = pathname.match(FIVERR_INBOX_THREAD_RE);
  const segment = match?.[1]?.trim();
  if (!segment || RESERVED_INBOX_SEGMENTS.has(segment.toLowerCase())) return null;
  return segment;
}

export function findFiverrComposer(doc: Document = document): HTMLElement | null {
  const selectors = [
    'textarea[placeholder*="Type a message" i]',
    'textarea[placeholder*="message" i]',
    '[data-testid*="message-input" i]',
    '[data-testid*="compose" i]',
    '[contenteditable="true"][role="textbox"]',
    '[contenteditable="true"][aria-label*="message" i]',
  ];

  for (const selector of selectors) {
    const el = doc.querySelector<HTMLElement>(selector);
    if (el) return el;
  }

  return null;
}

export function findFiverrConversationRoot(doc: Document = document): HTMLElement | null {
  const composer = findFiverrComposer(doc);
  if (composer) {
    const panel =
      composer.closest<HTMLElement>(
        '[data-testid*="conversation" i], [class*="conversation" i], [class*="Conversation" i]',
      ) ?? composer.parentElement;
    if (panel && panel !== doc.body) return panel;

    const scrollRoot = findScrollableAncestor(composer, doc.body);
    if (scrollRoot) return scrollRoot.parentElement ?? scrollRoot;
  }

  const explicit =
    doc.querySelector<HTMLElement>('[data-testid*="conversation-panel" i]') ??
    doc.querySelector<HTMLElement>('[data-testid*="message-panel" i]') ??
    doc.querySelector<HTMLElement>('[class*="conversation-panel" i]') ??
    doc.querySelector<HTMLElement>('[role="log"]')?.parentElement ??
    null;
  if (explicit) return explicit;

  const main = doc.querySelector<HTMLElement>('main');
  return main ?? doc.body;
}

export function findFiverrMountTarget(doc: Document = document): HTMLElement {
  const root = findFiverrConversationRoot(doc) ?? doc.body;
  const header =
    root.querySelector<HTMLElement>('[data-testid*="conversation-header" i]') ??
    root.querySelector<HTMLElement>('[data-testid*="header" i]') ??
    root.querySelector<HTMLElement>('header') ??
    root.firstElementChild;

  return (header as HTMLElement | null) ?? root;
}

export function findFiverrObserveRoot(doc: Document = document): HTMLElement {
  return findFiverrConversationRoot(doc) ?? doc.body;
}

export function extractFiverrMessagesFromDom(doc: Document = document): FiverrDomSnapshot {
  const root = findFiverrConversationRoot(doc) ?? doc.body;
  const threadUsername = parseFiverrThreadUsername(doc.defaultView?.location.href ?? '');
  const nodes = queryMessageNodes(root);
  const chunks = nodes
    .map((node, index) => ({
      text: messageTextFromNode(node),
      index,
    }))
    .filter((chunk) => chunk.text.length > 0);

  const text = chunks.map((chunk) => chunk.text).join('\n\n').slice(0, 12_000);
  const senderHints = extractSenderHints(root, threadUsername);

  return { text, chunks, senderHints };
}

function findScrollableAncestor(start: HTMLElement, stop: HTMLElement): HTMLElement | null {
  let el: HTMLElement | null = start.parentElement;
  while (el && el !== stop) {
    const style = el.ownerDocument.defaultView?.getComputedStyle(el);
    if (
      style &&
      (style.overflowY === 'auto' ||
        style.overflowY === 'scroll' ||
        style.overflow === 'auto' ||
        style.overflow === 'scroll')
    ) {
      return el;
    }
    el = el.parentElement;
  }
  return null;
}

function queryMessageNodes(root: HTMLElement): HTMLElement[] {
  const strategies: Array<() => HTMLElement[]> = [
    () => collectFromRoleLog(root),
    () => collectFromTestIds(root),
    () => collectFromClassHints(root),
    () => collectFromStructuralRepeats(root),
  ];

  for (const strategy of strategies) {
    const nodes = dedupeMessageNodes(strategy());
    if (nodes.length > 0) return nodes;
  }

  return [];
}

function directChildElements(parent: Element): HTMLElement[] {
  return Array.from(parent.children).filter((child): child is HTMLElement => child instanceof HTMLElement);
}

function collectFromRoleLog(root: HTMLElement): HTMLElement[] {
  const log = root.querySelector('[role="log"]');
  if (!log) return [];

  const candidates = [
    ...Array.from(log.querySelectorAll<HTMLElement>('[role="article"]')),
    ...Array.from(log.querySelectorAll<HTMLElement>('[data-testid*="message" i]')),
    ...directChildElements(log),
  ];

  return candidates.filter((node) => isLikelyMessageNode(node));
}

function collectFromTestIds(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>('[data-testid*="message" i]')).filter(
    (node) => !isComposerOrMetaNode(node) && isLikelyMessageNode(node),
  );
}

function collectFromClassHints(root: HTMLElement): HTMLElement[] {
  const selectors = [
    '[class*="MessageBubble" i]',
    '[class*="message-bubble" i]',
    '[class*="message-body" i]',
    '[class*="MessageContent" i]',
    '[class*="message-content" i]',
    '[class*="conversation-message" i]',
    '.msg-content',
  ];

  const nodes: HTMLElement[] = [];
  for (const selector of selectors) {
    nodes.push(
      ...Array.from(root.querySelectorAll<HTMLElement>(selector)).filter(
        (node) => !isComposerOrMetaNode(node) && isLikelyMessageNode(node),
      ),
    );
  }
  return nodes;
}

function collectFromStructuralRepeats(root: HTMLElement): HTMLElement[] {
  const scrollRoot =
    findScrollableAncestor(root, root) ??
    root.querySelector<HTMLElement>('[role="log"]') ??
    root;

  const groups = new Map<string, HTMLElement[]>();
  for (const child of directChildElements(scrollRoot)) {
    collectStructuralMessageCandidates(child, groups);
  }
  for (const child of Array.from(scrollRoot.querySelectorAll<HTMLElement>('div, li'))) {
    if (child.closest('[role="log"]') !== scrollRoot.querySelector('[role="log"]')) continue;
    collectStructuralMessageCandidate(child, groups);
  }

  let best: HTMLElement[] = [];
  for (const bucket of groups.values()) {
    if (bucket.length > best.length) best = bucket;
  }
  return best.length >= 2 ? best : [];
}

function collectStructuralMessageCandidates(node: HTMLElement, groups: Map<string, HTMLElement[]>): void {
  collectStructuralMessageCandidate(node, groups);
  for (const child of directChildElements(node)) {
    collectStructuralMessageCandidates(child, groups);
  }
}

function collectStructuralMessageCandidate(node: HTMLElement, groups: Map<string, HTMLElement[]>): void {
  if (!isLikelyMessageNode(node)) return;
  const key = `${node.tagName}:${node.className.slice(0, 48)}`;
  const bucket = groups.get(key) ?? [];
  bucket.push(node);
  groups.set(key, bucket);
}

function dedupeMessageNodes(nodes: HTMLElement[]): HTMLElement[] {
  const seen = new Set<HTMLElement>();
  const result: HTMLElement[] = [];

  for (const node of nodes) {
    if (seen.has(node)) continue;

    const dominated = [...seen].some(
      (existing) => existing !== node && existing.contains(node),
    );
    if (dominated) continue;

    for (const existing of [...seen]) {
      if (node.contains(existing)) seen.delete(existing);
    }

    seen.add(node);
    result.push(node);
  }

  return result.sort((a, b) => {
    const position = a.compareDocumentPosition(b);
    if (position & Node.DOCUMENT_POSITION_FOLLOWING) return -1;
    if (position & Node.DOCUMENT_POSITION_PRECEDING) return 1;
    return 0;
  });
}

function isComposerOrMetaNode(node: HTMLElement): boolean {
  const testId = node.dataset.testid?.toLowerCase() ?? '';
  if (testId.includes('input') || testId.includes('compose') || testId.includes('count')) {
    return true;
  }
  return Boolean(node.closest('textarea, [contenteditable="true"], form, nav, header'));
}

function isLikelyMessageNode(node: HTMLElement): boolean {
  const text = messageTextFromNode(node);
  if (text.length < 4 || text.length > 4000) return false;
  if (isNoiseText(text)) return false;
  if (node.querySelector('textarea, [contenteditable="true"]')) return false;
  return true;
}

function messageTextFromNode(node: HTMLElement): string {
  const clone = node.cloneNode(true) as HTMLElement;
  for (const junk of Array.from(clone.querySelectorAll('time, [aria-hidden="true"], button, svg, img'))) {
    junk.remove();
  }
  return clone.innerText.replace(/\s+/g, ' ').trim();
}

function isNoiseText(text: string): boolean {
  const lower = text.toLowerCase();
  const noise = [
    'type a message',
    'delivered',
    'seen',
    'loading',
    'fiverr pro',
    'attach a file',
    'send message',
  ];
  return noise.some((phrase) => lower === phrase || lower.startsWith(`${phrase} `));
}

function extractSenderHints(root: HTMLElement, threadUsername: string | null): string[] {
  const hints = new Set<string>();
  if (threadUsername) hints.add(threadUsername);

  const headerSelectors = [
    '[data-testid*="username" i]',
    '[data-testid*="recipient" i]',
    '[data-testid*="conversation-header" i] h1',
    '[data-testid*="conversation-header" i] h2',
    '[class*="UserName" i]',
    '[class*="username" i]',
    '.recipient-name',
    'header h1',
    'header h2',
  ];

  for (const selector of headerSelectors) {
    for (const el of Array.from(root.querySelectorAll<HTMLElement>(selector))) {
      const text = el.textContent?.trim();
      if (text && text.length > 1 && text.length < 120) hints.add(text);
    }
  }

  for (const link of Array.from(
    root.querySelectorAll<HTMLAnchorElement>('a[href*="/users/"], a[href*="/inbox/"]'),
  )) {
    const match = link.pathname.match(/\/(?:users|inbox)\/([^/?#]+)/i);
    const username = match?.[1];
    if (username && !RESERVED_INBOX_SEGMENTS.has(username.toLowerCase())) {
      hints.add(username);
    }
  }

  return [...hints].slice(0, 8);
}

export function snapshotFromApiMessages(
  messages: Array<{ body?: string; sender?: string; recipient?: string }>,
  threadUsername: string | null,
): FiverrDomSnapshot {
  const chunks = messages
    .map((message, index) => ({
      text: message.body?.trim() ?? '',
      index,
    }))
    .filter((chunk) => chunk.text.length > 0);

  const senderHints = new Set<string>();
  if (threadUsername) senderHints.add(threadUsername);
  for (const message of messages) {
    if (message.sender?.trim()) senderHints.add(message.sender.trim());
    if (message.recipient?.trim()) senderHints.add(message.recipient.trim());
  }

  const text = chunks.map((chunk) => chunk.text).join('\n\n').slice(0, 12_000);
  return {
    text,
    chunks,
    senderHints: [...senderHints].slice(0, 8),
  };
}
