import type { ContentUnit, ScanRoot } from './content-unit.js';
import { collectBoostCandidates, isExcludedByHints } from './apply-site-hints.js';
import { fingerprintElement } from './fingerprints.js';
import { hasSubstantiveText, normalizeText, type ScanProfile } from './filters.js';
import type { SiteScanHints } from './site-hints.js';

const BLOCK_TAGS = new Set([
  'P',
  'BLOCKQUOTE',
  'LI',
  'H1',
  'H2',
  'H3',
  'H4',
  'H5',
  'H6',
]);

const CONTAINER_TAGS = new Set(['ARTICLE', 'SECTION']);

function isDocumentNode(node: ScanRoot | ParentNode): node is Document {
  return 'nodeType' in node && node.nodeType === Node.DOCUMENT_NODE;
}

function isShadowRootNode(node: Node): node is ShadowRoot {
  return node.nodeType === Node.DOCUMENT_FRAGMENT_NODE && 'host' in node;
}

function scanRootNode(root: ScanRoot): ParentNode {
  if (isDocumentNode(root)) {
    return root.body ?? root.documentElement;
  }
  return root;
}

function isBlockCandidate(element: HTMLElement): boolean {
  const tag = element.tagName.toUpperCase();
  if (BLOCK_TAGS.has(tag)) return true;
  if (element.getAttribute('role') === 'article') return true;
  if (tag !== 'DIV') return false;
  const hasNestedBlock = element.querySelector(
    'p, blockquote, li, h1, h2, h3, h4, h5, h6, article, section, [role="article"]',
  );
  return !hasNestedBlock;
}

function walkElements(root: ParentNode, visit: (element: HTMLElement) => void): void {
  const start = isDocumentNode(root) ? (root.body ?? root.documentElement) : root;
  if (!start) return;

  const queue: Node[] = [start];
  while (queue.length > 0) {
    const node = queue.shift()!;

    if (isShadowRootNode(node)) {
      for (const child of node.children) {
        queue.push(child);
      }
      continue;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) continue;

    const element = node as HTMLElement;
    visit(element);

    if (element.shadowRoot) {
      queue.push(element.shadowRoot);
    }

    for (const child of element.children) {
      queue.push(child);
    }
  }
}

function collectBlockCandidates(
  root: ParentNode,
  hints?: SiteScanHints | null,
  profile: ScanProfile = 'messaging',
): HTMLElement[] {
  const candidates: HTMLElement[] = [];

  walkElements(root, (element) => {
    if (!isBlockCandidate(element)) return;
    if (isExcludedByHints(element, hints)) return;
    const text = normalizeText(element.textContent ?? '');
    if (!hasSubstantiveText(text, profile)) return;
    candidates.push(element);
  });

  return candidates;
}

function collectContainerCandidates(
  root: ParentNode,
  hints?: SiteScanHints | null,
  profile: ScanProfile = 'messaging',
): HTMLElement[] {
  const containers: HTMLElement[] = [];

  walkElements(root, (element) => {
    if (!CONTAINER_TAGS.has(element.tagName.toUpperCase())) return;
    if (isExcludedByHints(element, hints)) return;
    if (!hasSubstantiveText(element.textContent ?? '', profile)) return;
    containers.push(element);
  });

  return containers;
}

function applyContainerMerge(
  root: ParentNode,
  blocks: HTMLElement[],
  hints?: SiteScanHints | null,
  profile: ScanProfile = 'messaging',
): HTMLElement[] {
  const drop = new Set<HTMLElement>();
  const merged: HTMLElement[] = [...blocks];

  for (const container of collectContainerCandidates(root, hints, profile)) {
    const paragraphs = Array.from(container.querySelectorAll<HTMLElement>('p')).filter((paragraph) => {
      if (isExcludedByHints(paragraph, hints)) return false;
      return hasSubstantiveText(paragraph.textContent ?? '', profile);
    });
    const headings = Array.from(container.querySelectorAll<HTMLElement>('h1,h2,h3,h4,h5,h6'));

    if (headings.length === 0 || paragraphs.length !== 1) continue;

    merged.push(container);
    drop.add(paragraphs[0]!);
    for (const heading of headings) {
      if (container.contains(heading)) drop.add(heading);
    }
  }

  const kept = merged.filter((element) => !drop.has(element));
  return dedupeToInnermost(kept);
}

function dedupeToInnermost(elements: HTMLElement[]): HTMLElement[] {
  return elements.filter((element) => {
    return !elements.some((other) => other !== element && element.contains(other));
  });
}

function dedupeByText(units: ContentUnit[]): ContentUnit[] {
  const seen = new Map<string, ContentUnit>();
  for (const unit of units) {
    if (!seen.has(unit.text)) {
      seen.set(unit.text, unit);
    }
  }
  return [...seen.values()];
}

/**
 * Universal DOM scanner — discovers deduplicated content units on any page.
 * Adapted from the SignalLens / detox-extension universal scanner pattern.
 */
export function scanUniversal(
  root: ScanRoot,
  hints?: SiteScanHints | null,
  profile: ScanProfile = 'messaging',
): readonly ContentUnit[] {
  const scanRoot = scanRootNode(root);
  if (!scanRoot) return [];

  const mergedBlocks = dedupeToInnermost([
    ...applyContainerMerge(scanRoot, collectBlockCandidates(scanRoot, hints, profile), hints, profile),
    ...collectBoostCandidates(scanRoot, hints),
  ]);
  const units: ContentUnit[] = [];

  for (const element of mergedBlocks) {
    const text = normalizeText(element.textContent ?? '');
    if (!hasSubstantiveText(text, profile)) continue;

    const id = fingerprintElement(element, scanRoot, text);
    units.push({ id, text, element });
  }

  return dedupeByText(units);
}
