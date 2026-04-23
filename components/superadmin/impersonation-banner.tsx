'use client';

import { useState } from 'react';
import { useImpersonationStore } from '@/stores/impersonation-store';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';
import { AlertTriangle, ArrowLeft, Loader2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

export function ImpersonationBanner() {
  const {
    isImpersonating, impersonatedUser, originalTokens,
    originalSuperadminZone, originalUser,
    endImpersonation: clearImpersonation,
  } = useImpersonationStore();
  const authStore = useAuthStore();
  const queryClient = useQueryClient();
  const router = useRouter();
  const [ending, setEnding] = useState(false);

  if (!isImpersonating || !impersonatedUser) return null;

  const handleReturnToSuperAdmin = async () => {
    setEnding(true);

    if (originalTokens) {
      // Restore original superadmin tokens
      authStore.refreshSession(originalTokens.accessToken, originalTokens.refreshToken);

      // Restore original superadmin user identity
      if (originalUser) {
        authStore.setUser({
          id: originalUser.id,
          email: originalUser.email,
          full_name: originalUser.full_name,
          avatar_url: null,
          is_superadmin: originalUser.is_superadmin,
        });
      }

      // Clear context token (superadmin doesn't need it)
      authStore.selectContext({
        contextToken: '',
        zone: { id: '', code: '', name: '' },
        sede: { id: '', name: '', slug: '' },
        role: 'superadmin',
      });

      // Restore superadmin selected zone
      authStore.setSuperadminZone(originalSuperadminZone ?? null);
    } else {
      authStore.logout();
    }

    clearImpersonation();
    queryClient.clear();
    toast.success(`Has dejado de suplantar a ${impersonatedUser.full_name}`);
    router.replace('/superadmin/sedes');
    setEnding(false);
  };

  return (
    <div className="bg-red-600 text-white px-4 py-2 flex items-center justify-center gap-3 text-sm font-medium z-50 relative">
      <AlertTriangle className="h-4 w-4 flex-shrink-0" />
      <span>
        Estás impersonando a <strong>{impersonatedUser.full_name}</strong> ({impersonatedUser.email})
      </span>
      <Button
        variant="outline"
        size="sm"
        className="ml-2 bg-white/20 border-white/40 text-white hover:bg-white/30 h-7 text-xs"
        onClick={handleReturnToSuperAdmin}
        disabled={ending}
      >
        {ending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <ArrowLeft className="h-3 w-3 mr-1" />}
        Volver a SuperAdmin
      </Button>
    </div>
  );
}
