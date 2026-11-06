'use client';

import { useEffect, useRef } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { StateAction, StateActions } from './StateActions';

export function SuccessPanel({
  title,
  description,
  details,
  footnote,
  primary,
  secondary,
}: {
  title: string;
  description: string;
  details?: Array<{ label: string; value: string }>;
  footnote?: string;
  primary?: StateAction;
  secondary?: StateAction;
}) {
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, [title]);

  const rows = (details || []).filter((row) => row.label && row.value);

  return (
    <div className="flex flex-col items-center px-4 py-12 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-50 text-green-700">
        <CheckCircle2 className="h-7 w-7" aria-hidden />
      </div>
      <h2
        ref={headingRef}
        tabIndex={-1}
        className="mt-4 text-lg font-semibold text-[#1A1A1A] outline-none"
      >
        {title}
      </h2>
      <p className="mt-2 max-w-md text-sm leading-6 text-[#3A3A3A]">{description}</p>
      {rows.length > 0 ? (
        <dl className="mt-6 w-full max-w-md space-y-2 rounded-xl border border-[#E7E5E4] bg-white px-4 py-3 text-left">
          {rows.map((row) => (
            <div key={row.label} className="flex items-start justify-between gap-3 text-sm">
              <dt className="text-[#525252]">{row.label}</dt>
              <dd className="font-medium text-[#1A1A1A] text-right break-words">{row.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      {footnote ? <p className="mt-4 max-w-md text-sm text-[#525252]">{footnote}</p> : null}
      <StateActions primary={primary} secondary={secondary} />
    </div>
  );
}
