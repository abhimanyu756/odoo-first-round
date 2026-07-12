import { useForm } from 'react-hook-form';
import { Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input, Select, Textarea } from '@/components/ui/input';
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
import { apiError } from '@/lib/api';
import { ASSET_CONDITION } from '@/lib/constants';
import { useCategories, useDepartments } from '@/features/organization/api';
import { useAssetMutations } from './api';

export function AssetFormDialog({ asset, onClose }) {
  const isEdit = !!asset;
  const { data: categories } = useCategories();
  const { data: departments } = useDepartments({ status: 'ACTIVE' });
  const { create, update } = useAssetMutations();
  const toast = useToast();

  const { register, handleSubmit, watch, formState: { errors } } = useForm({
    defaultValues: {
      name: asset?.name || '',
      categoryId: asset?.category?.id || asset?.categoryId || '',
      serialNumber: asset?.serialNumber || '',
      acquisitionDate: asset?.acquisitionDate ? asset.acquisitionDate.slice(0, 10) : '',
      acquisitionCost: asset?.acquisitionCost || '',
      condition: asset?.condition || 'GOOD',
      location: asset?.location || '',
      currentDepartmentId: asset?.currentDepartment?.id || '',
      isBookable: asset?.isBookable || false,
      customFieldValues: asset?.customFieldValues || {},
    },
  });

  const selectedCategoryId = watch('categoryId');
  const selectedCategory = (categories || []).find((c) => c.id === selectedCategoryId);
  const customFields = selectedCategory?.customFields || [];
  const pending = create.isPending || update.isPending;

  async function onSubmit(values) {
    const { files, customFieldValues, ...rest } = values;
    const fields = {
      ...rest,
      acquisitionCost: rest.acquisitionCost === '' ? undefined : rest.acquisitionCost,
      acquisitionDate: rest.acquisitionDate || undefined,
      isBookable: rest.isBookable ? 'true' : 'false',
      customFieldValues:
        customFields.length && customFieldValues ? customFieldValues : undefined,
    };
    try {
      if (isEdit) {
        await update.mutateAsync({ id: asset.id, fields, files: values.files });
        toast.success('Asset updated');
      } else {
        const created = await create.mutateAsync({ fields, files: values.files });
        toast.success(`Registered ${created.assetTag}`);
      }
      onClose();
    } catch (err) {
      toast.error(apiError(err));
    }
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? `Edit ${asset.assetTag}` : 'Register Asset'}</DialogTitle>
          {!isEdit && (
            <DialogDescription>An asset tag (AF-####) is generated automatically.</DialogDescription>
          )}
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Name" error={errors.name?.message}>
              <Input placeholder="e.g. Dell Latitude 5540" {...register('name', { required: 'Name is required' })} />
            </Field>
            <Field label="Category" error={errors.categoryId?.message}>
              <Select {...register('categoryId', { required: 'Category is required' })}>
                <option value="">— Select —</option>
                {(categories || []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Serial Number">
              <Input placeholder="Optional" {...register('serialNumber')} />
            </Field>
            <Field label="Location">
              <Input placeholder="e.g. HQ Floor 2" {...register('location')} />
            </Field>
            <Field label="Acquisition Date">
              <Input type="date" {...register('acquisitionDate')} />
            </Field>
            <Field label="Acquisition Cost" hint="For ranking/reports only">
              <Input type="number" step="0.01" min="0" placeholder="0.00" {...register('acquisitionCost')} />
            </Field>
            <Field label="Condition">
              <Select {...register('condition')}>
                {Object.entries(ASSET_CONDITION).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Department">
              <Select {...register('currentDepartmentId')}>
                <option value="">— None —</option>
                {(departments || []).map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          {/* Category-specific custom fields */}
          {customFields.length > 0 && (
            <div className="rounded-lg border border-border bg-surface-2 p-3">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-fg-subtle">
                {selectedCategory.name} details
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {customFields.map((f) => (
                  <Field key={f.key} label={f.label + (f.required ? ' *' : '')}>
                    {f.type === 'boolean' ? (
                      <Select {...register(`customFieldValues.${f.key}`)}>
                        <option value="">—</option>
                        <option value="true">Yes</option>
                        <option value="false">No</option>
                      </Select>
                    ) : (
                      <Input
                        type={f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : 'text'}
                        {...register(`customFieldValues.${f.key}`, { required: f.required })}
                      />
                    )}
                  </Field>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Photos / Documents" hint="Images or PDF, up to 8 files">
              <label className="flex h-9 cursor-pointer items-center gap-2 rounded-md border border-border-strong bg-surface-2 px-3 text-sm text-fg-muted hover:bg-elevated">
                <Upload className="size-4" />
                <span>Choose files</span>
                <input type="file" multiple accept="image/*,application/pdf" className="hidden" {...register('files')} />
              </label>
            </Field>
            <div className="flex items-end">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-fg">
                <input type="checkbox" {...register('isBookable')} />
                Shared / bookable resource
              </label>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending && <Spinner />}
              {isEdit ? 'Save changes' : 'Register asset'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
