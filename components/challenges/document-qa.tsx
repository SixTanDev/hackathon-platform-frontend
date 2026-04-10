'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { useMutation } from '@tanstack/react-query';
import { askDocuments } from '@/lib/api/challenge-services';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Loader2,
  ChevronDown,
  ChevronUp,
  BookOpen,
  Send,
  FileText,
  ExternalLink,
  ThumbsDown,
  Info,
} from 'lucide-react';
import type { AskDocumentsResponse, DocumentSource } from '@/types/api';

// ─── Types ─────────────────────────────────────────────────

interface DocumentQAProps {
  hackathonId: string;
}

interface QAEntry {
  question: string;
  answer: string;
  sources: DocumentSource[];
  timestamp: Date;
  feedbackSent?: boolean;
}

// ─── Source Citation ────────────────────────────────────────

function SourceCitation({ source, index }: { source: DocumentSource; index: number }) {
  return (
    <div className="flex items-start gap-2 p-2 rounded-md bg-muted/30 text-[11px]">
      <Badge variant="outline" className="text-[9px] shrink-0 mt-0.5">
        [{index + 1}]
      </Badge>
      <div className="min-w-0">
        <p className="font-medium text-foreground truncate">
          {source.title}
          {source.page_number != null ? ` — p.${source.page_number}` : ''}
          {source.section_title ? ` · ${source.section_title}` : ''}
        </p>
        <p className="text-muted-foreground line-clamp-2 mt-0.5">{source.excerpt}</p>
      </div>
    </div>
  );
}

// ─── Answer Renderer ────────────────────────────────────────

