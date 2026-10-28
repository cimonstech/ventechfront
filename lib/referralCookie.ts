import { fetchPublicFeatures } from '@/lib/features';

const COOKIE = 'vt_ref';

export interface ReferralCookie {
  code: string;
  click_id: string;
  expires_at: string;
}

function cookieParts(): string[] {
  if (typeof document === 'undefined') return [];
  return document.cookie.split('; ');
}

export function storeReferralCookie(value: ReferralCookie) {
  if (typeof document === 'undefined') return;
  const expires = new Date(value.expires_at);
  if (Number.isNaN(expires.getTime())) return;
  const payload = encodeURIComponent(JSON.stringify({
    code: value.code,
    click_id: value.click_id,
    expires_at: value.expires_at,
  }));
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${COOKIE}=${payload}; Path=/; SameSite=Lax; Expires=${expires.toUTCString()}${secure}`;
}

export function readReferralCookie(): ReferralCookie | null {
  const match = cookieParts().find((row) => row.startsWith(`${COOKIE}=`));
  if (!match) return null;
  try {
    const parsed = JSON.parse(decodeURIComponent(match.slice(COOKIE.length + 1))) as ReferralCookie;
    if (!parsed?.click_id || !parsed?.expires_at) return null;
    if (new Date(parsed.expires_at).getTime() <= Date.now()) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function referralFromCookie(): { click_id: string } | null {
  const cookie = readReferralCookie();
  return cookie ? { click_id: cookie.click_id } : null;
}

export async function referralForCheckout(): Promise<{ click_id: string } | null> {
  const flags = await fetchPublicFeatures();
  if (!flags.feature_affiliates_enabled) return null;
  return referralFromCookie();
}
