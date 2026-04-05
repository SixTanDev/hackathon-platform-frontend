'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-client';
import apiClient from '@/lib/api/client';
import type { ChallengeType, ChallengeDifficulty } from '@/types/api';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import Link from 'next/link';
import {
  Sparkles, Send, Loader2, FileText, Cpu, Clock, CheckCircle2, XCircle, AlertCircle, LucideIcon, ArrowRight
} from 'lucide-react';

/* ── OpenAPI: POST /challenge-generation/request ── */
interface GenerationSubmitRequest {
  type: ChallengeType;
  difficulty: ChallengeDifficulty;
  topic: string;
  additional_context?: string;
  document_collection_id?: string;
}

/* ── OpenAPI: GET /challenge-generation/requests → GenerationRequestListResponse ── */
interface GenerationRequestItem {
  id: string;
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';
  type: ChallengeType;
  difficulty: ChallengeDifficulty;
  topic: string;
  challenge_id?: string | null;
  challenge_title?: string | null;
  created_at: string;
  completed_at?: string | null;
  error_message?: string | null;
}

interface GenerationRequestListResponse {
  requests: GenerationRequestItem[];
}

interface DocumentCollection {
  id: string;
  name: string;
}

async function submitGenerationRequest(payload: GenerationSubmitRequest) {
  const res = await apiClient.post('/challenge-generation/request', payload);
  return res.data;
}

async function listMyGenerationRequests(status?: string): Promise<GenerationRequestItem[]> {
  const params = status ? { status } : undefined;
  const res = await apiClient.get<GenerationRequestListResponse | GenerationRequestItem[]>('/challenge-generation/requests', { params });
  
  if (Array.isArray(res.data)) return res.data;
  return (res.data as GenerationRequestListResponse)?.requests ?? [];
}

/* ── OpenAPI: GET /document-collections ── */
async function listCollectionsOpenAPI(): Promise<DocumentCollection[]> {
  const res = await apiClient.get('/document-collections');
  const data = res.data;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.collections)) return data.collections;
  if (Array.isArray(data?.items)) return data.items;
  return [];
}

const TYPE_LABELS: Record<ChallengeType, string> = {
  coding: 'Coding', case_study: 'Caso de Estudio', essay: 'Ensayo',
  clinical_analysis: 'Análisis Clínico', legal_argument: 'Argumento Legal',
  design_proposal: 'Propuesta de Diseño', custom: 'Personalizado',
};
const DIFFICULTY_LABELS: Record<ChallengeDifficulty, string> = {
  easy: 'Fácil', medium: 'Medio', hard: 'Difícil', expert: 'Experto',
};
const STATUS_CONFIG: Record<GenerationRequestItem['status'], { label: string; icon: LucideIcon; class: string }> = {
  queued: { label: 'En Cola', icon: Clock, class: 'bg-gray-500/10 text-gray-400' },
  processing: { label: 'Procesando', icon: Loader2, class: 'bg-blue-500/10 text-blue-400' },
  completed: { label: 'Completado', icon: CheckCircle2, class: 'bg-green-500/10 text-green-400' },
  failed: { label: 'Error', icon: XCircle, class: 'bg-red-500/10 text-red-400' },
  cancelled: { label: 'Cancelado', icon: AlertCircle, class: 'bg-muted text-muted-foreground' },
};

