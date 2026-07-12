import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, CalendarClock, X, Pencil, AlertTriangle, Check } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/input';
import { Field } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { LoadingState, EmptyState, Spinner } from '@/components/ui/feedback';
import { BookingStatusBadge } from '@/components/StatusBadge';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useToast } from '@/components/ui/toast';
import { apiError } from '@/lib/api';
import { useAssets } from '@/features/assets/api';
import { useDepartments } from '@/features/organization/api';
import { useBookings, useBookingMutations } from './api';
import { BookSlotDialog } from './BookSlotDialog';

const DAY_START = 0;
const DAY_END = 24; // full 24-hour day
const ROW = 44; // px per hour
const HOURS = Array.from({ length: DAY_END - DAY_START }, (_, i) => DAY_START + i);

// Format a Date to YYYY-MM-DD using LOCAL components (not UTC) so day
// navigation is stable across timezones.
const ymd = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};
function addDays(dateStr, n) {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return ymd(d);
}
const hourFraction = (iso) => {
  const d = new Date(iso);
  return d.getHours() + d.getMinutes() / 60;
};
const fmt = (iso) => new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
const overlaps = (aS, aE, bS, bE) => aS < bE && aE > bS; // touching endpoints allowed
// Add `mins` minutes to an "HH:MM" string, clamped to 23:59.
function addMinutes(hhmm, mins) {
  const [h, m] = hhmm.split(':').map(Number);
  const total = Math.min(h * 60 + m + mins, 23 * 60 + 59);
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

export default function BookingPage() {
  const [date, setDate] = useState(ymd(new Date()));
  const [assetId, setAssetId] = useState('');
  const [rescheduling, setRescheduling] = useState(null);
  const [cancelling, setCancelling] = useState(null);

  // Booking form state (lifted so the timeline can show the live "requested" ghost).
  const [start, setStart] = useState('09:00');
  const [end, setEnd] = useState('10:00');
  const [purpose, setPurpose] = useState('');
  const [deptId, setDeptId] = useState('');

  const { data: bookable } = useAssets({ isBookable: 'true' });
  const { data: depts } = useDepartments({ status: 'ACTIVE' });
  const selectedAsset = (bookable || []).find((a) => a.id === assetId) || (bookable || [])[0];
  const effectiveAssetId = assetId || selectedAsset?.id;

  const dayStart = new Date(date + 'T00:00:00').toISOString();
  const dayEnd = new Date(date + 'T23:59:59').toISOString();
  const { data: bookings, isLoading } = useBookings({ assetId: effectiveAssetId, from: dayStart, to: dayEnd });
  const visible = useMemo(() => (bookings || []).filter((b) => b.status !== 'CANCELLED'), [bookings]);

  const { create, cancel } = useBookingMutations();
  const toast = useToast();

  // Live ghost slot + conflict flag against existing bookings.
  const ghost = useMemo(() => {
    if (!start || !end || end <= start) return null;
    const s = new Date(`${date}T${start}`);
    const e = new Date(`${date}T${end}`);
    const conflict = visible.some((b) => overlaps(s, e, new Date(b.startTime), new Date(b.endTime)));
    const top = (s.getHours() + s.getMinutes() / 60 - DAY_START) * ROW;
    const height = ((e - s) / 3600000) * ROW;
    return { top, height, conflict, label: `${start}–${end}` };
  }, [start, end, date, visible]);

  async function book() {
    try {
      await create.mutateAsync({
        assetId: effectiveAssetId,
        startTime: new Date(`${date}T${start}`).toISOString(),
        endTime: new Date(`${date}T${end}`).toISOString(),
        forDepartmentId: deptId || null,
        purpose: purpose || null,
      });
      toast.success('Booking confirmed');
      // Advance the form to the next slot so it doesn't overlap what was just booked.
      setStart(end);
      setEnd(addMinutes(end, 60));
      setPurpose('');
    } catch (err) {
      toast.error(apiError(err));
    }
  }

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
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Select className="w-72" value={effectiveAssetId || ''} onChange={(e) => setAssetId(e.target.value)}>
          {(bookable || []).length === 0 && <option value="">No bookable resources</option>}
          {(bookable || []).map((a) => (
            <option key={a.id} value={a.id}>{a.assetTag} — {a.name}</option>
          ))}
        </Select>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" onClick={() => setDate((d) => addDays(d, -1))}><ChevronLeft className="size-4" /></Button>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
            className="h-9 rounded-md border border-border-strong bg-surface-2 px-3 text-sm text-fg" />
          <Button variant="outline" size="icon" onClick={() => setDate((d) => addDays(d, 1))}><ChevronRight className="size-4" /></Button>
        </div>
      </div>

      {!effectiveAssetId ? (
        <Card>
          <EmptyState icon={CalendarClock} title="No bookable resources"
            description="Mark an asset as “shared/bookable” when registering it to book it here." />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* Timeline with live requested-slot ghost */}
          <Card className="lg:col-span-2 p-4">
            <h3 className="mb-3 text-sm font-medium text-fg">
              {selectedAsset?.name} · {new Date(date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
            </h3>
            {isLoading ? <LoadingState /> : <Timeline bookings={visible} ghost={ghost} />}
          </Card>

          <div className="space-y-4">
            {/* Book a slot */}
            <Card className="p-4">
              <h3 className="mb-3 text-sm font-medium text-fg">Book a slot</h3>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Start"><Input type="time" value={start} onChange={(e) => setStart(e.target.value)} /></Field>
                <Field label="End"><Input type="time" value={end} onChange={(e) => setEnd(e.target.value)} /></Field>
              </div>
              <Field label="For department" className="mt-3">
                <Select value={deptId} onChange={(e) => setDeptId(e.target.value)}>
                  <option value="">— None —</option>
                  {(depts || []).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </Select>
              </Field>
              <Field label="Purpose" className="mt-3">
                <Input placeholder="e.g. Sprint planning" value={purpose} onChange={(e) => setPurpose(e.target.value)} />
              </Field>

              {ghost && (
                <div className={`mt-3 flex items-center gap-2 rounded-md border px-3 py-2 text-xs ${
                  ghost.conflict ? 'border-danger/40 bg-danger/10 text-danger' : 'border-success/40 bg-success/10 text-success'
                }`}>
                  {ghost.conflict ? <AlertTriangle className="size-4" /> : <Check className="size-4" />}
                  {ghost.conflict ? `${start}–${end} overlaps an existing booking` : `${start}–${end} is available`}
                </div>
              )}

              <Button className="mt-3 w-full" onClick={book} disabled={create.isPending || !ghost || ghost.conflict}>
                {create.isPending && <Spinner />} Book a slot
              </Button>
            </Card>

            {/* Today's bookings */}
            <Card className="p-4">
              <h3 className="mb-3 text-sm font-medium text-fg">Bookings today</h3>
              {visible.length === 0 ? (
                <p className="py-6 text-center text-sm text-fg-muted">No bookings for this day.</p>
              ) : (
                <div className="space-y-2">
                  {visible.map((b) => (
                    <div key={b.id} className="rounded-lg border border-border bg-surface-2 p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-fg">{fmt(b.startTime)} – {fmt(b.endTime)}</span>
                        <BookingStatusBadge status={b.status} />
                      </div>
                      <p className="mt-1 text-xs text-fg-muted">
                        {b.bookedBy?.name}{b.forDepartment ? ` · ${b.forDepartment.name}` : ''}{b.purpose ? ` · ${b.purpose}` : ''}
                      </p>
                      {b.status !== 'CANCELLED' && (
                        <div className="mt-2 flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => setRescheduling(b)}><Pencil className="size-3.5" /> Reschedule</Button>
                          {['UPCOMING', 'ONGOING'].includes(b.status) && (
                            <Button variant="ghost" size="sm" onClick={() => setCancelling(b)}><X className="size-3.5" /> Cancel</Button>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>
      )}

      {rescheduling && (
        <BookSlotDialog asset={selectedAsset} date={date} booking={rescheduling} onClose={() => setRescheduling(null)} />
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

function Timeline({ bookings, ghost }) {
  return (
    <div className="max-h-[560px] overflow-y-auto pr-1">
    <div className="relative" style={{ height: `${(DAY_END - DAY_START) * ROW}px` }}>
      {HOURS.map((h, i) => (
        <div key={h} className="absolute left-0 right-0 flex items-start gap-2 border-t border-border text-xs text-fg-subtle"
          style={{ top: `${i * ROW}px` }}>
          <span className="-mt-2 w-12 shrink-0 text-right">{String(h).padStart(2, '0')}:00</span>
        </div>
      ))}
      <div className="absolute inset-y-0 left-14 right-0">
        {bookings.map((b) => {
          const top = (hourFraction(b.startTime) - DAY_START) * ROW;
          const height = Math.max((hourFraction(b.endTime) - hourFraction(b.startTime)) * ROW, 24);
          return (
            <div key={b.id}
              className="absolute left-1 right-1 overflow-hidden rounded-md border border-info/50 bg-info/20 px-2 py-1 text-xs text-info"
              style={{ top: `${Math.max(top, 0)}px`, height: `${height}px` }} title={b.purpose || ''}>
              <div className="font-medium truncate">Booked · {b.bookedBy?.name} · {fmt(b.startTime)}–{fmt(b.endTime)}</div>
              {b.purpose && <div className="truncate text-info/80">{b.purpose}</div>}
            </div>
          );
        })}

        {ghost && (
          <div
            className={`absolute left-1 right-1 z-10 flex items-center rounded-md border-2 border-dashed px-2 text-xs font-medium ${
              ghost.conflict ? 'border-danger bg-danger/15 text-danger' : 'border-success bg-success/15 text-success'
            }`}
            style={{ top: `${Math.max(ghost.top, 0)}px`, height: `${Math.max(ghost.height, 24)}px` }}
          >
            {ghost.conflict ? `Requested ${ghost.label} · conflict — unavailable` : `Requested ${ghost.label} · available`}
          </div>
        )}
      </div>
    </div>
    </div>
  );
}
