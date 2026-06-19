# ADR-005: Public beta packaging and onboarding (M8)

**Status:** Accepted  
**Date:** 2026-06-18  
**Context:** Milestone 8 — ship extension + companion to early users with store-ready privacy posture and first-run education.

## Decision

1. **Version** `1.0.0-beta.1` on extension manifest and Tauri bundle.
2. **Onboarding** as extension pages (`onboarding.html`, `practice.html`) opened on `chrome.runtime.onInstalled` (install only).
3. **Practice thread** uses fixed `PRACTICE_THREAD_ID` in `@ase/core`; analysis skips incident log append for that ID.
4. **Feedback** exported as local markdown from options; no inbound API.
5. **Privacy** documented in `docs/PRIVACY.md`; store checklists in `docs/store/`.
6. **Companion installer** via Tauri NSIS; CI runs `cargo check` + optional `tauri build` job; code signing deferred to maintainer cert env vars.

## Consequences

- First install opens a tab (may surprise power users; dismissible).
- Store listings still require maintainer submission and hosted privacy URL.
- Unsigned beta installers trigger SmartScreen — documented in BETA.md and KNOWN_ISSUES.md.

## Alternatives considered

- In-page onboarding only → rejected; practice thread needs isolated UI.
- Telemetry for false positive rate → rejected; conflicts with local-first principle.
