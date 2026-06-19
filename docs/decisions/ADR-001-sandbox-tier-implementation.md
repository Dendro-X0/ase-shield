# ADR-001: Sandbox tier implementation (M5)

**Status:** Accepted  
**Date:** 2026-06-18  
**Context:** Milestone 5 — Windows sandbox for “Open safely”

---

## Decision

Implement three automatic sandbox tiers in the companion Rust backend, routed by file extension and static-analysis risk level. The user never picks a tier manually.

| Tier | Name | Mechanism (v1) |
|------|------|----------------|
| **Tier 2** | Windows Sandbox | `.wsb` config with networking/clipboard/printer disabled; read-only mapped quarantine folder; launch via `WindowsSandbox.exe` |
| **Tier 3** | Document lane | In-app Safe Workspace preview (PDF/text/image). Macro Office types blocked on host. |
| **Tier 1** | Restricted viewer | In-app listing/preview for archives, text, and images. No host execution. |

When Tier 2 is required but Windows Sandbox is unavailable (Home SKU, feature disabled, or detection failure), **fall back to Tier 1** with explicit user messaging.

---

## Routing rules

1. Executables (`.exe`, `.msi`, `.bat`, …) → Tier 2  
2. Documents (`.pdf`, `.docx`, …) and macro types → Tier 3  
3. Archives, text, images → Tier 1  
4. Static analysis **high-risk** → bump one tier (Tier 1→3, Tier 3→2)

Implementation: `apps/companion/src-tauri/src/sandbox/router.rs`

---

## Windows Sandbox detection

PowerShell (no window):

```powershell
(Get-WindowsOptionalFeature -Online -FeatureName Containers-DisposableClientVM).State
```

Treat `Enabled` as available. Any other value triggers Tier 2 fallback.

---

## Network policy (v1)

| Tier | Policy |
|------|--------|
| Tier 2 | Disabled in `.wsb` (`<Networking>Disable</Networking>`) |
| Tier 1 / Tier 3 | Host preview only — outbound **not** blocked; surfaced in UI |

Firewall PID-scoped blocking for Tier 1 is deferred to a later milestone.

---

## Session UX

- **Safe Workspace** full-screen overlay in companion UI (green border, watermark badge)
- **End session** shows post-session summary (“No files were saved to your PC” / VM destroyed)
- **Open normally anyway** for high-risk items requires typing `OPEN ANYWAY`

---

## Alternatives considered

1. **AppContainer for all Tier 1** — rejected for v1 due to app compatibility and implementation cost  
2. **Bundled PDFium** — rejected; use base64 PDF embed in webview for v1  
3. **User-selected tier** — rejected; conflicts with “one button” UX goal  

---

## Consequences

- Executable safety on Windows Home depends on fallback messaging + user discipline  
- Large PDFs (>4 MB) cannot be previewed in-app  
- Extension receives optional `SESSION_EVENT` IPC in a later polish pass; companion emits Tauri events today  

---

## Test harness

See [DEVELOPMENT.md](../DEVELOPMENT.md#test-m5-open-safely) for manual verification steps including EICAR-in-zip listing (never executed on host).
