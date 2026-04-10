'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-client';
import { getHackathons } from '@/lib/api/services';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Trophy } from 'lucide-react';
import type { Hackathon } from '@/types/api';

const STATUS_STYLES: Record<string, { label: string; className: string }> = {
  draft: { label: 'Borrador', className: 'bg-muted text-muted-foreground' },
  registration_open: { label: 'Inscripciones', className: 'bg-unad-gold/10 text-unad-gold' },
  active: { label: 'Activo', className: 'bg-emerald-500/10 text-emerald-500' },
  paused: { label: 'Pausado', className: 'bg-amber-500/10 text-amber-500' },
  finished: { label: 'Finalizado', className: 'bg-primary/10 text-primary' },
  archived: { label: 'Archivado', className: 'bg-muted/50 text-muted-foreground/60' },
};

const SCOPE_LABELS: Record<string, string> = {
  internal: 'Interno',
  zonal: 'Zonal',
  open: 'Abierto',
};

const MODE_LABELS: Record<string, string> = {
  live: 'En Vivo',
  practice: 'Práctica',
};

type TabValue = 'all' | 'active' | 'finished';

export default function ResearchHackathonsPage() {
  const [tab, setTab] = useState<TabValue>('all');
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.hackathons.list({ scope: 'research' }),
    queryFn: () => getHackathons({ limit: 100 }),
  });

  const hackathons: Hackathon[] = useMemo(() => {
    return (data as any)?.items ?? (Array.isArray(data) ? data : []);
  }, [data]);

  const filtered = useMemo(() => {
    let list = hackathons;
    if (tab === 'active') list = list.filter((h) => h.status === 'active' || h.status === 'registration_open');
    else if (tab === 'finished') list = list.filter((h) => h.status === 'finished' || h.status === 'archived');
    
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((h) => h.name.toLowerCase().includes(q));
    }
    return list;
  }, [hackathons, tab, search]);

  function formatDate(d: string | null) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader 
        title="Hackathones" 
        description="Explora los hackathones disponibles para tus grupos de investigación" 
      />

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <Tabs value={tab} onValueChange={(v) => setTab(v as TabValue)}>
          <TabsList>
            <TabsTrigger value="all">Todos</TabsTrigger>
            <TabsTrigger value="active">Activos</TabsTrigger>
            <TabsTrigger value="finished">Finalizados</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Buscar hackathon..." 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
            className="pl-9" 
          />
        </div>
      </div>

      <Card className="border-border/50">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center">
              <Trophy className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground">No se encontraron hackathones</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="px-4 py-3 text-left">Título</th>
                    <th className="px-4 py-3 text-left">Alcance</th>
                    <th className="px-4 py-3 text-left">Modo</th>
                    <th className="px-4 py-3 text-left">Estado</th>
                    <th className="px-4 py-3 text-left">Fechas</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((h) => {
                    const st = STATUS_STYLES[h.status] ?? { label: h.status, className: 'bg-muted text-muted-foreground' };
                    return (
                      <tr key={h.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3 font-medium">
                          {h.name}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className="text-[10px]">{SCOPE_LABELS[h.scope] ?? h.scope}</Badge>
                        </td>
                        <td className="px-4 py-3 text-xs">
                          {MODE_LABELS[h.mode] ?? h.mode}
                        </td>
                        <td className="px-4 py-3">
                          <Badge className={`${st.className} border-0 text-[10px]`}>{st.label}</Badge>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {formatDate(h.starts_at)} – {formatDate(h.ends_at)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
