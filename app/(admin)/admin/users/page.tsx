'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listSedeUsers,
  createSedeUser,
  assignExistingUser,
  updateUserRole,
  deactivateUser,
  bulkImportUsers,
} from '@/lib/api/admin-services';
import type { AdminUser, AdminUserCreate, BulkImportResult } from '@/lib/api/admin-services';
import type { RoleName } from '@/types/api';
import { queryKeys } from '@/lib/query-client';
import { useAuthStore } from '@/stores/auth-store';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Search,
  Plus,
  Upload,
  MoreHorizontal,
  Loader2,
  ShieldCheck,
  UserX,
  Eye,
  FileUp,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

const ROLE_BADGE: Record<string, { label: string; color: string }> = {
  admin: { label: 'Admin', color: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
  tutor: { label: 'Tutor', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  director_semillero: { label: 'Director', color: 'bg-teal-500/10 text-teal-400 border-teal-500/20' },
  student: { label: 'Estudiante', color: 'bg-green-500/10 text-green-400 border-green-500/20' },
  guest: { label: 'Invitado', color: 'bg-gray-500/10 text-gray-400 border-gray-500/20' },
};

/** Roles assignable from the admin panel — admin is excluded */
const ASSIGNABLE_ROLES: { value: RoleName; label: string }[] = [
  { value: 'tutor', label: 'Tutor' },
  { value: 'director_semillero', label: 'Director Semillero' },
  { value: 'student', label: 'Estudiante' },
  { value: 'guest', label: 'Invitado' },
];

/** Roles shown in the filter dropdown (includes admin for visibility) */
const ALL_VISIBLE_ROLES: { value: string; label: string }[] = [
  { value: 'admin', label: 'Administrador' },
  ...ASSIGNABLE_ROLES,
];

export default function UserManagementPage() {
  const router = useRouter();
  const { toast } = useToast();
  const qc = useQueryClient();
  const sedeId = useAuthStore((s) => s?.currentSede?.id) ?? '';

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [page, setPage] = useState(0);
  const LIMIT = 20;

  const [showAdd, setShowAdd] = useState(false);
  const [addTab, setAddTab] = useState<'existing' | 'new'>('new');
  const [showImport, setShowImport] = useState(false);
  const [importResult, setImportResult] = useState<BulkImportResult | null>(null);

  // New user form
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<RoleName>('student');

  // Existing user form
  const [existEmail, setExistEmail] = useState('');
  const [existRole, setExistRole] = useState<RoleName>('student');

  // Edit role
  const [editTarget, setEditTarget] = useState<AdminUser | null>(null);
  const [editRole, setEditRole] = useState<RoleName>('student');

  // Deactivate
  const [deactivateTarget, setDeactivateTarget] = useState<AdminUser | null>(null);

  const queryParams = {
    ...(search ? { search } : {}),
    ...(roleFilter !== 'all' ? { role: roleFilter } : {}),
    skip: page * LIMIT,
    limit: LIMIT,
  };

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.admin.users(sedeId, queryParams),
    queryFn: () => listSedeUsers(sedeId, queryParams),
    enabled: !!sedeId,
  });

  const users = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  const invalidateUsers = () => qc.invalidateQueries({ queryKey: ['admin', 'users'] });

  const createMut = useMutation({
    mutationFn: (p: AdminUserCreate) => createSedeUser(p),
    onSuccess: () => { invalidateUsers(); resetAddForm(); toast({ title: 'Usuario creado' }); },
    onError: () => toast({ title: 'Error', description: 'No se pudo crear el usuario.', variant: 'destructive' }),
  });

  const assignMut = useMutation({
    mutationFn: (p: { email: string; role: RoleName }) => assignExistingUser(sedeId, p),
    onSuccess: () => { invalidateUsers(); resetAddForm(); toast({ title: 'Usuario asignado' }); },
    onError: () => toast({ title: 'Error', description: 'No se pudo asignar el usuario.', variant: 'destructive' }),
  });

  const editRoleMut = useMutation({
    mutationFn: ({ id, role }: { id: string; role: RoleName }) => updateUserRole(sedeId, id, role),
    onSuccess: () => { invalidateUsers(); setEditTarget(null); toast({ title: 'Rol actualizado' }); },
    onError: () => toast({ title: 'Error', variant: 'destructive' }),
  });

  const deactivateMut = useMutation({
    mutationFn: (id: string) => deactivateUser(sedeId, id),
    onSuccess: () => { invalidateUsers(); setDeactivateTarget(null); toast({ title: 'Usuario desactivado' }); },
    onError: () => toast({ title: 'Error', variant: 'destructive' }),
  });

  const importMut = useMutation({
    mutationFn: (file: File) => bulkImportUsers(sedeId, file),
    onSuccess: (result) => { setImportResult(result); invalidateUsers(); toast({ title: 'Importación completada' }); },
    onError: () => toast({ title: 'Error en la importación', variant: 'destructive' }),
  });

  const resetAddForm = () => {
    setShowAdd(false); setNewEmail(''); setNewName(''); setNewPassword(''); setNewRole('student');
    setExistEmail(''); setExistRole('student');
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) importMut.mutate(file);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Gestión de Usuarios" description={`${total} usuario${total !== 1 ? 's' : ''} registrado${total !== 1 ? 's' : ''}`}>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowImport(true)}>
            <Upload className="w-4 h-4 mr-2" />
            Importar CSV
          </Button>
          <Button onClick={() => setShowAdd(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Agregar Usuario
          </Button>
        </div>
      </PageHeader>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre o email..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            className="pl-9"
          />
        </div>
        <Select value={roleFilter} onValueChange={(v) => { setRoleFilter(v); setPage(0); }}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filtrar por rol" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los roles</SelectItem>
            {ALL_VISIBLE_ROLES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card className="border-border/50">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Ingresó</TableHead>
                <TableHead>Última Actividad</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-20" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No se encontraron usuarios.
                  </TableCell>
                </TableRow>
              ) : (
                users.map((u) => {
                  const rb = ROLE_BADGE[u.role] ?? ROLE_BADGE.guest;
                  return (
                    <TableRow key={u.id} className="cursor-pointer hover:bg-muted/20" onClick={() => router.push(`/admin/users/${u.user_global_id}`)}>
                      <TableCell className="font-medium">{u.full_name}</TableCell>
                      <TableCell className="text-muted-foreground text-xs">{u.email}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-[10px] ${rb.color}`}>{rb.label}</Badge>
                      </TableCell>
                      <TableCell>
                        {u.is_active ? (
                          <Badge variant="outline" className="text-[10px] bg-green-500/10 text-green-400 border-green-500/20">Activo</Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] bg-red-500/10 text-red-400 border-red-500/20">Inactivo</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {u.joined_at
                          ? formatDistanceToNow(new Date(u.joined_at), { addSuffix: true, locale: es })
                          : '—'}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        No disponible
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" className="h-7 w-7">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setEditTarget(u); setEditRole(u.role); }}>
                              <ShieldCheck className="w-3.5 h-3.5 mr-2" />
                              Editar Rol
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); router.push(`/admin/users/${u.user_global_id}`); }}>
                              <Eye className="w-3.5 h-3.5 mr-2" />
                              Ver Perfil
                            </DropdownMenuItem>
                            {u.is_active && (
                              <DropdownMenuItem className="text-destructive" onClick={(e) => { e.stopPropagation(); setDeactivateTarget(u); }}>
                                <UserX className="w-3.5 h-3.5 mr-2" />
                                Desactivar
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Página {page + 1} de {totalPages} ({total} usuarios)</span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage(page - 1)}>Anterior</Button>
            <Button size="sm" variant="outline" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>Siguiente</Button>
          </div>
        </div>
      )}

      {/* Add User Dialog */}
      <Dialog open={showAdd} onOpenChange={(v) => !v && resetAddForm()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Agregar Usuario</DialogTitle>
          </DialogHeader>
          <Tabs value={addTab} onValueChange={(v) => setAddTab(v as 'existing' | 'new')}>
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="new">Nuevo Usuario</TabsTrigger>
              <TabsTrigger value="existing">Usuario Existente</TabsTrigger>
            </TabsList>

            <TabsContent value="new" className="space-y-3 mt-3">
              <div className="space-y-2">
                <Label>Email *</Label>
                <Input type="email" placeholder="correo@unad.edu.co" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Nombre completo *</Label>
                <Input placeholder="Nombre Apellido" value={newName} onChange={(e) => setNewName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Contraseña *</Label>
                <Input type="password" placeholder="Mínimo 8 caracteres" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Rol</Label>
                <Select value={newRole} onValueChange={(v) => setNewRole(v as RoleName)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ASSIGNABLE_ROLES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Button
                className="w-full"
                onClick={() => createMut.mutate({ email: newEmail, full_name: newName, password: newPassword, role: newRole })}
                disabled={!newEmail || !newName || !newPassword || createMut.isPending}
              >
                {createMut.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Crear Usuario
              </Button>
            </TabsContent>

            <TabsContent value="existing" className="space-y-3 mt-3">
              <p className="text-xs text-muted-foreground">Asignar un usuario existente de otra sede/zona a esta sede.</p>
              <div className="space-y-2">
                <Label>Email del usuario *</Label>
                <Input type="email" placeholder="correo@unad.edu.co" value={existEmail} onChange={(e) => setExistEmail(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Rol en esta sede</Label>
                <Select value={existRole} onValueChange={(v) => setExistRole(v as RoleName)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ASSIGNABLE_ROLES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Button
                className="w-full"
                onClick={() => assignMut.mutate({ email: existEmail, role: existRole })}
                disabled={!existEmail || assignMut.isPending}
              >
                {assignMut.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Asignar a Sede
              </Button>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Import CSV Dialog */}
      <Dialog open={showImport} onOpenChange={(v) => { if (!v) { setShowImport(false); setImportResult(null); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Importar Usuarios desde CSV</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              El CSV debe tener columnas: <code className="text-xs bg-muted px-1 py-0.5 rounded">email, full_name, password, role</code>
            </p>
            <div className="flex items-center gap-3">
              <Input type="file" accept=".csv" onChange={handleImportFile} disabled={importMut.isPending} />
              {importMut.isPending && <Loader2 className="w-5 h-5 animate-spin text-primary" />}
            </div>

            {importResult && (
              <div className="space-y-3 p-3 rounded-lg border border-border/50 bg-muted/20">
                <div className="flex gap-4 text-sm">
                  <span className="flex items-center gap-1 text-green-400">
                    <CheckCircle2 className="w-4 h-4" />
                    {importResult.created} creados
                  </span>
                  <span className="flex items-center gap-1 text-red-400">
                    <XCircle className="w-4 h-4" />
                    {importResult.errors} errores
                  </span>
                </div>
                {importResult.details.length > 0 && (
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {importResult.details.map((d, i) => (
                      <p key={i} className="text-[11px] text-destructive flex items-start gap-1">
                        <AlertCircle className="w-3 h-3 shrink-0 mt-0.5" />
                        Fila {d.row} ({d.email}): {d.error}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Role Dialog */}
      <Dialog open={!!editTarget} onOpenChange={(v) => !v && setEditTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Rol — {editTarget?.full_name}</DialogTitle>
          </DialogHeader>
          <div className="py-3">
            <Select value={editRole} onValueChange={(v) => setEditRole(v as RoleName)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ASSIGNABLE_ROLES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTarget(null)}>Cancelar</Button>
            <Button
              onClick={() => editTarget && editRoleMut.mutate({ id: editTarget.id, role: editRole })}
              disabled={editRoleMut.isPending}
            >
              {editRoleMut.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deactivate Confirm */}
      <AlertDialog open={!!deactivateTarget} onOpenChange={(v) => !v && setDeactivateTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desactivar usuario</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Desactivar a <strong>{deactivateTarget?.full_name}</strong>? No podrá acceder a la plataforma.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deactivateTarget && deactivateMut.mutate(deactivateTarget.id)}
            >
              Desactivar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
