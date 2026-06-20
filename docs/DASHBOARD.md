# Web dashboard

Local web UI for Anti-SE Shield, served by the Windows companion at **[http://127.0.0.1:47123/](http://127.0.0.1:47123/)** (localhost only).

## What it shows

| Page | Purpose |
|------|---------|
| **Overview** | Extension connection, quarantine count, recent activity |
| **Activity** | Flagged threads, quarantined downloads, remote-session events |
| **Quarantine** | Manage held downloads (open safely, defer, delete) |
| **Protection** | Remote-session alerts, environment status, synced incidents |
| **Settings** | Extension protection toggles, rules, and trusted domains (synced via companion) |

Data stays on your PC. The dashboard reads the companion REST API; incidents are mirrored from the extension over existing localhost IPC.

## Open the dashboard

1. Start **Anti-SE Companion** (system tray).
2. Open **http://127.0.0.1:47123/** in Chrome or Edge on the same machine.
3. Follow **See it work in 2 minutes** on Overview if activity is empty:
   - Extension popup → **Practice** → **Analyze this thread**
   - A **Practice demo** row should appear in Recent activity
4. Or click **Dashboard** in the extension popup / companion window.

## Development

**Start companion first** (it owns port `47123`). Then optionally run dashboard hot reload.

```bash
# Terminal 1 — companion (API + embedded dashboard)
pnpm dev:companion

# Terminal 2 — dashboard UI hot reload (proxies /api to companion)
pnpm dev:dashboard
# → http://localhost:3000
```

If `dev:dashboard` shows `ECONNREFUSED 127.0.0.1:47123`, the companion is not running or crashed on startup.

Build:

```bash
pnpm --filter @ase/dashboard build   # output: apps/companion/dashboard-dist/
pnpm --filter @ase/companion tauri:build
```

## UI stack

The dashboard uses [shadcn/ui](https://ui.shadcn.com/) (Tailwind CSS v4, zinc dark theme) with a sidebar layout inspired by shadcn dashboard blocks. Dev hot reload runs on port **3000**; production is embedded in the companion at port **47123**.

UI standards (function-first): [DASHBOARD_UI.md](DASHBOARD_UI.md).

## API (localhost)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/summary` | Status cards |
| GET | `/api/activity` | Activity feed |
| GET | `/api/incidents` | Extension-synced incidents |
| GET | `/api/incidents/export` | Export incidents as JSON + HTML (`?id=` optional) |
| GET | `/api/quarantine` | Quarantine items |
| GET | `/api/remote-guard` | Remote guard state |
| POST | `/api/quarantine/{id}/defer` | Defer item |
| POST | `/api/quarantine/{id}/delete` | Delete item |
| POST | `/api/quarantine/{id}/open-safely` | Start Safe Workspace |
| POST | `/api/remote-guard/respond` | Respond to remote alert |
| GET | `/api/settings` | Extension settings cache (from last ping) |
| POST | `/api/settings` | Queue settings update for extension sync |

Extension IPC remains at `POST /ipc`.
