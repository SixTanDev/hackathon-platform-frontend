'use client';

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-client';
import apiClient from '@/lib/api/client';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { FileText, FolderOpen, Clock, ArrowRight, BookOpen } from 'lucide-react';
import Link from 'next/link';

interface DocumentCollection {
  id: string;
  name: string;
  description?: string;
  owner_id: string;
  owner_type: string;
  document_count: number;
  created_at: string;
}

async function listStudentCollections(): Promise<DocumentCollection[]> {
  // Los estudiantes ven colecciones de su sede
  const res = await apiClient.get('/document-collections');
  const data = res.data;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.collections)) return data.collections;
  if (Array.isArray(data?.items)) return data.items;
  return [];
}

export default function StudentDocumentsPage() {
  const { data: collections, isLoading } = useQuery({
    queryKey: ['student', 'documents', 'collections'],
    queryFn: listStudentCollections,
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader 
        title="Material de Apoyo" 
        description="Consulta documentos y recursos compartidos por tus tutores para potenciar tu aprendizaje." 
      />

      {isLoading ? (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-48 w-full rounded-2xl" />)}
        </div>
      ) : !collections?.length ? (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center text-muted-foreground">
            <BookOpen className="w-12 h-12 mx-auto opacity-20 mb-4" />
            <p className="text-lg font-medium">No hay documentos disponibles aún</p>
            <p className="text-sm">Tus tutores subirán material de apoyo en esta sección pronto.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {collections.map((col) => (
            <Card key={col.id} className="group hover:border-primary/50 transition-all hover:shadow-lg overflow-hidden border-border/50">
              <div className="h-2 bg-gradient-to-r from-indigo-500 to-purple-500 opacity-80" />
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-500">
                    <FolderOpen className="w-5 h-5" />
                  </div>
                  <Badge variant="secondary" className="bg-indigo-500/5 text-indigo-600 border-indigo-500/10">
                    {col.document_count || 0} archivos
                  </Badge>
                </div>
                <CardTitle className="mt-4 line-clamp-1 group-hover:text-primary transition-colors">
                  {col.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-xs text-muted-foreground line-clamp-2 min-h-[2rem]">
                  {col.description || 'Sin descripción adicional.'}
                </p>
                
                <div className="flex items-center text-[10px] text-muted-foreground pt-2">
                  <Clock className="w-3 h-3 mr-1" />
                  Actualizado el {new Date(col.created_at).toLocaleDateString()}
                </div>

                <Link href={`/dashboard/documents/${col.id}`} className="block">
                  <Button className="w-full h-10 bg-indigo-600 hover:bg-indigo-700 text-white font-bold gap-2">
                    Ver Documentos <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
