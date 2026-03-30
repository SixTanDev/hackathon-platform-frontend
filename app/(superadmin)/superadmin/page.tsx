'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-client';
import {
  getPlatformOverview,
  getHealthDetailed,
  listZones,
  listAllResourceRequests,
  type PlatformOverview,
  type HealthDetailed,
  type ZoneListItem,
  type PlatformOverviewZone,
} from '@/lib/api/superadmin-services';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import {
  Globe, Building2, Users, Trophy, Database, Wifi, HardDrive,
  Cpu, Container, AlertCircle, CheckCircle, AlertTriangle,
  ArrowRight, Clock, Inbox, Server, Sparkles, Archive,
} from 'lucide-react';

function HealthIndicator({ status }: { status: string }) {
  if (status === 'healthy' || status === 'connected' || status === 'ok') {
    return <Badge className="bg-green-500/10 text-green-500 border-green-500/30"><CheckCircle className="h-3 w-3 mr-1" />Saludable</Badge>;
  }
  if (status === 'warning' || status === 'degraded') {
    return <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/30"><AlertTriangle className="h-3 w-3 mr-1" />Advertencia</Badge>;
  }
  return <Badge className="bg-red-500/10 text-red-500 border-red-500/30"><AlertCircle className="h-3 w-3 mr-1" />Crítico</Badge>;
}

