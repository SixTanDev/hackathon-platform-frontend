import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { makeQueryClient } from '@/lib/query-client';
import { TooltipProvider } from '@/components/ui/tooltip';

/**
 * Custom render function that wraps components in all necessary providers
 * for integration-style tests (QueryClient, Tooltip, etc.)
 */
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  const queryClient = makeQueryClient();
  // Override default query options for testing to make it synchronous and deterministic
  queryClient.setDefaultOptions({
    queries: {
      retry: false,
      staleTime: Infinity,
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        {children}
      </TooltipProvider>
    </QueryClientProvider>
  );
};

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) => render(ui, { wrapper: AllTheProviders, ...options });

// Re-export everything from RTL
export * from '@testing-library/react';

// Override render method
export { customRender as render };
