'use client';

import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight } from 'lucide-react';

type Props = {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
};

export function Pagination({ currentPage, totalPages, onPageChange }: Props) {
  if (totalPages <= 1) return null;

  // Build the visible page numbers with ellipsis
  const getPages = (): (number | 'ellipsis')[] => {
    const pages: (number | 'ellipsis')[] = [];
    const delta = 1;
    const left = Math.max(2, currentPage - delta);
    const right = Math.min(totalPages - 1, currentPage + delta);

    pages.push(1);
    if (left > 2) pages.push('ellipsis');
    for (let i = left; i <= right; i++) pages.push(i);
    if (right < totalPages - 1) pages.push('ellipsis');
    if (totalPages > 1) pages.push(totalPages);

    return pages;
  };

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-sm transition-colors hover:bg-accent disabled:pointer-events-none disabled:opacity-50"
        aria-label="Previous page"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      {getPages().map((page, i) =>
        page === 'ellipsis' ? (
          <span key={`e${i}`} className="flex h-8 w-8 items-center justify-center text-xs text-muted-foreground">
            …
          </span>
        ) : (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            className={cn(
              'inline-flex h-8 min-w-8 items-center justify-center rounded-md px-2 text-sm transition-colors',
              page === currentPage
                ? 'bg-primary text-primary-foreground font-medium'
                : 'hover:bg-accent text-muted-foreground',
            )}
            aria-current={page === currentPage ? 'page' : undefined}
          >
            {page}
          </button>
        ),
      )}

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-sm transition-colors hover:bg-accent disabled:pointer-events-none disabled:opacity-50"
        aria-label="Next page"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}
