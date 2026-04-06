'use client';

import { HackathonCreationWizard } from '@/components/features/hackathons/hackathon-creation-wizard';

export default function CreateHackathonPage() {
  return (
    <div className="p-6">
      <HackathonCreationWizard 
        redirectPath="/admin/hackathons" 
        title="Crear Global Hackathon"
        allowedScopes={['internal', 'zonal', 'open']}
        canLaunchImmediately={true}
        canAssignMentors={true}
        showDocumentCollections={true}
      />
    </div>
  );
}
