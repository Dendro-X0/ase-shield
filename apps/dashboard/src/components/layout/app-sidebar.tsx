import { Activity, LayoutDashboard, Settings, Shield, ShieldCheck, ShieldOff } from 'lucide-react';
import { NavLink } from 'react-router-dom';

import { ConnectionIndicator } from '@/components/connection-indicator';
import { useCompanionStatus } from '@/context/companion-status';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

const NAV = [
  { to: '/', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/activity', label: 'Activity', icon: Activity },
  { to: '/quarantine', label: 'Quarantine', icon: ShieldOff },
  { to: '/protection', label: 'Protection', icon: Shield },
  { to: '/settings', label: 'Settings', icon: Settings },
] as const;

export function AppSidebar({ className }: { className?: string }) {
  const { extensionState, quarantineCount, summary, error, loading } = useCompanionStatus();
  const companionOnline = !error && !loading;

  return (
    <aside
      className={cn(
        'flex h-full w-64 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground',
        className,
      )}
    >
      <div className="flex h-14 items-center gap-3 border-b border-sidebar-border px-4">
        <div className="flex size-9 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
          <ShieldCheck className="size-5" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold leading-none">Anti-SE Shield</p>
          <p className="truncate text-xs text-muted-foreground">Local dashboard</p>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-1 p-3">
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={'end' in item ? item.end : false}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground',
              )
            }
          >
            <item.icon className="size-4 shrink-0 opacity-80" aria-hidden="true" />
            <span className="flex-1">{item.label}</span>
            {item.to === '/quarantine' && quarantineCount > 0 && (
              <Badge variant="secondary" className="h-5 min-w-5 justify-center px-1.5 text-xs">
                {quarantineCount}
              </Badge>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto p-4">
        <Separator className="mb-4 bg-sidebar-border" />
        <ConnectionIndicator
          state={extensionState}
          companionOnline={companionOnline}
          version={summary?.companionVersion}
        />
      </div>
    </aside>
  );
}

export { NAV };
