import { useState } from 'react';
import {
  PackageCheck,
  Boxes,
  Wrench,
  CalendarClock,
  ArrowLeftRight,
  Undo2,
  AlertTriangle,
  Plus,
  BookMarked,
} from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { KpiCard } from '@/components/KpiCard';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/feedback';
import { RoleGate } from '@/components/auth/guards';
import { formatDate, timeAgo } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { useDashboard } from './api';
import { AssetFormDialog } from '@/features/assets/AssetFormDialog';
import { AllocateDialog } from '@/features/allocation/AllocateDialog';
import { RaiseMaintenanceDialog } from '@/features/maintenance/RaiseMaintenanceDialog';

export default function DashboardPage() {
  const { data, isLoading, isError, refetch } = useDashboard();
  const { user } = useAuth();
  const [dialog, setDialog] = useState(null); // 'register' | 'allocate' | 'maintenance'

  if (isLoading) return <LoadingState label="Loading dashboard…" />;
  if (isError) return <ErrorState onRetry={refetch} />;

  const k = data.kpis;

  return (
    <div>
      <PageHeader
        title={`Welcome back, ${user?.name?.split(' ')[0] || ''}`}
        description="Here's your operational snapshot."
        actions={
          <div className="flex gap-2">
            <RoleGate roles={['ADMIN', 'ASSET_MANAGER']}>
              <Button variant="outline" onClick={() => setDialog('register')}>
                <Plus /> Register Asset
              </Button>
            </RoleGate>
            <Button variant="outline" onClick={() => setDialog('maintenance')}>
              <Wrench className="size-4" /> Raise Request
            </Button>
          </div>
        }
      />

      {/* KPI grid */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <KpiCard label="Available" value={k.assetsAvailable} icon={PackageCheck} tone="success" />
        <KpiCard label="Allocated" value={k.assetsAllocated} icon={Boxes} tone="info" />
        <KpiCard label="Maintenance Today" value={k.maintenanceToday} icon={Wrench} tone="warning" />
        <KpiCard label="Active Bookings" value={k.activeBookings} icon={CalendarClock} tone="accent" />
        <KpiCard label="Pending Transfers" value={k.pendingTransfers} icon={ArrowLeftRight} tone="default" />
        <KpiCard label="Upcoming Returns" value={k.upcomingReturns} icon={Undo2} tone="default" />
      </div>

      {/* Overdue banner */}
      {data.overdue.length > 0 && (
        <div className="mt-4 rounded-xl border border-danger/40 bg-danger/10 p-4">
          <div className="mb-2 flex items-center gap-2 text-danger">
            <AlertTriangle className="size-4" />
            <span className="font-medium">{data.overdue.length} asset(s) overdue for return — flagged for follow-up</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {data.overdue.slice(0, 6).map((a) => (
              <span key={a.id} className="rounded-md border border-danger/30 bg-surface px-2.5 py-1 text-xs text-fg-muted">
                <span className="font-mono text-accent">{a.asset.assetTag}</span> · {a.toUser?.name || a.toDepartment?.name} · due {formatDate(a.expectedReturnDate)}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Recent activity */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {data.recentActivity.length === 0 ? (
              <EmptyState title="No activity yet" description="Actions will show up here." />
            ) : (
              <div className="space-y-2">
                {data.recentActivity.map((log) => (
                  <div key={log.id} className="flex items-center justify-between border-b border-border py-2 text-sm last:border-0">
                    <span className="text-fg">
                      <span className="font-medium">{log.action.replaceAll('_', ' ').toLowerCase()}</span>
                      {log.metadata?.assetTag && <span className="text-fg-muted"> · {log.metadata.assetTag}</span>}
                      {log.metadata?.name && <span className="text-fg-muted"> · {log.metadata.name}</span>}
                    </span>
                    <span className="text-xs text-fg-subtle">
                      {log.actor?.name ? `${log.actor.name} · ` : ''}{timeAgo(log.createdAt)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming returns */}
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Returns</CardTitle>
          </CardHeader>
          <CardContent>
            {data.upcoming.length === 0 ? (
              <p className="py-6 text-center text-sm text-fg-muted">No returns due this week.</p>
            ) : (
              <div className="space-y-2">
                {data.upcoming.map((a) => (
                  <div key={a.id} className="flex items-center justify-between rounded-md border border-border bg-surface-2 px-3 py-2 text-sm">
                    <span>
                      <span className="font-mono text-xs text-accent">{a.asset.assetTag}</span>{' '}
                      <span className="text-fg-muted">{a.toUser?.name || a.toDepartment?.name}</span>
                    </span>
                    <span className="text-xs text-fg-subtle">{formatDate(a.expectedReturnDate)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick actions row */}
      <RoleGate roles={['ADMIN', 'ASSET_MANAGER', 'DEPARTMENT_HEAD']}>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button onClick={() => setDialog('allocate')}>
            <BookMarked className="size-4" /> Allocate Asset
          </Button>
        </div>
      </RoleGate>

      {dialog === 'register' && <AssetFormDialog onClose={() => setDialog(null)} />}
      {dialog === 'allocate' && <AllocateDialog onClose={() => setDialog(null)} />}
      {dialog === 'maintenance' && <RaiseMaintenanceDialog onClose={() => setDialog(null)} />}
    </div>
  );
}
