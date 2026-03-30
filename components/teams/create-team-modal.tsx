'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-client';
import { createTeam } from '@/lib/api/hackathon-services';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Users } from 'lucide-react';

interface CreateTeamModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hackathonId: string;
  maxTeamSize: number;
  onCreated?: (teamId: string) => void;
}

export function CreateTeamModal({
  open,
  onOpenChange,
  hackathonId,
  maxTeamSize,
  onCreated,
}: CreateTeamModalProps) {
  const [name, setName] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (teamName: string) => createTeam(hackathonId, { name: teamName }),
    onSuccess: (team) => {
      toast({ title: 'Equipo creado', description: `"${team.name}" creado exitosamente. ¡Ahora invita a tus compañeros!` });
      queryClient.invalidateQueries({ queryKey: queryKeys.hackathons.teams(hackathonId) });
      setName('');
      onOpenChange(false);
      onCreated?.(team.id);
    },
    onError: () => {
      toast({ title: 'Error', description: 'No se pudo crear el equipo. Intenta de nuevo.', variant: 'destructive' });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Crear Equipo
          </DialogTitle>
          <DialogDescription>
            Crea un equipo para este hackathon. Serás el líder del equipo.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="team-name">Nombre del equipo</Label>
            <Input
              id="team-name"
              placeholder="Ej: Los Innovadores"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={60}
            />
          </div>
          <div className="text-sm text-muted-foreground bg-muted/30 rounded-lg p-3">
            <p>Tamaño máximo del equipo: <span className="font-semibold text-foreground">{maxTeamSize} miembros</span></p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            onClick={() => mutation.mutate(name.trim())}
            disabled={!name.trim() || mutation.isPending}
          >
            {mutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
            Crear Equipo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
