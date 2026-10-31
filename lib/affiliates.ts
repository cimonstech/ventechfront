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
  commission_copy?: string;
  eligible_scope?: 'all' | 'categories';
  eligible_category_names: string[];
  commission_mode?: 'flat' | 'percent';
  commission_percent_bp?: number;
  commission_cap_pesewas?: number | null;
  min_order_pesewas?: number;
  min_withdrawal_pesewas: number;
  payout_methods: PayoutMethod[];
  return_window_days?: number;
  payout_change_hold_hours?: number;
  fee_refund_on_rejection?: boolean;
  payout_working_days?: number;
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
    payout_details_changed_at?: string | null;
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
  skip_reason?: string | null;
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

export function skipReasonCopy(reason: string | null | undefined, minOrderPesewas = 0): string {
  if (reason === 'below_minimum') return `Below the ${formatCopyGhs(minOrderPesewas)} minimum order`;
  if (reason === 'category_not_eligible') return 'Product not included in the programme';
  if (reason === 'self_referral') return 'You cannot earn commission on your own order';
  if (reason === 'refunded') return 'Order refunded';
  if (reason === 'settings_error') return 'This sale could not be processed';
  return '';
}

export function payoutMethodLabel(method: string): string {
  if (method === 'momo') return 'Mobile Money';
  if (method === 'bank') return 'Bank transfer';
  return method;
}

export function formatCopyGhs(pesewas: number | null | undefined): string {
  return formatGhs(pesewas);
}

export function formatCopyDateTime(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Africa/Accra',
  });
}

export function payoutHoldUntil(changedAt: string | null | undefined, holdHours: number): Date | null {
  if (!changedAt || holdHours <= 0) return null;
  const start = new Date(changedAt).getTime();
  if (!Number.isFinite(start)) return null;
  return new Date(start + holdHours * 60 * 60 * 1000);
}

export function withdrawalStatusTip(status: string, reference?: string | null, reason?: string | null): string {
  if (status === 'requested') return "We've received your request.";
  if (status === 'processing') return "We're preparing your payment.";
  if (status === 'approved') return 'Your payment is approved and will be sent shortly.';
  if (status === 'paid') return `Sent to your account. Reference: ${reference || '—'}.`;
  if (status === 'rejected') {
    return `Not paid. Reason: ${reason || '—'}. The amount has been returned to your available balance.`;
  }
  return '';
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
  const { apiRequest, toApiError } = await import('@/lib/api');
  const result = await apiRequest<AffiliateMe>('/api/affiliates/me');
  if (result.ok) return result.data;
  if (result.kind === 'not_found') return null;
  throw toApiError(result);
}
