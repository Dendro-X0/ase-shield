# Chrome Web Store listing — Anti-SE Shield

Use this checklist when submitting **Anti-SE Shield** extension v`1.0.0-beta.1`.

## Listing copy

**Name:** Anti-SE Shield  
**Short description:** Local-first warnings for freelance and B2B scam patterns. No cloud uploads.  
**Detailed description:**

> Anti-SE Shield helps freelancers and B2B professionals spot common scam patterns before they trust a client or open a risky file.
>
> **Phase 1 (extension):** Plain-language risk badges on Gmail, LinkedIn, Upwork, WhatsApp Web, and Telegram Web. Local link inspection. No telemetry.
>
> **Phase 2 (optional Windows companion):** Download quarantine, safe file opening, remote-session guard, and recovery tools. Talks to the extension over localhost only (`127.0.0.1`).
>
> Everything runs on your device. You control exports.

**Category:** Productivity or Privacy & Security  
**Language:** English  

## Privacy practices (Chrome Web Store questionnaire)

| Question | Answer |
|----------|--------|
| Does your product collect user data? | **No** — no collection, use, or transfer of user data to the developer |
| Is data sold? | No |
| Is data used for unrelated purposes? | No |
| Certify limited use | Yes — local analysis only; no remote logging |
| Privacy policy URL | Link to `docs/PRIVACY.md` on GitHub (or hosted copy) |

Attach [PRIVACY.md](../PRIVACY.md) or use the hosted URL: **https://dendro-x0.github.io/ase-shield/privacy.html**

## Permissions notes for reviewers

- **Host permissions:** Limited to listed job/message sites plus localhost for optional desktop companion.
- **`downloads`:** Queues suspicious downloads for local quarantine when companion is installed.
- **`management`:** One-time extension inventory for recovery wizard (user-initiated).

## Assets

- Icon: 128×128 from extension build
- Screenshots: onboarding tutorial, LinkedIn overlay, practice mode, settings (no real PII)
- Optional promo tile: 440×280

## Build artifact

```bash
pnpm install
pnpm build
pnpm package:extension
# Output: dist/release/anti-se-shield-extension-*.zip
# Or load unpacked: apps/extension/dist
```

## Post-submission

- Monitor rejection reasons (broad permissions, misleading claims)
- Update [KNOWN_ISSUES.md](../KNOWN_ISSUES.md) if review surfaces platform-specific gaps
