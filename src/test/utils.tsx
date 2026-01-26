import { ReactElement, ReactNode } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
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
        {children}
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

// Re-export everything from testing-library
export * from '@testing-library/react';
export { customRender as render };
export { userEvent };
