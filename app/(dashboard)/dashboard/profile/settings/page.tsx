'use client';

import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import { useToast } from '@/hooks/use-toast';
import { getMyAIKeys, saveAIKey, deleteAIKey, type AIKeyInfo } from '@/lib/api/services';
import {
  Key,
  Eye,
  EyeOff,
  Trash2,
  Plus,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowLeft,
  Shield,
  Cpu,
} from 'lucide-react';
import Link from 'next/link';

// ─── Known Providers ────────────────────────────────────

const KNOWN_PROVIDERS = [
  {
    id: 'openai',
    name: 'OpenAI',
    description: 'GPT-4, GPT-3.5, DALL·E y otros modelos de OpenAI.',
    placeholder: 'sk-...',
    docsUrl: 'https://platform.openai.com/api-keys',
  },
  {
    id: 'gemini',
    name: 'Google Gemini',
    description: 'Gemini Pro, Gemini Ultra y otros modelos de Google.',
    placeholder: 'AIza...',
    docsUrl: 'https://aistudio.google.com/app/apikey',
  },
];

// ─── Provider Card ──────────────────────────────────────

function ProviderCard({
  provider,
  configured,
  configuredAt,
  onSave,
  onDelete,
  isSaving,
  isDeleting,
}: {
  provider: typeof KNOWN_PROVIDERS[number];
  configured: boolean;
  configuredAt?: string;
  onSave: (provider: string, apiKey: string) => void;
  onDelete: (provider: string) => void;
  isSaving: boolean;
  isDeleting: boolean;
}) {
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [editing, setEditing] = useState(false);

  const handleSave = useCallback(() => {
    if (!apiKey.trim()) return;
    onSave(provider.id, apiKey.trim());
    setApiKey('');
    setEditing(false);
  }, [apiKey, onSave, provider.id]);

  return (
    <Card className="border-border/50">
      <CardContent className="pt-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Cpu className="w-5 h-5 text-primary" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-medium">{provider.name}</h3>
                {configured ? (
                  <Badge variant="secondary" className="text-xs">
                    <CheckCircle2 className="w-3 h-3 mr-1 text-green-500" /> Configurada
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-xs">
                    <AlertCircle className="w-3 h-3 mr-1" /> Sin configurar
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">{provider.description}</p>
              {configured && configuredAt ? (
                <p className="text-xs text-muted-foreground/70 mt-1">
                  Configurada el {new Date(configuredAt).toLocaleDateString('es-CO')}
                </p>
              ) : null}
            </div>
          </div>

          {configured && !editing ? (
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditing(true)}
              >
                Actualizar
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => onDelete(provider.id)}
                disabled={isDeleting}
              >
                {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              </Button>
            </div>
          ) : null}
        </div>

        {/* Key Input Form */}
        {(!configured || editing) ? (
          <div className="mt-4 space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor={`key-${provider.id}`} className="text-sm">
                API Key
              </Label>
              <div className="relative">
                <Input
                  id={`key-${provider.id}`}
                  type={showKey ? 'text' : 'password'}
                  placeholder={provider.placeholder}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                Obtén tu API key en{' '}
                <a
                  href={provider.docsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline hover:no-underline"
                >
                  {provider.docsUrl}
                </a>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={handleSave}
                disabled={!apiKey.trim() || isSaving}
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-1" />
                ) : (
                  <Plus className="w-4 h-4 mr-1" />
                )}
                Guardar
              </Button>
              {editing ? (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => { setEditing(false); setApiKey(''); }}
                >
                  Cancelar
                </Button>
              ) : null}
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

// ─── Settings Page ──────────────────────────────────────

export default function AIKeysSettingsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: keys, isLoading } = useQuery({
    queryKey: ['ai-keys'],
    queryFn: getMyAIKeys,
  });

  const saveMutation = useMutation({
    mutationFn: (payload: { provider: string; api_key: string }) => saveAIKey(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-keys'] });
      toast({ title: 'API Key guardada', description: 'Tu clave se guardó correctamente.' });
    },
    onError: () => {
      toast({ title: 'Error', description: 'No se pudo guardar la API key.', variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (provider: string) => deleteAIKey(provider),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-keys'] });
      toast({ title: 'API Key eliminada', description: 'La clave fue eliminada correctamente.' });
    },
    onError: () => {
      toast({ title: 'Error', description: 'No se pudo eliminar la API key.', variant: 'destructive' });
    },
  });

  const handleSave = useCallback((provider: string, apiKey: string) => {
    saveMutation.mutate({ provider, api_key: apiKey });
  }, [saveMutation]);

  const handleDelete = useCallback((provider: string) => {
    deleteMutation.mutate(provider);
  }, [deleteMutation]);

  const keysMap = new Map<string, AIKeyInfo>();
  keys?.forEach((k) => keysMap.set(k.provider, k));

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Configuración"
        description="Gestiona tus claves de API para servicios de inteligencia artificial."
      >
        <Link href="/dashboard/profile">
          <Button variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4 mr-1" /> Volver al perfil
          </Button>
        </Link>
      </PageHeader>

      {/* Security Notice */}
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <Shield className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium">Seguridad de tus claves</p>
              <p className="text-xs text-muted-foreground mt-1">
                Tus API keys se almacenan de forma segura y encriptada en el servidor.
                Nunca se comparten con otros usuarios ni se muestran después de guardarlas.
                Solo se usan para conectar con los servicios de IA dentro de la plataforma.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Provider Cards */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => <Skeleton key={i} className="h-32 w-full rounded-lg" />)}
        </div>
      ) : (
        <div className="space-y-4">
          {KNOWN_PROVIDERS.map((provider) => {
            const info = keysMap.get(provider.id);
            return (
              <ProviderCard
                key={provider.id}
                provider={provider}
                configured={!!info}
                configuredAt={info?.configured_at}
                onSave={handleSave}
                onDelete={handleDelete}
                isSaving={saveMutation.isPending}
                isDeleting={deleteMutation.isPending}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
