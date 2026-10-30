'use client';

import { useEffect, useRef } from 'react';
import { ShieldOff } from 'lucide-react';
import { StateAction, StateActions } from './StateActions';

export function AccessDenied({
  title = "You don't have access",
  description = "This page is limited to a different role. If you think that's a mistake, ask an admin.",
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
  }, [title]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center px-4 py-12 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 text-amber-700">
        <ShieldOff className="h-7 w-7" aria-hidden />
      </div>
      <h1
        ref={headingRef}
        tabIndex={-1}
        className="mt-4 text-lg font-semibold text-[#1A1A1A] outline-none"
      >
        {title}
      </h1>
      <p className="mt-2 max-w-md text-sm leading-6 text-[#3A3A3A]">{description}</p>
      <StateActions
        primary={primary || { label: 'Go to your account', href: '/account' }}
        secondary={secondary || { label: 'Contact support', href: 'mailto:ventechgadgets@gmail.com', variant: 'ghost' }}
      />
    </div>
  );
}
