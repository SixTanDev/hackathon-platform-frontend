'use client';

import { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-client';
import { listChallenges, deleteChallenge, exportChallenges, importChallenges } from '@/lib/api/challenge-admin-services';
import type { ChallengeListParams } from '@/lib/api/challenge-admin-services';
import type { Challenge, ChallengeType, ChallengeDifficulty, ChallengeSource } from '@/types/api';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import Link from 'next/link';
import {
  Plus, Sparkles, Upload, Download, Trash2, Search, LayoutGrid, List as ListIcon,
  MoreHorizontal, Pencil, Eye, Copy, Code2, FileText, ChevronLeft, ChevronRight,
  Filter, X
} from 'lucide-react';

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
const SOURCE_CONFIG: Record<ChallengeSource, { label: string; class: string }> = {
  manual: { label: 'Manual', class: 'bg-gray-500/10 text-gray-400 border-gray-500/20' },
  ai_generated: { label: 'IA', class: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
  imported: { label: 'Importado', class: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
};
const STATUS_CONFIG: Record<string, { label: string; class: string }> = {
  draft: { label: 'Borrador', class: 'bg-gray-500/10 text-gray-400' },
  pending_approval: { label: 'En Revisión', class: 'bg-amber-500/10 text-amber-400' },
  approved: { label: 'Aprobado', class: 'bg-green-500/10 text-green-400' },
  rejected: { label: 'Rechazado', class: 'bg-red-500/10 text-red-400' },
};

const PAGE_SIZE = 20;

export default function ChallengeLibraryPage() {
  const qc = useQueryClient();
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [categorySearch, setCategorySearch] = useState('');
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; ids: string[] }>({ open: false, ids: [] });
  const [importDialog, setImportDialog] = useState(false);

  const params = useMemo<ChallengeListParams>(() => {
    const p: ChallengeListParams = { skip: page * PAGE_SIZE, limit: PAGE_SIZE };
    if (search) p.search = search;
    if (typeFilter !== 'all') p.type = typeFilter as ChallengeType;
    if (difficultyFilter !== 'all') p.difficulty = difficultyFilter as ChallengeDifficulty;
    if (sourceFilter !== 'all') p.source = sourceFilter as ChallengeSource;
    if (categorySearch) p.category = categorySearch;
    return p;
  }, [search, typeFilter, difficultyFilter, sourceFilter, categorySearch, page]);

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.challenges.list(params as Record<string, unknown>),
    queryFn: () => listChallenges(params),
  });

  const challenges = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const deleteMut = useMutation({
    mutationFn: async (ids: string[]) => { for (const id of ids) await deleteChallenge(id); },
    onSuccess: () => {
      toast.success('Reto(s) eliminado(s)');
      qc.invalidateQueries({ queryKey: queryKeys.challenges.all });
      setSelected(new Set());
    },
    onError: () => toast.error('Error al eliminar'),
  });

  const toggleSelect = useCallback((id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    if (selected.size === challenges.length) setSelected(new Set());
    else setSelected(new Set(challenges.map(c => c.id)));
  }, [challenges, selected.size]);

  const handleExport = async () => {
    const ids = Array.from(selected);
    if (!ids.length) { toast.error('Selecciona al menos un reto'); return; }
    try {
      const blob = await exportChallenges(ids);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'challenges_export.json'; a.click();
      URL.revokeObjectURL(url);
      toast.success('Exportación completada');
    } catch { toast.error('Error al exportar'); }
  };

  const handleImport = async (file: File) => {
    try {
      const result = await importChallenges(file);
      toast.success(`${result.imported} reto(s) importado(s)`);
      if (result.errors?.length) toast.warning(`${result.errors.length} errores`);
      qc.invalidateQueries({ queryKey: queryKeys.challenges.all });
      setImportDialog(false);
    } catch { toast.error('Error al importar'); }
  };

  const hasFilters = typeFilter !== 'all' || difficultyFilter !== 'all' || sourceFilter !== 'all' || !!categorySearch;
  const clearFilters = () => { setTypeFilter('all'); setDifficultyFilter('all'); setSourceFilter('all'); setCategorySearch(''); setPage(0); };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Biblioteca de Retos"
        description="Gestiona, crea y revisa los retos de la plataforma"
      />

      {/* Action bar */}
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/admin/challenges/create">
          <Button><Plus className="h-4 w-4 mr-2" />Crear Reto</Button>
        </Link>
        <Link href="/admin/challenges/generate">
          <Button variant="outline" className="border-purple-500/30 text-purple-400 hover:bg-purple-500/10">
            <Sparkles className="h-4 w-4 mr-2" />Generar con IA
          </Button>
        </Link>
        <Button variant="outline" onClick={() => setImportDialog(true)}>
          <Upload className="h-4 w-4 mr-2" />Importar
        </Button>
        <Link href="/admin/challenges/review">
          <Button variant="outline" className="border-amber-500/30 text-amber-400 hover:bg-amber-500/10">
            <Eye className="h-4 w-4 mr-2" />Cola de Revisión
          </Button>
        </Link>

        <div className="ml-auto flex items-center gap-2">
          {selected.size > 0 && (
            <>
              <span className="text-sm text-muted-foreground">{selected.size} seleccionado(s)</span>
              <Button variant="outline" size="sm" onClick={handleExport}>
                <Download className="h-4 w-4 mr-1" />Exportar
              </Button>
              <Button variant="destructive" size="sm" onClick={() => setDeleteDialog({ open: true, ids: Array.from(selected) })}>
                <Trash2 className="h-4 w-4 mr-1" />Eliminar
              </Button>
            </>
          )}
          <Button variant="ghost" size="icon" onClick={() => setViewMode(viewMode === 'table' ? 'grid' : 'table')}>
            {viewMode === 'table' ? <LayoutGrid className="h-4 w-4" /> : <ListIcon className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar por título..." value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} className="pl-9" />
            </div>
            <Select value={typeFilter} onValueChange={v => { setTypeFilter(v); setPage(0); }}>
              <SelectTrigger className="w-[160px]"><Filter className="h-3.5 w-3.5 mr-1.5" /><SelectValue placeholder="Tipo" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los tipos</SelectItem>
                {Object.entries(TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={difficultyFilter} onValueChange={v => { setDifficultyFilter(v); setPage(0); }}>
              <SelectTrigger className="w-[150px]"><SelectValue placeholder="Dificultad" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {Object.entries(DIFFICULTY_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={sourceFilter} onValueChange={v => { setSourceFilter(v); setPage(0); }}>
              <SelectTrigger className="w-[140px]"><SelectValue placeholder="Fuente" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="manual">Manual</SelectItem>
                <SelectItem value="ai_generated">IA</SelectItem>
                <SelectItem value="imported">Importado</SelectItem>
              </SelectContent>
            </Select>
            <Input placeholder="Categoría..." value={categorySearch} onChange={e => { setCategorySearch(e.target.value); setPage(0); }} className="w-[160px]" />
            {hasFilters && <Button variant="ghost" size="sm" onClick={clearFilters}><X className="h-3.5 w-3.5 mr-1" />Limpiar</Button>}
          </div>
        </CardContent>
      </Card>

      {/* Content */}
      {isLoading ? (
        <div className="grid gap-4 grid-cols-1">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
        </div>
      ) : challenges.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">No se encontraron retos</CardContent></Card>
      ) : viewMode === 'table' ? (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="p-3 w-10"><Checkbox checked={selected.size === challenges.length && challenges.length > 0} onCheckedChange={toggleAll} /></th>
                  <th className="p-3 text-left font-medium">Título</th>
                  <th className="p-3 text-left font-medium">Tipo</th>
                  <th className="p-3 text-left font-medium">Dificultad</th>
                  <th className="p-3 text-left font-medium">Categoría</th>
                  <th className="p-3 text-right font-medium">Puntos</th>
                  <th className="p-3 text-left font-medium">Fuente</th>
                  <th className="p-3 text-left font-medium">Estado</th>
                  <th className="p-3 w-10" />
                </tr>
              </thead>
              <tbody>
                {challenges.map(c => <ChallengeRow key={c.id} challenge={c} isSelected={selected.has(c.id)} onToggle={() => toggleSelect(c.id)} onDelete={() => setDeleteDialog({ open: true, ids: [c.id] })} />)}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {challenges.map(c => <ChallengeCard key={c.id} challenge={c} isSelected={selected.has(c.id)} onToggle={() => toggleSelect(c.id)} onDelete={() => setDeleteDialog({ open: true, ids: [c.id] })} />)}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{total} reto(s) total</span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}><ChevronLeft className="h-4 w-4" /></Button>
            <span className="text-sm">Página {page + 1} de {totalPages}</span>
            <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>
      )}

      {/* Delete dialog */}
      <Dialog open={deleteDialog.open} onOpenChange={o => !o && setDeleteDialog({ open: false, ids: [] })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar reto(s)</DialogTitle>
            <DialogDescription>¿Estás seguro de eliminar {deleteDialog.ids.length} reto(s)? Esta acción no se puede deshacer.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog({ open: false, ids: [] })}>Cancelar</Button>
            <Button variant="destructive" disabled={deleteMut.isPending} onClick={() => { deleteMut.mutate(deleteDialog.ids); setDeleteDialog({ open: false, ids: [] }); }}>
              {deleteMut.isPending ? 'Eliminando...' : 'Eliminar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import dialog */}
      <Dialog open={importDialog} onOpenChange={setImportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Importar Retos</DialogTitle>
            <DialogDescription>Sube un archivo JSON o YAML con la definición de retos.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input type="file" accept=".json,.yaml,.yml" onChange={e => { const f = e.target.files?.[0]; if (f) handleImport(f); }} />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ChallengeRow({ challenge: c, isSelected, onToggle, onDelete }: { challenge: Challenge; isSelected: boolean; onToggle: () => void; onDelete: () => void }) {
  const src = SOURCE_CONFIG[c.source] ?? SOURCE_CONFIG.manual;
  const st = STATUS_CONFIG[c.status] ?? STATUS_CONFIG.draft;
  return (
    <tr className="border-b border-border/50 hover:bg-muted/30 transition-colors">
      <td className="p-3"><Checkbox checked={isSelected} onCheckedChange={onToggle} /></td>
      <td className="p-3">
        <Link href={`/admin/challenges/create?edit=${c.id}`} className="font-medium hover:text-primary transition-colors">{c.title}</Link>
      </td>
      <td className="p-3">
        <div className="flex items-center gap-1.5">
          {c.type === 'coding' ? <Code2 className="h-3.5 w-3.5 text-primary" /> : <FileText className="h-3.5 w-3.5 text-secondary" />}
          <span className="text-xs">{TYPE_LABELS[c.type] ?? c.type}</span>
        </div>
      </td>
      <td className="p-3"><Badge variant="outline" className={DIFFICULTY_COLORS[c.difficulty]}>{DIFFICULTY_LABELS[c.difficulty]}</Badge></td>
      <td className="p-3 text-muted-foreground text-xs">{c.category ?? '—'}</td>
      <td className="p-3 text-right font-mono text-xs">{c.points_base}</td>
      <td className="p-3"><Badge variant="outline" className={src.class}>{src.label}</Badge></td>
      <td className="p-3"><Badge variant="secondary" className={st.class}>{st.label}</Badge></td>
      <td className="p-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild><Link href={`/admin/challenges/create?edit=${c.id}`}><Pencil className="h-4 w-4 mr-2" />Editar</Link></DropdownMenuItem>
            <DropdownMenuItem asChild><Link href={`/admin/challenges/create?edit=${c.id}`}><Eye className="h-4 w-4 mr-2" />Ver Detalle</Link></DropdownMenuItem>
            <DropdownMenuItem><Copy className="h-4 w-4 mr-2" />Duplicar</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive" onClick={onDelete}><Trash2 className="h-4 w-4 mr-2" />Eliminar</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </td>
    </tr>
  );
}

function ChallengeCard({ challenge: c, isSelected, onToggle, onDelete }: { challenge: Challenge; isSelected: boolean; onToggle: () => void; onDelete: () => void }) {
  const src = SOURCE_CONFIG[c.source] ?? SOURCE_CONFIG.manual;
  const st = STATUS_CONFIG[c.status] ?? STATUS_CONFIG.draft;
  return (
    <Card className={`transition-all ${isSelected ? 'ring-2 ring-primary' : ''}`}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Checkbox checked={isSelected} onCheckedChange={onToggle} />
            {c.type === 'coding' ? <Code2 className="h-4 w-4 text-primary" /> : <FileText className="h-4 w-4 text-secondary" />}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild><Link href={`/admin/challenges/create?edit=${c.id}`}><Pencil className="h-4 w-4 mr-2" />Editar</Link></DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive" onClick={onDelete}><Trash2 className="h-4 w-4 mr-2" />Eliminar</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <Link href={`/admin/challenges/create?edit=${c.id}`} className="block">
          <h3 className="font-semibold text-sm hover:text-primary transition-colors">{c.title}</h3>
        </Link>
        <div className="flex flex-wrap gap-1.5">
          <Badge variant="outline" className={DIFFICULTY_COLORS[c.difficulty]}>{DIFFICULTY_LABELS[c.difficulty]}</Badge>
          <Badge variant="outline" className={src.class}>{src.label}</Badge>
          <Badge variant="secondary" className={st.class}>{st.label}</Badge>
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{TYPE_LABELS[c.type]}</span>
          <span className="font-mono">{c.points_base} pts</span>
        </div>
        {c.category && <span className="text-xs text-muted-foreground">{c.category}</span>}
      </CardContent>
    </Card>
  );
}
