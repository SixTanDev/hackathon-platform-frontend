'use client';

import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-client';
import apiClient from '@/lib/api/client';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Trophy, Search, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Hackathon } from '@/types/api';

/* ── OpenAPI: GET /hackathons ── */
interface PageHackathonRead {
  items: Hackathon[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

async function listHackathonsOpenAPI(params: { page: number; page_size: number; status?: string; search?: string }) {
  const res = await apiClient.get<PageHackathonRead>('/hackathons', { params });
  return res.data;
}

const STATUS_STYLES: Record<string, { label: string; className: string }> = {
  draft: { label: 'Borrador', className: 'bg-muted text-muted-foreground' },
  registration_open: { label: 'Inscripciones', className: 'bg-unad-gold/10 text-unad-gold' },
  active: { label: 'Activo', className: 'bg-emerald-500/10 text-emerald-500' },
  paused: { label: 'Pausado', className: 'bg-amber-500/10 text-amber-500' },
  finished: { label: 'Finalizado', className: 'bg-primary/10 text-primary' },
  archived: { label: 'Archivado', className: 'bg-muted/50 text-muted-foreground/60' },
};

const SCOPE_LABELS: Record<string, string> = { internal: 'Interno', zonal: 'Zonal', open: 'Abierto' };
const MODE_LABELS: Record<string, string> = { live: 'En Vivo', practice: 'Práctica' };

type TabValue = 'all' | 'active' | 'draft' | 'finished';

export default function TutorHackathonsPage() {
  const [tab, setTab] = useState<TabValue>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const statusFilter = useMemo(() => {
    if (tab === 'active') return 'active';
    if (tab === 'draft') return 'draft';
    if (tab === 'finished') return 'finished';
    return undefined;
  }, [tab]);

  // OpenAPI: GET /hackathons with exact query params
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.hackathons.list({ page, pageSize, status: statusFilter, search }),
    queryFn: () => listHackathonsOpenAPI({ page, page_size: pageSize, status: statusFilter, search }),
  });

  const hackathons = data?.items ?? [];
  const totalPages = data?.pages ?? 1;

  function formatDate(d: string | null) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Hackathones" description="Listado oficial de hackathones alineado con el backend" />

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <Tabs value={tab} onValueChange={(v) => { setTab(v as TabValue); setPage(1); }}>
          <TabsList>
            <TabsTrigger value="all">Todos</TabsTrigger>
            <TabsTrigger value="active">Activos</TabsTrigger>
            <TabsTrigger value="draft">Borradores</TabsTrigger>
            <TabsTrigger value="finished">Finalizados</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="pl-9" />
        </div>
      </div>

      <Card className="border-border/50">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
            </div>
          ) : hackathons.length === 0 ? (
            <div className="py-16 text-center">
              <Trophy className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground">No se encontraron hackathones</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground">
                      <th className="px-4 py-3 text-left font-medium">Título</th>
                      <th className="px-4 py-3 text-left font-medium">Alcance</th>
                      <th className="px-4 py-3 text-left font-medium">Modo</th>
                      <th className="px-4 py-3 text-left font-medium">Estado</th>
                      <th className="px-4 py-3 text-left font-medium flex items-center gap-1"><Calendar className="w-3 h-3" /> Fechas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {hackathons.map((h) => {
                      const st = STATUS_STYLES[h.status] ?? { label: h.status, className: 'bg-muted text-muted-foreground' };
                      return (
                        <tr key={h.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                          <td className="px-4 py-3 font-medium">{h.name}</td>
                          <td className="px-4 py-3"><Badge variant="outline" className="text-[10px]">{SCOPE_LABELS[h.scope] ?? h.scope}</Badge></td>
                          <td className="px-4 py-3 text-xs">{MODE_LABELS[h.mode] ?? h.mode}</td>
                          <td className="px-4 py-3"><Badge className={`${st.className} border-0 text-[10px]`}>{st.label}</Badge></td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(h.starts_at)} – {formatDate(h.ends_at)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="p-4 border-t border-border flex items-center justify-between">
                  <div className="text-xs text-muted-foreground">Página {page} de {totalPages}</div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}><ChevronLeft className="h-4 w-4" /></Button>
                    <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}><ChevronRight className="h-4 w-4" /></Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
