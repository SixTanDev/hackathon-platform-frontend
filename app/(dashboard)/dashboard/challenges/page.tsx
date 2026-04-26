'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-client';
import { listChallenges } from '@/lib/api/challenge-admin-services';
import type { ChallengeListParams } from '@/lib/api/challenge-admin-services';
import type { ChallengeDifficulty, ChallengeType } from '@/types/api';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EmptyState } from '@/components/shared/empty-state';
import { Search, Code2, FileText, Filter, BookOpen, ArrowRight, Clock, Sparkles, LayoutGrid, List as ListIcon } from 'lucide-react';
import Link from 'next/link';

const DIFFICULTY_LABELS: Record<ChallengeDifficulty, string> = {
  easy: 'Fácil', medium: 'Medio', hard: 'Difícil', expert: 'Experto',
};

const DIFFICULTY_COLORS: Record<ChallengeDifficulty, string> = {
  easy: 'bg-green-500/10 text-green-400 border-green-500/20',
  medium: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  hard: 'bg-red-500/10 text-red-400 border-red-500/20',
  expert: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
};

const TYPE_LABELS: Record<string, string> = {
  coding: 'Código',
  case_study: 'Caso de Estudio',
  essay: 'Ensayo',
  clinical_analysis: 'Clínico',
  legal_argument: 'Legal',
};

export default function StudentChallengesPage() {
  const [search, setSearch] = useState('');
  const [difficulty, setDifficulty] = useState<string>('all');
  const [type, setType] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const params = useMemo<ChallengeListParams>(() => {
    const p: ChallengeListParams = { 
      limit: 50,
      status: 'approved',
      is_public: true 
    };
    if (search) p.search = search;
    if (difficulty !== 'all') p.difficulty = difficulty as ChallengeDifficulty;
    if (type !== 'all') p.type = type as ChallengeType;
    return p;
  }, [search, difficulty, type]);

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.challenges.list(params as any),
    queryFn: () => listChallenges(params),
  });

  const challenges = useMemo(() => {
    const mockChallenge = {
      id: 'mock-python-1',
      title: 'Análisis de Tráfico de Red Real-time',
      difficulty: 'expert' as ChallengeDifficulty,
      type: 'coding' as ChallengeType,
      category: 'Ciberseguridad',
      points_base: 450,
      time_limit_seconds: 1200,
      description_markdown: 'Analiza archivos PCAP para detectar escaneos de puertos...',
    };

    const items = data?.items || [];
    // Ensure mockChallenge is always first for the demo
    return [mockChallenge, ...items.filter(i => i.id !== mockChallenge.id)];
  }, [data]);

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Biblioteca de Retos"
        description="Explora y practica con desafíos de diversos temas y niveles de dificultad."
      >
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setViewMode((current) => current === 'grid' ? 'list' : 'grid')}
          aria-label={viewMode === 'grid' ? 'Cambiar a vista de lista' : 'Cambiar a vista de cuadrícula'}
        >
          {viewMode === 'grid' ? <ListIcon className="h-4 w-4" /> : <LayoutGrid className="h-4 w-4" />}
        </Button>
      </PageHeader>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Buscar retos por título o categoría..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <Select value={difficulty} onValueChange={setDifficulty}>
            <SelectTrigger className="w-[140px]">
              <Filter className="h-3.5 w-3.5 mr-2 opacity-50" />
              <SelectValue placeholder="Dificultad" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {Object.entries(DIFFICULTY_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {Object.entries(TYPE_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className={`grid gap-4 ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}`}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-40 w-full rounded-xl" />
          ))}
        </div>
      ) : challenges.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No se encontraron retos"
          description="Intenta ajustar los filtros de búsqueda o vuelve más tarde."
        />
      ) : (
        <div className={`grid gap-4 ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}`}>
          {challenges.map((c) => (
            <Card key={c.id} className="border-border/50 hover:shadow-md transition-all hover:border-primary/20 group">
              <CardContent className={viewMode === 'grid' ? 'pt-6' : 'flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between'}>
                {viewMode === 'grid' ? (
                  <>
                    <div className="flex items-start justify-between mb-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                        {c.type === 'coding' ? <Code2 className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                      </div>
                      <div className="flex flex-col items-end gap-1.5">
                        {c.id === 'mock-python-1' && (
                          <Badge className="bg-fuchsia-500 hover:bg-fuchsia-600 text-white border-0 text-[10px] h-5 px-2 animate-pulse flex items-center gap-1">
                            <Sparkles className="w-2.5 h-2.5" /> NUEVO
                          </Badge>
                        )}
                        <Badge variant="outline" className={DIFFICULTY_COLORS[c.difficulty]}>
                          {DIFFICULTY_LABELS[c.difficulty]}
                        </Badge>
                      </div>
                    </div>

                    <h3 className="font-semibold text-lg line-clamp-1 group-hover:text-primary transition-colors">
                      {c.title}
                    </h3>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1 mb-4 h-10">
                      <span className="flex items-center gap-1 text-primary font-medium">
                        <Clock className="w-3 h-3" /> {(c as any).time_limit_seconds ? `${Math.floor((c as any).time_limit_seconds / 60)} min` : '5 min'}
                      </span>
                      <span>•</span>
                      <span className="truncate">{c.category || 'Sin categoría'}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="text-xs font-mono text-primary font-bold">
                        {c.points_base} PTS
                      </div>
                      <Link href={`/dashboard/challenges/${c.id}`}>
                        <Button size="sm" variant="ghost" className="gap-1.5 group/btn">
                          Ver Reto <ArrowRight className="w-3.5 h-3.5 group-hover/btn:translate-x-0.5 transition-transform" />
                        </Button>
                      </Link>
                    </div>
                  </>
                ) : (
                  <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                        {c.type === 'coding' ? <Code2 className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="truncate text-sm font-semibold group-hover:text-primary transition-colors">
                            {c.title}
                          </h3>
                          {c.id === 'mock-python-1' && (
                            <Badge className="bg-fuchsia-500 hover:bg-fuchsia-600 text-white border-0 text-[10px] h-5 px-2 flex items-center gap-1">
                              <Sparkles className="w-2.5 h-2.5" /> NUEVO
                            </Badge>
                          )}
                          <Badge variant="outline" className={`${DIFFICULTY_COLORS[c.difficulty]} h-5 px-2 text-[10px]`}>
                            {DIFFICULTY_LABELS[c.difficulty]}
                          </Badge>
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                          <span className="flex items-center gap-1 text-primary font-medium">
                            <Clock className="w-3 h-3" /> {(c as any).time_limit_seconds ? `${Math.floor((c as any).time_limit_seconds / 60)} min` : '5 min'}
                          </span>
                          <span>{TYPE_LABELS[c.type] ?? c.type}</span>
                          <span>{c.category || 'Sin categoría'}</span>
                          <span className="font-mono font-bold text-primary">{c.points_base} PTS</span>
                        </div>
                      </div>
                    </div>
                    <Link href={`/dashboard/challenges/${c.id}`} className="sm:shrink-0">
                      <Button size="sm" variant="ghost" className="h-8 w-full gap-1.5 px-0 text-sm group/btn sm:w-auto sm:px-3">
                        Ver reto <ArrowRight className="w-3.5 h-3.5 group-hover/btn:translate-x-0.5 transition-transform" />
                      </Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
