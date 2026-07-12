import { Pencil } from 'lucide-react';
import { DocumentGallery } from '@/components/ui/file-preview';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/feedback';
import {
  AssetStatusBadge,
  AllocationStatusBadge,
  MaintenanceStatusBadge,
} from '@/components/StatusBadge';
import { RoleGate } from '@/components/auth/guards';
import { formatDate, formatCurrency } from '@/lib/utils';
import { ASSET_CONDITION } from '@/lib/constants';
import { useAssetProfile } from './api';

function InfoRow({ label, value }) {
  return (
    <div className="flex justify-between gap-4 border-b border-border py-2 text-sm last:border-0">
      <span className="text-fg-subtle">{label}</span>
      <span className="text-right font-medium text-fg">{value ?? '—'}</span>
    </div>
  );
}

export function AssetDetailDialog({ assetId, onClose, onEdit }) {
  const { data, isLoading, isError, refetch } = useAssetProfile(assetId);

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl">
        {isLoading ? (
          <LoadingState />
        ) : isError ? (
          <ErrorState onRetry={refetch} />
        ) : (
          <>
            <DialogHeader>
              <div className="flex items-start justify-between gap-4 pr-8">
                <div>
                  <DialogTitle className="flex items-center gap-2">
                    <span className="font-mono text-sm text-accent">{data.asset.assetTag}</span>
                    {data.asset.name}
                  </DialogTitle>
                  <div className="mt-2">
                    <AssetStatusBadge status={data.asset.status} />
                  </div>
                </div>
                <RoleGate roles={['ADMIN', 'ASSET_MANAGER']}>
                  <Button variant="outline" size="sm" onClick={() => onEdit(data.asset)}>
                    <Pencil className="size-4" /> Edit
                  </Button>
                </RoleGate>
              </div>
            </DialogHeader>

            <Tabs defaultValue="details">
              <TabsList>
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="allocations">Allocation History ({data.allocations.length})</TabsTrigger>
                <TabsTrigger value="maintenance">Maintenance ({data.maintenance.length})</TabsTrigger>
              </TabsList>

              <TabsContent value="details">
                <div className="grid grid-cols-1 gap-x-8 sm:grid-cols-2">
                  <div>
                    <InfoRow label="Category" value={data.asset.category?.name} />
                    <InfoRow label="Serial Number" value={data.asset.serialNumber} />
                    <InfoRow label="Condition" value={ASSET_CONDITION[data.asset.condition]} />
                    <InfoRow label="Location" value={data.asset.location} />
                  </div>
                  <div>
                    <InfoRow label="Holder" value={data.asset.currentHolder?.name} />
                    <InfoRow label="Department" value={data.asset.currentDepartment?.name} />
                    <InfoRow label="Acquisition Date" value={formatDate(data.asset.acquisitionDate)} />
                    <InfoRow label="Acquisition Cost" value={formatCurrency(data.asset.acquisitionCost)} />
                  </div>
                </div>

                {/* Category-specific fields */}
                {data.asset.customFieldValues && Object.keys(data.asset.customFieldValues).length > 0 && (
                  <div className="mt-4">
                    <p className="mb-1 text-xs font-medium uppercase tracking-wide text-fg-subtle">Custom fields</p>
                    {Object.entries(data.asset.customFieldValues).map(([k, v]) => (
                      <InfoRow key={k} label={k} value={String(v)} />
                    ))}
                  </div>
                )}

                {/* Documents */}
                {data.asset.documents?.length > 0 && (
                  <div className="mt-4">
                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-fg-subtle">Photos & Documents</p>
                    <DocumentGallery documents={data.asset.documents} />
                  </div>
                )}
              </TabsContent>

              <TabsContent value="allocations">
                {data.allocations.length === 0 ? (
                  <EmptyState title="No allocation history" description="This asset has never been allocated." />
                ) : (
                  <Table>
                    <THead>
                      <TR>
                        <TH>Allocated To</TH>
                        <TH>By</TH>
                        <TH>Allocated</TH>
                        <TH>Expected Return</TH>
                        <TH>Returned</TH>
                        <TH>Status</TH>
                      </TR>
                    </THead>
                    <TBody>
                      {data.allocations.map((a) => (
                        <TR key={a.id}>
                          <TD className="font-medium">{a.toUser?.name || a.toDepartment?.name || '—'}</TD>
                          <TD className="text-fg-muted">{a.allocatedBy?.name}</TD>
                          <TD className="text-fg-muted">{formatDate(a.allocatedAt)}</TD>
                          <TD className="text-fg-muted">{formatDate(a.expectedReturnDate)}</TD>
                          <TD className="text-fg-muted">{formatDate(a.returnedAt)}</TD>
                          <TD><AllocationStatusBadge status={a.status} /></TD>
                        </TR>
                      ))}
                    </TBody>
                  </Table>
                )}
              </TabsContent>

              <TabsContent value="maintenance">
                {data.maintenance.length === 0 ? (
                  <EmptyState title="No maintenance history" description="No maintenance has been raised for this asset." />
                ) : (
                  <Table>
                    <THead>
                      <TR>
                        <TH>Issue</TH>
                        <TH>Raised By</TH>
                        <TH>Technician</TH>
                        <TH>Date</TH>
                        <TH>Status</TH>
                      </TR>
                    </THead>
                    <TBody>
                      {data.maintenance.map((m) => (
                        <TR key={m.id}>
                          <TD className="max-w-xs truncate font-medium">{m.description}</TD>
                          <TD className="text-fg-muted">{m.raisedBy?.name}</TD>
                          <TD className="text-fg-muted">{m.technician?.name || '—'}</TD>
                          <TD className="text-fg-muted">{formatDate(m.createdAt)}</TD>
                          <TD><MaintenanceStatusBadge status={m.status} /></TD>
                        </TR>
                      ))}
                    </TBody>
                  </Table>
                )}
              </TabsContent>
            </Tabs>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
