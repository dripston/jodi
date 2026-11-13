import type { ReactNode } from 'react';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/cn';

export interface Column<T> {
  key: string;
  header: string;
  cell: (row: T) => ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[] | undefined;
  rowKey: (row: T) => string;
  loading?: boolean;
  empty: ReactNode;
  onRowClick?: (row: T) => void;
  rowLabel?: (row: T) => string;
  selectedKey?: string | null;
}

export function DataTable<T>({ columns, rows, rowKey, loading, empty, onRowClick, rowLabel, selectedKey }: DataTableProps<T>) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left">
        <thead className="sticky top-0 z-10">
          <tr className="border-b border-border bg-surface-muted">
            {columns.map((c) => (
              <th key={c.key} scope="col" className={cn('h-9 px-4 text-caption text-text-muted', c.className)}>
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading && !rows
            ? Array.from({ length: 5 }, (_, i) => (
                <tr key={i} className="h-12 border-b border-border last:border-0">
                  {columns.map((c) => (
                    <td key={c.key} className="px-4">
                      <Skeleton className="h-4 w-24" />
                    </td>
                  ))}
                </tr>
              ))
            : rows?.map((row) => {
                const key = rowKey(row);
                return (
                  <tr
                    key={key}
                    tabIndex={onRowClick ? 0 : undefined}
                    aria-label={rowLabel?.(row)}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                    onKeyDown={onRowClick ? (e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onRowClick(row)) : undefined}
                    className={cn(
                      'h-12 border-b border-border transition-colors duration-120 last:border-0',
                      onRowClick && 'cursor-pointer hover:bg-surface-muted',
                      selectedKey === key && 'bg-brand-soft hover:bg-brand-soft',
                    )}
                  >
                    {columns.map((c) => (
                      <td key={c.key} className={cn('px-4 text-body', c.className)}>
                        {c.cell(row)}
                      </td>
                    ))}
                  </tr>
                );
              })}
        </tbody>
      </table>
      {!loading && rows?.length === 0 ? empty : null}
    </div>
  );
}
