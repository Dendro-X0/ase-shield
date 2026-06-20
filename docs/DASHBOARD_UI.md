# Dashboard UI standards

Function-first guidelines for the Anti-SE Shield web dashboard (`apps/dashboard`).

## Priority order

1. **Correct data** — API calls, polling, mutations, and error handling must work before visual polish.
2. **Clear states** — loading, empty, error, and success must be explicit and actionable.
3. **Consistent layout** — shared page header, section cards, and list patterns (shadcn/ui + Tailwind).
4. **Visual refinement** — spacing, typography, and motion only after the above are stable.

Defer decorative work (animations, marketing copy, illustration) until core flows are proven in dogfood.

## Layout patterns

| Pattern | Use for |
|---------|---------|
| `PageHeader` | Page title, one-line purpose, refresh + last-updated |
| `SectionCard` | Grouped content with title and optional description |
| `SettingsPage` | Extension settings via `/api/settings` (sync on ping) |
| `EmptyState` | Zero-data cases with a next step |
| `CompanionAlert` | Action errors with optional dismiss/retry |
| `ConnectionIssueBanner` | Companion offline or extension disconnected |
| `ConnectionTroubleshootingPanel` | Step list + install links (shared with popup steps) |
| `IncidentExportActions` | Download JSON/HTML via `/api/incidents/export` |
| `ActivityFeed` | Thread, download, and incident rows |

## Data hooks

- `usePoll(fetcher, intervalMs)` — shared polling with loading, refreshing, and `lastUpdated`.
- `CompanionStatusProvider` — sidebar connection indicator and quarantine badge count.

Pages should use `usePoll` instead of duplicating `useEffect` + `setInterval`.

## shadcn/ui usage

- **New York** style, **zinc** dark theme (`components.json`).
- Prefer existing primitives (`Button`, `Card`, `Badge`, `Alert`) over custom CSS.
- Risk levels map to `RiskBadge` variants — do not invent new color semantics per page.

## Responsive breakpoints

- **Mobile (`< md`)** — sheet navigation, stacked actions, horizontal scroll for tables.
- **Desktop (`≥ md`)** — fixed sidebar, multi-column stat grids.

## Out of scope (Phase 2+)

- `packages/ui` shared design system
- Dashboard `/settings` page
- Extension/companion visual unification

See [PRODUCT_ROADMAP.md](PRODUCT_ROADMAP.md) Phase 2 for the full UX foundation plan.
