'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { useAuthStore } from '@/stores/auth-store';
import { useTranslation, type Locale } from '@/lib/i18n/context';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SedeSwitcher } from '@/components/sede-switcher';
import { NotificationPanel } from '@/components/notifications/notification-panel';
import {
  Sun,
  Moon,
  LogOut,
  User as UserIcon,
  Settings,
  ChevronDown,
  Languages,
  Menu,
} from 'lucide-react';

interface DashboardTopbarProps {
  onMobileMenuToggle?: () => void;
}

export function DashboardTopbar({ onMobileMenuToggle }: DashboardTopbarProps) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { locale, setLocale, t } = useTranslation();
  const user = useAuthStore((s) => s?.user);
  const logout = useAuthStore((s) => s?.logout);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  function handleLogout() {
    // Clear cookies synchronously BEFORE clearing store, so middleware sees unauthenticated state
    document.cookie = 'hackathon-auth-token=; path=/; max-age=0';
    document.cookie = 'hackathon-context-token=; path=/; max-age=0';
    logout?.();
    // Use window.location for a full page navigation to ensure middleware runs fresh
    window.location.href = '/login';
  }

  const initials = (user?.full_name ?? 'U')
    ?.split?.(' ')
    ?.map?.((n: string) => n?.[0] ?? '')
    ?.join?.('')
    ?.toUpperCase?.()
    ?.slice?.(0, 2) ?? 'U';

  return (
    <header className="h-16 border-b border-border/50 bg-card/80 backdrop-blur-sm sticky top-0 z-30" role="banner">
      <div className="h-full flex items-center justify-between px-4 md:px-6">
        {/* Left: Mobile hamburger + Sede switcher */}
        <div className="flex items-center gap-2">
          {onMobileMenuToggle && (
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 md:hidden"
              onClick={onMobileMenuToggle}
              aria-label="Abrir menú de navegación"
            >
              <Menu className="h-5 w-5" />
            </Button>
          )}
          <SedeSwitcher />
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Language Toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={() => setLocale(locale === 'es' ? 'en' : 'es')}
            aria-label={t('common.language')}
            title={locale === 'es' ? 'Switch to English' : 'Cambiar a Español'}
          >
            <span className="text-xs font-bold">{locale === 'es' ? 'EN' : 'ES'}</span>
          </Button>

          {/* Theme Toggle */}
          {mounted && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="h-9 w-9"
              aria-label={t('theme.toggle')}
            >
              {theme === 'dark' ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </Button>
          )}

          {/* Notifications */}
          <NotificationPanel />

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-9 gap-2 px-2" aria-label="Menú de usuario">
                <Avatar className="h-7 w-7">
                  <AvatarFallback className="text-xs bg-primary/10 text-primary">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium hidden md:inline max-w-[120px] truncate">
                  {user?.full_name ?? 'Usuario'}
                </span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium">{user?.full_name ?? 'Usuario'}</p>
                  <p className="text-xs text-muted-foreground">{user?.email ?? ''}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push('/dashboard/profile')}>
                <UserIcon className="w-4 h-4 mr-2" />
                {t('nav.profile')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push('/dashboard/settings')}>
                <Settings className="w-4 h-4 mr-2" />
                {t('nav.settings')}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
                <LogOut className="w-4 h-4 mr-2" />
                {t('nav.logout')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
