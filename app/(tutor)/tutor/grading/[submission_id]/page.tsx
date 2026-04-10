'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-client';
import {
  getGradingSubmission, gradeSubmission, requestAIFeedback, returnForRevision,
} from '@/lib/api/grading-services';
import type { GradeSubmissionPayload, AIFeedbackResponse } from '@/lib/api/grading-services';
import type { RubricCriterion } from '@/types/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  ArrowLeft, Download, FileText, Clock, HardDrive, Sparkles, Loader2,
  Send, Save, CheckCircle2, XCircle, RotateCcw, User, Users, AlertTriangle
} from 'lucide-react';
import Link from 'next/link';

const STATUS_LABELS: Record<string, { label: string; class: string }> = {
  pending: { label: 'Pendiente', class: 'bg-amber-500/10 text-amber-400' },
  under_review: { label: 'En Revisión', class: 'bg-blue-500/10 text-blue-400' },
  graded: { label: 'Calificado', class: 'bg-green-500/10 text-green-400' },
  returned_for_revision: { label: 'Devuelto', class: 'bg-red-500/10 text-red-400' },
};

export default function GradingViewPage() {
  const { submission_id } = useParams<{ submission_id: string }>();
  const router = useRouter();
  const qc = useQueryClient();

  // Fetch submission
  const { data: sub, isLoading } = useQuery({
    queryKey: queryKeys.grading.detail(submission_id),
    queryFn: () => getGradingSubmission(submission_id),
  });

  // Grading state
  const [scores, setScores] = useState<Record<string, number>>({});
  const [comments, setComments] = useState<Record<string, string>>({});
  const [overallFeedback, setOverallFeedback] = useState('');
  const [aiSuggestions, setAiSuggestions] = useState<Record<string, boolean>>({}); // criterion_id → is AI suggestion
  const [aiOverallSuggestion, setAiOverallSuggestion] = useState(false);
  const [returnDialog, setReturnDialog] = useState(false);
  const [returnReason, setReturnReason] = useState('');

  const rubric = sub?.rubric_json;
  const criteria = rubric?.criteria ?? [];

  // Populate from existing grade
  useEffect(() => {
    if (!sub?.existing_grade) return;
    const g = sub.existing_grade;
    const s: Record<string, number> = {};
    const c: Record<string, string> = {};
    g.criteria_results.forEach(cr => {
      s[cr.criterion_id] = cr.score;
      c[cr.criterion_id] = cr.comment ?? '';
    });
    setScores(s);
    setComments(c);
    setOverallFeedback(g.overall_feedback ?? '');
  }, [sub?.existing_grade]);

  // Calculate total
  const totalScore = useMemo(() => criteria.reduce((sum, cr) => sum + (scores[cr.id] ?? 0), 0), [criteria, scores]);
  const maxScore = rubric?.total_points ?? criteria.reduce((sum, cr) => sum + cr.max_points, 0);
  const scorePercent = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;

  // Grade mutation
  const gradeMut = useMutation({
    mutationFn: (payload: GradeSubmissionPayload) => gradeSubmission(submission_id, payload),
    onSuccess: () => {
      toast.success('Calificación enviada');
      qc.invalidateQueries({ queryKey: queryKeys.grading.all });
      router.push('/tutor/grading');
    },
    onError: () => toast.error('Error al calificar'),
  });

  // Draft mutation
  const draftMut = useMutation({
    mutationFn: (payload: GradeSubmissionPayload) => gradeSubmission(submission_id, { ...payload, is_draft: true }),
    onSuccess: () => {
      toast.success('Borrador guardado');
      qc.invalidateQueries({ queryKey: queryKeys.grading.detail(submission_id) });
    },
    onError: () => toast.error('Error al guardar borrador'),
  });

  // AI feedback mutation
  const aiFeedbackMut = useMutation({
    mutationFn: () => requestAIFeedback(submission_id),
    onSuccess: (data: AIFeedbackResponse) => {
      // Apply AI suggestions
      const newScores = { ...scores };
      const newComments = { ...comments };
      const newAiFlags: Record<string, boolean> = {};
      data.criteria_feedback.forEach(cf => {
        newScores[cf.criterion_id] = cf.suggested_score;
        newComments[cf.criterion_id] = cf.suggested_comment;
        newAiFlags[cf.criterion_id] = true;
      });
      setScores(newScores);
      setComments(newComments);
      setAiSuggestions(newAiFlags);
      if (data.overall_feedback) {
        setOverallFeedback(data.overall_feedback);
        setAiOverallSuggestion(true);
      }
      toast.success('Sugerencias de IA recibidas — revísalas antes de enviar');
    },
    onError: () => toast.error('Error al solicitar retroalimentación IA'),
  });

  // Return mutation
  const returnMut = useMutation({
    mutationFn: (reason: string) => returnForRevision(submission_id, reason),
    onSuccess: () => {
      toast.success('Entrega devuelta al estudiante');
      qc.invalidateQueries({ queryKey: queryKeys.grading.all });
      router.push('/tutor/grading');
    },
    onError: () => toast.error('Error al devolver'),
  });

  const buildPayload = useCallback((): GradeSubmissionPayload => ({
    criteria_results: criteria.map(cr => ({
      criterion_id: cr.id,
      score: scores[cr.id] ?? 0,
      comment: comments[cr.id] ?? '',
    })),
    overall_feedback: overallFeedback,
  }), [criteria, scores, comments, overallFeedback]);

  // Keyboard shortcut: Ctrl+Enter to submit
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'Enter' && !gradeMut.isPending) {
        e.preventDefault();
        gradeMut.mutate(buildPayload());
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [buildPayload, gradeMut]);

  const dismissAiSuggestion = (criterionId: string) => {
    setAiSuggestions(prev => { const n = { ...prev }; delete n[criterionId]; return n; });
  };

  if (isLoading) {
    return (
      <div className="space-y-4 animate-fade-in">
        <Skeleton className="h-10 w-60" />
        <div className="grid grid-cols-2 gap-6"><Skeleton className="h-[600px]" /><Skeleton className="h-[600px]" /></div>
      </div>
    );
  }

  if (!sub) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Entrega no encontrada</p>
        <Link href="/tutor/grading"><Button variant="outline" className="mt-4"><ArrowLeft className="h-4 w-4 mr-2" />Volver</Button></Link>
      </div>
    );
  }

  const isGraded = sub.status === 'graded';
  const fileSize = sub.file_size_bytes ? `${(sub.file_size_bytes / 1024).toFixed(1)} KB` : null;
  const isPdf = sub.file_type === 'application/pdf' || sub.original_filename?.endsWith('.pdf');

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/tutor/grading"><Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button></Link>
        <div className="flex-1">
          <h2 className="text-lg font-bold">{sub.challenge_title}</h2>
          <p className="text-sm text-muted-foreground">{sub.hackathon_name}</p>
        </div>
        <Badge variant="secondary" className={STATUS_LABELS[sub.status]?.class ?? ''}>
          {STATUS_LABELS[sub.status]?.label ?? sub.status}
        </Badge>
      </div>

      {/* Split layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT: Submission */}
        <div className="space-y-4">
          {/* Student info */}
          <Card>
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  {sub.team_name ? <Users className="h-5 w-5 text-primary" /> : <User className="h-5 w-5 text-primary" />}
                </div>
                <div>
                  <p className="font-medium">{sub.student_name}</p>
                  {sub.team_name && <p className="text-xs text-muted-foreground">Equipo: {sub.team_name}</p>}
                  {sub.student_email && <p className="text-xs text-muted-foreground">{sub.student_email}</p>}
                </div>
              </div>
              <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{new Date(sub.submitted_at).toLocaleString('es-CO')}</span>
                {fileSize && <span className="flex items-center gap-1"><HardDrive className="h-3 w-3" />{fileSize}</span>}
                <span className="flex items-center gap-1"><FileText className="h-3 w-3" />{sub.file_type || 'Texto'}</span>
              </div>
            </CardContent>
          </Card>

          {/* Content viewer */}
          <Card className="overflow-hidden">
            <CardHeader className="py-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Entrega del Estudiante</CardTitle>
                {sub.file_url && (
                  <a href={sub.file_url} download={sub.original_filename}>
                    <Button variant="outline" size="sm"><Download className="h-3.5 w-3.5 mr-1" />Descargar</Button>
                  </a>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {isPdf && sub.file_url ? (
                <div className="w-full h-[500px] bg-muted/20">
                  <iframe
                    src={`${sub.file_url}#toolbar=1&navpanes=0`}
                    className="w-full h-full border-0"
                    title="PDF Viewer"
                  />
                </div>
              ) : sub.text_content ? (
                <ScrollArea className="h-[500px]">
                  <div className="p-4 whitespace-pre-wrap text-sm font-mono">{sub.text_content}</div>
                </ScrollArea>
              ) : sub.file_url ? (
                <div className="p-8 text-center text-muted-foreground">
                  <FileText className="h-10 w-10 mx-auto mb-3 opacity-40" />
                  <p className="text-sm">Vista previa no disponible</p>
                  <a href={sub.file_url} download={sub.original_filename}>
                    <Button variant="outline" size="sm" className="mt-3"><Download className="h-4 w-4 mr-2" />Descargar Archivo</Button>
                  </a>
                </div>
              ) : (
                <div className="p-8 text-center text-muted-foreground">
                  <p className="text-sm">No hay contenido para mostrar</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* RIGHT: Grading form */}
        <div className="space-y-4">
          {/* Score display */}
          <Card className="border-primary/20">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Puntuación Total</p>
                  <p className="text-3xl font-bold">
                    <span className={scorePercent >= 70 ? 'text-green-400' : scorePercent >= 40 ? 'text-amber-400' : 'text-red-400'}>{totalScore}</span>
                    <span className="text-lg text-muted-foreground">/{maxScore}</span>
                  </p>
                </div>
                <ScoreGauge percent={scorePercent} />
              </div>
            </CardContent>
          </Card>

          {/* Rubric criteria */}
          <ScrollArea className="max-h-[calc(100vh-380px)]">
            <div className="space-y-4 pr-4">
              {criteria.length === 0 ? (
                <Card>
                  <CardContent className="py-6 text-center text-muted-foreground text-sm">
                    No hay rúbrica definida para este reto. Usa la puntuación manual.
                  </CardContent>
                </Card>
              ) : (
                criteria.map(cr => (
                  <RubricCriterionCard
                    key={cr.id}
                    criterion={cr}
                    score={scores[cr.id] ?? 0}
                    comment={comments[cr.id] ?? ''}
                    isAiSuggestion={!!aiSuggestions[cr.id]}
                    onScoreChange={v => setScores(prev => ({ ...prev, [cr.id]: v }))}
                    onCommentChange={v => setComments(prev => ({ ...prev, [cr.id]: v }))}
                    onDismissAi={() => dismissAiSuggestion(cr.id)}
                    disabled={isGraded}
                  />
                ))
              )}

              <Separator />

              {/* Overall feedback */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Retroalimentación General</Label>
                  {aiOverallSuggestion && (
                    <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-xs">
                      <Sparkles className="h-3 w-3 mr-1" />Sugerencia IA
                    </Badge>
                  )}
                </div>
                {aiOverallSuggestion && (
                  <p className="text-xs text-amber-400">Sugerencia de IA — Editar antes de enviar</p>
                )}
                <Textarea
                  value={overallFeedback}
                  onChange={e => { setOverallFeedback(e.target.value); setAiOverallSuggestion(false); }}
                  placeholder="Comentarios generales sobre la entrega..."
                  className={`min-h-[80px] ${aiOverallSuggestion ? 'border-amber-500/40 bg-amber-500/5' : ''}`}
                  disabled={isGraded}
                />
              </div>

              {/* No rubric: manual score */}
              {criteria.length === 0 && (
                <div className="space-y-2">
                  <Label>Puntuación Manual (0-100)</Label>
                  <div className="flex items-center gap-3">
                    <Slider
                      value={[scores['manual'] ?? 0]}
                      onValueChange={([v]) => setScores({ manual: v })}
                      min={0} max={100} step={1}
                      disabled={isGraded}
                    />
                    <span className="text-sm font-mono w-12">{scores['manual'] ?? 0}</span>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Actions */}
          {!isGraded && (
            <div className="space-y-3">
              <Button
                variant="outline"
                className="w-full border-purple-500/30 text-purple-400 hover:bg-purple-500/10"
                onClick={() => aiFeedbackMut.mutate()}
                disabled={aiFeedbackMut.isPending}
              >
                {aiFeedbackMut.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                Solicitar Retroalimentación IA
              </Button>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => draftMut.mutate(buildPayload())}
                  disabled={draftMut.isPending}
                >
                  {draftMut.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                  Guardar Borrador
                </Button>
                <Button
                  variant="outline"
                  className="text-destructive border-destructive/30"
                  onClick={() => setReturnDialog(true)}
                >
                  <RotateCcw className="h-4 w-4 mr-1" />Devolver
                </Button>
              </div>

              <Button
                className="w-full"
                onClick={() => gradeMut.mutate(buildPayload())}
                disabled={gradeMut.isPending}
              >
                {gradeMut.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                Calificar
                <span className="ml-auto text-xs opacity-70">Ctrl+Enter</span>
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Return dialog */}
      <Dialog open={returnDialog} onOpenChange={setReturnDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Devolver para Revisión</DialogTitle>
            <DialogDescription>El estudiante recibirá una notificación y podrá re-enviar su entrega.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Razón</Label>
            <Textarea value={returnReason} onChange={e => setReturnReason(e.target.value)} placeholder="Indica qué debe mejorar..." className="min-h-[80px]" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReturnDialog(false)}>Cancelar</Button>
            <Button variant="destructive" disabled={!returnReason.trim() || returnMut.isPending} onClick={() => returnMut.mutate(returnReason)}>
              {returnMut.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RotateCcw className="h-4 w-4 mr-2" />}
              Devolver
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Rubric Criterion Card ─────────────────────────────────────────────

function RubricCriterionCard({ criterion: cr, score, comment, isAiSuggestion, onScoreChange, onCommentChange, onDismissAi, disabled }: {
  criterion: RubricCriterion;
  score: number;
  comment: string;
  isAiSuggestion: boolean;
  onScoreChange: (v: number) => void;
  onCommentChange: (v: string) => void;
  onDismissAi: () => void;
  disabled: boolean;
}) {
  return (
    <Card className={isAiSuggestion ? 'border-amber-500/30 bg-amber-500/5' : ''}>
      <CardContent className="py-4 space-y-3">
        <div className="flex items-start justify-between">
          <div>
            <h4 className="font-medium text-sm">{cr.name}</h4>
            <p className="text-xs text-muted-foreground">{cr.description}</p>
          </div>
          <div className="text-right">
            <span className="text-lg font-bold">{score}</span>
            <span className="text-xs text-muted-foreground">/{cr.max_points}</span>
          </div>
        </div>

        {isAiSuggestion && (
          <div className="flex items-center justify-between">
            <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-xs">
              <Sparkles className="h-3 w-3 mr-1" />Sugerencia IA — Editar antes de enviar
            </Badge>
            <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={onDismissAi}>
              <XCircle className="h-3 w-3 mr-1" />Descartar
            </Button>
          </div>
        )}

        {/* Scoring levels */}
        {cr.scoring_levels && cr.scoring_levels.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {cr.scoring_levels.map(sl => (
              <button
                key={sl.label}
                onClick={() => !disabled && onScoreChange(sl.points)}
                disabled={disabled}
                className={`px-3 py-2 rounded-lg text-xs border transition-all text-left ${
                  score === sl.points
                    ? 'border-primary bg-primary/10 text-primary font-medium ring-1 ring-primary/30'
                    : 'border-border hover:border-primary/50'
                } ${disabled ? 'opacity-60 cursor-default' : 'cursor-pointer'}`}
              >
                <div className="font-medium">{sl.label} ({sl.points})</div>
                {sl.description && <div className="text-muted-foreground mt-0.5">{sl.description}</div>}
              </button>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <Slider
              value={[score]}
              onValueChange={([v]) => onScoreChange(v)}
              min={0} max={cr.max_points} step={1}
              className="flex-1"
              disabled={disabled}
            />
            <span className="text-sm font-mono w-12 text-right">{score}/{cr.max_points}</span>
          </div>
        )}

        <Textarea
          value={comment}
          onChange={e => { onCommentChange(e.target.value); if (isAiSuggestion) onDismissAi(); }}
          placeholder="Comentario para este criterio..."
          className={`text-xs min-h-[50px] ${isAiSuggestion ? 'border-amber-500/30' : ''}`}
          disabled={disabled}
        />
      </CardContent>
    </Card>
  );
}

// ─── Score Gauge SVG ───────────────────────────────────────────────────

function ScoreGauge({ percent }: { percent: number }) {
  const radius = 30;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;
  const color = percent >= 70 ? '#4ade80' : percent >= 40 ? '#fbbf24' : '#f87171';

  return (
    <div className="relative w-20 h-20">
      <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
        <circle cx="40" cy="40" r={radius} fill="none" stroke="currentColor" className="text-border" strokeWidth="6" />
        <circle cx="40" cy="40" r={radius} fill="none" stroke={color} strokeWidth="6" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset} style={{ transition: 'stroke-dashoffset 0.5s ease' }} />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-sm font-bold" style={{ color }}>{percent}%</span>
      </div>
    </div>
  );
}
