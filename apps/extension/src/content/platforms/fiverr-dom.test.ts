import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeEach, describe, expect, it } from 'vitest';

import {
  extractFiverrMessagesFromDom,
  findFiverrComposer,
  findFiverrConversationRoot,
  findFiverrMountTarget,
  parseFiverrThreadUsername,
  snapshotFromApiMessages,
} from './fiverr-dom.js';

const fixtureDir = path.dirname(fileURLToPath(import.meta.url));

function loadFixture(name: string): Document {
  const html = readFileSync(path.join(fixtureDir, '__fixtures__', name), 'utf8');
  return new DOMParser().parseFromString(html, 'text/html');
}

describe('parseFiverrThreadUsername', () => {
  it('extracts username from inbox thread URLs', () => {
    expect(parseFiverrThreadUsername('https://www.fiverr.com/inbox/buyer_alpha')).toBe('buyer_alpha');
    expect(parseFiverrThreadUsername('https://www.fiverr.com/inbox/seller_beta?source=header')).toBe(
      'seller_beta',
    );
  });

  it('ignores reserved inbox segments', () => {
    expect(parseFiverrThreadUsername('https://www.fiverr.com/inbox/contacts')).toBeNull();
    expect(parseFiverrThreadUsername('https://www.fiverr.com/inbox/search')).toBeNull();
    expect(parseFiverrThreadUsername('https://www.fiverr.com/inbox')).toBeNull();
  });
});

describe('extractFiverrMessagesFromDom', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('reads messages from data-testid inbox layout', () => {
    const doc = loadFixture('fiverr-inbox-testids.html');
    const snapshot = extractFiverrMessagesFromDom(doc);

    expect(snapshot.chunks).toHaveLength(2);
    expect(snapshot.text).toContain('WhatsApp');
    expect(snapshot.text).toContain('Fiverr fees');
    expect(snapshot.senderHints).toContain('buyer_alpha');
  });

  it('reads messages from obfuscated class inbox layout', () => {
    const doc = loadFixture('fiverr-inbox-obfuscated.html');
    const snapshot = extractFiverrMessagesFromDom(doc);

    expect(snapshot.chunks.length).toBeGreaterThanOrEqual(2);
    expect(snapshot.text).toContain('PayPal');
    expect(snapshot.senderHints).toContain('seller_beta');
  });

  it('finds composer and conversation root from live-like structure', () => {
    const doc = loadFixture('fiverr-inbox-testids.html');
    expect(findFiverrComposer(doc)).not.toBeNull();
    expect(findFiverrConversationRoot(doc)).not.toBeNull();
    expect(findFiverrMountTarget(doc)).not.toBeNull();
  });
});

describe('snapshotFromApiMessages', () => {
  it('maps API payloads into analysis chunks', () => {
    const snapshot = snapshotFromApiMessages(
      [
        { body: 'First message', sender: 'buyer' },
        { body: 'Second message', sender: 'seller' },
      ],
      'buyer',
    );

    expect(snapshot.chunks).toHaveLength(2);
    expect(snapshot.text).toContain('First message');
    expect(snapshot.senderHints).toEqual(expect.arrayContaining(['buyer', 'seller']));
  });
});
