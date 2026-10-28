'use client';

import { useId, useState, type ReactNode } from 'react';
import { Info } from 'lucide-react';

export function InfoNote({
  title,
  children,
  defaultOpen = true,
  learnMore = false,
  className = '',
}: {
  title?: string;
  children: ReactNode;
  defaultOpen?: boolean;
  learnMore?: boolean;
  className?: string;
}) {
  const collapsible = learnMore || defaultOpen === false;
  const [open, setOpen] = useState(collapsible ? defaultOpen : true);
  const bodyId = useId();
  const showBody = !collapsible || open;
  const toggleLabel = title || 'Learn more';

  return (
    <div className={`rounded-xl bg-gray-100 px-3 py-3 text-sm text-[#3A3A3A] ${className}`}>
      <div className="flex items-start gap-2">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#3A3A3A]" aria-hidden />
        <div className="min-w-0 flex-1">
          {collapsible ? (
            <button
              type="button"
              className="flex w-full items-center justify-between gap-2 text-left font-medium text-[#1A1A1A]"
              aria-expanded={open}
              aria-controls={bodyId}
              onClick={() => setOpen((value) => !value)}
            >
              <span>{toggleLabel}</span>
              <span className="shrink-0 text-xs font-semibold text-[#FF7A19]">
                {open ? 'Hide' : 'Learn more'}
              </span>
            </button>
          ) : title ? (
            <p className="font-medium text-[#1A1A1A]">{title}</p>
          ) : null}
          {showBody ? (
            <div id={bodyId} className={title || collapsible ? 'mt-2 leading-relaxed' : 'leading-relaxed'}>
              {children}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function InfoTip({
  text,
  label,
  children,
}: {
  text: string;
  label?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const tipId = useId();

  return (
    <span className="relative inline-flex max-w-full">
      <button
        type="button"
        className="inline-flex max-w-full items-center rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF7A19]"
        aria-label={label || text}
        aria-describedby={open ? tipId : undefined}
        aria-expanded={open}
        title={text}
        onClick={() => setOpen((value) => !value)}
        onBlur={() => setOpen(false)}
      >
        {children}
      </button>
      {open ? (
        <span
          id={tipId}
          role="tooltip"
          className="absolute left-0 top-full z-20 mt-1 w-56 max-w-[min(14rem,calc(100vw-2rem))] rounded-lg bg-[#1A1A1A] px-3 py-2 text-left text-xs font-normal leading-relaxed text-white shadow-lg"
        >
          {text}
        </span>
      ) : null}
    </span>
  );
}
