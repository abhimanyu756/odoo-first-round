import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Download, TrendingUp, Boxes, Wrench } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/feedback';
import { formatDate } from '@/lib/utils';
import { useTheme } from '@/context/ThemeContext';
import { useReports } from './api';

// Theme-aware chart tokens (single-hue per chart — CVD-safe by construction).
function useChartColors() {
  const { theme } = useTheme();
  return theme === 'light'
    ? { emerald: '#059669', info: '#0284c7', axis: '#8a93a2', grid: '#e4e7ec' }
    : { emerald: '#10b981', info: '#38bdf8', axis: '#6b7280', grid: '#2a2f39' };
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-border bg-elevated px-3 py-2 text-xs shadow-lg">
      <p className="mb-1 font-medium text-fg">{label}</p>
      {payload.map((p) => (
        <p key={p.name} className="text-fg-muted">
          {p.name}: <span className="font-semibold text-fg">{p.value}</span>
        </p>
      ))}
    </div>
  );
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function Heatmap({ grid }) {
  const max = Math.max(1, ...grid.flat());
  const hours = Array.from({ length: 24 }, (_, h) => h).filter((h) => h >= 6 && h <= 20);
  return (
    <div className="overflow-x-auto">
      <div className="inline-block">
        <div className="flex gap-1 pl-10 text-[10px] text-fg-subtle">
          {hours.map((h) => (
            <div key={h} className="w-4 text-center">{h}</div>
          ))}
        </div>
        {grid.map((row, day) => (
          <div key={day} className="mt-1 flex items-center gap-1">
            <div className="w-9 text-right text-[10px] text-fg-subtle">{WEEKDAYS[day]}</div>
            {hours.map((h) => {
              const v = row[h];
              const intensity = v / max;
              return (
                <div
                  key={h}
                  title={`${WEEKDAYS[day]} ${h}:00 — ${v} booking(s)`}
                  className="size-4 rounded-sm border border-border"
                  style={{ backgroundColor: v ? `rgba(16,185,129,${0.15 + intensity * 0.85})` : 'transparent' }}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ReportsPage() {
  const { data, isLoading, isError, refetch } = useReports();
  const c = useChartColors();

  if (isLoading) return <LoadingState label="Crunching analytics…" />;
  if (isError) return <ErrorState onRetry={refetch} />;

  const hasBookingData = data.bookingHeatmap.some((row) => row.some((v) => v > 0));

  return (
    <div>
      <PageHeader
        title="Reports & Analytics"
        description="Actionable operational insight."
        actions={
          <Button asChild variant="outline">
            <a href="/api/reports/export/assets.csv">
              <Download className="size-4" /> Export CSV
            </a>
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Utilization by department */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Boxes className="size-4 text-fg-muted" /> Allocated assets by department
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.utilizationByDepartment.length === 0 ? (
              <EmptyState title="No departments" />
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={data.utilizationByDepartment} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={c.grid} vertical={false} />
                  <XAxis dataKey="department" tick={{ fill: c.axis, fontSize: 11 }} axisLine={{ stroke: c.grid }} tickLine={false} />
                  <YAxis tick={{ fill: c.axis, fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(127,127,127,0.08)' }} />
                  <Bar dataKey="allocated" name="Allocated" fill={c.emerald} radius={[4, 4, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Maintenance frequency */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="size-4 text-fg-muted" /> Maintenance frequency (6 mo)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={data.maintenanceFrequency} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={c.grid} vertical={false} />
                <XAxis dataKey="month" tick={{ fill: c.axis, fontSize: 11 }} axisLine={{ stroke: c.grid }} tickLine={false} />
                <YAxis tick={{ fill: c.axis, fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<ChartTooltip />} />
                <Line type="monotone" dataKey="count" name="Requests" stroke={c.info} strokeWidth={2} dot={{ r: 3, fill: c.info }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Most used vs idle */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="size-4 text-fg-muted" /> Most used vs idle assets
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-fg-subtle">Most used</p>
                {data.mostUsed.filter((a) => a.uses > 0).length === 0 ? (
                  <p className="text-sm text-fg-subtle">No usage yet.</p>
                ) : (
                  data.mostUsed.filter((a) => a.uses > 0).map((a) => (
                    <div key={a.id} className="flex justify-between py-1 text-sm">
                      <span className="text-fg">{a.name}</span>
                      <span className="text-fg-muted">{a.uses} uses</span>
                    </div>
                  ))
                )}
              </div>
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-fg-subtle">Idle</p>
                {data.idle.length === 0 ? (
                  <p className="text-sm text-fg-subtle">Nothing idle.</p>
                ) : (
                  data.idle.map((a) => (
                    <div key={a.id} className="flex justify-between py-1 text-sm">
                      <span className="text-fg">{a.name}</span>
                      <span className="text-fg-subtle">
                        {a.lastAllocatedAt ? formatDate(a.lastAllocatedAt) : 'never'}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Attention: maintenance due / nearing retirement */}
        <Card>
          <CardHeader>
            <CardTitle>Due for attention</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-fg-subtle">Poor condition</p>
                {data.attention.poorCondition.length === 0 ? (
                  <p className="text-sm text-fg-subtle">All in good shape.</p>
                ) : (
                  data.attention.poorCondition.map((a) => (
                    <div key={a.id} className="py-1 text-sm text-fg">
                      {a.name} <span className="text-warning">· {a.condition}</span>
                    </div>
                  ))
                )}
              </div>
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-fg-subtle">Nearing retirement</p>
                {data.attention.aging.length === 0 ? (
                  <p className="text-sm text-fg-subtle">None over 4 years old.</p>
                ) : (
                  data.attention.aging.map((a) => (
                    <div key={a.id} className="py-1 text-sm text-fg">
                      {a.name} <span className="text-fg-subtle">· {formatDate(a.acquisitionDate)}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Booking heatmap */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Resource booking heatmap</CardTitle>
          </CardHeader>
          <CardContent>
            {hasBookingData ? (
              <Heatmap grid={data.bookingHeatmap} />
            ) : (
              <EmptyState title="No bookings yet" description="Peak usage windows will appear here." />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
