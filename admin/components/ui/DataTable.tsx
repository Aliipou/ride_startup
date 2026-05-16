'use client';

import { useState } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Column<T> {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (value: unknown, row: T) => React.ReactNode;
  className?: string;
  headerClassName?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  pageSize?: number;
  currentPage?: number;
  totalItems?: number;
  onPageChange?: (page: number) => void;
  onSort?: (key: string, dir: 'asc' | 'desc') => void;
  sortKey?: string;
  sortDir?: 'asc' | 'desc';
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
  rowKey?: (row: T) => string;
}

export default function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  loading = false,
  pageSize = 25,
  currentPage = 1,
  totalItems,
  onPageChange,
  onSort,
  sortKey,
  sortDir,
  onRowClick,
  emptyMessage = 'No data found',
  rowKey,
}: DataTableProps<T>) {
  const [localSort, setLocalSort] = useState<{ key: string; dir: 'asc' | 'desc' } | null>(null);

  const effectiveSortKey = sortKey ?? localSort?.key;
  const effectiveSortDir = sortDir ?? localSort?.dir;

  const handleSort = (key: string) => {
    const newDir =
      effectiveSortKey === key && effectiveSortDir === 'asc' ? 'desc' : 'asc';
    if (onSort) {
      onSort(key, newDir);
    } else {
      setLocalSort({ key, dir: newDir });
    }
  };

  const sortedData = onSort
    ? data
    : localSort
    ? [...data].sort((a, b) => {
        const aVal = a[localSort.key];
        const bVal = b[localSort.key];
        const cmp =
          typeof aVal === 'string' && typeof bVal === 'string'
            ? aVal.localeCompare(bVal)
            : Number(aVal) - Number(bVal);
        return localSort.dir === 'asc' ? cmp : -cmp;
      })
    : data;

  const totalPages =
    totalItems !== undefined
      ? Math.ceil(totalItems / pageSize)
      : Math.ceil(data.length / pageSize);
  const showPagination = (totalItems ?? data.length) > pageSize;

  if (loading) {
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    'px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider',
                    col.headerClassName,
                  )}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 8 }).map((_, i) => (
              <tr key={i} className="border-b border-gray-50">
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-3">
                    <div className="skeleton h-4 rounded w-full max-w-[160px]" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/50">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    'px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap',
                    col.sortable && 'cursor-pointer select-none hover:text-gray-700',
                    col.headerClassName,
                  )}
                  onClick={() => col.sortable && handleSort(col.key)}
                  aria-sort={
                    effectiveSortKey === col.key
                      ? effectiveSortDir === 'asc'
                        ? 'ascending'
                        : 'descending'
                      : 'none'
                  }
                >
                  <span className="flex items-center gap-1">
                    {col.label}
                    {col.sortable && (
                      <span className="text-gray-300">
                        {effectiveSortKey === col.key ? (
                          effectiveSortDir === 'asc' ? (
                            <ChevronUp size={13} className="text-primary" />
                          ) : (
                            <ChevronDown size={13} className="text-primary" />
                          )
                        ) : (
                          <ChevronsUpDown size={13} />
                        )}
                      </span>
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedData.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-12 text-center text-gray-400"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              sortedData.map((row, idx) => (
                <tr
                  key={rowKey ? rowKey(row) : idx}
                  className={cn(
                    'border-b border-gray-50 transition-colors',
                    onRowClick
                      ? 'cursor-pointer hover:bg-gray-50'
                      : 'hover:bg-gray-50/50',
                  )}
                  onClick={() => onRowClick?.(row)}
                  role={onRowClick ? 'button' : undefined}
                  tabIndex={onRowClick ? 0 : undefined}
                  onKeyDown={
                    onRowClick
                      ? (e) => e.key === 'Enter' && onRowClick(row)
                      : undefined
                  }
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={cn(
                        'px-4 py-3 text-gray-700 whitespace-nowrap',
                        col.className,
                      )}
                    >
                      {col.render
                        ? col.render(row[col.key], row)
                        : String(row[col.key] ?? '—')}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showPagination && (
        <div
          className="flex items-center justify-between px-4 py-3 border-t border-gray-100"
          data-testid="pagination"
        >
          <p className="text-xs text-gray-500">
            Showing{' '}
            <span className="font-medium">
              {(currentPage - 1) * pageSize + 1}
            </span>{' '}
            to{' '}
            <span className="font-medium">
              {Math.min(currentPage * pageSize, totalItems ?? data.length)}
            </span>{' '}
            of{' '}
            <span className="font-medium">{totalItems ?? data.length}</span>{' '}
            results
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onPageChange?.(currentPage - 1)}
              disabled={currentPage <= 1}
              className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50
                disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              aria-label="Previous page"
            >
              <ChevronLeft size={16} />
            </button>

            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              const page = i + 1;
              return (
                <button
                  key={page}
                  onClick={() => onPageChange?.(page)}
                  className={cn(
                    'w-8 h-8 rounded-lg text-sm font-medium transition-colors',
                    page === currentPage
                      ? 'bg-primary text-white'
                      : 'text-gray-600 hover:bg-gray-100',
                  )}
                >
                  {page}
                </button>
              );
            })}

            <button
              onClick={() => onPageChange?.(currentPage + 1)}
              disabled={currentPage >= totalPages}
              className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50
                disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              aria-label="Next page"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
