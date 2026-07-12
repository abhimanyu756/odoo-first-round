import { CheckCircle2, XCircle, AlertTriangle, Lock, FileWarning } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table';
import { LoadingState, Spinner } from '@/components/ui/feedback';
import { VerificationBadge } from '@/components/StatusBadge';
import { RoleGate } from '@/components/auth/guards';
import { useToast } from '@/components/ui/toast';
import { apiError } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { useAuditCycle, useAuditMutations } from './api';

function StatTile({ label, value, tone }) {
  return (
    <div className="rounded-lg border border-border bg-surface-2 p-3 text-center">
      <p className={`text-2xl font-semibold ${tone}`}>{value}</p>
      <p className="text-xs text-fg-muted">{label}</p>
    </div>
  );
}

export function AuditDetailDialog({ cycleId, onClose }) {
  const { data, isLoading } = useAuditCycle(cycleId);
  const { verifyItem, close } = useAuditMutations();
  const toast = useToast();

  async function mark(itemId, verificationStatus) {
    try {
      await verifyItem.mutateAsync({ cycleId, itemId, verificationStatus });
    } catch (err) {
      toast.error(apiError(err));
    }
  }

  async function closeCycle() {
    try {
      await close.mutateAsync(cycleId);
      toast.success('Audit cycle closed');
    } catch (err) {
      toast.error(apiError(err));
    }
  }

  const isClosed = data?.cycle?.status === 'CLOSED';

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-4xl">
        {isLoading || !data ? (
          <LoadingState />
        ) : (
          <>
            <DialogHeader>
              <div className="flex items-start justify-between gap-4 pr-8">
                <div>
                  <DialogTitle className="flex items-center gap-2">
                    {data.cycle.name}
                    <Badge tone={isClosed ? 'neutral' : 'success'}>{isClosed ? 'Closed' : 'Open'}</Badge>
                  </DialogTitle>
                  <DialogDescription>
                    Scope: {data.cycle.scopeDepartment?.name || data.cycle.scopeLocation} ·{' '}
                    {formatDate(data.cycle.startDate)} – {formatDate(data.cycle.endDate)} · Auditors:{' '}
                    {data.cycle.assignments.map((a) => a.auditor.name).join(', ')}
                  </DialogDescription>
                </div>
                {!isClosed && (
                  <RoleGate roles={['ADMIN']}>
                    <Button size="sm" variant="danger" onClick={closeCycle} disabled={close.isPending}>
                      {close.isPending ? <Spinner /> : <Lock className="size-4" />} Close Cycle
                    </Button>
                  </RoleGate>
                )}
              </div>
            </DialogHeader>

            {/* Summary tiles */}
            <div className="grid grid-cols-5 gap-2">
              <StatTile label="Total" value={data.summary.total} tone="text-fg" />
              <StatTile label="Verified" value={data.summary.verified} tone="text-success" />
              <StatTile label="Missing" value={data.summary.missing} tone="text-danger" />
              <StatTile label="Damaged" value={data.summary.damaged} tone="text-warning" />
              <StatTile label="Pending" value={data.summary.pending} tone="text-fg-muted" />
            </div>

            {/* Discrepancy report */}
            {data.discrepancies.length > 0 && (
              <div className="flex items-center gap-2 rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-warning">
                <FileWarning className="size-4" />
                {data.discrepancies.length} asset(s) flagged — discrepancy report generated automatically.
                {isClosed && ' Confirmed-missing assets were marked Lost.'}
              </div>
            )}

            {/* Checklist */}
            <div className="max-h-[45vh] overflow-y-auto rounded-lg border border-border">
              <Table>
                <THead>
                  <TR>
                    <TH>Asset</TH>
                    <TH>Location</TH>
                    <TH>Verification</TH>
                    <TH>By</TH>
                    {!isClosed && <TH className="text-right">Mark</TH>}
                  </TR>
                </THead>
                <TBody>
                  {data.cycle.items.map((item) => (
                    <TR key={item.id}>
                      <TD>
                        <span className="font-mono text-xs text-accent">{item.asset.assetTag}</span>{' '}
                        <span className="font-medium">{item.asset.name}</span>
                      </TD>
                      <TD className="text-fg-muted">{item.asset.location || '—'}</TD>
                      <TD><VerificationBadge status={item.verificationStatus} /></TD>
                      <TD className="text-fg-muted">{item.verifiedBy?.name || '—'}</TD>
                      {!isClosed && (
                        <TD>
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" title="Verified" onClick={() => mark(item.id, 'VERIFIED')}>
                              <CheckCircle2 className="size-4 text-success" />
                            </Button>
                            <Button variant="ghost" size="icon" title="Missing" onClick={() => mark(item.id, 'MISSING')}>
                              <XCircle className="size-4 text-danger" />
                            </Button>
                            <Button variant="ghost" size="icon" title="Damaged" onClick={() => mark(item.id, 'DAMAGED')}>
                              <AlertTriangle className="size-4 text-warning" />
                            </Button>
                          </div>
                        </TD>
                      )}
                    </TR>
                  ))}
                </TBody>
              </Table>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
