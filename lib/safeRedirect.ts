const STORAGE_KEY = 'ventech-auth-redirect';

export function safeRedirectPath(value: string | null | undefined): string | null {
  if (!value) return null;
  const path = value.trim();
  if (!path.startsWith('/') || path.startsWith('//') || path.includes('\\') || path.includes('://')) {
    return null;
  }
  try {
    const decoded = decodeURIComponent(path);
    if (!decoded.startsWith('/') || decoded.startsWith('//') || decoded.includes('\\') || decoded.includes('://')) {
      return null;
    }
  } catch {
    return null;
  }
  return path;
}

export function rememberRedirect(path: string | null) {
  if (typeof window === 'undefined') return;
  if (!path) return;
  sessionStorage.setItem(STORAGE_KEY, path);
}

export function peekRememberedRedirect(): string | null {
  if (typeof window === 'undefined') return null;
  return safeRedirectPath(sessionStorage.getItem(STORAGE_KEY));
}

export function clearRememberedRedirect() {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(STORAGE_KEY);
}
