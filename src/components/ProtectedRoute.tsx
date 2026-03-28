import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AppLayoutSkeleton } from '@/components/layout/AppLayoutSkeleton';
import { AppLayout } from '@/components/layout/AppLayout';
import { useEffect, useMemo, useState } from 'react';
import { authService } from '@/services/auth.service';
import { getSkeletonVariant } from '@/utils/route-skeleton';
import { mustCompletePasswordResetFlow } from '@/utils/authRecovery';

interface ProtectedRouteProps {
  redirectTo?: string;
}



export function ProtectedRoute({ redirectTo = '/login' }: ProtectedRouteProps) {
  const { isAuthenticated, isEmailVerified, isLoading, user, session, signOut } = useAuth();
  const location = useLocation();
  const [isRedirecting, setIsRedirecting] = useState(false);

  // Handle unverified email - send OTP and sign out, then redirect
  useEffect(() => {
    const handleUnverifiedEmail = async () => {
      if (isAuthenticated && !isEmailVerified && user?.email && !isRedirecting) {
        setIsRedirecting(true);
        await authService.sendOtp(user.email);
        await signOut();
      }
    };
    handleUnverifiedEmail();
  }, [isAuthenticated, isEmailVerified, user?.email, isRedirecting, signOut]);

  const skeletonVariant = useMemo(() => getSkeletonVariant(location.pathname), [location.pathname]);

  if (isLoading) {
    const requiresNoPadding = skeletonVariant === 'calendar' || skeletonVariant === 'chat';
    return (
      <AppLayout noPadding={requiresNoPadding}>
        <AppLayoutSkeleton variant={skeletonVariant} />
      </AppLayout>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  if (session && mustCompletePasswordResetFlow(session)) {
    return <Navigate to="/reset-password" replace />;
  }

  if (!isEmailVerified && user?.email) {
    return (
      <Navigate
        to="/verify-email"
        state={{
          email: user.email,
          fromLogin: true,
          message: "Please verify your email to access your account."
        }}
        replace
      />
    );
  }

  return <Outlet />;
}
