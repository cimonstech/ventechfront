import { accessDeniedMessage } from '@/lib/access';
import { authHeaders } from '@/lib/authHeaders';
import { apiMessage, deviceRequest, formatDeviceDate } from '@/lib/devicesAdmin';

export { apiMessage, deviceRequest, formatDeviceDate };

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export type AffiliateStatus = 'awaiting_payment' | 'pending' | 'active' | 'suspended' | 'rejected';
export type CommissionStatus = 'pending' | 'approved' | 'reversed';
export type WithdrawalStatus = 'requested' | 'processing' | 'approved' | 'paid' | 'rejected';

export const AFFILIATE_STATUS_LABEL: Record<string, string> = {
  awaiting_payment: 'Awaiting payment',
  pending: 'Pending',
  active: 'Active',
  suspended: 'Suspended',
  rejected: 'Rejected',
};

export const COMMISSION_STATUS_LABEL: Record<string, string> = {
  pending: 'Pending',
  approved: 'Approved',
  reversed: 'Reversed',
};

export const WITHDRAWAL_STATUS_LABEL: Record<string, string> = {
  requested: 'Requested',
  processing: 'Processing',
  approved: 'Approved',
  paid: 'Paid',
  rejected: 'Rejected',
};

export function affiliateStatusVariant(status: string): 'default' | 'success' | 'warning' | 'error' | 'info' {
  if (status === 'active' || status === 'approved' || status === 'paid') return 'success';
  if (status === 'pending' || status === 'requested' || status === 'processing' || status === 'awaiting_payment') return 'warning';
  if (status === 'suspended' || status === 'rejected' || status === 'reversed' || status === 'failed') return 'error';
  return 'info';
}

export function formatGhs(pesewas: number | null | undefined): string {
  const amount = Number(pesewas);
  if (!Number.isFinite(amount)) return 'GH₵ 0.00';
  return `GH₵ ${(amount / 100).toFixed(2)}`;
}

export function pesewasFromGhs(value: string): number {
  const amount = Number.parseFloat(value);
  if (!Number.isFinite(amount) || amount < 0) return 0;
  return Math.round(amount * 100);
}

export function ghsInput(pesewas: number | null | undefined): string {
  const amount = Number(pesewas);
  if (!Number.isFinite(amount)) return '0.00';
  return (amount / 100).toFixed(2);
}

export function formatWhen(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return formatDeviceDate(value) || '—';
  return date.toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function maskTail(value: string | null | undefined): string {
  if (!value) return '—';
  if (value.length <= 3) return '*'.repeat(value.length);
  return `${'*'.repeat(value.length - 3)}${value.slice(-3)}`;
}

export interface AffiliateListRow {
  id: string;
  status: AffiliateStatus | string;
  affiliate_no: string | null;
  referral_code: string | null;
  fee_paid_at: string | null;
  created_at: string;
  user: { id: string; name: string | null; email: string | null } | null;
}

export interface AffiliateMetrics {
  total_affiliates: number;
  active_affiliates: number;
  total_fees_paid_pesewas: number;
  link_clicks: number;
  referred_customers: number;
  affiliate_sales: number;
  total_commissions_pesewas: number;
  pending_pesewas: number;
  paid_pesewas: number;
  open_withdrawal_requests: number;
}

export interface AffiliatePayout {
  payout_method: string | null;
  momo_network: string | null;
  momo_number: string | null;
  bank_name: string | null;
  bank_account_name: string | null;
  bank_account_number: string | null;
}

export interface AffiliateDetail {
  profile: {
    id: string;
    status: string;
    affiliate_no: string | null;
    referral_code: string | null;
    promo_channels: string[] | null;
    social_handles: Record<string, string> | null;
    withdrawal_mode: string | null;
    terms_version: number | null;
    terms_accepted_at: string | null;
    approved_at: string | null;
    rejected_reason: string | null;
    suspended_reason: string | null;
    created_at: string;
    payout: AffiliatePayout;
    links: { general: string; product: string } | null;
    user: { id: string; name: string | null; email: string | null; phone: string | null } | null;
  };
  clicks: { total: number; last_at: string | null };
  orders: Array<{
    id: string;
    order_number: string;
    total: number;
    status: string;
    payment_status: string;
    delivered_at: string | null;
    created_at: string;
  }>;
  commissions: AffiliateCommissionRow[];
  ledger: AffiliateLedgerRow[];
  withdrawals: AffiliateWithdrawalRow[];
  fee: {
    amount_pesewas: number | null;
    reference: string | null;
    paid_at: string | null;
    refund_due: boolean;
    refunded_at: string | null;
    refund_reference: string | null;
  };
}

export interface AffiliateCommissionRow {
  id: string;
  affiliate_id?: string;
  order_id?: string;
  checkout_reference?: string;
  amount_pesewas: number;
  status: CommissionStatus | string;
  eligible_from: string | null;
  reason: string | null;
  created_at: string;
  affiliate?: { affiliate_no?: string | null; status?: string } | Array<{ affiliate_no?: string | null }>;
  order?: { order_number?: string | null; status?: string; payment_status?: string } | Array<{ order_number?: string | null }>;
}

export interface AffiliateLedgerRow {
  id: string;
  type: string;
  amount_pesewas: number;
  commission_id: string | null;
  withdrawal_id: string | null;
  note: string | null;
  created_at: string;
}

export interface AffiliateWithdrawalRow {
  id: string;
  affiliate_id?: string;
  amount_pesewas: number;
  mode: string;
  status: WithdrawalStatus | string;
  reason: string | null;
  payment_reference: string | null;
  processed_at: string | null;
  paid_at: string | null;
  created_at: string;
  affiliate?: { affiliate_no?: string | null } | Array<{ affiliate_no?: string | null }>;
}

export interface AffiliateSettings {
  affiliate_fee_pesewas: number;
  affiliate_commission_pesewas: number;
  affiliate_activation_mode: 'approval' | 'automatic' | string;
  affiliate_fee_refund_on_rejection: boolean;
  affiliate_eligible_category_slugs: string[];
  affiliate_min_order_pesewas: number;
  affiliate_attribution_days: number;
  affiliate_return_window_days: number;
  affiliate_withdrawal_min_pesewas: number;
  affiliate_payout_change_hold_hours: number;
}

export function nested<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export function commissionNotYetEligible(row: AffiliateCommissionRow): boolean {
  if (row.status !== 'pending') return false;
  if (!row.eligible_from) return true;
  return new Date(row.eligible_from).getTime() > Date.now();
}

export async function affiliateQueueBadge(): Promise<number> {
  const [pending, ready, metrics] = await Promise.all([
    deviceRequest<AffiliateListRow[]>('/api/admin/affiliates?status=pending&page=1&limit=1'),
    deviceRequest<AffiliateCommissionRow[]>('/api/admin/affiliates/commissions?ready=true&page=1&limit=1'),
    deviceRequest<AffiliateMetrics>('/api/admin/affiliates/metrics'),
  ]);
  return (
    (pending.pagination?.total || 0) +
    (ready.pagination?.total || 0) +
    (metrics.data?.open_withdrawal_requests || 0)
  );
}

export async function downloadAffiliateCsv(
  kind: 'affiliates' | 'commissions' | 'withdrawals',
  params: URLSearchParams
): Promise<void> {
  const headers = await authHeaders();
  const response = await fetch(`${API_URL}/api/admin/affiliates/export/${kind}?${params.toString()}`, { headers });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(accessDeniedMessage(response.status, typeof body?.message === 'string' ? body.message : 'Could not export this file.'));
  }
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${kind}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
