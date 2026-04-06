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
  CheckCircle2,
  XCircle,
  AlertCircle,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { es, enUS } from 'date-fns/locale';
import { useTranslation } from '@/lib/i18n/context';

export default function UserManagementPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { t, locale } = useTranslation();
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

  const ROLE_BADGE: Record<string, { label: string; color: string }> = {
    admin: { label: t('admin.users.roles.admin'), color: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
    tutor: { label: t('admin.users.roles.tutor'), color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
    director_semillero: { label: t('admin.users.roles.director_semillero'), color: 'bg-teal-500/10 text-teal-400 border-teal-500/20' },
    student: { label: t('admin.users.roles.student'), color: 'bg-green-500/10 text-green-400 border-green-500/20' },
    guest: { label: t('admin.users.roles.guest'), color: 'bg-gray-500/10 text-gray-400 border-gray-500/20' },
  };

  const ASSIGNABLE_ROLES: { value: RoleName; label: string }[] = [
    { value: 'tutor', label: t('admin.users.roles.tutor') },
    { value: 'director_semillero', label: t('admin.users.roles.director_semillero') },
    { value: 'student', label: t('admin.users.roles.student') },
    { value: 'guest', label: t('admin.users.roles.guest') },
  ];

  const ALL_VISIBLE_ROLES: { value: string; label: string }[] = [
    { value: 'admin', label: t('admin.users.roles.admin') },
    ...ASSIGNABLE_ROLES,
  ];

  const createMut = useMutation({
    mutationFn: (p: AdminUserCreate) => createSedeUser(p),
    onSuccess: () => { invalidateUsers(); resetAddForm(); toast({ title: t('admin.users.addUser') }); },
    onError: () => toast({ title: t('common.error'), description: t('common.error'), variant: 'destructive' }),
  });

  const assignMut = useMutation({
    mutationFn: (p: { email: string; role: RoleName }) => assignExistingUser(sedeId, p),
    onSuccess: () => { invalidateUsers(); resetAddForm(); toast({ title: t('admin.users.dialogs.add.assignButton') }); },
    onError: () => toast({ title: t('common.error'), variant: 'destructive' }),
  });

  const editRoleMut = useMutation({
    mutationFn: ({ id, role }: { id: string; role: RoleName }) => updateUserRole(sedeId, id, role),
    onSuccess: () => { invalidateUsers(); setEditTarget(null); toast({ title: t('admin.users.actions.editRole') }); },
    onError: () => toast({ title: t('common.error'), variant: 'destructive' }),
  });

  const deactivateMut = useMutation({
    mutationFn: (id: string) => deactivateUser(sedeId, id),
    onSuccess: () => { invalidateUsers(); setDeactivateTarget(null); toast({ title: t('admin.users.actions.deactivate') }); },
    onError: () => toast({ title: t('common.error'), variant: 'destructive' }),
  });

  const importMut = useMutation({
    mutationFn: (file: File) => bulkImportUsers(sedeId, file),
    onSuccess: (result) => { setImportResult(result); invalidateUsers(); toast({ title: t('admin.users.importCsv') }); },
    onError: () => toast({ title: t('common.error'), variant: 'destructive' }),
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
      <PageHeader 
        title={t('admin.users.title')} 
        description={total === 1 
          ? t('admin.users.description_one') 
          : t('admin.users.description_other', { count: total })
        }
      >
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowImport(true)}>
            <Upload className="w-4 h-4 mr-2" />
            {t('admin.users.importCsv')}
          </Button>
          <Button onClick={() => setShowAdd(true)}>
            <Plus className="w-4 h-4 mr-2" />
            {t('admin.users.addUser')}
          </Button>
        </div>
      </PageHeader>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={t('admin.users.searchPlaceholder')}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            className="pl-9"
          />
        </div>
        <Select value={roleFilter} onValueChange={(v) => { setRoleFilter(v); setPage(0); }}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder={t('admin.users.filterRole')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('admin.users.allRoles')}</SelectItem>
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
                <TableHead>{t('admin.users.table.name')}</TableHead>
                <TableHead>{t('admin.users.table.email')}</TableHead>
                <TableHead>{t('admin.users.table.role')}</TableHead>
                <TableHead>{t('admin.users.table.status')}</TableHead>
                <TableHead>{t('admin.users.table.joined')}</TableHead>
                <TableHead>{t('admin.users.table.lastActivity')}</TableHead>
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
                    {t('admin.users.table.empty')}
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
                          <Badge variant="outline" className="text-[10px] bg-green-500/10 text-green-400 border-green-500/20">
                            {t('admin.users.status.active')}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] bg-red-500/10 text-red-400 border-red-500/20">
                            {t('admin.users.status.inactive')}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {u.joined_at
                          ? formatDistanceToNow(new Date(u.joined_at), { addSuffix: true, locale: locale === 'es' ? es : enUS })
                          : '—'}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {t('admin.users.table.notAvailable')}
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
                              {t('admin.users.actions.editRole')}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); router.push(`/admin/users/${u.user_global_id}`); }}>
                              <Eye className="w-3.5 h-3.5 mr-2" />
                              {t('admin.users.actions.viewProfile')}
                            </DropdownMenuItem>
                            {u.is_active && (
                              <DropdownMenuItem className="text-destructive" onClick={(e) => { e.stopPropagation(); setDeactivateTarget(u); }}>
                                <UserX className="w-3.5 h-3.5 mr-2" />
                                {t('admin.users.actions.deactivate')}
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
          <span>
            {t('admin.users.pagination.pageOf', { page: page + 1, total: totalPages, count: total })}
          </span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage(page - 1)}>
              {t('admin.users.pagination.prev')}
            </Button>
            <Button size="sm" variant="outline" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>
              {t('admin.users.pagination.next')}
            </Button>
          </div>
        </div>
      )}

      {/* Add User Dialog */}
      <Dialog open={showAdd} onOpenChange={(v) => !v && resetAddForm()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('admin.users.dialogs.add.title')}</DialogTitle>
          </DialogHeader>
          <Tabs value={addTab} onValueChange={(v) => setAddTab(v as 'existing' | 'new')}>
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="new">{t('admin.users.dialogs.add.newTab')}</TabsTrigger>
              <TabsTrigger value="existing">{t('admin.users.dialogs.add.existTab')}</TabsTrigger>
            </TabsList>

            <TabsContent value="new" className="space-y-3 mt-3">
              <div className="space-y-2">
                <Label>{t('admin.users.dialogs.add.email')}</Label>
                <Input type="email" placeholder="correo@unad.edu.co" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>{t('admin.users.dialogs.add.fullName')}</Label>
                <Input placeholder="Nombre Apellido" value={newName} onChange={(e) => setNewName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>{t('admin.users.dialogs.add.password')}</Label>
                <Input type="password" placeholder={t('admin.users.dialogs.add.passwordPlaceholder')} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>{t('admin.users.dialogs.add.role')}</Label>
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
                {t('admin.users.dialogs.add.createButton')}
              </Button>
            </TabsContent>

            <TabsContent value="existing" className="space-y-3 mt-3">
              <p className="text-xs text-muted-foreground">{t('admin.users.dialogs.add.assignHint')}</p>
              <div className="space-y-2">
                <Label>{t('admin.users.dialogs.add.email')}</Label>
                <Input type="email" placeholder="correo@unad.edu.co" value={existEmail} onChange={(e) => setExistEmail(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>{t('admin.users.dialogs.add.role')}</Label>
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
                {t('admin.users.dialogs.add.assignButton')}
              </Button>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Import CSV Dialog */}
      <Dialog open={showImport} onOpenChange={(v) => { if (!v) { setShowImport(false); setImportResult(null); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('admin.users.dialogs.import.title')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              {t('admin.users.dialogs.import.hint')}
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
                    {importResult.created} {t('admin.users.dialogs.import.created')}
                  </span>
                  <span className="flex items-center gap-1 text-red-400">
                    <XCircle className="w-4 h-4" />
                    {importResult.errors} {t('admin.users.dialogs.import.errors')}
                  </span>
                </div>
                {importResult.details.length > 0 && (
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {importResult.details.map((d, i) => (
                      <p key={i} className="text-[11px] text-destructive flex items-start gap-1">
                        <AlertCircle className="w-3 h-3 shrink-0 mt-0.5" />
                        {t('admin.users.dialogs.import.row')} {d.row} ({d.email}): {d.error}
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
            <DialogTitle>{t('admin.users.dialogs.edit.title')} — {editTarget?.full_name}</DialogTitle>
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
            <Button variant="outline" onClick={() => setEditTarget(null)}>{t('admin.users.dialogs.edit.cancel')}</Button>
            <Button
              onClick={() => editTarget && editRoleMut.mutate({ id: editTarget.id, role: editRole })}
              disabled={editRoleMut.isPending}
            >
              {editRoleMut.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {t('admin.users.dialogs.edit.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deactivate Confirm */}
      <AlertDialog open={!!deactivateTarget} onOpenChange={(v) => !v && setDeactivateTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('admin.users.dialogs.deactivate.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('admin.users.dialogs.deactivate.description', { name: deactivateTarget?.full_name || '' })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('admin.users.dialogs.edit.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deactivateTarget && deactivateMut.mutate(deactivateTarget.id)}
            >
              {t('admin.users.actions.deactivate')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
