import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AppProviders } from '@/shared/providers';
import { useUserStore } from '@/stores/useUserStore';

export function RootProviders({ children }: { children: React.ReactNode }) {
  const defaultTheme = useUserStore.getState().preferences.theme;

  return (
    <AppProviders defaultTheme={defaultTheme}>
      <BrowserRouter>
        {children}
      </BrowserRouter>
    </AppProviders>
  );
}
