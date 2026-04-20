'use client';

import { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-client';
import {
  getGradingInbox, bulkGrade,
} from '@/lib/api/grading-services';
import type { GradingInboxParams, GradingInboxItem, BulkGradePayload } from '@/lib/api/grading-services';
import type { RubricCriterion } from '@/types/api';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import Link from 'next/link';
import {
  Inbox, Clock, CheckCircle2, Eye, ChevronLeft, ChevronRight,
  Loader2, FileText, Users, Layers
} from 'lucide-react';
import { useTranslation } from '@/lib/i18n/context';

const STATUS_CONFIG: Record<string, { label: string; class: string }> = {
  pending: { label: 'Pendiente', class: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  under_review: { label: 'En Revisión', class: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  graded: { label: 'Calificado', class: 'bg-green-500/10 text-green-400 border-green-500/20' },
  returned_for_revision: { label: 'Devuelto', class: 'bg-red-500/10 text-red-400 border-red-500/20' },
};

const PAGE_SIZE = 20;

export default function GradingInboxPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [hackathonFilter, setHackathonFilter] = useState<string>('all');
  const [challengeFilter, setChallengeFilter] = useState<string>('all');
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkDialog, setBulkDialog] = useState(false);

  const params = useMemo<GradingInboxParams>(() => {
    const p: GradingInboxParams = { skip: page * PAGE_SIZE, limit: PAGE_SIZE };
    if (statusFilter !== 'all') p.status = statusFilter;
    if (hackathonFilter !== 'all') p.hackathon_id = hackathonFilter;
    if (challengeFilter !== 'all') p.challenge_id = challengeFilter;
    return p;
  }, [statusFilter, hackathonFilter, challengeFilter, page]);

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.grading.inbox(params as Record<string, unknown>),
    queryFn: () => getGradingInbox(params),
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const counts = data?.counts ?? { pending: 0, under_review: 0, graded: 0 };
  const totalPages = Math.ceil(total / PAGE_SIZE);

  // Derive unique hackathons and challenges for filter dropdowns
  const hackathons = useMemo(() => {
    const map = new Map<string, string>();
    items.forEach(i => { if (i.hackathon_id && i.hackathon_name) map.set(i.hackathon_id, i.hackathon_name); });
    return Array.from(map.entries());
  }, [items]);

  const challenges = useMemo(() => {
    const map = new Map<string, string>();
    items.forEach(i => { if (i.challenge_id && i.challenge_title) map.set(i.challenge_id, i.challenge_title); });
    return Array.from(map.entries());
  }, [items]);

  const toggleSelect = useCallback((id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    if (selected.size === items.length) setSelected(new Set());
    else setSelected(new Set(items.map(i => i.submission_id)));
  }, [items, selected.size]);

  // Get rubric from first selected item (for bulk grading)
  const selectedItems = useMemo(() => items.filter(i => selected.has(i.submission_id)), [items, selected]);
  const bulkRubric = selectedItems[0]?.rubric_json ?? null;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Bandeja de Calificación" description="Revisa y califica las entregas de los estudiantes" />

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SummaryCard label="Pendientes" count={counts.pending} icon={Clock} color="text-amber-400" bg="bg-amber-500/10" />
        <SummaryCard label="En Revisión" count={counts.under_review} icon={Eye} color="text-blue-400" bg="bg-blue-500/10" />
        <SummaryCard label="Calificados" count={counts.graded} icon={CheckCircle2} color="text-green-400" bg="bg-green-500/10" />
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-wrap items-center gap-3">
            <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(0); }}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Estado" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="pending">Pendiente</SelectItem>
                <SelectItem value="under_review">En Revisión</SelectItem>
                <SelectItem value="graded">Calificado</SelectItem>
                <SelectItem value="returned_for_revision">Devuelto</SelectItem>
              </SelectContent>
            </Select>
            <Select value={hackathonFilter} onValueChange={v => { setHackathonFilter(v); setPage(0); }}>
              <SelectTrigger className="w-[200px]"><SelectValue placeholder="Hackathon" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los hackathones</SelectItem>
                {hackathons.map(([id, name]) => <SelectItem key={id} value={id}>{name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={challengeFilter} onValueChange={v => { setChallengeFilter(v); setPage(0); }}>
              <SelectTrigger className="w-[200px]"><SelectValue placeholder="Reto" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los retos</SelectItem>
                {challenges.map(([id, title]) => <SelectItem key={id} value={id}>{title}</SelectItem>)}
              </SelectContent>
            </Select>

            {selected.size > 0 && (
              <div className="ml-auto flex items-center gap-2">
                <span className="text-sm text-muted-foreground">{selected.size} seleccionado(s)</span>
                <Button variant="outline" onClick={() => setBulkDialog(true)} disabled={!bulkRubric}>
                  <Layers className="h-4 w-4 mr-2" />Calificación Masiva
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}</div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center bg-muted/5 rounded-2xl border-2 border-dashed border-border/60 max-w-3xl mx-auto mt-8">
          <div className="bg-muted/10 p-4 rounded-full mb-4">
            <Inbox className="w-8 h-8 text-muted-foreground/60" />
          </div>
          <h3 className="text-xl font-bold text-foreground/90 mb-2">{t('tutor.grading.emptyState.title')}</h3>
          <p className="text-sm text-muted-foreground max-w-md mb-8 leading-relaxed">
            {t('tutor.grading.emptyState.description')}
          </p>
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <Link href="/tutor/dashboard">
              <Button variant="outline" className="gap-2">
                <ChevronLeft className="w-4 h-4" /> {t('tutor.grading.emptyState.actionDashboard')}
              </Button>
            </Link>
            <Link href="/tutor/teams">
              <Button variant="default" className="gap-2">
                <Users className="w-4 h-4" /> {t('tutor.grading.emptyState.actionTeams')}
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="p-3 w-10"><Checkbox checked={selected.size === items.length && items.length > 0} onCheckedChange={toggleAll} /></th>
                  <th className="p-3 text-left font-medium">Estudiante / Equipo</th>
                  <th className="p-3 text-left font-medium">Reto</th>
                  <th className="p-3 text-left font-medium">Hackathon</th>
                  <th className="p-3 text-left font-medium">Enviado</th>
                  <th className="p-3 text-left font-medium">Estado</th>
                  <th className="p-3 w-24" />
                </tr>
              </thead>
              <tbody>
                {items.map(item => (
                  <tr key={item.submission_id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="p-3"><Checkbox checked={selected.has(item.submission_id)} onCheckedChange={() => toggleSelect(item.submission_id)} /></td>
                    <td className="p-3">
                      <div className="font-medium text-sm">{item.student_name}</div>
                      {item.team_name && <div className="text-xs text-muted-foreground flex items-center gap-1"><Users className="h-3 w-3" />{item.team_name}</div>}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-1.5">
                        <FileText className="h-3.5 w-3.5 text-secondary" />
                        <span className="text-xs">{item.challenge_title}</span>
                      </div>
                    </td>
                    <td className="p-3 text-xs text-muted-foreground">{item.hackathon_name}</td>
                    <td className="p-3 text-xs text-muted-foreground">
                      {new Date(item.submitted_at).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="p-3">
                      <Badge variant="outline" className={STATUS_CONFIG[item.status]?.class ?? ''}>
                        {STATUS_CONFIG[item.status]?.label ?? item.status}
                      </Badge>
                    </td>
                    <td className="p-3">
                      <Link href={`/tutor/grading/${item.submission_id}`}>
                        <Button size="sm" variant={item.status === 'graded' ? 'outline' : 'default'} className="h-8">
                          {item.status === 'graded' ? 'Ver' : 'Calificar'}
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{total} entrega(s)</span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}><ChevronLeft className="h-4 w-4" /></Button>
            <span className="text-sm">Página {page + 1} de {totalPages}</span>
            <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>
      )}

      {/* Bulk Grading Dialog */}
      {bulkRubric && (
        <BulkGradingDialog
          open={bulkDialog}
          onOpenChange={setBulkDialog}
          submissionIds={Array.from(selected)}
          rubric={bulkRubric}
          onSuccess={() => {
            setSelected(new Set());
            qc.invalidateQueries({ queryKey: queryKeys.grading.all });
          }}
        />
      )}
    </div>
  );
}

function SummaryCard({ label, count, icon: Icon, color, bg }: { label: string; count: number; icon: typeof Clock; color: string; bg: string }) {
  return (
    <Card>
      <CardContent className="py-4">
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-lg ${bg}`}>
            <Icon className={`h-5 w-5 ${color}`} />
          </div>
          <div>
            <p className="text-2xl font-bold">{count}</p>
            <p className="text-sm text-muted-foreground">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Bulk Grading Dialog ───────────────────────────────────────────────

function BulkGradingDialog({ open, onOpenChange, submissionIds, rubric, onSuccess }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  submissionIds: string[];
  rubric: { criteria: RubricCriterion[]; total_points: number };
  onSuccess: () => void;
}) {
  const [scores, setScores] = useState<Record<string, number>>({});
  const [comments, setComments] = useState<Record<string, string>>({});
  const [overallFeedback, setOverallFeedback] = useState('');

  const totalScore = rubric.criteria.reduce((sum, cr) => sum + (scores[cr.id] ?? 0), 0);

  const bulkMut = useMutation({
    mutationFn: (payload: BulkGradePayload) => bulkGrade(payload),
    onSuccess: (result) => {
      toast.success(`${result.graded} entrega(s) calificada(s)`);
      if (result.errors?.length) toast.warning(`${result.errors.length} error(es)`);
      onSuccess();
      onOpenChange(false);
    },
    onError: () => toast.error('Error en calificación masiva'),
  });

  const handleSubmit = () => {
    const criteriaResults = rubric.criteria.map(cr => ({
      criterion_id: cr.id,
      score: scores[cr.id] ?? 0,
      comment: comments[cr.id] ?? '',
    }));
    bulkMut.mutate({ submission_ids: submissionIds, criteria_results: criteriaResults, overall_feedback: overallFeedback });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle>Calificación Masiva</DialogTitle>
          <DialogDescription>Aplicar la misma calificación a {submissionIds.length} entrega(s). Puedes ajustar individualmente después.</DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[55vh] pr-4">
          <div className="space-y-4">
            {rubric.criteria.map(cr => (
              <div key={cr.id} className="border border-border rounded-lg p-4 space-y-3">
                <div>
                  <h4 className="font-medium text-sm">{cr.name}</h4>
                  <p className="text-xs text-muted-foreground">{cr.description}</p>
                </div>
                {cr.scoring_levels && cr.scoring_levels.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {cr.scoring_levels.map(sl => (
                      <button
                        key={sl.label}
                        onClick={() => setScores(prev => ({ ...prev, [cr.id]: sl.points }))}
                        className={`px-3 py-1.5 rounded-md text-xs border transition-all ${
                          scores[cr.id] === sl.points
                            ? 'border-primary bg-primary/10 text-primary font-medium'
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        {sl.label} ({sl.points})
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <Slider
                      value={[scores[cr.id] ?? 0]}
                      onValueChange={([v]) => setScores(prev => ({ ...prev, [cr.id]: v }))}
                      min={0} max={cr.max_points} step={1}
                      className="flex-1"
                    />
                    <span className="text-sm font-mono w-16 text-right">{scores[cr.id] ?? 0}/{cr.max_points}</span>
                  </div>
                )}
                <Textarea
                  value={comments[cr.id] ?? ''}
                  onChange={e => setComments(prev => ({ ...prev, [cr.id]: e.target.value }))}
                  placeholder="Comentario para este criterio..."
                  className="text-xs min-h-[50px]"
                />
              </div>
            ))}

            <Separator />

            <div className="space-y-2">
              <Label>Retroalimentación General</Label>
              <Textarea value={overallFeedback} onChange={e => setOverallFeedback(e.target.value)} placeholder="Comentarios generales..." className="min-h-[60px]" />
            </div>
          </div>
        </ScrollArea>

        <div className="flex items-center justify-between pt-2 border-t border-border">
          <div className="text-lg font-bold">
            Total: <span className="text-primary">{totalScore}</span>/{rubric.total_points}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={bulkMut.isPending}>
              {bulkMut.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Layers className="h-4 w-4 mr-2" />}
              Calificar {submissionIds.length} Entregas
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
