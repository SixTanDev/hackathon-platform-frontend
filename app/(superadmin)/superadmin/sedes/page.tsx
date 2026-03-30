'use client';

import { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-client';
import {
  listZones,
  listAllSedes,
  createSede,
  updateSede,
  deleteSede,
  listSedeMembers,
  resolveUser,
  impersonateUser,
  createSedeAdmin,
  type ZoneListItem,
  type CrossZoneSede,
  type SedeMember,
  type ResolvedUser,
  type CreateSedeAdminPayload,
} from '@/lib/api/superadmin-services';
import { apiClient } from '@/lib/api/client';
import type { SedeCreate, SedeUpdate, User, ZoneMembershipInfo, ContextTokenResponse } from '@/types/api';
import { useAuthStore } from '@/stores/auth-store';
import { useImpersonationStore } from '@/stores/impersonation-store';
import { getDashboardPathForRole } from '@/lib/auth-helpers';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import {
  Search, Plus, Pencil, Trash2, Loader2, Building2, Globe, AlertTriangle,
  MoreHorizontal, UserCog, Check, UserPlus, Users, Eye,
} from 'lucide-react';

// ─── Slug helper ────────────────────────────────────────────────────────────

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

// ─── Create / Edit Dialog ───────────────────────────────────────────────────

interface SedeFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingSede?: CrossZoneSede | null;
  onSubmit: (data: SedeCreate | SedeUpdate, id?: string) => void;
  isPending: boolean;
}

