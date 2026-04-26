'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-client';
import { useToast } from '@/hooks/use-toast';
import {
  submitDocument,
  getDocumentSubmissions,
  getGradeResult,
} from '@/lib/api/challenge-services';
import { RubricPreview } from './rubric-preview';
import { FileUploadArea } from './file-upload-area';
import { GradeFeedback } from './grade-feedback';
import { HintPanel } from './hint-panel';
import { DocumentQA } from './document-qa';
import { MarkdownContent } from '@/components/shared/markdown-content';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  FileText,
  Download,
  Eye,
  AlertTriangle,
  BookOpen,
  PenLine,
  Briefcase,
  Scale,
  Microscope,
  Palette,
  Loader2,
} from 'lucide-react';
import type {
  ChallengePublic,
  Hackathon,
  DocumentSubmission,
  GradeResult,
  RubricJson,
  ChallengeType,
  ChallengeDifficulty,
} from '@/types/api';

// ─── Constants ─────────────────────────────────────────────

const DIFFICULTY_CONFIG: Record<string, { label: string; color: string }> = {
  easy: { label: 'Fácil', color: 'bg-green-500/10 text-green-500' },
  medium: { label: 'Medio', color: 'bg-amber-500/10 text-amber-500' },
  hard: { label: 'Difícil', color: 'bg-orange-500/10 text-orange-500' },
  expert: { label: 'Experto', color: 'bg-red-500/10 text-red-500' },
};

const TYPE_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  case_study: {
    label: 'Caso de Estudio',
    icon: <Briefcase className="w-3.5 h-3.5" />,
    color: 'bg-blue-500/10 text-blue-500',
  },
  essay: {
    label: 'Ensayo',
    icon: <PenLine className="w-3.5 h-3.5" />,
    color: 'bg-purple-500/10 text-purple-500',
  },
  clinical_analysis: {
    label: 'Análisis Clínico',
    icon: <Microscope className="w-3.5 h-3.5" />,
    color: 'bg-emerald-500/10 text-emerald-500',
  },
  legal_argument: {
    label: 'Argumento Legal',
    icon: <Scale className="w-3.5 h-3.5" />,
    color: 'bg-amber-500/10 text-amber-500',
  },
  design_proposal: {
    label: 'Propuesta de Diseño',
    icon: <Palette className="w-3.5 h-3.5" />,
    color: 'bg-pink-500/10 text-pink-500',
  },
  custom: {
    label: 'Personalizado',
    icon: <BookOpen className="w-3.5 h-3.5" />,
    color: 'bg-secondary/10 text-secondary',
  },
};

const DOC_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  submitted: { label: 'Enviado', color: 'bg-blue-500/10 text-blue-500' },
  under_review: { label: 'En Revisión', color: 'bg-amber-500/10 text-amber-500' },
  graded: { label: 'Calificado', color: 'bg-green-500/10 text-green-500' },
  returned_for_revision: { label: 'Devuelto para Revisión', color: 'bg-red-500/10 text-red-500' },
};



// ─── Document Submission List ────────────────────────────

