# Universal scanner

> **Status:** Phase 1 (foundation shipped)  
> **Lineage:** Adapted from the [detox-extension](https://github.com/) universal scanner pattern (SignalLens / detox-extension `docs/planning/universal-scanner-roadmap.md`)

## Problem

Per-site `PlatformAdapter` implementations chase unstable DOM selectors. Fiverr obfuscates classes; every new marketplace needs a new adapter file, manifest entry, and maintenance burden.

## Approach

One **universal scanner** in `@ase/core` discovers text units on any page. Site-specific code is demoted to:

| Layer | Role |
|-------|------|
| **Universal scanner** | Walk DOM + shadow roots, group prose/message blocks, fingerprint units |
| **Site hints** | Optional `ignoreSelectors` / `boostSelectors` per hostname (precision tuning) |
| **Site enrichers** | Optional API boosts (e.g. Fiverr inbox JSON) when DOM is thin |
| **Platform adapters** | Legacy path — frozen; remove after dogfood sign-off |

```mermaid
flowchart LR
  Walker[DOM walker] --> Units[ContentUnit[]]
  Hints[Site hints] -.-> Walker
  Enrich[Site enrichers] --> Analyze[Rule engine]
  Units --> Analyze
```

## Invariants (from detox-extension)

| # | Invariant | Meaning |
|---|-----------|---------|
| I1 | Good-enough completeness | Visible message blocks appear in scan set |
| I2 | Scan once per fingerprint | Each unit id analyzed once per page visit |
| I3 | Monotonic discovery | Scrolling adds units; count plateaus |

## Extension wiring

- Single content script: `entry-universal.ts` on **`https://*/*`** (excludes Chrome Web Store URLs)
- `bootstrap-universal.ts` + `scan-coordinator.ts` debounce rescans → `ANALYZE_THREAD`
- `platformFromHostname()` + `threadIdFromLocation()` replace per-adapter thread IDs

## Manifest scope

| Permission | Value | Why |
|------------|-------|-----|
| Content script `matches` | `https://*/*` | Forums, Discord web, marketplaces — universal scanner |
| `exclude_matches` | `chrome.google.com`, `chromewebstore.google.com` | No injection on store pages |
| `host_permissions` | `https://*/*`, `http://127.0.0.1:47123/*` | Same-origin fetches (e.g. Fiverr inbox API) + companion IPC |

**Store tradeoff:** Broad host permission triggers manual review. Justification: local DOM read only; no uploads. **Default:** `marketplaceOnlyScan` is **on** — automatic scan limited to freelance/B2B hosts; users can opt into all HTTPS sites. See [`docs/store/CHROME_WEB_STORE.md`](../store/CHROME_WEB_STORE.md) and [`docs/PRIVACY.md`](../PRIVACY.md).

## Adding precision for a site

1. Optional: add hint pack in `packages/core/src/scanner/site-hints.ts`
2. Optional: add enricher in `apps/extension/src/content/site-enrichers.ts`
3. **No manifest change** required for new HTTPS origins

## Future

- Selection analyze + universal scan share the same rule pipeline
- Retire `entry-gmail.ts`, `platforms/*.ts` after parity dogfood
- Optional user setting to narrow scan scope (enterprise / privacy-conscious users) — **`marketplaceOnlyScan`** (default on)
