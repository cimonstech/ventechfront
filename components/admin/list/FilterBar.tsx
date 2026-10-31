'use client';

import { useState, type ReactNode } from 'react';
import { Search, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Sheet } from '@/components/ui/Sheet';

export function FilterBar({
  search,
  onSearchChange,
  searchPlaceholder,
  activeCount = 0,
  onClear,
  onApply,
  children,
}: {
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder: string;
  activeCount?: number;
  onClear?: () => void;
  onApply?: () => void;
  children?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const hasFilters = Boolean(children);

  const apply = () => {
    onApply?.();
    setOpen(false);
  };

  return (
    <div className="mb-6 min-w-0 max-w-full rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex min-w-0 max-w-full flex-col gap-3 md:flex-row md:flex-wrap md:items-center">
        <div className="relative min-w-0 w-full md:min-w-[16rem] md:flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 shrink-0 -translate-y-1/2 text-gray-400" aria-hidden />
          <input
            type="search"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={searchPlaceholder}
            className="min-h-11 w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 text-sm text-[#1A1A1A] placeholder:text-[#3A3A3A] focus:outline-none focus:ring-2 focus:ring-[#FF7A19]"
          />
        </div>

        {hasFilters ? (
          <>
            <div className="hidden min-w-0 flex-wrap items-center gap-2 md:flex">{children}</div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full whitespace-nowrap md:hidden"
              icon={<SlidersHorizontal size={16} />}
              onClick={() => setOpen(true)}
            >
              Filters{activeCount > 0 ? ` (${activeCount})` : ''}
            </Button>
          </>
        ) : null}
      </div>

      {open && hasFilters ? (
        <Sheet
          title="Filters"
          onClose={() => setOpen(false)}
          footer={
            <div className="flex flex-col gap-2">
              {onClear ? (
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full whitespace-nowrap"
                  onClick={() => {
                    onClear();
                  }}
                >
                  Clear filters
                </Button>
              ) : null}
              <Button type="button" className="w-full whitespace-nowrap" onClick={apply}>
                Apply
              </Button>
            </div>
          }
        >
          <div className="flex flex-col gap-3 [&>*]:w-full">{children}</div>
        </Sheet>
      ) : null}
    </div>
  );
}

export function filterSelectClassName() {
  return 'min-h-11 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#FF7A19] md:w-auto';
}
