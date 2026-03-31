'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/auth-store';
import { apiClient } from '@/lib/api/client';
import { toArray } from '@/lib/api/response-utils';
import { getDashboardPathForRole } from '@/lib/auth-helpers';
import type { TokenResponse, User, ZoneMembershipInfo, ContextTokenResponse } from '@/types/api';
import { Zap, Loader2, Eye, EyeOff } from 'lucide-react';

/** Set auth cookies immediately so middleware allows navigation */
function syncCookies(accessToken: string, contextToken?: string) {
  document.cookie = `hackathon-auth-token=${accessToken}; path=/; SameSite=Lax; max-age=86400`;
  if (contextToken) {
    document.cookie = `hackathon-context-token=${contextToken}; path=/; SameSite=Lax; max-age=86400`;
  }
}

export default function LoginPage() {
  const router = useRouter();
  const login = useAuthStore((s) => s?.login);
  const setMemberships = useAuthStore((s) => s?.setMemberships);
  const selectContext = useAuthStore((s) => s?.selectContext);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleLogin(e: React.FormEvent) {
    e?.preventDefault?.();
    setErrorMsg(null);
    if (!email?.trim() || !password?.trim()) {
      setErrorMsg('Por favor completa todos los campos');
      return;
    }

    setIsSubmitting(true);
    try {
      // Step 1: Login
      const { data: tokenData } = await apiClient.post<TokenResponse>('/auth/login', {
        email: email.trim(),
        password,
      });

      const accessToken = tokenData?.access_token ?? '';
      const refreshToken = tokenData?.refresh_token ?? '';

      // Step 2: Get user info
      const { data: userData } = await apiClient.get<User>('/auth/me', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      login?.(userData, accessToken, refreshToken);

      // Step 3: Get memberships
      const { data: membershipsData } = await apiClient.get('/auth/my-memberships', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      const memberships = toArray<ZoneMembershipInfo>(membershipsData, ['items', 'zones', 'results']);

      setMemberships?.(memberships);

      toast.success(`¡Bienvenido, ${userData?.full_name ?? 'usuario'}!`);

      // Flatten all sede memberships
      const allSedes = memberships.flatMap((z) =>
        (Array.isArray(z?.sedes) ? z.sedes : []).map((s) => ({ zone: z, sede: s }))
      );

      // SuperAdmin with no memberships → admin panel
      if (userData?.is_superadmin && allSedes.length === 0) {
        syncCookies(accessToken);
        router.replace('/admin/dashboard');
        return;
      }

      // Exactly 1 membership → auto-select context
      if (allSedes.length === 1) {
        const { zone, sede } = allSedes[0];
        try {
          const { data: ctxData } = await apiClient.post<ContextTokenResponse>(
            '/auth/select-context',
            { zone_id: zone?.zone_id ?? '', sede_id: sede?.sede_id ?? '' },
            { headers: { Authorization: `Bearer ${accessToken}` } }
          );
          const ctxToken = ctxData?.context_token ?? '';
          selectContext?.({
            contextToken: ctxToken,
            zone: { id: zone?.zone_id ?? '', code: zone?.zone_code ?? '', name: zone?.zone_name ?? '' },
            sede: { id: sede?.sede_id ?? '', name: sede?.sede_name ?? '', slug: sede?.sede_slug ?? '' },
            role: ctxData?.role ?? sede?.role ?? 'student',
          });
          const targetRole = ctxData?.role ?? sede?.role ?? 'student';
          syncCookies(accessToken, ctxToken);
          router.replace(getDashboardPathForRole(targetRole));
          return;
        } catch {
          // If auto-select fails, fall through to sede selection
        }
      }

      // Multiple memberships → choose
      syncCookies(accessToken);
      router.replace('/select-sede');
    } catch (err: any) {
      const detail = err?.detail ?? err?.message ?? 'Error al iniciar sesión';
      const message = typeof detail === 'string' ? detail : 'Credenciales inválidas';
      setErrorMsg(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="animate-fade-in">
      <div className="flex flex-col items-center mb-8">
        <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
          <Zap className="w-7 h-7 text-primary" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Hackathon Platform</h1>
        <p className="text-muted-foreground text-sm mt-1">Plataforma de hackathones universitarios</p>
      </div>

      <Card className="border-border/50 shadow-lg">
        <CardHeader className="space-y-1">
          <CardTitle className="text-xl">Iniciar sesión</CardTitle>
          <CardDescription>Ingresa tus credenciales para acceder</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            {errorMsg && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
                {errorMsg}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Correo electrónico</Label>
              <Input
                id="email"
                type="email"
                placeholder="nombre@universidad.edu"
                value={email}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setEmail(e?.target?.value ?? ''); setErrorMsg(null); }}
                disabled={isSubmitting}
                required
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setPassword(e?.target?.value ?? ''); setErrorMsg(null); }}
                  disabled={isSubmitting}
                  required
                  autoComplete="current-password"
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Ingresando...
                </>
              ) : (
                'Iniciar sesión'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
