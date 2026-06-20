import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { scanDiff } from './scan-diff.js';
import { scanUniversal } from './universal-scanner.js';

const fixtureDir = path.dirname(fileURLToPath(import.meta.url));

function loadFixture(name: string): Document {
  const html = readFileSync(path.join(fixtureDir, '__fixtures__', name), 'utf8');
  return new DOMParser().parseFromString(html, 'text/html');
}

function fixtureUnits(doc: Document): HTMLElement[] {
  return Array.from(doc.querySelectorAll<HTMLElement>('[data-fixture-unit]'));
}

describe('scanUniversal', () => {
  it('discovers messaging units on a thread fixture', () => {
    const doc = loadFixture('messaging-thread.html');
    const units = scanUniversal(doc);
    const expected = fixtureUnits(doc);

    expect(units.length).toBeGreaterThanOrEqual(expected.length);
    for (const element of expected) {
      const text = element.textContent?.trim() ?? '';
      expect(units.some((unit) => unit.text.includes(text.slice(0, 24)))).toBe(true);
    }
  });

  it('excludes navigation chrome', () => {
    const doc = loadFixture('messaging-thread.html');
    const units = scanUniversal(doc);
    expect(units.every((unit) => !unit.text.includes('Home · Inbox'))).toBe(true);
  });

  it('scanDiff treats virtualized re-add as updated, not duplicate session ids', () => {
    const doc = loadFixture('messaging-thread.html');
    const first = scanUniversal(doc);
    const second = scanUniversal(doc);
    const diff = scanDiff(first, second);
    expect(diff.added).toHaveLength(0);
    expect(diff.updated).toHaveLength(0);
  });
});
