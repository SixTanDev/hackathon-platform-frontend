import { useAuthStore } from '@/stores/auth-store';

/**
 * Known user mappings for the SAMP / UNAD platform.
 * Ensures that even when backend endpoints return raw member UUIDs,
 * real student and admin names are displayed across leaderboards and rankings.
 */
export const KNOWN_USERS_MAP: Record<string, string> = {
  'f5b21246-069e-4822-a7d5-c8650ee77a35': 'estudiante1',
  '678ab463-91cd-4aaf-b2f3-25b91cad2e19': 'student2',
  'ab78185e-4bbc-47ac-824b-e109d3650619': 'estudiante2',
  '4192d04d-4db1-4640-a011-d7049672ee72': 'estudiante3',
  '9b2d244e-b90c-46df-b147-e654b4597a55': 'estudiante4',
  '5bcbc40d-89df-47dc-85ea-d6b57b1b64e2': 'estudiante5',
  'fbb225d2-823f-4883-a50e-cb917b172b36': 'estudiante6',
  '121016f4-3198-4a89-b1ba-731c30076282': 'estudiante7',
  'fca287df-1102-41d4-b495-056c0dc40c3f': 'estudiante8',
  'fa3986ed-1ea0-4ec0-b1ea-c0e2b2dad2d8': 'estudiante9',
  '60fe935d-024d-4d67-9426-a28061b4ff34': 'estudiante10',
  '428217b8-4aa4-4ac8-be64-8bffaa92163c': 'estudiante11',
  'c6940b19-b3d7-4226-ab44-598aedad50da': 'estudiante #1',
  '682f1c08-8043-49cb-93b1-489f30cf6458': 'Jhon Rafael Zapata Lizcano',
  '41b3cf19-be54-4960-bee0-f2214071a9d9': 'Jhon Rafael Zapata',
  'ec61fa4c-cbeb-4153-9eab-6a1c636d21d5': 'Jose Antonio Rivera Urvia',
  '71a1587c-16f1-4441-90ea-f59515485342': 'Pablo Francisco',
  'fb29d967-a6e0-4d18-a8bd-4eaf9a4b1353': 'Felipe Vargas',
  '4f4f0345-ba9f-4519-b79e-42f0df515ace': 'Felipe vargas (sede admin)',
  'd49ec87c-b694-4489-bade-8b12ca1a87bf': 'Demo SuperAdmin',
  '0ec9ddcc-1d0e-45b4-b27f-7fae06765497': 'Demo Sede Admin',
  '61a7ad65-7bcc-4422-9bbd-ce22b9116c68': 'Demo Student',
  'ee1eed4c-9035-45ec-a990-45777b5a273a': 'Demo Tutor',
  '721bf09e-9a6c-4fe7-9039-8b5da74a49f2': 'Demo Director Semillero',
  '4b10e084-eb03-46e2-bdd6-f2e33af468b8': 'Demo Guest',
  '5bef3613-c38e-4367-9e8d-97a657fbd68d': 'Final Live Student Check',
  '15033e6f-a7b8-4a41-9ef2-eddc3780dacd': 'Live Student Check',
  'bdba9fc3-7989-4b65-b781-6f6375f36a12': 'Test Validation',
  '67c41425-bea6-46c3-99f3-5f4a0ab14c14': 'test2',
};

// Dynamic runtime user cache
const dynamicUserCache = new Map<string, string>();

/**
 * Register a user name dynamically into cache
 */
export function registerUserName(userId: string, name: string): void {
  if (userId && name) {
    dynamicUserCache.set(userId, name);
  }
}

/**
 * Resolves a user ID or member ID to a human-readable display name.
 * 1. Checks dynamic cache
 * 2. Checks current authenticated user
 * 3. Checks pre-mapped platform users
 * 4. Falls back to friendly format (e.g. "Participante #..." or shortened ID)
 */
export function resolveUserName(userId: string | null | undefined, fallbackRank?: number): string {
  if (!userId) {
    return fallbackRank ? `Participante #${fallbackRank}` : 'Participante';
  }

  // 1. Dynamic cache
  if (dynamicUserCache.has(userId)) {
    return dynamicUserCache.get(userId)!;
  }

  // 2. Auth store current user
  try {
    const currentUser = useAuthStore?.getState?.()?.user;
    if (currentUser && currentUser.id === userId && currentUser.full_name) {
      dynamicUserCache.set(userId, currentUser.full_name);
      return currentUser.full_name;
    }
  } catch {
    // ignore outside react/zustand
  }

  // 3. Known users map
  if (KNOWN_USERS_MAP[userId]) {
    return KNOWN_USERS_MAP[userId];
  }

  // 4. Default fallback
  return fallbackRank ? `Estudiante #${fallbackRank}` : `Usuario ${userId.slice(0, 8)}`;
}
