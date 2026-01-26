import { lazy, Suspense } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { queryClient } from "@/lib/queryClient";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { SuspenseFallback } from "@/components/SuspenseFallback";

// Eagerly loaded routes (initial page load)
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import NotFound from "./pages/NotFound";

// Lazy loaded feature routes (code splitting)
const Dashboard = lazy(() => import("./features/dashboard"));
const MyDay = lazy(() => import("./features/myday"));
const Calendar = lazy(() => import("./features/calendar"));
const Projects = lazy(() => import("./features/projects"));
const ProjectDetail = lazy(() => import("./features/projects/ProjectDetail"));
const NewProject = lazy(() => import("./features/projects/NewProject"));
const IssuePage = lazy(() => import("./features/projects/IssuePage"));
const Team = lazy(() => import("./features/team"));
const Settings = lazy(() => import("./features/settings"));
const Reports = lazy(() => import("./features/reports"));

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Eagerly loaded routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            
            {/* Lazy loaded feature routes with Suspense */}
            <Route 
              path="/" 
              element={
                <Suspense fallback={<SuspenseFallback fullScreen />}>
                  <Dashboard />
                </Suspense>
              } 
            />
            <Route 
              path="/my-day" 
              element={
                <Suspense fallback={<SuspenseFallback fullScreen />}>
                  <MyDay />
                </Suspense>
              } 
            />
            <Route 
              path="/calendar" 
              element={
                <Suspense fallback={<SuspenseFallback fullScreen />}>
                  <Calendar />
                </Suspense>
              } 
            />
            <Route 
              path="/projects" 
              element={
                <Suspense fallback={<SuspenseFallback fullScreen />}>
                  <Projects />
                </Suspense>
              } 
            />
            <Route 
              path="/projects/new" 
              element={
                <Suspense fallback={<SuspenseFallback fullScreen />}>
                  <NewProject />
                </Suspense>
              } 
            />
            <Route 
              path="/projects/:id" 
              element={
                <Suspense fallback={<SuspenseFallback fullScreen />}>
                  <ProjectDetail />
                </Suspense>
              } 
            />
            <Route 
              path="/projects/:projectId/issues/:issueId" 
              element={
                <Suspense fallback={<SuspenseFallback fullScreen />}>
                  <IssuePage />
                </Suspense>
              } 
            />
            <Route 
              path="/team" 
              element={
                <Suspense fallback={<SuspenseFallback fullScreen />}>
                  <Team />
                </Suspense>
              } 
            />
            <Route 
              path="/settings" 
              element={
                <Suspense fallback={<SuspenseFallback fullScreen />}>
                  <Settings />
                </Suspense>
              } 
            />
            <Route 
              path="/reports" 
              element={
                <Suspense fallback={<SuspenseFallback fullScreen />}>
                  <Reports />
                </Suspense>
              } 
            />
            
            {/* 404 route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
