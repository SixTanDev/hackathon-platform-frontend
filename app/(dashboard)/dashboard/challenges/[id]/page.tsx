'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-client';
import { useToast } from '@/hooks/use-toast';
import { toast as sonnerToast } from 'sonner';
import { useAuthStore } from '@/stores/auth-store';
import {
  getChallengeDetail,
  getChallengeTestCases,
  runCode,
  requestHint,
  askDocuments,
  type RunTestResult,
} from '@/lib/api/challenge-services';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useSearchParams } from 'next/navigation';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ArrowLeft,
  Play,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  Cpu,
  Maximize2,
  Minimize2,
  RotateCcw,
  Code2,
  FileText,
  BookOpen,
  Sparkles,
  Bot,
  MessageSquare,
  AlertCircle,
  Lightbulb,
  Trophy,
} from 'lucide-react';
import { MarkdownContent } from '@/components/shared/markdown-content';
import dynamic from 'next/dynamic';

// ─── Monaco Loader ───────────────────────────────────────────
const MonacoEditor = dynamic(() => import('@monaco-editor/react').then((m) => m.default), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full bg-muted/30">
      <Loader2 className="w-6 h-6 animate-spin text-primary" />
    </div>
  ),
});

const DIFFICULTY_CONFIG: Record<string, { label: string; color: string }> = {
  easy: { label: 'Fácil', color: 'bg-green-500/10 text-green-500' },
  medium: { label: 'Medio', color: 'bg-amber-500/10 text-amber-500' },
  hard: { label: 'Difícil', color: 'bg-orange-500/10 text-orange-500' },
  expert: { label: 'Experto', color: 'bg-red-500/10 text-red-500' },
};

const EDITOR_PROTECTED_HEADER = '# === NO EDITAR: ENTORNO DE EVALUACION ===\n# Escribe tu solucion debajo de esta linea\n';
const EDITOR_INITIAL_SNIPPET = '\ndef solution():\n    pass\n';
const PROTECTED_LINE_COUNT = 2;
const EDITABLE_START_LINE = PROTECTED_LINE_COUNT + 1;

function normalizeEditorValue(value?: string | null) {
  const raw = (value ?? '').replace(/\r\n/g, '\n');

  if (!raw.trim()) {
    return EDITOR_PROTECTED_HEADER + EDITOR_INITIAL_SNIPPET;
  }

  if (raw.startsWith(EDITOR_PROTECTED_HEADER)) {
    const editableBody = raw.slice(EDITOR_PROTECTED_HEADER.length);
    return EDITOR_PROTECTED_HEADER + (editableBody.length > 0 ? editableBody : EDITOR_INITIAL_SNIPPET);
  }

  const bodyLines = raw.split('\n').slice(PROTECTED_LINE_COUNT);
  const editableBody = bodyLines.join('\n');
  return EDITOR_PROTECTED_HEADER + (editableBody.length > 0 ? editableBody : EDITOR_INITIAL_SNIPPET);
}

function isEditingKey(event: KeyboardEvent) {
  const key = event.key;

  if (event.ctrlKey || event.metaKey) {
    return ['x', 'v', 'Backspace'].includes(key.toLowerCase());
  }

  if (key.length === 1) return true;

  return ['Backspace', 'Delete', 'Enter', 'Tab'].includes(key);
}

