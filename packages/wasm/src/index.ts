export interface StaticScanResult {
  level: 'safe' | 'caution' | 'high-risk';
  findings: string[];
}

/** Placeholder until Rust/WASM static analysis ships (M4+). */
export function stubStaticScan(_filename: string): StaticScanResult {
  return { level: 'safe', findings: [] };
}
