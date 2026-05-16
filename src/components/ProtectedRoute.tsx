import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
  requireVerified?: boolean;
}

export function ProtectedRoute({ requireVerified = true }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, isEmailVerified, pendingVerificationEmail } = useAuth();

  if (isLoading) return null;

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requireVerified && !isEmailVerified) {
    return (
      <Navigate
        to="/verify-email"
        state={{ email: pendingVerificationEmail, fromLogin: true }}
        replace
      />
    );
  }

  return <Outlet />;
}

export default ProtectedRoute;
