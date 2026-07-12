import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Plus, Pencil, Ban, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/input';
import { Field } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table';
import { LoadingState, ErrorState, EmptyState, Spinner } from '@/components/ui/feedback';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useToast } from '@/components/ui/toast';
import { apiError } from '@/lib/api';
import { useDepartments, useDepartmentMutations, useEmployees } from './api';

export function DepartmentsTab() {
  const { data: departments, isLoading, isError, refetch } = useDepartments();
  const [editing, setEditing] = useState(null); // dept | 'new' | null
  const [deactivating, setDeactivating] = useState(null);
  const { deactivate } = useDepartmentMutations();
  const toast = useToast();

  async function confirmDeactivate() {
    try {
      await deactivate.mutateAsync(deactivating.id);
      toast.success(`${deactivating.name} deactivated`);
      setDeactivating(null);
    } catch (err) {
      toast.error(apiError(err));
    }
  }

  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState onRetry={refetch} />;

  return (
    <div>
      <div className="mb-3 flex justify-end">
        <Button size="sm" onClick={() => setEditing('new')}>
          <Plus /> Add Department
        </Button>
      </div>

      {departments.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No departments yet"
          description="Create your first department to start organizing assets and people."
        />
      ) : (
        <div className="rounded-lg border border-border">
          <Table>
            <THead>
              <TR>
                <TH>Department</TH>
                <TH>Head</TH>
                <TH>Parent</TH>
                <TH>Members</TH>
                <TH>Assets</TH>
                <TH>Status</TH>
                <TH className="text-right">Actions</TH>
              </TR>
            </THead>
            <TBody>
              {departments.map((d) => (
                <TR key={d.id}>
                  <TD className="font-medium">{d.name}</TD>
                  <TD className="text-fg-muted">{d.head?.name || '—'}</TD>
                  <TD className="text-fg-muted">{d.parentDepartment?.name || '—'}</TD>
                  <TD>{d._count.members}</TD>
                  <TD>{d._count.assets}</TD>
                  <TD>
                    <Badge tone={d.status === 'ACTIVE' ? 'success' : 'neutral'}>
                      {d.status === 'ACTIVE' ? 'Active' : 'Inactive'}
                    </Badge>
                  </TD>
                  <TD>
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => setEditing(d)}>
                        <Pencil className="size-4" />
                      </Button>
                      {d.status === 'ACTIVE' && (
                        <Button variant="ghost" size="icon" onClick={() => setDeactivating(d)}>
                          <Ban className="size-4" />
                        </Button>
                      )}
                    </div>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </div>
      )}

      {editing && (
        <DepartmentDialog
          department={editing === 'new' ? null : editing}
          departments={departments}
          onClose={() => setEditing(null)}
        />
      )}

      <ConfirmDialog
        open={!!deactivating}
        onOpenChange={(v) => !v && setDeactivating(null)}
        onConfirm={confirmDeactivate}
        loading={deactivate.isPending}
        title={`Deactivate ${deactivating?.name}?`}
        description="The department will be marked inactive. Existing records are preserved."
        confirmLabel="Deactivate"
      />
    </div>
  );
}

function DepartmentDialog({ department, departments, onClose }) {
  const isEdit = !!department;
  const { create, update } = useDepartmentMutations();
  const { data: employees } = useEmployees();
  const toast = useToast();

  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: {
      name: department?.name || '',
      headId: department?.head?.id || '',
      parentDepartmentId: department?.parentDepartment?.id || '',
      status: department?.status || 'ACTIVE',
    },
  });

  const pending = create.isPending || update.isPending;

  async function onSubmit(values) {
    const payload = {
      name: values.name,
      headId: values.headId || null,
      parentDepartmentId: values.parentDepartmentId || null,
      status: values.status,
    };
    try {
      if (isEdit) {
        await update.mutateAsync({ id: department.id, ...payload });
        toast.success('Department updated');
      } else {
        await create.mutateAsync(payload);
        toast.success('Department created');
      }
      onClose();
    } catch (err) {
      toast.error(apiError(err));
    }
  }

  const parentOptions = (departments || []).filter((d) => d.id !== department?.id);

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Department' : 'New Department'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Field label="Name" error={errors.name?.message}>
            <Input
              placeholder="e.g. Engineering"
              {...register('name', { required: 'Name is required', minLength: { value: 2, message: 'Too short' } })}
            />
          </Field>
          <Field label="Department Head">
            <Select {...register('headId')}>
              <option value="">— None —</option>
              {(employees || []).map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name} ({e.email})
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Parent Department" hint="Optional — for department hierarchy">
            <Select {...register('parentDepartmentId')}>
              <option value="">— None —</option>
              {parentOptions.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Status">
            <Select {...register('status')}>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </Select>
          </Field>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending && <Spinner />}
              {isEdit ? 'Save changes' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
