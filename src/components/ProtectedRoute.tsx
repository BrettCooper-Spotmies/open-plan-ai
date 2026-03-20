import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AppLayoutSkeleton } from '@/components/layout/AppLayoutSkeleton';
import { AppLayout } from '@/components/layout/AppLayout';
import { useEffect, useMemo, useState } from 'react';
import { authService } from '@/services/auth.service';

interface ProtectedRouteProps {
  redirectTo?: string;
}

/** Map a pathname to the best-matching AppLayoutSkeleton variant (pure, for easy testing). */
function getSkeletonVariant(pathname: string): 'list' | 'projects' | 'dashboard' | 'detail' | 'project-detail' | 'default' | 'chat' | 'team' | 'settings' | 'notifications' | 'calendar' | 'reports' {
  if (pathname.startsWith('/my-day')) return 'list';
  if (pathname === '/projects' || pathname === '/projects/') return 'projects';
  if (pathname === '/projects/new') return 'detail';
  if (pathname.endsWith('/edit')) return 'detail';
  if (pathname.includes('/issues/')) return 'detail';
  if (pathname.startsWith('/projects/')) return 'project-detail';
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
