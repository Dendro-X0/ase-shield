# Threat Model

Attack scenarios for freelancers, B2B professionals, and e-commerce operators—mapped to product features.

This is not an enterprise threat model against nation-states. It targets **professional scam rings** using social engineering plus consent-based technical steps.

---

## Attacker profile

- Organized scam groups, often cross-border
- Phase 1: social engineers (scripts, fake personas, urgency)
- Phase 2: technical operators (malware, RAT, credential harvest, payment redirect)
- Goal: money, credentials, remote access, or persistent compromise

---

## Two-phase attack flow

```
Recon → Trust building → Ask (Phase 1 success) → Technical payload (Phase 2)
                              │
                              └── If user refuses: attacker pivots to next target
```

**Product implication:** Phase 1 features reduce Phase 2 exposure. Phase 2 features reduce blast radius when Phase 1 fails.

---

## Phase 1 scenarios

### S1 — Fake job opportunity

**Flow:** Admire portfolio → NDA → off-platform chat → payment or install request  
**Signals:** Off-platform pressure, new domain, urgency, mismatched company name  
**Features:** R01, R02, R07, thread timeline, contact consistency

### S2 — Paid test task → malware

**Flow:** Small real payment → larger project → “run our repo” / install IDE  
**Signals:** R08, GitHub/npm links from unknown client, remote access mention  
**Features:** R04, R08, link inspector, download quarantine

### S3 — Fake login / OAuth harvest

**Flow:** “View brief on our portal” → fake Upwork/LinkedIn/Google login  
**Signals:** R03, R09, R12, domain mismatch  
**Features:** Login page warning, link inspector, job browser profile (M3)

### S4 — Overpayment / refund scam

**Flow:** Overpay → ask refund via wire/crypto before check clears  
**Signals:** R05, R06  
**Features:** Payment-flow rules, plain-language “wait for settlement” guidance

### S5 — B2B invoice / wire fraud

**Flow:** Spoofed vendor email, changed banking details  
**Signals:** R02, domain similarity, wire-detail change in thread  
**Features:** B2B rule pack (M3), invoice verification checklist (M7)

### S6 — Remote “interview” / pair programming

**Flow:** Legitimate-seeming call → screen share → install AnyDesk  
**Signals:** R04, escalation within 48h  
**Features:** Remote session guard (M6), R04 overlay

### S7 — E-commerce buyer/seller phishing

**Flow:** Fake dispute portal, shipping label scam  
**Signals:** R03, R09, off-platform payment  
**Features:** Marketplace rules (M3), link inspector

---

## Phase 2 scenarios

### T1 — Malicious document

**Payload:** PDF/ZIP with macros, OLE, or double extension  
**Impact:** Ransomware, credential theft, backdoor  
**Features:** Quarantine (M4), static analysis, document lane sandbox (M5)

### T2 — Malicious executable / installer

**Payload:** “Client app,” “screen recorder,” fake meeting tool  
**Impact:** Full device compromise  
**Features:** Windows Sandbox tier (M5), network deny default

### T3 — Supply-chain style repo

**Payload:** npm/pip package with postinstall script  
**Impact:** Dev credential theft  
**Features:** R08 warning; future: local repo scan in companion (post-beta)

### T4 — Remote access tool (RAT)

**Payload:** AnyDesk/TeamViewer with unattended access  
**Impact:** Real-time control, banking theft  
**Features:** Remote session guard (M6), sensitive app shield

### T5 — Session / cookie theft

**Payload:** Malicious browser extension or infostealer  
**Impact:** Account takeover without password  
**Features:** Quarantine for extensions; startup diff undo (M7)

### T6 — Persistence after “normal” open

**Payload:** User bypassed sandbox  
**Impact:** Startup entries, scheduled tasks  
**Features:** Behavior watch, undo wizard (M7)

---

## Feature mapping matrix

| Feature | Phase | Milestone | Scenarios |
|---------|-------|-----------|-----------|
| Rule engine | 1 | M1 | All S* |
| In-page overlay | 1 | M2 | S1–S7 |
| Link inspector | 1 | M2 | S3, S7 |
| Download intercept | 1→2 | M2 | S2, T1, T2 |
| Quarantine | 2 | M4 | T1, T2, T5 |
| Static file analysis | 2 | M4 | T1, T2 |
| Windows Sandbox | 2 | M5 | T2 |
| Restricted process runner | 2 | M5 | T1 |
| Network deny in sandbox | 2 | M5 | T2 |
| Remote session guard | 2 | M6 | S6, T4 |
| Recovery wizard | 2 | M7 | All T* |
| Incident export | 1+2 | M3, M7 | Disputes, platform reports |

---

## Out of scope (v1)

| Threat | Reason |
|--------|--------|
| Drive-by browser zero-day | OS/browser vendor domain |
| Hardware keylogger | Physical access |
| Nation-state APT | Different product class |
| SIM swap (no phone access) | Guide only in recovery wizard |
| Scams entirely on mobile native apps | Extension cannot inject; future mobile companion |
| User runs malware as Administrator intentionally | Cannot fully prevent |

---

## Test fixtures (synthetic)

Store under `fixtures/`—never real victim data.

| Fixture ID | Type | Exercises |
|------------|------|-----------|
| F-S1-a | Message | Off-platform + urgency |
| F-S2-a | Message | Paid test + GitHub link |
| F-S3-a | HTML | Fake LinkedIn login |
| F-T1-a | File | `brief.pdf.exe` metadata |
| F-T1-b | File | ZIP with `.js` inside |
| F-T2-a | File | Unsigned `.exe` metadata |

Each fixture linked to acceptance tests in M1 and M4.
