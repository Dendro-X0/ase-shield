# Development

## Prerequisites

- Node.js 20+
- pnpm 9+
- Rust stable (for companion)
- Windows 10/11 (primary target)

## Setup

```bash
pnpm install
pnpm build
```

## Run locally

### 1. Desktop companion

```bash
pnpm dev:companion
```

Starts the Tauri app with:

- System tray (Show / Quit)
- IPC server on `http://127.0.0.1:47123`
- UI showing extension connection status

### 2. Browser extension

```bash
pnpm dev:extension
```

Then load the extension in Chrome or Edge:

1. Open `chrome://extensions` or `edge://extensions`
2. Enable **Developer mode**
3. **Load unpacked** → select `apps/extension/dist`

### 3. Verify connection

1. Keep the companion running
2. Open the extension popup
3. Status should show **Connected** within a few seconds

### 4. Test M2 overlays

1. Open [Gmail](https://mail.google.com) or [LinkedIn messaging](https://www.linkedin.com/messaging/)
2. Open a conversation — the **Anti-SE Shield** badge appears top-right of the thread
3. Hover links to see the local domain inspector tooltip
4. Use **Settings** (extension options) to toggle rules or add trusted domains

### 5. Test download handoff

With companion running, download a file named `brief.pdf.exe`. The extension should:

- Flag it via rule R10
- Send `DOWNLOAD_QUEUED` to the companion (check companion logs)
- Show a `!` badge on the extension icon

### 6. Test M5 Open safely

1. Quarantine a test file (download `brief.pdf.exe` or copy any file into `%LOCALAPPDATA%\Anti-SE Companion\quarantine\` and add to `index.json` for manual tests)
2. In the companion quarantine inbox, click **Open safely**
3. Confirm the **Safe Workspace** overlay appears (green border)
4. Click **End session** — summary should say nothing was saved to your PC

| File type | Expected tier | What you should see |
|-----------|---------------|---------------------|
| `.exe` / `.msi` | Tier 2 (Pro + Sandbox enabled) | Windows Sandbox VM launches; networking off |
| `.exe` on Home / Sandbox off | Tier 1 fallback | Warning + limited preview message |
| `.pdf` | Tier 3 | In-app PDF preview; Office not launched |
| `.docm` | Tier 3 | Blocked message (macros not run on host) |
| `.zip` containing `eicar.com` | Tier 1 | Archive listing only — **never execute** on host |

EICAR zip test (benign):

```powershell
# Create test zip — standard antivirus test string, not malware
Set-Content -Path eicar.com -Value 'X5O!P%@AP[4\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*'
Compress-Archive -Path eicar.com -DestinationPath job-brief.zip -Force
```

Download or quarantine `job-brief.zip`, then **Open safely** — the archive contents list in Safe Workspace without extraction on the host.

Windows Sandbox feature check:

```powershell
Get-WindowsOptionalFeature -Online -FeatureName Containers-DisposableClientVM
```

See [decisions/ADR-001-sandbox-tier-implementation.md](decisions/ADR-001-sandbox-tier-implementation.md).

### 7. Test M6 remote session guard

1. Open a flagged thread in Gmail/LinkedIn with AnyDesk mentioned (fixture text triggers R04)
2. Keep companion running in foreground or tray
3. Launch a remote tool (e.g. AnyDesk) or rename a test process — companion polls every 2 seconds
4. Within ~5 seconds the companion window should show **Remote session detected** with three actions
5. Click **End session** — companion attempts to close matching remote-tool processes
6. Choose **Continue with shield**, then focus a password manager window — a sensitive-app warning should appear

Thread context is synced from the extension via `THREAD_CONTEXT` IPC on each analysis.

See [decisions/ADR-003-remote-session-guard-m6.md](decisions/ADR-003-remote-session-guard-m6.md).

### 8. Test M7 recovery wizard

1. Open companion → **Open recovery wizard**
2. Click **Start recovery wizard** (captures startup baseline)
3. Complete checklist steps, then **Scan now** on exposure step
4. If new startup/tasks appear, select them on undo step → **Undo selected**
5. **Export report** — PDF opens from `Documents/Anti-SE Reports/`

See [decisions/ADR-004-recovery-kit-m7.md](decisions/ADR-004-recovery-kit-m7.md).

## Commands

| Command | Description |
|---------|-------------|
| `pnpm build` | Build all packages, extension, and companion UI |
| `pnpm typecheck` | TypeScript check across workspace |
| `pnpm test` | Run rule engine unit tests (`@ase/core`, `@ase/rules`) |
| `pnpm dev:extension` | Extension watch build |
| `pnpm --filter @ase/extension build:firefox` | Firefox package (`apps/extension/dist-firefox` — Chrome build + Gecko manifest) |

## Companion Rust checks

```bash
cd apps/companion/src-tauri && cargo check
```

Full Windows installer (later milestones):

```bash
pnpm --filter @ase/companion tauri:build
```

## Project layout

See [ARCHITECTURE.md](ARCHITECTURE.md) for monorepo structure and IPC contract.

M0 uses localhost HTTP for extension ↔ companion IPC. See [decisions/ADR-002-localhost-ipc-m0.md](decisions/ADR-002-localhost-ipc-m0.md).
