import {
  ASE_SITE_HINT_PACKS,
  platformFromHostname,
  resolveSiteHints,
  senderHintsFromUnits,
  shouldRunUniversalScan,
  threadIdFromLocation,
  type ContentUnit,
} from '@ase/core';

import { loadSettings } from '../shared/settings.js';
import { SETTINGS_STORAGE_KEY } from '../shared/types.js';
import { attachLinkInspector } from './link-inspector.js';
import { ThreadOverlay, type OverlayInsights } from './overlay.js';
import { createScanCoordinator, findUniversalMountTarget } from './scan-coordinator.js';
import { enrichSiteContent } from './site-enrichers.js';

type ProtectionSession = {
  overlay: ThreadOverlay;
  coordinator: ReturnType<typeof createScanCoordinator>;
  detachLinks: (() => void) | null;
  analyzeTimer: ReturnType<typeof setTimeout> | null;
};

let activeSession: ProtectionSession | null = null;

export function bootstrapUniversal(): void {
  void applyProtectionFromSettings();
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local' || !changes[SETTINGS_STORAGE_KEY]) return;
    void applyProtectionFromSettings();
  });
}

async function applyProtectionFromSettings(): Promise<void> {
  const settings = await loadSettings();
  const allowed = shouldRunUniversalScan(settings.marketplaceOnlyScan, location.hostname);

  if (!allowed) {
    stopProtectionSession();
    return;
  }

  if (activeSession) return;
  activeSession = startProtectionSession();
}

function startProtectionSession(): ProtectionSession {
  const overlay = new ThreadOverlay();
  let detachLinks: (() => void) | null = null;
  let analyzeTimer: ReturnType<typeof setTimeout> | null = null;

  const platform = platformFromHostname(location.hostname);
  const threadId = threadIdFromLocation(location);

  const mount = () => {
    overlay.mount(findUniversalMountTarget());
    if (!detachLinks) detachLinks = attachLinkInspector(document.body);
  };

  const analyzeUnits = async (units: readonly ContentUnit[]) => {
    const enrichment = await enrichSiteContent(platform, location.href);
    const unitTexts = units.map((unit) => unit.text);
    const chunks = enrichment?.extraChunks ? [...enrichment.extraChunks, ...unitTexts] : unitTexts;
    const parts = [enrichment?.extraText, ...unitTexts].filter(Boolean);
    const text = parts.join('\n\n').slice(0, 12_000);

    if (!text || text.length < 12) {
      overlay.render(
        { level: 'safe', hits: [], analyzedAt: new Date().toISOString() },
        {},
        () => {},
      );
      return;
    }

    const senderHints = new Set<string>([
      ...senderHintsFromUnits(threadId),
      ...(enrichment?.senderHints ?? []),
    ]);

    void chrome.runtime.sendMessage({
      type: 'REGISTER_THREAD_CONTEXT',
      payload: {
        platform,
        threadId,
        senderHints: [...senderHints].slice(0, 8),
      },
    });

    const response = await chrome.runtime.sendMessage({
      type: 'ANALYZE_THREAD',
      payload: {
        platform,
        threadId,
        text,
        senderHints: [...senderHints].slice(0, 8),
        messageChunks: chunks,
        url: location.href,
      },
    });

    const payload = response?.payload as
      | {
          result: import('@ase/core').AnalysisResult;
          dismissed: boolean;
          timeline?: OverlayInsights['timeline'];
          contactWarnings?: string[];
        }
      | undefined;

    if (!payload) return;

    overlay.render(
      payload.result,
      {
        timeline: payload.timeline,
        contactWarnings: payload.contactWarnings,
      },
      async () => {
        await chrome.runtime.sendMessage({
          type: 'DISMISS_THREAD',
          payload: { platform, threadId },
        });
      },
    );
  };

  const scheduleAnalyze = (units: readonly ContentUnit[]) => {
    if (analyzeTimer) clearTimeout(analyzeTimer);
    analyzeTimer = setTimeout(() => {
      analyzeTimer = null;
      void analyzeUnits(units);
    }, 200);
  };

  mount();

  const coordinator = createScanCoordinator(
    document,
    {
      onSnapshot: (units) => {
        mount();
        scheduleAnalyze(units);
      },
    },
    {
      getHints: () => resolveSiteHints(location.hostname, ASE_SITE_HINT_PACKS),
    },
  );

  coordinator.start();

  window.addEventListener('beforeunload', () => {
    stopProtectionSession();
  });

  return { overlay, coordinator, detachLinks, analyzeTimer };
}

function stopProtectionSession(): void {
  if (!activeSession) return;

  if (activeSession.analyzeTimer) clearTimeout(activeSession.analyzeTimer);
  activeSession.coordinator.stop();
  activeSession.detachLinks?.();
  activeSession.overlay.destroy();
  activeSession = null;
}
