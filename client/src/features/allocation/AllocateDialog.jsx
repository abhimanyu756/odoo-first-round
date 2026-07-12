import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { AlertTriangle, ArrowLeftRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/input';
import { Field } from '@/components/ui/label';
import { Spinner } from '@/components/ui/feedback';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { useToast } from '@/components/ui/toast';
import { api, apiError } from '@/lib/api';
import { useAssets } from '@/features/assets/api';
import { useEmployees, useDepartments } from '@/features/organization/api';
import { useAllocationMutations } from './api';

export function AllocateDialog({ presetAssetId, onClose }) {
  const { data: assets } = useAssets({});
  const { data: employees } = useEmployees({ status: 'ACTIVE' });
  const { data: departments } = useDepartments({ status: 'ACTIVE' });
  const { allocate, createTransfer } = useAllocationMutations();
  const toast = useToast();

  // When allocation is blocked, we capture the conflict to offer a transfer.
  const [conflict, setConflict] = useState(null);
  const [target, setTarget] = useState('user'); // user | department

  const { register, handleSubmit, watch, formState: { errors } } = useForm({
    defaultValues: { assetId: presetAssetId || '', toUserId: '', toDepartmentId: '', expectedReturnDate: '', reason: '' },
  });

  const assetId = watch('assetId');
  const pending = allocate.isPending || createTransfer.isPending;

  async function onAllocate(values) {
    setConflict(null);
    const body = {
      assetId: values.assetId,
      toUserId: target === 'user' ? values.toUserId || null : null,
      toDepartmentId: target === 'department' ? values.toDepartmentId || null : null,
      expectedReturnDate: values.expectedReturnDate || null,
    };
    try {
      await allocate.mutateAsync(body);
      toast.success('Asset allocated');
      onClose();
    } catch (err) {
      const details = err?.response?.data?.details;
      if (err?.response?.status === 409 && details?.code === 'ALREADY_ALLOCATED') {
        setConflict(details);
      } else {
        toast.error(apiError(err));
      }
    }
  }

  async function onRequestTransfer(values) {
    try {
      await createTransfer.mutateAsync({
        assetId: values.assetId,
        toUserId: target === 'user' ? values.toUserId || null : null,
        toDepartmentId: target === 'department' ? values.toDepartmentId || null : null,
        reason: values.reason || null,
      });
      toast.success('Transfer request submitted');
      onClose();
    } catch (err) {
      toast.error(apiError(err));
    }
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{conflict ? 'Request Transfer' : 'Allocate Asset'}</DialogTitle>
          <DialogDescription>
            {conflict
              ? 'This asset is already held. Submit a transfer request instead.'
              : 'Assign an asset to an employee or department.'}
          </DialogDescription>
        </DialogHeader>

        {conflict && (
          <div className="mb-4 flex items-start gap-2 rounded-md border border-danger/40 bg-danger/10 px-3 py-2.5 text-sm text-danger">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <span>
              <strong>{conflict.assetTag}</strong> is currently held by{' '}
              <strong>{conflict.currentHolder?.name || conflict.currentDepartment?.name || 'someone'}</strong>.
              Direct re-allocation is blocked.
            </span>
          </div>
        )}

        <form onSubmit={handleSubmit(conflict ? onRequestTransfer : onAllocate)} className="space-y-4">
          <Field label="Asset" error={errors.assetId?.message}>
            <Select {...register('assetId', { required: 'Select an asset' })} disabled={!!conflict || !!presetAssetId}>
              <option value="">— Select asset —</option>
              {(assets || []).map((a) => (
                <option key={a.id} value={a.id}>
                  {a.assetTag} — {a.name} ({a.status})
                </option>
              ))}
            </Select>
          </Field>

          <div>
            <div className="mb-1.5 flex gap-2">
              <button
                type="button"
                onClick={() => setTarget('user')}
                className={`rounded-md px-3 py-1 text-xs ${target === 'user' ? 'bg-primary/15 text-primary-hover' : 'text-fg-muted hover:bg-surface-2'}`}
              >
                Employee
              </button>
              <button
                type="button"
                onClick={() => setTarget('department')}
                className={`rounded-md px-3 py-1 text-xs ${target === 'department' ? 'bg-primary/15 text-primary-hover' : 'text-fg-muted hover:bg-surface-2'}`}
              >
                Department
              </button>
            </div>
            {target === 'user' ? (
              <Field error={errors.toUserId?.message}>
                <Select {...register('toUserId', { required: target === 'user' ? 'Choose an employee' : false })}>
                  <option value="">— Select employee —</option>
                  {(employees || []).map((e) => (
                    <option key={e.id} value={e.id}>{e.name}</option>
                  ))}
                </Select>
              </Field>
            ) : (
              <Field>
                <Select {...register('toDepartmentId', { required: target === 'department' ? 'Choose a department' : false })}>
                  <option value="">— Select department —</option>
                  {(departments || []).map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </Select>
              </Field>
            )}
          </div>

          {!conflict ? (
            <Field label="Expected Return Date" hint="Optional">
              <Input type="date" {...register('expectedReturnDate')} />
            </Field>
          ) : (
            <Field label="Reason">
              <Input placeholder="Why do you need this asset?" {...register('reason')} />
            </Field>
          )}

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending} variant={conflict ? 'secondary' : 'default'}>
              {pending && <Spinner />}
              {conflict ? (<><ArrowLeftRight className="size-4" /> Submit Transfer Request</>) : 'Allocate'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
