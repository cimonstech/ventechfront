'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Clock } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { SESSION_EXPIRED_EVENT } from '@/lib/httpErrors';
import { rememberRedirect } from '@/lib/safeRedirect';

const AUTH_PATHS = new Set([
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/set-password',
]);

export function SessionExpiredHost() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const onExpired = () => {
      if (AUTH_PATHS.has(pathname)) return;
      rememberRedirect(`${pathname}${window.location.search}`);
      setOpen(true);
    };
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
  }, [pathname]);

  useEffect(() => {
    if (open) headingRef.current?.focus();
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50 p-4 sm:items-center" role="dialog" aria-modal="true" aria-labelledby="session-expired-title">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-700">
          <Clock className="h-6 w-6" aria-hidden />
        </div>
        <h2
          id="session-expired-title"
          ref={headingRef}
          tabIndex={-1}
          className="mt-4 text-center text-lg font-semibold text-[#1A1A1A] outline-none"
        >
          Your session expired
        </h2>
        <p className="mt-2 text-center text-sm leading-6 text-[#3A3A3A]">
          Sign in again to keep going. We&apos;ll bring you back here.
        </p>
        <Button
          type="button"
          className="mt-6 w-full min-h-11"
          onClick={() => {
            setOpen(false);
            router.push('/login');
          }}
        >
          Sign in
        </Button>
      </div>
    </div>
  );
}