function AnswerMarkdown({ text }: { text: string }) {
  const html = useMemo(() => {
    let t = text ?? '';
    // Bold
    t = t.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    // Italic
    t = t.replace(/\*(.+?)\*/g, '<em>$1</em>');
    // Inline code (style as emphasis, no code block)
    t = t.replace(/`([^`]+)`/g, '<strong class="text-primary">$1</strong>');
    // Strip code blocks
    t = t.replace(/```[\s\S]*?```/g, '');
    // Source references like [Capítulo 5, p.23]
    t = t.replace(/\[([^\]]+)\]/g, '<span class="text-primary font-medium">[$1]</span>');
    // Lists
    t = t.replace(/^- (.+)$/gm, '<li class="ml-4 list-disc">$1</li>');
    t = t.replace(/^\d+\. (.+)$/gm, '<li class="ml-4 list-decimal">$1</li>');
    // Paragraphs
    t = t.replace(/\n\n/g, '</p><p class="my-1">');
    t = `<p class="my-1">${t}</p>`;
    return t;
  }, [text]);

  return (
    <div
      className="text-xs text-foreground/90 leading-relaxed"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

// ─── Main Component ─────────────────────────────────────────

export function DocumentQA({ hackathonId }: DocumentQAProps) {
  const { toast } = useToast();
  const scrollRef = useRef<HTMLDivElement>(null);

  const [expanded, setExpanded] = useState(false);
  const [question, setQuestion] = useState('');
  const [history, setHistory] = useState<QAEntry[]>([]);
  const [queriesRemaining, setQueriesRemaining] = useState<number | null>(null);

  const markFeedback = (index: number) => {
    setHistory((prev) =>
      prev.map((entry, i) => (i === index ? { ...entry, feedbackSent: true } : entry))
    );
    toast({
      title: 'Retroalimentación enviada',
      description: 'Gracias por tu comentario. Mejoraremos las respuestas.',
    });
  };

  // Scroll to bottom on new answer
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history.length]);

  const askMutation = useMutation({
    mutationFn: (q: string) =>
      askDocuments({
        question: q,
        hackathon_id: hackathonId,
        max_sources: 3,
      }),
    onSuccess: (data: AskDocumentsResponse, q: string) => {
      setHistory((prev) => [
        ...prev,
        {
          question: q,
          answer: data.answer,
          sources: data.sources,
          timestamp: new Date(),
        },
      ]);
      setQuestion('');
      if (data.queries_remaining != null) {
        setQueriesRemaining(data.queries_remaining);
      }
    },
    onError: (err: any) => {
      const detail = err?.response?.data?.detail ?? '';
      if (typeof detail === 'string' && detail.includes('RATE_LIMIT')) {
        toast({
          title: 'Límite alcanzado',
          description: 'Has excedido el número de consultas permitidas.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Error',
          description: 'No se pudo consultar los documentos.',
          variant: 'destructive',
        });
      }
    },
  });

  const handleSubmit = () => {
    const q = question.trim();
    if (!q || askMutation.isPending) return;
    askMutation.mutate(q);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="border border-border/50 rounded-lg">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-3 text-sm hover:bg-muted/30 transition-colors"
      >
        <span className="flex items-center gap-2 font-medium">
          <BookOpen className="w-4 h-4 text-secondary" />
          📚 Consultar Documentos del Curso
          {history.length > 0 ? (
            <Badge variant="secondary" className="text-[10px]">
              {history.length} consulta{history.length !== 1 ? 's' : ''}
            </Badge>
          ) : null}
        </span>
        {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      {expanded ? (
        <div className="px-3 pb-3 space-y-3">
          {/* Rate limit info */}
          {queriesRemaining != null ? (
            <p className="text-[11px] text-muted-foreground">
              Consultas restantes: <span className="font-bold text-secondary">{queriesRemaining}</span>
            </p>
          ) : (
            <p className="text-[11px] text-muted-foreground">
              Consulta los materiales del curso vinculados a este hackathon.
            </p>
          )}

          {/* Question input */}
          <div className="space-y-2">
            <Textarea
              placeholder="Haz una pregunta sobre los materiales del curso..."
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={handleKeyDown}
              className="text-xs h-16 resize-none"
            />
            <Button
              size="sm"
              variant="outline"
              onClick={handleSubmit}
              disabled={askMutation.isPending || !question.trim()}
              className="w-full text-xs"
            >
              {askMutation.isPending ? (
                <Loader2 className="w-3 h-3 animate-spin mr-1" />
              ) : (
                <Send className="w-3 h-3 mr-1" />
              )}
              Consultar
            </Button>
          </div>

          {/* QA History */}
          {history.length > 0 ? (
            <div
              ref={scrollRef}
              className="max-h-[320px] overflow-y-auto space-y-3 pr-1"
            >
              {history.map((entry, i) => (
                <div key={i} className="space-y-2">
                  {/* Question */}
                  <div className="flex items-start gap-2">
                    <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-[10px]">👤</span>
                    </div>
                    <p className="text-xs font-medium">{entry.question}</p>
                  </div>

                  {/* Answer */}
                  <div className="flex items-start gap-2">
                    <div className="w-5 h-5 rounded-full bg-secondary/10 flex items-center justify-center shrink-0 mt-0.5">
                      <FileText className="w-3 h-3 text-secondary" />
                    </div>
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <AnswerMarkdown text={entry.answer} />

                      {/* Sources */}
                      {entry.sources.length > 0 ? (
                        <div className="space-y-1 mt-2">
                          <p className="text-[10px] text-muted-foreground font-medium">Fuentes:</p>
                          {entry.sources.map((src, si) => (
                            <SourceCitation key={si} source={src} index={si} />
                          ))}
                        </div>
                      ) : null}

                      {/* Disclaimer */}
                      <div className="flex items-center gap-1.5 mt-2 p-1.5 rounded bg-secondary/5 border border-secondary/10">
                        <Info className="w-3 h-3 text-secondary shrink-0" />
                        <p className="text-[10px] text-muted-foreground leading-tight">
                          La IA respondió basándose en los documentos del curso. Verifica la información con tus materiales.
                        </p>
                      </div>

                      {/* Feedback + timestamp row */}
                      <div className="flex items-center justify-between mt-1.5">
                        <p className="text-[10px] text-muted-foreground/60">
                          {entry.timestamp.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                        {entry.feedbackSent ? (
                          <span className="text-[10px] text-muted-foreground">✓ Retroalimentación enviada</span>
                        ) : (
                          <button
                            onClick={() => markFeedback(i)}
                            className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-destructive transition-colors"
                          >
                            <ThumbsDown className="w-3 h-3" />
                            No es útil
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {i < history.length - 1 ? (
                    <div className="border-b border-border/30" />
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}

          {/* Loading state */}
          {askMutation.isPending ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
              <Loader2 className="w-3 h-3 animate-spin" />
              Buscando en los materiales del curso...
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