function SedeFormDialog({ open, onOpenChange, editingSede, onSubmit, isPending }: SedeFormDialogProps) {
  const isEditing = !!editingSede;
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [city, setCity] = useState('');
  const [autoSlug, setAutoSlug] = useState(true);

  useEffect(() => {
    if (open) {
      setName(editingSede?.name ?? '');
      setSlug(editingSede?.slug ?? '');
      setDescription('');
      setCity(editingSede?.city ?? '');
      setAutoSlug(!editingSede);
    }
  }, [open, editingSede]);

  function handleNameChange(v: string) {
    setName(v);
    if (autoSlug) setSlug(slugify(v));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { toast.error('El nombre es requerido'); return; }
    if (!isEditing && !slug.trim()) { toast.error('El slug es requerido'); return; }

    if (isEditing) {
      onSubmit({ name: name.trim(), description: description.trim() || undefined, city: city.trim() || undefined } as SedeUpdate, editingSede!.id);
    } else {
      onSubmit({ name: name.trim(), slug: slug.trim(), description: description.trim() || null, city: city.trim() || null } as SedeCreate);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Sede' : 'Crear Sede'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="sede-name">Nombre *</Label>
            <Input id="sede-name" value={name} onChange={(e) => handleNameChange(e.target.value)} placeholder="Ej: Sede Bogotá" autoFocus />
          </div>
          {!isEditing && (
            <div className="space-y-2">
              <Label htmlFor="sede-slug">Slug *</Label>
              <Input id="sede-slug" value={slug} onChange={(e) => { setAutoSlug(false); setSlug(e.target.value); }} placeholder="sede-bogota" />
              <p className="text-xs text-muted-foreground">Identificador URL. Se genera automáticamente del nombre.</p>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="sede-city">Ciudad</Label>
            <Input id="sede-city" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Bogotá" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sede-desc">Descripción</Label>
            <Input id="sede-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descripción opcional" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isEditing ? 'Guardar cambios' : 'Crear sede'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Admin Picker Modal ──────────────────────────────────────────────────

interface AdminPickerProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  sede: CrossZoneSede | null;
  onImpersonate: (userId: string, userName: string, userEmail: string, sedeName: string) => void;
}

function AdminPickerDialog({ open, onOpenChange, sede, onImpersonate }: AdminPickerProps) {
  const [loading, setLoading] = useState(false);
  const [admins, setAdmins] = useState<(ResolvedUser & { memberRole: string })[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !sede) return;
    setLoading(true);
    setError(null);
    setAdmins([]);

    (async () => {
      try {
        const members = await listSedeMembers(sede.id);
        const adminMembers = members.filter((m) => m.role === 'admin' && m.is_active);

        if (adminMembers.length === 0) {
          setError('Esta sede no tiene administradores activos');
          setLoading(false);
          return;
        }

        // Resolve user details for each admin
        const resolved = await Promise.all(
          adminMembers.map(async (m) => {
            try {
              const user = await resolveUser(m.user_global_id);
              return { ...user, memberRole: m.role };
            } catch {
              return {
                id: m.user_global_id,
                email: 'desconocido',
                full_name: `Usuario ${m.user_global_id.slice(0, 8)}`,
                avatar_url: null,
                is_superadmin: false,
                is_active: true,
                memberRole: m.role,
              };
            }
          })
        );

        setAdmins(resolved);

        // If exactly one admin, auto-trigger impersonation
        if (resolved.length === 1) {
          const admin = resolved[0];
          onImpersonate(admin.id, admin.full_name, admin.email, sede.name);
          onOpenChange(false);
          return;
        }
      } catch (err: any) {
        setError(err?.detail ?? 'Error al obtener miembros de la sede');
      } finally {
        setLoading(false);
      }
    })();
  }, [open, sede]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCog className="h-5 w-5" />
            Impersonar administrador
          </DialogTitle>
          <DialogDescription>
            {sede ? `Selecciona un administrador de ${sede.name}` : 'Cargando...'}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8 gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Buscando administradores...</span>
          </div>
        ) : error ? (
          <div className="py-6 text-center">
            <AlertTriangle className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {admins.map((admin) => (
              <button
                key={admin.id}
                onClick={() => {
                  onImpersonate(admin.id, admin.full_name, admin.email, sede?.name ?? '');
                  onOpenChange(false);
                }}
                className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors text-left"
              >
                <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-medium">
                  {(admin.full_name ?? 'U').split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{admin.full_name}</p>
                  <p className="text-xs text-muted-foreground truncate">{admin.email}</p>
                </div>
                <Badge variant="outline" className="text-[10px]">admin</Badge>
              </button>
            ))}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Create Admin User Dialog ────────────────────────────────────────────

interface CreateAdminDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  sede: CrossZoneSede | null;
}

function CreateSedeAdminDialog({ open, onOpenChange, sede }: CreateAdminDialogProps) {
  const queryClient = useQueryClient();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    if (open) { setFullName(''); setEmail(''); setPassword(''); }
  }, [open]);

  const mutation = useMutation({
    mutationFn: (payload: CreateSedeAdminPayload) => createSedeAdmin(sede!.id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['superadmin', 'sedes'] });
      toast.success(`Administrador creado para ${sede?.name}`);
      onOpenChange(false);
    },
    onError: (err: any) => {
      const status = err?.response?.status ?? err?.status;
      if (status === 409) {
        toast.error('Ya existe un usuario con ese correo electrónico');
      } else {
        toast.error(typeof err?.detail === 'string' ? err.detail : 'Error al crear administrador');
      }
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!fullName.trim() || !email.trim() || !password.trim()) {
      toast.error('Todos los campos son requeridos');
      return;
    }
    if (password.length < 8) {
      toast.error('La contraseña debe tener al menos 8 caracteres');
      return;
    }
    mutation.mutate({ full_name: fullName.trim(), email: email.trim().toLowerCase(), password });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Crear administrador
          </DialogTitle>
          <DialogDescription>
            {sede ? `Crear usuario administrador para ${sede.name}` : 'Cargando...'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="admin-name">Nombre completo *</Label>
            <Input id="admin-name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Juan Pérez" autoFocus />
          </div>
          <div className="space-y-2">
            <Label htmlFor="admin-email">Correo electrónico *</Label>
            <Input id="admin-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@ejemplo.com" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="admin-password">Contraseña *</Label>
            <Input id="admin-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo 8 caracteres" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Crear administrador
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Members Dialog ──────────────────────────────────────────────────────

interface MembersDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  sede: CrossZoneSede | null;
}

function MembersDialog({ open, onOpenChange, sede }: MembersDialogProps) {
  const [loading, setLoading] = useState(false);
  const [members, setMembers] = useState<(ResolvedUser & { role: string })[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !sede) return;
    setLoading(true);
    setError(null);
    setMembers([]);

    (async () => {
      try {
        const rawMembers = await listSedeMembers(sede.id);
        if (rawMembers.length === 0) {
          setError('Esta sede no tiene miembros');
          setLoading(false);
          return;
        }

        const resolved = await Promise.all(
          rawMembers.filter((m) => m.is_active).map(async (m) => {
            try {
              const user = await resolveUser(m.user_global_id);
              return { ...user, role: m.role };
            } catch {
              return {
                id: m.user_global_id,
                email: 'desconocido',
                full_name: `Usuario ${m.user_global_id.slice(0, 8)}`,
                avatar_url: null,
                is_superadmin: false,
                is_active: true,
                role: m.role,
              };
            }
          })
        );
        setMembers(resolved);
      } catch (err: any) {
        setError(err?.detail ?? 'Error al obtener miembros');
      } finally {
        setLoading(false);
      }
    })();
  }, [open, sede]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Miembros de {sede?.name ?? '...'}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8 gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Cargando miembros...</span>
          </div>
        ) : error ? (
          <div className="py-6 text-center">
            <AlertTriangle className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
        ) : (
          <div className="space-y-1 max-h-80 overflow-y-auto">
            {members.map((m) => (
              <div key={m.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-medium">
                  {(m.full_name ?? 'U').split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{m.full_name}</p>
                  <p className="text-xs text-muted-foreground truncate">{m.email}</p>
                </div>
                <Badge variant="outline" className="text-[10px]">{m.role}</Badge>
              </div>
            ))}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cerrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function SedeManagementPage() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const authStore = useAuthStore();
  const { startImpersonation } = useImpersonationStore();
  const isSuperAdmin = authStore.user?.is_superadmin === true;
  const superadminSelectedZone = authStore.superadminSelectedZone;

  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingSede, setEditingSede] = useState<CrossZoneSede | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CrossZoneSede | null>(null);
  const [adminPickerSede, setAdminPickerSede] = useState<CrossZoneSede | null>(null);
  const [createAdminSede, setCreateAdminSede] = useState<CrossZoneSede | null>(null);
  const [membersSede, setMembersSede] = useState<CrossZoneSede | null>(null);
  const [impersonating, setImpersonating] = useState(false);

  const selectedZoneId = isSuperAdmin ? superadminSelectedZone?.id : undefined;
  const hasAccess = isSuperAdmin ? !!selectedZoneId : !!authStore.contextToken;

  // ─── Zone list (for the inline selector) ─────────────────────────

  const { data: zones = [], isLoading: zonesLoading } = useQuery({
    queryKey: queryKeys.superadmin.zones,
    queryFn: listZones,
    staleTime: 60_000,
    enabled: isSuperAdmin,
  });

  const activeZones = zones.filter((z: ZoneListItem) => z.is_active);

  function handleZoneChange(zoneId: string) {
    const zone = activeZones.find((z) => z.id === zoneId);
    if (zone) {
      authStore.setSuperadminZone({ id: zone.id, code: zone.code, name: zone.name });
      queryClient.invalidateQueries({ queryKey: ['superadmin', 'sedes'] });
    }
  }

  // ─── Sedes list ──────────────────────────────────────────────

  const { data, isLoading, isFetching } = useQuery({
    queryKey: queryKeys.superadmin.sedes({ zone_id: selectedZoneId, search: search || undefined }),
    queryFn: () => listAllSedes({
      zone_id: selectedZoneId,
      search: search || undefined,
      limit: 200,
    }),
    enabled: hasAccess,
  });

  // ─── CRUD mutations ─────────────────────────────────────────

  const createMutation = useMutation({
    mutationFn: (payload: SedeCreate) => createSede(payload),
    onSuccess: (newSede) => {
      queryClient.invalidateQueries({ queryKey: ['superadmin', 'sedes'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.superadmin.zones });
      toast.success(`Sede "${newSede.name}" creada exitosamente`);
      setFormOpen(false);
    },
    onError: (err: any) => toast.error(typeof err?.detail === 'string' ? err.detail : 'Error al crear la sede'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: SedeUpdate }) => updateSede(id, payload),
    onSuccess: (updatedSede) => {
      queryClient.invalidateQueries({ queryKey: ['superadmin', 'sedes'] });
      toast.success(`Sede "${updatedSede.name}" actualizada`);
      setEditingSede(null);
      setFormOpen(false);
    },
    onError: (err: any) => toast.error(typeof err?.detail === 'string' ? err.detail : 'Error al actualizar la sede'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteSede(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['superadmin', 'sedes'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.superadmin.zones });
      toast.success('Sede eliminada');
      setDeleteTarget(null);
    },
    onError: (err: any) => toast.error(typeof err?.detail === 'string' ? err.detail : 'Error al eliminar la sede'),
  });

  function handleFormSubmit(data: SedeCreate | SedeUpdate, id?: string) {
    if (id) updateMutation.mutate({ id, payload: data as SedeUpdate });
    else createMutation.mutate(data as SedeCreate);
  }

  // ─── Impersonation flow ──────────────────────────────────────

  async function handleImpersonate(userId: string, userName: string, userEmail: string, sedeName: string) {
    setImpersonating(true);
    try {
      // 1. Save original superadmin session
      const originalTokens = {
        accessToken: authStore.accessToken!,
        refreshToken: authStore.refreshToken!,
        contextToken: authStore.contextToken ?? null,
      };
      const originalUser = authStore.user ? {
        id: authStore.user.id,
        email: authStore.user.email,
        full_name: authStore.user.full_name,
        is_superadmin: authStore.user.is_superadmin,
      } : null;

      // 2. Call impersonation endpoint
      const impResult = await impersonateUser(userId);
      const impToken = impResult.access_token;

      // 3. Switch to impersonated token
      authStore.refreshSession(impToken, impResult.refresh_token ?? '');
      // Clear superadmin zone so we don't send it on impersonated requests
      authStore.setSuperadminZone(null);

      // 4. Fetch impersonated user's identity
      const { data: meData } = await apiClient.get('/auth/me', {
        headers: { Authorization: `Bearer ${impToken}` },
      });
      authStore.setUser(meData as User);

      // 5. Fetch impersonated user's memberships
      const { data: membershipsData } = await apiClient.get('/auth/my-memberships', {
        headers: { Authorization: `Bearer ${impToken}` },
      });
      const memberships: ZoneMembershipInfo[] = Array.isArray(membershipsData) ? membershipsData : [];
      authStore.setMemberships(memberships);

      if (memberships.length === 0) {
        // Impersonated user has no memberships — restore superadmin
        authStore.refreshSession(originalTokens.accessToken, originalTokens.refreshToken);
        authStore.setUser(originalUser as User);
        authStore.setSuperadminZone(superadminSelectedZone);
        toast.error('El usuario impersonado no tiene membresías. Sesión restaurada.');
        setImpersonating(false);
        return;
      }

      // 6. Find matching sede in the selected zone
      let targetZone: ZoneMembershipInfo | undefined;
      let targetSede: ZoneMembershipInfo['sedes'][0] | undefined;

      if (selectedZoneId) {
        targetZone = memberships.find((z) => z.zone_id === selectedZoneId);
        if (targetZone && targetZone.sedes.length > 0) {
          targetSede = targetZone.sedes[0]; // auto-select first sede in zone
        }
      }
      // Fallback: use first membership
      if (!targetZone || !targetSede) {
        targetZone = memberships[0];
        targetSede = targetZone.sedes[0];
      }

      // 7. Select context
      const { data: ctxData } = await apiClient.post<ContextTokenResponse>(
        '/auth/select-context',
        { zone_id: targetZone.zone_id, sede_id: targetSede.sede_id },
        { headers: { Authorization: `Bearer ${impToken}` } }
      );

      const role = ctxData?.role ?? targetSede.role ?? 'admin';

      authStore.selectContext({
        contextToken: ctxData.context_token ?? '',
        zone: { id: targetZone.zone_id, code: targetZone.zone_code, name: targetZone.zone_name },
        sede: { id: targetSede.sede_id, name: targetSede.sede_name, slug: targetSede.sede_slug },
        role,
      });

      // 8. Start impersonation tracking
      startImpersonation({
        impersonatedUser: {
          id: meData.id ?? userId,
          full_name: meData.full_name ?? userName,
          email: meData.email ?? userEmail,
          role,
          sede_name: targetSede.sede_name ?? sedeName,
        },
        originalTokens,
        originalSuperadminZone: superadminSelectedZone,
        originalUser,
      });

      queryClient.clear();
      toast.success(`Impersonando a ${meData.full_name ?? userName}`);
      router.replace(getDashboardPathForRole(role));
    } catch (err: any) {
      const msg = typeof err?.detail === 'string' ? err.detail
        : err?.response?.status === 404 ? 'Administrador no encontrado'
        : 'Error al iniciar la impersonación';
      toast.error(msg);
    } finally {
      setImpersonating(false);
    }
  }

  const sedes = data?.items ?? [];
  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Gestión de Sedes"
        description="Gestiona las sedes de la zona seleccionada"
      />

      {/* Zone selector + Search + Create */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-3 flex-1">
          {/* Zone selector */}
          {isSuperAdmin && (
            <Select
              value={selectedZoneId ?? ''}
              onValueChange={handleZoneChange}
            >
              <SelectTrigger className="w-full sm:w-64">
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <SelectValue placeholder="Seleccionar zona..." />
                </div>
              </SelectTrigger>
              <SelectContent>
                {zonesLoading ? (
                  <div className="flex items-center gap-2 px-3 py-2">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <span className="text-xs">Cargando...</span>
                  </div>
                ) : activeZones.map((zone) => (
                  <SelectItem key={zone.id} value={zone.id}>
                    <span className="flex items-center gap-2">
                      {zone.name}
                      <span className="text-xs text-muted-foreground">
                        ({zone.sede_count ?? 0} sede{(zone.sede_count ?? 0) !== 1 ? 's' : ''})
                      </span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Search */}
          {hasAccess && (
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar sedes..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {isFetching && !isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          {hasAccess && (
            <Button onClick={() => { setEditingSede(null); setFormOpen(true); }} className="gap-2">
              <Plus className="h-4 w-4" />
              Crear sede
            </Button>
          )}
        </div>
      </div>

      {/* No zone selected */}
      {isSuperAdmin && !selectedZoneId && (
        <Card>
          <CardContent className="py-16 flex flex-col items-center gap-4 text-center">
            <Globe className="h-12 w-12 text-muted-foreground/40" />
            <div>
              <p className="text-lg font-medium">Selecciona una zona</p>
              <p className="text-sm text-muted-foreground mt-1">
                Usa el selector de arriba para elegir la zona cuyas sedes deseas gestionar.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sedes Table (only when zone is selected) */}
      {hasAccess && (
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-3">
                {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
              </div>
            ) : sedes.length === 0 ? (
              <div className="py-16 flex flex-col items-center gap-4 text-center">
                <Building2 className="h-12 w-12 text-muted-foreground/40" />
                <div>
                  <p className="text-lg font-medium">No hay sedes en esta zona</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Crea la primera sede usando el botón de arriba.
                  </p>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Sede</TableHead>
                      <TableHead>Ciudad</TableHead>
                      <TableHead className="text-center">Usuarios</TableHead>
                      <TableHead className="text-center">Hackathones</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sedes.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{s.name}</p>
                            <p className="text-xs text-muted-foreground">{s.slug}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{s.city ?? '—'}</TableCell>
                        <TableCell className="text-center">{s.users_total ?? 0}</TableCell>
                        <TableCell className="text-center">{s.hackathons_total ?? 0}</TableCell>
                        <TableCell>
                          <Badge variant={s.is_active ? 'default' : 'secondary'}>
                            {s.is_active ? 'Activa' : 'Inactiva'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => { setEditingSede(s); setFormOpen(true); }}>
                                <Pencil className="h-3.5 w-3.5 mr-2" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setMembersSede(s)}>
                                <Eye className="h-3.5 w-3.5 mr-2" />
                                Ver miembros
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setCreateAdminSede(s)}>
                                <UserPlus className="h-3.5 w-3.5 mr-2" />
                                Crear usuario admin
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => setAdminPickerSede(s)}
                                disabled={impersonating}
                              >
                                <UserCog className="h-3.5 w-3.5 mr-2" />
                                Impersonar administrador
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => setDeleteTarget(s)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="h-3.5 w-3.5 mr-2" />
                                Eliminar
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Impersonation loading overlay */}
      {impersonating && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm font-medium">Iniciando impersonación...</p>
          </div>
        </div>
      )}

      {/* Create / Edit Dialog */}
      <SedeFormDialog
        open={formOpen}
        onOpenChange={(v) => { setFormOpen(v); if (!v) setEditingSede(null); }}
        editingSede={editingSede}
        onSubmit={handleFormSubmit}
        isPending={isPending}
      />

      {/* Admin Picker Dialog */}
      <AdminPickerDialog
        open={!!adminPickerSede}
        onOpenChange={(v) => { if (!v) setAdminPickerSede(null); }}
        sede={adminPickerSede}
        onImpersonate={handleImpersonate}
      />

      {/* Create Admin Dialog */}
      <CreateSedeAdminDialog
        open={!!createAdminSede}
        onOpenChange={(v) => { if (!v) setCreateAdminSede(null); }}
        sede={createAdminSede}
      />

      {/* Members Dialog */}
      <MembersDialog
        open={!!membersSede}
        onOpenChange={(v) => { if (!v) setMembersSede(null); }}
        sede={membersSede}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Eliminar sede
            </AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de eliminar la sede <strong>{deleteTarget?.name}</strong>?
              Esta acción desactivará la sede y sus datos asociados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
