import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Select, Textarea } from '@/components/ui/input';
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
import { useAllocationMutations } from './api';

export function ReturnDialog({ allocation, onClose }) {
  const { returnAsset } = useAllocationMutations();
  const toast = useToast();
  const { register, handleSubmit } = useForm({
    defaultValues: { returnCondition: 'GOOD', checkInNotes: '' },
  });

  async function onSubmit(values) {
    try {
      await returnAsset.mutateAsync({ id: allocation.id, ...values });
      toast.success('Asset returned and marked available');
      onClose();
    } catch (err) {
      toast.error(apiError(err));
    }
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Return {allocation.asset.assetTag}</DialogTitle>
          <DialogDescription>
            Capture the check-in condition. The asset reverts to Available.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Field label="Condition on return">
            <Select {...register('returnCondition')}>
              {Object.entries(ASSET_CONDITION).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </Select>
          </Field>
          <Field label="Check-in notes" hint="Optional">
            <Textarea placeholder="Any damage or observations…" {...register('checkInNotes')} />
          </Field>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={returnAsset.isPending}>
              {returnAsset.isPending && <Spinner />}
              Mark returned
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
