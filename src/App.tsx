import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SuspenseFallback } from "@/components/SuspenseFallback";

// Eagerly loaded routes (initial page load)
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import NotFound from "./pages/NotFound";

// Lazy loaded routes (code splitting)
const MyDay = lazy(() => import("./pages/MyDay"));
const Calendar = lazy(() => import("./pages/Calendar"));
const Projects = lazy(() => import("./pages/Projects"));
const ProjectDetail = lazy(() => import("./pages/ProjectDetail"));
const NewProject = lazy(() => import("./pages/NewProject"));
const IssuePage = lazy(() => import("./pages/IssuePage"));
const Team = lazy(() => import("./pages/Team"));
const Settings = lazy(() => import("./pages/Settings"));
const Reports = lazy(() => import("./pages/Reports"));

const App = () => (
  <TooltipProvider>
    <Toaster />
    <Sonner />
    <BrowserRouter>
      <Routes>
        {/* Eagerly loaded routes */}
        <Route path="/" element={<Dashboard />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        
        {/* Lazy loaded routes with Suspense */}
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
);

export default App;
