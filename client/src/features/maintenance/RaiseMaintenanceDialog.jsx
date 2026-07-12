import { useForm } from 'react-hook-form';
import { Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, Textarea } from '@/components/ui/input';
import { Field } from '@/components/ui/label';
import { Spinner } from '@/components/ui/feedback';
import { FilePreview } from '@/components/ui/file-preview';
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
import { PRIORITY } from '@/lib/constants';
import { useAssets } from '@/features/assets/api';
import { useMaintenanceMutations } from './api';

export function RaiseMaintenanceDialog({ presetAssetId, onClose }) {
  const { data: assets } = useAssets({});
  const { create } = useMaintenanceMutations();
  const toast = useToast();
  const { register, handleSubmit, watch, formState: { errors } } = useForm({
    defaultValues: { assetId: presetAssetId || '', description: '', priority: 'MEDIUM' },
  });
  const selectedPhoto = watch('photo');

  async function onSubmit(values) {
    try {
      await create.mutateAsync({
        fields: { assetId: values.assetId, description: values.description, priority: values.priority },
        photo: values.photo?.[0],
      });
      toast.success('Maintenance request raised');
      onClose();
    } catch (err) {
      toast.error(apiError(err));
    }
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Raise Maintenance Request</DialogTitle>
          <DialogDescription>Request must be approved before repair work begins.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Field label="Asset" error={errors.assetId?.message}>
            <Select {...register('assetId', { required: 'Select an asset' })} disabled={!!presetAssetId}>
              <option value="">— Select asset —</option>
              {(assets || []).map((a) => (
                <option key={a.id} value={a.id}>
                  {a.assetTag} — {a.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Describe the issue" error={errors.description?.message}>
            <Textarea
              placeholder="What's wrong with the asset?"
              {...register('description', { required: 'Description is required', minLength: { value: 5, message: 'Add more detail' } })}
            />
          </Field>
          <Field label="Priority">
            <Select {...register('priority')}>
              {Object.entries(PRIORITY).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </Select>
          </Field>
          <Field label="Photo" hint="Optional">
            <label className="flex h-9 cursor-pointer items-center gap-2 rounded-md border border-border-strong bg-surface-2 px-3 text-sm text-fg-muted hover:bg-elevated">
              <Upload className="size-4" />
              <span>Attach a photo</span>
              <input type="file" accept="image/*" className="hidden" {...register('photo')} />
            </label>
            <FilePreview files={selectedPhoto} />
          </Field>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={create.isPending}>
              {create.isPending && <Spinner />}
              Submit request
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
