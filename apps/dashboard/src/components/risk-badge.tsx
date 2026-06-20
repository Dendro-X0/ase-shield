import type { RiskLevel } from '@ase/core';

import { Badge, type BadgeProps } from '@/components/ui/badge';

const LEVEL_VARIANT: Record<RiskLevel, BadgeProps['variant']> = {
  safe: 'success',
  caution: 'warning',
  'high-risk': 'destructive',
};

export function RiskBadge({ level }: { level: RiskLevel }) {
  return <Badge variant={LEVEL_VARIANT[level]}>{level}</Badge>;
}
