'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { storeReferralCookie } from '@/lib/referralCookie';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
let lastHandled = '';

export function ReferralCapture() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      const code = url.searchParams.get('ref')?.trim();
      if (!code) return;

      const landingUrl = url.href;
      if (lastHandled === landingUrl) return;
      lastHandled = landingUrl;

      const productMatch = url.pathname.match(/^\/product\/([^/]+)\/?$/);
      const productSlug = productMatch ? decodeURIComponent(productMatch[1]) : undefined;

      url.searchParams.delete('ref');
      window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);

      void fetch(`${API_URL}/api/ref/click`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          landing_url: landingUrl,
          ...(productSlug ? { product_slug: productSlug } : {}),
        }),
      })
        .then(async (response) => {
          if (!response.ok) return;
          const body = await response.json().catch(() => null);
          const clickId = body?.data?.click_id;
          const expiresAt = body?.data?.expires_at;
          if (typeof clickId === 'string' && typeof expiresAt === 'string') {
            storeReferralCookie({ code, click_id: clickId, expires_at: expiresAt });
          }
        })
        .catch(() => {});
    } catch {
      // never block rendering
    }
  }, [pathname, searchParams]);

  return null;
}