function DocumentSubmissionList({
  hackathonId,
  challengeId,
  onViewFeedback,
}: {
  hackathonId: string;
  challengeId: string;
  onViewFeedback: (submissionId: string) => void;
}) {
  const { data: submissions, isLoading } = useQuery({
    queryKey: ['doc-submissions', hackathonId, challengeId],
    queryFn: () => getDocumentSubmissions({ hackathon_id: hackathonId, challenge_id: challengeId }),
  });

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2].map(i => <Skeleton key={i} className="h-14 w-full" />)}
      </div>
    );
  }

  if (!submissions || submissions.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-4">
        No hay entregas anteriores
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {submissions.map((sub) => {
        const st = DOC_STATUS_CONFIG[sub.status] ?? { label: sub.status, color: 'bg-muted text-muted-foreground' };
        return (
          <div
            key={sub.id}
            className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-card/50"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                <FileText className="w-4 h-4 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium truncate">{sub.original_filename}</p>
                <p className="text-[11px] text-muted-foreground">
                  {format(new Date(sub.submitted_at), "d MMM yyyy, HH:mm", { locale: es })}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Badge className={`text-[10px] border-0 ${st.color}`}>{st.label}</Badge>
              {sub.status === 'graded' ? (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-[11px]"
                  onClick={() => onViewFeedback(sub.id)}
                >
                  <Eye className="w-3 h-3 mr-1" /> Ver Retroalimentación
                </Button>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Submission Success State ────────────────────────────

function SubmissionSuccess() {
  return (
    <div className="flex flex-col items-center justify-center py-8 gap-3 text-center">
      <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center">
        <CheckCircle2 className="w-6 h-6 text-green-500" />
      </div>
      <div>
        <p className="text-sm font-semibold text-green-500">✓ Entrega recibida</p>
        <p className="text-xs text-muted-foreground mt-1">
          Pendiente de calificación. Recibirás una notificación cuando sea evaluada.
        </p>
      </div>
    </div>
  );
}

// ─── Reference Documents Section ─────────────────────────

function ReferenceDocuments({ documents }: { documents: { name: string; url: string; type?: string }[] }) {
  if (!documents || documents.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-secondary" />
          Documentos de Referencia
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {documents.map((doc, i) => (
          <div
            key={i}
            className="flex items-center justify-between p-2.5 rounded-lg border border-border/50 bg-card/50"
          >
            <div className="flex items-center gap-2 min-w-0">
              <FileText className="w-4 h-4 text-primary shrink-0" />
              <span className="text-xs font-medium truncate">{doc.name}</span>
            </div>
            <a
              href={doc.url}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0"
            >
              <Button size="sm" variant="ghost" className="h-7 text-[11px]">
                <Download className="w-3 h-3 mr-1" /> Descargar
              </Button>
            </a>
          </div>
        ))}

        {/* Embedded PDF viewer for first PDF document */}
        {documents.some(d => d.url?.endsWith('.pdf') || d.type === 'pdf') ? (
          <div className="mt-3">
            <p className="text-[11px] text-muted-foreground mb-2">Vista previa del documento</p>
            <div className="relative w-full rounded-lg overflow-hidden border border-border/50" style={{ height: 400 }}>
              <iframe
                src={documents.find(d => d.url?.endsWith('.pdf') || d.type === 'pdf')!.url}
                className="w-full h-full"
                title="Vista previa del documento"
              />
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

// ─── Main Non-Technical Challenge Component ────────────

interface NonTechnicalChallengeProps {
  challenge: ChallengePublic;
  hackathon: Hackathon | undefined;
  hackathonId: string;
  isLoading: boolean;
}

export function NonTechnicalChallenge({
  challenge,
  hackathon,
  hackathonId,
  isLoading,
}: NonTechnicalChallengeProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [justSubmitted, setJustSubmitted] = useState(false);
  const [feedbackSubmissionId, setFeedbackSubmissionId] = useState<string | null>(null);

  // Grade query for selected submission
  const { data: gradeResult, isLoading: gradeLoading } = useQuery({
    queryKey: ['grade', feedbackSubmissionId],
    queryFn: () => getGradeResult(feedbackSubmissionId!),
    enabled: !!feedbackSubmissionId,
    retry: false,
  });

  // Submit document mutation
  const submitMutation = useMutation({
    mutationFn: (file: File) => submitDocument(challenge.id, hackathonId, file),
    onSuccess: () => {
      setJustSubmitted(true);
      toast({
        title: 'Entrega enviada',
        description: 'Tu trabajo ha sido recibido y está pendiente de calificación.',
      });
      queryClient.invalidateQueries({
        queryKey: ['doc-submissions', hackathonId, challenge.id],
      });
    },
    onError: (err: any) => {
      const detail = err?.response?.data?.detail ?? err?.detail ?? '';
      toast({
        title: 'Error al enviar',
        description: typeof detail === 'string' ? detail : 'No se pudo enviar el archivo.',
        variant: 'destructive',
      });
    },
  });

  // Parse metadata
  const meta = challenge.metadata_json as Record<string, any> | null;
  const estimatedTime = meta?.estimated_time_minutes;
  const rubricJson = meta?.rubric_json as RubricJson | null | undefined;
  const submissionFormat = (meta?.submission_format as string) ?? 'pdf';
  const attachedDocuments = (meta?.reference_documents as { name: string; url: string; type?: string }[]) ?? [];
  const maxFileSizeMB = (meta?.max_file_size_mb as number) ?? 10;
  const allowResubmission = meta?.allow_resubmission !== false;

  // Type config
  const typeConfig = TYPE_CONFIG[challenge.type] ?? TYPE_CONFIG.custom;
  const diffConfig = DIFFICULTY_CONFIG[challenge.difficulty] ?? DIFFICULTY_CONFIG.medium;

  // Accepted formats
  const acceptedFormats = useMemo(() => {
    if (submissionFormat === 'mixed') return ['pdf', 'txt'];
    return [submissionFormat];
  }, [submissionFormat]);

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-0 sm:px-4 py-0 sm:py-6 space-y-4 sm:space-y-6">
      {/* Top bar - Compact on mobile */}
      <div className="flex items-center justify-between px-3 py-1 sm:py-1.5 border-b sm:border-0 border-border/50 bg-card/30 sm:bg-transparent shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <Link href={`/dashboard/hackathons/${hackathonId}`}>
            <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-7 sm:w-auto sm:px-2 text-xs">
              <ArrowLeft className="w-4 h-4 sm:w-3 sm:h-3 sm:mr-1" />
              <span className="hidden sm:inline">Hackathon</span>
            </Button>
          </Link>
          <span className="text-sm font-semibold truncate text-foreground/90 sm:hidden">{challenge.title}</span>
        </div>
      </div>

      <div className="px-4 sm:px-0 space-y-4 sm:space-y-6">
        {/* ─── Header Section (Desktop only or for detail) ─── */}
        <div className="hidden sm:block space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold">{challenge.title}</h1>
            <Badge className={`text-[10px] border-0 ${typeConfig.color}`}>
              {typeConfig.icon}
              <span className="ml-1">{typeConfig.label}</span>
            </Badge>
            <Badge className={`text-[10px] border-0 ${diffConfig.color}`}>
              {diffConfig.label}
            </Badge>
            <Badge variant="outline" className="text-[10px]">
              {challenge.points_base} pts
            </Badge>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            {challenge.category ? (
              <span className="flex items-center gap-1">
                <BookOpen className="w-3 h-3" /> {challenge.category}
              </span>
            ) : null}
            {estimatedTime ? (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" /> ~{estimatedTime} min
              </span>
            ) : null}
          </div>
          <Separator />
        </div>
      {/* ─── Challenge Description ─── */}
      <Card>
        <CardContent className="pt-6">
          <MarkdownContent content={challenge.description_markdown} />
        </CardContent>
      </Card>

      {/* ─── Rubric Preview ─── */}
      <RubricPreview rubricJson={rubricJson} />

      {/* ─── Reference Documents ─── */}
      <ReferenceDocuments documents={attachedDocuments} />

      {/* ─── Submission Section ─── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <PenLine className="w-4 h-4 text-primary" />
            Enviar tu trabajo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {justSubmitted ? (
            <>
              <SubmissionSuccess />
              {allowResubmission ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-xs"
                  onClick={() => setJustSubmitted(false)}
                >
                  Enviar otra versión
                </Button>
              ) : null}
            </>
          ) : (
            <FileUploadArea
              acceptedFormats={acceptedFormats}
              maxSizeMB={maxFileSizeMB}
              onFileSelect={(file) => submitMutation.mutate(file)}
              disabled={submitMutation.isPending}
              isUploading={submitMutation.isPending}
            />
          )}
        </CardContent>
      </Card>

      {/* ─── Previous Submissions ─── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            Entregas anteriores
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DocumentSubmissionList
            hackathonId={hackathonId}
            challengeId={challenge.id}
            onViewFeedback={(id) => setFeedbackSubmissionId(id)}
          />
        </CardContent>
      </Card>

      {/* ─── Grade Feedback ─── */}
      {feedbackSubmissionId ? (
        <div className="space-y-2">
          {gradeLoading ? (
            <Card>
              <CardContent className="py-8">
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">Cargando retroalimentación...</p>
                </div>
              </CardContent>
            </Card>
          ) : gradeResult ? (
            <GradeFeedback grade={gradeResult} />
          ) : (
            <Card>
              <CardContent className="py-6">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  No se encontró la retroalimentación para esta entrega.
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      ) : null}

      {/* ─── AI Hints ─── */}
      <HintPanel
        hackathonId={hackathonId}
        challengeId={challenge.id}
        code=""
        penaltyPercent={hackathon?.hint_penalty_percent ?? 10}
      />

      {/* ─── Document Q&A ─── */}
      <DocumentQA hackathonId={hackathonId} />
    </div>

  </div>
);
}
