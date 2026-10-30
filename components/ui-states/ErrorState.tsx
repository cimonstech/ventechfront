'use client';

import { useEffect, useRef } from 'react';
import { AlertCircle } from 'lucide-react';
import { StateAction, StateActions } from './StateActions';

export function ErrorState({
  title = "We couldn't load this",
  description = 'Something went wrong. Try again, or come back in a moment.',
  primary,
  secondary,
}: {
  title?: string;
  description?: string;
  primary?: StateAction;
  secondary?: StateAction;
}) {
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, [title, description]);

  return (
    <div className="flex flex-col items-center px-4 py-12 text-center" role="alert">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-600">
        <AlertCircle className="h-7 w-7" aria-hidden />
      </div>
      <h2
        ref={headingRef}
        tabIndex={-1}
        className="mt-4 text-lg font-semibold text-[#1A1A1A] outline-none"
      >
        {title}
      </h2>
      <p className="mt-2 max-w-md text-sm leading-6 text-[#3A3A3A]">{description}</p>
      <StateActions
        primary={primary}
        secondary={secondary || { label: 'Contact support', href: 'mailto:ventechgadgets@gmail.com', variant: 'ghost' }}
      />
    </div>
  );
}
