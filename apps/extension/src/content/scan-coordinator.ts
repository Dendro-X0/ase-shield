import {
  scanDiff,
  scanUniversal,
  type ContentUnit,
  type ScanRoot,
  type SiteScanHints,
} from '@ase/core';

const DEFAULT_DEBOUNCE_MS = 120;
const IDLE_TIMEOUT_MS = 120;
const FALLBACK_IDLE_MS = 16;
const NEARBY_MARGIN_PX = 200;

export type ScanCoordinatorCallbacks = {
  readonly onSnapshot: (units: readonly ContentUnit[]) => void;
};

export type ScanCoordinatorOptions = {
  readonly debounceMs?: number;
  readonly observeMutations?: boolean;
  readonly getHints?: () => SiteScanHints | null;
};

export type ScanCoordinator = {
  readonly start: () => void;
  readonly stop: () => void;
  readonly rescan: () => void;
  readonly flush: () => void;
  readonly getSnapshot: () => readonly ContentUnit[];
  readonly getSessionSeenIds: () => ReadonlySet<string>;
};

function scheduleIdle(work: () => void): void {
  if (typeof requestIdleCallback === 'function') {
    requestIdleCallback(work, { timeout: IDLE_TIMEOUT_MS });
    return;
  }
  globalThis.setTimeout(work, FALLBACK_IDLE_MS);
}

function observeRootNode(root: ScanRoot): Node {
  if ('nodeType' in root && root.nodeType === Node.DOCUMENT_NODE) {
    const document = root as Document;
    return document.body ?? document.documentElement;
  }
  return root;
}

export function createScanCoordinator(
  root: ScanRoot,
  callbacks: ScanCoordinatorCallbacks,
  options: ScanCoordinatorOptions = {},
): ScanCoordinator {
  const debounceMs = options.debounceMs ?? DEFAULT_DEBOUNCE_MS;
  const observeMutations = options.observeMutations ?? true;
  const observeTarget = observeRootNode(root);

  let snapshot: ContentUnit[] = [];
  const sessionSeen = new Set<string>();

  let mutationObserver: MutationObserver | null = null;
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let idleScheduled = false;
  let started = false;

  function runScanCycle(): void {
    idleScheduled = false;
    const hints = options.getHints?.() ?? null;
    const next = [...scanUniversal(root, hints)];
    const diff = scanDiff(snapshot, next);

    for (const unit of [...diff.added, ...diff.updated]) {
      sessionSeen.add(unit.id);
    }

    snapshot = next;
    callbacks.onSnapshot(snapshot);
  }

  function scheduleScan(): void {
    if (!started) return;
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      debounceTimer = null;
      if (idleScheduled) return;
      idleScheduled = true;
      scheduleIdle(runScanCycle);
    }, debounceMs);
  }

  function rescan(): void {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
    idleScheduled = false;
    runScanCycle();
  }

  function flush(): void {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
    if (idleScheduled) {
      runScanCycle();
      return;
    }
    rescan();
  }

  function start(): void {
    if (started) return;
    started = true;

    if (observeMutations) {
      mutationObserver = new MutationObserver(() => {
        scheduleScan();
      });
      mutationObserver.observe(observeTarget, {
        childList: true,
        subtree: true,
        characterData: true,
        attributes: true,
        attributeFilter: ['aria-expanded', 'hidden', 'class', 'open'],
      });
    }

    rescan();
  }

  function stop(): void {
    started = false;
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
    idleScheduled = false;
    mutationObserver?.disconnect();
    mutationObserver = null;
    snapshot = [];
    sessionSeen.clear();
  }

  return {
    start,
    stop,
    rescan,
    flush,
    getSnapshot: () => snapshot,
    getSessionSeenIds: () => sessionSeen,
  };
}

export function findUniversalMountTarget(): HTMLElement {
  return (
    document.querySelector<HTMLElement>('[role="main"]') ??
    document.querySelector<HTMLElement>('main') ??
    document.body
  );
}

export function isLikelyVisible(element: HTMLElement): boolean {
  const view = element.ownerDocument.defaultView;
  if (!view) return true;

  const rect = element.getBoundingClientRect();
  const viewportHeight = view.innerHeight || view.document.documentElement.clientHeight;
  return rect.bottom > -NEARBY_MARGIN_PX && rect.top < viewportHeight + NEARBY_MARGIN_PX;
}
