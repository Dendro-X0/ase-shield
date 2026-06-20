# ADR-007: Obscur — distinct product, mutual reference

**Status:** Accepted  
**Date:** 2026-06-20 (revised 2026-06-21)  
**Context:** Anti-SE Shield and Obscur are **separate initiatives** by the same maintainer. Obscur is developing (and will continue to develop) its **own native** anti–social-engineering module. Shield focuses on freelance-first protection on the public web and Windows. The repos **mutually reference** design insights; neither is a dependency or extraction target for the other.

---

## Decision

1. **Keep products independent** — distinct codebases, release trains, and implementation paths.
2. **Document cross-reference explicitly** — shared principles (local-first, deterministic rules, recipient-local assessment, user agency) without mandating shared packages.
3. **Shield’s primary wedge is freelance** — marketplace adapters, remote guard, and download containment address the highest scam density in maintainer experience (~8/10 contacts on freelance platforms showing scam/phish patterns).
4. **Shield explores broader web social surfaces** via adapter tiers (full / links-only / download-only), using Obscur’s trust model as **design reference** for how warnings behave in decentralized, non-moderated contexts.
5. **Obscur resumes native SEC-F on its own timeline** — dm-kernel, `assessDmTrustWarning`, Obscur-specific bundles (wallet, mnemonic, cold contact). May optionally align fixtures or rule IDs with Shield; **not required**.

---

## Shared design principles (both products)

| Principle | Shield | Obscur |
|-----------|--------|--------|
| Local assessment | On device; no cloud message classification | After decrypt on recipient device |
| Explainability | Rule IDs + plain-language copy | Bundle labels + user-dismiss |
| User agency | Dismiss, allowlist, settings | Sensitivity, block, mute |
| No default telemetry | Yes | Yes |
| Centralized censorship | No — warn, don’t vendor-ban | No — recipient-local assistance only |

---

## What each project references from the other

**Shield ← Obscur**

- Post-decrypt, recipient-only warning flow.
- Structural/behavioral signals (cold contact, link class, rate) over ideology keyword filters.
- UX for legitimate users in environments without platform safety teams.

**Obscur ← Shield**

- Freelance scam pattern catalog (R01–R12) and Dev Lab regression methodology.
- Phase 1 → Phase 2 narrative (conversation warning before file/session harm) where applicable.
- Web adapter-tier pattern for future “open network” Obscur scenarios.

---

## Obscur baseline (for reference)

Obscur shipped v1.9.5 trust baseline; SEC-F expansion paused on Obscur schedule, not blocked by Shield:

| Asset | Path (Obscur monorepo) |
|-------|------------------------|
| SE phrase detectors | `apps/pwa/app/features/dm-kernel/dm-kernel-trust-social-engineering-signals.ts` |
| Trust assessment port | `apps/pwa/app/features/dm-kernel/dm-kernel-trust-assessment-port.ts` |
| Program charter | `docs/program/trust-defense-v2-scope.md` |

---

## Optional alignment (maintainer discretion)

If useful, either side may:

- Publish **fixture corpora** (synthetic scam text) for comparison tests.
- Align **rule IDs** for overlapping patterns (off-platform, remote access, payment pressure).
- Share **JSON rule schema** ideas without merging codebases.

None of these are exit criteria for either product.

---

## Consequences

**Positive**

- Clear product boundaries; no false impression that Shield is “Obscur’s browser layer.”
- Freelance-first focus matches real maintainer pain and dogfood opportunity.
- Both codebases can move at their own pace while sharing lessons.

**Risks**

- Duplicated pattern work if cross-reference docs are neglected — mitigated by this ADR and Obscur [mutual-reference doc](file:///E:/Web%20Projects/experimental-workspace/newstart/docs/program/anti-se-shield-mutual-reference.md).

---

## References

- [PRODUCT_VISION.md](../PRODUCT_VISION.md)
- Obscur: [anti-se-shield-mutual-reference.md](file:///E:/Web%20Projects/experimental-workspace/newstart/docs/program/anti-se-shield-mutual-reference.md)
