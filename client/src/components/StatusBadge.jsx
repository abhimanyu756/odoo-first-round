import { Badge } from '@/components/ui/badge';
import {
  ASSET_STATUS,
  ASSET_STATUS_TONES,
  BOOKING_STATUS,
  BOOKING_STATUS_TONES,
  MAINTENANCE_STATUS,
  PRIORITY,
  PRIORITY_TONES,
  ROLES,
  ROLE_TONES,
  VERIFICATION_STATUS,
  VERIFICATION_TONES,
  TRANSFER_STATUS,
  ALLOCATION_STATUS_TONES,
} from '@/lib/constants';

const MAINTENANCE_TONES = {
  PENDING: 'neutral',
  APPROVED: 'info',
  REJECTED: 'danger',
  TECHNICIAN_ASSIGNED: 'accent',
  IN_PROGRESS: 'warning',
  RESOLVED: 'success',
};

const TRANSFER_TONES = {
  REQUESTED: 'warning',
  APPROVED: 'info',
  REJECTED: 'danger',
  COMPLETED: 'success',
};

export function AssetStatusBadge({ status }) {
  return <Badge tone={ASSET_STATUS_TONES[status]}>{ASSET_STATUS[status] || status}</Badge>;
}

export function BookingStatusBadge({ status }) {
  return <Badge tone={BOOKING_STATUS_TONES[status]}>{BOOKING_STATUS[status] || status}</Badge>;
}

export function MaintenanceStatusBadge({ status }) {
  return <Badge tone={MAINTENANCE_TONES[status]}>{MAINTENANCE_STATUS[status] || status}</Badge>;
}

export function PriorityBadge({ priority }) {
  return <Badge tone={PRIORITY_TONES[priority]}>{PRIORITY[priority] || priority}</Badge>;
}

export function RoleBadge({ role }) {
  return <Badge tone={ROLE_TONES[role]}>{ROLES[role] || role}</Badge>;
}

export function VerificationBadge({ status }) {
  return <Badge tone={VERIFICATION_TONES[status]}>{VERIFICATION_STATUS[status] || status}</Badge>;
}

export function TransferStatusBadge({ status }) {
  return <Badge tone={TRANSFER_TONES[status]}>{TRANSFER_STATUS[status] || status}</Badge>;
}

export function AllocationStatusBadge({ status }) {
  const label = status === 'OVERDUE' ? 'Overdue' : status === 'ACTIVE' ? 'Active' : 'Returned';
  return <Badge tone={ALLOCATION_STATUS_TONES[status]}>{label}</Badge>;
}
