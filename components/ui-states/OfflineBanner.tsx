'use client';

import { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';
import { emitOnlineRefetch } from '@/lib/httpErrors';

export function OfflineBanner() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const sync = () => setOffline(typeof navigator !== 'undefined' && navigator.onLine === false);
    sync();
    const onOffline = () => setOffline(true);
    const onOnline = () => {
      setOffline(false);
      emitOnlineRefetch();
    };
    window.addEventListener('offline', onOffline);
    window.addEventListener('online', onOnline);
    return () => {
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('online', onOnline);
    };
  }, []);

  if (!offline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="sticky top-0 z-[60] bg-[#1A1A1A] px-4 py-2.5 text-center text-sm text-white"
    >
      <span className="inline-flex items-center justify-center gap-2">
        <WifiOff className="h-4 w-4 shrink-0" aria-hidden />
        You&apos;re offline. We&apos;ll retry when you&apos;re back.
      </span>
    </div>
  );
}
