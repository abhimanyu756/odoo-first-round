import { useState, useMemo } from 'react';
import { Plus, ChevronLeft, ChevronRight, CalendarClock, X, Pencil } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { LoadingState, EmptyState } from '@/components/ui/feedback';
import { BookingStatusBadge } from '@/components/StatusBadge';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useToast } from '@/components/ui/toast';
import { apiError } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useAssets } from '@/features/assets/api';
import { useBookings, useBookingMutations } from './api';
import { BookSlotDialog } from './BookSlotDialog';

const DAY_START = 7; // 07:00
const DAY_END = 20; // 20:00
const HOURS = Array.from({ length: DAY_END - DAY_START + 1 }, (_, i) => DAY_START + i);

function ymd(date) {
  return date.toISOString().slice(0, 10);
}
function addDays(dateStr, n) {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return ymd(d);
}
function hourFraction(iso) {
  const d = new Date(iso);
  return d.getHours() + d.getMinutes() / 60;
}

export default function BookingPage() {
  const [date, setDate] = useState(ymd(new Date()));
  const [assetId, setAssetId] = useState('');
  const [booking, setBooking] = useState(false); // true | booking-to-edit | false
  const [cancelling, setCancelling] = useState(null);

  const { data: bookable } = useAssets({ isBookable: 'true' });
  const selectedAsset = (bookable || []).find((a) => a.id === assetId) || (bookable || [])[0];
  const effectiveAssetId = assetId || selectedAsset?.id;

  const dayStart = new Date(date + 'T00:00:00').toISOString();
  const dayEnd = new Date(date + 'T23:59:59').toISOString();
  const { data: bookings, isLoading } = useBookings({
    assetId: effectiveAssetId,
    from: dayStart,
    to: dayEnd,
  });

  const { cancel } = useBookingMutations();
  const toast = useToast();

  const visible = useMemo(
    () => (bookings || []).filter((b) => b.status !== 'CANCELLED'),
    [bookings]
  );

  async function confirmCancel() {
    try {
      await cancel.mutateAsync(cancelling.id);
      toast.success('Booking cancelled');
      setCancelling(null);
    } catch (err) {
      toast.error(apiError(err));
    }
  }

  return (
    <div>
      <PageHeader
        title="Resource Booking"
        description="Book shared resources by time slot — overlaps are rejected automatically."
        actions={
          <Button onClick={() => setBooking(true)} disabled={!effectiveAssetId}>
            <Plus /> Book a slot
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Select
          className="w-72"
          value={effectiveAssetId || ''}
          onChange={(e) => setAssetId(e.target.value)}
        >
          {(bookable || []).length === 0 && <option value="">No bookable resources</option>}
          {(bookable || []).map((a) => (
            <option key={a.id} value={a.id}>
              {a.assetTag} — {a.name}
            </option>
          ))}
        </Select>

        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" onClick={() => setDate((d) => addDays(d, -1))}>
            <ChevronLeft className="size-4" />
          </Button>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="h-9 rounded-md border border-border-strong bg-surface-2 px-3 text-sm text-fg"
          />
          <Button variant="outline" size="icon" onClick={() => setDate((d) => addDays(d, 1))}>
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      {!effectiveAssetId ? (
        <Card>
          <EmptyState
            icon={CalendarClock}
            title="No bookable resources"
            description="Mark an asset as “shared/bookable” when registering it to book it here."
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* Timeline */}
          <Card className="lg:col-span-2 p-4">
            <h3 className="mb-3 text-sm font-medium text-fg">
              {selectedAsset?.name} · {new Date(date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
            </h3>
            {isLoading ? (
              <LoadingState />
            ) : (
              <div className="relative" style={{ height: `${(DAY_END - DAY_START) * 48}px` }}>
                {HOURS.map((h, i) => (
                  <div
                    key={h}
                    className="absolute left-0 right-0 flex items-start gap-2 border-t border-border text-xs text-fg-subtle"
                    style={{ top: `${i * 48}px` }}
                  >
                    <span className="-mt-2 w-12 shrink-0 text-right">{String(h).padStart(2, '0')}:00</span>
                  </div>
                ))}
                <div className="absolute inset-y-0 left-14 right-0">
                  {visible.map((b) => {
                    const top = (hourFraction(b.startTime) - DAY_START) * 48;
                    const height = Math.max(
                      (hourFraction(b.endTime) - hourFraction(b.startTime)) * 48,
                      22
                    );
                    return (
                      <div
                        key={b.id}
                        className="absolute left-1 right-1 overflow-hidden rounded-md border border-info/40 bg-info/15 px-2 py-1 text-xs text-info"
                        style={{ top: `${Math.max(top, 0)}px`, height: `${height}px` }}
                        title={b.purpose || ''}
                      >
                        <div className="font-medium truncate">
                          {new Date(b.startTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                          {' – '}
                          {new Date(b.endTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                        </div>
                        <div className="truncate text-info/80">{b.bookedBy?.name}{b.purpose ? ` · ${b.purpose}` : ''}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </Card>

          {/* Day's bookings list */}
          <Card className="p-4">
            <h3 className="mb-3 text-sm font-medium text-fg">Bookings today</h3>
            {visible.length === 0 ? (
              <p className="py-8 text-center text-sm text-fg-muted">No bookings for this day.</p>
            ) : (
              <div className="space-y-2">
                {visible.map((b) => (
                  <div key={b.id} className="rounded-lg border border-border bg-surface-2 p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-fg">
                        {new Date(b.startTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} –{' '}
                        {new Date(b.endTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                      </span>
                      <BookingStatusBadge status={b.status} />
                    </div>
                    <p className="mt-1 text-xs text-fg-muted">
                      {b.bookedBy?.name}
                      {b.forDepartment ? ` · ${b.forDepartment.name}` : ''}
                      {b.purpose ? ` · ${b.purpose}` : ''}
                    </p>
                    {b.status === 'UPCOMING' && (
                      <div className="mt-2 flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => setBooking(b)}>
                          <Pencil className="size-3.5" /> Reschedule
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setCancelling(b)}>
                          <X className="size-3.5" /> Cancel
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {booking && (
        <BookSlotDialog
          asset={selectedAsset}
          date={date}
          booking={booking === true ? null : booking}
          onClose={() => setBooking(false)}
        />
      )}
      <ConfirmDialog
        open={!!cancelling}
        onOpenChange={(v) => !v && setCancelling(null)}
        onConfirm={confirmCancel}
        loading={cancel.isPending}
        title="Cancel this booking?"
        description="The time slot will be freed up for others."
        confirmLabel="Cancel booking"
      />
    </div>
  );
}
