import { lazy, Suspense } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { queryClient } from "@/lib/queryClient";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AppLayoutSkeleton } from "@/components/layout/AppLayoutSkeleton";
import { AuthProvider } from "@/contexts/AuthContext";
import { OrganizationProvider } from "@/contexts/OrganizationContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useUserStore } from "@/stores/useUserStore";

// Eagerly loaded routes (initial page load)
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import VerifyEmail from "./pages/VerifyEmail";
import NotFound from "./pages/NotFound";
import JoinOrganization from "./pages/JoinOrganization";

// Lazy loaded feature routes (code splitting)
const Dashboard = lazy(() => import("./features/dashboard"));
const MyDay = lazy(() => import("./features/myday"));
const Calendar = lazy(() => import("./features/calendar"));
const Projects = lazy(() => import("./features/projects"));
const ProjectDetail = lazy(() => import("./features/projects/ProjectDetail"));
const NewProject = lazy(() => import("./features/projects/NewProject"));
const EditProject = lazy(() => import("./features/projects/EditProject"));
const IssuePage = lazy(() => import("./features/projects/IssuePage"));
const Team = lazy(() => import("./features/team"));
const Settings = lazy(() => import("./features/settings"));
const Reports = lazy(() => import("./features/reports"));
const Notifications = lazy(() => import("./features/notifications"));
const Chat = lazy(() => import("./features/chat"));

const App = () => {
  const storedTheme = useUserStore.getState().preferences.theme;

  return (
  <ThemeProvider attribute="class" defaultTheme={storedTheme} enableSystem disableTransitionOnChange>
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <OrganizationProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                {/* Public routes */}
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/verify-email" element={<VerifyEmail />} />
                <Route path="/join-org" element={<JoinOrganization />} />

                {/* Protected routes */}
                <Route element={<ProtectedRoute />}>
                  <Route
                    path="/"
                    element={
                      <Suspense fallback={<AppLayoutSkeleton variant="dashboard" />}>
                        <Dashboard />
                      </Suspense>
                    }
                  />
                  <Route
                    path="/my-day"
                    element={
                      <Suspense fallback={<AppLayoutSkeleton variant="list" />}>
                        <MyDay />
                      </Suspense>
                    }
                  />
                  <Route
                    path="/calendar"
                    element={
                      <Suspense fallback={<AppLayoutSkeleton variant="default" />}>
                        <Calendar />
                      </Suspense>
                    }
                  />
                  <Route
                    path="/projects"
                    element={
                      <Suspense fallback={<AppLayoutSkeleton variant="list" />}>
                        <Projects />
                      </Suspense>
                    }
                  />
                  <Route
                    path="/projects/new"
                    element={
                      <Suspense fallback={<AppLayoutSkeleton variant="detail" />}>
                        <NewProject />
                      </Suspense>
                    }
                  />
                  <Route
                    path="/projects/:id"
                    element={
                      <Suspense fallback={<AppLayoutSkeleton variant="detail" />}>
                        <ProjectDetail />
                      </Suspense>
                    }
                  />
                  <Route
                    path="/projects/:id/edit"
                    element={
                      <Suspense fallback={<AppLayoutSkeleton variant="detail" />}>
                        <EditProject />
                      </Suspense>
                    }
                  />
                  <Route
                    path="/projects/:projectId/issues/:issueId"
                    element={
                      <Suspense fallback={<AppLayoutSkeleton variant="detail" />}>
                        <IssuePage />
                      </Suspense>
                    }
                  />
                  <Route
                    path="/team"
                    element={
                      <Suspense fallback={<AppLayoutSkeleton variant="list" />}>
                        <Team />
                      </Suspense>
                    }
                  />
                  <Route
                    path="/settings"
                    element={
                      <Suspense fallback={<AppLayoutSkeleton variant="detail" />}>
                        <Settings />
                      </Suspense>
                    }
                  />
                  <Route
                    path="/reports"
                    element={
                      <Suspense fallback={<AppLayoutSkeleton variant="dashboard" />}>
                        <Reports />
                      </Suspense>
                    }
                  />
                  <Route
                    path="/notifications"
                    element={
                      <Suspense fallback={<AppLayoutSkeleton variant="list" />}>
                        <Notifications />
                      </Suspense>
                    }
                  />
                  <Route
                    path="/chat"
                    element={
                      <Suspense fallback={<AppLayoutSkeleton variant="default" />}>
                        <Chat />
                      </Suspense>
                    }
                  />
                  <Route
                    path="/chat/:conversationId"
                    element={
                      <Suspense fallback={<AppLayoutSkeleton variant="default" />}>
                        <Chat />
                      </Suspense>
                    }
                  />
                </Route>

                {/* 404 route */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </OrganizationProvider>
      </AuthProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  </ErrorBoundary>
  </ThemeProvider>
  );
};

export default App;

