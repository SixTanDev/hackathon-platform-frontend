'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/auth-store';
import { useTranslation } from '@/lib/i18n/context';
import { apiClient } from '@/lib/api/client';
import { toArray } from '@/lib/api/response-utils';
import { getDashboardPathForRole } from '@/lib/auth-helpers';
import { AnimatedDotBackground } from '@/components/landing/animated-dot-background';
import { ContextTokenResponse, TokenResponse, User, ZoneMembershipInfo } from '@/types/api';
import { Logo } from '@/components/shared/logo';
import { ArrowLeft, Clock3, Eye, EyeOff, Languages, Loader2, Lock, LogIn, Mail, Moon, Network, Sun } from 'lucide-react';

function syncCookies(accessToken: string, contextToken?: string, role?: string) {
  document.cookie = `hackathon-auth-token=${accessToken}; path=/; SameSite=Lax; max-age=86400`;
  
  if (contextToken) {
    document.cookie = `hackathon-context-token=${contextToken}; path=/; SameSite=Lax; max-age=86400`;
  } else {
    document.cookie = 'hackathon-context-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC';
  }

  if (role) {
    document.cookie = `hackathon-role=${role}; path=/; SameSite=Lax; max-age=86400`;
  } else {
    document.cookie = 'hackathon-role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC';
  }
}

