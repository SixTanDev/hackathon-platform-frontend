'use client';

import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-client';
import { getAuditLog, listZones, type AuditLogEntry, type AuditLogParams } from '@/lib/api/superadmin-services';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover';
import {
  Search, Filter, ChevronLeft, ChevronRight, UserCog, Shield,
  Clock, AlertTriangle,
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const ACTION_TYPES = [
  'login', 'logout', 'create', 'update', 'delete', 'approve', 'reject',
  'impersonate_start', 'impersonate_end', 'grade', 'submit', 'register',
];

const ENTITY_TYPES = [
  'user', 'hackathon', 'challenge', 'submission', 'sede', 'zone',
  'team', 'resource_request', 'collection', 'document',
];

const PAGE_SIZE = 25;

export default function AuditLogPage() {
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [entityFilter, setEntityFilter] = useState('all');
  const [zoneFilter, setZoneFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(0);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const params: AuditLogParams = {
    search: search || undefined,
    action: actionFilter !== 'all' ? actionFilter : undefined,
    entity_type: entityFilter !== 'all' ? entityFilter : undefined,
    zone_id: zoneFilter !== 'all' ? zoneFilter : undefined,
    date_from: dateFrom || undefined,
    date_to: dateTo || undefined,
    skip: page * PAGE_SIZE,
    limit: PAGE_SIZE,
  };

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.superadmin.auditLog(params as unknown as Record<string, unknown>),
    queryFn: () => getAuditLog(params),
    placeholderData: (prev) => prev,
  });

  const { data: zones } = useQuery({
    queryKey: queryKeys.superadmin.zones,
    queryFn: listZones,
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const resetFilters = () => {
    setSearch('');
    setActionFilter('all');
    setEntityFilter('all');
    setZoneFilter('all');
    setDateFrom('');
    setDateTo('');
    setPage(0);
  };

  const hasActiveFilters = actionFilter !== 'all' || entityFilter !== 'all' || zoneFilter !== 'all' || dateFrom || dateTo;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Logs de Auditoría"
        description="Registro de todas las acciones en la plataforma"
      />

      {/* Search + Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por usuario, acción, entidad..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            className="pl-9"
          />
        </div>
        <Popover open={filtersOpen} onOpenChange={setFiltersOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Filter className="h-4 w-4" />
              Filtros
              {hasActiveFilters && (
                <Badge className="bg-primary text-primary-foreground h-5 w-5 p-0 flex items-center justify-center text-[10px]">
                  !
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 space-y-4" align="end">
            <div className="space-y-2">
              <Label className="text-xs font-medium">Tipo de acción</Label>
              <Select value={actionFilter} onValueChange={(v) => { setActionFilter(v); setPage(0); }}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las acciones</SelectItem>
                  {ACTION_TYPES.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium">Tipo de entidad</Label>
              <Select value={entityFilter} onValueChange={(v) => { setEntityFilter(v); setPage(0); }}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las entidades</SelectItem>
                  {ENTITY_TYPES.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium">Zona</Label>
              <Select value={zoneFilter} onValueChange={(v) => { setZoneFilter(v); setPage(0); }}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las zonas</SelectItem>
                  {(zones ?? []).map((z) => <SelectItem key={z.id} value={z.id}>{z.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs font-medium">Desde</Label>
                <Input type="date" className="h-8 text-xs" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(0); }} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium">Hasta</Label>
                <Input type="date" className="h-8 text-xs" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(0); }} />
              </div>
            </div>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" className="w-full text-xs" onClick={resetFilters}>
                Limpiar filtros
              </Button>
            )}
          </PopoverContent>
        </Popover>
      </div>

      {/* Audit Log Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-44">Fecha/Hora</TableHead>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Acción</TableHead>
                  <TableHead>Entidad</TableHead>
                  <TableHead>Sede</TableHead>
                  <TableHead>IP</TableHead>
                  <TableHead className="text-center w-20">Suplant.</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!items.length ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No se encontraron registros
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((entry) => (
                    <TableRow
                      key={entry.id}
                      className={entry.is_impersonation ? 'bg-amber-500/5 border-l-2 border-l-amber-500' : ''}
                    >
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {format(new Date(entry.timestamp), 'dd/MM/yy HH:mm:ss', { locale: es })}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm font-medium">{entry.user_name}</p>
                          <p className="text-xs text-muted-foreground">{entry.user_email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs font-mono">
                          {entry.action}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <span className="text-muted-foreground">{entry.entity_type}</span>
                          {entry.entity_id && (
                            <span className="text-xs text-muted-foreground/60 ml-1">#{entry.entity_id.slice(0, 8)}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {entry.sede_name ? (
                          <div className="text-xs">
                            <p>{entry.sede_name}</p>
                            {entry.zone_name && <p className="text-muted-foreground">{entry.zone_name}</p>}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <code className="text-xs text-muted-foreground">{entry.ip_address ?? '—'}</code>
                      </TableCell>
                      <TableCell className="text-center">
                        {entry.is_impersonation ? (
                          <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/30 text-[10px]">
                            <UserCog className="h-3 w-3 mr-0.5" />
                            Sí
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Mostrando {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} de {total}
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm">Página {page + 1} de {totalPages}</span>
            <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
