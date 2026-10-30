export const RECOVERY_ONLY_KEY = 'vt-recovery-only';
export const RECOVERY_ONLY_EVENT = 'vt-recovery-only';

export type RecoveryLinkType = 'recovery' | 'invite';

export function isRecoveryLinkType(value: string | null | undefined): value is RecoveryLinkType {
  return value === 'recovery' || value === 'invite';
}

export function isRecoveryOnly(): boolean {
  if (typeof window === 'undefined') return false;
  return sessionStorage.getItem(RECOVERY_ONLY_KEY) === '1';
}

export function markRecoveryOnly(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(RECOVERY_ONLY_KEY, '1');
  window.dispatchEvent(new Event(RECOVERY_ONLY_EVENT));
}

export function clearRecoveryOnly(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(RECOVERY_ONLY_KEY);
  window.dispatchEvent(new Event(RECOVERY_ONLY_EVENT));
}

export function hashRecoveryType(): RecoveryLinkType | null {
  if (typeof window === 'undefined') return null;
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const type = hash.get('type');
  return isRecoveryLinkType(type) ? type : null;
}

export function holdAuthUi(): boolean {
  if (typeof window === 'undefined') return false;
  if (isRecoveryOnly()) return true;
  return window.location.pathname === '/reset-password';
}