function OverviewCard({
  label, value, icon: Icon, color, loading,
}: {
  label: string; value: string | number; icon: React.ElementType; color: string; loading?: boolean;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            {loading ? (
              <Skeleton className="h-8 w-20 mt-1" />
            ) : (
              <p className="text-2xl font-bold mt-1">{value}</p>
            )}
          </div>
          <div className={`p-3 rounded-xl ${color}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function SuperAdminDashboardPage() {
  const { data: overview, isLoading: loadingOverview } = useQuery({
    queryKey: queryKeys.superadmin.overview,
    queryFn: getPlatformOverview,
  });

  const { data: health, isLoading: loadingHealth } = useQuery({
    queryKey: queryKeys.superadmin.health,
    queryFn: getHealthDetailed,
    refetchInterval: 30000,
  });

  const { data: zones, isLoading: loadingZones } = useQuery({
    queryKey: queryKeys.superadmin.zones,
    queryFn: listZones,
  });

  const { data: resources } = useQuery({
    queryKey: queryKeys.superadmin.resourceRequests({ status: 'pending' }),
    queryFn: () => listAllResourceRequests({ status: 'pending', limit: 5 }),
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Panel SuperAdmin"
        description="Gestión global de la plataforma de hackathones UNAD"
      />

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <OverviewCard label="Zonas" value={overview?.total_zones ?? 0} icon={Globe} color="bg-primary/10 text-primary" loading={loadingOverview} />
        <OverviewCard label="Sedes" value={overview?.total_sedes ?? 0} icon={Building2} color="bg-secondary/10 text-secondary" loading={loadingOverview} />
        <OverviewCard label="Usuarios totales" value={overview?.total_users ?? 0} icon={Users} color="bg-unad-orange/10 text-unad-orange" loading={loadingOverview} />
        <OverviewCard label="Hackathones activos" value={overview?.active_hackathons ?? 0} icon={Trophy} color="bg-unad-gold/10 text-unad-gold" loading={loadingOverview} />
      </div>

      {/* Zone Quick Stats + Infrastructure Health */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Zone List */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-lg">Zonas</CardTitle>
            <Link href="/superadmin/zones">
              <Button variant="ghost" size="sm" className="text-xs">Ver todas <ArrowRight className="h-3 w-3 ml-1" /></Button>
            </Link>
          </CardHeader>
          <CardContent>
            {loadingZones ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
              </div>
            ) : !zones?.length ? (
              <p className="text-sm text-muted-foreground py-6 text-center">No hay zonas registradas</p>
            ) : (
              <div className="space-y-2">
                {(zones ?? []).slice(0, 6).map((z) => (
                  <Link key={z.id} href={`/superadmin/zones?detail=${z.id}`}>
                    <div className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors">
                      <div>
                        <p className="font-medium text-sm">{z.name}</p>
                        <p className="text-xs text-muted-foreground">{z.code}</p>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Building2 className="h-3 w-3" />{z.sede_count}</span>
                        <span className="flex items-center gap-1"><Users className="h-3 w-3" />{z.user_count}</span>
                        <span className="flex items-center gap-1"><Trophy className="h-3 w-3" />{z.hackathon_count}</span>
                        <Badge variant={z.is_active ? 'default' : 'secondary'} className="text-[10px]">
                          {z.is_active ? 'Activa' : 'Inactiva'}
                        </Badge>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Infrastructure Health */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Salud de Infraestructura</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {loadingHealth ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : !health ? (
              <p className="text-sm text-muted-foreground text-center py-4">Sin datos de salud</p>
            ) : (
              <>
                {/* Database */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Database className="h-4 w-4 text-primary" />
                    <div>
                      <p className="text-sm font-medium">Base de Datos</p>
                      <p className="text-xs text-muted-foreground">
                        {health.database?.connections_active ?? 0}/{health.database?.connections_max ?? 0} conexiones
                        {health.database?.latency_ms != null ? ` • ${health.database.latency_ms.toFixed(0)}ms` : ''}
                      </p>
                    </div>
                  </div>
                  <HealthIndicator status={health.database?.status ?? 'unknown'} />
                </div>

                {/* Redis */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Wifi className="h-4 w-4 text-secondary" />
                    <div>
                      <p className="text-sm font-medium">Redis</p>
                      <p className="text-xs text-muted-foreground">
                        {health.redis?.connected ? 'Conectado' : 'Desconectado'}{health.redis?.memory_used ? ` — ${health.redis.memory_used}` : ''}
                        {health.redis?.latency_ms != null ? ` • ${health.redis.latency_ms.toFixed(0)}ms` : ''}
                      </p>
                    </div>
                  </div>
                  <HealthIndicator status={health.redis?.status ?? 'unknown'} />
                </div>

                {/* MinIO */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <HardDrive className="h-4 w-4 text-unad-orange" />
                    <div>
                      <p className="text-sm font-medium">MinIO</p>
                      <p className="text-xs text-muted-foreground">
                        {health.minio?.storage_used ?? '—'} / {health.minio?.storage_available ?? '—'}
                        {health.minio?.latency_ms != null ? ` • ${health.minio.latency_ms.toFixed(0)}ms` : ''}
                      </p>
                    </div>
                  </div>
                  <HealthIndicator status={health.minio?.status ?? 'unknown'} />
                </div>

                {/* Celery */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Cpu className="h-4 w-4 text-unad-gold" />
                    <div>
                      <p className="text-sm font-medium">Celery</p>
                      <p className="text-xs text-muted-foreground">
                        Cola: {health.celery?.queue_depth ?? 0} • Workers: {health.celery?.active_workers ?? 0} • Fallidos: {health.celery?.failed_tasks ?? 0}
                      </p>
                    </div>
                  </div>
                  <HealthIndicator status={health.celery?.status ?? 'unknown'} />
                </div>

                {/* Code Execution */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Container className="h-4 w-4 text-purple-500" />
                    <div>
                      <p className="text-sm font-medium">Ejecución de Código</p>
                      <p className="text-xs text-muted-foreground">
                        {health.code_execution?.warm_containers ?? 0}/{health.code_execution?.max_containers ?? 0} contenedores
                      </p>
                    </div>
                  </div>
                  <HealthIndicator status={health.code_execution?.status ?? 'unknown'} />
                </div>

                {/* AI Models */}
                {health.ai_models?.status && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-blue-500" />
                      <div>
                        <p className="text-sm font-medium">Modelos IA</p>
                        {health.ai_models.detail && <p className="text-xs text-muted-foreground">{String(health.ai_models.detail)}</p>}
                      </div>
                    </div>
                    <HealthIndicator status={health.ai_models.status} />
                  </div>
                )}

                {/* Storage */}
                {health.storage?.status && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Archive className="h-4 w-4 text-teal-500" />
                      <div>
                        <p className="text-sm font-medium">Almacenamiento</p>
                        {health.storage.detail && <p className="text-xs text-muted-foreground">{String(health.storage.detail)}</p>}
                      </div>
                    </div>
                    <HealthIndicator status={health.storage.status} />
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Pending Items */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Resource Requests */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Inbox className="h-5 w-5 text-unad-orange" />
              Solicitudes Pendientes
            </CardTitle>
            <Link href="/superadmin/resources">
              <Button variant="ghost" size="sm" className="text-xs">Ver todas <ArrowRight className="h-3 w-3 ml-1" /></Button>
            </Link>
          </CardHeader>
          <CardContent>
            {!resources?.items?.length ? (
              <p className="text-sm text-muted-foreground text-center py-6">No hay solicitudes pendientes</p>
            ) : (
              <div className="space-y-2">
                {resources.items.slice(0, 5).map((r) => (
                  <div key={r.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                    <div>
                      <p className="text-sm font-medium">{r.event_name}</p>
                      <p className="text-xs text-muted-foreground">{r.sede_name} • {r.zone_name}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px]">
                        <Clock className="h-3 w-3 mr-1" />
                        {new Date(r.event_date).toLocaleDateString('es-CO', { month: 'short', day: 'numeric' })}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Acciones Rápidas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href="/superadmin/zones">
              <Button variant="outline" className="w-full justify-start gap-2">
                <Globe className="h-4 w-4 text-primary" />
                Gestionar Zonas
              </Button>
            </Link>
            <Link href="/superadmin/sedes">
              <Button variant="outline" className="w-full justify-start gap-2">
                <Building2 className="h-4 w-4 text-secondary" />
                Ver todas las Sedes
              </Button>
            </Link>
            <Link href="/superadmin/resources">
              <Button variant="outline" className="w-full justify-start gap-2">
                <Inbox className="h-4 w-4 text-unad-orange" />
                Aprobar Solicitudes de Recursos
              </Button>
            </Link>
            <Link href="/superadmin/audit">
              <Button variant="outline" className="w-full justify-start gap-2">
                <AlertCircle className="h-4 w-4 text-unad-gold" />
                Ver Logs de Auditoría
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
