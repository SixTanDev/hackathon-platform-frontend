'use client';

import { useState, useMemo, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-client';
import {
  getGradingSubmissions,
  getGradingInboxSummary,
  getGradingHackathons,
} from '@/lib/api/grading-services';
import type { GradingSubmissionsParams } from '@/lib/api/grading-services';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import Link from 'next/link';
import {
  Inbox,
  Clock,
  CheckCircle2,
  Eye,
  ChevronLeft,
  ChevronRight,
  FileText,
  AlertTriangle,
  Users,
  Info,
} from 'lucide-react';
import { useTranslation } from '@/lib/i18n/context';

// ─── Status display config ───────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; class: string }> = {
  pending: {
    label: 'Pendiente',
    class: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  },
  under_review: {
    label: 'En Revisión',
    class: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  },
  graded: {
    label: 'Calificado',
    class: 'bg-green-500/10 text-green-400 border-green-500/20',
  },
  returned_for_revision: {
    label: 'Devuelto',
    class: 'bg-red-500/10 text-red-400 border-red-500/20',
  },
};

// ─── File size helper ────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const PAGE_SIZE = 20;

// ─── Page ────────────────────────────────────────────────────────────────────

export default function GradingInboxPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();

  const [selectedHackathonId, setSelectedHackathonId] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [challengeFilter, setChallengeFilter] = useState<string>('all');
  const [page, setPage] = useState(0);

  // ─── Load hackathons ─────────────────────────────────────────────────────
  const { data: hackathons = [], isLoading: hackathonsLoading } = useQuery({
    queryKey: ['grading', 'hackathons'],
    queryFn: getGradingHackathons,
    staleTime: 60_000,
  });

  // Auto-select first hackathon once loaded
  const effectiveHackathonId = useMemo(() => {
    if (selectedHackathonId) return selectedHackathonId;
    return hackathons[0]?.id ?? '';
  }, [selectedHackathonId, hackathons]);

  // ─── Inbox summary (for cards) ───────────────────────────────────────────
  const { data: inboxSummary } = useQuery({
    queryKey: ['grading', 'inbox-summary', effectiveHackathonId],
    queryFn: () => getGradingInboxSummary(effectiveHackathonId),
    enabled: !!effectiveHackathonId,
    staleTime: 30_000,
  });

  // ─── Submissions list (for table) ───────────────────────────────────────
  const submissionsParams = useMemo<GradingSubmissionsParams | null>(() => {
    if (!effectiveHackathonId) return null;
    const p: GradingSubmissionsParams = {
      hackathon_id: effectiveHackathonId,
      skip: page * PAGE_SIZE,
      limit: PAGE_SIZE,
    };
    if (statusFilter !== 'all') p.status = statusFilter;
    if (challengeFilter !== 'all') p.challenge_id = challengeFilter;
    return p;
  }, [effectiveHackathonId, statusFilter, challengeFilter, page]);

  const { data: submissionsData, isLoading: submissionsLoading } = useQuery({
    queryKey: queryKeys.grading.submissions(
      submissionsParams as Record<string, unknown>,
    ),
    queryFn: () => getGradingSubmissions(submissionsParams!),
    enabled: !!submissionsParams,
  });

  const isLoading =
    hackathonsLoading || (!!submissionsParams && submissionsLoading);
  const submissions = submissionsData?.submissions ?? [];
  const total = submissionsData?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  // Derive challenge options from inbox summary (more reliable than list)
  const challengeOptions = useMemo(
    () => inboxSummary?.challenges ?? [],
    [inboxSummary],
  );

  // ─── Handlers ────────────────────────────────────────────────────────────
  const handleHackathonChange = useCallback(
    (id: string) => {
      setSelectedHackathonId(id);
      setChallengeFilter('all');
      setStatusFilter('all');
      setPage(0);
    },
    [],
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Bandeja de Calificación"
        description="Revisa y califica las entregas de los estudiantes"
      />

      {/* Summary cards — from GET /grading/inbox */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SummaryCard
          label="Pendientes"
          count={inboxSummary?.total_pending ?? 0}
          icon={Clock}
          color="text-amber-400"
          bg="bg-amber-500/10"
        />
        <SummaryCard
          label="En Revisión"
          count={
            submissions.filter((s) => s.status === 'under_review').length
          }
          icon={Eye}
          color="text-blue-400"
          bg="bg-blue-500/10"
        />
        <SummaryCard
          label="Calificados"
          count={
            submissions.filter((s) => s.status === 'graded').length
          }
          icon={CheckCircle2}
          color="text-green-400"
          bg="bg-green-500/10"
        />
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Hackathon selector — required for hackathon_id */}
            {hackathonsLoading ? (
              <Skeleton className="h-10 w-[220px]" />
            ) : hackathons.length === 0 ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <AlertTriangle className="h-4 w-4 text-amber-400" />
                No tienes hackathones asignados
              </div>
            ) : (
              <Select
                value={effectiveHackathonId}
                onValueChange={handleHackathonChange}
              >
                <SelectTrigger className="w-[220px]">
                  <SelectValue placeholder="Selecciona un hackathon" />
                </SelectTrigger>
                <SelectContent>
                  {hackathons.map((h) => (
                    <SelectItem key={h.id} value={h.id}>
                      {h.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Status filter */}
            <Select
              value={statusFilter}
              onValueChange={(v) => { setStatusFilter(v); setPage(0); }}
              disabled={!effectiveHackathonId}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="pending">Pendiente</SelectItem>
                <SelectItem value="under_review">En Revisión</SelectItem>
                <SelectItem value="graded">Calificado</SelectItem>
                <SelectItem value="returned_for_revision">Devuelto</SelectItem>
              </SelectContent>
            </Select>

            {/* Challenge filter — populated from inbox summary */}
            <Select
              value={challengeFilter}
              onValueChange={(v) => { setChallengeFilter(v); setPage(0); }}
              disabled={!effectiveHackathonId || challengeOptions.length === 0}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Reto" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los retos</SelectItem>
                {challengeOptions.map((c) => (
                  <SelectItem key={c.challenge_id} value={c.challenge_id}>
                    {c.challenge_title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Notice: bulk grading unavailable without rubric in list */}
      {effectiveHackathonId && (
        <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/10 border border-border/50 rounded-lg px-4 py-3">
          <Info className="h-3.5 w-3.5 mt-0.5 shrink-0 text-blue-400" />
          <span>
            La calificación masiva no está disponible en esta vista porque el
            endpoint <code className="font-mono">/grading/submissions</code> no
            incluye rúbricas en el listado. Para calificar, abre cada entrega
            individualmente.
          </span>
        </div>
      )}

      {/* Empty state — no hackathon */}
      {!effectiveHackathonId && !hackathonsLoading && (
        <EmptyState
          icon={AlertTriangle}
          iconClass="text-amber-400"
          title="Selecciona un hackathon"
          description="No tienes hackathones activos asignados. Pide al administrador que te asigne a uno para poder calificar."
        />
      )}

      {/* Table — sourced from GET /grading/submissions */}
      {effectiveHackathonId && (
        isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-lg" />
            ))}
          </div>
        ) : submissions.length === 0 ? (
          <EmptyState
            icon={Inbox}
            iconClass="text-muted-foreground/60"
            title={t('tutor.grading.emptyState.title')}
            description={t('tutor.grading.emptyState.description')}
            actions={
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <Link href="/tutor/dashboard">
                  <Button variant="outline" className="gap-2">
                    <ChevronLeft className="w-4 h-4" />
                    {t('tutor.grading.emptyState.actionDashboard')}
                  </Button>
                </Link>
                <Link href="/tutor/teams">
                  <Button variant="default" className="gap-2">
                    <Users className="w-4 h-4" />
                    {t('tutor.grading.emptyState.actionTeams')}
                  </Button>
                </Link>
              </div>
            }
          />
        ) : (
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="p-3 text-left font-medium">Archivo</th>
                    <th className="p-3 text-left font-medium">Tipo</th>
                    <th className="p-3 text-left font-medium">Tamaño</th>
                    <th className="p-3 text-left font-medium">Enviado</th>
                    <th className="p-3 text-left font-medium">Estado</th>
                    <th className="p-3 w-24" />
                  </tr>
                </thead>
                <tbody>
                  {submissions.map((sub) => (
                    <tr
                      key={sub.id}
                      className="border-b border-border/50 hover:bg-muted/30 transition-colors"
                    >
                      <td className="p-3">
                        <div className="flex items-center gap-1.5">
                          <FileText className="h-3.5 w-3.5 text-secondary shrink-0" />
                          <span className="font-mono text-xs truncate max-w-[200px]">
                            {sub.original_filename}
                          </span>
                        </div>
                        {/* user_global_id is all we have in the list endpoint */}
                        <div className="text-xs text-muted-foreground mt-0.5 font-mono">
                          {sub.user_global_id}
                        </div>
                      </td>
                      <td className="p-3 text-xs text-muted-foreground">
                        {sub.file_type}
                      </td>
                      <td className="p-3 text-xs text-muted-foreground">
                        {formatBytes(sub.file_size_bytes)}
                      </td>
                      <td className="p-3 text-xs text-muted-foreground">
                        {new Date(sub.submitted_at).toLocaleDateString(
                          'es-CO',
                          {
                            day: '2-digit',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          },
                        )}
                      </td>
                      <td className="p-3">
                        <Badge
                          variant="outline"
                          className={STATUS_CONFIG[sub.status]?.class ?? ''}
                        >
                          {STATUS_CONFIG[sub.status]?.label ?? sub.status}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <Link href={`/tutor/grading/${sub.id}`}>
                          <Button
                            size="sm"
                            variant={
                              sub.status === 'graded' ? 'outline' : 'default'
                            }
                            className="h-8"
                          >
                            {sub.status === 'graded' ? 'Ver' : 'Calificar'}
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {total} entrega(s)
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm">
              Página {page + 1} de {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Summary Card ─────────────────────────────────────────────────────────────

function SummaryCard({
  label,
  count,
  icon: Icon,
  color,
  bg,
}: {
  label: string;
  count: number;
  icon: typeof Clock;
  color: string;
  bg: string;
}) {
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

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({
  icon: Icon,
  iconClass,
  title,
  description,
  actions,
}: {
  icon: typeof Inbox;
  iconClass: string;
  title: string;
  description: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center bg-muted/5 rounded-2xl border-2 border-dashed border-border/60 max-w-3xl mx-auto mt-8">
      <div className="bg-muted/10 p-4 rounded-full mb-4">
        <Icon className={`w-8 h-8 ${iconClass}`} />
      </div>
      <h3 className="text-xl font-bold text-foreground/90 mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-md mb-8 leading-relaxed">
        {description}
      </p>
      {actions}
    </div>
  );
}
