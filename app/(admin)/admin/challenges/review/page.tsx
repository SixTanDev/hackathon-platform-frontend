'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-client';
import {
  listChallengeReviews, approveChallenge, rejectChallenge,
} from '@/lib/api/challenge-admin-services';
import type { ChallengeReview } from '@/lib/api/challenge-admin-services';
import type { ChallengeType, ChallengeDifficulty } from '@/types/api';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import Link from 'next/link';
import {
  ArrowLeft, Eye, CheckCircle2, XCircle, AlertTriangle, Clock, Code2,
  FileText, Loader2, Pencil, ChevronRight
} from 'lucide-react';

const TYPE_LABELS: Record<ChallengeType, string> = {
  coding: 'Coding', case_study: 'Caso de Estudio', essay: 'Ensayo',
  clinical_analysis: 'Análisis Clínico', legal_argument: 'Argumento Legal',
  design_proposal: 'Propuesta de Diseño', custom: 'Personalizado',
};
const DIFFICULTY_LABELS: Record<ChallengeDifficulty, string> = {
  easy: 'Fácil', medium: 'Medio', hard: 'Difícil', expert: 'Experto',
};
const DIFFICULTY_COLORS: Record<ChallengeDifficulty, string> = {
  easy: 'bg-green-500/10 text-green-400',
  medium: 'bg-amber-500/10 text-amber-400',
  hard: 'bg-red-500/10 text-red-400',
  expert: 'bg-purple-500/10 text-purple-400',
};

/** Safely get the challenge_id from a review (from explicit field or nested object) */
function getReviewChallengeId(review: ChallengeReview): string | undefined {
  return review.challenge_id ?? review.challenge?.id;
}

