import { lazy } from 'react';

// Auth pages — eagerly loaded (tiny, needed immediately)
export { default as LoginPage } from '@/pages/Login';
export { default as SignupPage } from '@/pages/Signup';
export { default as ForgotPasswordPage } from '@/pages/ForgotPassword';
export { default as ResetPasswordPage } from '@/pages/ResetPassword';
export { default as VerifyEmailPage } from '@/pages/VerifyEmail';
export { default as NotFoundPage } from '@/pages/NotFound';
export { default as JoinOrganizationPage } from '@/pages/JoinOrganization';

// Feature modules — lazily loaded with separate chunks
export const DashboardPage = lazy(() => import('@/features/dashboard'));
export const MyDayPage = lazy(() => import('@/features/myday'));
export const CalendarPage = lazy(() => import('@/features/calendar'));
export const ProjectsPage = lazy(() => import('@/features/projects'));
export const ProjectDetailPage = lazy(() => import('@/features/projects/ProjectDetail'));
export const NewProjectPage = lazy(() => import('@/features/projects/NewProject'));
export const EditProjectPage = lazy(() => import('@/features/projects/EditProject'));
export const IssuePageComponent = lazy(() => import('@/features/projects/IssuePage'));
export const TeamPage = lazy(() => import('@/features/team'));
export const SettingsPage = lazy(() => import('@/features/settings'));
export const ReportsPage = lazy(() => import('@/features/reports'));
export const NotificationsPage = lazy(() => import('@/features/notifications'));
export const ChatPage = lazy(() => import('@/features/chat'));
