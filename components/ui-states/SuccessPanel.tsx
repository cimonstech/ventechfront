'use client';

import { useEffect, useRef } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { StateAction, StateActions } from './StateActions';

export function SuccessPanel({
  title,
  description,
  primary,
  secondary,
}: {
  title: string;
  description: string;
  primary?: StateAction;
  secondary?: StateAction;
}) {
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, [title]);

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
      <StateActions primary={primary} secondary={secondary} />
    </div>
  );
}
