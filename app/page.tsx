'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Terminal, ArrowRight, Rocket, Shield } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="bg-[#0d141d] text-[#dce3f0] selection:bg-[#00e5ff] selection:text-[#00626e] min-h-screen font-sans">
      <style dangerouslySetInnerHTML={{__html: `
        .animated-mesh {
          background: radial-gradient(circle at 50% 50%, #151c26 0%, #0d141d 100%);
          position: relative;
          overflow: hidden;
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

        .grid-overlay {
          background-image: linear-gradient(to right, #3b494c 1px, transparent 1px),
                            linear-gradient(to bottom, #3b494c 1px, transparent 1px);
          background-size: 80px 80px;
          mask-image: radial-gradient(ellipse at center, black, transparent 80%);
          -webkit-mask-image: radial-gradient(ellipse at center, black, transparent 80%);
        }
      `}} />

      {/* TopAppBar Navigation */}
      <header className="absolute top-0 w-full z-50 bg-[#0d141d]/20 hover:bg-[#0d141d]/80 transition-colors duration-500 backdrop-blur-md border-b border-[#3b494c]/20">
        <nav className="flex justify-between items-center px-6 md:px-10 py-5 max-w-[1440px] mx-auto">
          <div className="flex items-center gap-3">
            <Terminal className="text-[#c3f5ff] w-8 h-8" />
            <span className="text-2xl font-bold tracking-tighter text-[#c3f5ff]">SAMP</span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <Link className="text-[#c3f5ff] font-bold border-b-2 border-[#00e5ff] pb-1 uppercase tracking-widest text-xs" href="#">Hackathones</Link>
            <Link className="text-[#bac9cc] hover:text-[#c3f5ff] transition-colors uppercase tracking-widest text-xs" href="#">Líderes</Link>
            <Link className="text-[#bac9cc] hover:text-[#c3f5ff] transition-colors uppercase tracking-widest text-xs" href="#">Reglamento</Link>
          </div>
          <Link href="/login">
            <button className="bg-[#00e5ff] text-[#00626e] px-7 py-2.5 rounded-lg text-xs font-extrabold uppercase tracking-widest hover:bg-[#00daf3] transition-all duration-300 scale-95 hover:scale-100 active:scale-90 shadow-[0_0_20px_rgba(0,229,255,0.3)]">
              Acceder
            </button>
          </Link>
        </nav>
      </header>

      <main>
        {/* Hero Section */}
        <section className="relative min-h-screen animated-mesh flex flex-col items-center justify-center pt-24 pb-16">
          {/* Grid Background */}
          <div className="absolute inset-0 grid-overlay opacity-20 pointer-events-none"></div>
          
          {/* Decorative Wave SVGs */}
          <svg className="wave-svg text-[#00e5ff]/10" preserveAspectRatio="none" viewBox="0 0 1440 320">
            <path d="M0,160L48,176C96,192,192,224,288,213.3C384,203,480,149,576,144C672,139,768,181,864,197.3C960,213,1056,203,1152,176C1248,149,1344,107,1392,85.3L1440,64L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z" fill="currentColor"></path>
          </svg>
          <svg className="wave-svg text-[#e1c5ff]" preserveAspectRatio="none" style={{ bottom: '10px', transform: 'scaleY(-1)', opacity: 0.03 }} viewBox="0 0 1440 320">
            <path d="M0,96L60,112C120,128,240,160,360,165.3C480,171,600,149,720,128C840,107,960,85,1080,101.3C1200,117,1320,171,1380,197.3L1440,224L1440,320L1380,320C1320,320,1200,320,1080,320C960,320,840,320,720,320C600,320,480,320,360,320C240,320,120,320,60,320L0,320Z" fill="currentColor"></path>
          </svg>
          
          <div className="relative z-10 max-w-5xl w-full px-6 flex flex-col items-center text-center">
            {/* Logo Image */}
            <div className="mb-8 mt-4 relative">
              <div className="absolute inset-0 bg-[#00e5ff]/20 blur-[100px] rounded-full scale-125"></div>
              <Image 
                src="/samp-logo.png" 
                alt="SAMP Logo" 
                width={300} 
                height={160} 
                className="w-[280px] md:w-[350px] h-auto object-contain relative z-10 drop-shadow-[0_0_40px_rgba(0,229,255,0.5)] scale-110"
              />
            </div>
            
            <div className="space-y-6">
              <span className="inline-block text-[#f5e8ff] uppercase tracking-[0.4em] text-[10px] md:text-xs font-bold py-2.5 px-6 rounded-full bg-[#2e353f]/50 border border-[#3b494c]/50 backdrop-blur-sm">
                Next Tournament: Winter 2026
              </span>
              <h1 className="text-4xl md:text-6xl lg:text-7xl font-black tracking-tighter leading-[1.1] bg-clip-text text-transparent bg-gradient-to-b from-[#c3f5ff] to-[#bac9cc] drop-shadow-sm">
                SISTEMA ACADÉMICO DE MARATONES DE PROGRAMACIÓN
              </h1>
              <p className="text-[#bac9cc] text-base md:text-xl max-w-2xl mx-auto leading-relaxed pt-2 font-medium">
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
        <section className="bg-[#0d141d] py-24 px-6 md:px-10 max-w-[1440px] mx-auto z-20 relative border-t border-[#3b494c]/20">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            
            {/* Main Bento Card */}
            <div className="lg:col-span-2 lg:row-span-2 bg-[#151c26] rounded-[2rem] p-10 flex flex-col justify-between relative overflow-hidden group border border-[#3b494c]/20">
              <div className="absolute -right-20 -top-20 w-80 h-80 bg-[#00e5ff]/5 blur-[100px] group-hover:bg-[#00e5ff]/15 transition-colors duration-1000"></div>
              <div className="relative z-10">
                <span className="text-[#00e5ff] text-xs font-bold uppercase tracking-widest">Ranking Global</span>
                <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold mt-5 tracking-tight text-[#dce3f0] leading-tight max-w-lg">
                  La red de desarrolladores con mayor rendimiento del país.
                </h2>
              </div>
              <div className="mt-16 flex flex-col sm:flex-row items-start sm:items-end justify-between gap-6 relative z-10">
                <div className="flex -space-x-4">
                  <div className="w-14 h-14 rounded-full border-4 border-[#151c26] bg-[#333a44] flex items-center justify-center overflow-hidden shadow-2xl">
                    <Image width={56} height={56} className="object-cover w-full h-full" alt="avatar" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAFcItrovh4Gqn66IDybEmjbVqEVsHAduVUanHJeU63meT7u3LE5UHXNero5eJfo06w4ftAkUUTLKhczmapcRDQ7N-Bi9cc_WM0DzyAVREkeD6tLyrg8U2DWnDpSkE1O5TmNTWCAN9UriGxq49xYs_3a_sUOuAaKKhbnw4BNMromFGU1ddSp5mtm7tt0nXmJssYAR0NbB_QwD16lEIBvbN5grK_C8poEpq6AOsC-uddR2rONWeeZWzkfF5GIGkVcofLGAKesR-9hbQ" />
                  </div>
                  <div className="w-14 h-14 rounded-full border-4 border-[#151c26] bg-[#333a44] flex items-center justify-center overflow-hidden shadow-2xl">
                    <Image width={56} height={56} className="object-cover w-full h-full" alt="avatar2" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDSsRWc_oCG2z252MyUiLT85mgDd7AJ7x-AJnXUwdU5fnrz8RnqxdbOv2rkMo5I6xByv8H0y3jbWdd2hduql3ZXRlpdaegrPv3u5qumrBl0LoAcG4fncAMxjcxJyf7kD8deL7FuJ2ayoK0zc4W_LG9luDaF7jLMmgPIRWKV3xONsn_nQWJ_2Efb_uTM6LYrCkFAPzo9-zaOJu9eiCySm_usA4bK9vekqVJ6GqEG7j-nuLfJfPP9n3jWsUiqEc3pStzygdC_azQimJE" />
                  </div>
                  <div className="w-14 h-14 rounded-full border-4 border-[#151c26] bg-[#3e4754] flex items-center justify-center text-[#c3f5ff] text-sm font-bold shadow-2xl">
                    +42
                  </div>
                </div>
                <span className="text-[#bac9cc] text-sm font-medium">Universidades Líderes Top 50</span>
              </div>
            </div>

            <div className="bg-[#2e353f]/20 border border-[#3b494c]/20 rounded-[2rem] p-8 hover:translate-y-[-4px] hover:bg-[#2e353f]/30 transition-all duration-300 group">
              <div className="w-16 h-16 rounded-full bg-[#00e5ff]/10 flex items-center justify-center mb-6">
                <Rocket className="text-[#00e5ff] w-8 h-8 group-hover:scale-110 transition-transform" />
              </div>
              <h3 className="text-xl font-bold mb-3 uppercase tracking-tight text-[#dce3f0]">Performance</h3>
              <p className="text-[#bac9cc] text-sm leading-relaxed">
                Análisis de ejecución en milisegundos y pruebas unitarias automáticas para cada envío.
              </p>
            </div>

            <div className="bg-[#2e353f]/20 border border-[#3b494c]/20 rounded-[2rem] p-8 hover:translate-y-[-4px] hover:bg-[#2e353f]/30 transition-all duration-300 group">
              <div className="w-16 h-16 rounded-full bg-[#e1c5ff]/10 flex items-center justify-center mb-6">
                <Shield className="text-[#e1c5ff] w-8 h-8 group-hover:scale-110 transition-transform" />
              </div>
              <h3 className="text-xl font-bold mb-3 uppercase tracking-tight text-[#dce3f0]">Seguridad</h3>
              <p className="text-[#bac9cc] text-sm leading-relaxed">
                Sandboxing de nivel empresarial para todo el código competitivo aislando entornos.
              </p>
            </div>

            <div className="lg:col-span-2 bg-gradient-to-r from-[#151c26] to-[#19202a] p-10 rounded-[2rem] flex items-center justify-between border border-[#3b494c]/20 shadow-xl relative overflow-hidden group">
               <div className="absolute right-0 top-0 h-full w-2/3 bg-gradient-to-l from-[#00e5ff]/5 to-transparent pointer-events-none group-hover:from-[#00e5ff]/10 transition-colors"></div>
              <div className="space-y-4 relative z-10 max-w-xs">
                <span className="text-[#00e5ff] text-xs font-bold uppercase tracking-[0.2em] flex items-center gap-2">
                   <span className="w-2 h-2 rounded-full bg-[#00e5ff] animate-pulse"></span> Estado de Maratón
                </span>
                <p className="text-2xl md:text-3xl font-bold text-[#dce3f0] leading-tight">Decenas de sedes unidas en vivo.</p>
              </div>
              <div className="h-16 w-16 rounded-full bg-[#00e5ff]/10 flex items-center justify-center shrink-0 border border-[#00e5ff]/20">
                <div className="w-4 h-4 bg-[#00e5ff] rounded-full animate-ping"></div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-[#080f18] w-full py-16 border-t border-[#3b494c]/20">
        <div className="flex flex-col items-center gap-8 px-6 max-w-[1440px] mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#00e5ff]/10 flex items-center justify-center">
               <Terminal className="text-[#00e5ff] w-5 h-5" />
            </div>
            <span className="text-xl font-bold tracking-widest text-[#00e5ff]">SAMP ACADEMIC</span>
          </div>
          <div className="flex flex-wrap justify-center gap-8 text-sm font-medium">
            <Link className="text-[#bac9cc] hover:text-[#00e5ff] transition-colors" href="#">Política de Privacidad</Link>
            <Link className="text-[#bac9cc] hover:text-[#00e5ff] transition-colors" href="#">Soporte Técnico</Link>
          </div>
          <p className="text-xs font-bold text-[#3b494c] text-center mt-6 tracking-widest uppercase">
            © 2026 SAMP - Sistema Académico de Maratones de Programación
          </p>
        </div>
      </footer>
    </div>
  );
}
