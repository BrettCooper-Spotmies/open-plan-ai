import React, { useEffect } from 'react';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { AppRoutes } from '@/routes';
import { RootProviders } from './providers';
import { initSentry, initWebVitals } from '@/core/monitoring';
import { socketManager } from '@/core/websocket';
import { useAuth } from '@/contexts/AuthContext';

function SocketLifecycle() {
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      socketManager.connect();
    } else {
      socketManager.disconnect();
    }
    return () => {
      socketManager.disconnect();
    };
  }, [isAuthenticated]);

  return null;
}

export function App() {
  useEffect(() => {
    initSentry();
    initWebVitals();
  }, []);

  return (
    <ErrorBoundary>
      <RootProviders>
        <SocketLifecycle />
        <AppRoutes />
      </RootProviders>
    </ErrorBoundary>
  );
}
