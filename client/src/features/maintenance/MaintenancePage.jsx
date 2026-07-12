import { useState } from 'react';
import { Plus, Check, X, UserCog, Play, CheckCircle2 } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { LoadingState, ErrorState, Spinner } from '@/components/ui/feedback';
import { PriorityBadge } from '@/components/StatusBadge';
import { useRole } from '@/components/auth/guards';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Select, Textarea } from '@/components/ui/input';
import { Field } from '@/components/ui/label';
import { useToast } from '@/components/ui/toast';
import { apiError } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { MAINTENANCE_COLUMNS, MAINTENANCE_STATUS } from '@/lib/constants';
import { useEmployees } from '@/features/organization/api';
import { useMaintenance, useMaintenanceMutations } from './api';
import { RaiseMaintenanceDialog } from './RaiseMaintenanceDialog';

const COLUMN_ACCENT = {
  PENDING: 'border-t-fg-subtle',
  APPROVED: 'border-t-info',
  TECHNICIAN_ASSIGNED: 'border-t-accent',
  IN_PROGRESS: 'border-t-warning',
  RESOLVED: 'border-t-success',
};

export default function MaintenancePage() {
  const { data: requests, isLoading, isError, refetch } = useMaintenance();
  const [raising, setRaising] = useState(false);
  const [assigning, setAssigning] = useState(null);
  const [resolving, setResolving] = useState(null);
  const { transition } = useMaintenanceMutations();
  const { isManager } = useRole();
  const toast = useToast();

  async function act(id, action, extra = {}) {
    try {
      await transition.mutateAsync({ id, action, ...extra });
      toast.success(`Request ${action.toLowerCase()}d`);
    } catch (err) {
      toast.error(apiError(err));
    }
  }

  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState onRetry={refetch} />;

  const byStatus = (s) => requests.filter((r) => r.status === s);

  return (
    <div>
      <PageHeader
        title="Maintenance"
        description="Route repairs through approval before work starts."
        actions={
          <Button onClick={() => setRaising(true)}>
            <Plus /> Raise Request
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
        {MAINTENANCE_COLUMNS.map((status) => {
          const items = byStatus(status);
          return (
            <div key={status} className={`rounded-lg border border-border border-t-2 bg-surface ${COLUMN_ACCENT[status]}`}>
              <div className="flex items-center justify-between px-3 py-2.5">
                <span className="text-sm font-semibold text-fg">{MAINTENANCE_STATUS[status]}</span>
                <span className="rounded-full bg-surface-2 px-2 text-xs text-fg-muted">{items.length}</span>
              </div>
              <div className="space-y-2 p-2 pt-0">
                {items.length === 0 && (
                  <p className="py-6 text-center text-xs text-fg-subtle">No items</p>
                )}
                {items.map((r) => (
                  <div key={r.id} className="rounded-md border border-border bg-surface-2 p-3">
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <span className="font-mono text-xs text-accent">{r.asset.assetTag}</span>
                      <PriorityBadge priority={r.priority} />
                    </div>
                    <p className="text-sm font-medium text-fg">{r.asset.name}</p>
                    <p className="mt-0.5 line-clamp-2 text-xs text-fg-muted">{r.description}</p>
                    {r.photoUrl && (
                      <a href={r.photoUrl} target="_blank" rel="noreferrer">
                        <img src={r.photoUrl} alt="issue" className="mt-2 h-20 w-full rounded-md border border-border object-cover hover:opacity-80" />
                      </a>
                    )}
                    <p className="mt-2 text-[11px] text-fg-subtle">
                      by {r.raisedBy?.name} · {formatDate(r.createdAt)}
                    </p>
                    {r.technician && (
                      <p className="text-[11px] text-fg-subtle">tech: {r.technician.name}</p>
                    )}

                    {/* Contextual actions per column (managers only) */}
                    {isManager && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {status === 'PENDING' && (
                          <>
                            <Button size="sm" variant="outline" onClick={() => act(r.id, 'APPROVE')} disabled={transition.isPending}>
                              <Check className="size-3.5" /> Approve
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => act(r.id, 'REJECT')} disabled={transition.isPending}>
                              <X className="size-3.5" /> Reject
                            </Button>
                          </>
                        )}
                        {status === 'APPROVED' && (
                          <Button size="sm" variant="outline" onClick={() => setAssigning(r)}>
                            <UserCog className="size-3.5" /> Assign
                          </Button>
                        )}
                        {status === 'TECHNICIAN_ASSIGNED' && (
                          <Button size="sm" variant="outline" onClick={() => act(r.id, 'START')} disabled={transition.isPending}>
                            <Play className="size-3.5" /> Start
                          </Button>
                        )}
                        {status === 'IN_PROGRESS' && (
                          <Button size="sm" variant="outline" onClick={() => setResolving(r)}>
                            <CheckCircle2 className="size-3.5" /> Resolve
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-3 text-xs text-fg-subtle">
        Approving a card moves the asset to Under Maintenance; resolving returns it to Available.
      </p>

      {raising && <RaiseMaintenanceDialog onClose={() => setRaising(false)} />}
      {assigning && (
        <AssignDialog
          request={assigning}
          onClose={() => setAssigning(null)}
          onAssign={(technicianId) => act(assigning.id, 'ASSIGN', { technicianId }).then(() => setAssigning(null))}
          pending={transition.isPending}
        />
      )}
      {resolving && (
        <ResolveDialog
          request={resolving}
          onClose={() => setResolving(null)}
          onResolve={(resolutionNotes) => act(resolving.id, 'RESOLVE', { resolutionNotes }).then(() => setResolving(null))}
          pending={transition.isPending}
        />
      )}
    </div>
  );
}

function AssignDialog({ request, onClose, onAssign, pending }) {
  const { data: employees } = useEmployees({ status: 'ACTIVE' });
  const [technicianId, setTechnicianId] = useState('');
  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Assign Technician — {request.asset.assetTag}</DialogTitle>
        </DialogHeader>
        <Field label="Technician">
          <Select value={technicianId} onChange={(e) => setTechnicianId(e.target.value)}>
            <option value="">— Select —</option>
            {(employees || []).map((e) => (
              <option key={e.id} value={e.id}>{e.name}</option>
            ))}
          </Select>
        </Field>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onAssign(technicianId)} disabled={!technicianId || pending}>
            {pending && <Spinner />} Assign
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ResolveDialog({ request, onClose, onResolve, pending }) {
  const [notes, setNotes] = useState('');
  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Resolve — {request.asset.assetTag}</DialogTitle>
        </DialogHeader>
        <Field label="Resolution notes" hint="Optional">
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="What was done?" />
        </Field>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onResolve(notes)} disabled={pending}>
            {pending && <Spinner />} Mark resolved
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