export default function LoginPage() {
  const RECOVERY_TOAST_ID = 'login-recovery-help';
  const SUPPORT_TOAST_ID = 'login-support-help';
  const router = useRouter();
  const { setTheme, resolvedTheme } = useTheme();
  const { locale, setLocale, t } = useTranslation();
  const login = useAuthStore((s) => s?.login);
  const setMemberships = useAuthStore((s) => s?.setMemberships);
  const selectContext = useAuthStore((s) => s?.selectContext);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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

      const memberships = toArray<ZoneMembershipInfo>(membershipsData);
      setMemberships?.(memberships);

      toast.success(`¡Bienvenido, ${userData?.full_name ?? 'usuario'}!`);

      const allSedes = memberships.flatMap((z) =>
        (Array.isArray(z?.sedes) ? z.sedes : []).map((s) => ({ zone: z, sede: s }))
      );

      if (userData?.is_superadmin && allSedes.length === 0) {
        // SuperAdmin sin sedes → acceso global. Establecer cookie de rol y redirigir a panel superadmin.
        syncCookies(accessToken, undefined, 'superadmin');
        router.replace('/superadmin');
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
          syncCookies(accessToken, ctxToken, targetRole);
          router.replace(getDashboardPathForRole(targetRole));
          return;
        } catch {
          syncCookies(accessToken);
          const fallbackMessage = 'No se pudo seleccionar la sede automaticamente. Continúa manualmente.';
          setErrorMsg(fallbackMessage);
          toast.error(fallbackMessage);
          router.replace('/select-sede');
          return;
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
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground animate-fade-in transition-colors duration-500">
      <AnimatedDotBackground />
      
      {/* Dynamic Radial Gradient Overlay */}
      {mounted && (
        <div 
          className={`pointer-events-none absolute inset-0 opacity-95 transition-all duration-700 ${
            resolvedTheme === 'dark' 
              ? 'bg-[radial-gradient(circle_at_top,#112434_0%,#07131b_52%,#050f16_100%)]' 
              : 'bg-[radial-gradient(circle_at_top,rgba(180,195,200,0.2)_0%,rgba(200,210,215,0.4)_40%,rgba(226,232,240,0.7)_100%)]'
          }`} 
        />
      )}

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-[1600px] flex-col px-6 py-5 lg:px-10">
        <header className="grid grid-cols-1 items-center gap-4 md:grid-cols-3">
          <Link href="/" className="flex items-center gap-4 transition-opacity hover:opacity-90 justify-start">
            <Logo size={64} className="brightness-110 drop-shadow-sm" />
          </Link>

          <div className="hidden justify-center text-center md:flex">
            <span className="text-[11px] font-bold uppercase tracking-[0.28em] text-muted-foreground">
              {t('brand.fullTitle')}
            </span>
          </div>

          <div className="flex items-center justify-end gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="flex h-11 w-11 items-center justify-center rounded-full border border-border/30 bg-card/75 text-primary shadow-[0_10px_28px_rgba(0,0,0,0.1)] transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/25 hover:text-primary/80"
              onClick={() => setLocale(locale === 'es' ? 'en' : 'es')}
              aria-label={t('common.language')}
            >
              <span className="text-xs font-extrabold tracking-[0.04em]">{locale === 'es' ? 'EN' : 'ES'}</span>
            </Button>

            {mounted && (
              <button
                onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
                className="flex h-11 w-11 items-center justify-center rounded-full border border-border/30 bg-card/75 text-primary shadow-[0_10px_28px_rgba(0,0,0,0.1)] transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/25 hover:text-primary/80"
                aria-label="Toggle theme"
              >
                {resolvedTheme === 'dark' ? (
                  <Sun className="h-5 w-5 text-[#c3f5ff]" />
                ) : (
                  <Moon className="h-5 w-5 text-primary" />
                )}
              </button>
            )}
            <Button
              variant="outline"
              size="sm"
              className="rounded-full border-primary/30 bg-primary/10 px-4 py-2 text-xs font-bold tracking-[0.12em] text-primary transition-all duration-300 hover:bg-accent hover:text-white hover:border-accent hover:shadow-glow"
              asChild
            >
              <Link href="/">
                <ArrowLeft className="h-4 w-4" />
                {t('auth.backToHome')}
              </Link>
            </Button>
          </div>
        </header>

        <main className="flex flex-1 items-center py-8 lg:py-9">
          <div className="grid w-full items-center gap-8 lg:min-h-[calc(100vh-14rem)] lg:grid-cols-12 lg:items-stretch lg:gap-10 xl:gap-12">
            <section className="flex flex-col justify-center lg:col-span-7 lg:pr-4 xl:pr-10">
              <span className="inline-flex self-start items-center rounded-md border border-border/50 bg-muted/80 px-4 py-2 text-[11px] font-semibold tracking-[0.05em] text-primary">
                {t('auth.portalInstitutional')}
              </span>
              <h1 className="mt-6 max-w-[15ch] text-[1.85rem] font-extrabold leading-[1.02] tracking-[-0.045em] text-foreground md:text-[2.3rem] xl:text-[2.7rem]">
                {t('login.hero.title').split('UNAD')[0]} <span className="text-primary inline-block transform transition-transform hover:scale-105 cursor-default">UNAD</span>
              </h1>
              <p className="mt-5 max-w-[34rem] text-[13px] leading-7 text-muted-foreground">
                {t('login.hero.subtitle')}
              </p>

              <div className="mt-3 grid max-w-[30rem] grid-cols-1 gap-3 sm:mt-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-border/35 bg-card/65 p-3.5 shadow-[0_12px_35px_rgba(15,23,42,0.06)] transition-colors hover:bg-card/85">
                  <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Network className="h-4.5 w-4.5" />
                  </div>
                  <h3 className="text-[1.2rem] font-bold tracking-tight text-foreground">{t('login.features.multisede.title')}</h3>
                  <p className="mt-2 text-[13px] leading-6 text-muted-foreground">
                    {t('login.features.multisede.desc')}
                  </p>
                </div>
                <div className="rounded-2xl border border-border/35 bg-card/65 p-3.5 shadow-[0_12px_35px_rgba(15,23,42,0.06)] transition-colors hover:bg-card/85">
                  <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-lg bg-secondary/10 text-secondary">
                    <Clock3 className="h-4.5 w-4.5" />
                  </div>
                  <h3 className="text-[1.2rem] font-bold tracking-tight text-foreground">{t('login.features.247.title')}</h3>
                  <p className="mt-2 text-[13px] leading-6 text-muted-foreground">
                    {t('login.features.247.desc')}
                  </p>
                </div>
              </div>
            </section>

            <section className="mx-auto flex w-full max-w-md items-center justify-center lg:col-span-5 lg:max-w-[33rem] lg:justify-self-center xl:-translate-x-4">
              <div className="mb-8 text-center lg:hidden">
                <Logo size={56} className="mx-auto opacity-95" />
                <h1 className="mt-4 text-3xl font-extrabold tracking-[-0.06em] text-foreground">SAMP</h1>
                <p className="mt-2 text-sm text-muted-foreground">Sistema Académico de Maratones de Programación</p>
              </div>

              <Card className="group relative overflow-hidden rounded-[1.6rem] border border-border/35 bg-card/80 text-card-foreground shadow-[0_24px_72px_rgba(0,0,0,0.15)] dark:shadow-[0_24px_72px_rgba(0,0,0,0.34)] backdrop-blur-xl transition-[box-shadow,border-color,background-color] duration-300 hover:border-primary/25 hover:bg-card/85 hover:shadow-[0_36px_110px_rgba(0,0,0,0.24),0_0_0_1px_rgba(14,116,144,0.08)] dark:hover:border-primary/30 dark:hover:shadow-[0_36px_110px_rgba(0,0,0,0.5),0_0_0_1px_rgba(125,211,252,0.08)]">
                <div className="absolute inset-x-0 top-0 h-20 bg-primary/[0.03] blur-3xl transition-opacity duration-300 group-hover:opacity-100 opacity-70" />
                <CardHeader className="relative z-10 space-y-2 pb-4 pt-7">
                  <CardTitle className="text-[1.65rem] font-bold tracking-tight text-foreground md:text-[1.7rem]">
                    {t('auth.loginTitle')}
                  </CardTitle>
                  <CardDescription className="text-[15px] text-muted-foreground">
                    {t('auth.loginDescription')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="relative z-10">
                  <form onSubmit={handleLogin} className="space-y-4.5">
                    {errorMsg && (
                      <div
                        className="rounded-xl border border-red-500/25 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-300"
                        role="alert"
                        aria-live="polite"
                      >
                        {errorMsg}
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="email" className="ml-1 text-[11px] font-semibold tracking-[0.02em] text-muted-foreground">
                        {t('auth.emailLabel')}
                      </Label>
                      <div className="relative">
                        <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" />
                        <Input
                          id="email"
                          type="email"
                          placeholder={t('auth.emailPlaceholder')}
                          value={email}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                            setEmail(e.target.value);
                            setErrorMsg(null);
                          }}
                          disabled={isSubmitting}
                          required
                          autoComplete="email"
                          className="h-12 rounded-xl border-border/50 bg-background/40 pl-12 text-base text-foreground caret-primary/80 placeholder:text-muted-foreground/80 focus-visible:border-primary/55 focus-visible:ring-primary/20"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="password" className="ml-1 text-[11px] font-semibold tracking-[0.02em] text-muted-foreground">
                        {t('auth.passwordLabel')}
                      </Label>
                      <div className="relative">
                        <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" />
                        <Input
                          id="password"
                          type={showPassword ? 'text' : 'password'}
                          placeholder={t('auth.passwordPlaceholder')}
                          value={password}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                            setPassword(e.target.value);
                            setErrorMsg(null);
                          }}
                          disabled={isSubmitting}
                          required
                          autoComplete="current-password"
                          className="h-12 rounded-xl border-border/50 bg-background/40 pl-12 pr-12 text-base text-foreground caret-primary/80 placeholder:text-muted-foreground/80 focus-visible:border-primary/55 focus-visible:ring-primary/20"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-2 top-1/2 h-10 w-10 -translate-y-1/2 rounded-lg text-muted-foreground/80 hover:bg-muted/10 hover:text-foreground"
                          onClick={() => setShowPassword(!showPassword)}
                          aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                          aria-pressed={showPassword}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                      <div className="flex justify-end">
                        <button
                          type="button"
                          className="appearance-none bg-transparent p-0 text-xs text-primary transition-colors hover:text-foreground focus-visible:outline-none focus-visible:underline"
                          onClick={() =>
                            toast.info(t('auth.recoveryHelp'), {
                              id: RECOVERY_TOAST_ID,
                            })
                          }
                        >
                          {t('auth.forgotPassword')}
                        </button>
                      </div>
                    </div>

                    <Button
                      type="submit"
                      variant="premium"
                      className="w-full mt-2 shadow-premium"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          {t('common.loading')}
                        </>
                      ) : (
                        <>
                          <span className="text-[13px] tracking-[0.02em]">{t('auth.login')}</span>
                          <LogIn className="ml-2 h-4 w-4" />
                        </>
                      )}
                    </Button>
                  </form>

                  <div className="mt-6 border-t border-border/10 pt-5 text-center">
                    <p className="text-sm text-muted-foreground">
                      {t('auth.accessProblems')}
                      <button
                        type="button"
                        className="ml-2 appearance-none bg-transparent p-0 font-medium text-primary hover:underline focus-visible:outline-none focus-visible:underline"
                        onClick={() =>
                          toast.info(t('auth.supportHelp'), {
                            id: SUPPORT_TOAST_ID,
                          })
                        }
                      >
                        {t('auth.contactSupport')}
                      </button>
                    </p>
                  </div>
                </CardContent>
              </Card>
            </section>
          </div>
        </main>
 
        <footer className="flex flex-col items-center justify-between gap-4 border-t border-border/10 pt-6 text-center md:flex-row md:text-left">
          <p className="text-[11px] font-medium tracking-[0.12em] text-muted-foreground">
            {t('footer.copy')}
          </p>
          <div className="flex items-center gap-8">
            <Link href="#" className="text-[11px] font-medium tracking-[0.12em] text-muted-foreground transition-colors hover:text-primary">
              {t('footer.terms')}
            </Link>
            <Link href="#" className="text-[11px] font-medium tracking-[0.12em] text-muted-foreground transition-colors hover:text-primary">
              {t('footer.privacy')}
            </Link>
            <Link href="#" className="text-[11px] font-medium tracking-[0.12em] text-muted-foreground transition-colors hover:text-primary">
              {t('footer.contact')}
            </Link>
          </div>
        </footer>
      </div>
    </div>
  );
}
