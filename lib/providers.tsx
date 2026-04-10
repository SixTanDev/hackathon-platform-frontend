'use client';

import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from 'sonner';
import { makeQueryClient } from '@/lib/query-client';
import { WSProvider } from '@/components/ws-provider';
import { I18nProvider } from '@/lib/i18n/context';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState<QueryClient>(() => makeQueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider
        attribute="class"
        defaultTheme="dark"
        enableSystem
      >
        <I18nProvider>
          <WSProvider>{children}</WSProvider>
          <Toaster
            position="top-right"
            richColors
            closeButton
            theme="system"
            toastOptions={{
              className: 'font-sans',
            }}
          />
        </I18nProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
