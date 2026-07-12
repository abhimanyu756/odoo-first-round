import { NavLink } from 'react-router-dom';
import { Boxes } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { NAV_ITEMS } from './nav';

export function Sidebar({ onNavigate }) {
  const { user } = useAuth();
  const items = NAV_ITEMS.filter((i) => !i.roles || i.roles.includes(user?.role));

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col border-r border-border bg-surface">
      <div className="flex h-14 items-center gap-2 px-5 border-b border-border">
        <div className="grid size-8 place-items-center rounded-lg bg-primary text-primary-fg">
          <Boxes className="size-5" />
        </div>
        <span className="text-lg font-semibold tracking-tight text-fg">AssetFlow</span>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={onNavigate}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary/10 text-primary-hover'
                    : 'text-fg-muted hover:bg-surface-2 hover:text-fg'
                )
              }
            >
              <Icon className="size-4 shrink-0" />
              {item.label}
            </NavLink>
          );
        })}
      </nav>

      <div className="border-t border-border p-3 text-xs text-fg-subtle">
        AssetFlow ERP · v1.0
      </div>
    </aside>
  );
}
