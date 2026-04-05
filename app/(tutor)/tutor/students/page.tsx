'use client';

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-client';
import apiClient from '@/lib/api/client';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, User, Mail, Shield, UserCheck } from 'lucide-react';

/* 
  ── OpenAPI Analysis for /tutor/students ──
  As /teams/assigned is NOT in the OpenAPI (openapi.json), we switch to the 
  documented endpoint for listing users in a sede/context: GET /admin/users 
  Filtered by role_global_id=student if the backend supports it, or manual filtering.
*/

interface GlobalUserRead {
  id: string;
  email: string;
  full_name: string;
  username: string;
  is_active: boolean;
  role_global_id: string; // 'student' | 'tutor' | 'admin' | 'superadmin'
  created_at: string;
}

async function listStudentsOpenAPI() {
  // GET /admin/users (operationId: list_users_api_v1_admin_users_get)
  const res = await apiClient.get<GlobalUserRead[]>('/admin/users', { 
    params: { skip: 0, limit: 100 } 
  });
  // Filter for students only to strictly match the "Students" page intent
  return res.data.filter(u => u.role_global_id === 'student');
}

export default function TutorStudentsPage() {
  const { data: students, isLoading } = useQuery({
    queryKey: ['tutor', 'students', 'openapi'],
    queryFn: listStudentsOpenAPI,
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader 
        title="Estudiantes" 
        description="Listado de estudiantes disponibles en el contexto actual para tu sede y zona." 
      />

      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
        {isLoading ? (
          Array.from({ length: 9 }).map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-xl" />)
        ) : !students?.length ? (
          <Card className="col-span-full py-16 text-center text-muted-foreground">
            <Users className="w-12 h-12 mx-auto opacity-20 mb-3" />
            <p>No se encontraron estudiantes registrados</p>
          </Card>
        ) : (
          students.map((student) => (
            <Card key={student.id} className="overflow-hidden hover:border-primary/50 transition-colors">
              <CardContent className="p-0">
                <div className="p-4 flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                    <User className="h-6 w-6" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-sm truncate">{student.full_name}</h3>
                    <div className="flex items-center text-xs text-muted-foreground mt-0.5">
                      <Mail className="h-3 w-3 mr-1" />
                      <span className="truncate">{student.email}</span>
                    </div>
                  </div>
                </div>
                <div className="bg-muted/30 px-4 py-2 border-t border-border/50 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Shield className="h-3 w-3 text-unad-gold" />
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Estudiante</span>
                  </div>
                  {student.is_active && (
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-0 text-[9px] h-4">
                      <UserCheck className="h-2.5 w-2.5 mr-1" />
                      Activo
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
