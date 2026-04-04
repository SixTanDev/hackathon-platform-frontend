'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { useAuthStore } from '@/stores/auth-store';
import { useTranslation } from '@/lib/i18n/context';
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
  ArrowLeft,
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

export function DashboardTopbar({ onMobileMenuToggle, role }: DashboardTopbarProps) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { locale, setLocale, t } = useTranslation();
  const user = useAuthStore((s) => s?.user);
  const storeRole = useAuthStore((s) => s?.currentRole);
  const logout = useAuthStore((s) => s?.logout);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const currentRole = role || storeRole;

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
    <header className="h-16 border-b border-border/50 bg-card/80 backdrop-blur-sm sticky top-0 z-30" role="banner">
      <div className="h-full flex items-center justify-between px-4 md:px-6">
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
          <Button
            asChild
            variant="ghost"
            className="h-9 gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 text-sm font-medium text-primary transition-all duration-300 hover:border-[#f59a23]/45 hover:bg-[#f59a23] hover:text-[#1f1404]"
          >
            <Link href="/" aria-label="Volver a inicio">
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">{t('nav.home')}</span>
            </Link>
          </Button>
        </div>

        <div className="flex items-center gap-1 sm:gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={() => setLocale(locale === 'es' ? 'en' : 'es')}
            aria-label={t('common.language')}
          >
            <span className="text-xs font-bold">{locale === 'es' ? 'EN' : 'ES'}</span>
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

          {/* Context Display (Hidden on very small screens) */}
          <div className="hidden sm:flex items-center gap-2 px-3 h-8 rounded-full bg-muted/50 border border-border/50 ml-2">
             <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                {currentRole === 'admin' ? t('roles.admin') 
                 : currentRole === 'tutor' ? t('roles.tutor')
                 : t('roles.student')}
             </span>
          </div>

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
              <DropdownMenuItem onClick={() => router.push('/dashboard/profile/settings')}>
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
