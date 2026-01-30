import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AppLayoutSkeleton } from '@/components/layout/AppLayoutSkeleton';
import { useEffect, useState } from 'react';
import { authService } from '@/services/auth.service';

interface ProtectedRouteProps {
  redirectTo?: string;
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
        // Send a new OTP
        await authService.sendOtp(user.email);
        // Sign out the user
        await signOut();
      }
    };
    handleUnverifiedEmail();
  }, [isAuthenticated, isEmailVerified, user?.email, isRedirecting, signOut]);

  if (isLoading) {
    return <AppLayoutSkeleton variant="default" />;
  }

  if (!isAuthenticated) {
    // Save the attempted URL for redirecting after login
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  // If authenticated but email not verified, redirect to verify-email
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
