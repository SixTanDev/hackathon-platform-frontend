import { Inter, JetBrains_Mono, Anton } from 'next/font/google';
import './globals.css';
import { Providers } from '@/lib/providers';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

const brandFont = Anton({
  subsets: ['latin'],
  variable: '--font-brand',
  weight: '400',
  display: 'swap',
});

export const dynamic = 'force-dynamic';

export function generateMetadata() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

  let metadataBase: URL;
  try {
    metadataBase = new URL(baseUrl);
  } catch {
    metadataBase = new URL('http://localhost:3000');
  }

  return {
    title: 'SAMP | Plataforma',
    description: 'Plataforma de hackathones universitarios',
    metadataBase,
    icons: {
      icon: '/favicon.svg',
      shortcut: '/favicon.svg',
    },
    openGraph: {
      title: 'SAMP | Plataforma',
      description: 'Plataforma de hackathones universitarios',
      images: [{ url: '/og-image.png', width: 1200, height: 630 }],
    },
  };
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <div className={`${inter.variable} ${jetbrainsMono.variable} ${brandFont.variable} font-sans min-h-screen`}>
          <Providers>{children}</Providers>
        </div>
      </body>
    </html>
  );
}
