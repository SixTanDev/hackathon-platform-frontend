'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
import { NotificationPanel } from '@/components/notifications/notification-panel';
import {
  Sun,
  Moon,
  LogOut,
  User as UserIcon,
  Settings,
  ChevronDown,
  Menu,
} from 'lucide-react';
import type { RoleName } from '@/types/api';

interface DashboardTopbarProps {
  onMobileMenuToggle?: () => void;
  role?: RoleName;
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
    document.cookie = 'hackathon-auth-token=; path=/; max-age=0';
    document.cookie = 'hackathon-context-token=; path=/; max-age=0';
    document.cookie = 'hackathon-role=; path=/; max-age=0';
    logout?.();
    window.location.href = '/';
  }

  const initials = (user?.full_name ?? 'U')
    ?.split?.(' ')
    ?.map?.((n: string) => n?.[0] ?? '')
    ?.join?.('')
    ?.toUpperCase?.()
    ?.slice?.(0, 2) ?? 'U';

  return (
    <header className="sticky top-0 z-30 h-16 border-b border-border/50 bg-card/80 backdrop-blur-sm" role="banner">
      <div className="flex h-full items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-2">
          {onMobileMenuToggle && (
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 lg:hidden"
              onClick={onMobileMenuToggle}
              aria-label="Abrir menú de navegación"
            >
              <Menu className="h-5 w-5" />
            </Button>
          )}
          <SedeSwitcher />
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setLocale(locale === 'es' ? 'en' : 'es')}
            aria-label={t('common.language')}
          >
            <span className="text-xs font-extrabold tracking-[0.04em]">{locale === 'es' ? 'EN' : 'ES'}</span>
          </Button>

          {mounted && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="h-9 w-9"
              aria-label={t('theme.toggle')}
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
          )}

          <NotificationPanel />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="group h-10 gap-2 rounded-full border border-transparent px-2.5 hover:bg-accent hover:text-accent-foreground"
                aria-label="Menú de usuario"
              >
                <Avatar className="h-8 w-8 ring-1 ring-border/40">
                  <AvatarImage src={user?.avatar_url || ''} alt={user?.full_name || ''} />
                  <AvatarFallback className="text-xs bg-primary/10 text-primary">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden max-w-[140px] truncate text-sm font-medium md:inline">
                  {user?.full_name ?? 'Usuario'}
                </span>
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground transition-colors group-hover:text-[#8a4b00]" />
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