function runMockChallengeLocally(sourceCode: string): RunTestResult[] {
  const normalized = sourceCode.toLowerCase();
  const hasFunction = normalized.includes('def solution');
  const hasReturn = normalized.includes('return');
  const referencesOutputShape =
    normalized.includes('suspicious_ips') && normalized.includes('total_packets_analyzed');
  const lines = sourceCode.replace(/\r\n/g, '\n').split('\n');

  const hasBalancedDelimiters = (() => {
    const stack: string[] = [];
    const pairs: Record<string, string> = { ')': '(', ']': '[', '}': '{' };
    let inSingle = false;
    let inDouble = false;

    for (const line of lines) {
      for (let i = 0; i < line.length; i += 1) {
        const char = line[i];
        const previous = i > 0 ? line[i - 1] : '';

        if (!inDouble && char === "'" && previous !== '\\') {
          inSingle = !inSingle;
          continue;
        }

        if (!inSingle && char === '"' && previous !== '\\') {
          inDouble = !inDouble;
          continue;
        }

        if (inSingle || inDouble) continue;

        if (char === '#') break;

        if (char === '(' || char === '[' || char === '{') {
          stack.push(char);
          continue;
        }

        if (char === ')' || char === ']' || char === '}') {
          if (stack.pop() !== pairs[char]) {
            return false;
          }
        }
      }
    }

    return !inSingle && !inDouble && stack.length === 0;
  })();

  const indentationLooksValid = (() => {
    let previousIndent = 0;
    let previousOpenedBlock = false;
    let continuationDepth = 0;

    for (const rawLine of lines) {
      if (!rawLine.trim()) continue;

      const trimmed = rawLine.trim();
      if (trimmed.startsWith('#')) continue;

      if (rawLine.includes('\t')) return false;

      const indent = rawLine.length - rawLine.trimStart().length;
      if (indent % 4 !== 0) return false;

      const opens = (trimmed.match(/[\(\[\{]/g) ?? []).length;
      const closes = (trimmed.match(/[\)\]\}]/g) ?? []).length;

      if (continuationDepth === 0) {
        if (indent > previousIndent) {
          if (!previousOpenedBlock || indent - previousIndent > 4) {
            return false;
          }
        }

        if (indent < previousIndent && previousIndent - indent > 8) {
          return false;
        }
      }

      previousIndent = indent;
      previousOpenedBlock = trimmed.endsWith(':');
      continuationDepth = Math.max(continuationDepth + opens - closes, 0);
    }

    return true;
  })();

  const passed =
    hasFunction &&
    hasReturn &&
    referencesOutputShape &&
    hasBalancedDelimiters &&
    indentationLooksValid;

  const validationErrors = [
    !hasFunction ? 'definir solution()' : null,
    !hasReturn ? 'retornar un resultado' : null,
    !referencesOutputShape ? 'conservar las claves suspicious_ips y total_packets_analyzed' : null,
    !hasBalancedDelimiters ? 'cerrar correctamente parentesis, corchetes o llaves' : null,
    !indentationLooksValid ? 'mantener una indentacion Python coherente' : null,
  ].filter(Boolean);

  return [
    {
      test_case_index: 0,
      input: 'pcap_file_v1',
      expected_output: '{"suspicious_ips": ["10.0.0.1"], "total_packets_analyzed": 1540}',
      actual_output: passed
        ? '{"suspicious_ips": ["10.0.0.1"], "total_packets_analyzed": 1540}'
        : null,
      passed,
      status: passed ? 'passed' : 'failed',
      execution_time_ms: 42,
      memory_used_mb: 32,
      stderr: passed
        ? null
        : `La solucion demo necesita ${validationErrors.join(', ')}.`,
    },
  ];
}

async function runMockChallengeServer(sourceCode: string): Promise<RunTestResult[]> {
  const response = await fetch('/api/mock-code-grade', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ source_code: sourceCode }),
  });

  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload?.reason ?? 'No se pudo validar el codigo del reto demo.');
  }

  return [
    {
      test_case_index: 0,
      input: 'pcap_file_v1',
      expected_output: '{"suspicious_ips": ["10.0.0.1"], "total_packets_analyzed": 1540}',
      actual_output: payload?.passed
        ? '{"suspicious_ips": ["10.0.0.1"], "total_packets_analyzed": 1540}'
        : null,
      passed: Boolean(payload?.passed),
      status: payload?.passed ? 'passed' : 'failed',
      execution_time_ms: 42,
      memory_used_mb: 32,
      stderr: payload?.passed ? null : String(payload?.reason ?? 'La solucion no supero la validacion demo.'),
    },
  ];
}

function getTutorEncouragement(runResults: RunTestResult[]) {
  const passedCount = runResults.filter((result) => result.passed).length;
  const totalCount = runResults.length;

  if (passedCount === 0) {
    return 'Tu intento ya nos muestra por donde empezar. Revisa la estructura de salida y vuelve a probar.';
  }

  if (passedCount < totalCount) {
    return 'Vas bien. Ya superaste parte de las pruebas visibles; ajusta los casos pendientes y vuelve a ejecutar.';
  }

  return null;
}

