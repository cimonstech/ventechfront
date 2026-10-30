'use client';

import { useEffect, useState } from 'react';

export function LoadingMessage({
  label = 'Loading',
  className = '',
}: {
  label?: string;
  className?: string;
}) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const started = Date.now();
    const id = window.setInterval(() => setElapsed(Date.now() - started), 250);
    return () => window.clearInterval(id);
  }, []);

  const detail =
    elapsed > 8000
      ? 'Still working — this is taking longer than usual.'
      : elapsed > 3000
        ? 'Still loading…'
        : elapsed > 1000
          ? `${label}…`
          : null;

  return (
    <div className={`flex flex-col items-center justify-center py-12 ${className}`} role="status" aria-live="polite" aria-busy="true">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-gray-200 border-t-[#FF7A19]" />
      {detail ? <p className="mt-4 text-sm text-[#3A3A3A]">{detail}</p> : null}
    </div>
  );
}
