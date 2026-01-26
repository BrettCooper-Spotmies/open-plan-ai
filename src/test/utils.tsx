import { ReactElement, ReactNode } from 'react';
import { render, RenderOptions, renderHook } from '@testing-library/react';
import { screen, waitFor, within, fireEvent } from '@testing-library/dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { TooltipProvider } from '@/components/ui/tooltip';
import userEvent from '@testing-library/user-event';

// Create a fresh QueryClient for each test
const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { 
        retry: false,
        gcTime: Infinity,
      },
      mutations: { 
        retry: false,
      },
    },
  });

interface AllTheProvidersProps {
  children: ReactNode;
}

function AllTheProviders({ children }: AllTheProvidersProps) {
  const testQueryClient = createTestQueryClient();

  return (
    <QueryClientProvider client={testQueryClient}>
      <BrowserRouter>
        <TooltipProvider>
          {children}
        </TooltipProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  route?: string;
}

function customRender(
  ui: ReactElement,
  options?: CustomRenderOptions
) {
  // Set up route if provided
  if (options?.route) {
    window.history.pushState({}, 'Test page', options.route);
  }

  return {
    user: userEvent.setup(),
    ...render(ui, { wrapper: AllTheProviders, ...options }),
  };
}

// Create a wrapper for renderHook
export function createWrapper() {
  const queryClient = createTestQueryClient();
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <TooltipProvider>
            {children}
          </TooltipProvider>
        </BrowserRouter>
      </QueryClientProvider>
    );
  };
}

// Export commonly used utilities
export { customRender as render };
export { userEvent };
export { screen, waitFor, within, fireEvent };
export { renderHook };
export type { RenderOptions };
