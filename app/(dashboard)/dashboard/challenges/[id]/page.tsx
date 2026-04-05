'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-client';
import { useToast } from '@/hooks/use-toast';
import { useAuthStore } from '@/stores/auth-store';
import {
  getChallengeDetail,
  getChallengeTestCases,
  runCode,
  type RunTestResult,
} from '@/lib/api/challenge-services';
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
} from 'lucide-react';
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
    time_limit_seconds: 5,
    memory_limit_mb: 256,
  };
  
  const [code, setCode] = useState('# Escribe tu solución aquí\n\n');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [runResults, setRunResults] = useState<RunTestResult[] | null>(null);
  const [isRunning, setIsRunning] = useState(false);

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

  const handleRun = useCallback(async () => {
    if (isRunning || !challengeId) return;
    setIsRunning(true);
    setRunResults(null);

    try {
      const response = await runCode(challengeId, {
        source_code: code,
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
  }, [challengeId, code, isRunning, toast]);

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
    <div className="h-[calc(100vh-6rem)] overflow-hidden flex flex-col -m-6">
      {/* Header Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-background shrink-0">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="h-8 w-8">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-bold truncate max-w-[200px] md:max-w-md">{challenge.title}</h1>
            <Badge className={`text-[10px] ${diff.color} border-0`}>{diff.label}</Badge>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isTutor && (
            <Button 
              size="sm" 
              variant="secondary" 
              className="h-8 gap-1.5"
              onClick={handleRun}
              disabled={isRunning}
            >
              {isRunning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
              Ejecutar Pruebas
            </Button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 min-h-0 bg-muted/10">
        <ResizablePanelGroup direction="horizontal">
          {/* Left Panel: Description */}
          <ResizablePanel defaultSize={40} minSize={20}>
            <div className="h-full overflow-y-auto p-4 space-y-6 bg-background">
              <div>
                <h2 className="text-base font-semibold mb-4 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" /> Descripción
                </h2>
                <div 
                  className="prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: challenge.description_markdown }} 
                />
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
                <h3 className="text-sm font-semibold mb-3">Restricciones</h3>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <Card className="border-border/50"><CardContent className="p-2 flex items-center gap-2">
                    <Clock className="w-3 h-3 text-muted-foreground" /> {challenge.time_limit_seconds}s
                  </CardContent></Card>
                  <Card className="border-border/50"><CardContent className="p-2 flex items-center gap-2">
                    <Cpu className="w-3 h-3 text-muted-foreground" /> {challenge.memory_limit_mb} MB
                  </CardContent></Card>
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
                    <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">python 3.12</span>
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
                      onChange={(v) => setCode(v ?? '')}
                      options={{
                        fontSize: 14,
                        fontFamily: '"JetBrains Mono", monospace',
                        minimap: { enabled: false },
                        scrollBeyondLastLine: false,
                        automaticLayout: true,
                        tabSize: 4,
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
                    {!runResults ? (
                      <div className="h-full flex flex-col items-center justify-center text-zinc-500 space-y-2">
                        <Code2 className="w-8 h-8 opacity-20" />
                        <p className="text-xs">Ejecuta tu código para ver los resultados aquí.</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className={`p-3 rounded-lg flex items-center gap-2 text-sm font-medium ${
                          runResults.every(r => r.passed) ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
                        }`}>
                          {runResults.every(r => r.passed) ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                          {runResults.filter(r => r.passed).length} de {runResults.length} casos pasaron
                        </div>
                        
                        <div className="space-y-2">
                          {runResults.map((r, i) => (
                            <div key={i} className="p-2 rounded border border-white/5 bg-white/5 flex items-center justify-between text-xs">
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
    </div>
  );
}
