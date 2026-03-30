'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-client';
import { requestHint, getSubmissions } from '@/lib/api/challenge-services';
import { useCooldownTimer } from '@/hooks/use-cooldown-timer';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Lightbulb,
  Loader2,
  ChevronDown,
  ChevronUp,
  Lock,
  Clock,
  AlertTriangle,
  Bot,
} from 'lucide-react';
import type { HintResponse } from '@/types/api';

// ─── Types ─────────────────────────────────────────────────

interface HintEntry {
  level: number;
  text: string;
  timestamp: Date;
}

interface HintPanelProps {
  hackathonId: string;
  challengeId: string;
  code: string;
  penaltyPercent: number;
  maxHints?: number;
}

// ─── Constants ─────────────────────────────────────────────

const HINT_LEVELS = [
  {
    level: 1,
    emoji: '💡',
    label: 'Empujón Suave',
    description: 'Un concepto general',
    tooltip: 'Recibirás una pista general sobre qué concepto o técnica aplicar, sin detalles específicos.',
  },
  {
    level: 2,
    emoji: '🧭',
    label: 'Dirección',
    description: 'Un enfoque específico',
    tooltip: 'Recibirás una orientación más precisa sobre cómo abordar el problema, incluyendo el enfoque algorítmico.',
  },
  {
    level: 3,
    emoji: '📋',
    label: 'Esquema Guiado',
    description: 'Pasos de alto nivel (sin código)',
    tooltip: 'Recibirás una lista de pasos en lenguaje natural para resolver el problema, sin código fuente.',
  },
  {
    level: 4,
    emoji: '🔍',
    label: 'Detector de Errores',
    description: 'Analizar mi código',
    tooltip: 'La IA analizará tu código actual y te indicará dónde están los errores o qué puedes mejorar.',
  },
] as const;

const LEVEL_COLORS: Record<number, string> = {
  1: 'bg-green-500/10 text-green-500 border-green-500/30',
  2: 'bg-blue-500/10 text-blue-500 border-blue-500/30',
  3: 'bg-amber-500/10 text-amber-500 border-amber-500/30',
  4: 'bg-red-500/10 text-red-500 border-red-500/30',
};

const BUDGET_COLOR = (used: number, max: number): string => {
  const ratio = used / max;
  if (ratio >= 0.8) return 'text-red-500';
  if (ratio >= 0.6) return 'text-amber-500';
  return 'text-green-500';
};

const PROGRESS_COLOR = (used: number, max: number): string => {
  const ratio = used / max;
  if (ratio >= 0.8) return '[&>div]:bg-red-500';
  if (ratio >= 0.6) return '[&>div]:bg-amber-500';
  return '[&>div]:bg-green-500';
};

// ─── Markdown renderer (no code blocks) ─────────────────────

