'use client';

import { useEffect } from 'react';
import { installToastDedupe } from '@/lib/toast';

export function ToastDedupe() {
  useEffect(() => {
    installToastDedupe();
  }, []);
  return null;
}
