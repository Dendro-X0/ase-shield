# ADR-002: Localhost IPC for M0

**Status:** Accepted (M0)  
**Date:** 2026-06-18

## Context

Extension ↔ companion communication is required for download quarantine handoff (M4+). Production will use Native Messaging on Windows; M0 needs a working connection without installer/registry setup.

## Decision

Use **localhost HTTP** on `127.0.0.1:47123` with typed JSON envelopes from `@ase/core`.

- Extension: `POST /ipc` with `PING` messages
- Companion: Axum server responds with `PONG`
- CORS: allow all origins (bind address is loopback only)

## Consequences

- Extension requires `host_permissions` for `http://127.0.0.1:47123/*`
- Native Messaging replaces this in a later milestone before store release
- No external network; aligns with local-first privacy model
