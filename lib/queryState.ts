import { ApiError, emitSessionExpired, isForbiddenError } from '@/lib/httpErrors';

export type QueryFail = 'forbidden' | 'unauthorized' | 'error';

export function classifyQueryFail(error: unknown): QueryFail {
  if (error instanceof ApiError) {
    if (error.status === 401 || error.kind === 'unauthorized') return 'unauthorized';
    if (error.status === 403 || error.kind === 'forbidden') return 'forbidden';
  }
  const text = error instanceof Error ? error.message : String(error || '');
  if (/jwt expired|not authenticated|invalid token|session expired/i.test(text)) {
    return 'unauthorized';
  }
  if (isForbiddenError(error) || /row-level security|permission denied|not authorized/i.test(text)) {
    return 'forbidden';
  }
  return 'error';
}

export function noteQueryFail(error: unknown): QueryFail {
  const kind = classifyQueryFail(error);
  if (kind === 'unauthorized') emitSessionExpired();
  return kind;
}
