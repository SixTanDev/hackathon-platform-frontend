'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useTheme } from 'next-themes';
import { Terminal, ArrowRight, Brain, BarChart3, ShieldCheck, Sun, Moon } from 'lucide-react';
import { AnimatedDotBackground } from '@/components/landing/animated-dot-background';

export default function HomePage() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="bg-slate-50 dark:bg-[#0d141d] text-slate-900 dark:text-[#dce3f0] selection:bg-[#00e5ff] selection:text-[#00626e] min-h-screen font-sans transition-colors duration-500">
      <style dangerouslySetInnerHTML={{__html: `
        .animated-mesh {
          position: relative;
          overflow: hidden;
        }
        /* Gradient specifically for dark mode */
        .dark .animated-mesh {
          background: radial-gradient(circle at 50% 50%, #151c26 0%, #0d141d 100%);
        }
        /* Gradient for light mode */
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
      `}} />

      {/* TopAppBar Navigation */}
      <header className="absolute top-0 w-full z-50 bg-white/40 dark:bg-[#0d141d]/20 hover:bg-white/90 dark:hover:bg-[#0d141d]/80 transition-colors duration-500 backdrop-blur-md border-b border-slate-200 dark:border-[#3b494c]/20">
        <nav className="flex justify-between items-center px-6 md:px-10 py-5 max-w-[1440px] mx-auto">
          <div className="flex items-center gap-3">
            <Terminal className="text-[#00e5ff] dark:text-[#c3f5ff] w-8 h-8" />
            <span className="text-2xl font-bold tracking-tighter text-slate-800 dark:text-[#c3f5ff]">SAMP</span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <Link className="text-slate-800 dark:text-[#c3f5ff] font-bold border-b-2 border-[#00e5ff] pb-1 uppercase tracking-widest text-xs" href="#">Hackathones</Link>
            <Link className="text-slate-500 dark:text-[#bac9cc] hover:text-[#00e5ff] dark:hover:text-[#c3f5ff] transition-colors uppercase tracking-widest text-xs" href="#">Líderes</Link>
            <Link className="text-slate-500 dark:text-[#bac9cc] hover:text-[#00e5ff] dark:hover:text-[#c3f5ff] transition-colors uppercase tracking-widest text-xs" href="#">Reglamento</Link>
          </div>
          <div className="flex items-center gap-4">
            {mounted && (
              <button
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                aria-label="Toggle theme"
              >
                {theme === 'dark' ? <Sun className="w-5 h-5 text-[#c3f5ff]" /> : <Moon className="w-5 h-5 text-slate-700" />}
              </button>
            )}
            <Link href="/login">
              <button className="bg-[#00e5ff] text-[#00626e] px-7 py-2.5 rounded-lg text-xs font-extrabold uppercase tracking-widest hover:bg-[#00daf3] transition-all duration-300 scale-95 hover:scale-100 active:scale-90 shadow-[0_0_20px_rgba(0,229,255,0.3)]">
                Acceder
              </button>
            </Link>
          </div>
        </nav>
      </header>

      <main>
        {/* Hero Section */}
        <section className="relative min-h-screen animated-mesh flex flex-col items-center justify-center pt-24 pb-16">
          {/* Interactive Canvas Grid */}
          <AnimatedDotBackground />
          
          {/* Decorative Wave SVGs */}
          <svg className="wave-svg text-[#00e5ff]/20 dark:text-[#00e5ff]/10" preserveAspectRatio="none" viewBox="0 0 1440 320">
            <path d="M0,160L48,176C96,192,192,224,288,213.3C384,203,480,149,576,144C672,139,768,181,864,197.3C960,213,1056,203,1152,176C1248,149,1344,107,1392,85.3L1440,64L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z" fill="currentColor"></path>
          </svg>
          <svg className="wave-svg text-purple-200 dark:text-[#e1c5ff]" preserveAspectRatio="none" style={{ bottom: '10px', transform: 'scaleY(-1)', opacity: 0.05 }} viewBox="0 0 1440 320">
            <path d="M0,96L60,112C120,128,240,160,360,165.3C480,171,600,149,720,128C840,107,960,85,1080,101.3C1200,117,1320,171,1380,197.3L1440,224L1440,320L1380,320C1320,320,1200,320,1080,320C960,320,840,320,720,320C600,320,480,320,360,320C240,320,120,320,60,320L0,320Z" fill="currentColor"></path>
          </svg>
          
          <div className="relative z-10 max-w-5xl w-full px-6 flex flex-col items-center text-center">
            {/* Logo Image */}
            <div className="mb-8 mt-4 relative">
              <div className="absolute inset-0 bg-[#00e5ff]/30 dark:bg-[#00e5ff]/20 blur-[100px] rounded-full scale-125"></div>
              <Image 
                src="/samp-logo.png" 
                alt="SAMP Logo" 
                width={300} 
                height={160} 
                className="w-[280px] md:w-[350px] h-auto object-contain relative z-10 drop-shadow-[0_0_30px_rgba(0,229,255,0.6)] dark:drop-shadow-[0_0_40px_rgba(0,229,255,0.5)] scale-110"
              />
            </div>
            
            <div className="space-y-6">
              <span className="inline-block text-purple-700 dark:text-[#f5e8ff] uppercase tracking-[0.4em] text-[10px] md:text-xs font-bold py-2.5 px-6 rounded-full bg-slate-200/50 dark:bg-[#2e353f]/50 border border-slate-300 dark:border-[#3b494c]/50 backdrop-blur-sm">
                Next Tournament: Winter 2026
              </span>
              <h1 className="text-4xl md:text-6xl lg:text-7xl font-black tracking-tighter leading-[1.1] bg-clip-text text-transparent bg-gradient-to-b from-blue-600 to-slate-800 dark:from-[#c3f5ff] dark:to-[#bac9cc] drop-shadow-sm">
                SISTEMA ACADÉMICO DE MARATONES DE PROGRAMACIÓN
              </h1>
              <p className="text-slate-600 dark:text-[#bac9cc] text-base md:text-xl max-w-2xl mx-auto leading-relaxed pt-2 font-medium">
                Supera tus límites algorítmicos en la competición académica más prestigiosa. Conecta con la élite y resuelve lo imposible.
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mt-14 w-full">
              <Link href="/login" className="w-full sm:w-auto">
                <button className="w-full px-10 py-5 bg-[#00e5ff] text-[#00626e] font-extrabold rounded-2xl shadow-[0_0_40px_rgba(0,229,255,0.25)] hover:bg-[#00daf3] hover:scale-105 active:scale-95 transition-all duration-300 group flex items-center justify-center gap-3">
                  <span className="uppercase tracking-widest">Ingresar Plataforma</span>
                  <ArrowRight className="w-6 h-6 transition-transform group-hover:translate-x-2" />
                </button>
              </Link>
            </div>
          </div>
        </section>

        {/* Bento Stats Section */}
        <section className="bg-slate-50 dark:bg-[#0d141d] py-24 px-6 md:px-10 max-w-[1440px] mx-auto z-20 relative border-t border-slate-200 dark:border-[#3b494c]/20 transition-colors duration-500">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            
            {/* Main Bento Card - Competition */}
            <div className="lg:col-span-2 lg:row-span-2 bg-white dark:bg-[#151c26] rounded-[2rem] p-10 flex flex-col justify-between relative overflow-hidden group border border-slate-200 dark:border-[#3b494c]/20 shadow-xl dark:shadow-none transition-colors duration-500">
              <div className="absolute -right-20 -top-20 w-80 h-80 bg-[#00e5ff]/10 dark:bg-[#00e5ff]/5 blur-[100px] group-hover:bg-[#00e5ff]/20 dark:group-hover:bg-[#00e5ff]/15 transition-colors duration-1000"></div>
              <div className="relative z-10">
                <span className="text-[#00e5ff] text-xs font-bold uppercase tracking-widest">Competición Académica</span>
                <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold mt-5 tracking-tight text-slate-900 dark:text-[#dce3f0] leading-tight max-w-lg">
                  Entorno integral de evaluación y maratones de programación en vivo.
                </h2>
              </div>
              <div className="mt-16 flex flex-col sm:flex-row items-start sm:items-end justify-between gap-6 relative z-10">
                <div className="flex -space-x-4">
                  <div className="w-14 h-14 rounded-full border-4 border-white dark:border-[#151c26] bg-slate-200 dark:bg-[#333a44] flex items-center justify-center overflow-hidden shadow-2xl">
                    <Image width={56} height={56} className="object-cover w-full h-full" alt="avatar" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAFcItrovh4Gqn66IDybEmjbVqEVsHAduVUanHJeU63meT7u3LE5UHXNero5eJfo06w4ftAkUUTLKhczmapcRDQ7N-Bi9cc_WM0DzyAVREkeD6tLyrg8U2DWnDpSkE1O5TmNTWCAN9UriGxq49xYs_3a_sUOuAaKKhbnw4BNMromFGU1ddSp5mtm7tt0nXmJssYAR0NbB_QwD16lEIBvbN5grK_C8poEpq6AOsC-uddR2rONWeeZWzkfF5GIGkVcofLGAKesR-9hbQ" />
                  </div>
                  <div className="w-14 h-14 rounded-full border-4 border-white dark:border-[#151c26] bg-slate-200 dark:bg-[#333a44] flex items-center justify-center overflow-hidden shadow-2xl">
                    <Image width={56} height={56} className="object-cover w-full h-full" alt="avatar2" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDSsRWc_oCG2z252MyUiLT85mgDd7AJ7x-AJnXUwdU5fnrz8RnqxdbOv2rkMo5I6xByv8H0y3jbWdd2hduql3ZXRlpdaegrPv3u5qumrBl0LoAcG4fncAMxjcxJyf7kD8deL7FuJ2ayoK0zc4W_LG9luDaF7jLMmgPIRWKV3xONsn_nQWJ_2Efb_uTM6LYrCkFAPzo9-zaOJu9eiCySm_usA4bK9vekqVJ6GqEG7j-nuLfJfPP9n3jWsUiqEc3pStzygdC_azQimJE" />
                  </div>
                  <div className="w-14 h-14 rounded-full border-4 border-white dark:border-[#151c26] bg-slate-800 dark:bg-[#3e4754] flex items-center justify-center text-[#c3f5ff] text-sm font-bold shadow-2xl">
                    +42
                  </div>
                </div>
                <span className="text-slate-600 dark:text-[#bac9cc] text-sm font-medium">Equipos y Sedes Unidas</span>
              </div>
            </div>

            {/* Bento Card 2 - AI Student Agent */}
            <div className="bg-white dark:bg-[#2e353f]/20 border border-slate-200 dark:border-[#3b494c]/20 rounded-[2rem] p-8 hover:translate-y-[-4px] hover:shadow-xl hover:bg-slate-50 dark:hover:bg-[#2e353f]/30 transition-all duration-300 group shadow-md dark:shadow-none">
              <div className="w-16 h-16 rounded-full bg-[#00e5ff]/10 flex items-center justify-center mb-6">
                <Brain className="text-[#00e5ff] w-8 h-8 group-hover:scale-110 transition-transform" />
              </div>
              <h3 className="text-xl font-bold mb-3 uppercase tracking-tight text-slate-900 dark:text-[#dce3f0]">Tutoría Inteligente</h3>
              <p className="text-slate-600 dark:text-[#bac9cc] text-sm leading-relaxed">
                El Agente IA te acompaña dándote <strong className="font-extrabold text-[#00e5ff] dark:text-[#00e5ff] drop-shadow-sm">pistas estratégicas</strong> para que descubras la solución por ti mismo, fomentando el aprendizaje real.
              </p>
            </div>

            {/* Bento Card 3 - Teacher Reports */}
            <div className="bg-white dark:bg-[#2e353f]/20 border border-slate-200 dark:border-[#3b494c]/20 rounded-[2rem] p-8 hover:translate-y-[-4px] hover:shadow-xl hover:bg-slate-50 dark:hover:bg-[#2e353f]/30 transition-all duration-300 group shadow-md dark:shadow-none">
              <div className="w-16 h-16 rounded-full bg-purple-100 dark:bg-[#e1c5ff]/10 flex items-center justify-center mb-6">
                <BarChart3 className="text-purple-600 dark:text-[#e1c5ff] w-8 h-8 group-hover:scale-110 transition-transform" />
              </div>
              <h3 className="text-xl font-bold mb-3 uppercase tracking-tight text-slate-900 dark:text-[#dce3f0]">Analíticas Docentes</h3>
              <p className="text-slate-600 dark:text-[#bac9cc] text-sm leading-relaxed">
                Módulo avanzado para tutores. Genera reportes de rendimiento y supervisa el avance de cada estudiante con métricas precisas.
              </p>
            </div>

            {/* Bento Card 4 - Secure Infrastructure */}
            <div className="lg:col-span-2 bg-gradient-to-r from-slate-100 to-slate-200 dark:from-[#151c26] dark:to-[#19202a] p-10 rounded-[2rem] flex items-center justify-between border border-slate-200 dark:border-[#3b494c]/20 shadow-xl relative overflow-hidden group transition-all duration-500">
               <div className="absolute right-0 top-0 h-full w-2/3 bg-gradient-to-l from-[#00e5ff]/10 dark:from-[#00e5ff]/5 to-transparent pointer-events-none group-hover:from-[#00e5ff]/20 dark:group-hover:from-[#00e5ff]/10 transition-colors"></div>
              <div className="space-y-4 relative z-10 max-w-sm">
                <span className="text-[#00e5ff] dark:text-[#00e5ff] text-xs font-bold uppercase tracking-[0.2em] flex items-center gap-2">
                   <ShieldCheck className="w-4 h-4 text-[#00e5ff]" /> Ejecución Segura
                </span>
                <p className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-[#dce3f0] leading-tight">Milisegundos de performance con Sandboxing empresarial.</p>
              </div>
              <div className="h-16 w-16 rounded-full bg-[#00e5ff]/20 dark:bg-[#00e5ff]/10 flex items-center justify-center shrink-0 border border-[#00e5ff]/30 dark:border-[#00e5ff]/20">
                <div className="w-4 h-4 bg-[#00e5ff] rounded-full animate-pulse"></div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-slate-100 dark:bg-[#080f18] w-full py-16 border-t border-slate-200 dark:border-[#3b494c]/20 transition-colors duration-500">
        <div className="flex flex-col items-center gap-8 px-6 max-w-[1440px] mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#00e5ff]/20 dark:bg-[#00e5ff]/10 flex items-center justify-center">
               <Terminal className="text-[#00e5ff] w-5 h-5" />
            </div>
            <span className="text-xl font-bold tracking-widest text-[#00e5ff]">SAMP ACADEMIC</span>
          </div>
          <div className="flex flex-wrap justify-center gap-8 text-sm font-medium">
            <Link className="text-slate-600 dark:text-[#bac9cc] hover:text-[#00e5ff] dark:hover:text-[#00e5ff] transition-colors" href="#">Política de Privacidad</Link>
            <Link className="text-slate-600 dark:text-[#bac9cc] hover:text-[#00e5ff] dark:hover:text-[#00e5ff] transition-colors" href="#">Soporte Técnico</Link>
          </div>
          <p className="text-xs font-bold text-slate-400 dark:text-[#3b494c] text-center mt-6 tracking-widest uppercase">
            © 2026 SAMP - Sistema Académico de Maratones de Programación
          </p>
        </div>
      </footer>
    </div>
  );
}
