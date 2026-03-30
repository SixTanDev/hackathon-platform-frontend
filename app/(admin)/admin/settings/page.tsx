'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSede, getPersonalAIKeys, savePersonalAIKey, deletePersonalAIKey } from '@/lib/api/admin-services';
import type { AIKeyInfo } from '@/lib/api/admin-services';
import { queryKeys } from '@/lib/query-client';
import { useAuthStore } from '@/stores/auth-store';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  Building2,
  MapPin,
  Globe,
  Key,
  Plus,
  Trash2,
  Loader2,
  ShieldCheck,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const AI_PROVIDERS = [
  { value: 'openai', label: 'OpenAI' },
  { value: 'anthropic', label: 'Anthropic' },
  { value: 'google', label: 'Google AI' },
  { value: 'cohere', label: 'Cohere' },
  { value: 'huggingface', label: 'Hugging Face' },
];

export default function SedeSettingsPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const sedeId = useAuthStore((s) => s?.currentSede?.id) ?? '';

  // ── Sede info (read-only) ──
  const { data: sede, isLoading: loadingSede } = useQuery({
    queryKey: queryKeys.admin.sedeDetail(sedeId),
    queryFn: () => getSede(sedeId),
    enabled: !!sedeId,
  });

  // ── Personal AI Keys ──
  const { data: aiKeys, isLoading: loadingKeys } = useQuery({
    queryKey: queryKeys.admin.aiKeys,
    queryFn: () => getPersonalAIKeys(),
  });

  const [showAddKey, setShowAddKey] = useState(false);
  const [keyProvider, setKeyProvider] = useState('openai');
  const [keyValue, setKeyValue] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const saveMut = useMutation({
    mutationFn: () => savePersonalAIKey(keyProvider, keyValue),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.admin.aiKeys });
      setShowAddKey(false);
      setKeyValue('');
      toast({ title: 'Clave guardada' });
    },
    onError: () => toast({ title: 'Error al guardar la clave', variant: 'destructive' }),
  });

  const deleteMut = useMutation({
    mutationFn: (provider: string) => deletePersonalAIKey(provider),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.admin.aiKeys });
      setDeleteTarget(null);
      toast({ title: 'Clave eliminada' });
    },
    onError: () => toast({ title: 'Error al eliminar la clave', variant: 'destructive' }),
  });

  const loading = loadingSede;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Configuración"
        description="Información de la sede y claves personales de IA"
      />

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-48 rounded-lg" />
          <Skeleton className="h-40 rounded-lg" />
        </div>
      ) : (
        <>
          {/* Sede Info — Read Only */}
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="w-4 h-4 text-primary" />
                Información de la Sede
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Nombre</Label>
                  <p className="text-sm font-medium">{sede?.name ?? '—'}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Slug</Label>
                  <p className="text-sm font-mono text-muted-foreground">{sede?.slug ?? '—'}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> Ciudad
                  </Label>
                  <p className="text-sm">{sede?.city ?? '—'}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1">
                    <Globe className="w-3 h-3" /> Zona
                  </Label>
                  <p className="text-sm">{(sede as any)?.zone_name ?? (sede as any)?.zone_id ?? '—'}</p>
                </div>
              </div>
              {sede?.description && (
                <div className="mt-4 space-y-1">
                  <Label className="text-xs text-muted-foreground">Descripción</Label>
                  <p className="text-sm text-muted-foreground">{sede.description}</p>
                </div>
              )}
              <p className="text-[11px] text-muted-foreground mt-4">
                La información de la sede es gestionada por el Super Administrador.
              </p>
            </CardContent>
          </Card>

          <Separator />

          {/* Personal AI Keys */}
          <Card className="border-border/50">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Key className="w-4 h-4 text-secondary" />
                Claves Personales de IA
              </CardTitle>
              <Button size="sm" variant="outline" onClick={() => setShowAddKey(true)}>
                <Plus className="w-3.5 h-3.5 mr-1" />
                Agregar Clave
              </Button>
            </CardHeader>
            <CardContent>
              {loadingKeys ? (
                <div className="space-y-2">
                  {Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
                </div>
              ) : (aiKeys?.length ?? 0) === 0 ? (
                <div className="text-center py-6">
                  <Key className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No tienes claves de IA configuradas.</p>
                  <p className="text-xs text-muted-foreground mt-1">Agrega tus claves para utilizar funciones avanzadas de IA.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {aiKeys!.map((k, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-muted/10">
                      <div className="flex items-center gap-3">
                        <ShieldCheck className="w-4 h-4 text-green-400" />
                        <div>
                          <p className="text-sm font-medium capitalize">{k.provider}</p>
                          <p className="text-xs text-muted-foreground font-mono">{k.key_hint}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={`text-[10px] ${
                          k.is_active
                            ? 'bg-green-500/10 text-green-400 border-green-500/20'
                            : 'bg-red-500/10 text-red-400 border-red-500/20'
                        }`}>
                          {k.is_active ? 'Activa' : 'Inactiva'}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => setDeleteTarget(k.provider)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Add Key Dialog */}
          {showAddKey && (
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="pt-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Proveedor</Label>
                    <Select value={keyProvider} onValueChange={setKeyProvider}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {AI_PROVIDERS.map((p) => (
                          <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>API Key</Label>
                    <Input
                      type="password"
                      placeholder="sk-..."
                      value={keyValue}
                      onChange={(e) => setKeyValue(e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => { setShowAddKey(false); setKeyValue(''); }}>
                    Cancelar
                  </Button>
                  <Button
                    onClick={() => saveMut.mutate()}
                    disabled={!keyValue.trim() || saveMut.isPending}
                  >
                    {saveMut.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                    Guardar Clave
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar clave de IA</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Eliminar la clave de <strong className="capitalize">{deleteTarget}</strong>? Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteTarget && deleteMut.mutate(deleteTarget)}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
