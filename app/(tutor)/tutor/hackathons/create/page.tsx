'use client';

import { HackathonCreationWizard } from '@/components/features/hackathons/hackathon-creation-wizard';

export default function CreateTutorHackathonPage() {
  return (
    <div className="p-6">
      <HackathonCreationWizard 
        redirectPath="/tutor/hackathons" 
        title="Crear Nuevo Hackathon de Sede" 
      />
    </div>
  );
}
