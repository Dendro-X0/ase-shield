# Anti–Social Engineering Workspace

Local-first protection for freelancers, B2B professionals, and e-commerce operators who face two-phase scam attacks: **social engineering** (Phase 1) and **technical exploitation** (Phase 2).

## Principles

- **Local-first** — analysis, logs, and sandboxes stay on the user's device
- **Non-intrusive** — warn and contain; do not spy on unrelated browsing
- **No user data collection** — no telemetry by default; optional rule updates are content-addressed, not user-identified
- **Plain language** — built for non-technical users, not security experts

## Product shape

| Component | Role |
|-----------|------|
| **Browser extension** | Phase 1: message/link/login risk; download interception |
| **Desktop companion (Windows first)** | Phase 2: quarantine, sandbox, remote-session guard, recovery |
| **Shared core** | Rule engine, WASM static analysis, encrypted incident log |

## Documentation

| Document | Purpose |
|----------|---------|
| [ROADMAP.md](docs/ROADMAP.md) | Phased delivery plan, milestones, acceptance criteria |
| [PRODUCT_ROADMAP.md](docs/PRODUCT_ROADMAP.md) | Post-beta phases 1–4 (ship, UX, coverage, scale) |
| [phases/PHASE_1_SHIP.md](docs/phases/PHASE_1_SHIP.md) | Phase 1 ship-ready checklist |
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | Monorepo layout, boundaries, tech stack |
| [THREAT_MODEL.md](docs/THREAT_MODEL.md) | Attack scenarios mapped to product features |
| [DEVELOPMENT.md](docs/DEVELOPMENT.md) | Setup, run locally, verify connection |

| [WINDOWS_SANDBOX.md](docs/WINDOWS_SANDBOX.md) | Windows Phase 2 containment strategy |
| [PRIVACY.md](docs/PRIVACY.md) | Privacy policy (no data collection) |
| [BETA.md](docs/BETA.md) | Public beta install and verification |
| [DASHBOARD.md](docs/DASHBOARD.md) | Local web dashboard (127.0.0.1:47123) |
| [DEV_LAB.md](docs/DEV_LAB.md) | Simulated fraud scenarios for testing |
| [KNOWN_ISSUES.md](docs/KNOWN_ISSUES.md) | Beta known issues |

## Status

**Public beta (M8)** — `1.0.0-beta.1`: extension + Windows companion, onboarding, practice mode, store-ready privacy docs.

**Next:** [Phase 1 — Ship-ready](docs/phases/PHASE_1_SHIP.md) (store listings, signed installer, consumer install path). Full schedule: [PRODUCT_ROADMAP.md](docs/PRODUCT_ROADMAP.md).

See [BETA.md](docs/BETA.md) to install (sideload) and [DEVELOPMENT.md](docs/DEVELOPMENT.md) to run from source.

## Development platform

Primary target: **Windows 10/11**. macOS and Linux companions are deferred until core Windows flows are proven.
