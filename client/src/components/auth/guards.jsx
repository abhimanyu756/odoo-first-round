import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { LoadingState } from '@/components/ui/feedback';

// Blocks unauthenticated users; optionally restricts to specific roles.
export function ProtectedRoute({ roles }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <LoadingState label="Restoring session…" />;
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;

  return <Outlet />;
}

// Conditionally render children based on the current user's role.
export function RoleGate({ roles, children, fallback = null }) {
  const { user } = useAuth();
  if (!user || (roles && !roles.includes(user.role))) return fallback;
  return children;
}

// Convenience booleans.
export function useRole() {
  const { user } = useAuth();
  const role = user?.role;
  return {
    role,
    isAdmin: role === 'ADMIN',
    isAssetManager: role === 'ASSET_MANAGER',
    isDeptHead: role === 'DEPARTMENT_HEAD',
    isEmployee: role === 'EMPLOYEE',
    isManager: role === 'ADMIN' || role === 'ASSET_MANAGER' || role === 'DEPARTMENT_HEAD',
  };
}
