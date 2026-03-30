'use client';

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-client';
import { useAuthStore } from '@/stores/auth-store';
import { useToast } from '@/hooks/use-toast';
import {
  getChallengeDetail,
  getChallengeTestCases,
  runCode,
  submitCode,
  getSubmissions,
  getSubmissionDetail,
  reportTabEvent,
  type RunTestResult,
  type RunCodeResponse,
} from '@/lib/api/challenge-services';
import { HintPanel } from '@/components/challenges/hint-panel';
import { DocumentQA } from '@/components/challenges/document-qa';
import { NonTechnicalChallenge } from '@/components/challenges/non-technical-challenge';
import { getHackathon } from '@/lib/api/hackathon-services';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import Link from 'next/link';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  ArrowLeft,
  Play,
  Send,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  Cpu,
  Maximize2,
  Minimize2,
  RotateCcw,
  AlertTriangle,
  Keyboard,
  Trophy,
  Sparkles,
  Code2,
  FileText,
  History,
  Eye,
  EyeOff,
} from 'lucide-react';
import type {
  ChallengePublic,
  TestCasePublic,
  Submission,
  SubmissionDetail,
  Hackathon,
  ChallengeDifficulty,
} from '@/types/api';

// ─── Constants ───────────────────────────────────────────

const DIFFICULTY_CONFIG: Record<string, { label: string; color: string }> = {
  easy: { label: 'Fácil', color: 'bg-green-500/10 text-green-500' },
  medium: { label: 'Medio', color: 'bg-amber-500/10 text-amber-500' },
  hard: { label: 'Difícil', color: 'bg-orange-500/10 text-orange-500' },
  expert: { label: 'Experto', color: 'bg-red-500/10 text-red-500' },
};

const DEFAULT_CODE = '# Escribe tu solución aquí\n\n';
const AUTOSAVE_INTERVAL = 5000;

function getStorageKey(hackathonId: string, challengeId: string) {
  return `code:${hackathonId}:${challengeId}`;
}

// ─── Monaco Loader (dynamic import to avoid SSR issues) ───────────

import dynamic from 'next/dynamic';

const MonacoEditor = dynamic(() => import('@monaco-editor/react').then((m) => m.default), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full bg-muted/30">
      <Loader2 className="w-6 h-6 animate-spin text-primary" />
    </div>
  ),
});

// ─── Markdown Renderer (simple) ─────────────────────────────

