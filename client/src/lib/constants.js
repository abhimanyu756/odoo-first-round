// Shared domain constants + display helpers mirrored from the Prisma enums.

export const ROLES = {
  ADMIN: 'Admin',
  ASSET_MANAGER: 'Asset Manager',
  DEPARTMENT_HEAD: 'Department Head',
  EMPLOYEE: 'Employee',
};

export const ROLE_TONES = {
  ADMIN: 'danger',
  ASSET_MANAGER: 'primary',
  DEPARTMENT_HEAD: 'info',
  EMPLOYEE: 'neutral',
};

export const ASSET_STATUS = {
  AVAILABLE: 'Available',
  ALLOCATED: 'Allocated',
  RESERVED: 'Reserved',
  UNDER_MAINTENANCE: 'Under Maintenance',
  LOST: 'Lost',
  RETIRED: 'Retired',
  DISPOSED: 'Disposed',
};

export const ASSET_STATUS_TONES = {
  AVAILABLE: 'success',
  ALLOCATED: 'info',
  RESERVED: 'accent',
  UNDER_MAINTENANCE: 'warning',
  LOST: 'danger',
  RETIRED: 'neutral',
  DISPOSED: 'neutral',
};

export const ASSET_CONDITION = { NEW: 'New', GOOD: 'Good', FAIR: 'Fair', POOR: 'Poor' };

export const BOOKING_STATUS = {
  UPCOMING: 'Upcoming',
  ONGOING: 'Ongoing',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

export const BOOKING_STATUS_TONES = {
  UPCOMING: 'info',
  ONGOING: 'primary',
  COMPLETED: 'neutral',
  CANCELLED: 'danger',
};

export const MAINTENANCE_STATUS = {
  PENDING: 'Pending',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  TECHNICIAN_ASSIGNED: 'Technician Assigned',
  IN_PROGRESS: 'In Progress',
  RESOLVED: 'Resolved',
};

export const MAINTENANCE_COLUMNS = [
  'PENDING',
  'APPROVED',
  'TECHNICIAN_ASSIGNED',
  'IN_PROGRESS',
  'RESOLVED',
];

export const PRIORITY = { LOW: 'Low', MEDIUM: 'Medium', HIGH: 'High', CRITICAL: 'Critical' };
export const PRIORITY_TONES = {
  LOW: 'neutral',
  MEDIUM: 'info',
  HIGH: 'warning',
  CRITICAL: 'danger',
};

export const TRANSFER_STATUS = {
  REQUESTED: 'Requested',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  COMPLETED: 'Completed',
};

export const VERIFICATION_STATUS = {
  PENDING: 'Pending',
  VERIFIED: 'Verified',
  MISSING: 'Missing',
  DAMAGED: 'Damaged',
};

export const VERIFICATION_TONES = {
  PENDING: 'neutral',
  VERIFIED: 'success',
  MISSING: 'danger',
  DAMAGED: 'warning',
};

export const ALLOCATION_STATUS_TONES = {
  ACTIVE: 'info',
  RETURNED: 'neutral',
  OVERDUE: 'danger',
};
