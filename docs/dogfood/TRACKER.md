# Dogfood tracker — Phase 1

Local spreadsheet for measuring false positives and false negatives **without telemetry**. Copy this table into Excel/Sheets or append rows in git.

**Goal:** ≥10 threads before `1.0.0` release tag.  
**FP target:** &lt;15% false high-risk on this set (baseline; refine in Phase 4).

---

## How to use

1. Use the product normally on Gmail, LinkedIn, or Upwork for one week.
2. For each notable thread, add a row below.
3. For false positives/negatives, export **Settings → Beta feedback** and link the filename in Notes.
4. Summarize weekly in the rollup section.

---

## Thread log

| # | Date | Platform | Thread type | Level shown | Correct? | Rules fired | Notes |
|---|------|----------|-------------|-------------|----------|-------------|-------|
| 1 | | gmail | | | Y / N / — | | |
| 2 | | linkedin | | | | | |
| 3 | | upwork | | | | | |
| 4 | | gmail | benign | safe | | | control |
| 5 | | linkedin | | | | | |
| 6 | | upwork | | | | | |
| 7 | | gmail | | | | | |
| 8 | | linkedin | benign | | | | control |
| 9 | | upwork | | | | | |
| 10 | | linkedin | | | | | |

**Thread type examples:** hiring outreach, client payment, invoice, benign coworker, practice, dev-lab.

**Correct?:** `Y` = level matches your judgment; `N` = FP or FN; `—` = not applicable (practice/lab).

---

## Practice & Dev Lab (regression)

| Date | Source | Scenario | Result | Notes |
|------|--------|----------|--------|-------|
| | Practice | practice-hiring-scam | high-risk | |
| | Dev Lab | Run all scenarios | all PASS | |

---

## Weekly rollup

| Week ending | Threads logged | False positives | False negatives | Action |
|-------------|----------------|-----------------|-----------------|--------|
| | | | | |

---

## Definitions

| Term | Meaning |
|------|---------|
| **False positive** | Shield shows caution/high-risk on a legitimate thread you would trust |
| **False negative** | Obvious scam pattern; shield stays safe or misses expected rules |
| **Benign control** | Normal client/coworker mail — should stay **safe** |

---

## Related

- Feedback template: [feedback/false-positive-negative-report.md](../feedback/false-positive-negative-report.md)
- Phase 1 gate: [phases/PHASE_1_SHIP.md](../phases/PHASE_1_SHIP.md)
