/** Canonical GitHub repository — update here only. */
export const GITHUB_REPO = 'https://github.com/Dendro-X0/ase-shield' as const;

/** GitHub Pages site (Settings → Pages → GitHub Actions). */
export const GITHUB_PAGES_BASE = 'https://dendro-x0.github.io/ase-shield' as const;

/** Current public beta release line. Bump with each GitHub Release tag. */
export const RELEASE_VERSION = '1.0.0-beta.2' as const;

export const GITHUB_RELEASES_URL = `${GITHUB_REPO}/releases` as const;

/** Latest release page — companion `.exe` and extension `.zip` assets after tagging. */
export const GITHUB_RELEASE_LATEST_URL = `${GITHUB_REPO}/releases/latest` as const;

/** CI workflow — nightly artifacts on `main` if no release tag yet. */
export const GITHUB_CI_URL = `${GITHUB_REPO}/actions/workflows/ci.yml` as const;

export const COMPANION_DOWNLOAD_URL = GITHUB_RELEASE_LATEST_URL;

/** Extension sideload zip on Releases (until Chrome Web Store / Edge listing is live). */
export const EXTENSION_DOWNLOAD_URL = GITHUB_RELEASE_LATEST_URL;

export const PRIVACY_POLICY_URL = `${GITHUB_PAGES_BASE}/privacy.html` as const;

export const GITHUB_ISSUES_URL = `${GITHUB_REPO}/issues` as const;
