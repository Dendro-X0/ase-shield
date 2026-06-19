export type ThreadStage = 'normal' | 'off-platform' | 'payment' | 'technical';

export interface TimelineInsight {
  stages: ThreadStage[];
  escalationLabel: string;
  chunkStages: ThreadStage[];
}

const OFF_PLATFORM_MARKERS = [
  'telegram',
  'whatsapp',
  'off platform',
  'off-platform',
  'personal email',
  'discord',
  'signal',
];

const PAYMENT_MARKERS = [
  'payment',
  'wire',
  'usdt',
  'bitcoin',
  'crypto',
  'escrow',
  'overpaid',
  'refund',
  'invoice',
  'bank transfer',
  'gift card',
];

const TECHNICAL_MARKERS = [
  'anydesk',
  'teamviewer',
  'install',
  'download our',
  'npm install',
  'clone',
  'repository',
  'remote desktop',
  'run this repo',
  'macro',
  '.exe',
];

const STAGE_LABELS: Record<ThreadStage, string> = {
  normal: 'normal chat',
  'off-platform': 'off-platform shift',
  payment: 'payment pressure',
  technical: 'install / remote access',
};

export function detectChunkStage(text: string): ThreadStage {
  const lower = text.toLowerCase();

  if (TECHNICAL_MARKERS.some((m) => lower.includes(m))) return 'technical';
  if (PAYMENT_MARKERS.some((m) => lower.includes(m))) return 'payment';
  if (OFF_PLATFORM_MARKERS.some((m) => lower.includes(m))) return 'off-platform';

  return 'normal';
}

export function buildTimelineInsight(chunks: string[]): TimelineInsight {
  const chunkStages = chunks.map((chunk) => detectChunkStage(chunk));
  const orderedUnique: ThreadStage[] = [];

  for (const stage of chunkStages) {
    if (stage === 'normal') continue;
    if (!orderedUnique.includes(stage)) orderedUnique.push(stage);
  }

  const stages: ThreadStage[] =
    orderedUnique.length > 0 ? orderedUnique : ['normal'];
  const escalationStages: ThreadStage[] = [
    'normal',
    ...stages.filter((s): s is Exclude<ThreadStage, 'normal'> => s !== 'normal'),
  ];
  const escalationLabel =
    stages.length === 1 && stages[0] === 'normal'
      ? 'No escalation pattern detected'
      : escalationStages.map((s) => STAGE_LABELS[s]).join(' → ');

  return { stages, escalationLabel, chunkStages };
}

const ORG_SUFFIX = /\b(inc|llc|ltd|corp|corporation|company|co\.|group|studio|agency)\b/i;
const EMAIL_PATTERN = /[a-z0-9._%+-]+@([a-z0-9.-]+\.[a-z]{2,})/gi;

export function checkContactConsistency(senderHints: string[], text = ''): string[] {
  const warnings: string[] = [];
  const combined = [...senderHints, text].join('\n');

  const emails = [...combined.matchAll(EMAIL_PATTERN)].map((m) => m[0].toLowerCase());
  const domains = [...new Set(emails.map((e) => e.split('@')[1]).filter(Boolean))];

  const orgLike = senderHints.filter((hint) => ORG_SUFFIX.test(hint) || /^[A-Z][a-z]+ [A-Z]/.test(hint));

  if (orgLike.length >= 2) {
    const unique = new Set(orgLike.map((o) => o.toLowerCase().trim()));
    if (unique.size >= 2) {
      warnings.push('Multiple organization names appear in this thread — verify the client is who they claim.');
    }
  }

  if (domains.length >= 2) {
    const corporate = domains.filter(
      (d) => !['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com', 'proton.me'].includes(d),
    );
    if (corporate.length >= 2) {
      warnings.push('Different business email domains in one thread — common in impersonation scams.');
    }
  }

  const freeEmail = domains.some((d) =>
    ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com'].includes(d),
  );
  if (freeEmail && orgLike.length > 0) {
    warnings.push('Personal email paired with a company name — confirm identity on the official platform.');
  }

  return warnings;
}
