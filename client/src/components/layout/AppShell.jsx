import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { NAV_ITEMS } from './nav';
import { cn } from '@/lib/utils';

function titleForPath(pathname) {
  if (pathname === '/') return 'Dashboard';
  const match = NAV_ITEMS.find((i) => i.to !== '/' && pathname.startsWith(i.to));
  return match?.label || 'AssetFlow';
}

export function AppShell() {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const title = titleForPath(location.pathname);

  return (
    <div className="flex h-svh overflow-hidden bg-bg">
      {/* Desktop sidebar */}
      <div className="hidden md:flex">
        <Sidebar />
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <div className="relative z-10 h-full w-60">
            <Sidebar onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar title={title} onMenu={() => setMobileOpen(true)} />
        <main className={cn('flex-1 overflow-y-auto p-4 md:p-6')}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
