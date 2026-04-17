'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-client';
import { useAuthStore } from '@/stores/auth-store';
import { getHackathons } from '@/lib/api/services';
import { getHackathonRegistrations } from '@/lib/api/hackathon-services';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import Link from 'next/link';
import { formatDistanceToNow, format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Search,
  Trophy,
  Users,
  Clock,
  Calendar,
  ChevronRight,
  Radio,
  Gamepad2,
  Zap,
  Eye,
  CheckCircle2,
  ArrowRight,
  User as UserIcon,
} from 'lucide-react';
import type { Hackathon, HackathonStatus, HackathonMode, HackathonScope } from '@/types/api';

// ─── Tab Config ───────────────────────────────────────────

interface TabConfig {
  value: string;
  label: string;
  statuses: HackathonStatus[];
  mode?: HackathonMode;
}

const TABS: TabConfig[] = [
  { value: 'active', label: 'Activos', statuses: ['active'] },
  { value: 'upcoming', label: 'Próximos', statuses: ['registration_open'] },
  { value: 'practice', label: 'Modo Práctica', statuses: ['active', 'registration_open'], mode: 'practice' },
  { value: 'finished', label: 'Finalizados', statuses: ['finished'] },
];

// ─── Scope Config ────────────────────────────────────────

const SCOPE_LABELS: Record<HackathonScope, { label: string; color: string }> = {
  internal: { label: 'Interno', color: 'bg-muted text-muted-foreground' },
  zonal: { label: 'Zonal', color: 'bg-blue-500/10 text-blue-500' },
  open: { label: 'Abierto', color: 'bg-purple-500/10 text-purple-500' },
};

const MODE_LABELS: Record<HackathonMode, { label: string; color: string; icon: React.ElementType }> = {
  live: { label: 'EN VIVO', color: 'bg-red-500/10 text-red-500', icon: Radio },
  practice: { label: 'PRÁCTICA', color: 'bg-green-500/10 text-green-500', icon: Gamepad2 },
};

const STATUS_LABELS: Record<HackathonStatus, { label: string; color: string }> = {
  draft: { label: 'Borrador', color: 'bg-muted text-muted-foreground' },
  registration_open: { label: 'Inscripciones Abiertas', color: 'bg-amber-500/10 text-amber-500' },
  active: { label: 'Activo', color: 'bg-green-500/10 text-green-500' },
  paused: { label: 'Pausado', color: 'bg-muted text-muted-foreground' },
  finished: { label: 'Finalizado', color: 'bg-muted text-muted-foreground' },
  archived: { label: 'Archivado', color: 'bg-muted text-muted-foreground' },
};

// ─── Hackathon Card ──────────────────────────────────────

