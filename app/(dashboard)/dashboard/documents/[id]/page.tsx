'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { 
  getCollection, 
  listDocuments, 
  downloadDocumentBlob 
} from '@/lib/api/document-services';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  FileText, 
  Download, 
  ArrowLeft, 
  FileIcon, 
  CheckCircle2, 
  AlertCircle,
  Loader2
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

export default function StudentCollectionDetailPage() {
  const { id: collectionId } = useParams<{ id: string }>();
  const router = useRouter();
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const { data: collection, isLoading: loadingCol } = useQuery({
    queryKey: ['student', 'documents', 'collection', collectionId],
    queryFn: () => getCollection(collectionId),
    enabled: !!collectionId,
  });

  const { data: documents, isLoading: loadingDocs } = useQuery({
    queryKey: ['student', 'documents', 'collection', collectionId, 'files'],
    queryFn: () => listDocuments(collectionId),
    enabled: !!collectionId,
  });

  const handleDownload = async (docId: string, filename: string) => {
    try {
      setDownloadingId(docId);
      const blob = await downloadDocumentBlob(docId, collectionId);
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success(`Descargando: ${filename}`);
    } catch (err) {
      console.error('Download error:', err);
      toast.error('Error al descargar el archivo');
    } finally {
      setDownloadingId(null);
    }
  };

  if (loadingCol && !collection) {
    return (
      <div className="space-y-6 animate-fade-in">
        <Skeleton className="h-20 w-1/3 mb-10" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-4 mb-2">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => router.back()}
          className="h-9 w-9 rounded-full hover:bg-primary/5"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h2 className="text-2xl font-black tracking-tight">{collection?.name || 'Cargando...'}</h2>
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest mt-0.5">
            Colección de Documentos
          </p>
        </div>
      </div>

      <Card className="border-border/50 overflow-hidden">
        <CardHeader className="bg-muted/30 pb-4">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <FileText className="w-4 h-4 text-indigo-500" />
            Lista de Archivos Disponibles
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loadingDocs ? (
            <div className="p-6 space-y-4">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}
            </div>
          ) : !documents?.length ? (
            <div className="py-20 text-center text-muted-foreground">
              <FileIcon className="w-12 h-12 mx-auto opacity-10 mb-4" />
              <p>Esta colección aún no tiene documentos cargados.</p>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {documents.map((doc) => {
                const isReady = doc.processing_status === 'ready';
                const isDownloading = downloadingId === doc.id;

                return (
                  <div key={doc.id} className="flex items-center justify-between p-4 hover:bg-muted/20 transition-colors group">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className={`p-2.5 rounded-xl ${isReady ? 'bg-green-500/10 text-green-600' : 'bg-amber-500/10 text-amber-600'}`}>
                        <FileIcon className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-sm truncate pr-4">{doc.title}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-[10px] text-muted-foreground uppercase font-black tracking-tighter">
                            {doc.file_extension?.replace('.', '') || 'DOC'} • {Math.round(doc.file_size / 1024)} KB
                          </span>
                          {isReady ? (
                            <Badge variant="outline" className="h-4 text-[9px] bg-green-500/5 text-green-600 border-green-500/10 font-bold">
                              <CheckCircle2 className="w-2.5 h-2.5 mr-1" /> LISTO
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="h-4 text-[9px] bg-amber-500/5 text-amber-600 border-amber-500/10 font-bold">
                              <Loader2 className="w-2.5 h-2.5 mr-1 animate-spin" /> PROCESANDO
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    <Button
                      size="sm"
                      variant={isReady ? 'default' : 'ghost'}
                      className={`h-9 px-4 font-bold gap-2 transition-all ${
                        isReady 
                          ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/20' 
                          : 'opacity-50 grayscale'
                      }`}
                      disabled={!isReady || isDownloading}
                      onClick={() => handleDownload(doc.id, doc.title + (doc.file_extension || ''))}
                    >
                      {isDownloading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Download className="w-4 h-4" />
                      )}
                      {isDownloading ? 'Descargando...' : 'Descargar'}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Disclaimer / Info */}
      <div className="flex items-center gap-3 p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20">
        <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
        <p className="text-xs text-amber-700 leading-relaxed font-medium">
          <strong>Nota de seguridad:</strong> Todos los archivos han sido analizados y son seguros para su descarga. 
          Si tienes problemas para visualizar el contenido, contacta a tu tutor de sede.
        </p>
      </div>
    </div>
  );
}
