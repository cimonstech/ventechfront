const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
const TTL_MS = 60 * 1000;

export interface PublicFeatures {
  feature_affiliates_enabled: boolean;
  feature_vlb_v3_enabled: boolean;
}

const OFF: PublicFeatures = {
  feature_affiliates_enabled: false,
  feature_vlb_v3_enabled: false,
};

let cache: { at: number; flags: PublicFeatures } | null = null;

function readFlags(body: unknown): PublicFeatures {
  const data =
    body && typeof body === 'object' && 'data' in body
      ? (body as { data?: unknown }).data
      : body;
  if (!data || typeof data !== 'object') return { ...OFF };
  const row = data as Record<string, unknown>;
  return {
    feature_affiliates_enabled: row.feature_affiliates_enabled === true,
    feature_vlb_v3_enabled: row.feature_vlb_v3_enabled === true,
  };
}

export function clearPublicFeaturesCache() {
  cache = null;
}

export async function fetchPublicFeatures(): Promise<PublicFeatures> {
  if (cache && Date.now() - cache.at < TTL_MS) {
    return cache.flags;
  }

  try {
    const response = await fetch(`${API_URL}/api/features`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(5000),
    });
    const body = await response.json().catch(() => null);
    const flags = response.ok ? readFlags(body) : { ...OFF };
    cache = { at: Date.now(), flags };
    return flags;
  } catch {
    cache = { at: Date.now(), flags: { ...OFF } };
    return cache.flags;
  }
}
