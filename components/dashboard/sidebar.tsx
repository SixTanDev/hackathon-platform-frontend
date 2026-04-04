'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/stores/auth-store';
import { useTranslation } from '@/lib/i18n/context';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { RoleName } from '@/types/api';
import {
  Zap,
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
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Zap className="w-4 h-4 text-primary" />
          </div>
          {!collapsed && (
            <span className="font-semibold text-[0.82rem] tracking-wide truncate">{t('brand.title')}</span>
          )}
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto scrollbar-thin" aria-label="Menú principal">
        {navItems.map((item: NavItem) => {
          const Icon = item?.icon;
          const isActive = pathname === item?.href || pathname?.startsWith?.(`${item?.href}/`);
          return (
            <Link key={item?.href ?? ''} href={item?.href ?? '/dashboard'}>
              <div
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
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
