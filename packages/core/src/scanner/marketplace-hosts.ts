/** Hostnames where automatic universal scan is allowed when `marketplaceOnlyScan` is on. */
export const MARKETPLACE_HOST_PATTERNS: readonly RegExp[] = [
  /mail\.google\.com$/i,
  /linkedin\.com$/i,
  /upwork\.com$/i,
  /fiverr\.com$/i,
  /freelancer\.com$/i,
  /web\.whatsapp\.com$/i,
  /web\.telegram\.org$/i,
];

export function isMarketplaceHost(hostname: string): boolean {
  return MARKETPLACE_HOST_PATTERNS.some((pattern) => pattern.test(hostname));
}

export function shouldRunUniversalScan(
  marketplaceOnlyScan: boolean,
  hostname: string,
): boolean {
  if (!marketplaceOnlyScan) return true;
  return isMarketplaceHost(hostname);
}
