import { useState } from 'react';
import { Plus, Search, Boxes } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/input';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/feedback';
import { AssetStatusBadge } from '@/components/StatusBadge';
import { Badge } from '@/components/ui/badge';
import { RoleGate } from '@/components/auth/guards';
import { ASSET_STATUS } from '@/lib/constants';
import { useCategories, useDepartments } from '@/features/organization/api';
import { useAssets } from './api';
import { AssetFormDialog } from './AssetFormDialog';
import { AssetDetailDialog } from './AssetDetailDialog';

export default function AssetsPage() {
  const [filters, setFilters] = useState({ search: '', categoryId: '', status: '', departmentId: '' });
  const { data: assets, isLoading, isError, refetch } = useAssets(filters);
  const { data: categories } = useCategories();
  const { data: departments } = useDepartments();
  const [registering, setRegistering] = useState(false);
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);

  return (
    <div>
      <PageHeader
        title="Assets"
        description="Register and track assets across their full lifecycle."
        actions={
          <RoleGate roles={['ADMIN', 'ASSET_MANAGER']}>
            <Button onClick={() => setRegistering(true)}>
              <Plus /> Register Asset
            </Button>
          </RoleGate>
        }
      />

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative min-w-56 flex-1">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-fg-subtle" />
          <Input
            className="pl-8"
            placeholder="Search by tag, serial, or QR code…"
            value={filters.search}
            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
          />
        </div>
        <Select className="w-40" value={filters.categoryId} onChange={(e) => setFilters((f) => ({ ...f, categoryId: e.target.value }))}>
          <option value="">All categories</option>
          {(categories || []).map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </Select>
        <Select className="w-44" value={filters.status} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}>
          <option value="">All statuses</option>
          {Object.entries(ASSET_STATUS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </Select>
        <Select className="w-40" value={filters.departmentId} onChange={(e) => setFilters((f) => ({ ...f, departmentId: e.target.value }))}>
          <option value="">All departments</option>
          {(departments || []).map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </Select>
      </div>

      {isLoading ? (
        <LoadingState />
      ) : isError ? (
        <ErrorState onRetry={refetch} />
      ) : assets.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface">
          <EmptyState icon={Boxes} title="No assets found" description="Register an asset or adjust your filters." />
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-surface">
          <Table>
            <THead>
              <TR>
                <TH>Tag</TH>
                <TH>Name</TH>
                <TH>Category</TH>
                <TH>Status</TH>
                <TH>Holder</TH>
                <TH>Location</TH>
                <TH>Bookable</TH>
              </TR>
            </THead>
            <TBody>
              {assets.map((a) => (
                <TR key={a.id} className="cursor-pointer" onClick={() => setViewing(a.id)}>
                  <TD className="font-mono text-xs text-accent">{a.assetTag}</TD>
                  <TD className="font-medium">{a.name}</TD>
                  <TD className="text-fg-muted">{a.category?.name}</TD>
                  <TD><AssetStatusBadge status={a.status} /></TD>
                  <TD className="text-fg-muted">{a.currentHolder?.name || a.currentDepartment?.name || '—'}</TD>
                  <TD className="text-fg-muted">{a.location || '—'}</TD>
                  <TD>{a.isBookable ? <Badge tone="accent">Bookable</Badge> : <span className="text-fg-subtle">—</span>}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </div>
      )}

      {registering && <AssetFormDialog onClose={() => setRegistering(false)} />}
      {editing && <AssetFormDialog asset={editing} onClose={() => setEditing(null)} />}
      {viewing && (
        <AssetDetailDialog
          assetId={viewing}
          onClose={() => setViewing(null)}
          onEdit={(a) => {
            setViewing(null);
            setEditing(a);
          }}
        />
      )}
    </div>
  );
}
