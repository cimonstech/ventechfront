'use client';

import toast from 'react-hot-toast';

const WINDOW_MS = 3000;
const seen = new Map<string, number>();
let installed = false;

function shouldDrop(message: unknown): boolean {
  if (typeof message !== 'string' || !message) return false;
  const now = Date.now();
  const last = seen.get(message);
  if (last && now - last < WINDOW_MS) return true;
  seen.set(message, now);
  return false;
}

export function installToastDedupe() {
  if (installed) return;
  installed = true;
  const originalError = toast.error.bind(toast);
  const originalSuccess = toast.success.bind(toast);
  toast.error = ((message: Parameters<typeof toast.error>[0], opts?: Parameters<typeof toast.error>[1]) => {
    if (shouldDrop(message)) return '';
    return originalError(message, opts);
  }) as typeof toast.error;
  toast.success = ((message: Parameters<typeof toast.success>[0], opts?: Parameters<typeof toast.success>[1]) => {
    if (shouldDrop(message)) return '';
    return originalSuccess(message, opts);
  }) as typeof toast.success;
}
