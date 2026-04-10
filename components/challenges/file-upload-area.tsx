'use client';

import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Upload,
  FileText,
  File as FileIcon,
  X,
  AlertCircle,
  Loader2,
} from 'lucide-react';

interface FileUploadAreaProps {
  acceptedFormats: string[];
  maxSizeMB: number;
  onFileSelect: (file: File) => void;
  disabled?: boolean;
  isUploading?: boolean;
}

const FORMAT_LABELS: Record<string, string> = {
  pdf: 'PDF',
  txt: 'TXT',
  text: 'TXT',
  code: 'Código',
  mixed: 'Varios',
};

const MIME_MAP: Record<string, string[]> = {
  pdf: ['application/pdf'],
  txt: ['text/plain'],
  text: ['text/plain'],
  code: ['text/plain', 'application/octet-stream'],
  mixed: ['application/pdf', 'text/plain'],
};

function getAcceptString(formats: string[]): string {
  const mimes = new Set<string>();
  formats.forEach(f => {
    (MIME_MAP[f.toLowerCase()] ?? []).forEach(m => mimes.add(m));
  });
  if (mimes.size === 0) mimes.add('application/pdf').add('text/plain');
  return Array.from(mimes).join(',');
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function FileUploadArea({
  acceptedFormats,
  maxSizeMB,
  onFileSelect,
  disabled = false,
  isUploading = false,
}: FileUploadAreaProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  const acceptStr = getAcceptString(acceptedFormats);

  const validateAndSelect = useCallback(
    (file: File) => {
      setError(null);

      // Check size
      if (file.size > maxSizeBytes) {
        setError(`El archivo excede el tamaño máximo de ${maxSizeMB} MB`);
        return;
      }

      // Check type
      const allowedMimes = new Set<string>();
      acceptedFormats.forEach(f => {
        (MIME_MAP[f.toLowerCase()] ?? []).forEach(m => allowedMimes.add(m));
      });
      if (allowedMimes.size > 0 && !allowedMimes.has(file.type)) {
        const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
        const isAcceptedExt = acceptedFormats.some(
          f => f.toLowerCase() === ext || (f === 'text' && ext === 'txt')
        );
        if (!isAcceptedExt) {
          setError(
            `Formato no aceptado. Se aceptan: ${acceptedFormats
              .map(f => FORMAT_LABELS[f] ?? f.toUpperCase())
              .join(', ')}`
          );
          return;
        }
      }

      setSelectedFile(file);
      setError(null);
    },
    [acceptedFormats, maxSizeBytes, maxSizeMB]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragOver(false);
      if (disabled || isUploading) return;

      const file = e.dataTransfer.files[0];
      if (file) validateAndSelect(file);
    },
    [disabled, isUploading, validateAndSelect]
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) validateAndSelect(file);
      if (inputRef.current) inputRef.current.value = '';
    },
    [validateAndSelect]
  );

  const handleRemoveFile = useCallback(() => {
    setSelectedFile(null);
    setError(null);
  }, []);

  const handleSubmit = useCallback(() => {
    if (selectedFile && !disabled && !isUploading) {
      onFileSelect(selectedFile);
    }
  }, [selectedFile, disabled, isUploading, onFileSelect]);

  const fileExt = selectedFile?.name.split('.').pop()?.toUpperCase() ?? '';

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !disabled && !isUploading && inputRef.current?.click()}
        className={`relative flex flex-col items-center justify-center gap-3 p-8 border-2 border-dashed rounded-lg transition-all cursor-pointer ${
          dragOver
            ? 'border-primary bg-primary/5'
            : disabled || isUploading
              ? 'border-border/30 bg-muted/10 cursor-not-allowed opacity-60'
              : 'border-border/50 hover:border-primary/50 hover:bg-muted/20'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept={acceptStr}
          onChange={handleFileChange}
          className="hidden"
          disabled={disabled || isUploading}
        />

        <Upload className={`w-8 h-8 ${dragOver ? 'text-primary' : 'text-muted-foreground'}`} />

        <div className="text-center">
          <p className="text-sm font-medium">
            {dragOver ? 'Suelta tu archivo aquí' : 'Arrastra tu archivo o haz clic para seleccionar'}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Formatos: {acceptedFormats.map(f => FORMAT_LABELS[f] ?? f.toUpperCase()).join(', ')}
            {' · '}
            Máx. {maxSizeMB} MB
          </p>
        </div>
      </div>

      {/* Error */}
      {error ? (
        <div className="flex items-center gap-2 text-xs text-destructive">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          {error}
        </div>
      ) : null}

      {/* Selected file preview */}
      {selectedFile ? (
        <Card className="bg-muted/20">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  {fileExt === 'PDF' ? (
                    <FileText className="w-5 h-5 text-primary" />
                  ) : (
                    <FileIcon className="w-5 h-5 text-primary" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{selectedFile.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {fileExt} · {formatFileSize(selectedFile.size)}
                  </p>
                </div>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); handleRemoveFile(); }}
                className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                disabled={isUploading}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Submit button */}
      {selectedFile ? (
        <Button
          onClick={handleSubmit}
          disabled={disabled || isUploading}
          className="w-full"
        >
          {isUploading ? (
            <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Enviando...</>
          ) : (
            <><Upload className="w-4 h-4 mr-2" /> Enviar</>  
          )}
        </Button>
      ) : null}
    </div>
  );
}
