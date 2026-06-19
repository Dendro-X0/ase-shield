/** Shared recovery wizard checklist labels (M7). */

export interface RecoveryChecklistItem {
  id: keyof RecoveryChecklistState;
  title: string;
  detail: string;
  link?: string;
}

export interface RecoveryChecklistState {
  rotatePasswords: boolean;
  revokeOauth: boolean;
  verifyPayout: boolean;
  reviewedExtensions: boolean;
  reviewedStartup: boolean;
}

export const DEFAULT_RECOVERY_CHECKLIST: RecoveryChecklistState = {
  rotatePasswords: false,
  revokeOauth: false,
  verifyPayout: false,
  reviewedExtensions: false,
  reviewedStartup: false,
};

export const RECOVERY_CHECKLIST_ITEMS: RecoveryChecklistItem[] = [
  {
    id: 'rotatePasswords',
    title: 'Rotate important passwords',
    detail:
      'Change passwords for email, freelance platforms, and banking — especially if you typed them during a suspicious call.',
    link: 'https://passwords.google.com',
  },
  {
    id: 'revokeOauth',
    title: 'Revoke unknown OAuth sessions',
    detail:
      'Sign out of unfamiliar devices and remove apps connected to Google, Microsoft, LinkedIn, and your freelance accounts.',
    link: 'https://myaccount.google.com/permissions',
  },
  {
    id: 'verifyPayout',
    title: 'Verify payout details',
    detail:
      'Confirm wire, PayPal, and platform payout settings match what you expect — scammers often change these.',
  },
  {
    id: 'reviewedExtensions',
    title: 'Review browser extensions',
    detail: 'Remove extensions you did not install yourself (see exposure scan below).',
  },
  {
    id: 'reviewedStartup',
    title: 'Review startup & scheduled tasks',
    detail: 'Undo unfamiliar entries flagged in the exposure scan.',
  },
];

export const RECOVERY_WIZARD_STEPS = [
  'Welcome',
  'Secure accounts',
  'Exposure scan',
  'Undo changes',
  'Export report',
] as const;

export type RecoveryWizardStep = (typeof RECOVERY_WIZARD_STEPS)[number];

export interface BrowserExtensionSnapshotEntry {
  id: string;
  name: string;
  version?: string;
  enabled: boolean;
  installType?: string;
}

export interface ExtensionSnapshotPayload {
  extensions: BrowserExtensionSnapshotEntry[];
}
