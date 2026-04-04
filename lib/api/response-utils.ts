type UnknownRecord = Record<string, unknown>;

const DEFAULT_ARRAY_KEYS = [
  'items',
  'results',
  'entries',
  'rows',
  'data',
  'hackathons',
  'notifications',
  'teams',
  'members',
  'messages',
  'progress',
  'registrations',
  'challenges',
  'submissions',
  'test_cases',
  'test_results',
  'documents',
  'collections',
  'reviews',
  'logs',
  'users',
  'groups',
  'keys',
  'zones',
  'sedes',
  'projects',
  'tasks',
  'threads',
] as const;

const DEFAULT_TOTAL_KEYS = ['total', 'count', 'total_count', 'total_items'] as const;

function asRecord(value: unknown): UnknownRecord | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  return value as UnknownRecord;
}

function firstArray(record: UnknownRecord, keys: readonly string[]): unknown[] | null {
  for (const key of keys) {
    if (Array.isArray(record[key])) {
      return record[key] as unknown[];
    }
  }
  for (const value of Object.values(record)) {
    if (Array.isArray(value)) {
      return value;
    }
  }
  return null;
}

function firstNumber(record: UnknownRecord, keys: readonly string[]): number | null {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
  }
  return null;
}

export function toArray<T>(payload: unknown, keys: readonly string[] = DEFAULT_ARRAY_KEYS): T[] {
  if (Array.isArray(payload)) {
    return payload as T[];
  }

  const record = asRecord(payload);
  if (!record) {
    return [];
  }

  const direct = firstArray(record, keys);
  if (direct) {
    return direct as T[];
  }

  if (Array.isArray(record.data)) {
    return record.data as T[];
  }

  const nested = asRecord(record.data);
  if (!nested) {
    return [];
  }

  const nestedArray = firstArray(nested, keys);
  return (nestedArray ?? []) as T[];
}

export function toListResult<T>(
  payload: unknown,
  options?: {
    arrayKeys?: readonly string[];
    totalKeys?: readonly string[];
  }
): { items: T[]; total: number } {
  const items = toArray<T>(payload, options?.arrayKeys ?? DEFAULT_ARRAY_KEYS);
  if (Array.isArray(payload)) {
    return { items, total: items.length };
  }

  const record = asRecord(payload);
  if (!record) {
    return { items, total: items.length };
  }

  const totalKeys = options?.totalKeys ?? DEFAULT_TOTAL_KEYS;
  const total = firstNumber(record, totalKeys);
  if (total != null) {
    return { items, total };
  }

  const nested = asRecord(record.data);
  if (!nested) {
    return { items, total: items.length };
  }

  return {
    items,
    total: firstNumber(nested, totalKeys) ?? items.length,
  };
}
