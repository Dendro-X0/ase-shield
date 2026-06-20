# Architecture

Local-first monorepo for Phase 1 (browser extension) and Phase 2 (Windows companion).

---

## High-level diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        User's Windows PC                         │
├────────────────────────────┬────────────────────────────────────┤
│   Browser Extension (MV3)  │   Desktop Companion (Tauri 2)     │
│   ─────────────────────    │   ───────────────────────────     │
│   • Content scripts        │   • Quarantine store              │
│   • Download intercept     │   • Sandbox orchestration         │
│   • In-page overlays       │   • Process / remote-session watch│
│   • Options / onboarding   │   • Recovery wizards              │
└─────────────┬──────────────┴──────────────┬─────────────────────┘
              │         IPC (typed)          │
              └──────────────┬───────────────┘
                             │
              ┌──────────────▼──────────────┐
              │         packages/core        │
              │  • Analysis engine           │
              │  • Incident log schema       │
              │  • IPC message types         │
              └──────────────┬──────────────┘
                             │
         ┌───────────────────┼───────────────────┐
         │                   │                   │
┌────────▼────────┐ ┌────────▼────────┐ ┌───────▼────────┐
│ packages/rules  │ │ packages/wasm   │ │ packages/ui    │
│ Scam rule packs │ │ Static file scan│ │ Shared React   │
│ (JSON/TS)       │ │ (Rust → WASM)   │ │ components     │
└─────────────────┘ └─────────────────┘ └────────────────┘
```

---

## Monorepo layout (target)

```
ase-shield/
├── apps/
│   ├── extension/          # Chrome/Edge/Firefox MV3
│   │   ├── src/
│   │   │   ├── background/
│   │   │   ├── content/    # Per-platform scripts
│   │   │   ├── popup/
│   │   │   └── options/
│   │   └── manifest.json
│   └── companion/          # Tauri 2 (Rust + React)
│       ├── src-tauri/
│       │   ├── src/
│       │   │   ├── quarantine/
│       │   │   ├── sandbox/
│       │   │   ├── ipc/
│       │   │   └── watchdog/
│       │   └── tauri.conf.json
│       └── src/            # React UI
├── packages/
│   ├── core/               # Shared TS: types, engine, crypto log
│   ├── rules/              # Rule definitions + fixtures
│   ├── wasm/               # File analysis (compiled to WASM)
│   └── ui/                 # Shared overlay components
├── docs/
├── fixtures/               # Scam samples for tests (synthetic)
└── package.json            # pnpm workspaces
```

---

## Technology choices

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Monorepo | pnpm workspaces | Solo-dev friendly, fast, strict |
| Extension | TypeScript, MV3 | Store compliance, wide reach |
| Companion | Tauri 2 + Rust | Small binary, native sandbox control |
| UI | React + Tailwind | Matches solo-dev defaults; shared with extension pages |
| Local storage | IndexedDB (extension), SQLite (companion) | Structured, offline |
| Encryption | Web Crypto / OS DPAPI for keys | Incident log at rest |
| File analysis | Rust in companion; WASM optional in extension | Performance, no upload |
| IPC | Native Messaging + typed JSON schema | Reliable extension ↔ companion |

### Deliberately not in v1

- Cloud backend, user accounts, telemetry pipeline
- LLM API calls for classification (deterministic rules first)
- Kernel drivers or custom minifilter

---

## Boundary contracts

### Analysis API (`packages/core`)

```typescript
interface AnalysisRequest {
  kind: 'message' | 'page' | 'link' | 'file-metadata';
  text?: string;
  url?: string;
  file?: { name: string; size: number; sha256?: string; mime?: string };
  context: {
    platform: 'gmail' | 'linkedin' | 'upwork' | 'fiverr' | 'whatsapp' | 'telegram' | 'unknown';
    threadId?: string;
    senderLabel?: string;
  };
}

interface RuleHit {
  ruleId: string;
  title: string;
  why: string;
  whatToDo: string;
  severity: 'low' | 'medium' | 'high';
}

interface AnalysisResult {
  level: 'safe' | 'caution' | 'high-risk';
  hits: RuleHit[];
  analyzedAt: string; // ISO, local clock
}
```

### IPC messages (extension ↔ companion)

| Message | Direction | Purpose |
|---------|-----------|---------|
| `PING` / `PONG` | ↔ | Health check |
| `DOWNLOAD_QUEUED` | → companion | Metadata + optional quarantine path |
| `QUARANTINE_STATUS` | ← companion | Scan result, severity |
| `OPEN_SAFELY_REQUEST` | → companion | User action from extension or notification |
| `SESSION_EVENT` | ← companion | Sandbox started/ended, alerts |
| `THREAD_CONTEXT` | → companion | Correlate file with job conversation |

All messages versioned: `{ v: 1, type: string, payload: ... }`.

---

## Data and privacy model

| Data | Location | Leaves device? |
|------|----------|----------------|
| Message snippets for analysis | In-memory; optional log entry | Never |
| Incident log | Encrypted local DB | Never (unless user exports) |
| Quarantined files | Local app directory | Never |
| Rule updates | Optional HTTPS fetch of signed pack | Pack only; no user ID |
| Allowlists / dismissals | Local | Never |

**Design rule:** if a feature requires uploading user content to function, it is opt-in and isolated behind a separate module—not in core.

---

## Phase 1 extension architecture

```
Page DOM
   │
   ▼
Content script (isolated world)
   │ extract visible thread text + links
   ▼
packages/core analyze()
   │
   ▼
Shadow DOM overlay (packages/ui)
   │
   └── user dismiss / allowlist → local storage

Background service worker
   │
   ├── chrome.downloads → IPC DOWNLOAD_QUEUED
   └── native messaging → companion
```

**Permission minimization:** host permissions scoped to supported platforms + `downloads` + `nativeMessaging`. No `<all_urls>`.

---

## Phase 2 companion architecture

```
IPC listener
   │
   ▼
Quarantine manager ──► Static analyzer (Rust / WASM)
   │
   ├── Open safely ──► Sandbox router
   │                      ├── Tier 1: restricted process
   │                      ├── Tier 2: Windows Sandbox VM
   │                      └── Tier 3: document isolated view
   │
   └── Watchdog ──► Remote desktop process detection
                      └── consent UI / sensitive app shield
```

See [WINDOWS_SANDBOX.md](WINDOWS_SANDBOX.md) for sandbox tiers.

---

## Security considerations for the protector itself

- Companion runs with user privileges—not admin by default
- Quarantine directory ACL: user-only
- IPC validates message schema; reject oversized payloads
- Extension native messaging host allowlist in registry (installer)
- Signed releases; reproducible build documented in beta
- Supply chain: lockfile, `pnpm audit`, Dependabot

---

## Testing strategy

| Layer | Approach |
|-------|----------|
| Rules | Fixture messages → expected `AnalysisResult` |
| Core | Unit tests, no browser |
| Extension | Playwright against saved HTML fixtures (not live sites) |
| Companion | Rust unit + integration tests; Windows Sandbox in CI optional (manual gate) |
| E2E | Synthetic download → quarantine → sandbox smoke (local script) |

Live scraping of Gmail/LinkedIn in CI is avoided—DOM fixtures only.

---

## Build and release

| Artifact | Output |
|----------|--------|
| Extension | `apps/extension/dist` → zip for stores |
| Companion | Tauri NSIS installer (`.msi`/setup exe) |
| Versioning | Semver; extension and companion version locked together in beta |

CI runs on `windows-latest` for companion; extension builds on Ubuntu + Windows.