export default function ReviewQueuePage() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [selectedReview, setSelectedReview] = useState<ChallengeReview | null>(null);
  const [rejectDialog, setRejectDialog] = useState<{ open: boolean; challengeId: string }>({ open: false, challengeId: '' });
  const [rejectReason, setRejectReason] = useState('');

  const { data: reviews, isLoading } = useQuery({
    queryKey: queryKeys.adminChallenges.reviews(statusFilter),
    queryFn: () => listChallengeReviews(statusFilter === 'all' ? undefined : statusFilter),
    refetchInterval: 15000,
  });

  const approveMut = useMutation({
    mutationFn: (challengeId: string) => approveChallenge(challengeId),
    onSuccess: () => {
      toast.success('Reto aprobado');
      qc.invalidateQueries({ queryKey: queryKeys.adminChallenges.all });
      qc.invalidateQueries({ queryKey: queryKeys.challenges.all });
      setSelectedReview(null);
    },
    onError: () => toast.error('Error al aprobar'),
  });

  const rejectMut = useMutation({
    mutationFn: ({ challengeId, reason }: { challengeId: string; reason: string }) => rejectChallenge(challengeId, reason),
    onSuccess: () => {
      toast.success('Reto rechazado');
      qc.invalidateQueries({ queryKey: queryKeys.adminChallenges.all });
      setRejectDialog({ open: false, challengeId: '' });
      setRejectReason('');
      setSelectedReview(null);
    },
    onError: () => toast.error('Error al rechazar'),
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <Link href="/admin/challenges"><Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button></Link>
        <PageHeader title="Cola de Revisión" description="Revisa y aprueba retos generados por IA" />
      </div>

      <div className="flex gap-6">
        {/* List */}
        <div className="flex-1 space-y-4">
          <Tabs value={statusFilter} onValueChange={setStatusFilter}>
            <TabsList>
              <TabsTrigger value="pending">Pendientes</TabsTrigger>
              <TabsTrigger value="approved">Aprobados</TabsTrigger>
              <TabsTrigger value="rejected">Rechazados</TabsTrigger>
              <TabsTrigger value="all">Todos</TabsTrigger>
            </TabsList>
          </Tabs>

          {isLoading ? (
            <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
          ) : !reviews?.length ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">No hay retos en esta cola</CardContent></Card>
          ) : (
            <div className="space-y-3">
              {reviews.map((review: ChallengeReview) => {
                const c = review.challenge;
                const isActive = selectedReview?.id === review.id;
                const cName = c?.title ?? review.challenge_name ?? 'Reto sin nombre';
                const cType = c?.type;
                const cDifficulty = c?.difficulty;
                return (
                  <Card
                    key={review.id}
                    className={`cursor-pointer transition-all hover:border-primary/30 ${isActive ? 'ring-2 ring-primary border-primary/30' : ''}`}
                    onClick={() => setSelectedReview(review)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            {cType === 'coding' ? <Code2 className="h-4 w-4 text-primary" /> : <FileText className="h-4 w-4 text-secondary" />}
                            <h3 className="font-medium text-sm">{cName}</h3>
                          </div>
                          <div className="flex items-center gap-2">
                            {cDifficulty && <Badge variant="outline" className={DIFFICULTY_COLORS[cDifficulty]}>{DIFFICULTY_LABELS[cDifficulty]}</Badge>}
                            {cType && <span className="text-xs text-muted-foreground">{TYPE_LABELS[cType]}</span>}
                            {c?.category && <span className="text-xs text-muted-foreground">• {c.category}</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <ReviewStatusBadge status={review.status} />
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </div>
                      {review.requested_at && (
                        <p className="text-xs text-muted-foreground mt-2">
                          Solicitado: {new Date(review.requested_at).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Detail panel */}
        <div className="w-[500px] hidden lg:block">
          {selectedReview ? (
            <ReviewDetailPanel
              review={selectedReview}
              onApprove={(challengeId) => approveMut.mutate(challengeId)}
              onReject={(challengeId) => { setRejectDialog({ open: true, challengeId }); }}
              approving={approveMut.isPending}
            />
          ) : (
            <Card className="h-[400px] flex items-center justify-center">
              <p className="text-sm text-muted-foreground">Selecciona un reto para revisar</p>
            </Card>
          )}
        </div>
      </div>

      {/* Reject dialog */}
      <Dialog open={rejectDialog.open} onOpenChange={o => !o && setRejectDialog({ open: false, challengeId: '' })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rechazar Reto</DialogTitle>
            <DialogDescription>Indica la razón del rechazo. El creador podrá ver este comentario.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Razón del rechazo</Label>
            <Textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="Explica por qué se rechaza..." className="min-h-[100px]" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialog({ open: false, challengeId: '' })}>Cancelar</Button>
            <Button variant="destructive" disabled={!rejectReason.trim() || rejectMut.isPending} onClick={() => rejectMut.mutate({ challengeId: rejectDialog.challengeId, reason: rejectReason })}>
              {rejectMut.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <XCircle className="h-4 w-4 mr-2" />}
              Rechazar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ReviewStatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; class: string }> = {
    pending: { label: 'Pendiente', class: 'bg-amber-500/10 text-amber-400' },
    approved: { label: 'Aprobado', class: 'bg-green-500/10 text-green-400' },
    rejected: { label: 'Rechazado', class: 'bg-red-500/10 text-red-400' },
  };
  const st = config[status] ?? config.pending;
  return <Badge variant="secondary" className={st.class}>{st.label}</Badge>;
}

function ReviewDetailPanel({ review, onApprove, onReject, approving }: {
  review: ChallengeReview;
  onApprove: (challengeId: string) => void;
  onReject: (challengeId: string) => void;
  approving: boolean;
}) {
  const c = review.challenge;
  const challengeId = getReviewChallengeId(review);
  const cTitle = c?.title ?? review.challenge_name ?? 'Reto';
  const cType = c?.type;
  const cDifficulty = c?.difficulty;

  return (
    <Card className="sticky top-4">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{cTitle}</CardTitle>
          <ReviewStatusBadge status={review.status} />
        </div>
        <div className="flex items-center gap-2 mt-1">
          {cDifficulty && <Badge variant="outline" className={DIFFICULTY_COLORS[cDifficulty]}>{DIFFICULTY_LABELS[cDifficulty]}</Badge>}
          {cType && <span className="text-xs text-muted-foreground">{TYPE_LABELS[cType]}</span>}
          {c?.points_base != null && <span className="text-xs text-muted-foreground font-mono">{c.points_base} pts</span>}
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[500px] pr-4">
          <div className="space-y-4">
            {/* Description */}
            {c?.description_markdown && (
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-1">Descripción</h4>
                <div className="text-sm whitespace-pre-wrap bg-muted/20 rounded-lg p-3 max-h-[200px] overflow-y-auto">
                  {c.description_markdown}
                </div>
              </div>
            )}

            {/* Validation results */}
            {review.validation_results && (
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-1">Validación</h4>
                <div className={`p-3 rounded-lg border ${review.validation_results.passed ? 'border-green-500/30 bg-green-500/5' : 'border-red-500/30 bg-red-500/5'}`}>
                  <p className="text-sm flex items-center gap-2">
                    {review.validation_results.passed ? <CheckCircle2 className="h-4 w-4 text-green-400" /> : <XCircle className="h-4 w-4 text-red-400" />}
                    {review.validation_results.passed_tests}/{review.validation_results.total_tests} casos pasaron
                  </p>
                  {!review.validation_results.passed && review.validation_results.results?.filter(r => !r.passed).slice(0, 3).map((r, i) => (
                    <p key={i} className="text-xs text-red-400 mt-1">
                      ✗ Caso #{r.order_index + 1}: esperado &quot;{r.expected_output}&quot;, obtenido &quot;{r.actual_output ?? 'error'}&quot;
                    </p>
                  ))}
                </div>
              </div>
            )}

            {/* Similar challenges */}
            {review.similar_challenges && review.similar_challenges.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-1 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3 text-amber-400" />Retos Similares
                </h4>
                <div className="space-y-1">
                  {review.similar_challenges.map(s => (
                    <div key={s.id} className="text-xs flex items-center justify-between bg-muted/20 rounded px-3 py-2">
                      <span>{s.title}</span>
                      <Badge variant="outline" className="text-xs">{Math.round(s.similarity_score * 100)}%</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Rejection reason */}
            {review.rejection_reason && (
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-1">Razón de Rechazo</h4>
                <p className="text-sm bg-red-500/5 border border-red-500/20 rounded-lg p-3">{review.rejection_reason}</p>
              </div>
            )}

            {/* Challenge details */}
            {c && (
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-1">Detalles</h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-muted/20 rounded p-2"><span className="text-muted-foreground">Categoría:</span> {c.category || '—'}</div>
                  <div className="bg-muted/20 rounded p-2"><span className="text-muted-foreground">Límite:</span> {c.time_limit_seconds}s / {c.memory_limit_mb}MB</div>
                  <div className="bg-muted/20 rounded p-2"><span className="text-muted-foreground">Fuente:</span> {c.source}</div>
                  <div className="bg-muted/20 rounded p-2"><span className="text-muted-foreground">Lenguajes:</span> {c.allowed_languages?.join(', ') || '—'}</div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Actions */}
        {review.status === 'pending' && challengeId && (
          <>
            <Separator className="my-4" />
            <div className="flex items-center gap-3">
              <Link href={`/admin/challenges/create?edit=${challengeId}`} className="flex-1">
                <Button variant="outline" className="w-full"><Pencil className="h-4 w-4 mr-2" />Editar y Aprobar</Button>
              </Link>
              <Button variant="default" className="flex-1" onClick={() => onApprove(challengeId)} disabled={approving}>
                {approving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                Aprobar
              </Button>
              <Button variant="destructive" size="icon" onClick={() => onReject(challengeId)}><XCircle className="h-4 w-4" /></Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
