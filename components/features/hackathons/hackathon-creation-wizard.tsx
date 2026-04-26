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
import { Card, CardContent } from '@/components/ui/card';
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
  Users,
  BookOpen,
  Brain,
  ClipboardList,
  Plus,
  X,
  Search,
  UserPlus,
} from 'lucide-react';
import type { HackathonCreate, HackathonScope, HackathonMode, ChallengePublic } from '@/types/api';
import { useAuthStore } from '@/stores/auth-store';

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

interface HackathonCreationWizardProps {
  redirectPath: string;
  title?: string;
  allowedScopes?: HackathonScope[];
  canLaunchImmediately?: boolean;
  canAssignMentors?: boolean;
  showDocumentCollections?: boolean;
}

export function HackathonCreationWizard({ 
  redirectPath, 
  title = "Crear Hackathon",
  allowedScopes = ['internal', 'zonal', 'open'],
  canLaunchImmediately = true,
  canAssignMentors = true,
  showDocumentCollections = true,
}: HackathonCreationWizardProps) {
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  // Step 1 state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [scope, setScope] = useState<HackathonScope>(allowedScopes[0] || 'internal');
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
  useMemo(() => {
    const t = setTimeout(() => setMentorDebounced(mentorSearch), 300);
    return () => clearTimeout(t);
  }, [mentorSearch]);
  const currentSedeId = useAuthStore((s) => s.currentSede?.id);
  const { data: mentorResults } = useQuery({
    queryKey: [...queryKeys.userSearch(mentorDebounced), currentSedeId],
    queryFn: () => searchSedeMembers(mentorDebounced, currentSedeId || undefined),
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

  const registrationDatesInvalid = useMemo(() => (
    !!regStartsAt && !!regEndsAt && new Date(regStartsAt) >= new Date(regEndsAt)
  ), [regStartsAt, regEndsAt]);

  const eventDatesInvalid = useMemo(() => (
    !!startsAt && !!endsAt && new Date(startsAt) >= new Date(endsAt)
  ), [startsAt, endsAt]);

  const registrationMustEndBeforeHackathonStarts = useMemo(() => (
    !!regEndsAt && !!startsAt && new Date(startsAt) <= new Date(regEndsAt)
  ), [regEndsAt, startsAt]);

  function canNext(): boolean {
    if (step === 1) {
      if (!name.trim().length) return false;
      if (registrationDatesInvalid) return false;
      if (mode === 'live' && registrationMustEndBeforeHackathonStarts) return false;
      if (mode === 'live' && eventDatesInvalid) return false;
      return true;
    }

    if (step === 3) return selectedChallenges.length > 0;
    return true;
  }

  // --- Submit ---
  async function handleSubmit(openRegistration: boolean) {
    if (submitting) return;
    setSubmitting(true);

    try {

      if (registrationDatesInvalid) {
        toast({
          title: 'Fechas de inscripción inválidas',
          description: 'La fecha de inicio de inscripciones debe ser anterior a la fecha de fin de inscripciones.',
          variant: 'destructive',
        });
        return;
      }

      if (eventDatesInvalid) {
        toast({
          title: 'Fechas del hackathon inválidas',
          description: 'La fecha de inicio del hackathon debe ser anterior a la fecha de finalización.',
          variant: 'destructive',
        });
        return;
      }

      if (mode === 'live' && registrationMustEndBeforeHackathonStarts) {
        toast({
          title: 'Cronograma inválido',
          description: 'La fecha de inicio del hackathon debe ser posterior a la fecha de fin de inscripciones.',
          variant: 'destructive',
        });
        return;
      }
      // API expects ISO-8601 strings (YYYY-MM-DDTHH:mm:ssZ).
      // datetime-local input provides YYYY-MM-DDTHH:mm.
      const formatIso = (val: string) => val ? `${val}:00Z` : null;

      const payload: HackathonCreate = {
        name: name.trim(),
        description: description || null,
        scope,
        mode,
        starts_at: formatIso(startsAt),
        ends_at: formatIso(endsAt),
        registration_starts_at: formatIso(regStartsAt),
        registration_ends_at: formatIso(regEndsAt),
        rules_text: rulesText || null,
        is_team_based: isTeamBased,
        allow_individual: allowIndividual,
        min_team_size: isTeamBased ? minTeamSize : null,
        max_team_size: isTeamBased ? maxTeamSize : 4,
        hint_penalty_percent: hintPenalty,
        config_json: {
          mentor_ai: {
            hint_penalty_percent: hintPenalty,
            document_collection_ids: selectedCollections,
          },
        },
      };

      console.log('Enviando payload:', payload);

      // 1. Service Creation
      const hackathon = await createHackathon(payload);
      const setupWarnings: string[] = [];

      // 2. Add challenges
      for (const sc of selectedChallenges) {
        try {
          await addChallengeToHackathon(hackathon.id, {
            challenge_id: sc.challenge.id,
            order_index: sc.order_index,
            points_override: sc.points_override,
          });
        } catch {
          setupWarnings.push(`No se pudo vincular el reto "${sc.challenge.title}".`);
        }
      }

      // 3. Add mentors
      for (const m of selectedMentors) {
        try {
          await addHackathonMentor(hackathon.id, {
            user_global_id: m.user.user_global_id || m.user.id,
            role_in_hackathon: m.role_in_hackathon,
          });
        } catch {
          setupWarnings.push(`No se pudo agregar a ${m.user.full_name} como parte del staff.`);
        }
      }

      // 4. Transition if requested
      if (openRegistration) {
        try {
          await transitionHackathon(hackathon.id, 'registration_open');
        } catch {
          setupWarnings.push('El hackathon se creó, pero no se pudo abrir la etapa de inscripciones.');
        }
      }

      // 5. Success Feedback
      if (setupWarnings.length > 0) {
        toast({
          title: 'Hackathon creado con observaciones',
          description: `"${hackathon.name}" se creó, pero hay ajustes pendientes: ${setupWarnings.join(' ')}`,
          variant: 'destructive', // Using destructive for visibility of warnings
        });
      } else {
        toast({
          title: openRegistration ? '¡Hackathon Lanzado!' : '¡Borrador Guardado!',
          description: `"${hackathon.name}" ha sido ${openRegistration ? 'publicado exitosamente' : 'guardado en tus borradores'}.`,
        });
      }

      // 6. Finalize
      queryClient.invalidateQueries({ queryKey: queryKeys.hackathons.all });
      router.push(redirectPath);
    } catch (err: any) {
      // Detailed logging for the Next.js error overlay
      const status = err?.status || 'API Error';
      const detail = err?.message || err?.detail || 'No detail available';
      
      console.error(`Status ${status}: ${detail}`, {
        config: err?.config,
        field_errors: err?.field_errors,
        full_error: err
      });

      const errorMessage = err?.message || err?.detail || 'Ocurrió un error inesperado al intentar crear el hackathon. Por favor intenta de nuevo.';

      toast({
        title: `Error (${err?.status || 'API'})`,
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{title}</h1>
          <p className="text-sm text-muted-foreground">Paso {step} de {STEPS.length}</p>
        </div>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-1 overflow-x-auto pb-2 scrollbar-none">
        {STEPS.map((s) => {
          if (s.id === 4 && !showDocumentCollections) return null;
          if (s.id === 5 && !canAssignMentors) return null;

          const Icon = s.icon;
          const active = s.id === step;
          const done = s.id < step;
          return (
            <button
              key={s.id}
              onClick={() => { if (s.id < step) setStep(s.id); }}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                active ? 'bg-primary text-primary-foreground shadow-md' : done ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted/50'
              } ${s.id <= step ? 'cursor-pointer' : 'cursor-default'}`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{s.label}</span>
            </button>
          );
        })}
      </div>

      {/* Step Content */}
      <Card className="border-border/50 shadow-lg shadow-black/5 dark:shadow-none">
        <CardContent className="pt-6">
          {step === 1 && (
            <div className="space-y-5 max-w-2xl">
              <div className="space-y-2">
                <Label className="text-zinc-500 uppercase text-[10px] font-bold tracking-widest">Nombre del hackathon *</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Hackathon de Ingeniería de Software 2026" maxLength={120} className="h-11 rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label className="text-zinc-500 uppercase text-[10px] font-bold tracking-widest">Descripción</Label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe el hackathon..." rows={4} className="rounded-xl resize-none" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-zinc-500 uppercase text-[10px] font-bold tracking-widest">Alcance</Label>
                  <Select value={scope} onValueChange={(v) => setScope(v as HackathonScope)}>
                    <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {allowedScopes.includes('internal') && <SelectItem value="internal">Interno (solo mi sede)</SelectItem>}
                      {allowedScopes.includes('zonal') && <SelectItem value="zonal">Zonal (mi zona)</SelectItem>}
                      {allowedScopes.includes('open') && <SelectItem value="open">Abierto (nacional)</SelectItem>}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-zinc-500 uppercase text-[10px] font-bold tracking-widest">Modo de Competencia</Label>
                  <Select value={mode} onValueChange={(v) => setMode(v as HackathonMode)}>
                    <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="live">En Vivo (Hackathon Real)</SelectItem>
                      <SelectItem value="practice">Práctica (Autogestionado)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-zinc-500 uppercase text-[10px] font-bold tracking-widest">Inicio inscripciones</Label>
                  <Input type="datetime-local" value={regStartsAt} onChange={(e) => setRegStartsAt(e.target.value)} className="h-11 rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label className="text-zinc-500 uppercase text-[10px] font-bold tracking-widest">Fin inscripciones</Label>
                  <Input type="datetime-local" value={regEndsAt} onChange={(e) => setRegEndsAt(e.target.value)} className="h-11 rounded-xl" />
                </div>
              </div>
              {registrationDatesInvalid && (
                <p className="text-xs font-medium text-destructive">
                  La fecha final no puede ser menor o igual a la fecha de inicio de inscripciones.
                </p>
              )}
              {mode === 'live' && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-1">
                    <div className="space-y-2">
                      <Label className="text-zinc-500 uppercase text-[10px] font-bold tracking-widest">Fecha Inicio</Label>
                      <Input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} className="h-11 rounded-xl" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-zinc-500 uppercase text-[10px] font-bold tracking-widest">Fecha Fin</Label>
                      <Input type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} className="h-11 rounded-xl" />
                    </div>
                  </div>
                  {eventDatesInvalid && (
                    <p className="text-xs font-medium text-destructive">
                      La fecha final no puede ser menor o igual a la fecha de inicio del hackathon.
                    </p>
                  )}
                  {registrationMustEndBeforeHackathonStarts && !eventDatesInvalid && (
                    <p className="text-xs font-medium text-destructive">
                      La fecha de inicio del hackathon debe ser posterior a la fecha de fin de inscripciones.
                    </p>
                  )}
                </>
              )}
              <div className="space-y-2">
                <Label className="text-zinc-500 uppercase text-[10px] font-bold tracking-widest">Reglas y Condiciones (markdown)</Label>
                <Textarea value={rulesText} onChange={(e) => setRulesText(e.target.value)} placeholder="Reglas del hackathon..." rows={3} className="rounded-xl resize-none font-mono text-xs" />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6 max-w-lg">
              <div className="flex items-center justify-between p-4 rounded-xl border border-border/50 bg-muted/20">
                <div>
                  <p className="text-sm font-bold">¿Hackathon por equipos?</p>
                  <p className="text-xs text-muted-foreground">Indica si los estudiantes deben formar equipos</p>
                </div>
                <Switch checked={isTeamBased} onCheckedChange={setIsTeamBased} />
              </div>
              {isTeamBased && (
                <div className="space-y-5 animate-in fade-in slide-in-from-top-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-zinc-500 uppercase text-[10px] font-bold tracking-widest">Integrantes mín.</Label>
                      <Input type="number" min={2} max={10} value={minTeamSize} onChange={(e) => setMinTeamSize(Number(e.target.value))} className="h-11 rounded-xl" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-zinc-500 uppercase text-[10px] font-bold tracking-widest">Integrantes máx.</Label>
                      <Input type="number" min={2} max={20} value={maxTeamSize} onChange={(e) => setMaxTeamSize(Number(e.target.value))} className="h-11 rounded-xl" />
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-4 rounded-xl border border-border/50 bg-muted/20">
                    <div>
                      <p className="text-sm font-bold">¿Permitir participación individual?</p>
                      <p className="text-xs text-muted-foreground">Opción para participar sin equipo</p>
                    </div>
                    <Switch checked={allowIndividual} onCheckedChange={setAllowIndividual} />
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-4">
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <Search className="w-4 h-4 text-primary" />
                  Biblioteca de Retos
                </h3>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input placeholder="Buscar reto..." value={challengeSearch} onChange={(e) => setChallengeSearch(e.target.value)} className="pl-9 h-11 rounded-xl" />
                  </div>
                  <Select value={challengeFilter.difficulty ?? ''} onValueChange={(v) => setChallengeFilter((p) => ({ ...p, difficulty: v === 'all' ? undefined : v as any }))}>
                    <SelectTrigger className="w-28 h-11 rounded-xl font-mono text-[10px]"><SelectValue placeholder="Nivel" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="easy">Fácil</SelectItem>
                      <SelectItem value="medium">Medio</SelectItem>
                      <SelectItem value="hard">Difícil</SelectItem>
                      <SelectItem value="expert">Experto</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <ScrollArea className="h-[420px] border border-border/50 rounded-2xl bg-muted/10 p-2">
                  {libraryLoading ? (
                    <div className="space-y-2 p-2">{[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}</div>
                  ) : library.length === 0 ? (
                    <div className="py-24 text-center text-xs text-muted-foreground font-mono italic">NO_CHALLENGES_MATCH</div>
                  ) : (
                    <div className="space-y-2 p-1">
                      {library.map((ch) => {
                        const isSelected = selectedIds.has(ch.id);
                        const diff = DIFFICULTY_LABELS[ch.difficulty] ?? { label: ch.difficulty, color: 'bg-muted text-muted-foreground' };
                        return (
                          <button
                            key={ch.id}
                            disabled={isSelected}
                            onClick={() => addChallenge(ch)}
                            className={`w-full text-left p-4 rounded-xl border transition-all ${
                              isSelected ? 'border-primary/30 bg-primary/5 opacity-40 grayscale-[0.5]' : 'border-border/50 bg-card hover:bg-muted/30 hover:border-primary/20 shadow-sm'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <p className="text-xs font-bold pr-2 truncate text-zinc-800 dark:text-zinc-200 uppercase tracking-tight">{ch.title}</p>
                              {!isSelected ? <Plus className="w-4 h-4 text-primary shrink-0" /> : <Check className="w-4 h-4 text-primary shrink-0" />}
                            </div>
                            <div className="flex items-center gap-3 mt-3">
                              <Badge className={`${diff.color} border-0 text-[9px] uppercase font-bold tracking-widest px-1.5`}>{diff.label}</Badge>
                              <span className="text-[9px] text-muted-foreground font-semibold uppercase">{TYPE_LABELS[ch.type] ?? ch.type}</span>
                              <div className="h-3 w-[1px] bg-border mx-1" />
                              <span className="text-[9px] font-bold text-primary font-mono">{ch.points_base} PTS</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </ScrollArea>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-bold flex items-center justify-between">
                  Secuencia del Evento
                  <Badge variant="secondary" className="font-mono text-[10px] tracking-widest">{selectedChallenges.length} RETOS</Badge>
                </h3>
                {selectedChallenges.length === 0 ? (
                  <div className="h-[420px] border-2 border-dashed border-border/50 rounded-2xl flex flex-col items-center justify-center text-muted-foreground space-y-4 bg-muted/5">
                    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                      <BookOpen className="w-6 h-6 opacity-30" />
                    </div>
                    <div className="text-center">
                      <p className="text-[11px] font-bold uppercase tracking-widest opacity-60">Biblioteca Vacía</p>
                      <p className="text-[10px] italic">Agrega retos de la biblioteca para comenzar</p>
                    </div>
                  </div>
                ) : (
                  <ScrollArea className="h-[420px] border border-border/50 rounded-2xl bg-background/50 p-2">
                    <div className="space-y-2 p-1">
                      {selectedChallenges.map((sc, idx) => {
                        const diff = DIFFICULTY_LABELS[sc.challenge.difficulty] ?? { label: sc.challenge.difficulty, color: '' };
                        return (
                          <div key={sc.challenge.id} className="flex items-center gap-3 p-4 rounded-xl border border-border/40 bg-card shadow-sm group hover:border-primary/20 transition-all">
                            <div className="flex flex-col gap-1">
                              <button onClick={() => moveChallenge(idx, -1)} disabled={idx === 0} className="text-muted-foreground hover:text-primary disabled:opacity-10 transition-colors">▲</button>
                              <button onClick={() => moveChallenge(idx, 1)} disabled={idx === selectedChallenges.length - 1} className="text-muted-foreground hover:text-primary disabled:opacity-10 transition-colors">▼</button>
                            </div>
                            <span className="text-[10px] font-black font-mono text-primary/40 w-4">{idx + 1}</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold truncate uppercase tracking-tighter">{sc.challenge.title}</p>
                              <div className="flex items-center gap-2 mt-2">
                                <Badge className={`${diff.color} border-0 text-[8px] font-bold italic`}>{diff.label}</Badge>
                                <div className="flex items-center gap-1.5 ml-auto">
                                  <Input
                                    type="number"
                                    placeholder={String(sc.challenge.points_base)}
                                    value={sc.points_override ?? ''}
                                    onChange={(e) => updatePointsOverride(idx, e.target.value ? Number(e.target.value) : null)}
                                    className="h-7 w-16 text-[10px] font-mono rounded-lg border-border/50 text-center pr-1"
                                  />
                                  <span className="text-[9px] font-bold text-zinc-400">PTS</span>
                                </div>
                              </div>
                            </div>
                            <Button variant="ghost" size="icon" className="h-9 w-9 hover:bg-destructive/10 hover:text-destructive group-hover:scale-105 transition-all" onClick={() => removeChallenge(sc.challenge.id)}>
                              <X className="w-4 h-4" />
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
            <div className="space-y-8 max-w-xl">
              <div className="space-y-4">
                <div className="flex items-center gap-3 text-primary p-1">
                  <Brain className="w-5 h-5" />
                  <span className="font-bold text-sm uppercase tracking-wide">Parámetros de Mentoría IA</span>
                </div>
                <div className="p-6 rounded-2xl border border-primary/20 bg-primary/5 space-y-4">
                  <div className="space-y-2">
                    <Label className="text-primary/70 uppercase text-[10px] font-bold tracking-widest">Penalización por Pista (%)</Label>
                    <div className="flex items-center gap-6">
                       <Input type="number" min={0} max={100} value={hintPenalty} onChange={(e) => setHintPenalty(Number(e.target.value))} className="h-12 text-lg font-mono w-24 rounded-xl border-primary/30" />
                       <div className="flex-1">
                         <p className="text-xs font-semibold text-primary/80">Costo de Inteligencia</p>
                         <p className="text-[10px] text-muted-foreground italic">Cada pista técnica reducirá la calificación base del reto en este porcentaje.</p>
                       </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3 text-primary p-1">
                  <BookOpen className="w-5 h-5" />
                  <span className="font-bold text-sm uppercase tracking-wide">Recursos de Consulta (RAG)</span>
                </div>
                <div className="p-1">
                  <p className="text-[11px] text-muted-foreground mb-4 font-medium italic">Selecciona los manuales de referencia que estarán disponibles para consulta técnica con el Mentor IA.</p>
                  {collections?.length ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {collections.map((col) => (
                        <label key={col.id} className={`flex items-center gap-4 p-4 rounded-2xl border transition-all cursor-pointer group shadow-sm ${
                           selectedCollections.includes(col.id) ? 'border-primary ring-2 ring-primary/10 bg-primary/5' : 'border-border/60 hover:bg-muted/50'
                        }`}>
                          <input
                            type="checkbox"
                            checked={selectedCollections.includes(col.id)}
                            onChange={(e) => {
                              if (e.target.checked) setSelectedCollections((p) => [...p, col.id]);
                              else setSelectedCollections((p) => p.filter((c) => c !== col.id));
                            }}
                            className="w-5 h-5 rounded-lg accent-primary border-muted-foreground/30 focus:ring-transparent"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-black uppercase tracking-tight text-zinc-800 dark:text-zinc-200 group-hover:text-primary transition-colors truncate">{col.name}</p>
                            <p className="text-[10px] font-mono text-muted-foreground">{col.document_count} DOCUMENTOS</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <div className="p-12 text-center border-2 border-dashed border-border/50 rounded-2xl opacity-40">
                      <p className="text-xs italic text-muted-foreground">Biblioteca de documentación no disponible</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-8 max-w-2xl">
              <div className="space-y-4">
                <div className="flex items-center gap-3 text-primary p-1">
                  <UserPlus className="w-5 h-5" />
                  <span className="font-bold text-sm uppercase tracking-wide">Equipo Técnico y Mentores</span>
                </div>
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                  <Input 
                    placeholder="Escribe el nombre o correo del personal de sede..." 
                    value={mentorSearch} 
                    onChange={(e) => setMentorSearch(e.target.value)} 
                    className="pl-12 h-14 rounded-2xl text-base shadow-sm ring-primary/5 focus:ring-primary/20"
                  />
                </div>
                {mentorDebounced.length >= 2 && mentorResults && (
                  <div className="border border-border/50 rounded-2xl overflow-hidden shadow-xl animate-in fade-in slide-in-from-top-4 bg-card z-50">
                    {(mentorResults as SedeUserResult[]).filter((u) => !selectedMentors.some((m) => m.user.id === u.id || m.user.user_global_id === u.user_global_id)).slice(0, 5).map((u) => (
                      <button key={u.id || u.user_global_id} onClick={() => addMentor(u)} className="w-full flex items-center justify-between px-6 py-4 hover:bg-primary/5 text-sm transition-all border-b last:border-0 border-border/20 group">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-xs font-black text-primary group-hover:bg-primary/20 transition-all">
                            {u.full_name.charAt(0)}
                          </div>
                          <div className="text-left">
                            <p className="font-black text-[13px] uppercase tracking-tight group-hover:text-primary transition-colors">{u.full_name}</p>
                            <p className="text-[11px] text-muted-foreground font-mono">{u.email}</p>
                          </div>
                        </div>
                        <div className="w-8 h-8 rounded-full border border-border flex items-center justify-center group-hover:border-primary group-hover:bg-primary group-hover:text-white transition-all">
                           <Plus className="w-4 h-4" />
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {selectedMentors.length > 0 && (
                <div className="space-y-4 pt-4 animate-in fade-in">
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">Staff Seleccionado ({selectedMentors.length})</p>
                  <div className="space-y-2">
                    {selectedMentors.map((m, idx) => (
                      <div key={idx} className="flex items-center justify-between p-4 border border-border/50 rounded-2xl bg-card/40 transition-all hover:bg-background hover:shadow-md hover:border-primary/20 group">
                        <div className="flex items-center gap-4 min-w-0">
                           <div className="h-6 w-6 rounded-md bg-muted flex items-center justify-center font-mono text-[10px] font-bold text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary">0{idx + 1}</div>
                           <div className="min-w-0">
                             <p className="text-xs font-black uppercase tracking-tight truncate leading-tight">{m.user.full_name}</p>
                             <p className="text-[10px] text-muted-foreground font-mono">{m.user.email}</p>
                           </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Select value={m.role_in_hackathon} onValueChange={(v) => updateMentorRole(idx, v as any)}>
                            <SelectTrigger className="w-32 h-9 rounded-xl text-[9px] font-black uppercase tracking-wider bg-background border-border/50"><SelectValue /></SelectTrigger>
                            <SelectContent className="rounded-xl border-border/60">
                              <SelectItem value="mentor" className="text-[10px] uppercase font-bold">Mentor</SelectItem>
                              <SelectItem value="judge" className="text-[10px] uppercase font-bold">Juez</SelectItem>
                              <SelectItem value="organizer" className="text-[10px] uppercase font-bold">Organizador</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-destructive/10 hover:text-destructive active:scale-95 transition-all" onClick={() => removeMentor(idx)}>
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 6 && (
            <div className="space-y-10 max-w-3xl animate-in zoom-in-95 duration-300">
              <div className="text-center space-y-2 border-b border-border/40 pb-8">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 text-emerald-500 text-[10px] font-black uppercase tracking-widest mb-2 border border-emerald-500/20">
                  <Check className="w-3 h-3" />
                  Listo para Publicación
                </div>
                <h3 className="text-3xl font-black tracking-tighter uppercase">{name}</h3>
                <p className="text-xs text-muted-foreground font-medium max-w-xl mx-auto italic">{description || 'Hackathon sin descripción detallada.'}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 px-2">
                <div className="space-y-6">
                   <div className="space-y-4">
                     <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">Configuración General</p>
                     <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-border/50">
                          <p className="text-[9px] font-bold text-muted-foreground uppercase mb-1">Alcance</p>
                          <p className="text-xs font-black uppercase tracking-tight">{scope}</p>
                        </div>
                        <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-border/50">
                          <p className="text-[9px] font-bold text-muted-foreground uppercase mb-1">Modo</p>
                          <p className="text-xs font-black uppercase tracking-tight">{mode === 'live' ? 'En Vivo' : 'Práctica'}</p>
                        </div>
                        <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-border/50 col-span-2">
                          <p className="text-[9px] font-bold text-muted-foreground uppercase mb-1">Inscripciones</p>
                          <p className="text-[10px] font-mono">{regStartsAt ? new Date(regStartsAt).toLocaleDateString() : 'INMEDIATO'} - {regEndsAt ? new Date(regEndsAt).toLocaleDateString() : 'N/A'}</p>
                        </div>
                     </div>
                   </div>
                </div>

                <div className="space-y-6">
                   <div className="space-y-4">
                     <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">Métricas del Evento</p>
                     <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-border/50">
                          <p className="text-[9px] font-bold text-muted-foreground uppercase mb-1">Equipos</p>
                          <p className="text-xs font-black">{isTeamBased ? `${minTeamSize}-${maxTeamSize}` : 'INDIVIDUAL'}</p>
                        </div>
                        <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-border/50">
                          <p className="text-[9px] font-bold text-muted-foreground uppercase mb-1">Puntos IA</p>
                          <p className="text-xs font-black text-destructive">-{hintPenalty}% PT</p>
                        </div>
                        <div className="p-4 rounded-2xl bg-primary/5 border border-primary/20 col-span-2 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                             <Trophy className="w-5 h-5 text-primary" />
                             <p className="text-xs font-black uppercase tracking-tight">Total de Retos</p>
                          </div>
                          <p className="text-xl font-black text-primary font-mono">{selectedChallenges.length}</p>
                        </div>
                     </div>
                   </div>
                </div>
              </div>

              {selectedChallenges.length > 0 && (
                <div className="space-y-5 px-2">
                  <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Hoja de Ruta del Hackathon</p>
                  <div className="grid grid-cols-1 gap-2.5">
                    {selectedChallenges.map((sc, idx) => (
                      <div key={sc.challenge.id} className="flex items-center gap-4 p-4 bg-muted/20 border border-border/40 rounded-2xl hover:bg-card transition-all">
                        <div className="w-8 h-8 rounded-full bg-background border flex items-center justify-center font-mono text-[10px] font-black text-primary shadow-sm">{idx + 1}</div>
                        <div className="flex-1 min-w-0">
                          <p className="font-black text-xs uppercase tracking-tight truncate mb-1">{sc.challenge.title}</p>
                          <Badge variant="secondary" className="text-[8px] uppercase tracking-widest bg-zinc-200 dark:bg-zinc-800 border-0">{sc.challenge.difficulty}</Badge>
                        </div>
                        <div className="text-right">
                           <p className="text-xs font-black text-primary leading-none uppercase">{sc.points_override ?? sc.challenge.points_base}</p>
                           <p className="text-[8px] font-bold text-muted-foreground tracking-tighter">PUNTOS</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>

        {/* Navigation Toolbar */}
        <div className="flex items-center justify-between p-6 border-t border-border/50 bg-muted/5 rounded-b-[inherit]">
          <Button variant="outline" size="lg" onClick={() => setStep((s) => Math.max(1, s - 1))} disabled={step === 1} className="rounded-2xl px-10 h-14 border-border/50 text-xs font-bold uppercase transition-all active:scale-95">
            <ArrowLeft className="w-4 h-4 mr-2" /> Regresar
          </Button>
          <div className="flex gap-4">
            {step < 6 ? (
              <Button size="lg" onClick={() => setStep((s) => Math.min(6, s + 1))} disabled={!canNext()} className="rounded-2xl px-12 h-14 bg-primary hover:shadow-xl shadow-primary/20 text-xs font-bold uppercase tracking-widest transition-all active:scale-95">
                Siguiente <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <>
                <Button variant="outline" size="lg" onClick={() => handleSubmit(false)} disabled={submitting} className="rounded-2xl px-8 h-14 border-border/50 text-[10px] font-bold uppercase text-muted-foreground hover:bg-muted transition-all active:scale-95">
                  {submitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  Solo Borrador
                </Button>
                {canLaunchImmediately && (
                  <Button size="lg" onClick={() => handleSubmit(true)} disabled={submitting} className="rounded-2xl px-14 h-14 bg-primary hover:shadow-2xl shadow-primary/30 text-xs font-bold uppercase tracking-widest transition-all active:scale-95">
                    {submitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                    Lanzar Evento
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