export default function StandaloneChallengePage() {
  const { id: challengeId } = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const currentRole = useAuthStore((s) => s?.currentRole);

  const MOCK_CHALLENGE = {
    id: 'mock-python-1',
    title: 'Análisis de Tráfico de Red Real-time',
    description_markdown: `
## El Desafío
El objetivo es procesar archivos de captura de red (**PCAP**) para identificar actividades sospechosas de escaneo de puertos.

### Requerimientos:
1. Leer el archivo \`network_dump.pcap\`.
2. Identificar paquetes con el flag **SYN** activo.
3. Contar cuántos puertos únicos ha intentado acceder cada dirección IP de origen.
4. Si una IP accede a más de **20 puertos** en menos de 1 segundo, marcarla como 'SYN-SCAN'.

### Entregable:
Un diccionario en Python con el formato:
\`\`\`python
{
  "suspicious_ips": ["192.168.1.10", "10.0.0.5"],
  "total_packets_analyzed": 1540
}
\`\`\`
    `,
    difficulty: 'expert',
    type: 'coding',
    time_limit_seconds: 1200,
    memory_limit_mb: 256,
  };
  
  const [code, setCode] = useState(() => normalizeEditorValue(EDITOR_PROTECTED_HEADER + EDITOR_INITIAL_SNIPPET));
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [runResults, setRunResults] = useState<RunTestResult[] | null>(null);
  const [runError, setRunError] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [hints, setHints] = useState<{ text: string; level: number }[]>([]);
  const [isHintLoading, setIsHintLoading] = useState(false);
  const [ragQuery, setRagQuery] = useState('');
  const [ragAnswer, setRagAnswer] = useState('');
  const [isRagLoading, setIsRagLoading] = useState(false);
  const searchParams = useSearchParams();
  const hackathonId = searchParams.get('hackathon_id') || 'mock-hackathon-1';
  
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes in seconds
  const [mobileTab, setMobileTab] = useState<'problem' | 'editor' | 'results'>('problem');

  useEffect(() => {
    if (timeLeft <= 0) return;
    const timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const editorRef = useRef<any>(null);
  const monacoRef = useRef<any>(null);
  const latestCodeRef = useRef(code);

  useEffect(() => {
    latestCodeRef.current = code;
  }, [code]);

  const moveCursorToEditableArea = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;

    editor.focus();
    editor.setPosition({ lineNumber: EDITABLE_START_LINE, column: 1 });
  }, []);

  const handleEditorMount = (editor: any, monaco: any) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    // Add visual decoration for the protected lines.
    editor.createDecorationsCollection([
      {
        range: new monaco.Range(1, 1, PROTECTED_LINE_COUNT, 1),
        options: {
          isWholeLine: true,
          className: 'bg-zinc-800/30 border-l-2 border-primary',
          glyphMarginClassName: 'text-primary opacity-50',
        },
      },
    ]);

    editor.onKeyDown((e: any) => {
      const selection = editor.getSelection();
      const touchesProtectedArea = selection && selection.startLineNumber <= PROTECTED_LINE_COUNT;
      const key = String(e.browserEvent?.key ?? '').toLowerCase();
      const isPasteShortcut =
        (e.browserEvent?.ctrlKey || e.browserEvent?.metaKey) && key === 'v';

      if (isPasteShortcut) {
        e.preventDefault();
        e.stopPropagation();
        toast({
          title: 'Pegado deshabilitado',
          description: 'Escribe tu solucion directamente en el editor del reto.',
          variant: 'destructive',
        });
        moveCursorToEditableArea();
        return;
      }

      if (touchesProtectedArea && isEditingKey(e.browserEvent)) {
        e.preventDefault();
        e.stopPropagation();
        moveCursorToEditableArea();
      }
    });

    editor.onDidPaste(() => {
      editor.setValue(latestCodeRef.current);
      toast({
        title: 'Pegado deshabilitado',
        description: 'No puedes pegar contenido externo en este reto.',
        variant: 'destructive',
      });
      requestAnimationFrame(() => moveCursorToEditableArea());
    });

    editor.onDidChangeModelContent((e: any) => {
      const touchedProtectedArea = e.changes.some(
        (change: any) => change.range.startLineNumber <= PROTECTED_LINE_COUNT
      );

      if (!touchedProtectedArea) return;

      const sanitized = normalizeEditorValue(editor.getValue());
      if (sanitized !== editor.getValue()) {
        setCode(sanitized);
      }
    });

    moveCursorToEditableArea();
  };

  const handleResetCode = () => {
    setCode(normalizeEditorValue(EDITOR_PROTECTED_HEADER + EDITOR_INITIAL_SNIPPET));
    requestAnimationFrame(() => moveCursorToEditableArea());
  };

  // Data fetching
  const { data: challenge, isLoading: challengeLoading } = useQuery({
    queryKey: queryKeys.challenges.detail(challengeId),
    queryFn: () => {
      if (challengeId === 'mock-python-1') return MOCK_CHALLENGE;
      return getChallengeDetail(challengeId);
    },
    enabled: !!challengeId,
  });

  const { data: testCases } = useQuery({
    queryKey: queryKeys.challenges.testCases(challengeId),
    queryFn: () => {
      if (challengeId === 'mock-python-1') return [
        { 
          id: 'tc-1', 
          is_example: true, 
          input_data: 'pcap_file_v1', 
          expected_output: '{"suspicious_ips": ["10.0.0.1"]}',
          order_index: 1,
          explanation: 'Analiza un archivo PCAP básico con una IP sospechosa.'
        }
      ];
      return getChallengeTestCases(challengeId);
    },
    enabled: !!challengeId,
  });

  useEffect(() => {
    if (!challenge?.id) return;
    setTimeLeft(Math.max(challenge.time_limit_seconds ?? 300, 0));
  }, [challenge?.id, challenge?.time_limit_seconds]);

  const handleRun = useCallback(async () => {
    if (isRunning || !challengeId) return;
    setIsRunning(true);
    setRunError(null);

    try {
      if (challengeId === 'mock-python-1') {
        const localResults = await runMockChallengeServer(code);
        setRunResults(localResults);
        if (localResults.every((result) => result.passed)) {
          sonnerToast.success('Pruebas visibles superadas', {
            description: 'Reto 1 superado.',
            icon: <Trophy className="h-4 w-4 text-amber-500" />,
          });
        } else {
          sonnerToast('Hay pruebas por corregir', {
            description: 'La validacion demo detecto que aun faltan partes clave en la solucion.',
          });
        }
        return;
      }

      const response = await runCode(challengeId, {
        source_code: code,
        language: 'python',
      });
      setRunResults(response.results ?? []);
      const passedAll = (response.results ?? []).length > 0 && (response.results ?? []).every((result) => result.passed);
      if (passedAll) {
        sonnerToast.success('Pruebas visibles superadas', {
          description: 'Reto 1 superado.',
          icon: <Trophy className="h-4 w-4 text-amber-500" />,
        });
      }
    } catch (err: any) {
      const message = err?.detail ?? 'No se pudo ejecutar el codigo.';
      setRunError(message);
      toast({
        title: 'Error al ejecutar',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsRunning(false);
    }
  }, [challengeId, code, isRunning, toast]);

  const handleRequestHint = async () => {
    if (isHintLoading || !challengeId) return;
    setIsHintLoading(true);
    try {
      const response = await requestHint(challengeId, {
        hackathon_id: hackathonId,
        hint_level: hints.length + 1,
        student_message: 'Necesito una pista para continuar.',
        student_code: code,
      });
      setHints(prev => [...prev, { text: response.hint_text, level: response.hint_level }]);
      toast({
        title: 'Pista generada',
        description: 'Se han descontado 5 puntos de tu calificación.',
      });
    } catch (err: any) {
      toast({
        title: 'Error al pedir pista',
        description: err?.detail ?? 'No se pudo obtener la pista.',
        variant: 'destructive',
      });
    } finally {
      setIsHintLoading(false);
    }
  };

  const handleAskRag = async () => {
    if (isRagLoading || !ragQuery.trim()) return;
    setIsRagLoading(true);
    setRagAnswer('');
    try {
      const response = await askDocuments({
        question: ragQuery,
        hackathon_id: hackathonId,
      });
      setRagAnswer(response.answer);
    } catch (err: any) {
      toast({
        title: 'Error en consulta IA',
        description: 'No se pudo obtener respuesta de los documentos.',
        variant: 'destructive',
      });
    } finally {
      setIsRagLoading(false);
    }
  };

  const isTutor = useMemo(() => {
    const roleNormalized = String(currentRole || '').toLowerCase().trim();
    if (roleNormalized === 'tutor') return true;
    
    // 🍪 Fallback for cookie consistency
    if (typeof window !== 'undefined') {
      return document.cookie.includes('hackathon-role=tutor');
    }
    return false;
  }, [currentRole]);

  if (challengeLoading) {
    return (
      <div className="h-[calc(100vh-8rem)] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!challenge) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-8rem)] space-y-4">
        <BookOpen className="w-12 h-12 text-muted-foreground/20" />
        <h2 className="text-xl font-semibold">Reto no encontrado</h2>
        <Button onClick={() => router.back()}>Volver</Button>
      </div>
    );
  }

  const diff = DIFFICULTY_CONFIG[challenge.difficulty] ?? DIFFICULTY_CONFIG.medium;
  const examples = testCases?.filter((tc) => tc.is_example) ?? [];

  return (
    <div className="flex h-[calc(100vh-5rem)] flex-col overflow-hidden bg-background sm:-m-6 sm:h-[calc(100vh-6rem)]">
      {/* Header Toolbar */}
      <div className="shrink-0 border-b bg-background px-3 py-3 sm:px-4 sm:py-2">
          <div className="flex items-start justify-between gap-3 sm:items-center">
          <div className="flex min-w-0 items-start gap-2.5 sm:gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.back()} className="mt-0.5 h-8 w-8 shrink-0 rounded-full">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="max-w-[190px] truncate text-[15px] font-bold leading-tight sm:max-w-md sm:text-sm">{challenge.title}</h1>
                <Badge className={`text-[10px] ${diff.color} border-0`}>{diff.label}</Badge>
              </div>
              <div className="inline-flex flex-wrap items-center gap-1.5 rounded-full border border-border/60 bg-muted/60 px-2.5 py-1 text-[11px] font-semibold">
                <Clock className="w-3 h-3 animate-pulse text-primary" />
                <span className="text-muted-foreground">Tiempo:</span>
                <span className={timeLeft < 60 ? 'font-bold text-destructive' : 'font-bold text-foreground'}>{formatTime(timeLeft)}</span>
              </div>
            </div>
          </div>
        <div className="flex shrink-0 items-center gap-2 self-start sm:self-center">
          {!isTutor && (
            <>
              {/* Mentor IA Sheet */}
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm" className="hidden h-8 gap-1.5 border-primary/20 text-primary hover:bg-primary/10 sm:flex">
                    <Sparkles className="w-3.5 h-3.5" />
                    Mentor IA
                  </Button>
                </SheetTrigger>
                <SheetContent className="w-[400px] sm:w-[540px] border-l border-border/50 bg-background/95 backdrop-blur-md p-0 flex flex-col">
                  <SheetHeader className="p-6 border-b border-border/50">
                    <SheetTitle className="flex items-center gap-2">
                      <Bot className="w-5 h-5 text-primary" />
                      Asistente Académico IA
                    </SheetTitle>
                  </SheetHeader>
                  
                  <div className="flex-1 overflow-y-auto p-0">
                    <Tabs defaultValue="hints" className="w-full">
                      <TabsList className="w-full justify-start rounded-none bg-transparent border-b h-12 px-6">
                        <TabsTrigger value="hints" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full">
                          Pistas ({hints.length})
                        </TabsTrigger>
                        <TabsTrigger value="rag" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full">
                          Consultar Manuales
                        </TabsTrigger>
                      </TabsList>

                      {/* AI Hints Content */}
                      <TabsContent value="hints" className="p-6 space-y-6">
                        <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 flex gap-3">
                          <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
                          <div className="space-y-1">
                            <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">Regla de Puntos</p>
                            <p className="text-[11px] text-amber-600/80">Cada pista resta **5 puntos** de tu calificación final. Úsalas sabiamente.</p>
                          </div>
                        </div>

                        <div className="space-y-4">
                          {hints.length === 0 ? (
                            <div className="text-center py-12 space-y-3">
                              <Lightbulb className="w-12 h-12 text-muted-foreground/20 mx-auto" />
                              <p className="text-sm text-muted-foreground">¿Te has bloqueado? Solicita una pista para continuar.</p>
                            </div>
                          ) : (
                            hints.map((h, i) => (
                              <div key={i} className="p-4 rounded-xl border border-border/50 bg-muted/30 space-y-2 animate-in fade-in slide-in-from-right-4">
                                <div className="flex items-center justify-between">
                                  <Badge variant="outline" className="text-[10px] font-bold">PISTA #{h.level}</Badge>
                                  <span className="text-[10px] text-muted-foreground font-mono">-5 Puntos</span>
                                </div>
                                <p className="text-sm leading-relaxed">{h.text}</p>
                              </div>
                            ))
                          )}
                        </div>

                        <div className="pt-4 border-t border-border/50">
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button className="w-full gap-2 rounded-xl h-11" disabled={isHintLoading}>
                                {isHintLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                                Solicitar Pista IA
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="rounded-2xl border-border/50">
                              <AlertDialogHeader>
                                <AlertDialogTitle>¿Confirmar uso de Pista?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Se te descontarán 5 puntos de tu puntaje total por esta pista. Esta acción no se puede deshacer.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={handleRequestHint} className="rounded-xl bg-primary">
                                  Sí, usar pista (-5 pts)
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TabsContent>

                      {/* RAG Q&A Content */}
                      <TabsContent value="rag" className="p-6 space-y-6">
                        <div className="space-y-4">
                          <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex gap-3">
                            <BookOpen className="w-5 h-5 text-primary shrink-0" />
                            <div className="space-y-1">
                              <p className="text-sm font-semibold text-primary">Consulta Documental</p>
                              <p className="text-[11px] text-muted-foreground">Pregunta sobre herramientas (Python, PCAP, Scapy) o sobre los manuales de la sede.</p>
                            </div>
                          </div>

                          <div className="space-y-2">
                             <h4 className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest px-1">Tu Pregunta</h4>
                             <textarea 
                                value={ragQuery}
                                onChange={(e) => setRagQuery(e.target.value)}
                                placeholder="Ej: ¿Cómo analizo un archivo PCAP en Python usando Scapy?"
                                className="w-full h-24 p-4 rounded-xl border border-border/50 bg-background text-sm resize-none focus:ring-2 focus:ring-primary/20 transition-all"
                             />
                             <Button 
                               onClick={handleAskRag} 
                               disabled={isRagLoading || !ragQuery} 
                               className="w-full gap-2 rounded-xl h-11"
                               variant="secondary"
                             >
                               {isRagLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageSquare className="w-4 h-4" />}
                               Consultar Mentor
                             </Button>
                          </div>

                          {ragAnswer && (
                            <div className="space-y-2 pt-4 border-t border-border/50 animate-in fade-in slide-in-from-bottom-2">
                               <div className="flex items-center gap-2 text-primary">
                                 <Bot className="w-4 h-4" />
                                 <span className="text-xs font-bold uppercase tracking-wider">Respuesta del Mentor</span>
                               </div>
                               <div className="p-4 rounded-xl bg-card border text-sm leading-relaxed whitespace-pre-wrap shadow-sm">
                                 {ragAnswer}
                               </div>
                            </div>
                          )}
                        </div>
                      </TabsContent>
                    </Tabs>
                  </div>
                </SheetContent>
              </Sheet>

              <Button 
                size="sm" 
                className="h-9 gap-1.5 rounded-xl px-3 text-xs font-semibold shadow-sm"
                onClick={handleRun}
                disabled={isRunning}
              >
                {isRunning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                Ejecutar Pruebas
              </Button>
            </>
          )}
        </div>
      </div>
      </div>

      {/* Main Content */}
      <div className="hidden flex-1 min-h-0 bg-muted/10 lg:block">
        <ResizablePanelGroup direction="horizontal">
          {/* Left Panel: Description */}
          <ResizablePanel defaultSize={40} minSize={20}>
            <div className="h-full overflow-y-auto p-4 space-y-6 bg-background">
              <div>
                <h2 className="text-base font-semibold mb-4 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" /> Descripción
                </h2>
                <MarkdownContent content={challenge.description_markdown} />
              </div>

              {examples.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold">Ejemplos</h3>
                  {examples.map((tc, i) => (
                    <div key={tc.id} className="space-y-2 p-3 rounded-lg border bg-muted/30">
                      <p className="text-[10px] font-mono text-muted-foreground uppercase">Caso #{i + 1}</p>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-[10px] text-muted-foreground mb-1 font-sans">Entrada:</p>
                          <pre className="text-xs font-mono bg-muted p-2 rounded truncate">{tc.input_data}</pre>
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground mb-1 font-sans">Salida:</p>
                          <pre className="text-xs font-mono bg-muted p-2 rounded truncate">{tc.expected_output}</pre>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="pt-4">
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">Especificaciones Técnicas</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl border border-border/50 bg-muted/20">
                    <p className="text-[10px] text-muted-foreground uppercase mb-1 font-bold">Tiempo Desarrollo</p>
                    <div className="flex items-center gap-2 text-sm font-mono font-medium">
                      <Clock className="w-3.5 h-3.5 text-primary" /> {Math.max(Math.ceil((challenge.time_limit_seconds ?? 300) / 60), 1)} min
                    </div>
                  </div>
                  <div className="p-3 rounded-xl border border-border/50 bg-muted/20">
                    <p className="text-[10px] text-muted-foreground uppercase mb-1 font-bold">Memoria RAM</p>
                    <div className="flex items-center gap-2 text-sm font-mono font-medium">
                      <Cpu className="w-3.5 h-3.5 text-primary" /> {challenge.memory_limit_mb} MB
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Right Panel: Editor & Results */}
          <ResizablePanel defaultSize={60}>
            <ResizablePanelGroup direction="vertical">
              {/* Editor */}
              <ResizablePanel defaultSize={70}>
                <div className="h-full flex flex-col bg-zinc-950">
                  <div className="flex items-center justify-between px-3 py-1 border-b border-white/10 bg-zinc-900 shrink-0">
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">python 3.12</span>
                      <Separator orientation="vertical" className="h-3 bg-white/10" />
                      <button 
                         onClick={handleResetCode}
                         className="text-[10px] font-mono text-zinc-500 hover:text-zinc-300 flex items-center gap-1 transition-colors"
                      >
                         <RotateCcw className="w-2.5 h-2.5" /> REINICIAR
                      </button>
                      {!isTutor && (
                        <>
                          <Separator orientation="vertical" className="h-3 bg-white/10" />
                          <Button
                            size="sm"
                            onClick={handleRun}
                            disabled={isRunning}
                            className="h-6 rounded-md bg-primary/90 px-2.5 text-[10px] font-mono uppercase tracking-wide text-primary-foreground hover:bg-primary"
                          >
                            {isRunning ? (
                              <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                            ) : (
                              <Play className="mr-1.5 h-3 w-3" />
                            )}
                            Ejecutar codigo
                          </Button>
                        </>
                      )}
                    </div>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-zinc-400" onClick={() => setIsFullscreen(!isFullscreen)}>
                      {isFullscreen ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
                    </Button>
                  </div>
                  <div className="flex-1 min-h-0">
                    <MonacoEditor
                      height="100%"
                      language="python"
                      theme="vs-dark"
                      value={code}
                      onMount={handleEditorMount}
                      onChange={(v) => {
                        setCode(normalizeEditorValue(v));
                      }}
                      options={{
                        fontSize: 14,
                        fontFamily: '"JetBrains Mono", monospace',
                        minimap: { enabled: false },
                        scrollBeyondLastLine: false,
                        automaticLayout: true,
                        tabSize: 4,
                        lineNumbersMinChars: 3,
                        glyphMargin: true,
                        fixedOverflowWidgets: true,
                      }}
                    />
                  </div>
                </div>
              </ResizablePanel>

              <ResizableHandle withHandle />

              {/* Console / Results */}
              <ResizablePanel defaultSize={30}>
                <div className="h-full flex flex-col bg-zinc-900 border-t border-white/10">
                  <div className="flex items-center px-4 py-1.5 border-b border-white/5 shrink-0">
                    <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-tight">Consola de Resultados</span>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4">
                    {isRunning ? (
                      <div className="h-full flex flex-col items-center justify-center text-zinc-400 space-y-3">
                        <Loader2 className="w-8 h-8 animate-spin" />
                        <p className="text-xs">Ejecutando pruebas visibles...</p>
                      </div>
                    ) : runError ? (
                      <div className="h-full flex flex-col items-center justify-center text-center text-red-300 space-y-3">
                        <XCircle className="w-8 h-8 opacity-80" />
                        <div className="space-y-1">
                          <p className="text-sm font-medium">No se pudo ejecutar el codigo</p>
                          <p className="max-w-md text-xs text-red-200/80">{runError}</p>
                        </div>
                      </div>
                    ) : !runResults ? (
                      <div className="h-full flex flex-col items-center justify-center text-zinc-500 space-y-2">
                        <Code2 className="w-8 h-8 opacity-20" />
                        <p className="text-xs">Ejecuta tu codigo para ver el resultado de las pruebas.</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className={`p-3 rounded-lg flex items-center gap-2 text-sm font-medium ${
                          runResults.every(r => r.passed) ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
                        }`}>
                          {runResults.every(r => r.passed) ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                          {runResults.filter(r => r.passed).length} de {runResults.length} casos pasaron
                        </div>

                        {!runResults.every(r => r.passed) ? (
                          <div className="animate-in fade-in slide-in-from-bottom-2 rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-[12px] leading-relaxed text-amber-100">
                            <p className="font-semibold text-amber-300">Retroalimentacion del tutor</p>
                            <p className="mt-1 text-amber-100/90">{getTutorEncouragement(runResults)}</p>
                          </div>
                        ) : null}
                         
                        <div className="space-y-2">
                          {runResults.map((r, i) => (
                            <div key={i} className="p-2 rounded border border-white/5 bg-white/5 text-xs space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="font-mono text-zinc-500">Caso #{i+1}</span>
                                <div className="flex items-center gap-3">
                                  <span className="text-zinc-400">{r.execution_time_ms}ms</span>
                                  {r.passed ? (
                                    <Badge className="bg-green-500/20 text-green-500 border-0 text-[10px]">PASS</Badge>
                                  ) : (
                                    <Badge className="bg-red-500/20 text-red-500 border-0 text-[10px]">FAIL</Badge>
                                  )}
                                </div>
                              </div>
                              {!r.passed && r.stderr ? (
                                <p className="text-[11px] leading-relaxed text-red-300/90">{r.stderr}</p>
                              ) : null}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </ResizablePanel>
            </ResizablePanelGroup>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      <div className="flex flex-1 min-h-0 flex-col bg-muted/10 lg:hidden">
        <div className="border-b border-border/50 bg-muted/5 p-2.5">
          <div className="grid grid-cols-3 gap-1.5 rounded-xl bg-muted/50 p-1.5">
            <button
              onClick={() => setMobileTab('problem')}
              className={`rounded-lg px-2 py-2.5 text-[11px] font-semibold transition-all ${
                mobileTab === 'problem' ? 'bg-background text-primary shadow-sm ring-1 ring-border/20' : 'text-muted-foreground'
              }`}
            >
              Problema
            </button>
            <button
              onClick={() => setMobileTab('editor')}
              className={`rounded-lg px-2 py-2.5 text-[11px] font-semibold transition-all ${
                mobileTab === 'editor' ? 'bg-background text-primary shadow-sm ring-1 ring-border/20' : 'text-muted-foreground'
              }`}
            >
              Editor
            </button>
            <button
              onClick={() => setMobileTab('results')}
              className={`rounded-lg px-2 py-2.5 text-[11px] font-semibold transition-all ${
                mobileTab === 'results' ? 'bg-background text-primary shadow-sm ring-1 ring-border/20' : 'text-muted-foreground'
              }`}
            >
              Resultados
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto bg-background">
          {mobileTab === 'problem' ? (
            <div className="space-y-5 p-4">
              <div>
                <h2 className="mb-4 flex items-center gap-2 text-base font-semibold">
                  <FileText className="w-4 h-4 text-primary" /> Descripción
                </h2>
                <MarkdownContent content={challenge.description_markdown} />
              </div>

              {examples.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold">Ejemplos</h3>
                  {examples.map((tc, i) => (
                    <div key={tc.id} className="space-y-2 rounded-lg border bg-muted/30 p-3">
                      <p className="text-[10px] font-mono uppercase text-muted-foreground">Caso #{i + 1}</p>
                      <div className="grid grid-cols-1 gap-3">
                        <div>
                          <p className="mb-1 text-[10px] text-muted-foreground">Entrada:</p>
                          <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded bg-muted p-2 text-xs font-mono">{tc.input_data}</pre>
                        </div>
                        <div>
                          <p className="mb-1 text-[10px] text-muted-foreground">Salida:</p>
                          <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded bg-muted p-2 text-xs font-mono">{tc.expected_output}</pre>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="pt-2">
                <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-muted-foreground">Especificaciones Técnicas</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-border/50 bg-muted/20 p-3">
                    <p className="mb-1 text-[10px] font-bold uppercase text-muted-foreground">Tiempo Desarrollo</p>
                    <div className="flex items-center gap-2 text-sm font-mono font-medium">
                      <Clock className="w-3.5 h-3.5 text-primary" /> {Math.max(Math.ceil((challenge.time_limit_seconds ?? 300) / 60), 1)} min
                    </div>
                  </div>
                  <div className="rounded-xl border border-border/50 bg-muted/20 p-3">
                    <p className="mb-1 text-[10px] font-bold uppercase text-muted-foreground">Memoria RAM</p>
                    <div className="flex items-center gap-2 text-sm font-mono font-medium">
                      <Cpu className="w-3.5 h-3.5 text-primary" /> {challenge.memory_limit_mb} MB
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : mobileTab === 'editor' ? (
            <div className="flex h-full flex-col bg-zinc-950">
              <div className="flex items-center justify-between gap-2 border-b border-white/10 bg-zinc-900 px-3 py-2.5 shrink-0">
                <div className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-primary">
                  Python 3.12
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={handleResetCode} className="h-8 px-2.5 text-[11px] font-medium text-zinc-300 hover:bg-white/5">
                    <RotateCcw className="mr-1 h-3 w-3" /> Reiniciar
                  </Button>
                  <Button size="sm" onClick={handleRun} disabled={isRunning} className="h-8 rounded-lg px-3 text-[11px] font-semibold shadow-sm">
                    {isRunning ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Play className="mr-1 h-3 w-3" />}
                    Ejecutar
                  </Button>
                </div>
              </div>
              <div className="min-h-0 flex-1">
                <MonacoEditor
                  height="100%"
                  language="python"
                  theme="vs-dark"
                  value={code}
                  onMount={handleEditorMount}
                  onChange={(v) => {
                    setCode(normalizeEditorValue(v));
                  }}
                  options={{
                    fontSize: 14,
                    fontFamily: '"JetBrains Mono", monospace',
                    minimap: { enabled: false },
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                    tabSize: 4,
                    lineNumbersMinChars: 3,
                    glyphMargin: true,
                    fixedOverflowWidgets: true,
                  }}
                />
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col bg-zinc-900 border-t border-white/10">
              <div className="flex items-center justify-between border-b border-white/5 bg-zinc-950/60 px-4 py-2.5 shrink-0">
                <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-300">Resultados</span>
                <span className="text-[10px] text-zinc-500">Pruebas visibles</span>
              </div>
              <div className="flex-1 overflow-y-auto p-4 text-zinc-100">
                {isRunning ? (
                  <div className="h-full flex flex-col items-center justify-center space-y-3 text-zinc-300">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm font-medium">Ejecutando pruebas visibles...</p>
                  </div>
                ) : runError ? (
                  <div className="h-full flex flex-col items-center justify-center text-center text-red-300 space-y-3">
                    <XCircle className="w-8 h-8 opacity-80" />
                    <div className="space-y-1">
                      <p className="text-sm font-medium">No se pudo ejecutar el código</p>
                      <p className="max-w-md text-xs text-red-200/80">{runError}</p>
                    </div>
                  </div>
                ) : !runResults ? (
                  <div className="h-full flex flex-col items-center justify-center space-y-3 text-zinc-300">
                    <div className="rounded-full border border-white/10 bg-white/5 p-4">
                      <Code2 className="h-7 w-7 text-primary/80" />
                    </div>
                    <div className="space-y-1 text-center">
                      <p className="text-sm font-semibold text-zinc-100">Todavía no hay resultados</p>
                      <p className="text-xs text-zinc-400">Ejecuta tu código para ver el estado de las pruebas.</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className={`flex items-center gap-2 rounded-lg p-3 text-sm font-medium ${
                      runResults.every(r => r.passed) ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
                    }`}>
                      {runResults.every(r => r.passed) ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                      {runResults.filter(r => r.passed).length} de {runResults.length} casos pasaron
                    </div>
                    {!runResults.every(r => r.passed) ? (
                      <div className="animate-in fade-in slide-in-from-bottom-2 rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-[12px] leading-relaxed text-amber-100">
                        <p className="font-semibold text-amber-300">Retroalimentación del tutor</p>
                        <p className="mt-1 text-amber-100/90">{getTutorEncouragement(runResults)}</p>
                      </div>
                    ) : null}
                        <div className="space-y-2.5">
                          {runResults.map((r, i) => (
                        <div key={i} className="space-y-2 rounded-xl border border-white/10 bg-white/[0.06] p-3 text-xs shadow-sm">
                              <div className="flex items-center justify-between">
                            <span className="font-mono font-medium text-zinc-300">Caso #{i + 1}</span>
                            <div className="flex items-center gap-3">
                              <span className="text-zinc-400">{r.execution_time_ms}ms</span>
                              {r.passed ? (
                                <Badge className="border-0 bg-green-500/20 text-[10px] text-green-500">PASS</Badge>
                              ) : (
                                <Badge className="border-0 bg-red-500/20 text-[10px] text-red-500">FAIL</Badge>
                              )}
                            </div>
                          </div>
                          {!r.passed && r.stderr ? <p className="text-[11px] leading-relaxed text-red-300/90">{r.stderr}</p> : null}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
