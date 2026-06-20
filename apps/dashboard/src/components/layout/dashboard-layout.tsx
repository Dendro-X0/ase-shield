import type { ReactNode } from 'react';

import { AppSidebar } from '@/components/layout/app-sidebar';
import { MobileNav } from '@/components/layout/mobile-nav';
import { CompanionStatusProvider } from '@/context/companion-status';

export function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <CompanionStatusProvider>
      <div className="dark flex min-h-svh w-full bg-background">
        <div className="hidden md:block">
          <AppSidebar className="fixed inset-y-0 left-0 z-30" />
        </div>

        <div className="flex min-h-svh flex-1 flex-col md:pl-64">
          <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:hidden">
            <MobileNav />
            <div>
              <p className="text-sm font-semibold leading-none">Anti-SE Shield</p>
              <p className="text-xs text-muted-foreground">Local dashboard</p>
            </div>
          </header>

          <main className="flex-1 overflow-auto">
            <div className="mx-auto w-full max-w-6xl space-y-6 p-4 md:p-8">{children}</div>
          </main>
        </div>
      </div>
    </CompanionStatusProvider>
  );
}
