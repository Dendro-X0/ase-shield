import type { Platform } from '@ase/core';

import { fetchFiverrConversation } from './platforms/fiverr-api.js';
import { parseFiverrThreadUsername, snapshotFromApiMessages } from './platforms/fiverr-dom.js';

export type SiteEnrichment = {
  extraText?: string;
  extraChunks?: string[];
  senderHints?: string[];
};

export async function enrichSiteContent(
  platform: Platform,
  href: string,
): Promise<SiteEnrichment | null> {
  if (platform === 'fiverr') {
    const username = parseFiverrThreadUsername(href);
    if (!username) return null;
    try {
      const messages = await fetchFiverrConversation(username);
      if (messages.length === 0) return null;
      const snapshot = snapshotFromApiMessages(messages, username);
      return {
        extraText: snapshot.text,
        extraChunks: snapshot.chunks.map((chunk) => chunk.text),
        senderHints: snapshot.senderHints,
      };
    } catch {
      return null;
    }
  }
  return null;
}
