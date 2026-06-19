# Windows Sandbox Strategy

Phase 2 containment for non-technical users on **Windows 10/11**.

**User-facing promise (accurate):**  
*“Open job files in a locked room so they can’t reach your passwords, files, or the rest of your computer.”*

**Not promised:** absolute protection against a determined user running malware as Administrator on the host.

---

## Design goals

1. **One button:** Open safely
2. **Graceful degradation** when Windows Sandbox is unavailable
3. **Visible containment** — user always knows they are protected
4. **Default deny network** for untrusted execution where feasible
5. **No cloud upload** for file analysis in v1

---

## Sandbox tiers

```
                    ┌─────────────────────┐
                    │  Quarantine inbox   │
                    └──────────┬──────────┘
                               │
                    Static analysis (Rust)
                               │
              ┌────────────────┼────────────────┐
              ▼                ▼                ▼
         ┌─────────┐    ┌─────────────┐   ┌──────────────┐
         │ Tier 3  │    │   Tier 2    │   │   Tier 1     │
         │ Document│    │  Win Sandbox│   │  Restricted  │
         │  lane   │    │  (disposable│   │   process    │
         │         │    │     VM)     │   │              │
         └─────────┘    └─────────────┘   └──────────────┘
```

### Routing logic (automatic — user does not choose tier)

| File signal | Tier | Rationale |
|-------------|------|-----------|
| `.exe`, `.msi`, `.bat`, `.cmd`, `.ps1`, `.scr`, `.com` | **Tier 2** (fallback Tier 1) | Highest risk; needs isolation |
| `.pdf`, `.doc`, `.docx`, `.xls`, `.xlsx` | **Tier 3** | Macro/OLE risk; view without host Office macros |
| `.zip`, `.rar`, `.7z` | **Tier 1** list-only or extract-in-restricted | No auto-extract on host |
| Images, plain text | **Tier 1** viewer | Low execution risk |
| Static analysis **high** flag | Bump up one tier | Defense in depth |

---

## Tier 1 — Restricted process runner

**Mechanism (implementation options, pick in M5 spike):**

| Option | Pros | Cons |
|--------|------|------|
| **AppContainer + low IL** | Native, no VM overhead | Not all apps run; limited |
| **Dedicated standard user + deny ACLs** | Broader app compatibility | Weaker than VM |
| **Job object + restricted token** | Fine-grained limits | Complex; app-specific |

**Recommended v1 approach:**

- Spawn viewer/helper in **AppContainer** when possible (built-in PDF/image viewer protocol)
- For generic files: extract to quarantine subfolder with **no execute** ACL on host; run bundled read-only viewer inside restricted job
- **Network:** Windows Firewall outbound block rule scoped to restricted process PID (best-effort)

**User sees:** green-bordered window titled **Safe Workspace**

---

## Tier 2 — Windows Sandbox

**When:** executables and installers.

**Requirements:**

- Windows 10 Pro/Enterprise/Education or Windows 11 Pro+ 
- Virtualization enabled in BIOS
- Windows Sandbox optional feature turned on

**Flow:**

1. Companion copies file into Sandbox-shared folder (or injects via scripted launch)
2. Launch inside disposable VM with:
   - Networking **off** by default (`.wsb` config `Networking Disabled`)
   - Clipboard **disabled**
   - No mapped host folders except single read-only drop
3. Auto-shutdown VM on session end
4. Summary: “Isolated computer was destroyed; nothing remains”

**Sample `.wsb` policy direction (implemented in M5):**

```xml
<Configuration>
  <Networking>Disable</Networking>
  <ClipboardRedirection>Disable</ClipboardRedirection>
  <PrinterRedirection>Disable</PrinterRedirection>
  <MappedFolders>
    <MappedFolder>
      <HostFolder>QUARANTINE_DROP_PATH</HostFolder>
      <ReadOnly>true</ReadOnly>
    </MappedFolder>
  </MappedFolders>
  <LogonCommand>
    <Command>explorer.exe</Command>
  </LogonCommand>
</Configuration>
```

**Fallback when unavailable:**

- Detect SKU / feature state at install and runtime
- Show: *“Full isolation needs Windows Sandbox (Pro). Opening with limited protection instead.”*
- Route to Tier 1 + stronger warnings + recommend not running `.exe`

---

## Tier 3 — Document lane

**Goal:** Open contracts and briefs without enabling macros on host.

**Approach:**

- Prefer **read-only render**: convert to static preview where possible (PDFium in sandboxed process)
- Block macro execution paths (do not shell-open with default Office on host for flagged files)
- If Office required: open in Windows Sandbox with Office if installed in VM, else read-only PDF export inside Tier 1 viewer

**User message:** *“This document can contain automatic scripts. We’re showing a safe preview.”*

---

## Network policy

| Tier | Default | User override |
|------|---------|---------------|
| Tier 1 | Outbound blocked (best-effort) | “Allow internet” with warning |
| Tier 2 | Disabled in `.wsb` | Not offered in v1 |
| Tier 3 | Blocked for viewer process | N/A |

**Alert copy when blocked:**  
*“This file tried to contact the internet. Test projects usually don’t need that—we stopped it.”*

---

## Integration with extension

```
Extension: download detected
    → background: hash + metadata
    → IPC DOWNLOAD_QUEUED
Companion: copy to quarantine, scan
    → tray notification: "Job file ready — Open safely?"
User clicks Open safely
    → router picks tier → session UI
    → SESSION_EVENT to extension (optional log link)
```

---

## M5 implementation spike (first week of milestone)

Ordered proof-of-concepts on dev machine:

1. [x] Launch Windows Sandbox with `.wsb` from Rust (`std::process` + `WindowsSandbox.exe`)
2. [x] Tier 1: open PDF in AppContainer or restricted viewer
3. [ ] Firewall outbound block for test process
4. [x] Detect Sandbox feature: `Get-WindowsOptionalFeature -Online -FeatureName Containers-DisposableClientVM`
5. [ ] Measure cold-start time (UX: show progress if >10s)

Spike output: `docs/decisions/ADR-001-sandbox-tier-implementation.md`

---

## Testing

| Test | Method |
|------|--------|
| Benign EICAR string in zip | Should never execute on host |
| Test unsigned `.exe` | Runs only inside Sandbox |
| Macro doc sample (synthetic) | Host Office not invoked |
| Sandbox disabled VM | Fallback path shows correct copy |
| Network callback binary | Blocked or alerted in Tier 1 |

Use isolated VM snapshots for malware-adjacent tests; never commit live malware.

---

## Known limitations (document in app)

- Windows Sandbox not on Home edition
- Some apps refuse to run in AppContainer
- User can still choose “Open normally anyway”
- Remote desktop approval bypasses file sandbox
- Encrypted archives may hide payload until opened—warn on encryption + job context
