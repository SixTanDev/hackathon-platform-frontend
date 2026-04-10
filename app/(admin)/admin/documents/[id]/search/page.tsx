'use client';

import { useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { getCollection, searchDocuments } from '@/lib/api/document-services';
import { queryKeys } from '@/lib/query-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowLeft,
  Search,
  Loader2,
  FileText,
  BookOpen,
  Sparkles,
  Hash,
  AlertCircle,
} from 'lucide-react';
import type { SemanticSearchResult } from '@/lib/api/document-services';

// ─── Relevance Bar ──────────────────────────────────────────

function RelevanceBar({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const color =
    pct >= 80
      ? 'bg-green-500'
      : pct >= 60
        ? 'bg-secondary'
        : pct >= 40
          ? 'bg-accent'
          : 'bg-muted-foreground';

  return (
    <div className="flex items-center gap-2">
      <div className="w-24 h-1.5 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[11px] font-mono text-muted-foreground">{pct}%</span>
    </div>
  );
}

// ─── Result Card ────────────────────────────────────────────

function ResultCard({ result, index }: { result: SemanticSearchResult; index: number }) {
  return (
    <Card className="animate-fade-in border-border/50">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2 min-w-0">
            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
              <span className="text-[10px] font-bold text-primary">#{index + 1}</span>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{result.document_title ?? 'Documento'}</p>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                {result.page_number != null && (
                  <span className="text-[11px] text-muted-foreground">
                    Página {result.page_number}
                  </span>
                )}
                {result.section_title && (
                  <Badge variant="outline" className="text-[10px]">
                    {result.section_title}
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <RelevanceBar score={result.relevance_score ?? 0} />
        </div>

        <div className="bg-muted/30 rounded-md p-3">
          <p className="text-xs text-foreground/80 leading-relaxed whitespace-pre-wrap">
            {result.content}
          </p>
        </div>

        {result.chunk_id && (
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Hash className="w-3 h-3" />
            Chunk: {result.chunk_id}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Main Page ──────────────────────────────────────────────

export default function SemanticSearchPage() {
  const params = useParams();
  const router = useRouter();
  const collectionId = params.id as string;

  const [query, setQuery] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');
  const [results, setResults] = useState<SemanticSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [topK, setTopK] = useState(5);

  const collectionQuery = useQuery({
    queryKey: queryKeys.documents.collectionDetail(collectionId),
    queryFn: () => getCollection(collectionId),
  });

  const handleSearch = useCallback(async () => {
    const q = query.trim();
    if (!q) return;
    setSearching(true);
    setError(null);
    setSubmittedQuery(q);
    try {
      const data = await searchDocuments(collectionId, q, topK);
      setResults(data);
      setHasSearched(true);
    } catch (err: any) {
      setError(err?.message ?? 'Error al realizar la búsqueda semántica.');
      setResults([]);
      setHasSearched(true);
    } finally {
      setSearching(false);
    }
  }, [query, collectionId, topK]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearch();
    }
  };

  const collectionName = collectionQuery.data?.name ?? 'Colección';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push(`/admin/documents/${collectionId}`)}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-secondary" />
            Búsqueda Semántica
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Colección: <span className="font-medium text-foreground">{collectionName}</span>
          </p>
        </div>
      </div>

      {/* Search Controls */}
      <Card className="border-border/50">
        <CardContent className="p-4 space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Escribe tu consulta semántica..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                className="pl-9"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <label className="text-xs text-muted-foreground whitespace-nowrap">Top K:</label>
              <Input
                type="number"
                min={1}
                max={20}
                value={topK}
                onChange={(e) => setTopK(Math.max(1, Math.min(20, Number(e.target.value) || 5)))}
                className="w-16 text-center"
              />
            </div>
            <Button onClick={handleSearch} disabled={searching || !query.trim()}>
              {searching ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Search className="w-4 h-4 mr-1" />}
              Buscar
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            La búsqueda semántica encuentra fragmentos de documentos por significado, no solo por palabras clave.
          </p>
        </CardContent>
      </Card>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Results */}
      {searching && (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="border-border/50">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Skeleton className="w-6 h-6 rounded-full" />
                  <Skeleton className="h-4 w-48" />
                </div>
                <Skeleton className="h-20 w-full rounded-md" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!searching && hasSearched && results.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{results.length}</span> resultado{results.length !== 1 ? 's' : ''} para{' '}
              <span className="italic">&quot;{submittedQuery}&quot;</span>
            </p>
          </div>
          {results.map((r, i) => (
            <ResultCard key={r.chunk_id ?? i} result={r} index={i} />
          ))}
        </div>
      )}

      {!searching && hasSearched && results.length === 0 && !error && (
        <Card className="border-border/50">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <BookOpen className="w-10 h-10 text-muted-foreground/40 mb-3" />
            <p className="text-sm font-medium">Sin resultados</p>
            <p className="text-xs text-muted-foreground mt-1">
              No se encontraron fragmentos relevantes para &quot;{submittedQuery}&quot;.
              Intenta con otra consulta.
            </p>
          </CardContent>
        </Card>
      )}

      {!hasSearched && !searching && (
        <Card className="border-border/50 border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Sparkles className="w-12 h-12 text-secondary/30 mb-4" />
            <p className="text-sm font-medium">Busca en los documentos de la colección</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm">
              Escribe una pregunta o concepto y el sistema encontrará los fragmentos más relevantes
              usando embeddings semánticos.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
