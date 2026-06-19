# ADR-004: Recovery kit (M7)

**Status:** Accepted  
**Date:** 2026-06-18  
**Context:** Milestone 7 — post-incident recovery wizard

---

## Decision

Implement the recovery kit in the **companion app** with a five-step wizard UI. Windows-specific exposure data (startup registry, Startup folder, scheduled tasks) is captured via PowerShell. Browser extensions are snapshotted by the **extension** using `chrome.management` when the companion sets a flag on PONG.

---

## Wizard flow

1. **Welcome** — explain purpose; start captures baseline exposure snapshot  
2. **Secure accounts** — checklist (passwords, OAuth, payout) with optional links  
3. **Exposure scan** — diff baseline vs current + suspicious extension heuristics  
4. **Undo changes** — user selects new startup/tasks items; companion removes with approval  
5. **Export report** — HTML + PDF to `Documents/Anti-SE Reports/`, PDF opened in default viewer  

State persists in `%LOCALAPPDATA%/Anti-SE Companion/recovery/wizard-state.json`.

---

## Undo safety

Only items present in the **post-baseline diff** may be undone. Supported ids:

| Prefix | Action |
|--------|--------|
| `run-hkcu:` / `run-hklm:` | Remove registry Run value |
| `startup-file:` | Delete file from Startup folder |
| `task:` | `Unregister-ScheduledTask` |

---

## Report formats

- **HTML** — printable in browser  
- **PDF** — generated with `printpdf` for default PDF viewer opening (acceptance criteria)  

---

## Limitations

- Startup/task capture is Windows-only  
- Extension snapshot requires connected browser extension  
- Undo cannot restore mistyped user approvals  
- PDF layout is plain text (no embedded screenshots)  
