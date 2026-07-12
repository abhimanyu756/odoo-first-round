import { useForm } from 'react-hook-form';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/input';
import { Field } from '@/components/ui/label';
import { Spinner } from '@/components/ui/feedback';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useToast } from '@/components/ui/toast';
import { apiError } from '@/lib/api';
import { useDepartments, useEmployees } from '@/features/organization/api';
import { useAuditMutations } from './api';

export function CreateAuditDialog({ onClose }) {
  const { create } = useAuditMutations();
  const { data: departments } = useDepartments({ status: 'ACTIVE' });
  const { data: employees } = useEmployees({ status: 'ACTIVE' });
  const toast = useToast();
  const [auditorIds, setAuditorIds] = useState([]);

  const { register, handleSubmit, watch, formState: { errors } } = useForm({
    defaultValues: { name: '', scopeType: 'DEPARTMENT', scopeDepartmentId: '', scopeLocation: '', startDate: '', endDate: '' },
  });
  const scopeType = watch('scopeType');

  function toggleAuditor(id) {
    setAuditorIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function onSubmit(values) {
    if (auditorIds.length === 0) {
      toast.error('Assign at least one auditor');
      return;
    }
    try {
      await create.mutateAsync({
        name: values.name,
        scopeType: values.scopeType,
        scopeDepartmentId: values.scopeType === 'DEPARTMENT' ? values.scopeDepartmentId : null,
        scopeLocation: values.scopeType === 'LOCATION' ? values.scopeLocation : null,
        startDate: values.startDate,
        endDate: values.endDate,
        auditorIds,
      });
      toast.success('Audit cycle created');
      onClose();
    } catch (err) {
      toast.error(apiError(err));
    }
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Audit Cycle</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Field label="Name" error={errors.name?.message}>
            <Input placeholder="e.g. Q3 Audit — Engineering" {...register('name', { required: 'Name is required' })} />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Scope">
              <Select {...register('scopeType')}>
                <option value="DEPARTMENT">Department</option>
                <option value="LOCATION">Location</option>
              </Select>
            </Field>
            {scopeType === 'DEPARTMENT' ? (
              <Field label="Department" error={errors.scopeDepartmentId?.message}>
                <Select {...register('scopeDepartmentId', { required: scopeType === 'DEPARTMENT' })}>
                  <option value="">— Select —</option>
                  {(departments || []).map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </Select>
              </Field>
            ) : (
              <Field label="Location">
                <Input placeholder="e.g. HQ Floor 2" {...register('scopeLocation', { required: scopeType === 'LOCATION' })} />
              </Field>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Start date" error={errors.startDate?.message}>
              <Input type="date" {...register('startDate', { required: 'Required' })} />
            </Field>
            <Field label="End date" error={errors.endDate?.message}>
              <Input type="date" {...register('endDate', { required: 'Required' })} />
            </Field>
          </div>

          <div>
            <p className="mb-1.5 text-sm font-medium text-fg-muted">Auditors ({auditorIds.length} selected)</p>
            <div className="max-h-40 space-y-1 overflow-y-auto rounded-md border border-border p-2">
              {(employees || []).map((e) => (
                <label key={e.id} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-surface-2">
                  <input type="checkbox" checked={auditorIds.includes(e.id)} onChange={() => toggleAuditor(e.id)} />
                  {e.name} <span className="text-fg-subtle">· {e.email}</span>
                </label>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={create.isPending}>
              {create.isPending && <Spinner />}
              Create cycle
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
