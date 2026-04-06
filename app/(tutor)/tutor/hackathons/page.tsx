'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Calendar, ChevronLeft, ChevronRight, Plus, Search, Trophy } from 'lucide-react';
import { queryKeys } from '@/lib/query-client';
import { listHackathons } from '@/lib/api/admin-hackathon-services';
import { getHackathons } from '@/lib/api/services';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import type { Hackathon, HackathonStatus } from '@/types/api';

type TabValue = 'all' | 'active' | 'draft' | 'finished';

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
  practice: 'Practica',
};

async function listTutorHackathons(params: {
  page: number;
  limit: number;
  status?: string;
  search?: string;
}) {
  const skip = (params.page - 1) * params.limit;
  
  // Directly use listHackathons as it's the unified endpoint.
  // The backend will filter based on the user's role and search terms.
  const result = await listHackathons({
    status: params.status,
    search: params.search,
    skip,
    limit: params.limit,
  });

  return result;
}

export default function TutorHackathonsPage() {
  const router = useRouter();
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

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.hackathons.list({ page, pageSize, status: statusFilter, search }),
    queryFn: () => listTutorHackathons({ page, limit: pageSize, status: statusFilter, search }),
  });

  const hackathons = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(Math.ceil(total / pageSize), 1);

  function formatDate(value: string | null) {
    if (!value) return '-';
    return new Date(value).toLocaleDateString('es-CO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  return (
    <div className="space-y-6 animate-fade-in p-2">
      <PageHeader
        title="Hackathones"
        description="Consulta el estado, alcance y fechas de los hackathones disponibles."
      >
        <Button onClick={() => router.push('/tutor/hackathons/create')} className="gap-2">
          <Plus className="h-4 w-4" />
          Nuevo Hackathon
        </Button>
      </PageHeader>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <Tabs
          value={tab}
          onValueChange={(value) => {
            setTab(value as TabValue);
            setPage(1);
          }}
        >
          <TabsList>
            <TabsTrigger value="all">Todos</TabsTrigger>
            <TabsTrigger value="active">Activos</TabsTrigger>
            <TabsTrigger value="draft">Borradores</TabsTrigger>
            <TabsTrigger value="finished">Finalizados</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar..."
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            className="pl-9"
          />
        </div>
      </div>

      <Card className="overflow-hidden border-border/50 shadow-sm">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-3 p-6">
              {[1, 2, 3, 4, 5].map((item) => (
                <Skeleton key={item} className="h-14 w-full" />
              ))}
            </div>
          ) : hackathons.length === 0 ? (
            <div className="py-24 text-center">
              <Trophy className="mx-auto mb-4 h-12 w-12 text-muted-foreground/20" />
              <p className="text-sm text-muted-foreground">No se encontraron hackathones disponibles</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30 text-muted-foreground">
                      <th className="px-5 py-4 text-left text-[10px] font-semibold uppercase tracking-wider">
                        Titulo
                      </th>
                      <th className="px-5 py-4 text-left text-[10px] font-semibold uppercase tracking-wider">
                        Alcance
                      </th>
                      <th className="px-5 py-4 text-left text-[10px] font-semibold uppercase tracking-wider">
                        Modo
                      </th>
                      <th className="px-5 py-4 text-left text-[10px] font-semibold uppercase tracking-wider">
                        Estado
                      </th>
                      <th className="flex items-center gap-1.5 px-5 py-4 text-left text-[10px] font-semibold uppercase tracking-wider">
                        <Calendar className="h-3.5 w-3.5" /> Fechas
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {hackathons.map((hackathon) => {
                      const status = STATUS_STYLES[hackathon.status] ?? {
                        label: hackathon.status,
                        className: 'bg-muted text-muted-foreground',
                      };

                      return (
                        <tr
                          key={hackathon.id}
                          className="group border-b border-border/50 transition-all hover:bg-muted/10"
                        >
                          <td className="px-5 py-4 font-bold text-zinc-800 transition-colors group-hover:text-primary dark:text-zinc-200">
                            {hackathon.name}
                          </td>
                          <td className="px-5 py-4">
                            <Badge
                              variant="outline"
                              className="border-border/50 text-[10px] font-mono uppercase tracking-tighter"
                            >
                              {SCOPE_LABELS[hackathon.scope] ?? hackathon.scope}
                            </Badge>
                          </td>
                          <td className="px-5 py-4 text-[11px] font-medium text-muted-foreground">
                            {MODE_LABELS[hackathon.mode] ?? hackathon.mode}
                          </td>
                          <td className="px-5 py-4">
                            <Badge
                              className={`${status.className} border-0 px-2 text-[10px] font-bold uppercase tracking-tight`}
                            >
                              {status.label}
                            </Badge>
                          </td>
                          <td className="px-5 py-4 font-mono text-[11px] text-muted-foreground">
                            {formatDate(hackathon.starts_at)} - {formatDate(hackathon.ends_at)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 ? (
                <div className="flex items-center justify-between border-t border-border bg-muted/10 p-4">
                  <div className="text-[10px] font-mono uppercase text-muted-foreground">
                    Pagina {page} de {totalPages}
                  </div>
                  <div className="flex gap-1.5">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setPage((current) => Math.max(1, current - 1))}
                      disabled={page === 1}
                      className="h-8 w-8 p-0"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                      disabled={page === totalPages}
                      className="h-8 w-8 p-0"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : null}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
