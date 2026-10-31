import { ApiError, emitSessionExpired, isForbiddenError } from '@/lib/httpErrors';

export type QueryFail = 'forbidden' | 'unauthorized' | 'feature_off' | 'error';

export function classifyQueryFail(error: unknown): QueryFail {
  if (error instanceof ApiError) {
    if (error.status === 401 || error.kind === 'unauthorized') return 'unauthorized';
    if (error.kind === 'feature_off' || error.code === 'feature_off') return 'feature_off';
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

export function applyQueryFail(
  error: unknown,
  set: {
    setFeatureOff?: (value: boolean) => void;
    setForbidden: (value: boolean) => void;
    setFailed: (value: boolean) => void;
  }
): QueryFail {
  const kind = noteQueryFail(error);
  if (kind === 'feature_off') set.setFeatureOff?.(true);
  else if (kind === 'forbidden') set.setForbidden(true);
  else if (kind !== 'unauthorized') set.setFailed(true);
  return kind;
}