function HintMarkdown({ text }: { text: string }) {
  const html = useMemo(() => {
    let t = text ?? '';
    // Strip code blocks entirely
    t = t.replace(/```[\s\S]*?```/g, '');
    // Strip inline code
    t = t.replace(/`([^`]+)`/g, '<strong>$1</strong>');
    // Bold
    t = t.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    // Italic
    t = t.replace(/\*(.+?)\*/g, '<em>$1</em>');
    // Headers
    t = t.replace(/^### (.+)$/gm, '<p class="font-semibold mt-2">$1</p>');
    t = t.replace(/^## (.+)$/gm, '<p class="font-semibold mt-2">$1</p>');
    t = t.replace(/^# (.+)$/gm, '<p class="font-bold mt-2">$1</p>');
    // Lists
    t = t.replace(/^- (.+)$/gm, '<li class="ml-4 list-disc">$1</li>');
    t = t.replace(/^\d+\. (.+)$/gm, '<li class="ml-4 list-decimal">$1</li>');
    // Paragraphs
    t = t.replace(/\n\n/g, '</p><p class="my-1">');
    t = `<p class="my-1">${t}</p>`;
    return t;
  }, [text]);

  return (
    <div
      className="text-xs text-muted-foreground leading-relaxed"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

// ─── Main Component ─────────────────────────────────────────

export function HintPanel({
  hackathonId,
  challengeId,
  code,
  penaltyPercent,
  maxHints = 5,
}: HintPanelProps) {
  const { toast } = useToast();
  const cooldown = useCooldownTimer();
  const scrollRef = useRef<HTMLDivElement>(null);

  const [expanded, setExpanded] = useState(false);
  const [hints, setHints] = useState<HintEntry[]>([]);
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null);
  const [message, setMessage] = useState('');

  const hintsUsed = hints.length;
  const hintsRemaining = maxHints - hintsUsed;
  const exhausted = hintsUsed >= maxHints;
  const totalPenalty = hintsUsed * penaltyPercent;

  // Track highest hint level used
  const maxLevelUsed = useMemo(
    () => hints.reduce((max, h) => Math.max(max, h.level), 0),
    [hints]
  );

  // Check if student has at least one submission (for level 4)
  const { data: submissions } = useQuery({
    queryKey: queryKeys.submissions.list({ hackathon_id: hackathonId, challenge_id: challengeId }),
    queryFn: () => getSubmissions({ hackathon_id: hackathonId, challenge_id: challengeId, limit: 1 }),
    enabled: expanded,
  });
  const hasSubmissions = (submissions?.length ?? 0) > 0;

  // Scroll to bottom on new hint
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [hints.length]);

  // Hint mutation
  const hintMutation = useMutation({
    mutationFn: () => {
      if (selectedLevel == null) throw new Error('No level selected');
      return requestHint(challengeId, {
        hackathon_id: hackathonId,
        hint_level: selectedLevel,
        student_message: message.trim() || 'Necesito una pista',
        student_code: selectedLevel === 4 ? code : null,
      });
    },
    onSuccess: (data: HintResponse) => {
      setHints((prev) => [
        ...prev,
        { level: data.hint_level, text: data.hint_text, timestamp: new Date() },
      ]);
      setMessage('');
      setSelectedLevel(null);

      // Start cooldown if server provides next_available_at
      if (data.next_available_at) {
        cooldown.start(data.next_available_at);
      }

      toast({
        title: `Pista nivel ${data.hint_level} recibida`,
        description: `Pistas restantes: ${data.hints_remaining}. ${data.penalty_info}`,
      });
    },
    onError: (err: any) => {
      const detail = err?.response?.data?.detail ?? err?.detail ?? '';
      const code_err = typeof detail === 'string' ? detail : detail?.code ?? '';

      if (code_err.includes('HINT_LEVEL_NOT_UNLOCKED')) {
        toast({ title: 'Nivel bloqueado', description: 'Debes usar el nivel anterior primero.', variant: 'destructive' });
      } else if (code_err.includes('HINT_COOLDOWN_ACTIVE')) {
        const nextAt = err?.response?.data?.next_available_at;
        if (nextAt) cooldown.start(nextAt);
        toast({ title: 'Espera', description: 'Debes esperar antes de pedir otra pista.', variant: 'destructive' });
      } else if (code_err.includes('HINTS_EXHAUSTED')) {
        toast({ title: 'Sin pistas', description: 'Has usado todas tus pistas para este reto.', variant: 'destructive' });
      } else if (code_err.includes('SUBMISSION_REQUIRED')) {
        toast({ title: 'Envío requerido', description: 'Debes enviar al menos una solución antes de usar nivel 4.', variant: 'destructive' });
      } else {
        toast({ title: 'Error', description: 'No se pudo obtener la pista.', variant: 'destructive' });
      }
    },
  });

  // Check if a level button should be disabled
  const isLevelDisabled = (level: number): boolean => {
    if (exhausted) return true;
    if (cooldown.isActive) return true;
    if (hintMutation.isPending) return true;
    // Level N requires level N-1 used
    if (level > 1 && maxLevelUsed < level - 1) return true;
    // Level 4 requires at least 1 submission
    if (level === 4 && !hasSubmissions) return true;
    return false;
  };

  const getDisabledReason = (level: number): string | null => {
    if (exhausted) return 'Sin pistas restantes';
    if (cooldown.isActive) return `Disponible en ${cooldown.formatted}`;
    if (level > 1 && maxLevelUsed < level - 1) return `Usa primero el nivel ${level - 1}`;
    if (level === 4 && !hasSubmissions) return 'Envía al menos una solución primero';
    return null;
  };

  return (
    <div className="border border-border/50 rounded-lg">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-3 text-sm hover:bg-muted/30 transition-colors"
      >
        <span className="flex items-center gap-2 font-medium">
          <Bot className="w-4 h-4 text-unad-gold" />
          🤖 Asistente IA
          {hintsUsed > 0 ? (
            <Badge variant="secondary" className="text-[10px]">
              {hintsUsed}/{maxHints}
            </Badge>
          ) : null}
        </span>
        {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      {expanded ? (
        <div className="px-3 pb-3 space-y-4">
          {/* Budget Display */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                Pistas: <span className={`font-bold ${BUDGET_COLOR(hintsUsed, maxHints)}`}>{hintsUsed}/{maxHints}</span>
                {' '}— Penalización: <span className="font-bold text-red-400">{totalPenalty}%</span>
              </span>
            </div>
            <Progress
              value={(hintsUsed / maxHints) * 100}
              className={`h-2 ${PROGRESS_COLOR(hintsUsed, maxHints)}`}
            />
            <p className="text-[11px] text-muted-foreground/70 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              Cada pista reduce tu puntaje en un {penaltyPercent}%
            </p>
            {totalPenalty > 0 ? (
              <p className="text-[11px] text-red-400 font-medium">
                Penalización acumulada: -{totalPenalty}% de tu puntaje
              </p>
            ) : null}
          </div>

          {/* Cooldown warning */}
          {cooldown.isActive ? (
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-amber-500/10 text-amber-500 text-xs font-medium">
              <Clock className="w-3.5 h-3.5" />
              Próxima pista disponible en: {cooldown.formatted}
            </div>
          ) : null}

          {/* Exhausted state */}
          {exhausted ? (
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-red-500/10 text-red-500 text-xs font-medium">
              <Lock className="w-3.5 h-3.5" />
              Sin pistas restantes
            </div>
          ) : null}

          {/* Hint Level Buttons */}
          {!exhausted ? (
            <TooltipProvider>
              <div className="space-y-1.5">
                {HINT_LEVELS.map((hl) => {
                  const disabled = isLevelDisabled(hl.level);
                  const reason = getDisabledReason(hl.level);
                  const isSelected = selectedLevel === hl.level;

                  const btn = (
                    <button
                      key={hl.level}
                      onClick={() => !disabled && setSelectedLevel(isSelected ? null : hl.level)}
                      disabled={disabled}
                      className={`w-full flex items-center gap-3 p-2.5 rounded-lg text-left text-xs transition-all ${
                        isSelected
                          ? 'bg-primary/10 border border-primary/30 ring-1 ring-primary/20'
                          : disabled
                            ? 'bg-muted/20 opacity-50 cursor-not-allowed'
                            : 'bg-muted/30 hover:bg-muted/50 cursor-pointer border border-transparent'
                      }`}
                    >
                      <span className="text-base leading-none">{hl.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium">{hl.label}</p>
                        <p className="text-[11px] text-muted-foreground">{hl.description}</p>
                      </div>
                      {disabled && reason ? (
                        <span className="text-[10px] text-muted-foreground shrink-0">
                          {cooldown.isActive && hl.level <= (maxLevelUsed + 1)
                            ? cooldown.formatted
                            : ''}
                        </span>
                      ) : null}
                      {disabled && hl.level > maxLevelUsed + 1 ? (
                        <Lock className="w-3 h-3 text-muted-foreground shrink-0" />
                      ) : null}
                    </button>
                  );

                  if (disabled && reason) {
                    return (
                      <Tooltip key={hl.level}>
                        <TooltipTrigger asChild>{btn}</TooltipTrigger>
                        <TooltipContent side="right" className="text-xs">
                          {reason}
                        </TooltipContent>
                      </Tooltip>
                    );
                  }

                  return (
                    <Tooltip key={hl.level}>
                      <TooltipTrigger asChild>{btn}</TooltipTrigger>
                      <TooltipContent side="right" className="text-xs max-w-[220px]">
                        {hl.tooltip}
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </div>
            </TooltipProvider>
          ) : null}

          {/* Message input + submit */}
          {!exhausted && selectedLevel != null ? (
            <div className="space-y-2">
              <label className="text-[11px] text-muted-foreground">
                Escribe tu pregunta o duda (opcional):
              </label>
              <Textarea
                placeholder="Describe qué parte te confunde..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="text-xs h-16 resize-none"
              />
              <Button
                size="sm"
                onClick={() => hintMutation.mutate()}
                disabled={
                  hintMutation.isPending ||
                  cooldown.isActive ||
                  selectedLevel == null
                }
                className="w-full text-xs"
              >
                {hintMutation.isPending ? (
                  <Loader2 className="w-3 h-3 animate-spin mr-1" />
                ) : (
                  <Lightbulb className="w-3 h-3 mr-1" />
                )}
                Pedir Pista — Nivel {selectedLevel}
              </Button>
            </div>
          ) : null}

          {/* Hint Chat History */}
          {hints.length > 0 ? (
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-muted-foreground">Historial de pistas</h4>
              <div
                ref={scrollRef}
                className="max-h-[280px] overflow-y-auto space-y-2 pr-1"
              >
                {hints.map((h, i) => (
                  <div
                    key={i}
                    className={`p-2.5 rounded-lg border text-xs ${
                      LEVEL_COLORS[h.level] ?? 'bg-muted/30 border-border/50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <Badge variant="outline" className={`text-[10px] ${LEVEL_COLORS[h.level] ?? ''}`}>
                        Nivel {h.level}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">
                        {h.timestamp.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <HintMarkdown text={h.text} />
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
