'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getProjectTasks,
  createTask,
  updateTask,
} from '@/lib/api/research-services';
import type { ResearchProject, ProjectTask, ResearchMember } from '@/lib/api/research-services';
import { queryKeys } from '@/lib/query-client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Plus,
  Loader2,
  CheckCircle2,
  Circle,
  Clock,
  Calendar,
  User,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ProjectDetailModalProps {
  open: boolean;
  onClose: () => void;
  groupId: string;
  project: ResearchProject;
  members: ResearchMember[];
}

const STATUS_ICON: Record<string, React.ReactNode> = {
  todo: <Circle className="w-3.5 h-3.5 text-muted-foreground" />,
  in_progress: <Clock className="w-3.5 h-3.5 text-accent" />,
  done: <CheckCircle2 className="w-3.5 h-3.5 text-secondary" />,
};

const STATUS_LABEL: Record<string, string> = {
  todo: 'Pendiente',
  in_progress: 'En progreso',
  done: 'Completada',
};

export function ProjectDetailModal({ open, onClose, groupId, project, members }: ProjectDetailModalProps) {
  const { toast } = useToast();
  const qc = useQueryClient();

  const [showAddTask, setShowAddTask] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskAssignee, setTaskAssignee] = useState('');
  const [taskDue, setTaskDue] = useState('');

  const { data: tasks, isLoading } = useQuery({
    queryKey: queryKeys.research.tasks(groupId, project.id),
    queryFn: () => getProjectTasks(groupId, project.id),
    enabled: open,
  });

  const createMut = useMutation({
    mutationFn: () =>
      createTask(groupId, project.id, {
        title: taskTitle.trim(),
        assigned_to_user_id: taskAssignee || undefined,
        due_date: taskDue || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.research.tasks(groupId, project.id) });
      qc.invalidateQueries({ queryKey: queryKeys.research.projects(groupId) });
      setTaskTitle('');
      setTaskAssignee('');
      setTaskDue('');
      setShowAddTask(false);
      toast({ title: 'Tarea creada' });
    },
    onError: () => toast({ title: 'Error', description: 'No se pudo crear la tarea.', variant: 'destructive' }),
  });

  const toggleMut = useMutation({
    mutationFn: (task: ProjectTask) => {
      const next = task.status === 'done' ? 'todo' : 'done';
      return updateTask(groupId, project.id, task.id, { status: next });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.research.tasks(groupId, project.id) });
      qc.invalidateQueries({ queryKey: queryKeys.research.projects(groupId) });
    },
  });

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-lg">{project.title}</DialogTitle>
          {project.description && (
            <p className="text-sm text-muted-foreground mt-1">{project.description}</p>
          )}
        </DialogHeader>

        <div className="space-y-4 max-h-[400px] overflow-y-auto">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold">Tareas</h4>
            <Button size="sm" variant="outline" onClick={() => setShowAddTask(true)}>
              <Plus className="w-3.5 h-3.5 mr-1" />
              Agregar Tarea
            </Button>
          </div>

          {showAddTask && (
            <div className="space-y-2 p-3 rounded-lg border border-border/50 bg-muted/20">
              <Input
                placeholder="Título de la tarea"
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                autoFocus
              />
              <div className="flex gap-2">
                <Select value={taskAssignee} onValueChange={setTaskAssignee}>
                  <SelectTrigger className="flex-1 text-xs">
                    <SelectValue placeholder="Asignar a..." />
                  </SelectTrigger>
                  <SelectContent>
                    {members.map((m) => {
                      const uid = m.user_global_id ?? m.user_id ?? m.id ?? '';
                      return (
                        <SelectItem key={uid} value={uid} className="text-xs">
                          {m.full_name ?? uid}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                <Input
                  type="date"
                  value={taskDue}
                  onChange={(e) => setTaskDue(e.target.value)}
                  className="w-36 text-xs"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button size="sm" variant="ghost" onClick={() => setShowAddTask(false)}>Cancelar</Button>
                <Button size="sm" onClick={() => createMut.mutate()} disabled={!taskTitle.trim() || createMut.isPending}>
                  {createMut.isPending && <Loader2 className="w-3 h-3 animate-spin mr-1" />}
                  Crear
                </Button>
              </div>
            </div>
          )}

          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full rounded" />)}
            </div>
          ) : !tasks || tasks.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Sin tareas aún</p>
          ) : (
            <div className="space-y-1">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center gap-3 p-2.5 rounded-md hover:bg-muted/30 transition-colors group"
                >
                  <button
                    onClick={() => toggleMut.mutate(task)}
                    className="shrink-0"
                    title={task.status === 'done' ? 'Marcar pendiente' : 'Marcar completada'}
                  >
                    {STATUS_ICON[task.status] ?? STATUS_ICON.todo}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${task.status === 'done' ? 'line-through text-muted-foreground' : ''}`}>
                      {task.title}
                    </p>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                      {task.assigned_to_user_id && (
                        <span className="flex items-center gap-0.5">
                          <User className="w-2.5 h-2.5" />
                          {members.find((m) => (m.user_global_id ?? m.user_id ?? m.id) === task.assigned_to_user_id)?.full_name ?? String(task.assigned_to_user_id)}
                        </span>
                      )}
                      {task.due_date && (
                        <span className="flex items-center gap-0.5">
                          <Calendar className="w-2.5 h-2.5" />
                          {new Date(task.due_date).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}
                        </span>
                      )}
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[9px] shrink-0">
                    {STATUS_LABEL[task.status] ?? task.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}