function MarkdownContent({ content }: { content: string }) {
  // Simple markdown to HTML for code blocks and basic formatting
  const html = useMemo(() => {
    let text = content ?? '';
    // Code blocks
    text = text.replace(/```(\w+)?\n([\s\S]*?)```/g, (_m, lang, code) => {
      return `<pre class="bg-muted rounded-lg p-3 overflow-x-auto text-xs my-2"><code class="language-${lang ?? ''}">${escapeHtml(code.trim())}</code></pre>`;
    });
    // Inline code
    text = text.replace(/`([^`]+)`/g, '<code class="bg-muted px-1.5 py-0.5 rounded text-xs">$1</code>');
    // Bold
    text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    // Italic
    text = text.replace(/\*(.+?)\*/g, '<em>$1</em>');
    // Headers
    text = text.replace(/^### (.+)$/gm, '<h3 class="text-base font-semibold mt-4 mb-2">$1</h3>');
    text = text.replace(/^## (.+)$/gm, '<h2 class="text-lg font-semibold mt-4 mb-2">$1</h2>');
    text = text.replace(/^# (.+)$/gm, '<h1 class="text-xl font-bold mt-4 mb-2">$1</h1>');
    // Lists
    text = text.replace(/^- (.+)$/gm, '<li class="ml-4 list-disc">$1</li>');
    text = text.replace(/^\d+\. (.+)$/gm, '<li class="ml-4 list-decimal">$1</li>');
    // Paragraphs
    text = text.replace(/\n\n/g, '</p><p class="my-2">');
    text = `<p class="my-2">${text}</p>`;
    return text;
  }, [content]);

  return (
    <div
      className="prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ─── Example Test Case Display ─────────────────────────────

function ExampleTestCase({ tc, index }: { tc: TestCasePublic; index: number }) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground">Ejemplo {index + 1}</p>
      <div className="grid grid-cols-1 gap-2">
        <div>
          <p className="text-[11px] text-muted-foreground mb-1">Entrada:</p>
          <pre className="bg-muted rounded-md p-2 text-xs font-mono overflow-x-auto whitespace-pre">{tc.input_data}</pre>
        </div>
        {tc.expected_output != null ? (
          <div>
            <p className="text-[11px] text-muted-foreground mb-1">Salida esperada:</p>
            <pre className="bg-muted rounded-md p-2 text-xs font-mono overflow-x-auto whitespace-pre">{tc.expected_output}</pre>
          </div>
        ) : null}
        {tc.explanation ? (
          <div>
            <p className="text-[11px] text-muted-foreground mb-1">Explicación:</p>
            <p className="text-xs text-muted-foreground">{tc.explanation}</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

// ─── Run Results Display ─────────────────────────────────

function RunResults({
  results,
  isSubmission,
  totalScore,
  maxScore,
}: {
  results: RunTestResult[];
  isSubmission: boolean;
  totalScore?: number | null;
  maxScore?: number | null;
}) {
  const allPassed = results.every((r) => r.passed);
  const passedCount = results.filter((r) => r.passed).length;

  return (
    <div className="space-y-3">
      {/* Summary */}
      <div className={`flex items-center gap-2 p-2.5 rounded-lg text-sm font-medium ${
        allPassed ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
      }`}>
        {allPassed ? (
          <><CheckCircle2 className="w-4 h-4" /> {isSubmission ? `¡Solución aceptada!` : `✓ Todos los ejemplos pasaron`}</>
        ) : (
          <><XCircle className="w-4 h-4" /> ✗ {passedCount} de {results.length} {isSubmission ? 'casos' : 'ejemplos'} pasaron</>
        )}
      </div>

      {/* Score for submissions */}
      {isSubmission && totalScore != null ? (
        <ScoreDisplay score={totalScore} maxScore={maxScore ?? 100} perfect={allPassed} />
      ) : null}

      {/* Results table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border/50">
              <th className="text-left py-1.5 px-2 font-medium text-muted-foreground">#</th>
              <th className="text-left py-1.5 px-2 font-medium text-muted-foreground">Estado</th>
              <th className="text-left py-1.5 px-2 font-medium text-muted-foreground">Entrada</th>
              <th className="text-left py-1.5 px-2 font-medium text-muted-foreground">Esperado</th>
              <th className="text-left py-1.5 px-2 font-medium text-muted-foreground">Obtenido</th>
              <th className="text-right py-1.5 px-2 font-medium text-muted-foreground">Tiempo</th>
            </tr>
          </thead>
          <tbody>
            {results.map((r, idx) => {
              const isHidden = !r.input && isSubmission;
              return (
                <tr key={idx} className={`border-b border-border/30 last:border-0 ${
                  r.passed ? '' : 'bg-red-500/5'
                }`}>
                  <td className="py-1.5 px-2 font-mono">{idx + 1}</td>
                  <td className="py-1.5 px-2">
                    {r.passed ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                    ) : (
                      <XCircle className="w-3.5 h-3.5 text-red-500" />
                    )}
                  </td>
                  <td className="py-1.5 px-2 font-mono max-w-[120px] truncate">
                    {isHidden ? <span className="text-muted-foreground italic">Caso oculto #{idx + 1}</span> : (r.input ?? '—')}
                  </td>
                  <td className="py-1.5 px-2 font-mono max-w-[120px] truncate">
                    {isHidden ? '—' : (r.expected_output ?? '—')}
                  </td>
                  <td className={`py-1.5 px-2 font-mono max-w-[120px] truncate ${
                    !r.passed ? 'text-red-500' : ''
                  }`}>
                    {isHidden ? '—' : (r.actual_output ?? '—')}
                  </td>
                  <td className="py-1.5 px-2 text-right text-muted-foreground">
                    {r.execution_time_ms != null ? `${r.execution_time_ms}ms` : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Score Display with animation ───────────────────────────

function ScoreDisplay({ score, maxScore, perfect }: { score: number; maxScore: number; perfect: boolean }) {
  const [displayScore, setDisplayScore] = useState(0);

  useEffect(() => {
    let frame: number;
    let start: number | null = null;
    const duration = 1200;

    const animate = (ts: number) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setDisplayScore(Math.round(score * eased));
      if (progress < 1) frame = requestAnimationFrame(animate);
    };

    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [score]);

  return (
    <div className="flex items-center justify-center py-4">
      <div className="text-center">
        <div className="text-4xl font-bold tabular-nums">
          <span className={perfect ? 'text-green-500' : 'text-primary'}>{displayScore}</span>
          <span className="text-lg text-muted-foreground">/{maxScore}</span>
        </div>
        <p className="text-xs text-muted-foreground mt-1">Puntuación</p>
        {perfect ? (
          <div className="flex items-center justify-center gap-1 mt-2 text-sm text-green-500">
            <Sparkles className="w-4 h-4" /> ¡Puntuación perfecta!
          </div>
        ) : null}
      </div>
    </div>
  );
}

// ─── Previous Submissions ─────────────────────────────────

function PreviousSubmissions({
  hackathonId,
  challengeId,
  onLoadCode,
}: {
  hackathonId: string;
  challengeId: string;
  onLoadCode: (code: string) => void;
}) {
  const { data: submissions, isLoading } = useQuery({
    queryKey: queryKeys.submissions.list({ hackathon_id: hackathonId, challenge_id: challengeId }),
    queryFn: () => getSubmissions({ hackathon_id: hackathonId, challenge_id: challengeId, limit: 20 }),
  });

  const STATUS_LABELS: Record<string, { label: string; color: string }> = {
    passed: { label: 'Aceptado', color: 'text-green-500' },
    partial: { label: 'Parcial', color: 'text-amber-500' },
    failed: { label: 'Fallido', color: 'text-red-500' },
    error: { label: 'Error', color: 'text-red-500' },
    timeout: { label: 'Tiempo excedido', color: 'text-orange-500' },
    queued: { label: 'En cola', color: 'text-muted-foreground' },
    running: { label: 'Ejecutando', color: 'text-blue-500' },
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
      </div>
    );
  }

  if (!submissions?.length) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <History className="w-8 h-8 text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">No hay entregas anteriores</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {submissions.map((sub) => {
        const s = STATUS_LABELS[sub.status] ?? { label: sub.status, color: 'text-muted-foreground' };
        return (
          <div key={sub.id} className="flex items-center justify-between p-2 rounded-md hover:bg-muted/30 text-xs">
            <div className="flex items-center gap-3 min-w-0">
              <span className={`font-medium ${s.color}`}>{s.label}</span>
              <span className="text-muted-foreground">
                {format(new Date(sub.created_at), "d MMM, HH:mm", { locale: es })}
              </span>
              {sub.final_score != null ? (
                <Badge variant="secondary" className="text-[10px]">{sub.final_score}/{sub.max_score ?? 100}</Badge>
              ) : null}
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="text-[11px] h-6"
              onClick={async () => {
                try {
                  const detail = await getSubmissionDetail(sub.id);
                  // SubmissionDetail doesn't have source_code in our types,
                  // but the API might return it. Fall back to toast.
                  const code = (detail as any)?.source_code;
                  if (code) {
                    onLoadCode(code);
                  } else {
                    // Can't load code - submission API may not return it
                  }
                } catch {
                  // Silently fail
                }
              }}
            >
              <Eye className="w-3 h-3 mr-1" /> Ver
            </Button>
          </div>
        );
      })}
    </div>
  );
}

// ─── Hint Panel & Document QA (imported) ─────────────────

// ─── Left Panel: Description ──────────────────────────────

function DescriptionPanel({
  challenge,
  testCases,
  hackathonId,
  hackathon,
  code,
  loading,
}: {
  challenge: ChallengePublic | undefined;
  testCases: TestCasePublic[];
  hackathonId: string;
  hackathon: Hackathon | undefined;
  code: string;
  loading: boolean;
}) {
  if (loading || !challenge) {
    return (
      <div className="p-4 space-y-4">
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  const diff = DIFFICULTY_CONFIG[challenge.difficulty] ?? DIFFICULTY_CONFIG.medium;
  const examples = testCases.filter((tc) => tc.is_example);
  const meta = challenge.metadata_json as Record<string, any> | null;
  const estimatedTime = meta?.estimated_time_minutes;

  return (
    <div className="h-full overflow-y-auto p-4 space-y-5">
      {/* Title + meta */}
      <div>
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <h2 className="text-lg font-bold">{challenge.title}</h2>
          <Badge className={`text-[10px] ${diff.color} border-0`}>{diff.label}</Badge>
          <Badge variant="outline" className="text-[10px]">{challenge.points_base} pts</Badge>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          {challenge.category ? (
            <span className="flex items-center gap-1">
              <Code2 className="w-3 h-3" /> {challenge.category}
            </span>
          ) : null}
          {estimatedTime ? (
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" /> ~{estimatedTime} min
            </span>
          ) : null}
        </div>
      </div>

      <Separator />

      {/* Description */}
      <MarkdownContent content={challenge.description_markdown} />

      {/* Examples */}
      {examples.length > 0 ? (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold">Ejemplos</h3>
          {examples.map((tc, i) => (
            <ExampleTestCase key={tc.id} tc={tc} index={i} />
          ))}
        </div>
      ) : null}

      {/* Constraints */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Restricciones</h3>
        <div className="grid grid-cols-1 gap-1.5 text-xs">
          <div className="flex items-center gap-2 p-2 rounded-md bg-muted/30">
            <Clock className="w-3.5 h-3.5 text-muted-foreground" />
            <span>Límite de tiempo: <strong>{challenge.time_limit_seconds}s</strong></span>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-md bg-muted/30">
            <Cpu className="w-3.5 h-3.5 text-muted-foreground" />
            <span>Límite de memoria: <strong>{challenge.memory_limit_mb} MB</strong></span>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-md bg-muted/30">
            <FileText className="w-3.5 h-3.5 text-muted-foreground" />
            <span>Lenguaje: <strong>Python 3.12</strong></span>
          </div>
        </div>
      </div>

      {/* AI Hints */}
      <HintPanel
        hackathonId={hackathonId}
        challengeId={challenge.id}
        code={code}
        penaltyPercent={hackathon?.hint_penalty_percent ?? 10}
      />

      {/* Document Q&A */}
      <DocumentQA hackathonId={hackathonId} />
    </div>
  );
}

// ─── Tab Tracker ─────────────────────────────────────────

function useTabTracking(hackathonId: string, isLive: boolean) {
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!isLive) return;

    const handleVisibility = () => {
      const event = document.hidden ? 'blur' : 'focus';
      reportTabEvent(hackathonId, event).catch(() => {});
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [hackathonId, isLive]);

  return { showWarning: isLive && !dismissed, dismiss: () => setDismissed(true) };
}

// ─── Main Page ──────────────────────────────────────────

export default function ChallengeSolvingPage() {
  const params = useParams();
  const hackathonId = params?.id as string;
  const challengeId = params?.cid as string;
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // State
  const [code, setCode] = useState(DEFAULT_CODE);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [resultTab, setResultTab] = useState<'results' | 'submissions'>('results');
  const [runResults, setRunResults] = useState<RunTestResult[] | null>(null);
  const [submitResults, setSubmitResults] = useState<{ results: RunTestResult[]; score: number; maxScore: number } | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);
  const [mobileTab, setMobileTab] = useState<'problem' | 'editor'>('problem');
  const editorRef = useRef<any>(null);
  const codeRef = useRef(code);
  codeRef.current = code;

  // Data fetching
  const { data: challenge, isLoading: challengeLoading } = useQuery({
    queryKey: queryKeys.challenges.detail(challengeId),
    queryFn: () => getChallengeDetail(challengeId),
    enabled: !!challengeId,
  });

  const { data: testCases } = useQuery({
    queryKey: queryKeys.challenges.testCases(challengeId),
    queryFn: () => getChallengeTestCases(challengeId),
    enabled: !!challengeId,
  });

  const { data: hackathon } = useQuery({
    queryKey: queryKeys.hackathons.detail(hackathonId),
    queryFn: () => getHackathon(hackathonId),
    enabled: !!hackathonId,
  });

  const isLive = hackathon?.mode === 'live' && hackathon?.status === 'active';

  // ─── Non-technical challenge detection ───
  const isNonTechnical = challenge != null && challenge.type !== 'coding';

  // Tab tracking
  const { showWarning, dismiss: dismissWarning } = useTabTracking(hackathonId, isLive);

  // Load saved code from localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const key = getStorageKey(hackathonId, challengeId);
    const saved = localStorage.getItem(key);
    if (saved) {
      setCode(saved);
    }
  }, [hackathonId, challengeId]);

  // Auto-save code
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const interval = setInterval(() => {
      const key = getStorageKey(hackathonId, challengeId);
      if (codeRef.current && codeRef.current !== DEFAULT_CODE) {
        localStorage.setItem(key, codeRef.current);
      }
    }, AUTOSAVE_INTERVAL);
    return () => clearInterval(interval);
  }, [hackathonId, challengeId]);

  // Reset code handler
  const handleReset = useCallback(() => {
    setCode(DEFAULT_CODE);
    const key = getStorageKey(hackathonId, challengeId);
    localStorage.removeItem(key);
  }, [hackathonId, challengeId]);

  // Load code from submission
  const handleLoadCode = useCallback((sourceCode: string) => {
    setCode(sourceCode);
    toast({ title: 'Código cargado', description: 'Se cargó el código de la entrega anterior.' });
  }, [toast]);

  // ─── Run Code ───
  const handleRun = useCallback(async () => {
    if (isRunning || isSubmitting) return;
    setIsRunning(true);
    setRunResults(null);
    setSubmitResults(null);
    setResultTab('results');

    try {
      const response = await runCode(challengeId, {
        source_code: codeRef.current,
        language: 'python',
      });
      setRunResults(response.results ?? []);
    } catch (err: any) {
      toast({
        title: 'Error al ejecutar',
        description: err?.detail ?? 'No se pudo ejecutar el código.',
        variant: 'destructive',
      });
    } finally {
      setIsRunning(false);
    }
  }, [challengeId, isRunning, isSubmitting, toast]);

  // ─── Submit Code ───
  const handleSubmit = useCallback(async () => {
    if (isRunning || isSubmitting) return;
    setShowConfirmSubmit(false);
    setIsSubmitting(true);
    setRunResults(null);
    setSubmitResults(null);
    setResultTab('results');

    try {
      const submission = await submitCode({
        challenge_id: challengeId,
        source_code: codeRef.current,
        language: 'python',
        hackathon_id: hackathonId,
      });

      // Poll for results
      let attempts = 0;
      const maxAttempts = 30;

      const poll = async (): Promise<SubmissionDetail | null> => {
        if (attempts >= maxAttempts) return null;
        attempts++;
        await new Promise((r) => setTimeout(r, 2000));

        try {
          const detail = await getSubmissionDetail(submission.id);
          if (detail.status === 'queued' || detail.status === 'running') {
            return poll();
          }
          return detail;
        } catch {
          return poll();
        }
      };

      const result = await poll();

      if (result) {
        // Convert test_results to RunTestResult format for display
        const displayResults: RunTestResult[] = (result.test_results ?? []).map((tr, idx) => ({
          test_case_index: idx,
          input: '', // Hidden for submissions
          expected_output: '',
          actual_output: tr.stdout,
          passed: tr.passed,
          status: tr.status,
          execution_time_ms: tr.execution_time_ms,
          memory_used_mb: tr.memory_used_mb,
          stderr: tr.stderr,
        }));

        setSubmitResults({
          results: displayResults,
          score: result.final_score ?? 0,
          maxScore: result.max_score ?? challenge?.points_base ?? 100,
        });

        // If perfect score, clear localStorage
        if (result.final_score === result.max_score && result.max_score && result.max_score > 0) {
          const key = getStorageKey(hackathonId, challengeId);
          localStorage.removeItem(key);
        }

        // Invalidate submissions list
        queryClient.invalidateQueries({
          queryKey: queryKeys.submissions.list({ hackathon_id: hackathonId, challenge_id: challengeId }),
        });
      } else {
        toast({
          title: 'Tiempo agotado',
          description: 'La evaluación está tardando más de lo esperado. Revisa en "Entregas Anteriores".',
          variant: 'destructive',
        });
      }
    } catch (err: any) {
      toast({
        title: 'Error al enviar',
        description: err?.detail ?? 'No se pudo enviar la solución.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [challengeId, hackathonId, challenge, isRunning, isSubmitting, toast, queryClient]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'Enter') {
        e.preventDefault();
        setShowConfirmSubmit(true);
      } else if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault();
        handleRun();
      } else if (e.ctrlKey && e.key === 'h') {
        e.preventDefault();
        // Toggle hints - handled by component internally
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleRun]);

  // ─── Non-technical challenge: render different view ───
  if (isNonTechnical || (!challenge && challengeLoading)) {
    // While loading, show non-technical view with isLoading
    // Once loaded, if non-technical type, render it
    if (isNonTechnical) {
      return (
        <NonTechnicalChallenge
          challenge={challenge!}
          hackathon={hackathon}
          hackathonId={hackathonId}
          isLoading={false}
        />
      );
    }
  }

  // ─── Editor Panel Content ───
  const editorPanel = (
    <div className="flex flex-col h-full">
      {/* Editor Toolbar */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/50 bg-muted/20 shrink-0">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[10px] font-mono">Python 3.12</Badge>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="h-7 text-[11px]"
          >
            <RotateCcw className="w-3 h-3 mr-1" /> Restablecer
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="h-7 text-[11px]"
          >
            {isFullscreen ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
          </Button>
        </div>
      </div>

      {/* Monaco Editor */}
      <div className="flex-1 min-h-0">
        <MonacoEditor
          height="100%"
          language="python"
          theme="vs-dark"
          value={code}
          onChange={(value) => setCode(value ?? '')}
          onMount={(editor) => { editorRef.current = editor; }}
          options={{
            fontSize: 14,
            fontFamily: '"JetBrains Mono", monospace',
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 4,
            wordWrap: 'on',
            lineNumbers: 'on',
            renderLineHighlight: 'line',
            bracketPairColorization: { enabled: true },
            suggest: { showKeywords: true },
            padding: { top: 8 },
          }}
        />
      </div>

      {/* Results Tabs */}
      <div className="border-t border-border/50 shrink-0">
        <Tabs value={resultTab} onValueChange={(v) => setResultTab(v as 'results' | 'submissions')}>
          <TabsList className="w-full justify-start h-9 rounded-none border-b border-border/50 bg-transparent px-2">
            <TabsTrigger value="results" className="text-xs h-7 data-[state=active]:shadow-none">
              Resultados
            </TabsTrigger>
            <TabsTrigger value="submissions" className="text-xs h-7 data-[state=active]:shadow-none">
              Entregas Anteriores
            </TabsTrigger>
          </TabsList>

          <div className="max-h-[240px] overflow-y-auto p-3">
            <TabsContent value="results" className="m-0">
              {isRunning ? (
                <div className="flex items-center justify-center py-8 gap-2 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" /> Ejecutando...
                </div>
              ) : isSubmitting ? (
                <div className="flex flex-col items-center justify-center py-8 gap-2">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">Evaluando solución...</p>
                  <div className="w-48 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className="h-full bg-primary rounded-full animate-pulse" style={{ width: '60%' }} />
                  </div>
                </div>
              ) : submitResults ? (
                <RunResults
                  results={submitResults.results}
                  isSubmission={true}
                  totalScore={submitResults.score}
                  maxScore={submitResults.maxScore}
                />
              ) : runResults ? (
                <RunResults results={runResults} isSubmission={false} />
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Play className="w-8 h-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">Ejecuta o envía tu código para ver los resultados</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">Ctrl+Enter para ejecutar · Ctrl+Shift+Enter para enviar</p>
                </div>
              )}
            </TabsContent>
            <TabsContent value="submissions" className="m-0">
              <PreviousSubmissions
                hackathonId={hackathonId}
                challengeId={challengeId}
                onLoadCode={handleLoadCode}
              />
            </TabsContent>
          </div>
        </Tabs>
      </div>

      {/* Bottom Bar */}
      <div className="flex items-center justify-between px-3 py-2 border-t border-border/50 bg-muted/20 shrink-0">
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          <Keyboard className="w-3 h-3" />
          <span>Ctrl+↵ Ejecutar</span>
          <span className="text-border">|</span>
          <span>Ctrl+⇧+↵ Enviar</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRun}
            disabled={isRunning || isSubmitting}
            className="h-8 text-xs"
          >
            {isRunning ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Play className="w-3 h-3 mr-1" />}
            Ejecutar
          </Button>
          <Button
            size="sm"
            onClick={() => setShowConfirmSubmit(true)}
            disabled={isRunning || isSubmitting}
            className="h-8 text-xs"
          >
            {isSubmitting ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Send className="w-3 h-3 mr-1" />}
            Enviar
          </Button>
        </div>
      </div>
    </div>
  );

  // ─── Description Panel Content ───
  const descriptionPanel = (
    <DescriptionPanel
      challenge={challenge}
      testCases={testCases ?? []}
      hackathonId={hackathonId}
      hackathon={hackathon}
      code={code}
      loading={challengeLoading}
    />
  );

  return (
    <div className={`flex flex-col ${
      isFullscreen ? 'fixed inset-0 z-50 bg-background' : 'h-[calc(100vh-8rem)]'
    }`}>
      {/* Top bar */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/50 shrink-0">
        <div className="flex items-center gap-2">
          <Link href={`/dashboard/hackathons/${hackathonId}`}>
            <Button variant="ghost" size="sm" className="h-7 text-xs">
              <ArrowLeft className="w-3 h-3 mr-1" /> Hackathon
            </Button>
          </Link>
          {challenge ? (
            <span className="text-sm font-medium truncate max-w-[300px]">{challenge.title}</span>
          ) : null}
        </div>

        {/* Tab tracking warning */}
        {showWarning ? (
          <div className="flex items-center gap-2 text-xs text-amber-500">
            <AlertTriangle className="w-3 h-3" />
            <span>Las salidas de pestaña se registran</span>
            <button onClick={dismissWarning} className="text-muted-foreground hover:text-foreground">✕</button>
          </div>
        ) : null}
      </div>

      {/* Desktop: Split Pane */}
      <div className="flex-1 min-h-0 hidden lg:block">
        <ResizablePanelGroup direction="horizontal">
          <ResizablePanel defaultSize={40} minSize={25} maxSize={60}>
            {descriptionPanel}
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={60} minSize={40} maxSize={75}>
            {editorPanel}
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      {/* Tablet/Mobile: Tabs */}
      <div className="flex-1 min-h-0 lg:hidden flex flex-col">
        <div className="flex border-b border-border/50 shrink-0">
          <button
            onClick={() => setMobileTab('problem')}
            className={`flex-1 py-2 text-xs font-medium text-center transition-colors ${
              mobileTab === 'problem' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground'
            }`}
          >
            Problema
          </button>
          <button
            onClick={() => setMobileTab('editor')}
            className={`flex-1 py-2 text-xs font-medium text-center transition-colors ${
              mobileTab === 'editor' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground'
            }`}
          >
            Editor
          </button>
        </div>
        <div className="flex-1 min-h-0">
          {mobileTab === 'problem' ? descriptionPanel : editorPanel}
        </div>
      </div>

      {/* Confirm Submit Dialog */}
      <Dialog open={showConfirmSubmit} onOpenChange={setShowConfirmSubmit}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Enviar solución?</DialogTitle>
            <DialogDescription>
              Se evaluará tu código contra todos los casos de prueba, incluyendo los ocultos.
              Esta acción quedará registrada como una entrega oficial.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmSubmit(false)}>Cancelar</Button>
            <Button onClick={handleSubmit}>
              <Send className="w-4 h-4 mr-1" /> Confirmar envío
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
