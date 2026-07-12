import { useState } from 'react';
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
import { cn, timeAgo, formatDateTime } from '@/lib/utils';
import { useNotifications, useNotificationMutations, useActivityLog } from './api';

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

  if (isLoading) return <LoadingState />;

  const hasUnread = data.some((n) => !n.isRead);

  return (
    <Card className="p-2">
      <div className="flex items-center justify-between px-2 py-2">
        <span className="text-sm text-fg-muted">{data.length} notifications</span>
        {hasUnread && (
          <Button variant="ghost" size="sm" onClick={() => markAllRead.mutate()}>
            <CheckCheck className="size-4" /> Mark all read
          </Button>
        )}
      </div>
      {data.length === 0 ? (
        <EmptyState icon={Bell} title="No notifications" description="You're all caught up." />
      ) : (
        <div className="space-y-1">
          {data.map((n) => {
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
