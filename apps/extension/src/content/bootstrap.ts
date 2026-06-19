import { attachLinkInspector } from './link-inspector.js';
import { ThreadOverlay, type OverlayInsights } from './overlay.js';
import type { PlatformAdapter } from './platform-types.js';
import { splitTextIntoChunks } from './platform-types.js';

export function bootstrapPlatform(adapter: PlatformAdapter): void {
  const overlay = new ThreadOverlay();
  let detachLinks: (() => void) | null = null;

  const scan = async () => {
    const text = adapter.extractVisibleText();
    if (!text || text.length < 20) {
      overlay.render(
        { level: 'safe', hits: [], analyzedAt: new Date().toISOString() },
        {},
        () => {},
      );
      return;
    }

    const chunks = adapter.extractMessageChunks?.() ?? splitTextIntoChunks(text);

    const response = await chrome.runtime.sendMessage({
      type: 'ANALYZE_THREAD',
      payload: {
        platform: adapter.platform,
        threadId: adapter.getThreadId() ?? undefined,
        text,
        senderHints: adapter.getSenderHints(),
        messageChunks: chunks.map((c) => c.text),
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

    const insights: OverlayInsights = {
      timeline: payload.timeline,
      contactWarnings: payload.contactWarnings,
    };

    overlay.render(payload.result, insights, async () => {
      const threadId = adapter.getThreadId();
      if (!threadId) return;
      await chrome.runtime.sendMessage({
        type: 'DISMISS_THREAD',
        payload: { platform: adapter.platform, threadId },
      });
    });
  };

  const mount = () => {
    const target = adapter.getMountTarget();
    overlay.mount(target);
    if (!detachLinks) detachLinks = attachLinkInspector(target);
    void scan();
  };

  mount();
  const unobserve = adapter.observe(() => {
    mount();
    void scan();
  });

  window.addEventListener('beforeunload', () => {
    unobserve();
    detachLinks?.();
    overlay.destroy();
  });
}
