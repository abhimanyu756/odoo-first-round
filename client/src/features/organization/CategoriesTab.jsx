import { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { Plus, Pencil, Trash2, Tags, X } from 'lucide-react';
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
import { useCategories, useCategoryMutations } from './api';

export function CategoriesTab() {
  const { data: categories, isLoading, isError, refetch } = useCategories();
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const { remove } = useCategoryMutations();
  const toast = useToast();

  async function confirmDelete() {
    try {
      await remove.mutateAsync(deleting.id);
      toast.success(`${deleting.name} deleted`);
      setDeleting(null);
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
          <Plus /> Add Category
        </Button>
      </div>

      {categories.length === 0 ? (
        <EmptyState
          icon={Tags}
          title="No categories yet"
          description="Add categories like Electronics, Furniture, or Vehicles."
        />
      ) : (
        <div className="rounded-lg border border-border">
          <Table>
            <THead>
              <TR>
                <TH>Category</TH>
                <TH>Description</TH>
                <TH>Custom Fields</TH>
                <TH>Assets</TH>
                <TH className="text-right">Actions</TH>
              </TR>
            </THead>
            <TBody>
              {categories.map((c) => (
                <TR key={c.id}>
                  <TD className="font-medium">{c.name}</TD>
                  <TD className="text-fg-muted max-w-xs truncate">{c.description || '—'}</TD>
                  <TD>
                    <div className="flex flex-wrap gap-1">
                      {(c.customFields || []).length === 0 ? (
                        <span className="text-fg-subtle">—</span>
                      ) : (
                        c.customFields.map((f) => (
                          <Badge key={f.key} tone="accent">
                            {f.label}
                          </Badge>
                        ))
                      )}
                    </div>
                  </TD>
                  <TD>{c._count.assets}</TD>
                  <TD>
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => setEditing(c)}>
                        <Pencil className="size-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleting(c)}>
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </div>
      )}

      {editing && (
        <CategoryDialog
          category={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
        />
      )}

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(v) => !v && setDeleting(null)}
        onConfirm={confirmDelete}
        loading={remove.isPending}
        title={`Delete ${deleting?.name}?`}
        description="This permanently removes the category. Categories with assets cannot be deleted."
        confirmLabel="Delete"
      />
    </div>
  );
}

function CategoryDialog({ category, onClose }) {
  const isEdit = !!category;
  const { create, update } = useCategoryMutations();
  const toast = useToast();

  const { register, control, handleSubmit, formState: { errors } } = useForm({
    defaultValues: {
      name: category?.name || '',
      description: category?.description || '',
      customFields: category?.customFields || [],
    },
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'customFields' });
  const pending = create.isPending || update.isPending;

  async function onSubmit(values) {
    // Derive machine keys from labels for any field missing one.
    const customFields = (values.customFields || []).map((f) => ({
      key: f.key || f.label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, ''),
      label: f.label,
      type: f.type || 'text',
      required: !!f.required,
    }));
    const payload = { name: values.name, description: values.description || null, customFields };
    try {
      if (isEdit) {
        await update.mutateAsync({ id: category.id, ...payload });
        toast.success('Category updated');
      } else {
        await create.mutateAsync(payload);
        toast.success('Category created');
      }
      onClose();
    } catch (err) {
      toast.error(apiError(err));
    }
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Category' : 'New Category'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Field label="Name" error={errors.name?.message}>
            <Input placeholder="e.g. Electronics" {...register('name', { required: 'Name is required' })} />
          </Field>
          <Field label="Description">
            <Input placeholder="Optional description" {...register('description')} />
          </Field>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium text-fg-muted">Custom Fields</span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({ label: '', type: 'text', required: false })}
              >
                <Plus /> Add Field
              </Button>
            </div>
            {fields.length === 0 && (
              <p className="text-xs text-fg-subtle">
                e.g. a “Warranty (months)” number field for Electronics.
              </p>
            )}
            <div className="space-y-2">
              {fields.map((f, i) => (
                <div key={f.id} className="flex items-center gap-2">
                  <Input
                    className="flex-1"
                    placeholder="Field label"
                    {...register(`customFields.${i}.label`, { required: true })}
                  />
                  <Select className="w-28" {...register(`customFields.${i}.type`)}>
                    <option value="text">Text</option>
                    <option value="number">Number</option>
                    <option value="date">Date</option>
                    <option value="boolean">Yes/No</option>
                  </Select>
                  <label className="flex items-center gap-1 text-xs text-fg-muted">
                    <input type="checkbox" {...register(`customFields.${i}.required`)} />
                    Req
                  </label>
                  <Button type="button" variant="ghost" size="icon" onClick={() => remove(i)}>
                    <X className="size-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

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
