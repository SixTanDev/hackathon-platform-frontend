'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { DashboardSidebar } from '@/components/dashboard/sidebar';
import { DashboardTopbar } from '@/components/dashboard/topbar';
import { AuthCookieSync } from '@/components/auth-cookie-sync';
import { HackathonLiveBanner } from '@/components/hackathon-live-banner';
import { FlashChallengeAlert } from '@/components/flash-challenge-alert';
import { ScorePopup } from '@/components/gamification/score-popup';
import { BadgeEarned } from '@/components/gamification/badge-earned';
import { ImpersonationBanner } from '@/components/superadmin/impersonation-banner';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Loader2 } from 'lucide-react';
import { useMediaQuery } from '@/hooks/use-media-query';
import type { RoleName } from '@/types/api';

interface DashboardShellProps {
  children: React.ReactNode;
  /** If true, allows access without a context token (SuperAdmin global) */
  allowNoContext?: boolean;
  /** Force a specific role for navigation and badges */
  role?: RoleName;
}

export function DashboardShell({ children, allowNoContext = false, role }: DashboardShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const isAuthenticated = useAuthStore((s) => s?.isAuthenticated);
  const contextToken = useAuthStore((s) => s?.contextToken);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const isMobile = useMediaQuery('(max-width: 1023px)');

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close mobile sidebar on navigation
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mounted) return;
    if (!isAuthenticated) {
      router.replace('/login');
    } else if (!contextToken && !allowNoContext) {
      router.replace('/select-sede');
    }
  }, [isAuthenticated, contextToken, mounted, router, allowNoContext]);

  const toggleMobile = useCallback(() => setMobileOpen((p) => !p), []);

  if (!mounted || !isAuthenticated || (!contextToken && !allowNoContext)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AuthCookieSync />

      {/* Desktop sidebar */}
      <div className="hidden lg:block">
        <DashboardSidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
          role={role}
        />
      </div>

      {/* Mobile sidebar via Sheet */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="p-0 w-64">
          <DashboardSidebar 
            collapsed={false} 
            onToggle={() => setMobileOpen(false)} 
            role={role}
          />
        </SheetContent>
      </Sheet>

      <div
        className={`transition-all duration-300 ${
          isMobile ? 'ml-0' : sidebarCollapsed ? 'ml-16' : 'ml-64'
        }`}
      >
        <ImpersonationBanner />
        <HackathonLiveBanner />
        <DashboardTopbar onMobileMenuToggle={toggleMobile} role={role} />
        <main className="p-4 md:p-6 max-w-[1200px] mx-auto" role="main">
          {children}
        </main>
        <FlashChallengeAlert />
        <ScorePopup />
        <BadgeEarned />
      </div>
    </div>
  );
}
