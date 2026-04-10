'use client';

import { useState, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateProject } from '@/lib/api/research-services';
import type { ResearchProject } from '@/lib/api/research-services';
import { queryKeys } from '@/lib/query-client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  Users,
  CheckCircle2,
  ListTodo,
  GripVertical,
} from 'lucide-react';

type ColumnStatus = 'planning' | 'in_progress' | 'completed';

const COLUMNS: { key: ColumnStatus; label: string; color: string; bg: string }[] = [
  { key: 'planning', label: 'Planificación', color: 'text-muted-foreground', bg: 'bg-muted/30' },
  { key: 'in_progress', label: 'En Progreso', color: 'text-accent', bg: 'bg-accent/10' },
  { key: 'completed', label: 'Completado', color: 'text-secondary', bg: 'bg-secondary/10' },
];

interface KanbanBoardProps {
  groupId: string;
  projects: ResearchProject[];
  onProjectClick: (project: ResearchProject) => void;
}

export function KanbanBoard({ groupId, projects, onProjectClick }: KanbanBoardProps) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [dragItem, setDragItem] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<ColumnStatus | null>(null);

  const moveMut = useMutation({
    mutationFn: ({ projectId, status }: { projectId: string; status: ColumnStatus }) =>
      updateProject(groupId, projectId, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.research.projects(groupId) });
    },
    onError: () => toast({ title: 'Error', description: 'No se pudo mover el proyecto.', variant: 'destructive' }),
  });

  const byStatus = (status: ColumnStatus) =>
    projects.filter((p) => (p.status ?? 'planning') === status);

  const handleDragStart = (e: React.DragEvent, projectId: string) => {
    setDragItem(projectId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', projectId);
  };

  const handleDragOver = (e: React.DragEvent, status: ColumnStatus) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOver(status);
  };

  const handleDrop = (e: React.DragEvent, status: ColumnStatus) => {
    e.preventDefault();
    setDragOver(null);
    const projectId = e.dataTransfer.getData('text/plain');
    if (!projectId) return;
    const project = projects.find((p) => p.id === projectId);
    if (!project || project.status === status) return;
    setDragItem(null);
    moveMut.mutate({ projectId, status });
  };

  const handleDragEnd = () => {
    setDragItem(null);
    setDragOver(null);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {COLUMNS.map((col) => {
        const items = byStatus(col.key);
        const isOver = dragOver === col.key;
        return (
          <div
            key={col.key}
            className={`rounded-lg border border-border/50 p-3 min-h-[300px] transition-colors ${
              isOver ? 'border-primary/50 bg-primary/5' : 'bg-card/50'
            }`}
            onDragOver={(e) => handleDragOver(e, col.key)}
            onDragLeave={() => setDragOver(null)}
            onDrop={(e) => handleDrop(e, col.key)}
          >
            <div className={`flex items-center gap-2 mb-3 px-1`}>
              <div className={`w-2 h-2 rounded-full ${col.bg.replace('/10', '')} ${col.color}`} />
              <h4 className={`text-sm font-semibold ${col.color}`}>{col.label}</h4>
              <Badge variant="outline" className="text-[10px] ml-auto">{items.length}</Badge>
            </div>

            <div className="space-y-2">
              {items.map((project) => (
                <Card
                  key={project.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, project.id)}
                  onDragEnd={handleDragEnd}
                  onClick={() => onProjectClick(project)}
                  className={`border-border/40 cursor-pointer hover:shadow-sm hover:border-primary/30 transition-all group ${
                    dragItem === project.id ? 'opacity-50 scale-95' : ''
                  }`}
                >
                  <CardContent className="p-3 space-y-2">
                    <div className="flex items-start gap-2">
                      <GripVertical className="w-3.5 h-3.5 text-muted-foreground/40 mt-0.5 shrink-0 cursor-grab" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium group-hover:text-primary transition-colors truncate">
                          {project.title}
                        </p>
                        {project.description && (
                          <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">
                            {project.description}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <ListTodo className="w-3 h-3" />
                        {project.task_count ?? 0} tarea{(project.task_count ?? 0) !== 1 ? 's' : ''}
                      </span>
                      {Array.isArray(project.assigned_members) && (project.assigned_members as unknown[]).length > 0 && (
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {(project.assigned_members as unknown[]).length}
                        </span>
                      )}
                      {project.completed_task_count != null && (project.task_count ?? 0) > 0 && (
                        <span className="flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-secondary" />
                          {project.completed_task_count}/{project.task_count}
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
              {items.length === 0 && (
                <div className="text-center text-[11px] text-muted-foreground/50 py-8 border border-dashed border-border/30 rounded-md">
                  Arrastra proyectos aquí
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
