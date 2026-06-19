# Microsoft Edge Add-ons listing — Anti-SE Shield

Edge Add-ons uses the same Chromium extension package as Chrome. Follow [CHROME_WEB_STORE.md](./CHROME_WEB_STORE.md) for copy, privacy answers, and screenshots.

## Edge-specific steps

1. Sign in to [Partner Center — Edge Add-ons](https://partner.microsoft.com/dashboard/microsoftedge/overview).
2. Submit the same `apps/extension/dist` folder (zip) built at version `1.0.0-beta.1`.
3. **Privacy policy URL:** same as Chrome — [PRIVACY.md](../PRIVACY.md) hosted or GitHub raw link.
4. **Data collection:** select **No personal data collected** where applicable.
5. **Permissions justification:** paste the permissions table from [PRIVACY.md](../PRIVACY.md).

## Testing before submit

- Load unpacked in Edge: `edge://extensions` → Developer mode → Load unpacked → `apps/extension/dist`
- Verify companion connection on Windows (`127.0.0.1:47123`)
- Run onboarding + practice mode once

## Known Edge differences

None expected for MV3 content scripts on supported hosts. Document any Edge-specific DOM breakage in [KNOWN_ISSUES.md](../KNOWN_ISSUES.md).
