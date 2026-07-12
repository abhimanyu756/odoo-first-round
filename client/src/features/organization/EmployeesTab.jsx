import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Plus, Search, ShieldCheck, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/input';
import { Field } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table';
import { LoadingState, ErrorState, EmptyState, Spinner } from '@/components/ui/feedback';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { RoleBadge } from '@/components/StatusBadge';
import { useToast } from '@/components/ui/toast';
import { apiError } from '@/lib/api';
import { ROLES } from '@/lib/constants';
import { useEmployees, useEmployeeMutations, useDepartments } from './api';

export function EmployeesTab() {
  const [filters, setFilters] = useState({ search: '', role: '', status: '' });
  const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v));
  const { data: employees, isLoading, isError, refetch } = useEmployees(params);
  const [creating, setCreating] = useState(false);
  const [promoting, setPromoting] = useState(null);

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-fg-subtle" />
          <Input
            className="pl-8"
            placeholder="Search by name or email…"
            value={filters.search}
            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
          />
        </div>
        <Select
          className="w-44"
          value={filters.role}
          onChange={(e) => setFilters((f) => ({ ...f, role: e.target.value }))}
        >
          <option value="">All roles</option>
          {Object.entries(ROLES).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </Select>
        <Select
          className="w-36"
          value={filters.status}
          onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
        >
          <option value="">All status</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
        </Select>
        <Button size="sm" onClick={() => setCreating(true)}>
          <Plus /> Add Employee
        </Button>
      </div>

      {isLoading ? (
        <LoadingState />
      ) : isError ? (
        <ErrorState onRetry={refetch} />
      ) : employees.length === 0 ? (
        <EmptyState icon={Users} title="No employees found" description="Try adjusting your filters." />
      ) : (
        <div className="rounded-lg border border-border">
          <Table>
            <THead>
              <TR>
                <TH>Name</TH>
                <TH>Email</TH>
                <TH>Department</TH>
                <TH>Role</TH>
                <TH>Status</TH>
                <TH className="text-right">Actions</TH>
              </TR>
            </THead>
            <TBody>
              {employees.map((e) => (
                <TR key={e.id}>
                  <TD className="font-medium">{e.name}</TD>
                  <TD className="text-fg-muted">{e.email}</TD>
                  <TD className="text-fg-muted">{e.department?.name || '—'}</TD>
                  <TD>
                    <RoleBadge role={e.role} />
                  </TD>
                  <TD>
                    <Badge tone={e.status === 'ACTIVE' ? 'success' : 'neutral'}>
                      {e.status === 'ACTIVE' ? 'Active' : 'Inactive'}
                    </Badge>
                  </TD>
                  <TD>
                    <div className="flex justify-end">
                      <Button variant="outline" size="sm" onClick={() => setPromoting(e)}>
                        <ShieldCheck className="size-4" /> Role
                      </Button>
                    </div>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </div>
      )}

      {creating && <CreateEmployeeDialog onClose={() => setCreating(false)} />}
      {promoting && <RoleDialog employee={promoting} onClose={() => setPromoting(null)} />}
    </div>
  );
}

function CreateEmployeeDialog({ onClose }) {
  const { create } = useEmployeeMutations();
  const { data: departments } = useDepartments({ status: 'ACTIVE' });
  const toast = useToast();
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: { role: 'EMPLOYEE' },
  });

  async function onSubmit(values) {
    try {
      await create.mutateAsync({ ...values, departmentId: values.departmentId || null });
      toast.success('Employee created');
      onClose();
    } catch (err) {
      toast.error(apiError(err));
    }
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Employee</DialogTitle>
          <DialogDescription>Create an account directly from the directory.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Field label="Name" error={errors.name?.message}>
            <Input {...register('name', { required: 'Name is required' })} />
          </Field>
          <Field label="Email" error={errors.email?.message}>
            <Input type="email" {...register('email', { required: 'Email is required' })} />
          </Field>
          <Field label="Temporary Password" error={errors.password?.message}>
            <Input
              type="text"
              {...register('password', { required: 'Password is required', minLength: { value: 8, message: 'At least 8 characters' } })}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Department">
              <Select {...register('departmentId')}>
                <option value="">— None —</option>
                {(departments || []).map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Role">
              <Select {...register('role')}>
                {Object.entries(ROLES).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={create.isPending}>
              {create.isPending && <Spinner />}
              Create
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function RoleDialog({ employee, onClose }) {
  const { updateRole } = useEmployeeMutations();
  const [role, setRole] = useState(employee.role);
  const toast = useToast();

  async function save() {
    try {
      await updateRole.mutateAsync({ id: employee.id, role });
      toast.success(`${employee.name} is now ${ROLES[role]}`);
      onClose();
    } catch (err) {
      toast.error(apiError(err));
    }
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Assign Role</DialogTitle>
          <DialogDescription>
            This is the only place roles are assigned. Promote {employee.name} to a manager role or
            revert to employee.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          {Object.entries(ROLES).map(([k, v]) => (
            <label
              key={k}
              className="flex cursor-pointer items-center gap-3 rounded-md border border-border p-3 hover:bg-surface-2"
            >
              <input
                type="radio"
                name="role"
                value={k}
                checked={role === k}
                onChange={() => setRole(k)}
              />
              <RoleBadge role={k} />
              <span className="text-sm text-fg-muted">{v}</span>
            </label>
          ))}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} disabled={updateRole.isPending || role === employee.role}>
            {updateRole.isPending && <Spinner />}
            Save role
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
