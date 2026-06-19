# False positive / false negative report template

Use this when filing beta feedback about misclassified threads. **Nothing is sent automatically** — fill in Settings → Beta feedback and download the markdown file, or copy the sections below.

---

## Report type

<!-- false-positive | false-negative | other -->

## Context

- **Platform:** <!-- e.g. linkedin, gmail, upwork -->
- **Thread summary:** <!-- 1–3 sentences, no passwords or full PII -->

## Classification

- **Expected level:** <!-- safe | caution | high-risk -->
- **Actual level:** <!-- what Anti-SE Shield showed -->
- **Rules involved:** <!-- e.g. R04, R05 or "none" -->

## Notes

<!-- Why was this wrong? Steps to reproduce? Screenshot filenames if attached separately -->

## Optional contact

<!-- Email only if you choose to share this file with maintainers -->

---

## Maintainer checklist

When triaging:

1. Reproduce with same `text` in unit fixture or practice thread variant
2. Check disabled rules and domain allowlist in user settings
3. Label issue `false-positive` or `false-negative`
4. Link to rule IDs and proposed threshold/copy change
