import React from 'react';
import '@testing-library/jest-dom';
import { vi } from 'vitest';

// --- Mocks Globales Next.js ---
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '',
  useParams: () => ({}),
}));

// --- Mocks Globales NextAuth ---
vi.mock('next-auth/react', () => ({
  useSession: () => ({
    data: null,
    status: 'unauthenticated',
  }),
  SessionProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// --- Mocks Globales Framer Motion ---
vi.mock('framer-motion', async () => {
  const actual = (await vi.importActual('framer-motion')) as any;
  return {
    ...actual,
    motion: {
      ...actual.motion,
      div: ({ children, ...props }: any) => React.createElement('div', props, children),
    },
    AnimatePresence: ({ children }: any) => children,
  };
});

// --- Mocks Globales UI / Browser ---
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock para scrollIntoView (usado por Radix)
window.HTMLElement.prototype.scrollIntoView = vi.fn();
