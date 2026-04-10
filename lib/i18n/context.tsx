'use client';

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import esMessages from '@/messages/es.json';
import enMessages from '@/messages/en.json';

export type Locale = 'es' | 'en';

const MESSAGES: Record<Locale, Record<string, string>> = {
  es: esMessages as Record<string, string>,
  en: enMessages as Record<string, string>,
};

interface I18nContextValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
  formatDate: (d: string | Date, opts?: Intl.DateTimeFormatOptions) => string;
  formatNumber: (n: number, opts?: Intl.NumberFormatOptions) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return Object.entries(vars).reduce(
    (acc, [k, v]) => acc.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v)),
    template
  );
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('es');

  useEffect(() => {
    try {
      const saved = localStorage.getItem('app-locale') as Locale | null;
      if (saved === 'en' || saved === 'es') setLocaleState(saved);
    } catch {}
  }, []);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    try { localStorage.setItem('app-locale', l); } catch {}
    document.documentElement.lang = l;
  }, []);

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => {
      const msg = MESSAGES[locale]?.[key] ?? MESSAGES['es']?.[key] ?? key;
      return interpolate(msg, vars);
    },
    [locale]
  );

  const formatDate = useCallback(
    (d: string | Date, opts?: Intl.DateTimeFormatOptions) => {
      const date = typeof d === 'string' ? new Date(d) : d;
      return new Intl.DateTimeFormat(locale === 'es' ? 'es-CO' : 'en-US', {
        dateStyle: 'medium',
        ...opts,
      }).format(date);
    },
    [locale]
  );

  const formatNumber = useCallback(
    (n: number, opts?: Intl.NumberFormatOptions) =>
      new Intl.NumberFormat(locale === 'es' ? 'es-CO' : 'en-US', opts).format(n),
    [locale]
  );

  return (
    <I18nContext.Provider value={{ locale, setLocale, t, formatDate, formatNumber }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useTranslation() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useTranslation must be used within I18nProvider');
  return ctx;
}
