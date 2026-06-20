# Public beta — Anti-SE Shield 1.0.0-beta.2

Welcome to the public beta. See [releases/v1.0.0-beta.2.md](releases/v1.0.0-beta.2.md) for GitHub Release notes.

## What’s included

- **Extension** `1.0.0-beta.2` — scam pattern analysis, link guard, incident export, onboarding, practice mode, Dev Lab, feedback export
- **Companion** `1.0.0-beta.2` — quarantine, safe open, remote session guard, recovery wizard, web dashboard (Windows 10/11)

## Install (early testers)

### Recommended — GitHub Release

1. Open **[Latest release](https://github.com/Dendro-X0/ase-shield/releases/latest)**
2. Download **Anti-SE Companion** `.exe` → install → confirm tray icon (dashboard opens on first launch)
3. Download **extension zip** → unzip → Chrome/Edge → Developer mode → **Load unpacked**
4. Complete onboarding → **Practice** → confirm a row on http://127.0.0.1:47123/

Privacy policy: https://dendro-x0.github.io/ase-shield/privacy.html

**Note:** Installer is unsigned in this beta (SmartScreen warning expected). Browser store listing deferred until dashboard UX pass.

### CI artifacts (alternative)

Latest green build on [`main`](https://github.com/Dendro-X0/ase-shield/actions/workflows/ci.yml): download **extension-zip** and **companion-installer** artifacts.

### Sideload (developers)

### Extension (Chrome or Edge)

```bash
pnpm install
pnpm --filter @ase/extension build
```

1. Open `chrome://extensions` or `edge://extensions`
2. Enable **Developer mode**
3. **Load unpacked** → select `apps/extension/dist`
4. Complete the onboarding tab on first install

### Companion (Windows)

```bash
pnpm install
pnpm --filter @ase/companion tauri:build
```

Installer output: `apps/companion/src-tauri/target/release/bundle/nsis/`

**Note:** Beta builds may be **unsigned**. Windows SmartScreen may warn until an Authenticode certificate is configured for release builds.

## Verify clean install (acceptance)

On a fresh Windows 11 VM:

1. Install companion from NSIS bundle
2. Load unpacked extension
3. Confirm popup shows **Connected** after companion starts
4. Open **http://127.0.0.1:47123/** — web dashboard loads with extension status
5. Open **Practice mode** from popup; run analysis → expect **high-risk**
5. Download a test file on a flagged thread → quarantine inbox appears in companion

## Code signing (maintainers)

Configure for release pipelines:

- `TAURI_SIGNING_PRIVATE_KEY` / `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` for Tauri updater (optional)
- Windows Authenticode cert for NSIS (`.pfx` + `signCommand` in `tauri.conf.json` when available)

Unsigned artifacts are acceptable for closed beta; document SmartScreen bypass for testers.

## Store submission

See:

- [store/CHROME_WEB_STORE.md](./store/CHROME_WEB_STORE.md)
- [store/EDGE_ADDONS.md](./store/EDGE_ADDONS.md)
- [store/PRIVACY_HOSTING.md](./store/PRIVACY_HOSTING.md)
- [PRIVACY.md](./PRIVACY.md)
- [phases/PHASE_1_SHIP.md](./phases/PHASE_1_SHIP.md) — full Phase 1 checklist

## Feedback

Settings → **Beta feedback** → download markdown report. Template: [feedback/false-positive-negative-report.md](./feedback/false-positive-negative-report.md).

## Known issues

[KNOWN_ISSUES.md](./KNOWN_ISSUES.md)
