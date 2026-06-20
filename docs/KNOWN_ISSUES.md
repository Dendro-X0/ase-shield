# Known issues — public beta (1.0.0-beta.3)

Last updated: 2026-06-19

## Extension

| Issue | Impact | Workaround |
|-------|--------|------------|
| Universal scanner completeness | Some sites may miss message blocks until site hints are tuned | Right-click → Analyze selection; report site via Settings → Beta feedback |
| Marketplace-only default | Forums, Discord web, etc. do not auto-scan until setting is changed | Options → disable “Freelance & B2B sites only” |
| Broad host permission review | Chrome Web Store may delay approval for `https://*/*` | Sideload from GitHub Release zip for beta |
| Firefox build | Experimental (`dist-firefox`); not store-listed in beta | Use Chrome or Edge for beta |
| Practice mode | Does not appear on real LinkedIn; separate page only | Use popup → Practice |

## Companion (Windows)

| Issue | Impact | Workaround |
|-------|--------|------------|
| Windows Sandbox unavailable | Some SKUs lack Sandbox; executables fall back to preview/listing tier | See [WINDOWS_SANDBOX.md](./WINDOWS_SANDBOX.md) |
| SmartScreen on unsigned installer | Warning on first install until code-sign cert is applied | Click “More info” → Run anyway for beta; see [BETA.md](./BETA.md) |
| Remote guard false positives | Legitimate remote tools may trigger consent overlay | Choose “I started this” or end session |
| Recovery undo | Requires admin for some startup/task changes | Run companion as administrator if undo fails |

## Store / install

| Issue | Impact | Workaround |
|-------|--------|------------|
| Store review pending | Extension not yet live on CWS/Edge | Install from GitHub Release |
| Code signing | Release builds unsigned until cert secrets configured | Run `scripts/sign-installer.ps1` after `tauri:build` when cert available |
| First-run dashboard | Companion opens `/?welcome=1` once | Normal — follow setup checklist on Overview |

## Reporting

Use **Settings → Beta feedback** in the extension to download a local markdown report. Attach it to a GitHub issue or email if you want maintainer follow-up.
