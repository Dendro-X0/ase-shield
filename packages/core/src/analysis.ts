export type Platform =
  | 'gmail'
  | 'linkedin'
  | 'upwork'
  | 'fiverr'
  | 'whatsapp'
  | 'telegram'
  | 'unknown';

export type AnalysisKind = 'message' | 'page' | 'link' | 'file-metadata';

export type RiskLevel = 'safe' | 'caution' | 'high-risk';

export type RuleSeverity = 'low' | 'medium' | 'high';

export interface AnalysisContext {
  /** Primary surface where content was observed (gmail, linkedin, marketplace, etc.). */
  platform: Platform;
  threadId?: string;
  senderLabel?: string;
  /** Extra sender hints extracted locally (display names, handles, email local-parts). */
  senderHints?: string[];
}

export interface FileMetadata {
  name: string;
  size: number;
  sha256?: string;
  mime?: string;
}

export interface AnalysisRequest {
  kind: AnalysisKind;
  text?: string;
  url?: string;
  file?: FileMetadata;
  context: AnalysisContext;
}

export interface RuleHit {
  ruleId: string;
  title: string;
  why: string;
  whatToDo: string;
  severity: RuleSeverity;
}

export interface AnalysisResult {
  level: RiskLevel;
  hits: RuleHit[];
  analyzedAt: string;
}
