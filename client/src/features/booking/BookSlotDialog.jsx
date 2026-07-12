import { useForm } from 'react-hook-form';
import { AlertTriangle } from 'lucide-react';
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
import { formatDateTime } from '@/lib/utils';
import { useDepartments } from '@/features/organization/api';
import { useBookingMutations } from './api';

// Combine a yyyy-mm-dd date and HH:mm time into an ISO string.
function toISO(dateStr, timeStr) {
  return new Date(`${dateStr}T${timeStr}`).toISOString();
}

export function BookSlotDialog({ asset, date, booking, onClose }) {
  const isEdit = !!booking;
  const { create, reschedule } = useBookingMutations();
  const { data: departments } = useDepartments({ status: 'ACTIVE' });
  const toast = useToast();
  const [overlap, setOverlap] = useState(null);

  const defaultDate = booking ? booking.startTime.slice(0, 10) : date;
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: {
      date: defaultDate,
      startTime: booking ? booking.startTime.slice(11, 16) : '09:00',
      endTime: booking ? booking.endTime.slice(11, 16) : '10:00',
      forDepartmentId: booking?.forDepartment?.id || '',
      purpose: booking?.purpose || '',
    },
  });

  const pending = create.isPending || reschedule.isPending;

  async function onSubmit(values) {
    setOverlap(null);
    const startTime = toISO(values.date, values.startTime);
    const endTime = toISO(values.date, values.endTime);
    try {
      if (isEdit) {
        await reschedule.mutateAsync({ id: booking.id, startTime, endTime });
        toast.success('Booking rescheduled');
      } else {
        await create.mutateAsync({
          assetId: asset.id,
          startTime,
          endTime,
          forDepartmentId: values.forDepartmentId || null,
          purpose: values.purpose || null,
        });
        toast.success('Booking confirmed');
      }
      onClose();
    } catch (err) {
      const details = err?.response?.data?.details;
      if (details?.code === 'BOOKING_OVERLAP') setOverlap(details.conflict);
      else toast.error(apiError(err));
    }
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? 'Reschedule booking' : `Book ${asset?.assetTag} — ${asset?.name}`}
          </DialogTitle>
        </DialogHeader>

        {overlap && (
          <div className="mb-4 flex items-start gap-2 rounded-md border border-danger/40 bg-danger/10 px-3 py-2.5 text-sm text-danger">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <span>
              Slot unavailable — overlaps a booking from{' '}
              <strong>{formatDateTime(overlap.startTime)}</strong> to{' '}
              <strong>{formatDateTime(overlap.endTime)}</strong>
              {overlap.bookedBy ? ` (${overlap.bookedBy})` : ''}.
            </span>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Field label="Date" error={errors.date?.message}>
            <Input type="date" {...register('date', { required: true })} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Start" error={errors.startTime?.message}>
              <Input type="time" {...register('startTime', { required: true })} />
            </Field>
            <Field label="End" error={errors.endTime?.message}>
              <Input type="time" {...register('endTime', { required: true })} />
            </Field>
          </div>
          {!isEdit && (
            <>
              <Field label="For Department" hint="Optional — booking on behalf of a department">
                <Select {...register('forDepartmentId')}>
                  <option value="">— None —</option>
                  {(departments || []).map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Purpose" hint="Optional">
                <Input placeholder="e.g. Sprint planning" {...register('purpose')} />
              </Field>
            </>
          )}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending && <Spinner />}
              {isEdit ? 'Reschedule' : 'Book slot'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
