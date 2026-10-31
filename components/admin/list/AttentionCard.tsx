'use client';

import { useEffect, useId, useState } from 'react';
import type { AttentionItem } from './types';

export function AttentionCard({ items }: { items: AttentionItem[] }) {
  const visible = items.filter(Boolean);
  const [open, setOpen] = useState(false);
  const bodyId = useId();

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 640px)');
    const sync = () => setOpen(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  if (visible.length === 0) return null;

  const heading =
    visible.length === 1 ? '1 thing needs attention' : `${visible.length} things need attention`;

  return (
    <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50">
      <button
        type="button"
        className="flex min-h-11 w-full items-center justify-between gap-3 px-4 py-3 text-left"
        aria-expanded={open}
        aria-controls={bodyId}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="text-sm font-semibold text-[#1A1A1A]">{heading}</span>
        <span className="shrink-0 text-xs font-semibold text-[#FF7A19]">{open ? 'Hide' : 'Show'}</span>
      </button>
      {open ? (
        <div id={bodyId} className="space-y-3 border-t border-amber-200 px-4 py-3">
          {visible.map((item) => (
            <div key={item.id} className="space-y-2">
              <p className="text-sm text-[#1A1A1A]">{item.message}</p>
              <button
                type="button"
                className="flex min-h-11 w-full items-center justify-center rounded-lg bg-white px-4 text-sm font-semibold text-[#FF7A19] ring-1 ring-amber-200"
                onClick={item.onShow}
              >
                {item.showing ? 'Show all products' : 'Show them'}
              </button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
