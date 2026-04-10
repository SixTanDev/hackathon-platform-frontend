'use client';

import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/components/shared/empty-state';
import { ChevronLeft, ChevronRight, Search, ArrowUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Column<T> {
  key: string;
  header: string;
  sortable?: boolean;
  className?: string;
  render?: (row: T, index: number) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  totalItems?: number;
  page?: number;
  pageSize?: number;
  onPageChange?: (page: number) => void;
  searchable?: boolean;
  searchPlaceholder?: string;
  onSearch?: (query: string) => void;
  isLoading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  className?: string;
}

export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  totalItems,
  page = 1,
  pageSize = 20,
  onPageChange,
  searchable = false,
  searchPlaceholder = 'Buscar...',
  onSearch,
  isLoading = false,
  emptyTitle = 'Sin resultados',
  emptyDescription,
  className,
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [searchQuery, setSearchQuery] = useState('');

  const safeData = data ?? [];
  const safeColumns = columns ?? [];
  const total = totalItems ?? safeData?.length ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / (pageSize ?? 20)));

  function handleSort(key: string) {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e?.target?.value ?? '';
    setSearchQuery(val);
    onSearch?.(val);
  }

  // Client-side sort if no server sort
  let displayData = [...safeData];
  if (sortKey) {
    displayData.sort((a: any, b: any) => {
      const aVal = a?.[sortKey] ?? '';
      const bVal = b?.[sortKey] ?? '';
      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }

  return (
    <div className={cn('space-y-4', className)}>
      {searchable && (
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={searchPlaceholder}
            value={searchQuery}
            onChange={handleSearchChange}
            className="pl-9"
          />
        </div>
      )}

      <div className="rounded-lg border border-border/50 overflow-hidden overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              {safeColumns?.map?.((col: Column<T>) => (
                <TableHead
                  key={col?.key ?? ''}
                  className={cn(
                    col?.sortable && 'cursor-pointer select-none',
                    col?.className
                  )}
                  onClick={col?.sortable ? () => handleSort(col?.key ?? '') : undefined}
                >
                  <div className="flex items-center gap-1">
                    {col?.header ?? ''}
                    {col?.sortable && (
                      <ArrowUpDown className="w-3 h-3 text-muted-foreground" />
                    )}
                  </div>
                </TableHead>
              )) ?? []}
            </TableRow>
          </TableHeader>
          <TableBody>
            {(displayData?.length ?? 0) === 0 ? (
              <TableRow>
                <TableCell colSpan={safeColumns?.length ?? 1}>
                  <EmptyState title={emptyTitle} description={emptyDescription} />
                </TableCell>
              </TableRow>
            ) : (
              displayData?.map?.((row: T, idx: number) => (
                <TableRow key={idx} className="hover:bg-muted/30 transition-colors">
                  {safeColumns?.map?.((col: Column<T>) => (
                    <TableCell key={col?.key ?? ''} className={col?.className}>
                      {col?.render
                        ? col.render(row, idx)
                        : String(row?.[col?.key ?? ''] ?? '—')}
                    </TableCell>
                  )) ?? []}
                </TableRow>
              )) ?? []
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Página {page ?? 1} de {totalPages} ({total} resultados)
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              disabled={(page ?? 1) <= 1}
              onClick={() => onPageChange?.((page ?? 1) - 1)}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={(page ?? 1) >= totalPages}
              onClick={() => onPageChange?.((page ?? 1) + 1)}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
