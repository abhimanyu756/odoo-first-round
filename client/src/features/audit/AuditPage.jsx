import { useState } from 'react';
import { Plus, ClipboardCheck } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/feedback';
import { RoleGate } from '@/components/auth/guards';
import { formatDate } from '@/lib/utils';
import { useAuditCycles } from './api';
import { CreateAuditDialog } from './CreateAuditDialog';
import { AuditDetailDialog } from './AuditDetailDialog';

export default function AuditPage() {
  const { data: cycles, isLoading, isError, refetch } = useAuditCycles();
  const [creating, setCreating] = useState(false);
  const [viewing, setViewing] = useState(null);

  return (
    <div>
      <PageHeader
        title="Asset Audit"
        description="Run structured verification cycles and catch discrepancies."
        actions={
          <RoleGate roles={['ADMIN']}>
            <Button onClick={() => setCreating(true)}>
              <Plus /> New Audit Cycle
            </Button>
          </RoleGate>
        }
      />

      {isLoading ? (
        <LoadingState />
      ) : isError ? (
        <ErrorState onRetry={refetch} />
      ) : cycles.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface">
          <EmptyState icon={ClipboardCheck} title="No audit cycles yet" description="Create a cycle to verify assets in a department or location." />
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-surface">
          <Table>
            <THead>
              <TR>
                <TH>Cycle</TH>
                <TH>Scope</TH>
                <TH>Period</TH>
                <TH>Auditors</TH>
                <TH>Assets</TH>
                <TH>Status</TH>
              </TR>
            </THead>
            <TBody>
              {cycles.map((c) => (
                <TR key={c.id} className="cursor-pointer" onClick={() => setViewing(c.id)}>
                  <TD className="font-medium">{c.name}</TD>
                  <TD className="text-fg-muted">
                    {c.scopeType === 'DEPARTMENT' ? c.scopeDepartment?.name : c.scopeLocation}
                  </TD>
                  <TD className="text-fg-muted">{formatDate(c.startDate)} – {formatDate(c.endDate)}</TD>
                  <TD className="text-fg-muted">{c.assignments.map((a) => a.auditor.name).join(', ')}</TD>
                  <TD>{c._count.items}</TD>
                  <TD>
                    <Badge tone={c.status === 'OPEN' ? 'success' : 'neutral'}>
                      {c.status === 'OPEN' ? 'Open' : 'Closed'}
                    </Badge>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </div>
      )}

      {creating && <CreateAuditDialog onClose={() => setCreating(false)} />}
      {viewing && <AuditDetailDialog cycleId={viewing} onClose={() => setViewing(null)} />}
    </div>
  );
}
