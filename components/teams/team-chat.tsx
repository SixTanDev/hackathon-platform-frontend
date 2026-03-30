'use client';

import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-client';
import { getTeamMessages, sendTeamMessage, type TeamMessage } from '@/lib/api/hackathon-services';
import { useAuthStore } from '@/stores/auth-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, MessageSquare, Loader2 } from 'lucide-react';

interface TeamChatProps {
  teamId: string;
  compact?: boolean;
}

export function TeamChat({ teamId, compact = false }: TeamChatProps) {
  const userId = useAuthStore((s) => s?.user?.id);
  const [text, setText] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const { data: messages, isLoading } = useQuery({
    queryKey: queryKeys.teams.messages(teamId),
    queryFn: () => getTeamMessages(teamId),
    enabled: !!teamId,
    refetchInterval: 8 * 1000, // Poll every 8 seconds
  });

  const sendMutation = useMutation({
    mutationFn: (content: string) => sendTeamMessage(teamId, content),
    onSuccess: () => {
      setText('');
      queryClient.invalidateQueries({ queryKey: queryKeys.teams.messages(teamId) });
    },
  });

  // Auto-scroll on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages?.length]);

  function handleSend() {
    const trimmed = text.trim();
    if (!trimmed) return;
    sendMutation.mutate(trimmed);
  }

  const chatHeight = compact ? 'h-52' : 'h-80';

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-primary" />
          Chat del Equipo
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Messages */}
        <ScrollArea className={`${chatHeight} border border-border/30 rounded-lg p-3`}>
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : !messages?.length ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <MessageSquare className="w-8 h-8 text-muted-foreground/30 mb-2" />
              <p className="text-xs text-muted-foreground">No se encontraron mensajes. ¡Inicia la conversación!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {messages.map((msg: TeamMessage) => {
                const isOwn = msg.user_global_id === userId;
                return (
                  <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${
                      isOwn ? 'bg-primary text-primary-foreground' : 'bg-muted'
                    }`}>
                      {!isOwn && (
                        <p className="text-[10px] font-medium mb-0.5 opacity-70">
                          {msg.sender_name ?? msg.user_global_id.slice(0, 8)}
                        </p>
                      )}
                      <p className="break-words">{msg.content}</p>
                      <p className={`text-[9px] mt-1 ${
                        isOwn ? 'text-primary-foreground/60' : 'text-muted-foreground/60'
                      }`}>
                        {new Date(msg.created_at).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>
          )}
        </ScrollArea>

        {/* Input */}
        <div className="flex gap-2">
          <Input
            placeholder="Escribe un mensaje..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            className="flex-1"
          />
          <Button
            size="icon"
            onClick={handleSend}
            disabled={!text.trim() || sendMutation.isPending}
          >
            {sendMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
