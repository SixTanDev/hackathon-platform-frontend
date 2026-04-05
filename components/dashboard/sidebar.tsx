'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/stores/auth-store';
import { useTranslation } from '@/lib/i18n/context';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/shared/logo';
import { cn } from '@/lib/utils';
import type { RoleName } from '@/types/api';
import {
  LayoutDashboard,
  Trophy,
  Code2,
  Users,
  Medal,
  BarChart3,
  FileText,
  Settings,
  ChevronLeft,
  ChevronRight,
  Send,
  BookOpen,
  Shield,
  GraduationCap,
  User as UserIcon,
  Cpu,
  Globe,
  Server,
  ScrollText,
  Beaker,
  Inbox,
  ClipboardList,
} from 'lucide-react';

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

const ACTIVE_ITEM_STYLES: Record<string, string> = {
  '/dashboard': 'border-[#0f5b82]/18 bg-gradient-to-r from-[#0f5b82]/18 via-[#1a7fb3]/10 to-transparent text-[#0f5b82] shadow-[inset_3px_0_0_0_rgb(15,91,130),0_8px_18px_rgba(15,91,130,0.09)] dark:border-[#35a19d]/18 dark:text-[#7ddce7]',
  '/dashboard/hackathons': 'border-[#35a19d]/18 bg-gradient-to-r from-[#35a19d]/18 via-[#1a7fb3]/10 to-transparent text-[#127c8f] shadow-[inset_3px_0_0_0_rgb(18,124,143),0_8px_18px_rgba(18,124,143,0.08)] dark:border-[#35a19d]/20 dark:text-[#7ddce7]',
  '/dashboard/challenges': 'border-violet-500/20 bg-gradient-to-r from-violet-500/16 via-fuchsia-500/8 to-transparent text-violet-700 shadow-[inset_3px_0_0_0_rgb(109,40,217),0_8px_18px_rgba(109,40,217,0.08)] dark:text-violet-300',
  '/dashboard/teams': 'border-[#248f8b]/18 bg-gradient-to-r from-[#248f8b]/18 via-[#35a19d]/10 to-transparent text-[#1f7a77] shadow-[inset_3px_0_0_0_rgb(31,122,119),0_8px_18px_rgba(31,122,119,0.08)] dark:border-[#35a19d]/20 dark:text-[#86e2cf]',
  '/dashboard/leaderboard': 'border-[#f0b429]/22 bg-gradient-to-r from-[#f0b429]/18 via-[#f7941d]/10 to-transparent text-[#b7791f] shadow-[inset_3px_0_0_0_rgb(183,121,31),0_8px_18px_rgba(240,180,41,0.1)] dark:border-[#f0b429]/24 dark:text-[#ffd36a]',
  '/dashboard/profile': 'border-[#d96c8a]/20 bg-gradient-to-r from-[#d96c8a]/16 via-[#f2a7bb]/10 to-transparent text-[#b84f72] shadow-[inset_3px_0_0_0_rgb(184,79,114),0_8px_18px_rgba(217,108,138,0.08)] dark:text-[#f3b2c3]',
  '/dashboard/documents': 'border-indigo-500/20 bg-gradient-to-r from-indigo-500/16 via-indigo-500/10 to-transparent text-indigo-700 shadow-[inset_3px_0_0_0_rgb(79,70,229),0_8px_18px_rgba(79,70,229,0.08)] dark:text-indigo-300',
  '/dashboard/documents': 'border-indigo-500/20 bg-gradient-to-r from-indigo-500/16 via-indigo-500/10 to-transparent text-indigo-700 shadow-[inset_3px_0_0_0_rgb(79,70,229),0_8px_18px_rgba(79,70,229,0.08)] dark:text-indigo-300',
  '/tutor/dashboard': 'border-sky-500/20 bg-gradient-to-r from-sky-500/16 via-sky-500/10 to-transparent text-sky-700 shadow-[inset_3px_0_0_0_rgb(14,116,144),0_8px_18px_rgba(14,116,144,0.08)] dark:text-sky-300',
  '/tutor/hackathons': 'border-cyan-500/20 bg-gradient-to-r from-cyan-500/16 via-cyan-500/10 to-transparent text-cyan-700 shadow-[inset_3px_0_0_0_rgb(8,145,178),0_8px_18px_rgba(8,145,178,0.08)] dark:text-cyan-300',
  '/tutor/challenges': 'border-violet-500/20 bg-gradient-to-r from-violet-500/16 via-violet-500/10 to-transparent text-violet-700 shadow-[inset_3px_0_0_0_rgb(109,40,217),0_8px_18px_rgba(109,40,217,0.08)] dark:text-violet-300',
  '/tutor/grading': 'border-orange-500/20 bg-gradient-to-r from-orange-500/16 via-orange-500/10 to-transparent text-orange-700 shadow-[inset_3px_0_0_0_rgb(234,88,12),0_8px_18px_rgba(234,88,12,0.08)] dark:text-orange-300',
  '/tutor/documents': 'border-indigo-500/20 bg-gradient-to-r from-indigo-500/16 via-indigo-500/10 to-transparent text-indigo-700 shadow-[inset_3px_0_0_0_rgb(79,70,229),0_8px_18px_rgba(79,70,229,0.08)] dark:text-indigo-300',
  '/tutor/teams': 'border-emerald-500/20 bg-gradient-to-r from-emerald-500/16 via-emerald-500/10 to-transparent text-emerald-700 shadow-[inset_3px_0_0_0_rgb(5,150,105),0_8px_18px_rgba(5,150,105,0.08)] dark:text-emerald-300',
  '/tutor/students': 'border-lime-500/20 bg-gradient-to-r from-lime-500/16 via-lime-500/10 to-transparent text-lime-700 shadow-[inset_3px_0_0_0_rgb(101,163,13),0_8px_18px_rgba(101,163,13,0.08)] dark:text-lime-300',
  '/tutor/ai-generation': 'border-fuchsia-500/20 bg-gradient-to-r from-fuchsia-500/16 via-fuchsia-500/10 to-transparent text-fuchsia-700 shadow-[inset_3px_0_0_0_rgb(192,38,211),0_8px_18px_rgba(192,38,211,0.08)] dark:text-fuchsia-300',
};

