# Dev Lab — simulated fraud environment

Local-only test harness for Anti-SE Shield. No real scammers, malware, or network calls required.

## What it is

The **Dev Lab** is an extension page that renders fake Gmail, LinkedIn, and Upwork conversation shells pre-filled with curated scam scenarios. Each scenario runs the **same rule engine** used on live sites and compares results to expected risk levels and rule IDs.

Use it to:

- Demo the product to new users without hunting real fraud
- Regression-test rule changes (`Run all scenarios`)
- Train yourself on pattern recognition (teaching point per scenario)
- Test link inspector fixtures (typo domains, fake OAuth)

## Open the lab

1. Load the extension unpacked (`apps/extension/dist`).
2. Extension popup → **Dev Lab**, or Options → **Dev Lab**.
3. Direct URL (after build): extension path `src/dev-lab/dev-lab.html`.
4. **Web dashboard** — Overview setup panel links to Dev Lab when the extension is connected (`GET /api/setup` → `devLabUrl`). See [ADR-006](decisions/ADR-006-dev-lab-simulation.md).

Companion should be running if you want results mirrored to the dashboard activity feed.

## Scenarios (v1)

| ID | Platform | Pattern | Expected |
|----|----------|---------|----------|
| `practice-hiring-scam` | LinkedIn | AnyDesk + wallet redirect | high-risk |
| `upwork-telegram-pivot` | Upwork | Move off-platform | caution |
| `gmail-credential-phish` | Gmail | Password + urgency | high-risk |
| `overpayment-wire` | Gmail | Refund difference | high-risk |
| `fake-escrow-portal` | Upwork | Bypass escrow | high-risk |
| `hiring-repo-trap` | LinkedIn | Clone repo / npm install | high-risk |
| `escalation-timeline` | LinkedIn | Friendly → install | high-risk |
| `benign-milestone` | Upwork | Normal client (control) | safe |

Link fixtures (global section): official LinkedIn URL, typo domain, fake OAuth.

Scenario definitions live in `packages/core/src/dev-lab.ts` — shared with unit test fixtures in `packages/rules`.

## How it differs from Practice mode

| | Practice | Dev Lab |
|---|----------|---------|
| Audience | End users, onboarding | Developers, dogfood, demos |
| Scenarios | 1 | 8 + link fixtures |
| UI | Single thread | Platform chrome + suite runner |
| Incidents | Never logged | Never logged (`ase-dev-lab-*` thread IDs) |

## Regression suite

Click **Run all scenarios**. The lab reports `PASS`/`FAIL` per scenario:

- **Level match** — actual vs expected `safe` / `caution` / `high-risk`
- **Rule match** — expected rule IDs must all fire

Failed scenarios are highlighted; the first failure is shown in the result panel.

## Adding a scenario

1. Add entry to `DEV_LAB_SCENARIOS` in `packages/core/src/dev-lab.ts`.
2. Prefer aligning with a rule fixture in `packages/rules/src/fixtures.ts`.
3. Rebuild extension; run suite.

Thread IDs use prefix `ase-dev-lab-{id}` (practice uses `ase-practice-mode`).

## Limitations

- Does not execute real DOM content scripts (simulates message text via background analysis).
- Does not download real files — file rules are covered in `packages/rules` unit tests.
- Remote-session guard and quarantine require separate companion testing.

See also [DEVELOPMENT.md](./DEVELOPMENT.md) and [DASHBOARD.md](./DASHBOARD.md).
