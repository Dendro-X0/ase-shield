# Privacy policy — Anti-SE Shield

**Effective:** 2026-06-18  
**Applies to:** Anti-SE Shield browser extension and Anti-SE Companion desktop app (public beta)

## Summary

Anti-SE Shield is **local-first**. We do **not** collect, transmit, or sell your personal data. Analysis, incident logs, quarantine files, and recovery reports stay on your device unless **you** choose to export or share them.

## What runs on your device

| Data | Where it stays | Shared by default? |
|------|----------------|-------------------|
| Message text analyzed for scams | In browser memory during analysis | No |
| Rule matches and risk levels | Extension UI + optional encrypted incident log (IndexedDB) | No |
| Extension settings | `chrome.storage.local` on your profile | No |
| Download quarantine files | `%LOCALAPPDATA%\Anti-SE Companion\quarantine\` | No |
| Recovery snapshots & reports | `Documents\Anti-SE Reports\` (when you run the wizard) | No |
| Companion ↔ extension IPC | `127.0.0.1:47123` on localhost only | No |

## What we do not do

- No analytics or telemetry SDKs
- No crash reporting to third parties
- No cloud sync of conversations, contacts, or files
- No advertising or profiling
- No sale of user data

## Network access

The extension requests host permissions only for supported platforms (Gmail, LinkedIn, Upwork, WhatsApp Web, Telegram Web) plus **localhost** for the companion app. Content scripts read page DOM locally to detect threads and links; that content is not uploaded to our servers because **we have no servers** for user content.

The companion app does not require internet access for core features.

## Optional user-initiated sharing

You may export incident logs, feedback reports, or recovery PDFs and send them to platform support, your IT team, or us via email. That is entirely your choice. Exported files are generated locally.

## Permissions justification (store review)

| Permission | Why |
|------------|-----|
| `storage` | Save settings and dismissals locally |
| `downloads` | Intercept risky downloads for companion quarantine |
| `management` | Read installed extension list for recovery snapshot (companion M7) |
| Host permissions | Run content scripts on supported job/message platforms only |

## Data retention

All data remains on your device until you uninstall the extension, clear browser storage, delete quarantine files, or remove reports. Uninstalling removes extension storage; companion data may remain until you delete its folders.

## Children

The product is not directed at children under 13. We do not knowingly collect data from anyone.

## Changes

Material privacy changes will be noted in release notes and this file in the repository. Beta users should review updates before upgrading.

## Contact

For privacy questions during beta, open a GitHub issue in the project repository or include contact details in a feedback report you choose to send.