export default function TutorAIGenerationPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<string>('form');
  const [formType, setFormType] = useState<ChallengeType>('coding');
  const [formDifficulty, setFormDifficulty] = useState<ChallengeDifficulty>('medium');
  const [topic, setTopic] = useState('');
  const [context, setContext] = useState('');
  const [collectionId, setCollectionId] = useState<string>('none');

  const { data: requestsData, isLoading: loadingReqs } = useQuery({
    queryKey: ['challenge-generation', 'requests'],
    queryFn: () => listMyGenerationRequests(),
    refetchInterval: 15000,
  });

  // Mock data for visualization based on user request (Python Hackathon context)
  const requests: GenerationRequestItem[] = (!requestsData || requestsData.length === 0) ? [
    {
      id: 'mock-1',
      status: 'processing',
      type: 'coding',
      difficulty: 'expert',
      topic: 'Detección de Intrusiones con Scapy y Python',
      challenge_title: 'Análisis de Tráfico de Red Real-time',
      created_at: new Date().toISOString(),
    },
    {
      id: 'mock-2',
      status: 'completed',
      type: 'coding',
      difficulty: 'hard',
      topic: 'Análisis de Logs con Pandas',
      challenge_id: 'challenge-123',
      challenge_title: 'Minería de Datos de Servidores Web',
      created_at: new Date(Date.now() - 3600000).toISOString(),
      completed_at: new Date(Date.now() - 1800000).toISOString(),
    },
    {
      id: 'mock-3',
      status: 'queued',
      type: 'coding',
      difficulty: 'medium',
      topic: 'Web Scraping de Noticieros Nacionales',
      created_at: new Date(Date.now() - 7200000).toISOString(),
    }
  ] : requestsData;

  const { data: collections } = useQuery({
    queryKey: queryKeys.documents.collections,
    queryFn: listCollectionsOpenAPI,
  });

  const generateMut = useMutation({
    mutationFn: (payload: GenerationSubmitRequest) => submitGenerationRequest(payload),
    onSuccess: () => {
      toast.success('Solicitud enviada exitosamente');
      qc.invalidateQueries({ queryKey: ['challenge-generation'] });
      setTab('generated'); setTopic(''); setContext('');
    },
    onError: () => toast.error('Error al solicitar generación con IA'),
  });

  const handleSubmit = () => {
    if (!topic.trim()) { toast.error('El tema es obligatorio'); return; }
    const payload: GenerationSubmitRequest = { type: formType, difficulty: formDifficulty, topic };
    if (context.trim()) payload.additional_context = context;
    if (collectionId !== 'none') payload.document_collection_id = collectionId;
    generateMut.mutate(payload);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Generación con IA" description="Crea nuevos retos de programación utilizando inteligencia artificial." />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="form"><Sparkles className="h-4 w-4 mr-2" />Nueva Solicitud</TabsTrigger>
          <TabsTrigger value="generated"><FileText className="h-4 w-4 mr-2" />Mis Solicitudes</TabsTrigger>
        </TabsList>

        <TabsContent value="form" className="mt-6">
          <Card className="max-w-2xl">
            <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Sparkles className="h-5 w-5 text-purple-400" /> Solicitar Generación</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select value={formType} onValueChange={v => setFormType(v as ChallengeType)}><SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{Object.entries(TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Dificultad</Label>
                  <Select value={formDifficulty} onValueChange={v => setFormDifficulty(v as ChallengeDifficulty)}><SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{Object.entries(DIFFICULTY_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Tema Principal</Label>
                <Input value={topic} onChange={e => setTopic(e.target.value)} placeholder="Ej: Programación orientada a objetos en Java" />
              </div>
              <div className="space-y-2">
                <Label>Contexto / Instrucciones adicionales</Label>
                <Textarea value={context} onChange={e => setContext(e.target.value)} placeholder="Agrega detalles para la generación..." className="min-h-[100px]" />
              </div>
              <div className="space-y-2">
                <Label>Documentación de Referencia</Label>
                <Select value={collectionId} onValueChange={setCollectionId}><SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="none">Ninguna</SelectItem>
                    {(Array.isArray(collections) ? collections : []).map((col) => <SelectItem key={col.id} value={col.id}>{col.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Separator className="my-4" />
              <Button onClick={handleSubmit} disabled={generateMut.isPending} className="w-full">
                {generateMut.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />} Enviar Solicitud
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="generated" className="mt-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Cola de Generación Individual</CardTitle></CardHeader>
            <CardContent>
              {loadingReqs ? <Skeleton className="h-20 w-full" /> : !requests?.length ? 
                <div className="py-10 text-center text-muted-foreground"><Cpu className="w-8 h-8 mx-auto opacity-20 mb-2" /> Sin solicitudes activas</div> :
                <div className="space-y-3">
                  {requests.map((r) => {
                    const cfg = STATUS_CONFIG[r.status];
                    const Icon = cfg.icon;
                    return (
                      <div key={r.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/30 transition-colors">
                        <div>
                          <p className="font-medium text-sm">{r.challenge_title || r.topic}</p>
                          <div className="flex gap-2 mt-1">
                            <Badge variant="outline" className="text-[10px]">{DIFFICULTY_LABELS[r.difficulty]}</Badge>
                            <span className="text-[10px] text-muted-foreground">{TYPE_LABELS[r.type]}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge variant="secondary" className={`${cfg.class} h-6`}><Icon className={`h-3 w-3 mr-1 ${r.status === 'processing' ? 'animate-spin' : ''}`} />{cfg.label}</Badge>
                          {r.status === 'completed' && (
                            <Link href={`/dashboard/challenges/${r.id.startsWith('mock') ? 'mock-python-1' : r.challenge_id}`}>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="gap-2 text-green-600 hover:bg-green-500/10 hover:text-green-700 transition-all font-semibold"
                              >
                                Ver Reto <ArrowRight className="w-4 h-4" />
                              </Button>
                            </Link>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              }
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
