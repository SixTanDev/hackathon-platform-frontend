'use client';

import { useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-client';
import {
  createHackathon,
  addChallengeToHackathon,
  addHackathonMentor,
  getChallengeLibrary,
  getDocumentCollections,
  transitionHackathon,
  type ChallengeLibraryParams,
} from '@/lib/api/admin-hackathon-services';
import { searchSedeMembers, type SedeUserResult } from '@/lib/api/hackathon-services';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
  Trophy,
  Settings,
  Users,
  BookOpen,
  Brain,
  ClipboardList,
  Plus,
  X,
  Search,
  GripVertical,
  UserPlus,
} from 'lucide-react';
import type { HackathonCreate, HackathonScope, HackathonMode, ChallengePublic } from '@/types/api';

interface SelectedChallenge {
  challenge: ChallengePublic;
  order_index: number;
  points_override: number | null;
}

interface SelectedMentor {
  user: SedeUserResult;
  role_in_hackathon: 'mentor' | 'judge' | 'organizer';
}

const STEPS = [
  { id: 1, label: 'Información Básica', icon: ClipboardList },
  { id: 2, label: 'Equipos', icon: Users },
  { id: 3, label: 'Retos', icon: BookOpen },
  { id: 4, label: 'IA y Reglas', icon: Brain },
  { id: 5, label: 'Mentores', icon: UserPlus },
  { id: 6, label: 'Revisión', icon: Check },
];

const DIFFICULTY_LABELS: Record<string, { label: string; color: string }> = {
  easy: { label: 'Fácil', color: 'bg-emerald-500/10 text-emerald-500' },
  medium: { label: 'Medio', color: 'bg-unad-gold/10 text-unad-gold' },
  hard: { label: 'Difícil', color: 'bg-unad-orange/10 text-unad-orange' },
  expert: { label: 'Experto', color: 'bg-red-500/10 text-red-500' },
};

const TYPE_LABELS: Record<string, string> = {
  coding: 'Código',
  case_study: 'Caso',
  essay: 'Ensayo',
  clinical_analysis: 'Clínico',
  legal_argument: 'Legal',
  design_proposal: 'Diseño',
  custom: 'Personalizado',
};

