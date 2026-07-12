import { useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { Bell, LogOut, Menu, ChevronDown } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { RoleBadge } from '@/components/StatusBadge';
import { cn } from '@/lib/utils';

export function Topbar({ title, onMenu }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const { data: unread = 0 } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: async () => {
      const { data } = await api.get('/notifications/unread-count');
      return data.count ?? 0;
    },
    refetchInterval: 30_000,
    retry: false,
  });

  const initials = (user?.name || '?')
    .split(' ')
    .map((s) => s[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  return (
    <header className="flex h-14 items-center justify-between gap-4 border-b border-border bg-surface px-4 md:px-6">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenu}
          className="rounded-md p-1.5 text-fg-muted hover:bg-surface-2 md:hidden"
        >
          <Menu className="size-5" />
        </button>
        <h1 className="text-base font-semibold text-fg">{title}</h1>
      </div>

      <div className="flex items-center gap-2">
        <Link
          to="/notifications"
          className="relative rounded-md p-2 text-fg-muted hover:bg-surface-2 hover:text-fg"
        >
          <Bell className="size-5" />
          {unread > 0 && (
            <span className="absolute right-1 top-1 grid min-w-4 place-items-center rounded-full bg-danger px-1 text-[10px] font-semibold text-white">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </Link>

        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-surface-2">
              <span className="grid size-8 place-items-center rounded-full bg-elevated text-xs font-semibold text-fg">
                {initials}
              </span>
              <span className="hidden text-left sm:block">
                <span className="block text-sm font-medium leading-tight text-fg">{user?.name}</span>
                <span className="block text-xs leading-tight text-fg-subtle">{user?.email}</span>
              </span>
              <ChevronDown className="size-4 text-fg-subtle" />
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              align="end"
              sideOffset={6}
              className="z-50 min-w-56 rounded-lg border border-border bg-elevated p-1.5 shadow-xl"
            >
              <div className="px-2.5 py-2">
                <p className="text-sm font-medium text-fg">{user?.name}</p>
                <p className="text-xs text-fg-subtle">{user?.department?.name || 'No department'}</p>
                <div className="mt-2">
                  <RoleBadge role={user?.role} />
                </div>
              </div>
              <DropdownMenu.Separator className="my-1 h-px bg-border" />
              <DropdownMenu.Item
                onSelect={handleLogout}
                className={cn(
                  'flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-sm text-fg-muted outline-none',
                  'hover:bg-surface-2 hover:text-danger focus:bg-surface-2'
                )}
              >
                <LogOut className="size-4" />
                Sign out
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>
    </header>
  );
}
