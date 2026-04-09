'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useTheme } from 'next-themes';
import { Terminal, ArrowRight, Brain, BarChart3, ShieldCheck, Sun, Moon, Globe } from 'lucide-react';
import { Logo } from '@/components/shared/logo';
import { AnimatedDotBackground } from '@/components/landing/animated-dot-background';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/lib/i18n/context';

export default function HomePage() {
  const { theme, setTheme } = useTheme();
  const { locale, setLocale, t } = useTranslation();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="bg-[#eef2f7] dark:bg-[#0d141d] text-slate-900 dark:text-[#dce3f0] selection:bg-[#1a7fb3] selection:text-white min-h-screen font-sans transition-colors duration-500">
      <style
        dangerouslySetInnerHTML={{
          __html: `
        .animated-mesh {
          position: relative;
          overflow: hidden;
        }
        .dark .animated-mesh {
          background: radial-gradient(circle at 50% 50%, #151c26 0%, #0d141d 100%);
        }
        html:not(.dark) .animated-mesh {
          background: radial-gradient(circle at 50% 50%, #ffffff 0%, #f8fafc 100%);
        }
        .wave-svg {
          position: absolute;
          bottom: 0;
          left: 0;
          width: 100%;
          height: 100%;
          z-index: 1;
          opacity: 0.4;
        }
      `,
        }}
      />

      <header className="absolute top-0 z-50 w-full border-b border-slate-200/70 bg-white/40 backdrop-blur-xl transition-colors duration-500 hover:bg-white/90 dark:border-[#3b494c]/20 dark:bg-[#0d141d]/20 dark:hover:bg-[#0d141d]/80">
        <nav className="mx-auto grid max-w-[1440px] grid-cols-[1fr_auto_1fr] items-center gap-6 px-6 py-3 md:px-8 lg:px-10">
          <div className="flex w-28 items-center justify-start self-center">
            <Logo size={56} className="shrink-0 drop-shadow-sm brightness-110" />
          </div>

          <div className="hidden items-center justify-self-center rounded-full border border-slate-200/80 bg-white/70 p-1 shadow-[0_12px_32px_rgba(148,163,184,0.1)] backdrop-blur-md md:flex dark:border-[#3b494c]/30 dark:bg-[#111b25]/70 dark:shadow-[0_18px_44px_rgba(0,0,0,0.22)]">
            <Button
              variant="outline"
              size="sm"
              className="rounded-full border-primary/40 bg-primary/10 text-[10px] font-extrabold uppercase tracking-[0.2em] text-primary hover:bg-primary/20"
              asChild
            >
              <Link href="/dashboard/hackathons">{t('nav.hackathons')}</Link>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="rounded-full text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground"
              asChild
            >
              <Link href="/dashboard/leaderboard">{t('nav.leaderboard')}</Link>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="rounded-full text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground"
              asChild
            >
              <Link href="/login">{t('landing.nav.rules')}</Link>
            </Button>
          </div>

          <div className="flex items-center justify-end justify-self-end gap-3 md:gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setLocale(locale === 'es' ? 'en' : 'es')}
              className="rounded-full border-border/70 bg-background/75 text-foreground shadow-sm hover:-translate-y-0.5 hover:border-primary/40 transition-all duration-300"
              aria-label={t('common.language')}
            >
              <span className="text-[10px] font-black uppercase tracking-wider">{locale === 'es' ? 'EN' : 'ES'}</span>
            </Button>
            {mounted && (
              <Button
                variant="outline"
                size="icon"
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="rounded-full border-border/70 bg-background/75 text-foreground shadow-sm hover:-translate-y-0.5 hover:border-primary/40 transition-all duration-300"
                aria-label="Toggle theme"
              >
                {theme === 'dark' ? <Sun className="w-5 h-5 text-[#c3f5ff]" /> : <Moon className="w-5 h-5 text-slate-700" />}
              </Button>
            )}
            <Button
              variant="premium"
              size="default"
              className="px-8 text-[10px] font-black uppercase tracking-[0.2em]"
              asChild
            >
              <Link href="/login">{t('auth.login')}</Link>
            </Button>
          </div>
        </nav>

        <div className="pointer-events-none absolute inset-x-0 top-[5.4rem] hidden md:block">
          <div className="mx-auto grid max-w-[1440px] grid-cols-[1fr_auto_1fr] items-center gap-6 px-6 md:px-8 lg:px-10">
            <div />
            <div className="justify-self-center text-center">
              <span className="inline-block text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-600 dark:text-[#7f939a]">
            {t('brand.fullTitle')}
          </span>
        </div>
            <div />
          </div>
        </div>
      </header>

      <main>
        <section className="relative min-h-screen animated-mesh flex flex-col items-center justify-center pt-24 pb-6">
          <AnimatedDotBackground />

          <svg className="wave-svg text-[#1a7fb3]/20 dark:text-[#1a7fb3]/10" preserveAspectRatio="none" viewBox="0 0 1440 320">
            <path
              d="M0,160L48,176C96,192,192,224,288,213.3C384,203,480,149,576,144C672,139,768,181,864,197.3C960,213,1056,203,1152,176C1248,149,1344,107,1392,85.3L1440,64L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"
              fill="currentColor"
            />
          </svg>
          <svg
            className="wave-svg text-purple-200 dark:text-[#e1c5ff]"
            preserveAspectRatio="none"
            style={{ bottom: '10px', transform: 'scaleY(-1)', opacity: 0.05 }}
            viewBox="0 0 1440 320"
          >
            <path
              d="M0,96L60,112C120,128,240,160,360,165.3C480,171,600,149,720,128C840,107,960,85,1080,101.3C1200,117,1320,171,1380,197.3L1440,224L1440,320L1380,320C1320,320,1200,320,1080,320C960,320,840,320,720,320C600,320,480,320,360,320C240,320,120,320,60,320L0,320Z"
              fill="currentColor"
            />
          </svg>

          <div className="relative z-10 max-w-5xl w-full px-6 flex flex-col items-center text-center">

            <div className="space-y-4 flex flex-col items-center">
              <span className="inline-block text-[#1a7fb3] dark:text-[#c3f5ff]/80 tracking-[0.2em] text-[10px] md:text-xs font-bold py-2 px-6 rounded-full bg-[#1a7fb3]/8 dark:bg-[#35a19d]/8 border border-[#1a7fb3]/15 dark:border-[#35a19d]/15 backdrop-blur-sm shadow-sm mb-1">
                {t('landing.hero.nextEvent')}
              </span>

              <div className="max-w-3xl mx-auto">
                <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight leading-[1.2] bg-clip-text text-transparent bg-gradient-to-br from-[#004669] via-[#1a7fb3] to-[#248f8b] dark:from-white dark:via-[#c3f5ff] dark:to-[#35a19d] drop-shadow-xl lg:px-4 pb-2 whitespace-pre-line">
                  {t('landing.hero.title')}
                </h1>
              </div>

              <p className="text-slate-700 dark:text-[#bac9cc] text-base md:text-lg max-w-2xl mx-auto leading-relaxed font-medium">
                {t('landing.hero.subtitle')}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mt-16 w-full">
              <Button size="lg" variant="premium" className="w-full sm:w-auto min-w-[240px] shadow-premium" asChild>
                <Link href="/login" className="flex items-center justify-center gap-3 group">
                  <span className="tracking-tight font-extrabold">{t('landing.hero.cta.enter')}</span>
                  <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-2" />
                </Link>
              </Button>

              <Button size="lg" variant="outline" className="w-full sm:w-auto min-w-[200px]" asChild>
                <Link href="/dashboard/hackathons" className="flex items-center justify-center gap-3 group">
                  <span className="tracking-tight font-bold text-muted-foreground group-hover:text-foreground">{t('landing.hero.cta.hackathons')}</span>
                </Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="bg-[#eef2f7] dark:bg-[#0d141d] py-24 px-6 md:px-10 max-w-[1440px] mx-auto z-20 relative border-t border-slate-200 dark:border-[#3b494c]/20 transition-colors duration-500">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-2 lg:row-span-2 bg-white dark:bg-[#151c26] rounded-[2rem] p-10 flex flex-col justify-between relative overflow-hidden group border border-slate-200 dark:border-[#3b494c]/20 shadow-xl dark:shadow-none transition-colors duration-500">
              <div className="absolute -right-20 -top-20 w-80 h-80 bg-[#1a7fb3]/10 dark:bg-[#1a7fb3]/5 blur-[100px] group-hover:bg-[#1a7fb3]/20 dark:group-hover:bg-[#1a7fb3]/15 transition-colors duration-1000" />
              <div className="relative z-10 max-w-[32rem]">
                <span className="text-[#35a19d] text-xs font-bold uppercase tracking-[0.2em]">{t('landing.features.context')}</span>
                <h2 className="mt-5 text-3xl font-extrabold tracking-tight leading-[1.04] text-slate-900 dark:text-[#dce3f0] md:text-4xl lg:text-[2.75rem]">
                  {t('landing.features.mainTitle')}
                </h2>
                <p className="mt-5 max-w-lg text-sm leading-7 text-slate-600 dark:text-[#9eb0b7] md:text-[15px]">
                  {t('landing.features.mainDesc')}
                </p>
              </div>

              <div className="relative z-10 mt-12 flex flex-col gap-7 border-t border-slate-200/80 pt-7 dark:border-white/8">
                <div className="grid grid-cols-2 gap-6 md:max-w-[22rem]">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500 dark:text-[#7d9098]">{t('landing.features.uptime.label')}</span>
                    <p className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">24/7</p>
                    <p className="mt-1 text-sm text-slate-600 dark:text-[#9eb0b7]">{t('landing.features.uptime.desc')}</p>
                  </div>
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500 dark:text-[#7d9098]">{t('landing.features.scale.label')}</span>
                    <p className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">+42</p>
                    <p className="mt-1 text-sm text-slate-600 dark:text-[#9eb0b7]">{t('landing.features.scale.desc')}</p>
                  </div>
                </div>

                <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
                  <div className="flex items-end gap-5">
                    <div className="flex -space-x-4">
                      <div className="w-14 h-14 rounded-full border-4 border-white dark:border-[#151c26] bg-slate-200 dark:bg-[#333a44] flex items-center justify-center overflow-hidden shadow-2xl">
                        <Image
                          width={56}
                          height={56}
                          className="object-cover w-full h-full"
                          alt="avatar"
                          src="https://lh3.googleusercontent.com/aida-public/AB6AXuAFcItrovh4Gqn66IDybEmjbVqEVsHAduVUanHJeU63meT7u3LE5UHXNero5eJfo06w4ftAkUUTLKhczmapcRDQ7N-Bi9cc_WM0DzyAVREkeD6tLyrg8U2DWnDpSkE1O5TmNTWCAN9UriGxq49xYs_3a_sUOuAaKKhbnw4BNMromFGU1ddSp5mtm7tt0nXmJssYAR0NbB_QwD16lEIBvbN5grK_C8poEpq6AOsC-uddR2rONWeeZWzkfF5GIGkVcofLGAKesR-9hbQ"
                        />
                      </div>
                      <div className="w-14 h-14 rounded-full border-4 border-white dark:border-[#151c26] bg-slate-200 dark:bg-[#333a44] flex items-center justify-center overflow-hidden shadow-2xl">
                        <Image
                          width={56}
                          height={56}
                          className="object-cover w-full h-full"
                          alt="avatar2"
                          src="https://lh3.googleusercontent.com/aida-public/AB6AXuDSsRWc_oCG2z252MyUiLT85mgDd7AJ7x-AJnXUwdU5fnrz8RnqxdbOv2rkMo5I6xByv8H0y3jbWdd2hduql3ZXRlpdaegrPv3u5qumrBl0LoAcG4fncAMxjcxJyf7kD8deL7FuJ2ayoK0zc4W_LG9luDaF7jLMmgPIRWKV3xONsn_nQWJ_2Efb_uTM6LYrCkFAPzo9-zaOJu9eiCySm_usA4bK9vekqVJ6GqEG7j-nuLfJfPP9n3jWsUiqEc3pStzygdC_azQimJE"
                        />
                      </div>
                      <div className="w-14 h-14 rounded-full border-4 border-white dark:border-[#151c26] bg-slate-800 dark:bg-[#3e4754] flex items-center justify-center text-[#c3f5ff] text-sm font-bold shadow-2xl">
                        +42
                      </div>
                    </div>

                    <div className="flex flex-col">
                      <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-[#7d9098]">{t('landing.features.community.label')}</span>
                      <span className="mt-2 max-w-[14rem] text-sm font-medium leading-6 text-slate-600 dark:text-[#bac9cc]">
                        {t('landing.features.community.desc')}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-[#2e353f]/20 border border-slate-200 dark:border-[#3b494c]/20 rounded-[2rem] p-8 hover:translate-y-[-4px] hover:shadow-xl hover:bg-slate-50 dark:hover:bg-[#2e353f]/30 transition-all duration-300 group shadow-md dark:shadow-none">
              <div className="w-16 h-16 rounded-full bg-[#1a7fb3]/10 flex items-center justify-center mb-6">
                <Brain className="text-[#1a7fb3] w-8 h-8 group-hover:scale-110 transition-transform" />
              </div>
              <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-[#7d9098]">{t('landing.features.ai.label')}</span>
              <h3 className="text-xl font-bold mb-3 mt-3 tracking-tight text-slate-900 dark:text-[#dce3f0]">{t('landing.features.ai.title')}</h3>
              <p className="text-slate-600 dark:text-[#bac9cc] text-sm leading-relaxed">
                {t('landing.features.ai.desc')}
              </p>
            </div>

            <div className="bg-white dark:bg-[#2e353f]/20 border border-slate-200 dark:border-[#3b494c]/20 rounded-[2rem] p-8 hover:translate-y-[-4px] hover:shadow-xl hover:bg-slate-50 dark:hover:bg-[#2e353f]/30 transition-all duration-300 group shadow-md dark:shadow-none">
              <div className="w-16 h-16 rounded-full bg-[#35a19d]/10 flex items-center justify-center mb-6">
                <BarChart3 className="text-[#35a19d] w-8 h-8 group-hover:scale-110 transition-transform" />
              </div>
              <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-[#7d9098]">{t('landing.features.multisede.label')}</span>
              <h3 className="text-xl font-bold mb-3 mt-3 tracking-tight text-slate-900 dark:text-[#dce3f0]">{t('landing.features.multisede.title')}</h3>
              <p className="text-slate-600 dark:text-[#bac9cc] text-sm leading-relaxed">
                {t('landing.features.multisede.desc')}
              </p>
            </div>

            <div className="lg:col-span-2 bg-gradient-to-r from-slate-100 to-slate-200 dark:from-[#151c26] dark:to-[#19202a] p-10 rounded-[2rem] flex items-center justify-between border border-slate-200 dark:border-[#3b494c]/20 shadow-xl relative overflow-hidden group transition-all duration-500">
              <div className="absolute right-0 top-0 h-full w-2/3 bg-gradient-to-l from-[#1a7fb3]/10 dark:from-[#1a7fb3]/5 to-transparent pointer-events-none group-hover:from-[#1a7fb3]/20 dark:group-hover:from-[#1a7fb3]/10 transition-colors" />
              <div className="space-y-4 relative z-10 max-w-sm">
                <span className="text-[#35a19d] dark:text-[#35a19d] text-xs font-bold uppercase tracking-[0.2em] flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#35a19d]" /> {t('landing.features.security.label')}
                </span>
                <p className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-[#dce3f0] leading-tight">{t('landing.features.security.title')}</p>
                <p className="text-sm md:text-base leading-7 text-slate-600 dark:text-[#9eb0b7] max-w-lg">
                  {t('landing.features.security.desc')}
                </p>
              </div>
              <div className="relative z-10 flex shrink-0 flex-col gap-3 rounded-[1.5rem] border border-[#35a19d]/20 bg-[#0f2630]/55 px-5 py-4 shadow-[0_12px_32px_rgba(0,0,0,0.16)]">
                <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#7ddce7]">{t('landing.features.status.label')}</span>
                <div className="flex items-center gap-3">
                  <span className="h-3.5 w-3.5 rounded-full bg-[#35a19d] shadow-[0_0_18px_rgba(53,161,157,0.45)]" />
                  <span className="text-sm font-semibold text-white/90">{t('landing.features.status.active')}</span>
                </div>
                <div className="h-px w-full bg-gradient-to-r from-[#35a19d]/30 to-transparent" />
                <span className="text-xs leading-5 text-[#a8c7cf]">{t('landing.features.status.desc')}</span>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="w-full border-t border-slate-200 dark:border-[#3b494c]/20 bg-slate-100 dark:bg-[#080f18] transition-colors duration-500">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-10 px-6 py-16 md:px-10">
          <div className="flex flex-col items-center gap-6 text-center">
            <div className="flex flex-col items-center gap-3 text-center">
              <Logo size={64} className="opacity-95 drop-shadow-[0_0_14px_rgba(26,127,179,0.14)]" />
              <div className="flex flex-col items-center text-center">
                <span className="text-[1.75rem] font-extrabold leading-none tracking-[-0.06em] text-slate-900 dark:text-[#eaf8ff]">
                  SAMP
                </span>
                <span className="mt-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-[#7f939a]">
                  Sistema Académico de Maratones de Programación
                </span>
              </div>
            </div>
            <p className="max-w-2xl text-sm leading-7 text-slate-600 dark:text-[#9eb0b7] md:text-[15px]">
              {t('landing.footer.desc')}
            </p>
            <div className="flex flex-wrap justify-center gap-x-8 gap-y-3 text-sm font-medium">
              <Link className="text-slate-600 transition-colors hover:text-[#1a7fb3] dark:text-[#bac9cc] dark:hover:text-[#1a7fb3]" href="/login">
                {t('footer.privacy')}
              </Link>
              <Link className="text-slate-600 transition-colors hover:text-[#1a7fb3] dark:text-[#bac9cc] dark:hover:text-[#1a7fb3]" href="/login">
                {t('landing.footer.support')}
              </Link>
              <Link className="text-slate-600 transition-colors hover:text-[#1a7fb3] dark:text-[#bac9cc] dark:hover:text-[#1a7fb3]" href="/login">
                {t('landing.footer.rules')}
              </Link>
              <Link className="text-slate-600 transition-colors hover:text-[#35a19d] dark:text-[#bac9cc] dark:hover:text-[#35a19d]" href="/login">
                {t('auth.login')}
              </Link>
            </div>
          </div>
          <div className="flex flex-col items-center gap-4 border-t border-slate-200/80 pt-6 text-center dark:border-white/8">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400 dark:text-[#50606a]">
              {t('landing.footer.initiative')}
            </p>
            <p className="text-xs font-medium text-slate-500 dark:text-[#61727b]">
              {t('landing.footer.copy')}
            </p>
            <p className="text-xs font-medium tracking-wide text-slate-500/90 dark:text-slate-400/60">
              {t('common.sponsoredBy')}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}


