import { ADMIN_DATA_DENIED } from '@/lib/access';
import { authHeaders } from '@/lib/authHeaders';
import { ApiError, emitSessionExpired, failNetwork } from '@/lib/httpErrors';
import { rememberRedirect, safeRedirectPath } from '@/lib/safeRedirect';

export type ApiKind =
  | 'unauthorized'
  | 'forbidden'
  | 'not_found'
  | 'rate_limited'
  | 'server'
  | 'network'
  | 'validation';

export type ApiOk<T> = {
  ok: true;
  data: T;
  message: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  pending_count?: number;
};

export type ApiFail = {
  ok: false;
  kind: ApiKind;
  status: number;
  message: string;
  retryAfterSeconds?: number;
  reference?: string;
  fields?: Record<string, string>;
};

export type ApiResult<T> = ApiOk<T> | ApiFail;

export type ApiRequestInit = RequestInit & {
  saveDraft?: () => void;
  returnPath?: string | null;
};

const KIND_MESSAGE: Record<ApiKind, string> = {
  unauthorized: 'Your session expired. Sign in again.',
  forbidden: ADMIN_DATA_DENIED,
  not_found: "We couldn't find that.",
  rate_limited: 'Too many requests. Wait a moment and try again.',
  server: 'Something went wrong on our side. Please try again.',
  network: 'Could not reach the server. Check your connection and try again.',
  validation: 'Please check the highlighted fields and try again.',
};

export function parseRetryAfterSeconds(header: string | null): number | undefined {
  if (!header) return undefined;
  const trimmed = header.trim();
  if (!trimmed) return undefined;
  const asNumber = Number(trimmed);
  if (Number.isFinite(asNumber) && asNumber >= 0) return Math.round(asNumber);
  const asDate = Date.parse(trimmed);
  if (Number.isNaN(asDate)) return undefined;
  return Math.max(0, Math.ceil((asDate - Date.now()) / 1000));
}

function kindForStatus(status: number): ApiKind {
  if (status === 401) return 'unauthorized';
  if (status === 403) return 'forbidden';
  if (status === 404) return 'not_found';
  if (status === 429) return 'rate_limited';
  if (status === 400 || status === 409 || status === 422) return 'validation';
  return 'server';
}

function messageFor(kind: ApiKind, retryAfterSeconds?: number): string {
  if (kind === 'network') return failNetwork().message;
  if (kind === 'rate_limited' && retryAfterSeconds && retryAfterSeconds > 0) {
    if (retryAfterSeconds < 90) {
      return `Too many requests. Try again in ${retryAfterSeconds} seconds.`;
    }
    const minutes = Math.ceil(retryAfterSeconds / 60);
    return `Too many requests. Try again in ${minutes} minute${minutes === 1 ? '' : 's'}.`;
  }
  return KIND_MESSAGE[kind];
}

function validationFields(body: unknown): Record<string, string> | undefined {
  if (!body || typeof body !== 'object') return undefined;
  const errors = (body as { errors?: unknown }).errors;
  if (!errors || typeof errors !== 'object') return undefined;
  const fields: Record<string, string> = {};
  for (const [key, value] of Object.entries(errors as Record<string, unknown>)) {
    if (typeof value === 'string' && value.trim()) {
      fields[key] = value.trim();
    } else if (Array.isArray(value) && typeof value[0] === 'string' && value[0].trim()) {
      fields[key] = value[0].trim();
    }
  }
  return Object.keys(fields).length ? fields : undefined;
}

function pickReference(body: unknown): string | undefined {
  if (!body || typeof body !== 'object') return undefined;
  const record = body as { reference?: unknown; data?: { reference?: unknown } };
  if (typeof record.reference === 'string' && record.reference.trim()) return record.reference.trim();
  if (typeof record.data?.reference === 'string' && record.data.reference.trim()) {
    return record.data.reference.trim();
  }
  return undefined;
}

export function handleUnauthorized(returnPath?: string | null, saveDraft?: () => void) {
  saveDraft?.();
  const fromArg = safeRedirectPath(returnPath);
  const fromLocation =
    typeof window !== 'undefined'
      ? safeRedirectPath(`${window.location.pathname}${window.location.search}`)
      : null;
  const path = fromArg || fromLocation;
  if (path) rememberRedirect(path);
  emitSessionExpired();
}

export function toApiError(fail: ApiFail): ApiError {
  return new ApiError(fail.status, fail.message, {
    kind: fail.kind,
    retryAfterSeconds: fail.retryAfterSeconds,
    reference: fail.reference,
  });
}

export async function apiRequest<T>(path: string, init: ApiRequestInit = {}): Promise<ApiResult<T>> {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
  const { saveDraft, returnPath, ...requestInit } = init;
  const headers = await authHeaders();
  let response: Response;

  try {
    const isForm = typeof FormData !== 'undefined' && requestInit.body instanceof FormData;
    response = await fetch(`${API_URL}${path}`, {
      ...requestInit,
      headers: {
        ...headers,
        ...(isForm ? {} : { 'Content-Type': 'application/json' }),
        ...(requestInit.headers || {}),
      },
    });
  } catch {
    return {
      ok: false,
      kind: 'network',
      status: 0,
      message: failNetwork().message,
    };
  }

  const body = await response.json().catch(() => ({}));
  const failed = !response.ok || body?.success === false;
  if (!failed) {
    return {
      ok: true,
      data: body.data as T,
      message: typeof body?.message === 'string' ? body.message : 'Saved',
      pagination: body.pagination,
      pending_count: typeof body.pending_count === 'number' ? body.pending_count : undefined,
    };
  }

  const status = response.status || 500;
  const kind = kindForStatus(status);
  const retryAfterSeconds = kind === 'rate_limited' ? parseRetryAfterSeconds(response.headers.get('Retry-After')) : undefined;
  const fields = kind === 'validation' ? validationFields(body) : undefined;

  if (kind === 'unauthorized') {
    handleUnauthorized(returnPath, saveDraft);
  }

  return {
    ok: false,
    kind,
    status,
    message: messageFor(kind, retryAfterSeconds),
    retryAfterSeconds,
    reference: pickReference(body),
    fields,
  };
}
