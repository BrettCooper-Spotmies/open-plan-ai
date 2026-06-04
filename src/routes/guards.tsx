import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { ROUTES } from '@/shared/constants';
import { AppLayoutSkeleton } from '@/components/layout/AppLayoutSkeleton';

export function AuthGuard() {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return <AppLayoutSkeleton variant="dashboard" />;

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.LOGIN} state={{ from: location }} replace />;
  }

  return <Outlet />;
}

export function GuestGuard() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return null;

  if (isAuthenticated) return <Navigate to={ROUTES.DASHBOARD} replace />;

  return <Outlet />;
}

export function EmailVerifiedGuard() {
  const { isEmailVerified, isAuthenticated, isLoading } = useAuth();

  if (isLoading) return null;
  if (!isAuthenticated) return <Navigate to={ROUTES.LOGIN} replace />;
  if (!isEmailVerified) return <Navigate to={ROUTES.VERIFY_EMAIL} replace />;

  return <Outlet />;
}
