import { authHeaders } from '@/lib/authHeaders';
import { apiMessage, deviceRequest } from '@/lib/devicesAdmin';
import { formatGhs, formatWhen } from '@/lib/affiliatesAdmin';

export { apiMessage, formatGhs, formatWhen };

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export type PayoutMethod = 'momo' | 'bank';
export type WithdrawalMode = 'anytime' | 'month_end';

export interface PublicAffiliateInfo {
  fee_pesewas: number;
  commission_pesewas: number;
  eligible_category_names: string[];
  min_withdrawal_pesewas: number;
  payout_methods: PayoutMethod[];
}

export interface AffiliateMe {
  id: string;
  status: string;
  affiliate_no: string | null;
  referral_code: string | null;
  terms_version: number | null;
  terms_accepted_at: string | null;
  withdrawal_mode: WithdrawalMode;
  payout: {
    payout_method: string | null;
    momo_network: string | null;
    momo_number: string | null;
    bank_name: string | null;
    bank_account_name: string | null;
    bank_account_number: string | null;
  };
  links: { general: string; product: string } | null;
  fee_paid_at: string | null;
  fee_refunded_at: string | null;
  fee_amount_pesewas: number | null;
  rejected_reason: string | null;
  suspended_reason: string | null;
  refund_due: boolean;
  created_at: string;
}

export interface AffiliateSummary {
  link_clicks: number;
  referred_customers: number;
  successful_sales: number;
  total_commission_pesewas: number;
  pending_pesewas: number;
  available_pesewas: number;
  withdrawn_pesewas: number;
}

export interface AffiliateSale {
  order_number: string | null;
  product_names: string[];
  date: string;
  commission_status: string;
  amount_pesewas: number;
}

export interface AffiliateWithdrawal {
  id: string;
  amount_pesewas: number;
  mode: string;
  status: string;
  reason: string | null;
  payment_reference: string | null;
  processed_at: string | null;
  paid_at: string | null;
  created_at: string;
}

export interface AffiliateProductHit {
  name: string;
  slug: string | null;
}

export function payoutMethodLabel(method: string): string {
  if (method === 'momo') return 'Mobile Money';
  if (method === 'bank') return 'Bank transfer';
  return method;
}

export async function fetchPublicAffiliateInfo(): Promise<PublicAffiliateInfo | null> {
  try {
    const init: RequestInit & { next?: { revalidate: number } } =
      typeof window === 'undefined' ? { next: { revalidate: 60 } } : { cache: 'no-store' };
    const response = await fetch(`${API_URL}/api/affiliates/public-info`, init);
    if (!response.ok) return null;
    const body = await response.json();
    const data = body?.data;
    if (!data || typeof data.fee_pesewas !== 'number') return null;
    return data as PublicAffiliateInfo;
  } catch (error) {
    console.error('affiliate public info', error);
    return null;
  }
}

export async function affiliateRequest<T>(
  path: string,
  init: RequestInit = {}
): Promise<{ data: T; message: string; pagination?: { page: number; limit: number; total: number; totalPages: number } }> {
  return deviceRequest<T>(path, init);
}

export async function loadAffiliateMe(): Promise<AffiliateMe | null> {
  const headers = await authHeaders();
  const response = await fetch(`${API_URL}/api/affiliates/me`, { headers });
  if (response.status === 404) return null;
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body?.success === false) {
    throw new Error(typeof body?.message === 'string' ? body.message : 'Could not load your affiliate account.');
  }
  return body.data as AffiliateMe;
}
