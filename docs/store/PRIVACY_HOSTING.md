# Hosting the privacy policy for store submission

Chrome Web Store and Microsoft Edge Add-ons require a **stable public URL** for [PRIVACY.md](../PRIVACY.md).

---

## Requirements

| Requirement | Detail |
|-------------|--------|
| HTTPS | Required for store dashboards |
| Stable | Same URL across extension updates |
| Public | No login wall |
| Match content | Must reflect actual product behavior |

---

## Options (pick one)

### Option A — GitHub Pages (recommended for OSS)

1. Enable GitHub Pages via **Settings → Pages → Source: GitHub Actions**.
2. Push updates to `docs/privacy.html` — workflow [`.github/workflows/pages.yml`](../.github/workflows/pages.yml) publishes it.
3. Use `https://<org>.github.io/<repo>/privacy.html` in store listings.

Static file in repo: [`docs/privacy.html`](../privacy.html) (mirrors [PRIVACY.md](../PRIVACY.md)).

### Option B — Raw GitHub link (quick test only)

Some reviewers accept:

```
https://github.com/<org>/<repo>/blob/main/docs/PRIVACY.md
```

Prefer a rendered HTML page for production submission.

### Option C — Project website

If you have `anti-se.example.com`, host `PRIVACY.md` content at `/privacy`.

---

## Pre-submit checklist

- [ ] URL loads in incognito without authentication
- [ ] States **no user data collection** and localhost companion IPC
- [ ] Lists permissions at high level (matches [PRIVACY.md](../PRIVACY.md))
- [ ] Contact method for privacy questions (email or GitHub issues)
- [ ] URL entered identically in Chrome and Edge dashboards

---

## After hosting

Update these files with the live URL:

- [store/CHROME_WEB_STORE.md](./CHROME_WEB_STORE.md) — Privacy policy URL field
- [store/EDGE_ADDONS.md](./EDGE_ADDONS.md) — Privacy policy URL field
- Extension store listing (developer dashboards)

**Placeholder until live:**

```
PRIVACY_POLICY_URL=https://YOUR_HOSTED_URL/privacy
```

Store in maintainer notes; do not commit secrets.
