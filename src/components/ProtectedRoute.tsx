import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AppLayoutSkeleton } from '@/components/layout/AppLayoutSkeleton';
import { AppLayout } from '@/components/layout/AppLayout';
import { useEffect, useState } from 'react';
import { authService } from '@/services/auth.service';

interface ProtectedRouteProps {
  redirectTo?: string;
}

/** Map a pathname to the best-matching AppLayoutSkeleton variant */
function getSkeletonVariant(pathname: string): 'list' | 'projects' | 'dashboard' | 'detail' | 'default' | 'chat' | 'team' | 'settings' | 'notifications' | 'calendar' | 'reports' {
  if (pathname.startsWith('/my-day')) return 'list';
  if (pathname === '/projects' || pathname === '/projects/') return 'projects';
  if (pathname.startsWith('/projects/')) return 'detail';
  if (pathname.startsWith('/dashboard') || pathname === '/') return 'dashboard';
  if (pathname.startsWith('/chat')) return 'chat';
  if (pathname.startsWith('/team')) return 'team';
  if (pathname.startsWith('/settings')) return 'settings';
  if (pathname.startsWith('/notifications')) return 'notifications';
  if (pathname.startsWith('/calendar')) return 'calendar';
  if (pathname.startsWith('/reports')) return 'reports';
  return 'default';
}

export function ProtectedRoute({ redirectTo = '/login' }: ProtectedRouteProps) {
  const { isAuthenticated, isEmailVerified, isLoading, user, signOut } = useAuth();
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

  if (isLoading) {
    const variant = getSkeletonVariant(location.pathname);
    const requiresNoPadding = variant === 'calendar' || variant === 'chat';
    return (
      <AppLayout noPadding={requiresNoPadding}>
        <AppLayoutSkeleton variant={variant} />
      </AppLayout>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
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
