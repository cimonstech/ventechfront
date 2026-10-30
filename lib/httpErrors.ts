export const SESSION_EXPIRED_EVENT = 'vt-session-expired';
export const ONLINE_REFETCH_EVENT = 'vt-online-refetch';

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export function emitSessionExpired() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
}

export function emitOnlineRefetch() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(ONLINE_REFETCH_EVENT));
}

export function isOfflineError(error: unknown): boolean {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return true;
  if (error instanceof ApiError && error.status === 0) return true;
  if (error instanceof TypeError) return true;
  return false;
}

export function isForbiddenError(error: unknown): boolean {
  return error instanceof ApiError && error.status === 403;
}

export function isTooManyRequests(error: unknown): boolean {
  return error instanceof ApiError && error.status === 429;
}

export function failNetwork(): ApiError {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return new ApiError(0, "You're offline. We'll retry when you're back.");
  }
  return new ApiError(0, 'Could not reach the server. Check your connection and try again.');
}
