'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-client';
import {
  getChallenge, createChallenge, updateChallenge, listTestCases, addTestCase,
  updateTestCase, deleteTestCase, submitSolution, getSolution, validateChallenge,
  searchSimilarByText,
} from '@/lib/api/challenge-admin-services';
import type { ValidationResult, SimilarChallenge, ChallengeSolution } from '@/lib/api/challenge-admin-services';
import type { ChallengeType, ChallengeDifficulty, TestCase, TestCaseCreate } from '@/types/api';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import dynamic from 'next/dynamic';
import {
  Save, ArrowLeft, Plus, Trash2, GripVertical, Eye, EyeOff, ChevronUp, ChevronDown,
  Code2, FileText, Play, CheckCircle2, XCircle, AlertTriangle, Sparkles, Loader2
} from 'lucide-react';

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false, loading: () => <Skeleton className="h-[300px] w-full" /> });

const DIFFICULTY_POINTS: Record<ChallengeDifficulty, number> = { easy: 100, medium: 250, hard: 500, expert: 1000 };
const TYPE_OPTIONS: { value: ChallengeType; label: string; isCoding: boolean }[] = [
  { value: 'coding', label: 'Coding', isCoding: true },
  { value: 'case_study', label: 'Caso de Estudio', isCoding: false },
  { value: 'essay', label: 'Ensayo', isCoding: false },
  { value: 'clinical_analysis', label: 'Análisis Clínico', isCoding: false },
  { value: 'legal_argument', label: 'Argumento Legal', isCoding: false },
  { value: 'design_proposal', label: 'Propuesta de Diseño', isCoding: false },
  { value: 'custom', label: 'Personalizado', isCoding: false },
];
const CATEGORY_SUGGESTIONS = ['Algoritmos', 'Estructuras de Datos', 'Matemáticas', 'Programación Dinámica', 'Grafos', 'Strings', 'Búsqueda', 'Ordenamiento', 'Recursividad', 'SQL', 'Redes', 'Seguridad', 'Ingeniería de Software', 'Derecho', 'Salud', 'Administración'];

interface LocalTestCase extends TestCaseCreate {
  _key: string;
  _saved_id?: string;
}

interface RubricLevel { label: string; points: number; description: string; }
interface RubricCriterionLocal { _key: string; name: string; description: string; max_points: number; scoring_levels: RubricLevel[]; }

