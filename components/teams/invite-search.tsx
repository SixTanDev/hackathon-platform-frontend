'use client';

import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-client';
import { searchSedeMembers, type SedeUserResult } from '@/lib/api/hackathon-services';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, Search, UserPlus } from 'lucide-react';

interface InviteSearchProps {
  onInvite: (user: SedeUserResult) => void;
  isInviting: boolean;
  existingMemberIds: string[];
}

export function InviteSearch({ onInvite, isInviting, existingMemberIds }: InviteSearchProps) {
  const [query, setQuery] = useState('');
  const [showResults, setShowResults] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debouncedQuery = useDebounce(query, 300);

  const { data: results, isLoading } = useQuery({
    queryKey: queryKeys.userSearch(debouncedQuery),
    queryFn: () => searchSedeMembers(debouncedQuery),
    enabled: debouncedQuery.length >= 2,
  });

  const filtered = (results ?? []).filter(
    (u) => !existingMemberIds.includes(u.user_global_id) && !existingMemberIds.includes(u.id)
  );

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nombre o email..."
          value={query}
          onChange={(e) => { setQuery(e.target.value); setShowResults(true); }}
          onFocus={() => setShowResults(true)}
          className="pl-9"
        />
      </div>

      {showResults && debouncedQuery.length >= 2 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg z-20 max-h-[200px] overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Sin resultados</p>
          ) : (
            filtered.map((user) => (
              <div
                key={user.id || user.user_global_id}
                className="flex items-center justify-between px-3 py-2 hover:bg-muted/50 transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{user.full_name}</p>
                  <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    onInvite(user);
                    setQuery('');
                    setShowResults(false);
                  }}
                  disabled={isInviting}
                >
                  <UserPlus className="w-4 h-4" />
                </Button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// Simple debounce hook
function useDebounce(value: string, delay: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}
