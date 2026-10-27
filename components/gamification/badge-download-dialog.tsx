'use client';

import { useState, useRef, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, Award, Crown, Medal, Sparkles, Check, Share2, ShieldCheck } from 'lucide-react';
import type { LeaderboardEntry } from '@/types/api';

interface BadgeDownloadDialogProps {
  entry: LeaderboardEntry;
  rank: number;
  hackathonTitle?: string;
  triggerLabel?: string;
  showIconOnly?: boolean;
  className?: string;
}

export function BadgeDownloadDialog({
  entry,
  rank,
  hackathonTitle = 'Hackathon UNAD 2026',
  triggerLabel = 'Descargar Insignia',
  showIconOnly = false,
  className = '',
}: BadgeDownloadDialogProps) {
  const [open, setOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const getRankData = (r: number) => {
    switch (r) {
      case 1:
        return {
          title: 'PRIMER LUGAR · MEDALLA DE ORO',
          badgeText: 'Campeón Hackathon',
          medal: '🥇',
          primaryColor: '#F59E0B',
          secondaryColor: '#FEF3C7',
          borderColor: '#D97706',
          gradientStart: '#B45309',
          gradientEnd: '#FBBF24',
          bgLight: 'bg-amber-500/10',
          textColor: 'text-amber-500',
          badgeBorder: 'border-amber-500/40',
        };
      case 2:
        return {
          title: 'SEGUNDO LUGAR · MEDALLA DE PLATA',
          badgeText: 'Subcampeón Hackathon',
          medal: '🥈',
          primaryColor: '#94A3B8',
          secondaryColor: '#F1F5F9',
          borderColor: '#64748B',
          gradientStart: '#475569',
          gradientEnd: '#CBD5E1',
          bgLight: 'bg-slate-400/10',
          textColor: 'text-slate-300',
          badgeBorder: 'border-slate-400/40',
        };
      case 3:
        return {
          title: 'TERCER LUGAR · MEDALLA DE BRONCE',
          badgeText: 'Tercer Puesto',
          medal: '🥉',
          primaryColor: '#D97706',
          secondaryColor: '#FFEDD5',
          borderColor: '#9A3412',
          gradientStart: '#7C2D12',
          gradientEnd: '#EA580C',
          bgLight: 'bg-amber-700/10',
          textColor: 'text-amber-600',
          badgeBorder: 'border-amber-700/40',
        };
      default:
        return {
          title: `PUESTO #${r} · PARTICIPACIÓN DESTACADA`,
          badgeText: 'Finalista Hackathon',
          medal: '🎖️',
          primaryColor: '#00B4D8',
          secondaryColor: '#E0F2FE',
          borderColor: '#0284C7',
          gradientStart: '#0369A1',
          gradientEnd: '#38BDF8',
          bgLight: 'bg-sky-500/10',
          textColor: 'text-sky-400',
          badgeBorder: 'border-sky-500/40',
        };
    }
  };

  const rankData = getRankData(rank);

  const generateAndDownloadPNG = useCallback(() => {
    setIsGenerating(true);
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 1200;
      canvas.height = 800;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // ─── 1. Background Gradient ───
      const bgGradient = ctx.createRadialGradient(600, 400, 50, 600, 400, 700);
      bgGradient.addColorStop(0, '#0F172A');
      bgGradient.addColorStop(0.6, '#090D16');
      bgGradient.addColorStop(1, '#020617');
      ctx.fillStyle = bgGradient;
      ctx.fillRect(0, 0, 1200, 800);

      // Subtle grid pattern
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
      ctx.lineWidth = 1;
      for (let x = 0; x < 1200; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, 800);
        ctx.stroke();
      }
      for (let y = 0; y < 800; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(1200, y);
        ctx.stroke();
      }

      // ─── 2. Outer Ornamental Border ───
      const borderGrad = ctx.createLinearGradient(0, 0, 1200, 800);
      borderGrad.addColorStop(0, rankData.gradientStart);
      borderGrad.addColorStop(0.5, rankData.gradientEnd);
      borderGrad.addColorStop(1, rankData.gradientStart);

      ctx.strokeStyle = borderGrad;
      ctx.lineWidth = 6;
      ctx.strokeRect(30, 30, 1140, 740);

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(40, 40, 1120, 720);

      // Corner ornaments
      const drawCorner = (cx: number, cy: number) => {
        ctx.strokeStyle = rankData.primaryColor;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(cx, cy, 18, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = rankData.gradientEnd;
        ctx.beginPath();
        ctx.arc(cx, cy, 6, 0, Math.PI * 2);
        ctx.fill();
      };
      drawCorner(55, 55);
      drawCorner(1145, 55);
      drawCorner(55, 745);
      drawCorner(1145, 745);

      // ─── 3. Header: UNAD & SAM ───
      ctx.textAlign = 'center';
      ctx.fillStyle = '#94A3B8';
      ctx.font = 'bold 16px "Inter", "Segoe UI", sans-serif';
      ctx.fillText('UNIVERSIDAD NACIONAL ABIERTA Y A DISTANCIA · UNAD', 600, 85);

      ctx.fillStyle = '#00B4D8';
      ctx.font = '600 13px "Inter", "Segoe UI", sans-serif';
      ctx.fillText('VICERRECTORÍA DE SERVICIOS A ASPIRANTES, ESTUDIANTES Y EGRESADOS · VISAE', 600, 110);

      // Divider line
      const lineGrad = ctx.createLinearGradient(350, 0, 850, 0);
      lineGrad.addColorStop(0, 'transparent');
      lineGrad.addColorStop(0.5, rankData.primaryColor);
      lineGrad.addColorStop(1, 'transparent');
      ctx.strokeStyle = lineGrad;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(350, 130);
      ctx.lineTo(850, 130);
      ctx.stroke();

      // ─── 4. Central Emblem / Laurel Badge ───
      const emblemCenterY = 240;

      // Glow behind medal
      const glow = ctx.createRadialGradient(600, emblemCenterY, 10, 600, emblemCenterY, 90);
      glow.addColorStop(0, `${rankData.primaryColor}55`);
      glow.addColorStop(1, 'transparent');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(600, emblemCenterY, 90, 0, Math.PI * 2);
      ctx.fill();

      // Outer medal circle
      ctx.strokeStyle = borderGrad;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(600, emblemCenterY, 65, 0, Math.PI * 2);
      ctx.stroke();

      // Inner medal fill
      const medalGrad = ctx.createLinearGradient(540, emblemCenterY - 60, 660, emblemCenterY + 60);
      medalGrad.addColorStop(0, '#1E293B');
      medalGrad.addColorStop(1, '#0F172A');
      ctx.fillStyle = medalGrad;
      ctx.beginPath();
      ctx.arc(600, emblemCenterY, 60, 0, Math.PI * 2);
      ctx.fill();

      // Medal text/icon
      ctx.font = '54px "Segoe UI Emoji", "Apple Color Emoji", sans-serif';
      ctx.fillText(rankData.medal, 600, emblemCenterY + 18);

      // ─── 5. Title & Award Rank ───
      ctx.fillStyle = borderGrad;
      ctx.font = 'bold 26px "Inter", "Segoe UI", sans-serif';
      ctx.fillText(rankData.title, 600, 360);

      ctx.fillStyle = '#CBD5E1';
      ctx.font = '16px "Inter", "Segoe UI", sans-serif';
      ctx.fillText('Certifica que', 600, 395);

      // Student name (Large, Gold/Silver)
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 44px "Inter", "Segoe UI", sans-serif';
      ctx.fillText(entry.display_name, 600, 450);

      // Underline student name
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(400, 465);
      ctx.lineTo(800, 465);
      ctx.stroke();

      // Hackathon Description
      ctx.fillStyle = '#E2E8F0';
      ctx.font = '500 20px "Inter", "Segoe UI", sans-serif';
      ctx.fillText(`Ha obtenido un desempeño de honor en el evento:`, 600, 505);

      ctx.fillStyle = rankData.gradientEnd;
      ctx.font = 'bold 24px "Inter", "Segoe UI", sans-serif';
      ctx.fillText(`"${hackathonTitle}"`, 600, 540);

      // ─── 6. Metrics & Performance Pill ───
      const pillWidth = 520;
      const pillHeight = 50;
      const pillX = 600 - pillWidth / 2;
      const pillY = 575;

      ctx.fillStyle = 'rgba(30, 41, 59, 0.8)';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(pillX, pillY, pillWidth, pillHeight, 25);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 16px "Inter", "Segoe UI", sans-serif';
      const metricsText = `⭐ Puntaje: ${entry.score.toLocaleString()} PTS   |   ✓ Resueltos: ${entry.submissions_passed} retos   |   💡 Pistas: ${entry.hints_used}`;
      ctx.fillText(metricsText, 600, pillY + 31);

      // ─── 7. Footer & Security Seal ───
      const dateStr = new Date().toLocaleDateString('es-CO', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      ctx.fillStyle = '#64748B';
      ctx.font = '13px "Inter", "Segoe UI", sans-serif';
      ctx.fillText(`Expedido el ${dateStr} · Plataforma Oficial SAM (Sistema de Acompañamiento Multicampus)`, 600, 680);

      ctx.fillStyle = '#00B4D8';
      ctx.font = 'bold 12px "Inter", "Courier New", monospace';
      const verifyHash = `ID: ${entry.user_global_id?.slice(0, 8) || 'PARTICIPANTE'} · VERIFIED-UNAD-2026-TOKEN-${rank}`;
      ctx.fillText(verifyHash, 600, 705);

      // ─── Trigger download ───
      const safeName = entry.display_name.replace(/[^a-zA-Z0-9_-]/g, '_');
      const filename = `Insignia_UNAD_${safeName}_Puesto_${rank}.png`;

      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = filename;
      link.href = dataUrl;
      link.click();
    } catch (e) {
      console.error('Error generating badge PNG:', e);
    } finally {
      setIsGenerating(false);
    }
  }, [entry, rank, hackathonTitle, rankData]);

  const handleShare = () => {
    const text = `🏆 ¡Obtuve el puesto #${rank} (${entry.score} pts) en el "${hackathonTitle}" de la UNAD con mi insignia oficial!`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        className={`bg-transparent hover:bg-muted/30 text-foreground border border-border/40 hover:border-unad-gold/60 transition-all duration-200 shadow-none font-medium ${className}`}
        title={`Ver y descargar insignia de ${entry.display_name}`}
      >
        <Download className="w-3.5 h-3.5 mr-1 text-unad-gold" />
        {!showIconOnly && <span>{triggerLabel}</span>}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md sm:max-w-lg p-0 overflow-hidden border-unad-gold/30 bg-card">
          <DialogHeader className="p-5 pb-2 text-center">
            <div className="flex justify-center mb-2">
              <span className="text-3xl">{rankData.medal}</span>
            </div>
            <DialogTitle className="text-xl font-bold flex items-center justify-center gap-2">
              <span>Insignia Oficial de Reconocimiento</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Expedida por la UNAD · Sistema de Acompañamiento Multicampus (SAM)
            </DialogDescription>
          </DialogHeader>

          {/* Interactive Badge Preview Card */}
          <div className="p-6 pt-2">
            <div className={`relative rounded-2xl p-6 border-2 ${rankData.badgeBorder} ${rankData.bgLight} overflow-hidden shadow-xl text-center space-y-4 backdrop-blur-sm`}>
              {/* Decorative top pill */}
              <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-background/80 border border-border/60 shadow-sm">
                <Sparkles className="w-3 h-3 text-unad-gold" />
                <span className={rankData.textColor}>{rankData.badgeText}</span>
              </div>

              {/* Large Medal Emblem */}
              <div className="relative mx-auto w-20 h-20 rounded-full bg-background/90 border-2 border-unad-gold/60 flex items-center justify-center shadow-lg">
                <span className="text-4xl">{rankData.medal}</span>
              </div>

              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Participante</p>
                <h3 className="text-xl font-black tracking-tight text-foreground mt-0.5">
                  {entry.display_name}
                </h3>
              </div>

              <div className="bg-background/70 border border-border/50 rounded-xl p-3 grid grid-cols-3 gap-2 text-center text-xs">
                <div>
                  <p className="text-[10px] text-muted-foreground">Puesto</p>
                  <p className={`font-black text-sm ${rankData.textColor}`}>#{rank}</p>
                </div>
                <div className="border-x border-border/50">
                  <p className="text-[10px] text-muted-foreground">Puntaje</p>
                  <p className="font-black text-sm text-foreground">{entry.score} pts</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">Resueltos</p>
                  <p className="font-black text-sm text-foreground">{entry.submissions_passed}</p>
                </div>
              </div>

              <div className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span>Insignia digital validada institucionalmente</span>
              </div>
            </div>
          </div>

          <DialogFooter className="p-4 bg-muted/20 border-t border-border/40 flex flex-col sm:flex-row items-center justify-between gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleShare}
              className="w-full sm:w-auto text-xs bg-transparent hover:bg-muted/40 border border-border/40"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 mr-1 text-emerald-500" /> ¡Copiado!
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5 mr-1" /> Copiar logro
                </>
              )}
            </Button>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setOpen(false)}
                className="w-1/2 sm:w-auto text-xs bg-transparent hover:bg-muted/40"
              >
                Cerrar
              </Button>
              <Button
                size="sm"
                onClick={generateAndDownloadPNG}
                disabled={isGenerating}
                className="w-1/2 sm:w-auto text-xs bg-unad-gold hover:bg-amber-600 text-slate-950 font-bold shadow-md"
              >
                <Download className="w-3.5 h-3.5 mr-1.5" />
                {isGenerating ? 'Generando...' : 'Descargar PNG'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
