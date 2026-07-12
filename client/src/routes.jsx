import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { ProtectedRoute } from '@/components/auth/guards';
import { AppShell } from '@/components/layout/AppShell';
import { LoadingState } from '@/components/ui/feedback';

import LoginPage from '@/features/auth/LoginPage';
import SignupPage from '@/features/auth/SignupPage';
import ForgotPasswordPage from '@/features/auth/ForgotPasswordPage';
import OrganizationPage from '@/features/organization/OrganizationPage';
import AssetsPage from '@/features/assets/AssetsPage';
import AllocationPage from '@/features/allocation/AllocationPage';
import BookingPage from '@/features/booking/BookingPage';
import MaintenancePage from '@/features/maintenance/MaintenancePage';
import AuditPage from '@/features/audit/AuditPage';
import NotificationsPage from '@/features/notifications/NotificationsPage';
import DashboardPage from '@/features/dashboard/DashboardPage';
import ReportsPage from '@/features/dashboard/ReportsPage';

// Redirect authenticated users away from auth pages.
function PublicOnly({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingState label="Loading…" />;
  if (user) return <Navigate to="/" replace />;
  return children;
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<PublicOnly><LoginPage /></PublicOnly>} />
      <Route path="/signup" element={<PublicOnly><SignupPage /></PublicOnly>} />
      <Route path="/forgot-password" element={<PublicOnly><ForgotPasswordPage /></PublicOnly>} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/assets" element={<AssetsPage />} />
          <Route path="/allocation" element={<AllocationPage />} />
          <Route path="/booking" element={<BookingPage />} />
          <Route path="/maintenance" element={<MaintenancePage />} />
          <Route path="/audit" element={<AuditPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />

          <Route element={<ProtectedRoute roles={['ADMIN', 'ASSET_MANAGER', 'DEPARTMENT_HEAD']} />}>
            <Route path="/reports" element={<ReportsPage />} />
          </Route>

          <Route element={<ProtectedRoute roles={['ADMIN']} />}>
            <Route path="/organization" element={<OrganizationPage />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
