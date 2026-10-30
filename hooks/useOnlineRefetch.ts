'use client';

import { useEffect } from 'react';
import { ONLINE_REFETCH_EVENT } from '@/lib/httpErrors';

export function useOnlineRefetch(reload: () => void) {
  useEffect(() => {
    const onOnline = () => reload();
    window.addEventListener(ONLINE_REFETCH_EVENT, onOnline);
    return () => window.removeEventListener(ONLINE_REFETCH_EVENT, onOnline);
  }, [reload]);
}
