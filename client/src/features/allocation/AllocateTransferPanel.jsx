import { useState } from 'react';
import { AlertTriangle, ArrowLeftRight, PackageCheck, Ban } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Select, Textarea } from '@/components/ui/input';
import { Field } from '@/components/ui/label';
import { Spinner } from '@/components/ui/feedback';
import { AssetStatusBadge, AllocationStatusBadge } from '@/components/StatusBadge';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table';
import { useToast } from '@/components/ui/toast';
import { apiError } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { useAssets, useAssetProfile } from '@/features/assets/api';
import { useEmployees, useDepartments } from '@/features/organization/api';
import { useAllocationMutations } from './api';

export function AllocateTransferPanel() {
  const [assetId, setAssetId] = useState('');
  const { data: assets } = useAssets({});
  const { data: profile, isLoading } = useAssetProfile(assetId);

  const asset = profile?.asset;
  const isAllocated = asset?.status === 'ALLOCATED';
  const canAllocate = asset && ['AVAILABLE', 'RESERVED'].includes(asset.status);

  return (
    <Card className="p-5">
      {/* Asset selector */}
      <Field label="Asset">
        <Select value={assetId} onChange={(e) => setAssetId(e.target.value)}>
          <option value="">— Select an asset —</option>
          {(assets || []).map((a) => (
            <option key={a.id} value={a.id}>
              {a.assetTag} — {a.name} ({a.status})
            </option>
          ))}
        </Select>
      </Field>

      {!assetId ? (
        <p className="mt-6 text-center text-sm text-fg-muted">
          Select an asset to allocate it or request a transfer.
        </p>
      ) : isLoading || !asset ? (
        <div className="mt-6 flex justify-center"><Spinner className="size-5" /></div>
      ) : (
        <div className="mt-4 space-y-5">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-accent">{asset.assetTag}</span>
            <span className="font-medium text-fg">{asset.name}</span>
            <AssetStatusBadge status={asset.status} />
          </div>

          {isAllocated && (
            <AlreadyAllocated asset={asset} onDone={() => {}} />
          )}

          {canAllocate && <AllocateForm asset={asset} />}

          {!isAllocated && !canAllocate && (
            <div className="flex items-center gap-2 rounded-md border border-warning/40 bg-warning/10 px-3 py-2.5 text-sm text-warning">
              <Ban className="size-4" />
              This asset is {asset.status.replace('_', ' ').toLowerCase()} and can’t be allocated right now.
            </div>
          )}

          {/* Allocation history */}
          <div>
            <h4 className="mb-2 text-sm font-medium text-fg">Allocation history</h4>
            {profile.allocations.length === 0 ? (
              <p className="text-sm text-fg-subtle">No allocation history for this asset.</p>
            ) : (
              <div className="rounded-lg border border-border">
                <Table>
                  <THead>
                    <TR>
                      <TH>Held By</TH><TH>By</TH><TH>Allocated</TH><TH>Returned</TH><TH>Status</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {profile.allocations.map((a) => (
                      <TR key={a.id}>
                        <TD>{a.toUser?.name || a.toDepartment?.name || '—'}</TD>
                        <TD className="text-fg-muted">{a.allocatedBy?.name}</TD>
                        <TD className="text-fg-muted">{formatDate(a.allocatedAt)}</TD>
                        <TD className="text-fg-muted">{formatDate(a.returnedAt)}</TD>
                        <TD><AllocationStatusBadge status={a.status} /></TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              </div>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}

// Available asset → allocate form.
function AllocateForm({ asset }) {
  const { allocate } = useAllocationMutations();
  const { data: employees } = useEmployees({ status: 'ACTIVE' });
  const { data: departments } = useDepartments({ status: 'ACTIVE' });
  const toast = useToast();
  const [target, setTarget] = useState('user');
  const [toUserId, setToUserId] = useState('');
  const [toDepartmentId, setToDepartmentId] = useState('');
  const [expectedReturnDate, setExpectedReturnDate] = useState('');

  async function submit() {
    try {
      await allocate.mutateAsync({
        assetId: asset.id,
        toUserId: target === 'user' ? toUserId || null : null,
        toDepartmentId: target === 'department' ? toDepartmentId || null : null,
        expectedReturnDate: expectedReturnDate || null,
      });
      toast.success(`${asset.assetTag} allocated`);
      setToUserId(''); setToDepartmentId(''); setExpectedReturnDate('');
    } catch (err) {
      toast.error(apiError(err));
    }
  }

  const disabled = allocate.isPending || (target === 'user' ? !toUserId : !toDepartmentId);

  return (
    <div className="rounded-lg border border-border bg-surface-2 p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-medium text-fg">
        <PackageCheck className="size-4 text-success" /> Allocate this asset
      </div>
      <div className="mb-3 flex gap-2">
        {['user', 'department'].map((t) => (
          <button key={t} onClick={() => setTarget(t)}
            className={`rounded-md px-3 py-1 text-xs ${target === t ? 'bg-primary/15 text-primary-hover' : 'text-fg-muted hover:bg-elevated'}`}>
            {t === 'user' ? 'Employee' : 'Department'}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {target === 'user' ? (
          <Field label="To employee">
            <Select value={toUserId} onChange={(e) => setToUserId(e.target.value)}>
              <option value="">— Select —</option>
              {(employees || []).map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
            </Select>
          </Field>
        ) : (
          <Field label="To department">
            <Select value={toDepartmentId} onChange={(e) => setToDepartmentId(e.target.value)}>
              <option value="">— Select —</option>
              {(departments || []).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </Select>
          </Field>
        )}
        <Field label="Expected return date" hint="Optional">
          <Input type="date" value={expectedReturnDate} onChange={(e) => setExpectedReturnDate(e.target.value)} />
        </Field>
      </div>
      <Button className="mt-3" onClick={submit} disabled={disabled}>
        {allocate.isPending && <Spinner />} Allocate
      </Button>
    </div>
  );
}

// Already-allocated asset → red block + transfer request form (Screen 5).
function AlreadyAllocated({ asset }) {
  const { createTransfer } = useAllocationMutations();
  const { data: employees } = useEmployees({ status: 'ACTIVE' });
  const toast = useToast();
  const [toUserId, setToUserId] = useState('');
  const [reason, setReason] = useState('');

  const holderName = asset.currentHolder?.name || asset.currentDepartment?.name || 'someone';
  const holderCtx = asset.currentDepartment?.name ? ` (${asset.currentDepartment.name})` : '';

  async function submit() {
    try {
      await createTransfer.mutateAsync({ assetId: asset.id, toUserId: toUserId || null, reason: reason || null });
      toast.success('Transfer request submitted');
      setToUserId(''); setReason('');
    } catch (err) {
      toast.error(apiError(err));
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-start gap-2 rounded-md border border-danger/40 bg-danger/10 px-3 py-2.5 text-sm text-danger">
        <AlertTriangle className="mt-0.5 size-4 shrink-0" />
        <span>
          Already allocated to <strong>{holderName}</strong>{holderCtx}.<br />
          Direct re-allocation is blocked — submit a transfer request below.
        </span>
      </div>

      <div className="rounded-lg border border-border bg-surface-2 p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-medium text-fg">
          <ArrowLeftRight className="size-4" /> Transfer Request
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="From">
            <Input value={holderName} disabled />
          </Field>
          <Field label="To">
            <Select value={toUserId} onChange={(e) => setToUserId(e.target.value)}>
              <option value="">Select employee…</option>
              {(employees || []).filter((e) => e.id !== asset.currentHolder?.id).map((e) => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label="Reason" className="mt-3">
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why is this transfer needed?" />
        </Field>
        <Button className="mt-3" onClick={submit} disabled={createTransfer.isPending || !toUserId}>
          {createTransfer.isPending && <Spinner />} Submit Request
        </Button>
      </div>
    </div>
  );
}
