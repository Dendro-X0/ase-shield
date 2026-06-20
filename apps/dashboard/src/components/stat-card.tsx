import { AlertCircle, CheckCircle2, Circle } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: 'good' | 'warn' | 'neutral';
}) {
  const Icon = tone === 'good' ? CheckCircle2 : tone === 'warn' ? AlertCircle : Circle;

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{label}</p>
            <p className="text-2xl font-semibold tracking-tight">{value}</p>
          </div>
          <Icon
            className={cn(
              'size-5 shrink-0',
              tone === 'good' && 'text-emerald-500',
              tone === 'warn' && 'text-amber-500',
              tone === 'neutral' && 'text-muted-foreground',
            )}
            aria-hidden="true"
          />
        </div>
      </CardContent>
    </Card>
  );
}