function HackathonListCard({
  hackathon,
  isEnrolled,
}: {
  hackathon: Hackathon;
  isEnrolled: boolean;
}) {
  const scope = SCOPE_LABELS[hackathon.scope] ?? SCOPE_LABELS.internal;
  const mode = MODE_LABELS[hackathon.mode] ?? MODE_LABELS.live;
  const status = STATUS_LABELS[hackathon.status] ?? STATUS_LABELS.draft;
  const ModeIcon = mode.icon;

  const dateRange = useMemo(() => {
    if (hackathon.mode === 'practice') return 'Sin límite de tiempo';
    if (hackathon.starts_at && hackathon.ends_at) {
      return `${format(new Date(hackathon.starts_at), "d MMM", { locale: es })} — ${format(new Date(hackathon.ends_at), "d MMM yyyy", { locale: es })}`;
    }
    if (hackathon.starts_at) {
      return `Desde ${format(new Date(hackathon.starts_at), "d MMM yyyy", { locale: es })}`;
    }
    return 'Fechas por definir';
  }, [hackathon]);

  const teamInfo = hackathon.is_team_based
    ? `Equipos de ${hackathon.min_team_size ?? 2}-${hackathon.max_team_size}`
    : 'Individual';

  // Action button
  let actionButton: React.ReactNode = null;
  const s = hackathon.status;
  if (s === 'registration_open' && !isEnrolled) {
    actionButton = (
      <Link href={`/dashboard/hackathons/${hackathon.id}`}>
        <Button size="sm">Inscribirse <ArrowRight className="w-3 h-3 ml-1" /></Button>
      </Link>
    );
  } else if (s === 'registration_open' && isEnrolled) {
    actionButton = (
      <Button size="sm" variant="outline" disabled className="text-green-500">
        <CheckCircle2 className="w-3 h-3 mr-1" /> Inscrito
      </Button>
    );
  } else if (s === 'active' && isEnrolled) {
    actionButton = (
      <Link href={`/dashboard/hackathons/${hackathon.id}`}>
        <Button size="sm">Entrar <ArrowRight className="w-3 h-3 ml-1" /></Button>
      </Link>
    );
  } else if (s === 'active' && !isEnrolled) {
    actionButton = (
      <Link href={`/dashboard/hackathons/${hackathon.id}`}>
        <Button size="sm" variant="ghost" className="text-muted-foreground">
          <Eye className="w-3 h-3 mr-1" /> Solo espectador
        </Button>
      </Link>
    );
  } else if (s === 'finished') {
    actionButton = (
      <Link href={`/dashboard/hackathons/${hackathon.id}`}>
        <Button size="sm" variant="outline">Ver Resultados</Button>
      </Link>
    );
  } else if (hackathon.mode === 'practice') {
    actionButton = (
      <Link href={`/dashboard/hackathons/${hackathon.id}`}>
        <Button size="sm" variant="secondary">Practicar <ArrowRight className="w-3 h-3 ml-1" /></Button>
      </Link>
    );
  }

  return (
    <Card className="border-border/50 hover:shadow-lg transition-all hover:border-primary/20 group">
      <CardContent className="pt-5 pb-4 space-y-3">
        {/* Badges Row */}
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge className={`text-[10px] ${scope.color} border-0`}>{scope.label}</Badge>
          <Badge className={`text-[10px] ${mode.color} border-0 gap-1`}>
            {hackathon.mode === 'live' ? (
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500" />
              </span>
            ) : null}
            <ModeIcon className="w-3 h-3" />
            {mode.label}
          </Badge>
          <Badge className={`text-[10px] ${status.color} border-0`}>{status.label}</Badge>
        </div>

        {/* Title */}
        <h3 className="text-base font-semibold leading-tight group-hover:text-primary transition-colors line-clamp-2">
          {hackathon.name}
        </h3>

        {hackathon.description ? (
          <p className="text-xs text-muted-foreground line-clamp-2">{hackathon.description}</p>
        ) : null}

        {/* Meta Grid */}
        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3" /> {dateRange}
          </span>
          <span className="flex items-center gap-1">
            {hackathon.is_team_based ? <Users className="w-3 h-3" /> : <UserIcon className="w-3 h-3" />}
            {teamInfo}
          </span>
        </div>

        {/* Action */}
        <div className="pt-1 flex justify-end">
          {actionButton}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Loading Grid ───────────────────────────────────────

function LoadingGrid() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <Card key={i} className="border-border/50">
          <CardContent className="pt-5 pb-4 space-y-3">
            <div className="flex gap-2">
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-1/2" />
            <div className="flex justify-end">
              <Skeleton className="h-8 w-24" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ─── Page ───────────────────────────────────────────────

export default function HackathonsListPage() {
  const { enrolledHackathonIds, currentRole, user } = useAuthStore();
  const userId = user?.id;
  const [activeTab, setActiveTab] = useState('active');
  const [searchQuery, setSearchQuery] = useState('');
  const [scopeFilter, setScopeFilter] = useState<string>('all');

  const currentTab = TABS.find((t) => t.value === activeTab) ?? TABS[0];

  // Fetch all hackathons (we filter client-side for simplicity since the API may not support mode filter)
  const { data: hackathons, isLoading } = useQuery({
    queryKey: queryKeys.hackathons.list({ tab: activeTab }),
    queryFn: async () => {
      // Fetch for each status in the tab (backend currently ignores this, but we'll fetch anyway)
      const results = await Promise.all(
        currentTab.statuses.map((status) => getHackathons({ status, limit: 50 }))
      );
      let merged = results.flat();

      // Deduplicate
      const seen = new Set<string>();
      merged = merged.filter((h) => {
        if (seen.has(h.id)) return false;
        seen.add(h.id);
        return true;
      });

      // --- MANUAL FILTER: Backend ignores ?status, so filter results here ---
      merged = merged.filter((h) => currentTab.statuses.includes(h.status));

      // Filter by mode if tab specifies it (e.g. "Modo Práctica" tab)
      if (currentTab.mode) {
        merged = merged.filter((h) => h.mode === currentTab.mode);
      } else if (activeTab === 'upcoming') {
        // Exclude practice from the "Próximos" tab to keep it focused on major events
        merged = merged.filter((h) => h.mode !== 'practice');
      }
      // Note: 'active' and 'finished' tabs will now show both 'live' and 'practice' modes
      // if they match the status, which prevents empty screens when only practice is available.
      return merged;
    },
  });

  // Check user enrollments - fetch registrations for visible hackathons
  const hackathonIds = hackathons?.map((h) => h.id) ?? [];
  const { data: enrolledSet } = useQuery({
    queryKey: ['enrollments', hackathonIds.join(',')],
    queryFn: async () => {
      if (currentRole === 'student') {
        return new Set(enrolledHackathonIds);
      }

      const enrolled = new Set<string>();
      // Only check a reasonable number
      const toCheck = hackathonIds.slice(0, 20);
      await Promise.allSettled(
        toCheck.map(async (hid) => {
          try {
            const regs = await getHackathonRegistrations(hid);
            const myReg = regs?.find?.((r) => r.user_global_id === useAuthStore.getState().user?.id && r.status !== 'cancelled');
            if (myReg) enrolled.add(hid);
          } catch {
            // Ignore errors for individual checks
          }
        })
      );
      return enrolled;
    },
    enabled: hackathonIds.length > 0 && !!userId,
    staleTime: 60 * 1000,
  });

  // Client-side filtering
  const filtered = useMemo(() => {
    let list = hackathons ?? [];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (h) =>
          h.name?.toLowerCase()?.includes(q) ||
          h.description?.toLowerCase()?.includes(q)
      );
    }
    if (scopeFilter !== 'all') {
      list = list.filter((h) => h.scope === scopeFilter);
    }
    return list;
  }, [hackathons, searchQuery, scopeFilter]);

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Hackathones"
        description="Explora y participa en los hackathones disponibles."
      />

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-4 w-full max-w-lg">
          {TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value} className="text-xs sm:text-sm">
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar hackathones..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={scopeFilter} onValueChange={setScopeFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los tipos</SelectItem>
            <SelectItem value="internal">Interno</SelectItem>
            <SelectItem value="zonal">Zonal</SelectItem>
            <SelectItem value="open">Abierto</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Grid */}
      {isLoading ? (
        <LoadingGrid />
      ) : filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((h) => (
            <HackathonListCard
              key={h.id}
              hackathon={h}
              isEnrolled={enrolledSet?.has(h.id) ?? false}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Trophy}
          title="No se encontraron hackathones"
          description={
            searchQuery || scopeFilter !== 'all'
              ? 'Intenta ajustar los filtros de búsqueda.'
              : 'No hay hackathones disponibles en esta categoría por ahora.'
          }
        />
      )}
    </div>
  );
}
