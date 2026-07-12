import {
  LayoutDashboard,
  Building2,
  Boxes,
  ArrowLeftRight,
  CalendarClock,
  Wrench,
  ClipboardCheck,
  BarChart3,
  Bell,
} from 'lucide-react';

// Sidebar nav (matches the mockups). `roles` limits visibility; undefined = all roles.
export const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/organization', label: 'Organization Setup', icon: Building2, roles: ['ADMIN'] },
  { to: '/assets', label: 'Assets', icon: Boxes },
  { to: '/allocation', label: 'Allocation & Transfer', icon: ArrowLeftRight },
  { to: '/booking', label: 'Resource Booking', icon: CalendarClock },
  { to: '/maintenance', label: 'Maintenance', icon: Wrench },
  { to: '/audit', label: 'Audit', icon: ClipboardCheck },
  {
    to: '/reports',
    label: 'Reports',
    icon: BarChart3,
    roles: ['ADMIN', 'ASSET_MANAGER', 'DEPARTMENT_HEAD'],
  },
  { to: '/notifications', label: 'Notifications', icon: Bell },
];
