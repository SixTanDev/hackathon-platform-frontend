'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-client';
import {
  requestAIGeneration, listAIGeneratedChallenges,
} from '@/lib/api/challenge-admin-services';
import type { AIGenerateRequest } from '@/lib/api/challenge-admin-services';
import { getDocumentCollections } from '@/lib/api/admin-hackathon-services';
import type { ChallengeType, ChallengeDifficulty, Challenge, DocumentCollection } from '@/types/api';
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
  Sparkles, ArrowLeft, Send, Loader2, CheckCircle2,
  Eye, Code2, FileText,
} from 'lucide-react';

const TYPE_LABELS: Record<ChallengeType, string> = {
  coding: 'Coding', case_study: 'Caso de Estudio', essay: 'Ensayo',
  clinical_analysis: 'Análisis Clínico', legal_argument: 'Argumento Legal',
  design_proposal: 'Propuesta de Diseño', custom: 'Personalizado',
};
const DIFFICULTY_LABELS: Record<ChallengeDifficulty, string> = {
  easy: 'Fácil', medium: 'Medio', hard: 'Difícil', expert: 'Experto',
};
const DIFFICULTY_COLORS: Record<ChallengeDifficulty, string> = {
  easy: 'bg-green-500/10 text-green-400',
  medium: 'bg-amber-500/10 text-amber-400',
  hard: 'bg-red-500/10 text-red-400',
  expert: 'bg-purple-500/10 text-purple-400',
};

const TOPIC_SUGGESTIONS = [
  'Algoritmos de ordenamiento', 'Programación dinámica', 'Grafos y árboles',
  'Estructuras de datos', 'Patrones de diseño', 'Bases de datos SQL',
  'Redes y protocolos', 'Análisis de caso clínico', 'Argumentación jurídica',
  'Gestión de proyectos', 'Emprendimiento social', 'Seguridad informática',
];

