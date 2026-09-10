'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import { useAuthStore } from '@/stores/auth-store';
import { useTranslation } from '@/lib/i18n/context';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SedeSwitcher } from '@/components/sede-switcher';
// import { NotificationPanel } from '@/components/notifications/notification-panel';
import {
  Sun,
  Moon,
  LogOut,
  User as UserIcon,
  Settings,
  ChevronDown,
  Menu,
} from 'lucide-react';
import { useMediaQuery } from '@/hooks/use-media-query';
import type { RoleName } from '@/types/api';

interface DashboardTopbarProps {
  onMobileMenuToggle?: () => void;
  role?: RoleName;
}

export function DashboardTopbar({ onMobileMenuToggle, role }: DashboardTopbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const { locale, setLocale, t } = useTranslation();
  const user = useAuthStore((s) => s?.user);
  const currentSede = useAuthStore((s) => s?.currentSede);
  const logout = useAuthStore((s) => s?.logout);
  const storeRole = useAuthStore((s) => s?.currentRole);
  const [mounted, setMounted] = useState(false);
  const isMobile = useMediaQuery('(max-width: 1023px)');
  const isChallengeView = pathname?.includes('/challenges/');
  useEffect(() => {
    setMounted(true);
  }, []);

  function handleLogout() {
    document.cookie = 'hackathon-auth-token=; path=/; max-age=0';
    document.cookie = 'hackathon-context-token=; path=/; max-age=0';
    document.cookie = 'hackathon-role=; path=/; max-age=0';
    logout?.();
    window.location.href = '/';
  }
  const currentRole = role || storeRole;
  const fallbackName = t(`roles.${currentRole || 'user'}`);
  const isDemoUser = user?.full_name?.toLowerCase().includes('demo');
  const displayFullName = isDemoUser || !user?.full_name ? fallbackName : user.full_name;
  const initials = displayFullName

    ?.split?.(' ')
    ?.map?.((n: string) => n?.[0] ?? '')
    ?.join?.('')
    ?.toUpperCase?.()
    ?.slice?.(0, 2) ?? 'U';
  // Mobile assessment mode: hide bulky context controls, but keep quick essentials
  const showNavElements = !(isMobile && isChallengeView);
  const showCompactActions = isMobile && isChallengeView;
  const mobileContextLabel = currentSede?.name ?? t('common.campus');

  return (
    <header className="sticky top-0 z-30 h-14 sm:h-16 border-b border-border/50 bg-card/80 backdrop-blur-sm" role="banner">
      <div className="flex h-full items-center justify-between px-2 sm:px-4 md:px-6">
        <div className="flex min-w-0 items-center gap-1 sm:gap-2">
          {onMobileMenuToggle && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 sm:h-9 sm:w-9 lg:hidden mr-1"
              onClick={onMobileMenuToggle}
              aria-label={t('common.openNavigation')}
            >
              <Menu className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
          )}
          {showNavElements && !isMobile && <SedeSwitcher />}
          {showNavElements && isMobile && (
            <div className="min-w-0 rounded-full border border-border/50 bg-background/80 px-2.5 py-1 text-xs font-medium text-muted-foreground">
              <span className="block max-w-[118px] truncate">{mobileContextLabel}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2.5">
          {(showNavElements || showCompactActions) && (
            <>
              {!showCompactActions && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setLocale(locale === 'es' ? 'en' : 'es')}
                  aria-label={t('common.language')}
                >
                  <span className="text-xs font-extrabold tracking-[0.04em] uppercase">{locale}</span>
                </Button>
              )}

              {mounted && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                  className="h-8 w-8"
                  aria-label={t('theme.toggle')}
                >
                  {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </Button>
              )}
            </>
          )}

          {/* <NotificationPanel /> */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="group h-10 gap-2 rounded-full border border-transparent px-2.5 hover:bg-accent hover:text-accent-foreground"

                aria-label={t('common.userMenu')}              >
                <Avatar className="h-8 w-8 ring-1 ring-border/40">
                  <AvatarImage src={user?.avatar_url || ''} alt={displayFullName} />
                  <AvatarFallback className="text-xs bg-primary/10 text-primary">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden max-w-[140px] truncate text-sm font-medium md:inline">
                  {displayFullName}
                </span>
                {!isMobile && <ChevronDown className="h-3.5 w-3.5 text-muted-foreground transition-colors group-hover:text-primary" />}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium">{displayFullName}</p>
                  <p className="text-xs text-muted-foreground">{user?.email ?? ''}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push('/dashboard/profile')}>
                <UserIcon className="mr-2 h-4 w-4" />
                {t('nav.profile')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push('/dashboard/profile/settings')}>
                <Settings className="mr-2 h-4 w-4" />
                {t('nav.settings')}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                {t('nav.logout')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
