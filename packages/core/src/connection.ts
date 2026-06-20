import { DASHBOARD_URL } from './dashboard.js';

/** Companion not reachable from the dashboard or extension. */
export const COMPANION_OFFLINE_STEPS = [
  'Confirm Anti-SE Companion is running in the Windows system tray.',
  `Open the dashboard at ${DASHBOARD_URL} — if the page does not load, restart the companion.`,
  'If Windows Firewall prompted you, allow Anti-SE Companion on private networks.',
] as const;

/** Extension installed but not linked to the companion. */
export const EXTENSION_DISCONNECTED_STEPS = [
  'Install the Anti-SE Shield extension and pin it in your browser toolbar.',
  'Open the extension popup and click Check now — status should show Connected within a few seconds.',
  'Keep the companion running while you use the extension.',
] as const;

/** @deprecated Use COMPANION_OFFLINE_STEPS or EXTENSION_DISCONNECTED_STEPS. */
export const CONNECTION_TROUBLESHOOTING = [
  COMPANION_OFFLINE_STEPS[0],
  COMPANION_OFFLINE_STEPS[1],
  'In the extension popup, click Check now — status should show Connected within a few seconds.',
  COMPANION_OFFLINE_STEPS[2],
] as const;

export type ConnectionIssueKind = 'companion-offline' | 'extension-disconnected';

export function connectionTroubleshootingSteps(kind: ConnectionIssueKind): readonly string[] {
  return kind === 'companion-offline' ? COMPANION_OFFLINE_STEPS : EXTENSION_DISCONNECTED_STEPS;
}
