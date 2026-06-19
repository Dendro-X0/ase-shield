# Public beta — Anti-SE Shield 1.0.0-beta.1

Welcome to the first public beta. This release completes roadmap milestones M0–M8: extension MVP through recovery kit, plus beta packaging and onboarding.

## What’s included

- **Extension** `1.0.0-beta.1` — scam pattern analysis, link guard, incident export, onboarding tutorial, practice mode, feedback export
- **Companion** `1.0.0-beta.1` — quarantine, safe open, remote session guard, recovery wizard (Windows 10/11)

## Install (developers / early testers)

### Consumer path (Phase 1 target)

1. Download **Anti-SE Companion** installer from [GitHub Releases](https://github.com/anti-se/anti-social-engineering-workspace/releases) (signed when certificate is configured).
2. Install and confirm the system tray icon appears — the **web dashboard** opens on first launch.
3. Install **Anti-SE Shield** from Chrome Web Store or Microsoft Edge Add-ons (when live).
4. Complete onboarding → **Practice** → confirm a row on `http://127.0.0.1:47123/`.

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
