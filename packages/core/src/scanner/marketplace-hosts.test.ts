import { describe, expect, it } from 'vitest';

import { isMarketplaceHost, shouldRunUniversalScan } from './marketplace-hosts.js';

describe('marketplace hosts', () => {
  it('recognizes freelance and B2B marketplaces', () => {
    expect(isMarketplaceHost('mail.google.com')).toBe(true);
    expect(isMarketplaceHost('www.linkedin.com')).toBe(true);
    expect(isMarketplaceHost('www.fiverr.com')).toBe(true);
  });

  it('excludes general web surfaces', () => {
    expect(isMarketplaceHost('discord.com')).toBe(false);
    expect(isMarketplaceHost('www.reddit.com')).toBe(false);
  });

  it('gates universal scan when marketplace-only mode is on', () => {
    expect(shouldRunUniversalScan(true, 'www.reddit.com')).toBe(false);
    expect(shouldRunUniversalScan(true, 'www.upwork.com')).toBe(true);
    expect(shouldRunUniversalScan(false, 'www.reddit.com')).toBe(true);
  });
});