export default function ChallengeCreateEditPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get('edit');
  const isEdit = !!editId;
  const qc = useQueryClient();

  // ─ Basic fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<ChallengeType>('coding');
  const [difficulty, setDifficulty] = useState<ChallengeDifficulty>('medium');
  const [points, setPoints] = useState(250);
  const [category, setCategory] = useState('');
  const [showCatSuggestions, setShowCatSuggestions] = useState(false);
  const [timeLimit, setTimeLimit] = useState(10);
  const [memoryLimit, setMemoryLimit] = useState(256);
  const [descTab, setDescTab] = useState<string>('edit');

  // ─ Test cases (coding)
  const [testCases, setTestCases] = useState<LocalTestCase[]>([]);

  // ─ Solution (coding)
  const [solutionCode, setSolutionCode] = useState('# Solución de referencia\n');
  const [timeComplexity, setTimeComplexity] = useState('');
  const [spaceComplexity, setSpaceComplexity] = useState('');
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [validating, setValidating] = useState(false);

  // ─ Non-technical: rubric
  const [rubricCriteria, setRubricCriteria] = useState<RubricCriterionLocal[]>([]);
  const [submissionFormat, setSubmissionFormat] = useState<'pdf' | 'text'>('pdf');
  const [enableAIFeedback, setEnableAIFeedback] = useState(false);

  // ─ Similar challenges
  const [similarWarning, setSimilarWarning] = useState<SimilarChallenge[]>([]);
  const [dismissedSimilar, setDismissedSimilar] = useState(false);

  const [saving, setSaving] = useState(false);
  const isCoding = type === 'coding';

  // ─ Load existing challenge for editing
  const { data: existingChallenge, isLoading: loadingChallenge } = useQuery({
    queryKey: queryKeys.challenges.detail(editId ?? ''),
    queryFn: () => getChallenge(editId!),
    enabled: isEdit,
  });

  const { data: existingTestCases } = useQuery({
    queryKey: queryKeys.challenges.testCases(editId ?? ''),
    queryFn: () => listTestCases(editId!),
    enabled: isEdit && isCoding,
  });

  const { data: existingSolution } = useQuery({
    queryKey: queryKeys.adminChallenges.solution(editId ?? ''),
    queryFn: () => getSolution(editId!),
    enabled: isEdit && isCoding,
  });

  // Populate form
  useEffect(() => {
    if (!existingChallenge) return;
    const c = existingChallenge;
    setTitle(c.title);
    setDescription(c.description_markdown);
    setType(c.type);
    setDifficulty(c.difficulty);
    setPoints(c.points_base);
    setCategory(c.category ?? '');
    setTimeLimit(c.time_limit_seconds);
    setMemoryLimit(c.memory_limit_mb);
    const meta = c.metadata_json as Record<string, unknown> | null;
    if (meta?.rubric_json) {
      const rj = meta.rubric_json as { criteria?: RubricCriterionLocal[] };
      if (rj.criteria) setRubricCriteria(rj.criteria.map((cr, i) => ({ ...cr, _key: `rc-${i}` })));
    }
    if (meta?.submission_format) setSubmissionFormat(meta.submission_format as 'pdf' | 'text');
    if (meta?.enable_ai_feedback) setEnableAIFeedback(true);
  }, [existingChallenge]);

  useEffect(() => {
    if (!existingTestCases?.length) return;
    setTestCases(existingTestCases.map((tc: TestCase) => ({
      _key: `tc-${tc.id}`, _saved_id: tc.id,
      input_data: tc.input_data, expected_output: tc.expected_output,
      is_hidden: tc.is_hidden, is_example: tc.is_example,
      points_weight: tc.points_weight, order_index: tc.order_index,
      explanation: tc.explanation,
    })));
  }, [existingTestCases]);

  useEffect(() => {
    if (existingSolution) {
      setSolutionCode(existingSolution.source_code);
      setTimeComplexity(existingSolution.time_complexity ?? '');
      setSpaceComplexity(existingSolution.space_complexity ?? '');
    }
  }, [existingSolution]);

  // Auto-fill points on difficulty change
  useEffect(() => {
    if (!isEdit) setPoints(DIFFICULTY_POINTS[difficulty]);
  }, [difficulty, isEdit]);

  // Duplicate detection
  useEffect(() => {
    if (isEdit || !title || title.length < 5 || dismissedSimilar) return;
    const t = setTimeout(async () => {
      try {
        const similar = await searchSimilarByText(title, category || undefined);
        setSimilarWarning(similar.filter(s => s.similarity_score > 0.6));
      } catch { /* ignore */ }
    }, 1500);
    return () => clearTimeout(t);
  }, [title, category, isEdit, dismissedSimilar]);

  // ─ Test case helpers
  const addNewTestCase = () => {
    setTestCases(prev => [...prev, {
      _key: `tc-new-${Date.now()}`, input_data: '', expected_output: '',
      is_hidden: true, is_example: false, points_weight: 1, order_index: prev.length,
      explanation: '',
    }]);
  };

  const updateTC = (key: string, field: string, value: unknown) => {
    setTestCases(prev => prev.map(tc => tc._key === key ? { ...tc, [field]: value } : tc));
  };

  const removeTC = (key: string) => setTestCases(prev => prev.filter(tc => tc._key !== key));

  const moveTC = (idx: number, dir: -1 | 1) => {
    setTestCases(prev => {
      const next = [...prev];
      const target = idx + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[idx], next[target]] = [next[target], next[idx]];
      return next.map((tc, i) => ({ ...tc, order_index: i }));
    });
  };

  // ─ Rubric helpers
  const addCriterion = () => {
    setRubricCriteria(prev => [...prev, {
      _key: `rc-${Date.now()}`, name: '', description: '', max_points: 10,
      scoring_levels: [
        { label: 'Excelente', points: 10, description: '' },
        { label: 'Bueno', points: 7, description: '' },
        { label: 'Regular', points: 4, description: '' },
        { label: 'Deficiente', points: 1, description: '' },
      ],
    }]);
  };

  const updateCriterion = (key: string, field: string, value: unknown) => {
    setRubricCriteria(prev => prev.map(cr => cr._key === key ? { ...cr, [field]: value } : cr));
  };

  const removeCriterion = (key: string) => setRubricCriteria(prev => prev.filter(cr => cr._key !== key));

  const updateScoringLevel = (crKey: string, idx: number, field: string, value: unknown) => {
    setRubricCriteria(prev => prev.map(cr => {
      if (cr._key !== crKey) return cr;
      const levels = [...cr.scoring_levels];
      levels[idx] = { ...levels[idx], [field]: value };
      return { ...cr, scoring_levels: levels };
    }));
  };

  const addScoringLevel = (crKey: string) => {
    setRubricCriteria(prev => prev.map(cr => {
      if (cr._key !== crKey) return cr;
      return { ...cr, scoring_levels: [...cr.scoring_levels, { label: '', points: 0, description: '' }] };
    }));
  };

  const removeScoringLevel = (crKey: string, idx: number) => {
    setRubricCriteria(prev => prev.map(cr => {
      if (cr._key !== crKey) return cr;
      return { ...cr, scoring_levels: cr.scoring_levels.filter((_, i) => i !== idx) };
    }));
  };

  // ─ Validate solution
  const handleValidate = async () => {
    if (!editId) { toast.error('Guarda el reto primero antes de validar'); return; }
    setValidating(true);
    try {
      await submitSolution(editId, { source_code: solutionCode, language: 'python', time_complexity: timeComplexity || undefined, space_complexity: spaceComplexity || undefined });
      const result = await validateChallenge(editId);
      setValidationResult(result);
      if (result.passed) toast.success(`✓ ${result.passed_tests}/${result.total_tests} casos pasaron`);
      else toast.error(`✗ ${result.passed_tests}/${result.total_tests} casos pasaron`);
    } catch { toast.error('Error al validar'); }
    setValidating(false);
  };

  // ─ Save challenge
  const handleSave = async () => {
    if (!title.trim()) { toast.error('El título es obligatorio'); return; }
    if (!description.trim()) { toast.error('La descripción es obligatoria'); return; }
    setSaving(true);
    try {
      const metadataJson: Record<string, unknown> = {};
      if (!isCoding) {
        metadataJson.submission_format = submissionFormat;
        metadataJson.enable_ai_feedback = enableAIFeedback;
        if (rubricCriteria.length > 0) {
          metadataJson.rubric_json = {
            criteria: rubricCriteria.map(cr => ({
              id: cr._key, name: cr.name, description: cr.description,
              max_points: cr.max_points, scoring_levels: cr.scoring_levels,
            })),
            total_points: rubricCriteria.reduce((s, cr) => s + cr.max_points, 0),
          };
        }
      }

      const payload = {
        title, description_markdown: description, type, difficulty,
        points_base: points, category: category || null,
        time_limit_seconds: isCoding ? timeLimit : 0,
        memory_limit_mb: isCoding ? memoryLimit : 0,
        allowed_languages: isCoding ? ['python'] : [],
        metadata_json: Object.keys(metadataJson).length > 0 ? metadataJson : null,
        ...(!isEdit && isCoding ? { test_cases: testCases.map((tc, i) => ({
          input_data: tc.input_data, expected_output: tc.expected_output,
          is_hidden: tc.is_hidden, is_example: tc.is_example,
          points_weight: tc.points_weight, order_index: i, explanation: tc.explanation || null,
        })) } : {}),
      };

      if (isEdit) {
        await updateChallenge(editId!, payload);
        toast.success('Reto actualizado');
      } else {
        const created = await createChallenge(payload);
        toast.success('Reto creado');
        router.replace(`/admin/challenges/create?edit=${created.id}`);
      }
      qc.invalidateQueries({ queryKey: queryKeys.challenges.all });
    } catch { toast.error('Error al guardar'); }
    setSaving(false);
  };

  // ─ Warnings
  const tcWarnings = useMemo(() => {
    if (!isCoding) return [];
    const w: string[] = [];
    if (testCases.length === 0) w.push('Agrega al menos un caso de prueba');
    if (!testCases.some(tc => tc.is_example)) w.push('Se recomienda al menos 1 caso de ejemplo');
    if (!testCases.some(tc => tc.is_hidden)) w.push('Se recomienda al menos 1 caso oculto');
    return w;
  }, [testCases, isCoding]);

  const filteredSuggestions = useMemo(() => {
    if (!category) return CATEGORY_SUGGESTIONS;
    return CATEGORY_SUGGESTIONS.filter(s => s.toLowerCase().includes(category.toLowerCase()));
  }, [category]);

  if (isEdit && loadingChallenge) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push('/admin/challenges')}><ArrowLeft className="h-5 w-5" /></Button>
        <PageHeader title={isEdit ? 'Editar Reto' : 'Crear Reto'} description={isEdit ? `Editando: ${title}` : 'Completa los campos para crear un nuevo reto'} />
      </div>

      {/* Duplicate warning */}
      {similarWarning.length > 0 && !dismissedSimilar && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="py-3">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-400 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-amber-400">Se encontraron retos similares</p>
                <ul className="mt-1 space-y-1">
                  {similarWarning.map(s => (
                    <li key={s.id} className="text-xs text-muted-foreground">
                      • {s.title} ({s.difficulty}) — {Math.round(s.similarity_score * 100)}% similitud
                    </li>
                  ))}
                </ul>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setDismissedSimilar(true)}>Descartar</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Type & Difficulty row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="space-y-2">
          <Label>Tipo de Reto</Label>
          <Select value={type} onValueChange={v => setType(v as ChallengeType)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {TYPE_OPTIONS.map(o => (
                <SelectItem key={o.value} value={o.value}>
                  <span className="flex items-center gap-2">
                    {o.isCoding ? <Code2 className="h-3.5 w-3.5" /> : <FileText className="h-3.5 w-3.5" />}
                    {o.label}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Dificultad</Label>
          <Select value={difficulty} onValueChange={v => setDifficulty(v as ChallengeDifficulty)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="easy">Fácil (100 pts)</SelectItem>
              <SelectItem value="medium">Medio (250 pts)</SelectItem>
              <SelectItem value="hard">Difícil (500 pts)</SelectItem>
              <SelectItem value="expert">Experto (1000 pts)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Puntos Base</Label>
          <Input type="number" value={points} onChange={e => setPoints(Number(e.target.value))} />
        </div>
        <div className="space-y-2 relative">
          <Label>Categoría</Label>
          <Input value={category} onChange={e => setCategory(e.target.value)} onFocus={() => setShowCatSuggestions(true)} onBlur={() => setTimeout(() => setShowCatSuggestions(false), 200)} placeholder="Ej: Algoritmos" />
          {showCatSuggestions && filteredSuggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 z-20 mt-1 bg-popover border border-border rounded-md shadow-lg max-h-40 overflow-y-auto">
              {filteredSuggestions.map(s => <button key={s} className="w-full text-left px-3 py-1.5 text-sm hover:bg-muted" onClick={() => { setCategory(s); setShowCatSuggestions(false); }}>{s}</button>)}
            </div>
          )}
        </div>
      </div>

      {/* Title */}
      <div className="space-y-2">
        <Label>Título</Label>
        <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Título del reto" />
      </div>

      {/* Description with preview */}
      <div className="space-y-2">
        <Label>Descripción (Markdown)</Label>
        <Tabs value={descTab} onValueChange={setDescTab}>
          <TabsList><TabsTrigger value="edit">Editar</TabsTrigger><TabsTrigger value="preview">Vista Previa</TabsTrigger></TabsList>
          <TabsContent value="edit">
            <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Escribe la descripción en Markdown..." className="min-h-[200px] font-mono text-sm" />
          </TabsContent>
          <TabsContent value="preview">
            <Card><CardContent className="py-4 prose prose-invert max-w-none text-sm whitespace-pre-wrap">{description || 'Sin contenido'}</CardContent></Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* CODING-SPECIFIC SECTIONS */}
      {isCoding && (
        <>
          {/* Limits */}
          <Card>
            <CardHeader><CardTitle className="text-base">Límites de Ejecución</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div className="flex justify-between"><Label>Tiempo límite</Label><span className="text-sm font-mono text-muted-foreground">{timeLimit}s</span></div>
                <Slider value={[timeLimit]} onValueChange={([v]) => setTimeLimit(v)} min={5} max={30} step={1} />
              </div>
              <div className="space-y-3">
                <div className="flex justify-between"><Label>Memoria límite</Label><span className="text-sm font-mono text-muted-foreground">{memoryLimit} MB</span></div>
                <Slider value={[memoryLimit]} onValueChange={([v]) => setMemoryLimit(v)} min={128} max={512} step={64} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Lenguajes Permitidos</Label>
                <div className="flex gap-2">
                  <Badge variant="outline" className="bg-primary/10 text-primary">Python</Badge>
                  <span className="text-xs text-muted-foreground">(Solo Python disponible por ahora)</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Test cases */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Casos de Prueba ({testCases.length})</CardTitle>
                <Button variant="outline" size="sm" onClick={addNewTestCase}><Plus className="h-4 w-4 mr-1" />Agregar Caso</Button>
              </div>
              {tcWarnings.length > 0 && (
                <div className="space-y-1 mt-2">
                  {tcWarnings.map((w, i) => <p key={i} className="text-xs text-amber-400 flex items-center gap-1"><AlertTriangle className="h-3 w-3" />{w}</p>)}
                </div>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {testCases.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No hay casos de prueba aún</p>}
              {testCases.map((tc, idx) => (
                <div key={tc._key} className="border border-border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <GripVertical className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Caso #{idx + 1}</span>
                      {tc.is_example && <Badge variant="outline" className="text-xs">Ejemplo</Badge>}
                      {tc.is_hidden && <Badge variant="outline" className="text-xs bg-muted"><EyeOff className="h-3 w-3 mr-1" />Oculto</Badge>}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveTC(idx, -1)} disabled={idx === 0}><ChevronUp className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveTC(idx, 1)} disabled={idx === testCases.length - 1}><ChevronDown className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeTC(tc._key)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Entrada</Label>
                      <Textarea value={tc.input_data} onChange={e => updateTC(tc._key, 'input_data', e.target.value)} className="font-mono text-xs min-h-[60px]" placeholder="Entrada..." />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Salida Esperada</Label>
                      <Textarea value={tc.expected_output} onChange={e => updateTC(tc._key, 'expected_output', e.target.value)} className="font-mono text-xs min-h-[60px]" placeholder="Salida esperada..." />
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Switch checked={tc.is_example} onCheckedChange={v => updateTC(tc._key, 'is_example', v)} />
                      <Label className="text-xs">Es ejemplo</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch checked={tc.is_hidden} onCheckedChange={v => updateTC(tc._key, 'is_hidden', v)} />
                      <Label className="text-xs">Es oculto</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Label className="text-xs">Peso</Label>
                      <Input type="number" value={tc.points_weight} onChange={e => updateTC(tc._key, 'points_weight', Number(e.target.value))} className="w-16 h-7 text-xs" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Explicación (opcional)</Label>
                    <Input value={tc.explanation ?? ''} onChange={e => updateTC(tc._key, 'explanation', e.target.value)} className="text-xs" placeholder="Explicación del caso..." />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Reference Solution */}
          <Card>
            <CardHeader><CardTitle className="text-base">Solución de Referencia</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="border border-border rounded-lg overflow-hidden">
                <MonacoEditor height="300px" language="python" theme="vs-dark" value={solutionCode} onChange={v => setSolutionCode(v ?? '')} options={{ minimap: { enabled: false }, fontSize: 14, fontFamily: 'JetBrains Mono, monospace', scrollBeyondLastLine: false }} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs">Complejidad Temporal (opcional)</Label>
                  <Input value={timeComplexity} onChange={e => setTimeComplexity(e.target.value)} placeholder="Ej: O(n log n)" className="text-xs" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Complejidad Espacial (opcional)</Label>
                  <Input value={spaceComplexity} onChange={e => setSpaceComplexity(e.target.value)} placeholder="Ej: O(n)" className="text-xs" />
                </div>
              </div>
              <Button variant="outline" onClick={handleValidate} disabled={validating || !editId}>
                {validating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
                Validar Solución
              </Button>
              {!editId && <p className="text-xs text-muted-foreground">Guarda el reto primero para poder validar la solución</p>}
              {validationResult && (
                <div className={`p-3 rounded-lg border ${validationResult.passed ? 'border-green-500/30 bg-green-500/5' : 'border-red-500/30 bg-red-500/5'}`}>
                  <p className="text-sm font-medium flex items-center gap-2">
                    {validationResult.passed ? <CheckCircle2 className="h-4 w-4 text-green-400" /> : <XCircle className="h-4 w-4 text-red-400" />}
                    {validationResult.passed_tests}/{validationResult.total_tests} casos pasaron
                  </p>
                  {!validationResult.passed && validationResult.results.filter(r => !r.passed).map((r, i) => (
                    <p key={i} className="text-xs text-red-400 mt-1">✗ Caso #{r.order_index + 1}: esperado &quot;{r.expected_output}&quot;, obtenido &quot;{r.actual_output ?? 'error'}&quot;{r.error ? ` — ${r.error}` : ''}</p>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* NON-TECHNICAL SECTIONS */}
      {!isCoding && (
        <>
          <Card>
            <CardHeader><CardTitle className="text-base">Configuración de Entrega</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Formato de Entrega</Label>
                <Select value={submissionFormat} onValueChange={v => setSubmissionFormat(v as 'pdf' | 'text')}>
                  <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pdf">PDF</SelectItem>
                    <SelectItem value="text">Texto</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={enableAIFeedback} onCheckedChange={setEnableAIFeedback} />
                <div>
                  <Label>Habilitar retroalimentación de IA</Label>
                  <p className="text-xs text-muted-foreground">La IA analizará entregas y dará retroalimentación automática</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Rubric Builder */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Rúbrica de Evaluación</CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">
                    Total: {rubricCriteria.reduce((s, cr) => s + cr.max_points, 0)} puntos
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={addCriterion}><Plus className="h-4 w-4 mr-1" />Agregar Criterio</Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {rubricCriteria.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No hay criterios definidos</p>}
              {rubricCriteria.map(cr => (
                <div key={cr._key} className="border border-border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Nombre</Label>
                        <Input value={cr.name} onChange={e => updateCriterion(cr._key, 'name', e.target.value)} placeholder="Ej: Claridad" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Descripción</Label>
                        <Input value={cr.description} onChange={e => updateCriterion(cr._key, 'description', e.target.value)} placeholder="Descripción del criterio" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Puntos Máximos</Label>
                        <Input type="number" value={cr.max_points} onChange={e => updateCriterion(cr._key, 'max_points', Number(e.target.value))} />
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="ml-2 text-destructive" onClick={() => removeCriterion(cr._key)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">Niveles de Calificación</Label>
                      <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => addScoringLevel(cr._key)}><Plus className="h-3 w-3 mr-1" />Nivel</Button>
                    </div>
                    <div className="space-y-2">
                      {cr.scoring_levels.map((sl, i) => (
                        <div key={i} className="flex items-center gap-2 bg-muted/30 rounded px-3 py-2">
                          <Input value={sl.label} onChange={e => updateScoringLevel(cr._key, i, 'label', e.target.value)} placeholder="Etiqueta" className="w-28 h-7 text-xs" />
                          <Input type="number" value={sl.points} onChange={e => updateScoringLevel(cr._key, i, 'points', Number(e.target.value))} className="w-16 h-7 text-xs" />
                          <Input value={sl.description} onChange={e => updateScoringLevel(cr._key, i, 'description', e.target.value)} placeholder="Descripción..." className="flex-1 h-7 text-xs" />
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeScoringLevel(cr._key, i)}><Trash2 className="h-3 w-3" /></Button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}

              {/* Rubric Preview */}
              {rubricCriteria.length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">Vista Previa de Rúbrica</h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs border border-border rounded">
                        <thead>
                          <tr className="bg-muted/30">
                            <th className="p-2 text-left font-medium">Criterio</th>
                            {rubricCriteria[0]?.scoring_levels.map((sl, i) => <th key={i} className="p-2 text-center font-medium">{sl.label} ({sl.points})</th>)}
                          </tr>
                        </thead>
                        <tbody>
                          {rubricCriteria.map(cr => (
                            <tr key={cr._key} className="border-t border-border/50">
                              <td className="p-2">
                                <div className="font-medium">{cr.name || 'Sin nombre'}</div>
                                <div className="text-muted-foreground">{cr.description}</div>
                              </td>
                              {cr.scoring_levels.map((sl, i) => <td key={i} className="p-2 text-center text-muted-foreground">{sl.description || '—'}</td>)}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Save actions */}
      <div className="flex items-center justify-end gap-3 pb-8">
        <Button variant="outline" onClick={() => router.push('/admin/challenges')}>Cancelar</Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          {isEdit ? 'Guardar Cambios' : 'Crear Reto'}
        </Button>
      </div>
    </div>
  );
}
