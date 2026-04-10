'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-client';
import {
  getTeamDetail,
  inviteToTeam,
  removeTeamMember,
  acceptInvitation,
  declineInvitation,
  type SedeUserResult,
} from '@/lib/api/hackathon-services';
import { useAuthStore } from '@/stores/auth-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { InviteSearch } from '@/components/teams/invite-search';
import { TeamChat } from '@/components/teams/team-chat';
import { useToast } from '@/hooks/use-toast';
import {
  Users,
  Crown,
  User as UserIcon,
  Trash2,
  BarChart3,
  Loader2,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Clock,
} from 'lucide-react';
import Link from 'next/link';
import type { TeamMember } from '@/types/api';

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  forming: { label: 'Formándose', color: 'bg-unad-gold/10 text-unad-gold' },
  ready: { label: 'Listo', color: 'bg-secondary/10 text-secondary' },
  active: { label: 'Activo', color: 'bg-emerald-500/10 text-emerald-500' },
  disbanded: { label: 'Disuelto', color: 'bg-destructive/10 text-destructive' },
};

const MEMBER_STATUS_ICON: Record<string, React.ElementType> = {
  accepted: CheckCircle2,
  invited: Clock,
  declined: XCircle,
  removed: XCircle,
};

export default function TeamDetailPage() {
  const { id: teamId } = useParams<{ id: string }>();
  const router = useRouter();
  const userId = useAuthStore((s) => s?.user?.id);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: team, isLoading, error } = useQuery({
    queryKey: queryKeys.teams.detail(teamId),
    queryFn: () => getTeamDetail(teamId),
    enabled: !!teamId,
  });

  const isLeader = team?.created_by_user_id === userId ||
    team?.members?.some((m) => m.user_global_id === userId && m.role === 'leader');

  const existingMemberIds = team?.members?.map((m) => m.user_global_id) ?? [];

  // Invite mutation
  const inviteMutation = useMutation({
    mutationFn: (user: SedeUserResult) =>
      inviteToTeam(teamId, { user_global_id: user.user_global_id || user.id, email: user.email }),
    onSuccess: () => {
      toast({ title: 'Invitación enviada' });
      queryClient.invalidateQueries({ queryKey: queryKeys.teams.detail(teamId) });
    },
    onError: () => {
      toast({ title: 'Error', description: 'No se pudo enviar la invitación.', variant: 'destructive' });
    },
  });

  // Remove member mutation
  const removeMutation = useMutation({
    mutationFn: (memberId: string) => removeTeamMember(teamId, memberId),
    onSuccess: () => {
      toast({ title: 'Miembro removido' });
      queryClient.invalidateQueries({ queryKey: queryKeys.teams.detail(teamId) });
    },
    onError: () => {
      toast({ title: 'Error', description: 'No se pudo remover al miembro.', variant: 'destructive' });
    },
  });

  // Accept / Decline (for invited user viewing this page)
  const acceptMutation = useMutation({
    mutationFn: (invitationId: string) => acceptInvitation(teamId, invitationId),
    onSuccess: () => {
      toast({ title: '¡Te has unido al equipo!' });
      queryClient.invalidateQueries({ queryKey: queryKeys.teams.detail(teamId) });
    },
  });

  const declineMutation = useMutation({
    mutationFn: (invitationId: string) => declineInvitation(teamId, invitationId),
    onSuccess: () => {
      toast({ title: 'Invitación rechazada' });
      router.push('/dashboard');
    },
  });

  const myMembership = team?.members?.find((m) => m.user_global_id === userId);
  const isPendingInvite = myMembership?.status === 'invited';
  const isMember = myMembership?.status === 'accepted';

  const statusCfg = STATUS_CONFIG[team?.status ?? ''] ?? { label: team?.status ?? '', color: 'bg-muted text-muted-foreground' };

  if (isLoading) {
    return (
      <div className="space-y-4 animate-fade-in">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (error || !team) {
    return (
      <div className="text-center py-16">
        <Users className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
        <p className="text-muted-foreground">Equipo no encontrado o sin acceso.</p>
        <Button variant="outline" className="mt-4" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Volver
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{team.name}</h1>
            <Badge className={`${statusCfg.color} border-0`}>{statusCfg.label}</Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {team.members?.filter((m) => m.status === 'accepted').length ?? 0}/{team.max_size} miembros
          </p>
        </div>
        <Link href={`/dashboard/teams/${teamId}/progress`}>
          <Button variant="outline" size="sm" className="gap-1.5">
            <BarChart3 className="w-4 h-4" /> Progreso
          </Button>
        </Link>
      </div>

      {/* Pending invite banner */}
      {isPendingInvite && (
        <Card className="border-unad-gold/30 bg-unad-gold/5">
          <CardContent className="py-4 flex items-center justify-between">
            <p className="text-sm font-medium">Te han invitado a este equipo.</p>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => acceptMutation.mutate(myMembership!.id)}
                disabled={acceptMutation.isPending}
              >
                {acceptMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
                Aceptar
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => declineMutation.mutate(myMembership!.id)}
                disabled={declineMutation.isPending}
              >
                Rechazar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Members */}
      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            Miembros del Equipo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {team.members?.map((m: TeamMember) => {
            const StatusIcon = MEMBER_STATUS_ICON[m.status] ?? Clock;
            const isMe = m.user_global_id === userId;
            return (
              <div key={m.id} className="flex items-center justify-between py-2 px-1 rounded hover:bg-muted/30 transition-colors">
                <div className="flex items-center gap-2">
                  {m.role === 'leader' ? (
                    <Crown className="w-4 h-4 text-unad-gold" />
                  ) : (
                    <UserIcon className="w-4 h-4 text-muted-foreground" />
                  )}
                  <span className="text-sm font-medium">{m.user_global_id.slice(0, 12)}</span>
                  {isMe && <Badge variant="secondary" className="text-[10px]">Tú</Badge>}
                  <Badge variant="outline" className="text-[10px] capitalize">
                    {m.role === 'leader' ? 'Líder' : 'Miembro'}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <StatusIcon className={`w-3.5 h-3.5 ${
                      m.status === 'accepted' ? 'text-emerald-500' :
                      m.status === 'invited' ? 'text-unad-gold' : 'text-destructive'
                    }`} />
                    {m.status === 'accepted' ? 'Activo' : m.status === 'invited' ? 'Pendiente' : m.status === 'declined' ? 'Rechazada' : m.status}
                  </div>
                  {isLeader && !isMe && m.status !== 'removed' && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => removeMutation.mutate(m.id)}
                      disabled={removeMutation.isPending}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Invite Section (leader only) */}
      {isLeader && (
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Invitar Miembro</CardTitle>
          </CardHeader>
          <CardContent>
            <InviteSearch
              onInvite={(user) => inviteMutation.mutate(user)}
              isInviting={inviteMutation.isPending}
              existingMemberIds={existingMemberIds}
            />
          </CardContent>
        </Card>
      )}

      {/* Team Chat (members only) */}
      {isMember && (
        <TeamChat teamId={teamId} />
      )}
    </div>
  );
}
