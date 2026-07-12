import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { ProtectedRoute } from '@/components/auth/guards';
import { AppShell } from '@/components/layout/AppShell';
import { LoadingState } from '@/components/ui/feedback';

import LoginPage from '@/features/auth/LoginPage';
import SignupPage from '@/features/auth/SignupPage';
import ForgotPasswordPage from '@/features/auth/ForgotPasswordPage';
import Placeholder from '@/features/Placeholder';

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
          <Route path="/" element={<Placeholder title="Dashboard" description="Operational snapshot" />} />
          <Route path="/assets" element={<Placeholder title="Assets" description="Asset registration & directory" />} />
          <Route path="/allocation" element={<Placeholder title="Allocation & Transfer" description="Who holds what" />} />
          <Route path="/booking" element={<Placeholder title="Resource Booking" description="Time-slot booking" />} />
          <Route path="/maintenance" element={<Placeholder title="Maintenance" description="Approval workflow" />} />
          <Route path="/audit" element={<Placeholder title="Audit" description="Verification cycles" />} />
          <Route path="/notifications" element={<Placeholder title="Notifications" description="Activity & alerts" />} />

          <Route element={<ProtectedRoute roles={['ADMIN', 'ASSET_MANAGER', 'DEPARTMENT_HEAD']} />}>
            <Route path="/reports" element={<Placeholder title="Reports & Analytics" description="Operational insight" />} />
          </Route>

          <Route element={<ProtectedRoute roles={['ADMIN']} />}>
            <Route path="/organization" element={<Placeholder title="Organization Setup" description="Master data" />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
