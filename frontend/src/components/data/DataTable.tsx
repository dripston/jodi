import type { ReactNode } from 'react';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/cn';

export interface Column<T> {
  key: string;
  header: string;
  cell: (row: T) => ReactNode;
  className?: string;
  /** Hide this column on narrow screens. */
  hideBelow?: 'sm' | 'md' | 'lg';
}

const HIDE = { sm: 'hidden sm:table-cell', md: 'hidden md:table-cell', lg: 'hidden lg:table-cell' } as const;

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[] | undefined;
  rowKey: (row: T) => string;
  loading?: boolean;
  empty: ReactNode;
  onRowClick?: (row: T) => void;
  rowLabel?: (row: T) => string;
  selectedKey?: string | null;
  rowClassName?: (row: T) => string | undefined;
}

export function DataTable<T>({ columns, rows, rowKey, loading, empty, onRowClick, rowLabel, selectedKey, rowClassName }: DataTableProps<T>) {
  const colClass = (c: Column<T>) => cn(c.hideBelow && HIDE[c.hideBelow], c.className);
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="border-b border-border">
            {columns.map((c) => (
              <th key={c.key} scope="col" className={cn('h-10 px-4 text-caption font-medium text-text-subtle first:pl-5 last:pr-5', colClass(c))}>
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading && !rows
            ? Array.from({ length: 5 }, (_, i) => (
                <tr key={i} className="h-14 border-b border-border last:border-0">
                  {columns.map((c) => (
                    <td key={c.key} className={cn('px-4 first:pl-5 last:pr-5', colClass(c))}>
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
                      'h-14 border-b border-border transition-colors duration-120 last:border-0',
                      onRowClick && 'cursor-pointer hover:bg-surface-muted focus-visible:bg-surface-muted',
                      selectedKey === key && 'bg-brand-soft hover:bg-brand-soft',
                      rowClassName?.(row),
                    )}
                  >
                    {columns.map((c) => (
                      <td key={c.key} className={cn('px-4 py-2.5 align-middle text-body first:pl-5 last:pr-5', colClass(c))}>
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