export default function AIGenerationPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<string>('form');

  // Form state
  const [formType, setFormType] = useState<ChallengeType>('coding');
  const [formDifficulty, setFormDifficulty] = useState<ChallengeDifficulty>('medium');
  const [topic, setTopic] = useState('');
  const [instructions, setInstructions] = useState('');
  const [collectionId, setCollectionId] = useState<string>('none');
  const [showTopicSuggestions, setShowTopicSuggestions] = useState(false);

  // AI-generated challenges list
  const { data: aiChallenges, isLoading: loadingAI } = useQuery({
    queryKey: [...queryKeys.adminChallenges.all, 'ai-generated'],
    queryFn: () => listAIGeneratedChallenges(),
    refetchInterval: 15000,
  });

  const { data: collections } = useQuery({
    queryKey: queryKeys.documents.collections,
    queryFn: getDocumentCollections,
  });

  const generateMut = useMutation({
    mutationFn: (payload: AIGenerateRequest) => requestAIGeneration(payload),
    onSuccess: (data) => {
      toast.success(data.message || 'Reto generado exitosamente');
      qc.invalidateQueries({ queryKey: queryKeys.adminChallenges.all });
      setTab('generated');
      setTopic(''); setInstructions('');
    },
    onError: () => toast.error('Error al generar el reto'),
  });

  const handleSubmit = () => {
    if (!topic.trim()) { toast.error('El tema es obligatorio'); return; }
    const payload: AIGenerateRequest = { type: formType, difficulty: formDifficulty, topic };
    if (instructions.trim()) payload.additional_instructions = instructions;
    if (collectionId !== 'none') payload.document_collection_id = collectionId;
    generateMut.mutate(payload);
  };

  const filteredSuggestions = TOPIC_SUGGESTIONS.filter(s =>
    !topic || s.toLowerCase().includes(topic.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <Link href="/admin/challenges"><Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button></Link>
        <PageHeader title="Generación con IA" description="Genera retos automáticamente usando inteligencia artificial" />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="form"><Sparkles className="h-4 w-4 mr-1.5" />Nueva Generación</TabsTrigger>
          <TabsTrigger value="generated">
            <FileText className="h-4 w-4 mr-1.5" />Retos Generados
            {aiChallenges && aiChallenges.length > 0 && <Badge variant="secondary" className="ml-1.5 h-5 px-1.5 text-xs">{aiChallenges.length}</Badge>}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="form" className="mt-6">
          <Card className="max-w-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Sparkles className="h-5 w-5 text-purple-400" />
                Generar Reto con IA
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo de Reto</Label>
                  <Select value={formType} onValueChange={v => setFormType(v as ChallengeType)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Dificultad</Label>
                  <Select value={formDifficulty} onValueChange={v => setFormDifficulty(v as ChallengeDifficulty)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(DIFFICULTY_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2 relative">
                <Label>Tema</Label>
                <Input
                  value={topic} onChange={e => setTopic(e.target.value)}
                  onFocus={() => setShowTopicSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowTopicSuggestions(false), 200)}
                  placeholder="Ej: Algoritmos de búsqueda en grafos"
                />
                {showTopicSuggestions && filteredSuggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 z-20 mt-1 bg-popover border border-border rounded-md shadow-lg max-h-40 overflow-y-auto">
                    {filteredSuggestions.map(s => (
                      <button key={s} className="w-full text-left px-3 py-1.5 text-sm hover:bg-muted" onClick={() => { setTopic(s); setShowTopicSuggestions(false); }}>{s}</button>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Instrucciones Adicionales (opcional)</Label>
                <Textarea value={instructions} onChange={e => setInstructions(e.target.value)} placeholder="Instrucciones específicas para la IA..." className="min-h-[80px]" />
              </div>

              <div className="space-y-2">
                <Label>Colección de Documentos (opcional)</Label>
                <Select value={collectionId} onValueChange={setCollectionId}>
                  <SelectTrigger><SelectValue placeholder="Sin colección" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin colección</SelectItem>
                    {(collections ?? []).map((col: DocumentCollection) => <SelectItem key={col.id} value={col.id}>{col.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Genera el reto basado en materiales del curso</p>
              </div>

              <Separator />

              <Button onClick={handleSubmit} disabled={generateMut.isPending} className="w-full">
                {generateMut.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                Generar Reto
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="generated" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Retos Generados por IA</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingAI ? (
                <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
              ) : !aiChallenges?.length ? (
                <p className="text-center text-muted-foreground py-8">No hay retos generados por IA todavía</p>
              ) : (
                <div className="space-y-3">
                  {aiChallenges.map((ch: Challenge) => (
                    <div key={ch.id} className="flex items-center justify-between p-3 rounded-lg border border-border/50 hover:bg-muted/30 transition-colors">
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          {ch.type === 'coding' ? <Code2 className="h-4 w-4 text-primary flex-shrink-0" /> : <FileText className="h-4 w-4 text-secondary flex-shrink-0" />}
                          <h3 className="font-medium text-sm truncate">{ch.title}</h3>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={DIFFICULTY_COLORS[ch.difficulty]}>{DIFFICULTY_LABELS[ch.difficulty]}</Badge>
                          <span className="text-xs text-muted-foreground">{TYPE_LABELS[ch.type] ?? ch.type}</span>
                          {ch.category && <span className="text-xs text-muted-foreground">• {ch.category}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-3">
                        <Badge variant="secondary" className={ch.status === 'approved' ? 'bg-green-500/10 text-green-400' : ch.status === 'rejected' ? 'bg-red-500/10 text-red-400' : 'bg-amber-500/10 text-amber-400'}>
                          {ch.status === 'approved' ? 'Aprobado' : ch.status === 'rejected' ? 'Rechazado' : 'Pendiente'}
                        </Badge>
                        <Link href={`/admin/challenges/create?edit=${ch.id}`}>
                          <Button variant="ghost" size="sm" className="h-7"><Eye className="h-3.5 w-3.5 mr-1" />Ver</Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
