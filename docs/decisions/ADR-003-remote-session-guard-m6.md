# ADR-003: Remote session guard (M6)

**Status:** Accepted  
**Date:** 2026-06-18  
**Context:** Milestone 6 — detect remote access tools during flagged job threads

---

## Decision

Run a **2-second process poll** in the companion (Rust + `sysinfo`) for known remote-access tools. Correlate detections with **active flagged thread context** received from the extension over localhost IPC.

When correlated:

1. Show a **full-screen consent dialog** in the companion main window (auto-focused)
2. Queue a **SESSION_EVENT** for the extension incident log on the next PONG
3. Offer **End session** (kill matching processes), **Continue with shield**, or **I started this**

When the user continues with shield, poll the **foreground window title** (Windows API) for password-manager and banking keywords and surface a warning banner.

---

## Remote tools watched

AnyDesk, TeamViewer, RustDesk, Quick Assist (`msra` / QuickAssist), UltraViewer, LogMeIn, ScreenConnect, Supremo, Remote Desktop (`mstsc`).

Process names are matched by substring on the executable name (case-insensitive).

---

## Thread correlation

Extension sends `THREAD_CONTEXT` after each thread analysis with:

- `platform`, `threadId`, `senderLabel`
- `level`, `ruleIds`, `summary`

Companion stores context with a **45-minute TTL**. A thread is **flagged** when:

- `level` is `caution` or `high-risk`, **or**
- `ruleIds` contains `R04` (remote access mention)

Uncorrelated detections (no active flagged thread) do not trigger the full prompt.

---

## Incident logging

Companion queues `remote_session_detected` events; extension drains them from `PONG.pendingEvents` and writes to the encrypted IndexedDB incident log.

---

## Limitations (v1)

- Process name matching can miss renamed binaries
- Foreground-title shield is Windows-only and best-effort
- Cannot block remote tools the user deliberately approves via **I started this**
- Does not intercept OS-native Quick Assist invitations before launch

---

## Alternatives considered

1. **Extension-only detection** — rejected; cannot see desktop processes  
2. **Always prompt on any remote tool** — rejected; too noisy for legitimate IT support  
3. **Kernel driver** — rejected; out of scope for v1  
