const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
const SESSION_KEY = 'vt_portal_sid';

export type PortalEventName =
  | 'scan'
  | 'claim_start'
  | 'claim_complete'
  | 'guide_open'
  | 'faq_open'
  | 'service_start';

function sessionId(): string {
  try {
    const existing = window.localStorage.getItem(SESSION_KEY);
    if (existing && existing.length >= 8) return existing;
    const created = crypto.randomUUID();
    window.localStorage.setItem(SESSION_KEY, created);
    return created;
  } catch {
    return '';
  }
}

export function recordPortalEvent(
  event: PortalEventName,
  payload: { token?: string | null; article_id?: string | null } = {}
): void {
  if (typeof window === 'undefined') return;
  const body: Record<string, string> = { event };
  if (payload.token) body.token = payload.token;
  if (payload.article_id) body.article_id = payload.article_id;
  void fetch(`${API_URL}/api/devices/events`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-vt-session': sessionId(),
    },
    body: JSON.stringify(body),
    keepalive: true,
  }).catch((error) => console.error('portal event', error));
}
