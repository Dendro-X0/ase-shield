import type { Platform } from '../analysis.js';

const HOST_PLATFORM: Array<{ pattern: RegExp; platform: Platform }> = [
  { pattern: /mail\.google\.com$/i, platform: 'gmail' },
  { pattern: /linkedin\.com$/i, platform: 'linkedin' },
  { pattern: /upwork\.com$/i, platform: 'upwork' },
  { pattern: /fiverr\.com$/i, platform: 'fiverr' },
  { pattern: /freelancer\.com$/i, platform: 'unknown' },
  { pattern: /web\.whatsapp\.com$/i, platform: 'whatsapp' },
  { pattern: /web\.telegram\.org$/i, platform: 'telegram' },
  { pattern: /discord\.com$/i, platform: 'unknown' },
  { pattern: /reddit\.com$/i, platform: 'unknown' },
];

export function platformFromHostname(hostname: string): Platform {
  for (const entry of HOST_PLATFORM) {
    if (entry.pattern.test(hostname)) return entry.platform;
  }
  return 'unknown';
}

/** Stable thread key from URL path (SPA hash included). */
export function threadIdFromLocation(locationLike: Pick<Location, 'href' | 'hostname' | 'pathname' | 'hash'>): string {
  const path = `${locationLike.pathname}${locationLike.hash}`.replace(/\/$/, '') || '/';
  return `${locationLike.hostname}:${path}`;
}

export function senderHintsFromUnits(threadId: string): string[] {
  const hints = new Set<string>();
  const usernameSegment = threadId.split(':').pop()?.split('/').filter(Boolean).pop();
  if (usernameSegment && usernameSegment.length < 80) hints.add(usernameSegment);
  return [...hints].slice(0, 8);
}
