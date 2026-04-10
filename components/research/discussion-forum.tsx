'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listDiscussions,
  getDiscussionMessages,
  createDiscussion,
  postDiscussionMessage,
} from '@/lib/api/research-services';
import type { DiscussionThread, DiscussionMessage } from '@/lib/api/research-services';
import { queryKeys } from '@/lib/query-client';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  MessageSquare,
  Plus,
  ArrowLeft,
  Send,
  Loader2,
  Clock,
  User,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface DiscussionForumProps {
  groupId: string;
}

// ─── Thread List View ──────────────────────────────────────────

function ThreadList({
  groupId,
  onSelect,
  onCreateNew,
}: {
  groupId: string;
  onSelect: (t: DiscussionThread) => void;
  onCreateNew: () => void;
}) {
  const { data: threads, isLoading } = useQuery({
    queryKey: queryKeys.research.discussions(groupId),
    queryFn: () => listDiscussions(groupId),
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {threads?.length ?? 0} hilo{(threads?.length ?? 0) !== 1 ? 's' : ''} de discusión
        </p>
        <Button size="sm" onClick={onCreateNew}>
          <Plus className="w-3.5 h-3.5 mr-1" />
          Nuevo Hilo
        </Button>
      </div>

      {(!threads || threads.length === 0) ? (
        <Card className="border-border/50 border-dashed">
          <CardContent className="flex flex-col items-center py-12 text-center">
            <MessageSquare className="w-10 h-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm font-medium">Sin discusiones aún</p>
            <p className="text-xs text-muted-foreground mt-1">Crea un nuevo hilo para iniciar una conversación.</p>
          </CardContent>
        </Card>
      ) : (
        threads.map((t) => (
          <Card
            key={t.id}
            className="border-border/50 hover:shadow-sm hover:border-primary/20 transition-all cursor-pointer group"
            onClick={() => onSelect(t)}
          >
            <CardContent className="p-4 flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                <MessageSquare className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium group-hover:text-primary transition-colors truncate">
                  {t.title}
                </p>
                <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <User className="w-3 h-3" />
                    {t.created_by?.full_name ?? 'Desconocido'}
                  </span>
                  <span className="flex items-center gap-1">
                    <MessageSquare className="w-3 h-3" />
                    {t.message_count ?? 0} mensaje{(t.message_count ?? 0) !== 1 ? 's' : ''}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatDistanceToNow(new Date(t.last_activity ?? t.created_at), { addSuffix: true, locale: es })}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}

// ─── Thread Messages View ──────────────────────────────────────

function ThreadMessages({
  groupId,
  thread,
  onBack,
}: {
  groupId: string;
  thread: DiscussionThread;
  onBack: () => void;
}) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const userId = useAuthStore((s) => s?.user?.id);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [reply, setReply] = useState('');

  const { data: messages, isLoading } = useQuery({
    queryKey: queryKeys.research.messages(groupId, thread.id),
    queryFn: () => getDiscussionMessages(groupId, thread.id),
    refetchInterval: 10000,
  });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages?.length]);

  const sendMut = useMutation({
    mutationFn: (content: string) => postDiscussionMessage(groupId, thread.id, content),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.research.messages(groupId, thread.id) });
      qc.invalidateQueries({ queryKey: queryKeys.research.discussions(groupId) });
      setReply('');
    },
    onError: () => toast({ title: 'Error', description: 'No se pudo enviar el mensaje.', variant: 'destructive' }),
  });

  const handleSend = () => {
    const text = reply.trim();
    if (!text || sendMut.isPending) return;
    sendMut.mutate(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const initials = (name: string) =>
    name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();

  // Simple markdown
  const renderContent = (text: string) => {
    let t = text;
    t = t.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    t = t.replace(/\*(.+?)\*/g, '<em>$1</em>');
    t = t.replace(/`([^`]+)`/g, '<code class="px-1 py-0.5 bg-muted rounded text-[11px]">$1</code>');
    t = t.replace(/\n/g, '<br/>');
    return t;
  };

  return (
    <div className="flex flex-col h-[500px]">
      {/* Header */}
      <div className="flex items-center gap-2 pb-3 border-b border-border/50">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="min-w-0">
          <h4 className="text-sm font-semibold truncate">{thread.title}</h4>
          <p className="text-[11px] text-muted-foreground">
            por {thread.created_by?.full_name} · {thread.message_count ?? 0} mensaje{(thread.message_count ?? 0) !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto py-3 space-y-4">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded" />)}
          </div>
        ) : (!messages || messages.length === 0) ? (
          <p className="text-sm text-muted-foreground text-center py-8">Sin mensajes aún.</p>
        ) : (
          messages.map((msg) => {
            const isMe = msg.author?.user_id === userId;
            return (
              <div key={msg.id} className={`flex gap-2.5 ${isMe ? 'flex-row-reverse' : ''}`}>
                <Avatar className="w-7 h-7 shrink-0">
                  <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                    {initials(msg.author?.full_name ?? '??')}
                  </AvatarFallback>
                </Avatar>
                <div className={`max-w-[75%] ${isMe ? 'text-right' : ''}`}>
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-[11px] font-medium">{msg.author?.full_name}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true, locale: es })}
                    </span>
                  </div>
                  <div
                    className={`text-sm p-2.5 rounded-lg leading-relaxed ${
                      isMe ? 'bg-primary/10 text-foreground' : 'bg-muted/50 text-foreground'
                    }`}
                    dangerouslySetInnerHTML={{ __html: renderContent(msg.content) }}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Reply */}
      <div className="flex gap-2 pt-3 border-t border-border/50">
        <Textarea
          placeholder="Escribe un mensaje..."
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          onKeyDown={handleKeyDown}
          className="text-sm h-10 min-h-[40px] resize-none"
          rows={1}
        />
        <Button size="icon" onClick={handleSend} disabled={!reply.trim() || sendMut.isPending}>
          {sendMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </Button>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────

export function DiscussionForum({ groupId }: DiscussionForumProps) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [activeThread, setActiveThread] = useState<DiscussionThread | null>(null);
  const [showNewThread, setShowNewThread] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');

  const createMut = useMutation({
    mutationFn: () => createDiscussion(groupId, { title: newTitle.trim() }),
    onSuccess: (t) => {
      qc.invalidateQueries({ queryKey: queryKeys.research.discussions(groupId) });
      setShowNewThread(false);
      setNewTitle('');
      setNewContent('');
      setActiveThread(t);
      toast({ title: 'Hilo creado' });
    },
    onError: () => toast({ title: 'Error', description: 'No se pudo crear el hilo.', variant: 'destructive' }),
  });

  if (activeThread) {
    return (
      <ThreadMessages
        groupId={groupId}
        thread={activeThread}
        onBack={() => setActiveThread(null)}
      />
    );
  }

  return (
    <div>
      <ThreadList
        groupId={groupId}
        onSelect={setActiveThread}
        onCreateNew={() => setShowNewThread(true)}
      />

      {/* New thread dialog */}
      <Dialog open={showNewThread} onOpenChange={setShowNewThread}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo Hilo de Discusión</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Título *</Label>
              <Input
                placeholder="Título del hilo..."
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Primer mensaje *</Label>
              <Textarea
                placeholder="Escribe el contenido inicial del hilo..."
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewThread(false)}>Cancelar</Button>
            <Button
              onClick={() => createMut.mutate()}
              disabled={!newTitle.trim() || !newContent.trim() || createMut.isPending}
            >
              {createMut.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Crear Hilo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
