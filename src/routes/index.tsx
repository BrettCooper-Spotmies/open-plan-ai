import React, { Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { AppLayoutOutlet } from '@/components/layout/AppLayoutOutlet';
import { AppLayoutSkeleton } from '@/components/layout/AppLayoutSkeleton';
import { AuthGuard } from './guards';
import {
  LoginPage,
  SignupPage,
  ForgotPasswordPage,
  ResetPasswordPage,
  VerifyEmailPage,
  NotFoundPage,
  JoinOrganizationPage,
  DashboardPage,
  MyDayPage,
  CalendarPage,
  ProjectsPage,
  ProjectDetailPage,
  NewProjectPage,
  EditProjectPage,
  IssuePageComponent,
  TeamPage,
  SettingsPage,
  ReportsPage,
  NotificationsPage,
  ChatPage,
} from './config';

function WithSuspense({
  children,
  variant = 'dashboard',
}: {
  children: React.ReactNode;
  variant?: React.ComponentProps<typeof AppLayoutSkeleton>['variant'];
}) {
  return <Suspense fallback={<AppLayoutSkeleton variant={variant} />}>{children}</Suspense>;
}

export function AppRoutes() {
  return (
    <Routes>
      {/* Public / guest routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/verify-email" element={<VerifyEmailPage />} />
      <Route path="/join-org" element={<JoinOrganizationPage />} />

      {/* Protected routes */}
      <Route element={<AuthGuard />}>
        {/* Standard padded layout */}
        <Route element={<AppLayoutOutlet />}>
          <Route
            path="/"
            element={<WithSuspense variant="dashboard"><DashboardPage /></WithSuspense>}
          />
          <Route
            path="/my-day"
            element={<WithSuspense variant="list"><MyDayPage /></WithSuspense>}
          />
          <Route
            path="/projects"
            element={<WithSuspense variant="projects"><ProjectsPage /></WithSuspense>}
          />
          <Route
            path="/projects/new"
            element={<WithSuspense variant="detail"><NewProjectPage /></WithSuspense>}
          />
          <Route
            path="/projects/:id"
            element={<WithSuspense variant="project-detail"><ProjectDetailPage /></WithSuspense>}
          />
          <Route
            path="/projects/:id/edit"
            element={<WithSuspense variant="detail"><EditProjectPage /></WithSuspense>}
          />
          <Route
            path="/projects/:projectId/issues/:issueId"
            element={<WithSuspense variant="detail"><IssuePageComponent /></WithSuspense>}
          />
          <Route
            path="/team"
            element={<WithSuspense variant="team"><TeamPage /></WithSuspense>}
          />
          <Route
            path="/settings"
            element={<WithSuspense variant="settings"><SettingsPage /></WithSuspense>}
          />
          <Route
            path="/reports"
            element={<WithSuspense variant="reports"><ReportsPage /></WithSuspense>}
          />
          <Route
            path="/notifications"
            element={<WithSuspense variant="notifications"><NotificationsPage /></WithSuspense>}
          />
        </Route>

        {/* No-padding layout */}
        <Route element={<AppLayoutOutlet noPadding />}>
          <Route
            path="/calendar"
            element={<WithSuspense variant="calendar"><CalendarPage /></WithSuspense>}
          />
          <Route
            path="/chat"
            element={<WithSuspense variant="chat"><ChatPage /></WithSuspense>}
          />
          <Route
            path="/chat/:conversationId"
            element={<WithSuspense variant="chat"><ChatPage /></WithSuspense>}
          />
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
