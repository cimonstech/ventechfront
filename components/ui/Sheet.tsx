'use client';

import type { ReactNode } from 'react';
import { X } from 'lucide-react';

export function Sheet({
  title,
  children,
  footer,
  onClose,
  wide = false,
}: {
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4">
      <div
        className={`flex max-h-[100dvh] w-full flex-col bg-white shadow-lg sm:max-h-[90vh] sm:rounded-2xl ${
          wide ? 'sm:max-w-2xl' : 'sm:max-w-md'
        }`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="sheet-title"
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-gray-100 px-4 py-3">
          <h2 id="sheet-title" className="min-w-0 text-lg font-semibold text-[#1A1A1A]">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-[#1A1A1A] hover:bg-gray-100"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">{children}</div>
        {footer ? (
          <div className="shrink-0 border-t border-gray-100 bg-white px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}
