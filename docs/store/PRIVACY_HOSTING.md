# Hosting the privacy policy for store submission

Chrome Web Store and Microsoft Edge Add-ons require a **stable public URL** for [PRIVACY.md](../PRIVACY.md).

---

## Live URL (automated)

**Privacy policy:** https://dendro-x0.github.io/ase-shield/privacy.html

Deployed automatically on every push to `main` by the **deploy-pages** job in [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml).

### One-time setup (already done if Pages source = GitHub Actions)

1. Repo **Settings → Pages → Build and deployment → Source:** **GitHub Actions**
2. Push to `main` (or run **Actions → CI → Run workflow**)
3. Open the privacy URL in an incognito window to confirm

Canonical constants in code: `packages/core/src/repo.ts` (`PRIVACY_POLICY_URL`).

---

## Pre-submit checklist

- [ ] URL loads in incognito without authentication
- [ ] States **no user data collection** and localhost companion IPC
- [ ] Lists permissions at high level (matches [PRIVACY.md](../PRIVACY.md))
- [ ] URL entered identically in Chrome and Edge store dashboards

---

## Store listing fields

| Field | Value |
|-------|-------|
| Privacy policy URL | `https://dendro-x0.github.io/ase-shield/privacy.html` |
| Repository | `https://github.com/Dendro-X0/ase-shield` |

Update [CHROME_WEB_STORE.md](./CHROME_WEB_STORE.md) and [EDGE_ADDONS.md](./EDGE_ADDONS.md) when submitting.
