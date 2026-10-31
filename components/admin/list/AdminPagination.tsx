'use client';

import { Button } from '@/components/ui/Button';

export function AdminPagination({
  page,
  totalPages,
  onPage,
}: {
  page: number;
  totalPages: number;
  onPage: (page: number) => void;
}) {
  if (totalPages <= 1) return null;

  return (
    <div className="mt-6 flex w-full flex-row flex-nowrap items-center justify-center gap-2">
      <Button
        variant="outline"
        size="sm"
        className="min-w-0 flex-1 whitespace-nowrap sm:flex-none sm:w-auto"
        disabled={page <= 1}
        onClick={() => onPage(page - 1)}
      >
        Previous
      </Button>
      <p className="flex min-h-11 shrink-0 items-center justify-center px-1 text-sm text-[#3A3A3A]">
        Page {page} of {totalPages}
      </p>
      <Button
        variant="outline"
        size="sm"
        className="min-w-0 flex-1 whitespace-nowrap sm:flex-none sm:w-auto"
        disabled={page >= totalPages}
        onClick={() => onPage(page + 1)}
      >
        Next
      </Button>
    </div>
  );
}
