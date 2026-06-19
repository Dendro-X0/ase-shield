import type { AnalysisRequest } from '@ase/core';

type FixtureCase = {
  id: string;
  ruleId: string;
  request: AnalysisRequest;
  expectMatch: boolean;
  expectLevel?: 'safe' | 'caution' | 'high-risk';
};

const baseContext = { platform: 'unknown' as const };

export const FIXTURES: FixtureCase[] = [
  // R01
  {
    id: 'F-R01-a',
    ruleId: 'R01',
    request: {
      kind: 'message',
      text: 'Great portfolio! Let us move to Telegram to discuss the contract faster.',
      context: { platform: 'upwork' },
    },
    expectMatch: true,
    expectLevel: 'caution',
  },
  {
    id: 'F-R01-b',
    ruleId: 'R01',
    request: {
      kind: 'message',
      text: 'Thanks for the update. I attached the revised milestone notes here on Upwork.',
      context: { platform: 'upwork' },
    },
    expectMatch: false,
    expectLevel: 'safe',
  },
  // R02
  {
    id: 'F-R02-a',
    ruleId: 'R02',
    request: {
      kind: 'message',
      text: 'This is urgent — you must complete verification within 24 hours or lose the project.',
      context: baseContext,
    },
    expectMatch: true,
  },
  // R03
  {
    id: 'F-R03-a',
    ruleId: 'R03',
    request: {
      kind: 'message',
      text: 'Please verify your account using the link below and enter your password to view the brief.',
      context: baseContext,
    },
    expectMatch: true,
    expectLevel: 'high-risk',
  },
  // R04
  {
    id: 'F-R04-a',
    ruleId: 'R04',
    request: {
      kind: 'message',
      text: 'For the pair programming interview, please install AnyDesk so we can share screens.',
      context: { platform: 'linkedin' },
    },
    expectMatch: true,
    expectLevel: 'high-risk',
  },
  // R05
  {
    id: 'F-R05-a',
    ruleId: 'R05',
    request: {
      kind: 'message',
      text: 'We pay freelancers via USDT only. Send your wallet address to receive the milestone.',
      context: baseContext,
    },
    expectMatch: true,
    expectLevel: 'high-risk',
  },
  // R06
  {
    id: 'F-R06-a',
    ruleId: 'R06',
    request: {
      kind: 'message',
      text: 'We overpaid your invoice by $2,000. Please refund the difference via wire today.',
      context: baseContext,
    },
    expectMatch: true,
    expectLevel: 'high-risk',
  },
  // R07
  {
    id: 'F-R07-a',
    ruleId: 'R07',
    request: {
      kind: 'message',
      text: 'Use our secure payment portal instead of Upwork escrow for faster onboarding.',
      context: { platform: 'upwork' },
    },
    expectMatch: true,
    expectLevel: 'high-risk',
  },
  // R08
  {
    id: 'F-R08-a',
    ruleId: 'R08',
    request: {
      kind: 'message',
      text: 'Before we hire you, clone this repository and run npm install to complete the skills test.',
      context: { platform: 'linkedin' },
    },
    expectMatch: true,
    expectLevel: 'high-risk',
  },
  // R09
  {
    id: 'F-R09-a',
    ruleId: 'R09',
    request: {
      kind: 'link',
      url: 'https://linkedln-login.com/signin',
      context: baseContext,
    },
    expectMatch: true,
    expectLevel: 'high-risk',
  },
  {
    id: 'F-R09-b',
    ruleId: 'R09',
    request: {
      kind: 'link',
      url: 'https://www.linkedin.com/in/example',
      context: baseContext,
    },
    expectMatch: false,
  },
  // R10
  {
    id: 'F-T1-a',
    ruleId: 'R10',
    request: {
      kind: 'file-metadata',
      file: { name: 'brief.pdf.exe', size: 1024 },
      context: baseContext,
    },
    expectMatch: true,
    expectLevel: 'high-risk',
  },
  // R11
  {
    id: 'F-T1-b',
    ruleId: 'R11',
    request: {
      kind: 'file-metadata',
      file: { name: 'contract.docm', size: 2048 },
      context: baseContext,
    },
    expectMatch: true,
    expectLevel: 'caution',
  },
  // R12
  {
    id: 'F-S3-a',
    ruleId: 'R12',
    request: {
      kind: 'link',
      url: 'https://linkedin-auth-verify.net/oauth/authorize?client_id=fake',
      context: baseContext,
    },
    expectMatch: true,
    expectLevel: 'high-risk',
  },
  {
    id: 'F-S3-b',
    ruleId: 'R12',
    request: {
      kind: 'link',
      url: 'https://accounts.google.com/o/oauth2/v2/auth?client_id=real',
      context: baseContext,
    },
    expectMatch: false,
  },
];

/** Benign multi-signal negative control */
export const BENIGN_FIXTURE: AnalysisRequest = {
  kind: 'message',
  text: 'Thanks for submitting the milestone. I left feedback on Upwork. No rush on the next draft.',
  context: { platform: 'upwork', senderLabel: 'Verified Client Co.' },
};
