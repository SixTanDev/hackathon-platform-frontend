'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-client';
import apiClient from '@/lib/api/client';
import type { ChallengeListItem, ChallengeType, ChallengeDifficulty } from '@/types/api';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Search, Code2, FileText, BookOpen, Filter, X, ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react';

/* ── OpenAPI: GET /challenges ── */
interface PaginatedChallenges {
  items: ChallengeListItem[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

async function listChallengesOpenAPI(params: any) {
  const res = await apiClient.get<PaginatedChallenges>('/challenges', { params });
  return res.data;
}

const DIFFICULTY_LABELS: Record<ChallengeDifficulty, string> = {
  easy: 'Fácil', medium: 'Medio', hard: 'Difícil', expert: 'Experto',
};
const DIFFICULTY_COLORS: Record<ChallengeDifficulty, string> = {
  easy: 'bg-green-500/10 text-green-400 border-green-500/20',
  medium: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  hard: 'bg-red-500/10 text-red-400 border-red-500/20',
  expert: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
};
const TYPE_LABELS: Record<ChallengeType, string> = {
  coding: 'Coding', case_study: 'Caso de Estudio', essay: 'Ensayo',
  clinical_analysis: 'Análisis Clínico', legal_argument: 'Argumento Legal',
  design_proposal: 'Propuesta de Diseño', custom: 'Personalizado',
};

export default function TutorChallengesPage() {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const pageSize = 9;

  // OpenAPI: GET /challenges with exact query params
  const { data, isLoading, isError } = useQuery({
    queryKey: queryKeys.challenges.library({ page, pageSize, search, type: typeFilter, difficulty: difficultyFilter }),
    queryFn: () => listChallengesOpenAPI({
      page,
      page_size: pageSize,
      search: search || undefined,
      type: typeFilter === 'all' ? undefined : typeFilter,
      difficulty: difficultyFilter === 'all' ? undefined : difficultyFilter,
      status: 'approved' // Tutors see approved challenges for library
    }),
  });

  const challenges = data?.items ?? [];
  const totalPages = data?.pages ?? 1;

  const hasFilters = typeFilter !== 'all' || difficultyFilter !== 'all' || !!search;
  const clearFilters = () => { setTypeFilter('all'); setDifficultyFilter('all'); setSearch(''); setPage(1); };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Biblioteca de Retos" description="Consulta y filtra retos aprobados según la especificación OpenAPI" />

      <Card>
        <CardContent className="py-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar por título..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} className="pl-9" />
            </div>
            <Select value={typeFilter} onValueChange={v => { setTypeFilter(v); setPage(1); }}>
              <SelectTrigger className="w-[160px]"><Filter className="h-3.5 w-3.5 mr-1.5" /><SelectValue placeholder="Tipo" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los tipos</SelectItem>
                {Object.entries(TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={difficultyFilter} onValueChange={v => { setDifficultyFilter(v); setPage(1); }}>
              <SelectTrigger className="w-[150px]"><SelectValue placeholder="Dificultad" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {Object.entries(DIFFICULTY_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
            {hasFilters && <Button variant="ghost" size="sm" onClick={clearFilters}><X className="h-3.5 w-3.5 mr-1" /> Limpiar</Button>}
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}
        </div>
      ) : isError ? (
        <Card>
          <CardContent className="py-16 text-center text-destructive">
            <AlertCircle className="w-10 h-10 mx-auto opacity-50 mb-3" />
            <p>Error al cargar la biblioteca de retos. Intenta nuevamente.</p>
          </CardContent>
        </Card>
      ) : challenges.length === 0 ? (
        <Card><CardContent className="py-16 text-center text-muted-foreground"><BookOpen className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" /> No se encontraron retos</CardContent></Card>
      ) : (
        <>
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {challenges.map((c) => (
              <Card key={c.id} className="hover:border-primary/50 transition-colors group h-full">
                <CardContent className="p-5 flex flex-col h-full border border-transparent">
                  <div className="flex items-start justify-between mb-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      {c.type === 'coding' ? <Code2 className="h-4 w-4 text-primary" /> : <FileText className="h-4 w-4 text-primary" />}
                    </div>
                    <Badge variant="outline" className={DIFFICULTY_COLORS[c.difficulty]}>{DIFFICULTY_LABELS[c.difficulty]}</Badge>
                  </div>
                  <h3 className="font-semibold text-sm mb-1 group-hover:text-primary transition-colors truncate">{c.title}</h3>
                  {c.category && <span className="text-[10px] text-muted-foreground mb-3">{c.category}</span>}
                  <div className="mt-auto flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{TYPE_LABELS[c.type] ?? c.type}</span>
                    <span className="text-xs font-mono font-medium text-primary">{c.points_base} pts</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 mt-6">
              <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}><ChevronLeft className="h-4 w-4 mr-1" /> Anterior</Button>
              <span className="text-xs text-muted-foreground">Página {page} de {totalPages}</span>
              <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Siguiente <ChevronRight className="h-4 w-4 ml-1" /></Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
