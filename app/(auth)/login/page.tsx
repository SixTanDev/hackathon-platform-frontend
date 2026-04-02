'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
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
import { AnimatedDotBackground } from '@/components/landing/animated-dot-background';
import type { ContextTokenResponse, TokenResponse, User, ZoneMembershipInfo } from '@/types/api';
import { ArrowLeft, Clock3, Eye, EyeOff, Loader2, Lock, LogIn, Mail, Network } from 'lucide-react';

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
    if (!email.trim() || !password.trim()) {
      setErrorMsg('Por favor completa todos los campos');
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: tokenData } = await apiClient.post<TokenResponse>('/auth/login', {
        email: email.trim(),
        password,
      });

      const accessToken = tokenData?.access_token ?? '';
      const refreshToken = tokenData?.refresh_token ?? '';

      const { data: userData } = await apiClient.get<User>('/auth/me', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      login?.(userData, accessToken, refreshToken);

      const { data: membershipsData } = await apiClient.get('/auth/my-memberships', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      const memberships = toArray<ZoneMembershipInfo>(membershipsData, ['items', 'zones', 'results']);
      setMemberships?.(memberships);

      toast.success(`¡Bienvenido, ${userData?.full_name ?? 'usuario'}!`);

      const allSedes = memberships.flatMap((z) =>
        (Array.isArray(z?.sedes) ? z.sedes : []).map((s) => ({ zone: z, sede: s }))
      );

      if (userData?.is_superadmin && allSedes.length === 0) {
        syncCookies(accessToken);
        router.replace('/admin/dashboard');
        return;
      }

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
        }
      }

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
    <div className="relative min-h-screen overflow-hidden bg-[#050f16] text-[#dce7f0] animate-fade-in">
      <AnimatedDotBackground />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,#112434_0%,#07131b_52%,#050f16_100%)] opacity-95" />

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-[1600px] flex-col px-6 py-5 lg:px-10">
        <header className="flex items-center justify-between gap-4">
          <Link href="/" className="inline-flex items-center gap-3 transition-opacity hover:opacity-90">
            <Image
              src="/samp-logo.png"
              alt="SAMP"
              width={44}
              height={44}
              className="hidden h-auto w-8 object-contain opacity-95 md:block"
            />
            <span className="text-[2rem] font-extrabold leading-none tracking-[-0.07em] text-slate-50">SAMP</span>
            <span className="hidden h-4 w-px bg-[#ff9f43]/22 md:block" />
            <span className="hidden text-[11px] font-medium tracking-[0.16em] text-[#aebdc5] md:block">
              Sistema Académico de Maratones de Programación
            </span>
          </Link>

          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full border border-[#1a7fb3]/35 bg-[#1a7fb3]/10 px-4 py-2 text-xs font-medium tracking-[0.16em] text-[#aebdc5] transition-all hover:border-[#f59a23]/45 hover:bg-[#f59a23] hover:text-[#1f1404]"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver al inicio
          </Link>
        </header>

        <main className="flex flex-1 items-center py-8 lg:py-9">
          <div className="grid w-full items-center gap-6 lg:grid-cols-12 xl:gap-8">
            <section className="lg:col-span-7">
              <span className="inline-flex items-center rounded-md border border-[#3b494c]/50 bg-[#13212a]/80 px-4 py-2 text-[11px] font-semibold tracking-[0.05em] text-[#c3f5ff]">
                Acceso institucional
              </span>
              <h1 className="mt-7 max-w-[40rem] text-[2.05rem] font-extrabold leading-[1.01] tracking-[-0.075em] text-[#c7d2dd] md:text-[2.45rem] xl:text-[2.75rem]">
                Ingresa a la plataforma académica de maratones de programación.
              </h1>
              <p className="mt-4 max-w-lg text-[13px] leading-6 text-[#bac9cc]">
                Accede con tus credenciales para participar en retos, monitorear el progreso formativo y
                gestionar eventos académicos desde un mismo entorno.
              </p>

              <div className="mt-5 grid max-w-[28rem] grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-[#3b494c]/30 bg-[#151c26]/72 p-3.5 transition-colors hover:bg-[#18232d]/88">
                  <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-lg bg-[#81ecff]/10 text-[#81ecff]">
                    <Network className="h-4.5 w-4.5" />
                  </div>
                  <h3 className="text-[1.2rem] font-bold tracking-tight text-slate-100">Multi-sede</h3>
                  <p className="mt-2 text-[13px] leading-6 text-[#bac9cc]">
                    Espacios académicos articulados por zonas y sedes.
                  </p>
                </div>
                <div className="rounded-2xl border border-[#3b494c]/30 bg-[#151c26]/72 p-3.5 transition-colors hover:bg-[#18232d]/88">
                  <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-lg bg-[#10d5ff]/10 text-[#10d5ff]">
                    <Clock3 className="h-4.5 w-4.5" />
                  </div>
                  <h3 className="text-[1.2rem] font-bold tracking-tight text-slate-100">24/7</h3>
                  <p className="mt-2 text-[13px] leading-6 text-[#bac9cc]">
                    Seguimiento continuo para práctica y eventos.
                  </p>
                </div>
              </div>
            </section>

            <section className="mx-auto w-full max-w-md lg:col-span-5 lg:max-w-[33rem] lg:justify-self-end">
              <div className="mb-8 text-center lg:hidden">
                <Image
                  src="/samp-logo.png"
                  alt="SAMP"
                  width={80}
                  height={80}
                  className="mx-auto h-auto w-14 object-contain opacity-95"
                />
                <h1 className="mt-4 text-3xl font-extrabold tracking-[-0.06em] text-slate-50">SAMP</h1>
                <p className="mt-2 text-sm text-[#bac9cc]">Sistema Académico de Maratones de Programación</p>
              </div>

              <Card className="overflow-hidden rounded-[1.6rem] border border-[#3b494c]/35 bg-[#151c26]/80 text-[#dce7f0] shadow-[0_24px_72px_rgba(0,0,0,0.34)] backdrop-blur-xl">
                <div className="absolute inset-x-0 top-0 h-20 bg-[#81ecff]/[0.03] blur-3xl" />
                <CardHeader className="relative z-10 space-y-2 pb-4 pt-7">
                  <CardTitle className="text-[1.75rem] font-bold tracking-tight text-slate-50">
                    Iniciar sesión
                  </CardTitle>
                  <CardDescription className="text-[15px] text-[#bac9cc]">
                    Accede con tus credenciales institucionales
                  </CardDescription>
                </CardHeader>
                <CardContent className="relative z-10">
                  <form onSubmit={handleLogin} className="space-y-4.5">
                    {errorMsg && (
                      <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300">
                        {errorMsg}
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="email" className="ml-1 text-[11px] font-semibold tracking-[0.02em] text-[#bac9cc]">
                        Correo institucional
                      </Label>
                      <div className="relative">
                        <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7a8790]" />
                        <Input
                          id="email"
                          type="email"
                          placeholder="usuario@institucion.edu"
                          value={email}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                            setEmail(e.target.value);
                            setErrorMsg(null);
                          }}
                          disabled={isSubmitting}
                          required
                          autoComplete="email"
                          className="h-12 rounded-xl border-[#3b494c]/50 bg-slate-950/40 pl-12 text-base text-[#dce3f0] placeholder:text-[#6c777f] focus-visible:border-[#81ecff]/35 focus-visible:ring-[#81ecff]/15"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="password" className="ml-1 text-[11px] font-semibold tracking-[0.02em] text-[#bac9cc]">
                        Contraseña
                      </Label>
                      <div className="relative">
                        <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7a8790]" />
                        <Input
                          id="password"
                          type={showPassword ? 'text' : 'password'}
                          placeholder="••••••••"
                          value={password}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                            setPassword(e.target.value);
                            setErrorMsg(null);
                          }}
                          disabled={isSubmitting}
                          required
                          autoComplete="current-password"
                          className="h-12 rounded-xl border-[#3b494c]/50 bg-slate-950/40 pl-12 pr-12 text-base text-[#dce3f0] placeholder:text-[#6c777f] focus-visible:border-[#81ecff]/35 focus-visible:ring-[#81ecff]/15"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-2 top-1/2 h-10 w-10 -translate-y-1/2 rounded-lg text-[#7f939a] hover:bg-white/5 hover:text-[#dce3f0]"
                          onClick={() => setShowPassword(!showPassword)}
                          tabIndex={-1}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                      <div className="flex justify-end">
                        <Link href="#" className="text-xs text-[#c3f5ff] transition-colors hover:text-white">
                          ¿Olvidaste tu contraseña?
                        </Link>
                      </div>
                    </div>

                    <Button
                      type="submit"
                      className="mt-1 h-12 w-full rounded-xl bg-[#1a7fb3] text-white shadow-[0_12px_28px_rgba(26,127,179,0.2)] hover:bg-[#f59a23] hover:shadow-[0_14px_32px_rgba(245,154,35,0.24)]"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Ingresando...
                        </>
                      ) : (
                        <>
                          <span className="text-[13px] tracking-[0.02em]">Iniciar sesión</span>
                          <LogIn className="ml-2 h-4 w-4" />
                        </>
                      )}
                    </Button>
                  </form>

                  <div className="mt-6 border-t border-white/10 pt-5 text-center">
                    <p className="text-sm text-[#bac9cc]">
                      ¿Problemas de acceso?
                      <Link href="#" className="ml-2 font-medium text-[#c3f5ff] hover:underline">
                        Contactar a soporte
                      </Link>
                    </p>
                  </div>
                </CardContent>
              </Card>
            </section>
          </div>
        </main>

        <footer className="flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-6 text-center md:flex-row md:text-left">
          <p className="text-[11px] font-medium tracking-[0.12em] text-[#bac9cc]">
            © 2026 SAMP · Academia de Maratones de Programación
          </p>
          <div className="flex items-center gap-8">
            <Link href="#" className="text-[11px] font-medium tracking-[0.12em] text-[#bac9cc] transition-colors hover:text-[#c3f5ff]">
              Términos
            </Link>
            <Link href="#" className="text-[11px] font-medium tracking-[0.12em] text-[#bac9cc] transition-colors hover:text-[#c3f5ff]">
              Privacidad
            </Link>
            <Link href="#" className="text-[11px] font-medium tracking-[0.12em] text-[#bac9cc] transition-colors hover:text-[#c3f5ff]">
              Contacto
            </Link>
          </div>
        </footer>
      </div>
    </div>
  );
}
