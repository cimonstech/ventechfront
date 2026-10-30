import { hasActiveAffiliateRole, hasActiveInvestorRole } from '@/lib/account';
import type { AccessProfile } from '@/lib/access';
import { authHeaders } from '@/lib/authHeaders';
import { fetchPublicFeatures } from '@/lib/features';
import { hasAdminEntry } from '@/lib/roles';
import { safeRedirectPath } from '@/lib/safeRedirect';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export function landingFromAccess(
  access: Pick<AccessProfile, 'role' | 'programRoles'>,
  flags?: { feature_vlb_v3_enabled?: boolean } | null
): string {
  if (hasAdminEntry(access.role)) return '/admin';
  if (flags?.feature_vlb_v3_enabled && hasActiveInvestorRole(access.programRoles)) return '/account/investments';
  if (hasActiveAffiliateRole(access.programRoles)) return '/account/affiliate';
  return '/account';
}

export async function fetchAccessProfile(): Promise<AccessProfile | null> {
  const response = await fetch(`${API_URL}/api/me/access`, {
    headers: await authHeaders(),
    cache: 'no-store',
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body?.success === false || !body?.data) return null;
  return body.data as AccessProfile;
}

export async function postSignInPath(
  redirect?: string | null,
  fallbackRole?: string | null
): Promise<string> {
  const next = safeRedirectPath(redirect);
  if (next) return next;
  try {
    const access = await fetchAccessProfile();
    if (access) {
      const flags = await fetchPublicFeatures();
      return landingFromAccess(access, flags);
    }
  } catch (error) {
    console.error('post-login access', error);
  }
  if (hasAdminEntry(fallbackRole)) return '/admin';
  return '/account';
}
