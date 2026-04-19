'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/auth-store';
import { apiClient } from '@/lib/api/client';
import { getDashboardPathForRole, ROLE_LABELS, ROLE_COLORS } from '@/lib/auth-helpers';
import type { ContextTokenResponse, ZoneMembershipInfo, SedeMembershipInfo } from '@/types/api';
import { Logo } from '@/components/shared/logo';
import { Building2, MapPin, ChevronRight, LogOut, Loader2, Shield, Globe } from 'lucide-react';

/** Set auth cookies immediately so middleware allows navigation */
function syncCookies(accessToken: string, role: string, contextToken?: string) {
  document.cookie = `hackathon-auth-token=${accessToken}; path=/; SameSite=Lax; max-age=86400`;
  document.cookie = `hackathon-role=${role}; path=/; SameSite=Lax; max-age=86400`;
  if (contextToken) {
    document.cookie = `hackathon-context-token=${contextToken}; path=/; SameSite=Lax; max-age=86400`;
  }
}

export default function SelectSedePage() {
  const router = useRouter();
  const memberships = useAuthStore((s) => s?.memberships);
  const accessToken = useAuthStore((s) => s?.accessToken);
  const selectContext = useAuthStore((s) => s?.selectContext);
  const logout = useAuthStore((s) => s?.logout);
  const user = useAuthStore((s) => s?.user);
  const [isSelecting, setIsSelecting] = useState<string | null>(null);

  async function handleSelectSede(zone: ZoneMembershipInfo, sede: SedeMembershipInfo) {
    const key = `${zone?.zone_id}-${sede?.sede_id}`;
    setIsSelecting(key);

    try {
      const { data } = await apiClient.post<ContextTokenResponse>(
        '/auth/select-context',
        {
          zone_id: zone?.zone_id ?? '',
          sede_id: sede?.sede_id ?? '',
        },
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      const role = data?.role ?? sede?.role ?? 'guest';

      selectContext?.({
        contextToken: data?.context_token ?? '',
        zone: {
          id: zone?.zone_id ?? '',
          code: zone?.zone_code ?? '',
          name: zone?.zone_name ?? '',
        },
        sede: {
          id: sede?.sede_id ?? '',
          name: sede?.sede_name ?? '',
          slug: sede?.sede_slug ?? '',
        },
        role,
      });

      toast.success(`Contexto seleccionado: ${sede?.sede_name ?? 'Sede'}`);
      syncCookies(accessToken ?? '', role, data?.context_token ?? '');
      router.replace(getDashboardPathForRole(role));
    } catch (err: any) {
      toast.error(err?.detail ?? 'Error al seleccionar contexto');
    } finally {
      setIsSelecting(null);
    }
  }

  function handleLogout() {
    logout?.();
    router.replace('/login');
  }

  function handleGoToSuperAdmin() {
    // Establecer cookie de rol 'superadmin' para que el middleware permita acceso
    syncCookies(accessToken ?? '', 'superadmin');
    router.replace('/superadmin');
  }

  const safeMemberships = memberships ?? [];

  return (
    <div className="animate-fade-in w-full max-w-lg mx-auto px-4 md:px-0 py-6 md:py-0">
      <div className="flex flex-col items-center mb-8 text-center">
        <Logo size={64} className="mb-4" />
        <h1 className="text-2xl font-bold tracking-tight">Selecciona tu sede</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Hola, {user?.full_name ?? 'usuario'}. Elige dónde quieres trabajar.
        </p>
      </div>

      {/* SuperAdmin global access */}
      {user?.is_superadmin && (
        <Card className="border-primary/30 shadow-md mb-4 cursor-pointer hover:shadow-lg transition-shadow"
              onClick={handleGoToSuperAdmin}>
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-unad-orange/10 flex items-center justify-center">
                  <Globe className="w-5 h-5 text-unad-orange" />
                </div>
                <div>
                  <p className="font-semibold text-sm">Panel de Super Administrador</p>
                  <p className="text-xs text-muted-foreground">Gestión global de zonas, sedes e infraestructura</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      )}

      {safeMemberships?.length === 0 && !user?.is_superadmin ? (
        <Card className="border-border/50">
          <CardContent className="py-12 text-center">
            <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No tienes membresías activas.</p>
            <p className="text-sm text-muted-foreground mt-1">Contacta a un administrador.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {safeMemberships?.map?.((zone: ZoneMembershipInfo) => (
            <Card key={zone?.zone_id ?? 'unknown'} className="border-border/50 shadow-md">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-primary" />
                  <CardTitle className="text-base">{zone?.zone_name ?? 'Zona'}</CardTitle>
                </div>
                <CardDescription className="text-xs">Código: {zone?.zone_code ?? '-'}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {(zone?.sedes ?? [])?.map?.((sede: SedeMembershipInfo) => {
                  const selKey = `${zone?.zone_id}-${sede?.sede_id}`;
                  const isLoading = isSelecting === selKey;
                  const roleColor = ROLE_COLORS[sede?.role ?? 'guest'] ?? ROLE_COLORS.guest;
                  return (
                    <Button
                      key={sede?.sede_id ?? 'unknown'}
                      variant="outline"
                      className="w-full justify-between h-auto py-3 px-4 hover:border-primary/40 transition-colors"
                      onClick={() => handleSelectSede(zone, sede)}
                      disabled={isSelecting !== null}
                    >
                      <div className="flex items-center gap-3">
                        <Building2 className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        <div className="text-left w-full overflow-hidden">
                          <p className="font-medium text-sm truncate">{sede?.sede_name ?? 'Sede'}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <Shield className="w-3 h-3" />
                            <span className={`text-xs px-1.5 py-0.5 rounded-md font-medium border ${roleColor}`}>
                              {ROLE_LABELS[sede?.role ?? 'guest'] ?? sede?.role ?? 'Sin rol'}
                            </span>
                          </div>
                        </div>
                      </div>
                      {isLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      )}
                    </Button>
                  );
                })}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="mt-6 text-center">
        <Button variant="ghost" size="sm" onClick={handleLogout} className="text-muted-foreground">
          <LogOut className="w-4 h-4 mr-2" />
          Cerrar sesión
        </Button>
      </div>
    </div>
  );
}
