'use client';

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-client';
import apiClient from '@/lib/api/client';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { FileText, Files, Clock, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

/* ── OpenAPI: GET /document-collections ── */
interface DocumentCollection {
  id: string;
  name: string;
  description?: string;
  document_count: number;
  created_at: string;
  updated_at: string;
}

interface CollectionListResponse {
  collections: DocumentCollection[];
}

async function listCollectionsOpenAPI() {
  const res = await apiClient.get<CollectionListResponse>('/document-collections');
  return res.data;
}

export default function TutorDocumentsPage() {
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.documents.collections,
    queryFn: listCollectionsOpenAPI,
  });

  const collections = data?.collections ?? [];

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Mis Documentos"
        description="Colecciones de documentos para entrenamiento de IA y referencia de retos (OpenAPI: /document-collections)"
      />

      <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-48 w-full rounded-xl" />)
        ) : collections.length === 0 ? (
          <Card className="col-span-full py-16 text-center text-muted-foreground border-dashed">
            <Files className="w-12 h-12 mx-auto opacity-20 mb-3" />
            <p>No tienes colecciones de documentos creadas</p>
          </Card>
        ) : (
          collections.map((col) => (
            <Card key={col.id} className="hover:shadow-md transition-shadow group">
              <CardHeader className="pb-3 px-5">
                <div className="flex items-start justify-between">
                  <div className="p-2 rounded-lg bg-unad-blue/10">
                    <FileText className="h-5 w-5 text-unad-blue" />
                  </div>
                  <Badge variant="secondary" className="bg-unad-blue/5 text-unad-blue border-unad-blue/10">
                    {col.document_count} docs
                  </Badge>
                </div>
                <CardTitle className="mt-3 text-base leading-tight group-hover:text-unad-blue transition-colors">
                  {col.name}
                </CardTitle>
                <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                  {col.description || 'Sin descripción disponible'}
                </p>
              </CardHeader>
              <CardContent className="px-5 pb-5">
                <div className="flex items-center gap-3 pt-3 border-t border-border/50">
                  <div className="flex items-center text-[10px] text-muted-foreground mr-auto uppercase tracking-wider font-semibold">
                    <Clock className="w-3 h-3 mr-1" />
                    {new Date(col.created_at).toLocaleDateString()}
                  </div>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
