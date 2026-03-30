'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/auth-store';
import { apiClient } from '@/lib/api/client';
import { getDashboardPathForRole, ROLE_LABELS, ROLE_COLORS } from '@/lib/auth-helpers';
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
      toast.success(`Cambiado a: ${sede?.sede_name ?? 'Sede'}`);
      router.replace(getDashboardPathForRole(role));
    } catch (err: any) {
      toast.error(err?.detail ?? 'Error al cambiar sede');
    } finally {
      setIsSwitching(null);
    }
  }

  const safeMemberships = memberships ?? [];
  const roleColor = ROLE_COLORS[currentRole ?? 'guest'] ?? '';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-9 gap-2 px-3 max-w-[260px]">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2 h-2 rounded-full bg-secondary flex-shrink-0 animate-pulse-glow" />
            <Building2 className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <span className="text-sm font-medium truncate">
              {currentZone?.name ? `${currentZone.name} › ` : ''}{currentSede?.name ?? 'Sede'}
            </span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium border flex-shrink-0 ${roleColor}`}>
              {ROLE_LABELS[currentRole ?? ''] ?? currentRole ?? ''}
            </span>
          </div>
          <ChevronDown className="h-3 w-3 text-muted-foreground flex-shrink-0" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72">
        <DropdownMenuLabel className="text-xs text-muted-foreground">Mis sedes</DropdownMenuLabel>
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
                        {ROLE_LABELS[sede?.role ?? ''] ?? sede?.role ?? ''}
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
  return (
    <div className="h-9 flex items-center gap-2 px-3">
      <Shield className="w-4 h-4 text-unad-orange flex-shrink-0" />
      <span className="text-sm font-medium">Panel SuperAdmin</span>
      <span className="text-[10px] px-1.5 py-0.5 rounded font-medium border text-unad-orange border-unad-orange/30 bg-unad-orange/10 flex-shrink-0">
        SuperAdmin
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
