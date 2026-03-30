'use client';

import { useAuthStore } from '@/stores/auth-store';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Beaker, Users, FileText, Code2, Trophy, TrendingUp } from 'lucide-react';

export default function ResearchDashboardPage() {
  const user = useAuthStore((s) => s?.user);
  const currentSede = useAuthStore((s) => s?.currentSede);

  const stats = [
    { label: 'Miembros del grupo', value: '—', icon: Users, color: 'text-primary', bg: 'bg-primary/10' },
    { label: 'Retos creados', value: '—', icon: Code2, color: 'text-secondary', bg: 'bg-secondary/10' },
    { label: 'Documentos', value: '—', icon: FileText, color: 'text-accent', bg: 'bg-accent/10' },
    { label: 'Hackathones', value: '—', icon: Trophy, color: 'text-unad-gold', bg: 'bg-unad-gold/10' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Grupo de Investigación"
        description={`Director: ${user?.full_name ?? 'Director'}. Sede: ${currentSede?.name ?? 'sede'}`}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <Card key={i} className="border-border/50 hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    <p className="text-2xl font-bold mt-1">{stat.value}</p>
                  </div>
                  <div className={`w-10 h-10 rounded-lg ${stat.bg} flex items-center justify-center`}>
                    <Icon className={`w-5 h-5 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Beaker className="w-4 h-4 text-primary" />
              Mi grupo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Configura tu grupo de investigación.</p>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-secondary" />
              Actividad reciente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Sin actividad registrada aún.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
