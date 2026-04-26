'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/auth-store';
import { useTranslation } from '@/lib/i18n/context';
import { apiClient } from '@/lib/api/client';
import { getDashboardPathForRole, ROLE_COLORS } from '@/lib/auth-helpers';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { ContextTokenResponse, ZoneMembershipInfo, SedeMembershipInfo } from '@/types/api';
import { Building2, ChevronDown, Check, Loader2, Globe, Shield } from 'lucide-react';

// ─── Regular user sede switcher ─────────────────────────────────────────────

function RegularSedeSwitcher() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const memberships = useAuthStore((s) => s?.memberships);
  const accessToken = useAuthStore((s) => s?.accessToken);
  const currentSede = useAuthStore((s) => s?.currentSede);
  const currentZone = useAuthStore((s) => s?.currentZone);
  const currentRole = useAuthStore((s) => s?.currentRole);
  const selectContext = useAuthStore((s) => s?.selectContext);
  const [isSwitching, setIsSwitching] = useState<string | null>(null);

  async function handleSwitch(zone: ZoneMembershipInfo, sede: SedeMembershipInfo) {
    if (sede?.sede_id === currentSede?.id && zone?.zone_id === currentZone?.id) return;

    const key = `${zone?.zone_id}-${sede?.sede_id}`;
    setIsSwitching(key);

    try {
      const { data } = await apiClient.post<ContextTokenResponse>(
        '/auth/select-context',
        { zone_id: zone?.zone_id ?? '', sede_id: sede?.sede_id ?? '' },
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      const role = data?.role ?? sede?.role ?? 'guest';

      selectContext?.({
        contextToken: data?.context_token ?? '',
        zone: { id: zone?.zone_id ?? '', code: zone?.zone_code ?? '', name: zone?.zone_name ?? '' },
        sede: { id: sede?.sede_id ?? '', name: sede?.sede_name ?? '', slug: sede?.sede_slug ?? '' },
        role,
      });

      queryClient.clear();
      toast.success(t('common.switchSuccess', { name: sede?.sede_name ?? 'Sede' }));
      router.replace(getDashboardPathForRole(role));
    } catch (err: any) {
      toast.error(err?.detail ?? t('common.switchError'));

    } finally {
      setIsSwitching(null);
    }
  }

  const safeMemberships = memberships ?? [];
  const roleColor = ROLE_COLORS[currentRole ?? 'guest'] ?? '';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>

        <Button 
          variant="outline" 
          className="h-9 gap-1 sm:gap-2 px-2 sm:px-3 max-w-[140px] sm:max-w-[200px] md:max-w-[260px] bg-background/50 hover:bg-background hover:border-primary/30 transition-all shadow-sm"
        >
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-secondary flex-shrink-0 shadow-[0_0_8px_rgba(var(--secondary),0.5)]" />
            <Building2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground flex-shrink-0" />
            <span className="text-[13px] sm:text-sm font-medium truncate">
              {currentZone?.name ? `${currentZone.name} › ` : ''}{currentSede?.name ?? 'Sede'}
            </span>
            <span className={`hidden sm:inline-flex text-[10px] px-1.5 py-0.5 rounded font-medium border flex-shrink-0 ${roleColor}`}>
              {t(`roles.${currentRole || 'user'}`)}
            </span>
          </div>
          <ChevronDown className="w-3 h-3 text-muted-foreground flex-shrink-0" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72">
        <DropdownMenuLabel className="text-xs text-muted-foreground">{t('common.mySedes')}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {safeMemberships.map((zone: ZoneMembershipInfo) => (
          <DropdownMenuGroup key={zone?.zone_id ?? ''}>
            <DropdownMenuLabel className="text-xs font-normal text-muted-foreground flex items-center gap-1.5">
              <Globe className="w-3 h-3" />
              {zone?.zone_name ?? 'Zona'}
            </DropdownMenuLabel>
            {(zone?.sedes ?? []).map((sede: SedeMembershipInfo) => {
              const isActive = sede?.sede_id === currentSede?.id && zone?.zone_id === currentZone?.id;
              const switchKey = `${zone?.zone_id}-${sede?.sede_id}`;
              const loading = isSwitching === switchKey;
              const sedeRoleColor = ROLE_COLORS[sede?.role ?? 'guest'] ?? '';
              return (
                <DropdownMenuItem
                  key={sede?.sede_id ?? ''}
                  onClick={() => handleSwitch(zone, sede)}
                  disabled={isSwitching !== null}
                  className="cursor-pointer"
                >
                  <div className="flex items-center justify-between w-full gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {isActive ? (
                        <Check className="w-4 h-4 text-secondary flex-shrink-0" />
                      ) : (
                        <Building2 className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      )}
                      <span className={`text-sm truncate ${isActive ? 'font-semibold' : ''}`}>
                        {sede?.sede_name ?? 'Sede'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium border ${sedeRoleColor}`}>
                        {t(`roles.${sede?.role || 'user'}`)}
                      </span>
                      {loading && <Loader2 className="w-3 h-3 animate-spin" />}
                    </div>
                  </div>
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuGroup>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ─── SuperAdmin static label (zone selector moved to sedes page) ────────────

function SuperAdminLabel() {

  const { t } = useTranslation();
  return (
    <div className="h-9 flex items-center gap-2 px-3 bg-primary/5 rounded-full border border-primary/20 shadow-sm">
      <Shield className="w-4 h-4 text-[#004669] flex-shrink-0" />
      <span className="text-[13px] font-bold text-[#004669]">{t('admin.hero.title')}</span>
      <span className="text-[10px] px-2 py-0.5 rounded font-black border text-[#004669] border-[#004669]/40 bg-[#004669]/10 flex-shrink-0 uppercase tracking-wider">
        {t('roles.admin')}
      </span>
    </div>
  );
}

// ─── Exported component: branches by role ───────────────────────────────────

export function SedeSwitcher() {
  const isSuperAdmin = useAuthStore((s) => s?.user?.is_superadmin === true);

  if (isSuperAdmin) {
    return <SuperAdminLabel />;
  }

  return <RegularSedeSwitcher />;
}