const STUDENT_NAV: NavItem[] = [
  { label: 'nav.dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'nav.hackathons', href: '/dashboard/hackathons', icon: Trophy },
  { label: 'nav.challenges', href: '/dashboard/challenges', icon: Code2 },
  { label: 'nav.teams', href: '/dashboard/teams', icon: Users },
  { label: 'nav.leaderboard', href: '/dashboard/leaderboard', icon: BarChart3 },
  { label: 'nav.profile', href: '/dashboard/profile', icon: UserIcon },
];

const TUTOR_NAV: NavItem[] = [
  { label: 'nav.dashboard', href: '/tutor/dashboard', icon: LayoutDashboard },
  { label: 'nav.hackathons', href: '/tutor/hackathons', icon: Trophy },
  { label: 'nav.challengeLibrary', href: '/tutor/challenges', icon: BookOpen },
  { label: 'nav.grading', href: '/tutor/grading', icon: Inbox },
  { label: 'nav.documents', href: '/tutor/documents', icon: FileText },
  { label: 'nav.myTeams', href: '/tutor/teams', icon: Users },
  { label: 'nav.students', href: '/tutor/students', icon: GraduationCap },
  { label: 'nav.aiGeneration', href: '/tutor/ai-generation', icon: Cpu },
];

const ADMIN_NAV: NavItem[] = [
  { label: 'nav.dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
  { label: 'nav.hackathons', href: '/admin/hackathons', icon: Trophy },
  { label: 'nav.challenges', href: '/admin/challenges', icon: Code2 },
  { label: 'nav.users', href: '/admin/users', icon: Users },
  { label: 'nav.documents', href: '/admin/documents', icon: FileText },
  { label: 'nav.analytics', href: '/admin/analytics', icon: BarChart3 },
  { label: 'nav.research', href: '/admin/research-groups', icon: Beaker },
  { label: 'nav.sedeSettings', href: '/admin/settings', icon: Settings },
  { label: 'nav.resources', href: '/admin/resources', icon: ClipboardList },
];

const SUPERADMIN_NAV: NavItem[] = [
  { label: 'nav.globalDashboard', href: '/superadmin', icon: LayoutDashboard },
  { label: 'nav.zones', href: '/superadmin/zones', icon: Globe },
  { label: 'nav.sedes', href: '/superadmin/sedes', icon: Shield },
  { label: 'nav.resources', href: '/superadmin/resources', icon: ClipboardList },
  { label: 'nav.audit', href: '/superadmin/audit', icon: ScrollText },
];

const DIRECTOR_NAV: NavItem[] = [
  { label: 'nav.dashboard', href: '/research/dashboard', icon: LayoutDashboard },
  { label: 'nav.myGroups', href: '/research/groups', icon: Beaker },
  { label: 'nav.hackathons', href: '/research/hackathons', icon: Trophy },
];

const GUEST_NAV: NavItem[] = [
  { label: 'nav.dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'nav.hackathons', href: '/dashboard/hackathons', icon: Trophy },
  { label: 'nav.leaderboard', href: '/dashboard/leaderboard', icon: BarChart3 },
];

function getNavForRole(role: RoleName | null | undefined, isSuperAdmin: boolean): NavItem[] {
  if (isSuperAdmin && (role === 'admin' || !role)) return SUPERADMIN_NAV;
  switch (role) {
    case 'admin':
      return ADMIN_NAV;
    case 'tutor':
      return TUTOR_NAV;
    case 'director_semillero':
      return DIRECTOR_NAV;
    case 'student':
      return STUDENT_NAV;
    case 'guest':
      return GUEST_NAV;
    default:
      return STUDENT_NAV;
  }
}

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  role?: RoleName;
}

export function DashboardSidebar({ collapsed, onToggle, role }: SidebarProps) {
  const pathname = usePathname();
  const { t } = useTranslation();
  const storeRole = useAuthStore((s) => s?.currentRole);
  const user = useAuthStore((s) => s?.user);
  const isSuperAdmin = user?.is_superadmin ?? false;

  const currentRole = role || storeRole;
  const navItems = getNavForRole(currentRole, isSuperAdmin);

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 h-screen bg-card border-r border-border/50 z-40 transition-all duration-300 flex flex-col',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className="h-16 flex items-center px-4 border-b border-border/50">
        <Link href="/dashboard" className="flex items-center gap-3 min-w-0">
          <Logo size={34} animated={false} className="flex-shrink-0" />
          {!collapsed && (
            <div className="min-w-0">
              <span className="block truncate font-semibold text-[0.82rem] tracking-wide text-foreground">
                {t('brand.title')}
              </span>
              <span className="block truncate text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                Plataforma academica
              </span>
            </div>
          )}
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto scrollbar-thin" aria-label="Menú principal">
        {navItems.map((item: NavItem) => {
          const Icon = item?.icon;
          const isRootDashboardItem = item?.href === '/dashboard' || item?.href === '/admin/dashboard' || item?.href === '/tutor/dashboard' || item?.href === '/research/dashboard';
          const isActive = isRootDashboardItem
            ? pathname === item?.href
            : pathname === item?.href || pathname?.startsWith?.(`${item?.href}/`);
          const activeStyles = ACTIVE_ITEM_STYLES[item?.href] ?? 'border-primary/15 bg-gradient-to-r from-primary/16 via-primary/10 to-transparent text-primary shadow-[inset_3px_0_0_0_hsl(var(--primary)),0_8px_18px_rgba(26,127,179,0.08)]';
          return (
            <Link key={item?.href ?? ''} href={item?.href ?? '/dashboard'}>
              <div
                className={cn(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
                  isActive
                    ? activeStyles
                    : 'text-muted-foreground hover:bg-primary/6 hover:text-foreground hover:shadow-[inset_3px_0_0_0_rgba(26,127,179,0.18)]',
                  collapsed && 'justify-center px-0'
                )}
                title={collapsed ? t(item?.label ?? '') : undefined}
              >
                {Icon ? <Icon className="w-4 h-4 flex-shrink-0" /> : null}
                {!collapsed && <span className="truncate">{t(item?.label ?? '')}</span>}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Collapse Toggle */}
      <div className="p-2 border-t border-border/50">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-center"
          onClick={onToggle}
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <>
              <ChevronLeft className="w-4 h-4 mr-2" />
              <span className="text-xs">{t('sidebar.collapse')}</span>
            </>
          )}
        </Button>
      </div>
    </aside>
  );
}
