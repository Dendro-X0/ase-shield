# Microsoft Edge Add-ons listing — Anti-SE Shield

Edge Add-ons uses the same Chromium extension package as Chrome. Follow [CHROME_WEB_STORE.md](./CHROME_WEB_STORE.md) for copy, privacy answers, and screenshots.

## Edge-specific steps

1. Sign in to [Partner Center — Edge Add-ons](https://partner.microsoft.com/dashboard/microsoftedge/overview).
2. Submit the same release zip built at version `1.0.0-beta.2` (from [GitHub Releases](https://github.com/Dendro-X0/ase-shield/releases/latest)).
3. **Privacy policy URL:** https://dendro-x0.github.io/ase-shield/privacy.html (see [PRIVACY_HOSTING.md](./PRIVACY_HOSTING.md))
4. **Data collection:** select **No personal data collected** where applicable.
5. **Permissions justification:** paste the permissions table from [PRIVACY.md](../PRIVACY.md).

## Testing before submit

- Load unpacked in Edge: `edge://extensions` → Developer mode → Load unpacked → `apps/extension/dist`
- Verify companion connection on Windows (`127.0.0.1:47123`)
- Run onboarding + practice mode once

## Known Edge differences

None expected for MV3 content scripts on supported hosts. Document any Edge-specific DOM breakage in [KNOWN_ISSUES.md](../KNOWN_ISSUES.md).
