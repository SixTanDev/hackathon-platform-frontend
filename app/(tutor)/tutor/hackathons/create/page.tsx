'use client';

import { HackathonCreationWizard } from '@/components/features/hackathons/hackathon-creation-wizard';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Info } from 'lucide-react';

export default function CreateTutorHackathonPage() {
  return (
    <div className="space-y-4 px-3 py-4 sm:p-6">
      <Alert className="border-sky-200 bg-sky-50 shadow-sm [&>svg]:text-sky-700 dark:border-sky-900/40 dark:bg-sky-950/30 dark:[&>svg]:text-sky-300">
        <Info className="h-4 w-4" />
        <AlertTitle className="text-sky-900 dark:text-sky-100">Información importante</AlertTitle>
        <AlertDescription className="text-slate-700 dark:text-slate-200">
          Este asistente ya está disponible para el rol tutor, pero el guardado de borradores aún
          depende de permisos backend que pueden no estar habilitados en todos los contextos.
        </AlertDescription>
      </Alert>
      <HackathonCreationWizard 
        redirectPath="/tutor/hackathons" 
        title="Crear Nuevo Hackathon de Sede" 
        allowedScopes={['internal', 'zonal']}
        canLaunchImmediately={false}
      />
    </div>
  );
}