export default function CreateHackathonPage() {
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  // Step 1 state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [scope, setScope] = useState<HackathonScope>('internal');
  const [mode, setMode] = useState<HackathonMode>('live');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [regStartsAt, setRegStartsAt] = useState('');
  const [regEndsAt, setRegEndsAt] = useState('');
  const [rulesText, setRulesText] = useState('');

  // Step 2 state
  const [isTeamBased, setIsTeamBased] = useState(false);
  const [minTeamSize, setMinTeamSize] = useState(2);
  const [maxTeamSize, setMaxTeamSize] = useState(4);
  const [allowIndividual, setAllowIndividual] = useState(true);

  // Step 3 state
  const [selectedChallenges, setSelectedChallenges] = useState<SelectedChallenge[]>([]);
  const [challengeSearch, setChallengeSearch] = useState('');
  const [challengeFilter, setChallengeFilter] = useState<ChallengeLibraryParams>({});

  // Step 4 state
  const [hintPenalty, setHintPenalty] = useState(5);

  // Step 5 state
  const [selectedMentors, setSelectedMentors] = useState<SelectedMentor[]>([]);
  const [mentorSearch, setMentorSearch] = useState('');

  // Library query
  const libraryParams = useMemo(() => ({ ...challengeFilter, search: challengeSearch || undefined, limit: 50 }), [challengeFilter, challengeSearch]);
  const { data: libraryData, isLoading: libraryLoading } = useQuery({
    queryKey: queryKeys.challenges.library(libraryParams as Record<string, unknown>),
    queryFn: () => getChallengeLibrary(libraryParams),
    enabled: step === 3,
  });
  const library: ChallengePublic[] = libraryData ?? [];
  const selectedIds = new Set(selectedChallenges.map((sc) => sc.challenge.id));

  // Mentor search query
  const [mentorDebounced, setMentorDebounced] = useState('');
  const mentorTimer = useMemo(() => {
    const t = setTimeout(() => setMentorDebounced(mentorSearch), 300);
    return () => clearTimeout(t);
  }, [mentorSearch]);
  const { data: mentorResults } = useQuery({
    queryKey: queryKeys.userSearch(mentorDebounced),
    queryFn: () => searchSedeMembers(mentorDebounced),
    enabled: mentorDebounced.length >= 2 && step === 5,
  });

  // Document collections
  const { data: collections } = useQuery({
    queryKey: queryKeys.documents.collections,
    queryFn: getDocumentCollections,
    enabled: step === 4,
  });

  const [selectedCollections, setSelectedCollections] = useState<string[]>([]);

  // --- Helpers ---
  function addChallenge(ch: ChallengePublic) {
    if (selectedIds.has(ch.id)) return;
    setSelectedChallenges((prev) => [...prev, { challenge: ch, order_index: prev.length, points_override: null }]);
  }

  function removeChallenge(id: string) {
    setSelectedChallenges((prev) => prev.filter((sc) => sc.challenge.id !== id).map((sc, i) => ({ ...sc, order_index: i })));
  }

  function moveChallenge(idx: number, dir: -1 | 1) {
    setSelectedChallenges((prev) => {
      const arr = [...prev];
      const newIdx = idx + dir;
      if (newIdx < 0 || newIdx >= arr.length) return prev;
      [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
      return arr.map((sc, i) => ({ ...sc, order_index: i }));
    });
  }

  function updatePointsOverride(idx: number, pts: number | null) {
    setSelectedChallenges((prev) => prev.map((sc, i) => i === idx ? { ...sc, points_override: pts } : sc));
  }

  function addMentor(user: SedeUserResult) {
    if (selectedMentors.some((m) => m.user.user_global_id === user.user_global_id || m.user.id === user.id)) return;
    setSelectedMentors((prev) => [...prev, { user, role_in_hackathon: 'mentor' }]);
    setMentorSearch('');
  }

  function removeMentor(idx: number) {
    setSelectedMentors((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateMentorRole(idx: number, role: 'mentor' | 'judge' | 'organizer') {
    setSelectedMentors((prev) => prev.map((m, i) => i === idx ? { ...m, role_in_hackathon: role } : m));
  }

  // --- Validation ---
  function canNext(): boolean {
    if (step === 1) return name.trim().length > 0;
    if (step === 3) return selectedChallenges.length > 0;
    return true;
  }

  // --- Submit ---
  async function handleSubmit(openRegistration: boolean) {
    setSubmitting(true);
    try {
      const payload: HackathonCreate = {
        name: name.trim(),
        description: description || null,
        scope,
        mode,
        starts_at: startsAt || null,
        ends_at: endsAt || null,
        registration_starts_at: regStartsAt || null,
        registration_ends_at: regEndsAt || null,
        rules_text: rulesText || null,
        is_team_based: isTeamBased,
        allow_individual: allowIndividual,
        min_team_size: isTeamBased ? minTeamSize : null,
        max_team_size: isTeamBased ? maxTeamSize : 4,
        hint_penalty_percent: hintPenalty,
      };
      const hackathon = await createHackathon(payload);

      // Add challenges
      for (const sc of selectedChallenges) {
        try {
          await addChallengeToHackathon(hackathon.id, {
            challenge_id: sc.challenge.id,
            order_index: sc.order_index,
            points_override: sc.points_override,
          });
        } catch { /* continue */ }
      }

      // Add mentors
      for (const m of selectedMentors) {
        try {
          await addHackathonMentor(hackathon.id, {
            user_global_id: m.user.user_global_id || m.user.id,
            role_in_hackathon: m.role_in_hackathon,
          });
        } catch { /* continue */ }
      }

      // Transition if requested
      if (openRegistration) {
        try {
          await transitionHackathon(hackathon.id, 'registration_open');
        } catch { /* stays as draft */ }
      }

      toast({ title: '¡Hackathon creado!', description: `"${hackathon.name}" fue creado exitosamente.` });
      queryClient.invalidateQueries({ queryKey: queryKeys.hackathons.all });
      router.push('/admin/hackathons');
    } catch (err: any) {
      toast({ title: 'Error', description: err?.message ?? 'No se pudo crear el hackathon.', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  }

  // --- Render ---
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Crear Hackathon</h1>
          <p className="text-sm text-muted-foreground">Paso {step} de {STEPS.length}</p>
        </div>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-1">
        {STEPS.map((s) => {
          const Icon = s.icon;
          const active = s.id === step;
          const done = s.id < step;
          return (
            <button
              key={s.id}
              onClick={() => { if (s.id < step) setStep(s.id); }}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                active ? 'bg-primary text-primary-foreground' : done ? 'bg-primary/10 text-primary' : 'text-muted-foreground'
              } ${s.id <= step ? 'cursor-pointer' : 'cursor-default'}`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{s.label}</span>
            </button>
          );
        })}
      </div>

      {/* Step Content */}
      <Card className="border-border/50">
        <CardContent className="pt-6">
          {step === 1 && (
            <div className="space-y-5 max-w-2xl">
              <div className="space-y-2">
                <Label>Nombre del hackathon *</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Hackathon de Ingeniería 2026" maxLength={120} />
              </div>
              <div className="space-y-2">
                <Label>Descripción</Label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe el hackathon..." rows={4} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Alcance</Label>
                  <Select value={scope} onValueChange={(v) => setScope(v as HackathonScope)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="internal">Interno (solo esta sede)</SelectItem>
                      <SelectItem value="zonal">Zonal (varias sedes de la zona)</SelectItem>
                      <SelectItem value="open">Abierto (inter-zonas)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Modo</Label>
                  <Select value={mode} onValueChange={(v) => setMode(v as HackathonMode)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="live">En Vivo</SelectItem>
                      <SelectItem value="practice">Práctica</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {mode === 'live' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Inicio del evento</Label>
                    <Input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Fin del evento</Label>
                    <Input type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
                  </div>
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Inicio inscripciones</Label>
                  <Input type="datetime-local" value={regStartsAt} onChange={(e) => setRegStartsAt(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Fin inscripciones</Label>
                  <Input type="datetime-local" value={regEndsAt} onChange={(e) => setRegEndsAt(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Reglas (markdown)</Label>
                <Textarea value={rulesText} onChange={(e) => setRulesText(e.target.value)} placeholder="Reglas del hackathon..." rows={3} />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5 max-w-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">¿Hackathon por equipos?</p>
                  <p className="text-xs text-muted-foreground">Activa para permitir la formación de equipos</p>
                </div>
                <Switch checked={isTeamBased} onCheckedChange={setIsTeamBased} />
              </div>
              {isTeamBased && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Tamaño mínimo</Label>
                      <Input type="number" min={2} max={10} value={minTeamSize} onChange={(e) => setMinTeamSize(Number(e.target.value))} />
                    </div>
                    <div className="space-y-2">
                      <Label>Tamaño máximo</Label>
                      <Input type="number" min={2} max={20} value={maxTeamSize} onChange={(e) => setMaxTeamSize(Number(e.target.value))} />
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">¿Permitir participantes individuales?</p>
                      <p className="text-xs text-muted-foreground">Los estudiantes pueden participar sin equipo</p>
                    </div>
                    <Switch checked={allowIndividual} onCheckedChange={setAllowIndividual} />
                  </div>
                </>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Library */}
              <div>
                <h3 className="text-sm font-semibold mb-3">Biblioteca de Retos</h3>
                <div className="flex gap-2 mb-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input placeholder="Buscar reto..." value={challengeSearch} onChange={(e) => setChallengeSearch(e.target.value)} className="pl-9" />
                  </div>
                  <Select value={challengeFilter.difficulty ?? ''} onValueChange={(v) => setChallengeFilter((p) => ({ ...p, difficulty: v || undefined }))}>
                    <SelectTrigger className="w-28"><SelectValue placeholder="Nivel" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Todos</SelectItem>
                      <SelectItem value="easy">Fácil</SelectItem>
                      <SelectItem value="medium">Medio</SelectItem>
                      <SelectItem value="hard">Difícil</SelectItem>
                      <SelectItem value="expert">Experto</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <ScrollArea className="h-[400px] border border-border/50 rounded-lg">
                  {libraryLoading ? (
                    <div className="p-3 space-y-2">{[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-16" />)}</div>
                  ) : library.length === 0 ? (
                    <div className="py-12 text-center text-sm text-muted-foreground">No se encontraron retos</div>
                  ) : (
                    <div className="p-2 space-y-1">
                      {library.map((ch) => {
                        const isSelected = selectedIds.has(ch.id);
                        const diff = DIFFICULTY_LABELS[ch.difficulty] ?? { label: ch.difficulty, color: 'bg-muted text-muted-foreground' };
                        return (
                          <button
                            key={ch.id}
                            disabled={isSelected}
                            onClick={() => addChallenge(ch)}
                            className={`w-full text-left p-3 rounded-lg border transition-colors ${
                              isSelected ? 'border-primary/30 bg-primary/5 opacity-60' : 'border-border/50 hover:bg-muted/30'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-medium truncate pr-2">{ch.title}</p>
                              {!isSelected && <Plus className="w-4 h-4 text-primary flex-shrink-0" />}
                              {isSelected && <Check className="w-4 h-4 text-primary flex-shrink-0" />}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge className={`${diff.color} border-0 text-[10px]`}>{diff.label}</Badge>
                              <span className="text-[10px] text-muted-foreground">{TYPE_LABELS[ch.type] ?? ch.type}</span>
                              <span className="text-[10px] text-muted-foreground">{ch.points_base} pts</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </ScrollArea>
              </div>

              {/* Selected */}
              <div>
                <h3 className="text-sm font-semibold mb-3">Retos Seleccionados ({selectedChallenges.length})</h3>
                {selectedChallenges.length === 0 ? (
                  <div className="h-[400px] border border-dashed border-border/50 rounded-lg flex items-center justify-center">
                    <p className="text-sm text-muted-foreground text-center">Agrega retos desde la biblioteca</p>
                  </div>
                ) : (
                  <ScrollArea className="h-[400px] border border-border/50 rounded-lg">
                    <div className="p-2 space-y-1">
                      {selectedChallenges.map((sc, idx) => {
                        const diff = DIFFICULTY_LABELS[sc.challenge.difficulty] ?? { label: sc.challenge.difficulty, color: '' };
                        return (
                          <div key={sc.challenge.id} className="flex items-center gap-2 p-3 rounded-lg border border-border/50 bg-card">
                            <div className="flex flex-col gap-0.5">
                              <button onClick={() => moveChallenge(idx, -1)} disabled={idx === 0} className="text-muted-foreground hover:text-foreground disabled:opacity-30 text-xs">▲</button>
                              <button onClick={() => moveChallenge(idx, 1)} disabled={idx === selectedChallenges.length - 1} className="text-muted-foreground hover:text-foreground disabled:opacity-30 text-xs">▼</button>
                            </div>
                            <span className="text-xs text-muted-foreground w-5">{idx + 1}</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{sc.challenge.title}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <Badge className={`${diff.color} border-0 text-[10px]`}>{diff.label}</Badge>
                                <Input
                                  type="number"
                                  placeholder={String(sc.challenge.points_base)}
                                  value={sc.points_override ?? ''}
                                  onChange={(e) => updatePointsOverride(idx, e.target.value ? Number(e.target.value) : null)}
                                  className="h-6 w-16 text-xs"
                                />
                                <span className="text-[10px] text-muted-foreground">pts</span>
                              </div>
                            </div>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeChallenge(sc.challenge.id)}>
                              <X className="w-3.5 h-3.5 text-destructive" />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                )}
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-5 max-w-lg">
              <div className="space-y-2">
                <Label>Penalización por pista (%)</Label>
                <Input type="number" min={0} max={100} value={hintPenalty} onChange={(e) => setHintPenalty(Number(e.target.value))} />
                <p className="text-xs text-muted-foreground">Cada pista utilizada reduce el puntaje del reto en este porcentaje.</p>
              </div>
              <Separator />
              <div className="space-y-2">
                <Label>Colecciones de documentos</Label>
                <p className="text-xs text-muted-foreground mb-2">Selecciona colecciones para que los estudiantes puedan consultar durante el hackathon.</p>
                {collections?.length ? (
                  <div className="space-y-1">
                    {collections.map((col) => (
                      <label key={col.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/30 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedCollections.includes(col.id)}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedCollections((p) => [...p, col.id]);
                            else setSelectedCollections((p) => p.filter((c) => c !== col.id));
                          }}
                          className="rounded"
                        />
                        <span className="text-sm">{col.name}</span>
                        <span className="text-[10px] text-muted-foreground">{col.document_count} docs</span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No hay colecciones disponibles.</p>
                )}
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-5 max-w-2xl">
              <div className="space-y-2">
                <Label>Buscar tutores para asignar como mentores</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input placeholder="Buscar por nombre o email..." value={mentorSearch} onChange={(e) => setMentorSearch(e.target.value)} className="pl-9" />
                </div>
                {mentorDebounced.length >= 2 && mentorResults && (
                  <div className="border border-border rounded-lg max-h-[160px] overflow-y-auto">
                    {(mentorResults as SedeUserResult[]).filter((u) => !selectedMentors.some((m) => m.user.id === u.id || m.user.user_global_id === u.user_global_id)).map((u) => (
                      <button key={u.id || u.user_global_id} onClick={() => addMentor(u)} className="w-full flex items-center justify-between px-3 py-2 hover:bg-muted/50 text-sm text-left">
                        <div>
                          <p className="font-medium">{u.full_name}</p>
                          <p className="text-xs text-muted-foreground">{u.email}</p>
                        </div>
                        <Plus className="w-4 h-4 text-primary" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {selectedMentors.length > 0 && (
                <div className="space-y-2">
                  <Label>Mentores asignados</Label>
                  {selectedMentors.map((m, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 border border-border/50 rounded-lg">
                      <div>
                        <p className="text-sm font-medium">{m.user.full_name}</p>
                        <p className="text-xs text-muted-foreground">{m.user.email}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Select value={m.role_in_hackathon} onValueChange={(v) => updateMentorRole(idx, v as any)}>
                          <SelectTrigger className="w-28 h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="mentor">Mentor</SelectItem>
                            <SelectItem value="judge">Juez</SelectItem>
                            <SelectItem value="organizer">Organizador</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeMentor(idx)}>
                          <X className="w-3.5 h-3.5 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {step === 6 && (
            <div className="space-y-6 max-w-2xl">
              <h3 className="text-lg font-semibold">Revisión Final</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><p className="text-muted-foreground">Nombre</p><p className="font-medium">{name}</p></div>
                <div><p className="text-muted-foreground">Alcance</p><p className="font-medium capitalize">{scope}</p></div>
                <div><p className="text-muted-foreground">Modo</p><p className="font-medium">{mode === 'live' ? 'En Vivo' : 'Práctica'}</p></div>
                <div><p className="text-muted-foreground">Equipos</p><p className="font-medium">{isTeamBased ? `Sí (${minTeamSize}-${maxTeamSize})` : 'No'}</p></div>
                <div><p className="text-muted-foreground">Retos</p><p className="font-medium">{selectedChallenges.length}</p></div>
                <div><p className="text-muted-foreground">Mentores</p><p className="font-medium">{selectedMentors.length}</p></div>
                <div><p className="text-muted-foreground">Penalización pistas</p><p className="font-medium">{hintPenalty}%</p></div>
                {startsAt && <div><p className="text-muted-foreground">Inicio</p><p className="font-medium">{new Date(startsAt).toLocaleString('es-CO')}</p></div>}
                {endsAt && <div><p className="text-muted-foreground">Fin</p><p className="font-medium">{new Date(endsAt).toLocaleString('es-CO')}</p></div>}
              </div>
              {description && (
                <div><p className="text-muted-foreground text-sm">Descripción</p><p className="text-sm mt-1 whitespace-pre-wrap">{description}</p></div>
              )}
              {selectedChallenges.length > 0 && (
                <div>
                  <p className="text-muted-foreground text-sm mb-2">Retos seleccionados</p>
                  <div className="space-y-1">
                    {selectedChallenges.map((sc, idx) => (
                      <div key={sc.challenge.id} className="flex items-center gap-2 text-sm p-2 bg-muted/20 rounded">
                        <span className="text-muted-foreground w-5">{idx + 1}.</span>
                        <span className="font-medium">{sc.challenge.title}</span>
                        <span className="text-xs text-muted-foreground ml-auto">{sc.points_override ?? sc.challenge.points_base} pts</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={() => setStep((s) => Math.max(1, s - 1))} disabled={step === 1}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Anterior
        </Button>
        <div className="flex gap-2">
          {step < 6 ? (
            <Button onClick={() => setStep((s) => Math.min(6, s + 1))} disabled={!canNext()}>
              Siguiente <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => handleSubmit(false)} disabled={submitting}>
                {submitting && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
                Crear como Borrador
              </Button>
              <Button onClick={() => handleSubmit(true)} disabled={submitting}>
                {submitting && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
                Crear y Abrir Inscripciones
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
