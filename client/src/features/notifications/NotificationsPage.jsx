import {
  Bell,
  CheckCheck,
  PackageCheck,
  Wrench,
  CalendarClock,
  ArrowLeftRight,
  AlertTriangle,
  ClipboardCheck,
  ShieldCheck,
  Activity,
} from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table';
import { LoadingState, EmptyState } from '@/components/ui/feedback';
import { RoleGate } from '@/components/auth/guards';
import { useState } from 'react';
import { cn, timeAgo, formatDateTime } from '@/lib/utils';
import { useNotifications, useNotificationMutations, useActivityLog } from './api';

// Group notification types into the filter chips from the mockup.
const CATEGORIES = {
  Alerts: ['OVERDUE_RETURN', 'MAINTENANCE_REJECTED', 'TRANSFER_REJECTED', 'BOOKING_REMINDER', 'AUDIT_DISCREPANCY'],
  Approvals: ['MAINTENANCE_APPROVED', 'MAINTENANCE_ASSIGNED', 'MAINTENANCE_RESOLVED', 'TRANSFER_APPROVED', 'ROLE_CHANGED', 'ASSET_ASSIGNED'],
  Bookings: ['BOOKING_CONFIRMED', 'BOOKING_CANCELLED', 'BOOKING_REMINDER'],
};
const FILTERS = ['All', 'Alerts', 'Approvals', 'Bookings'];

const ICONS = {
  ASSET_ASSIGNED: PackageCheck,
  MAINTENANCE_APPROVED: Wrench,
  MAINTENANCE_REJECTED: Wrench,
  MAINTENANCE_ASSIGNED: Wrench,
  MAINTENANCE_RESOLVED: Wrench,
  BOOKING_CONFIRMED: CalendarClock,
  BOOKING_CANCELLED: CalendarClock,
  BOOKING_REMINDER: CalendarClock,
  TRANSFER_APPROVED: ArrowLeftRight,
  TRANSFER_REJECTED: ArrowLeftRight,
  OVERDUE_RETURN: AlertTriangle,
  AUDIT_ASSIGNED: ClipboardCheck,
  ROLE_CHANGED: ShieldCheck,
};

const TONES = {
  OVERDUE_RETURN: 'text-danger',
  MAINTENANCE_REJECTED: 'text-danger',
  TRANSFER_REJECTED: 'text-danger',
  BOOKING_REMINDER: 'text-warning',
};

export default function NotificationsPage() {
  return (
    <div>
      <PageHeader title="Notifications & Activity" description="Stay informed without digging for updates." />
      <Tabs defaultValue="notifications">
        <TabsList>
          <TabsTrigger value="notifications">
            <Bell className="size-4" /> Notifications
          </TabsTrigger>
          <RoleGate roles={['ADMIN', 'ASSET_MANAGER', 'DEPARTMENT_HEAD']}>
            <TabsTrigger value="activity">
              <Activity className="size-4" /> Activity Log
            </TabsTrigger>
          </RoleGate>
        </TabsList>

        <TabsContent value="notifications">
          <NotificationList />
        </TabsContent>
        <TabsContent value="activity">
          <ActivityLog />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function NotificationList() {
  const { data, isLoading } = useNotifications();
  const { markRead, markAllRead } = useNotificationMutations();
  const [filter, setFilter] = useState('All');

  if (isLoading) return <LoadingState />;

  const filtered =
    filter === 'All' ? data : data.filter((n) => CATEGORIES[filter]?.includes(n.type));
  const hasUnread = data.some((n) => !n.isRead);

  return (
    <Card className="p-2">
      <div className="flex flex-wrap items-center justify-between gap-2 px-2 py-2">
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                filter === f
                  ? 'border-primary/40 bg-primary/15 text-primary-hover'
                  : 'border-border text-fg-muted hover:bg-surface-2'
              )}
            >
              {f}
            </button>
          ))}
        </div>
        {hasUnread && (
          <Button variant="ghost" size="sm" onClick={() => markAllRead.mutate()}>
            <CheckCheck className="size-4" /> Mark all read
          </Button>
        )}
      </div>
      {filtered.length === 0 ? (
        <EmptyState icon={Bell} title="No notifications" description={filter === 'All' ? "You're all caught up." : `No ${filter.toLowerCase()} notifications.`} />
      ) : (
        <div className="space-y-1">
          {filtered.map((n) => {
            const Icon = ICONS[n.type] || Bell;
            return (
              <button
                key={n.id}
                onClick={() => !n.isRead && markRead.mutate(n.id)}
                className={cn(
                  'flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-surface-2',
                  !n.isRead && 'bg-surface-2/60'
                )}
              >
                <Icon className={cn('mt-0.5 size-4 shrink-0', TONES[n.type] || 'text-fg-muted')} />
                <div className="flex-1">
                  <p className="text-sm font-medium text-fg">{n.title}</p>
                  {n.message && <p className="text-xs text-fg-muted">{n.message}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <span className="whitespace-nowrap text-xs text-fg-subtle">{timeAgo(n.createdAt)}</span>
                  {!n.isRead && <span className="size-2 rounded-full bg-primary" />}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </Card>
  );
}

function ActivityLog() {
  const { data, isLoading } = useActivityLog();
  if (isLoading) return <LoadingState />;

  return (
    <Card>
      {(!data || data.length === 0) ? (
        <EmptyState icon={Activity} title="No activity yet" description="Actions across the system will appear here." />
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>Action</TH>
              <TH>Entity</TH>
              <TH>Actor</TH>
              <TH>When</TH>
            </TR>
          </THead>
          <TBody>
            {data.map((log) => (
              <TR key={log.id}>
                <TD className="font-medium">{log.action.replaceAll('_', ' ').toLowerCase()}</TD>
                <TD className="text-fg-muted">
                  {log.entityType}
                  {log.metadata?.assetTag ? ` · ${log.metadata.assetTag}` : ''}
                  {log.metadata?.name ? ` · ${log.metadata.name}` : ''}
                </TD>
                <TD className="text-fg-muted">{log.actor?.name || 'System'}</TD>
                <TD className="text-fg-subtle">{formatDateTime(log.createdAt)}</TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
    </Card>
  );
}
