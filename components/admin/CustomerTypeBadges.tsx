'use client';

import { useEffect, useId, useRef, useState } from 'react';
import {
  affiliateTypeHint,
  investorTypeHint,
  type CustomerListRow,
} from '@/lib/adminCustomers';

const badgeClass =
  'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold tracking-wide';

function HintBadge({
  label,
  hint,
  className,
}: {
  label: string;
  hint: string;
  className: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  const pointerType = useRef<string>('mouse');
  const tooltipId = useId();

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <span ref={ref} className="relative inline-flex">
      <button
        type="button"
        aria-label={hint}
        aria-describedby={open ? tooltipId : undefined}
        onPointerDown={(event) => {
          pointerType.current = event.pointerType;
        }}
        onPointerEnter={(event) => {
          if (event.pointerType === 'mouse') setOpen(true);
        }}
        onPointerLeave={(event) => {
          if (event.pointerType === 'mouse') setOpen(false);
        }}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          if (pointerType.current === 'mouse') return;
          setOpen((current) => !current);
        }}
        className={`${badgeClass} ${className} focus:outline-none focus:ring-2 focus:ring-[#FF7A19] focus:ring-offset-1`}
      >
        {label}
      </button>
      {open ? (
        <span
          id={tooltipId}
          role="tooltip"
          className="pointer-events-none absolute left-0 top-full z-20 mt-1 w-max max-w-[16rem] rounded-md bg-[#1A1A1A] px-2 py-1 text-left text-xs font-normal tracking-normal text-white shadow-sm"
        >
          {hint}
        </span>
      ) : null}
    </span>
  );
}

export function CustomerTypeBadges({ row }: { row: CustomerListRow }) {
  const affiliateLive = row.affiliate_status === 'active';
  const investorLive = (row.active_investments_count || 0) > 0;

  return (
    <div className="flex max-w-full flex-wrap items-center gap-1">
      <HintBadge label="CUST" hint="Customer" className="border-gray-300 bg-gray-100 text-gray-700" />
      {row.is_affiliate ? (
        <HintBadge
          label="AFF"
          hint={affiliateTypeHint(row)}
          className={
            affiliateLive
              ? 'border-[#FF7A19] bg-[#FF7A19] text-white'
              : 'border-[#FF7A19] bg-white text-[#E66600]'
          }
        />
      ) : null}
      {row.is_investor ? (
        <HintBadge
          label="VLB"
          hint={investorTypeHint(row)}
          className={
            investorLive
              ? 'border-blue-600 bg-blue-600 text-white'
              : 'border-blue-600 bg-white text-blue-700'
          }
        />
      ) : null}
    </div>
  );
}
