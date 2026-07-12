import { useState } from 'react';
import { ArrowLeftRight, RotateCcw, Check, X, PackageOpen, SquarePlus } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { AllocateTransferPanel } from './AllocateTransferPanel';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table';
import { LoadingState, ErrorState, EmptyState, Spinner } from '@/components/ui/feedback';
import { Badge } from '@/components/ui/badge';
import { AllocationStatusBadge, TransferStatusBadge } from '@/components/StatusBadge';
import { RoleGate, useRole } from '@/components/auth/guards';
import { useToast } from '@/components/ui/toast';
import { apiError } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { useAllocations, useTransfers, useAllocationMutations } from './api';
import { ReturnDialog } from './ReturnDialog';

// Transfer approvers (Dept Head is dept-scoped on the backend).
const MANAGERS = ['ADMIN', 'ASSET_MANAGER', 'DEPARTMENT_HEAD'];
// Only the Asset Manager / Admin directly allocate and approve returns.
const ALLOCATORS = ['ADMIN', 'ASSET_MANAGER'];

export default function AllocationPage() {
  const [returning, setReturning] = useState(null);
  const { isAdmin, isAssetManager } = useRole();
  const canAllocate = isAdmin || isAssetManager;

  return (
    <div>
      <PageHeader
        title="Allocation & Transfer"
        description="Manage who holds what, with conflict handling."
      />

      <Tabs defaultValue={canAllocate ? 'allocate' : 'active'}>
        <TabsList>
          {canAllocate && (
            <TabsTrigger value="allocate">
              <SquarePlus className="size-4" /> Allocate / Transfer
            </TabsTrigger>
          )}
          <TabsTrigger value="active">Active Allocations</TabsTrigger>
          <TabsTrigger value="transfers">
            <ArrowLeftRight className="size-4" /> Transfers
          </TabsTrigger>
        </TabsList>

        {canAllocate && (
          <TabsContent value="allocate">
            <AllocateTransferPanel />
          </TabsContent>
        )}
        <TabsContent value="active">
          <AllocationsTable onReturn={setReturning} />
        </TabsContent>
        <TabsContent value="transfers">
          <TransfersTable />
        </TabsContent>
      </Tabs>

      {returning && <ReturnDialog allocation={returning} onClose={() => setReturning(null)} />}
    </div>
  );
}

function AllocationsTable({ onReturn }) {
  const { data, isLoading, isError, refetch } = useAllocations({ status: 'ACTIVE' });

  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState onRetry={refetch} />;
  if (data.length === 0)
    return (
      <div className="rounded-xl border border-border bg-surface">
        <EmptyState icon={PackageOpen} title="No active allocations" description="Allocate an asset to get started." />
      </div>
    );

  return (
    <div className="rounded-xl border border-border bg-surface">
      <Table>
        <THead>
          <TR>
            <TH>Asset</TH>
            <TH>Held By</TH>
            <TH>Allocated By</TH>
            <TH>Allocated</TH>
            <TH>Expected Return</TH>
            <TH>Status</TH>
            <TH className="text-right">Actions</TH>
          </TR>
        </THead>
        <TBody>
          {data.map((a) => {
            const overdue = a.expectedReturnDate && new Date(a.expectedReturnDate) < new Date();
            return (
              <TR key={a.id}>
                <TD>
                  <span className="font-mono text-xs text-accent">{a.asset.assetTag}</span>{' '}
                  <span className="font-medium">{a.asset.name}</span>
                </TD>
                <TD>{a.toUser?.name || a.toDepartment?.name || '—'}</TD>
                <TD className="text-fg-muted">{a.allocatedBy?.name}</TD>
                <TD className="text-fg-muted">{formatDate(a.allocatedAt)}</TD>
                <TD className={overdue ? 'text-danger font-medium' : 'text-fg-muted'}>
                  {formatDate(a.expectedReturnDate)}
                </TD>
                <TD><AllocationStatusBadge status={overdue ? 'OVERDUE' : a.status} /></TD>
                <TD>
                  <div className="flex justify-end">
                    <RoleGate roles={ALLOCATORS}>
                      <Button variant="outline" size="sm" onClick={() => onReturn(a)}>
                        <RotateCcw className="size-4" /> Return
                      </Button>
                    </RoleGate>
                  </div>
                </TD>
              </TR>
            );
          })}
        </TBody>
      </Table>
    </div>
  );
}

function TransfersTable() {
  const { data, isLoading, isError, refetch } = useTransfers();
  const { decideTransfer } = useAllocationMutations();
  const toast = useToast();
  const [actingId, setActingId] = useState(null);

  async function decide(id, decision) {
    setActingId(id + decision);
    try {
      await decideTransfer.mutateAsync({ id, decision });
      toast.success(decision === 'APPROVE' ? 'Transfer approved & re-allocated' : 'Transfer rejected');
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setActingId(null);
    }
  }

  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState onRetry={refetch} />;
  if (data.length === 0)
    return (
      <div className="rounded-xl border border-border bg-surface">
        <EmptyState icon={ArrowLeftRight} title="No transfer requests" description="Transfer requests appear here for approval." />
      </div>
    );

  return (
    <div className="rounded-xl border border-border bg-surface">
      <Table>
        <THead>
          <TR>
            <TH>Asset</TH>
            <TH>From</TH>
            <TH>To</TH>
            <TH>Requested By</TH>
            <TH>Reason</TH>
            <TH>Status</TH>
            <TH className="text-right">Actions</TH>
          </TR>
        </THead>
        <TBody>
          {data.map((t) => (
            <TR key={t.id}>
              <TD>
                <span className="font-mono text-xs text-accent">{t.asset.assetTag}</span>{' '}
                <span className="font-medium">{t.asset.name}</span>
              </TD>
              <TD className="text-fg-muted">{t.fromUser?.name || '—'}</TD>
              <TD>{t.toUser?.name || t.toDepartment?.name || '—'}</TD>
              <TD className="text-fg-muted">{t.requestedBy?.name}</TD>
              <TD className="max-w-xs truncate text-fg-muted">{t.reason || '—'}</TD>
              <TD><TransferStatusBadge status={t.status} /></TD>
              <TD>
                <div className="flex justify-end gap-1">
                  {t.status === 'REQUESTED' ? (
                    <RoleGate roles={MANAGERS} fallback={<Badge tone="warning">Pending</Badge>}>
                      <Button variant="outline" size="sm" onClick={() => decide(t.id, 'APPROVE')} disabled={!!actingId}>
                        {actingId === t.id + 'APPROVE' ? <Spinner /> : <Check className="size-4" />} Approve
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => decide(t.id, 'REJECT')} disabled={!!actingId}>
                        <X className="size-4" /> Reject
                      </Button>
                    </RoleGate>
                  ) : (
                    <span className="text-xs text-fg-subtle">{t.approvedBy?.name ? `by ${t.approvedBy.name}` : '—'}</span>
                  )}
                </div>
              </TD>
            </TR>
          ))}
        </TBody>
      </Table>
    </div>
  );
}
