import { authHeaders } from '@/lib/authHeaders';
import { apiMessage, deviceRequest, formatDeviceDate } from '@/lib/devicesAdmin';
import { formatGhs } from '@/lib/affiliatesAdmin';

export { apiMessage, formatGhs, formatDeviceDate };

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export interface VlbPlanDisplay {
  monthly_net_pesewas: number;
  scholar_monthly_pesewas: number;
  term_totals_pesewas: number[];
  total_net_pesewas: number;
  scholar_fund_total_pesewas: number;
  principal_pesewas: number;
}

export interface VlbPublicPlan {
  id: string;
  plan_group: 'vts' | 'exclusive' | string;
  tier: string;
  name: string;
  version: string;
  principal_pesewas: number;
  terms_count: number;
  months_per_term: number;
  settlement_months: number;
  term_rates_percent: number[];
  rate_basis: string;
  payout_frequency: string;
  scholar_fund_percent: number;
  scholar_fund_basis: string;
  premium_stars: number;
  referral_bonus_percent: number;
  display: VlbPlanDisplay;
}

export interface VlbPayoutSummary {
  date: string;
  type: string;
  period_no: number;
  gross_pesewas: number;
  scholar_pesewas: number;
  net_pesewas: number;
  status: string;
}

export interface VlbInvestmentSummary {
  id: string;
  plan_name: string;
  plan_id: string;
  principal_pesewas: number;
  start_date: string;
  maturity_date: string;
  status: string;
  current_term: number;
  term_progress: { days_elapsed: number; days_total: number };
  next_payout: VlbPayoutSummary | null;
  totals_paid_pesewas: number;
  scholar_fund_deducted_pesewas: number;
  principal_settlement: {
    status: string;
    due_date: string;
    net_pesewas: number;
    paid_at: string | null;
  } | null;
  renewal_choice: 'settle' | 'renew';
  renewal_chosen_at: string | null;
  renewal_open: boolean;
  stars_total: number;
  stars_used: number;
  horizon_months?: number;
  horizon_progress?: { days_elapsed: number; days_total: number };
}

export interface VlbPayoutRow {
  id: string;
  type: string;
  term_no: number | null;
  period_no: number;
  due_date: string;
  gross_pesewas: number;
  scholar_pesewas: number;
  net_pesewas: number;
  status: string;
  paid_at: string | null;
  method: string | null;
  reference: string | null;
  notes: string | null;
}

export interface VlbInvestmentDetail extends VlbInvestmentSummary {
  investor_no: string | null;
  schedule: VlbPayoutRow[];
  star_redemptions: Array<{ id: string; product_note: string; order_id: string | null; created_at: string }>;
  referral_bonuses: Array<{
    id: string;
    referred_investment_id: string;
    bonus_percent: number;
    applied_from_period: number;
    created_at: string;
  }>;
}

export interface VlbPayoutDetails {
  payout_method: string | null;
  momo_network: string | null;
  momo_number: string | null;
  bank_name: string | null;
  bank_account_name: string | null;
  bank_account_number: string | null;
  payout_details_changed_at: string | null;
}

export interface VlbMeSummary {
  total_invested_pesewas: number;
  received_pesewas: number;
  scholar_fund_pesewas: number;
  next_payout: {
    investment_id: string | null;
    date: string;
    net_pesewas: number;
  } | null;
  featured: {
    investment_id: string;
    plan_name: string;
    horizon_months: number;
    horizon_progress: { days_elapsed: number; days_total: number };
  } | null;
}

export interface VlbMe {
  investor_no: string | null;
  payout: VlbPayoutDetails;
  investments: VlbInvestmentSummary[];
  summary: VlbMeSummary;
}

export interface VlbDocument {
  id: string;
  investment_id: string | null;
  kind: string;
  title: string;
  mime: string;
  size_bytes: number;
  created_at: string;
  url: string | null;
}

export function vlbGhs(pesewas: number | null | undefined): string {
  const amount = Number(pesewas);
  if (!Number.isFinite(amount)) return 'GHS 0';
  const cedis = amount / 100;
  if (Number.isInteger(cedis)) return `GHS ${cedis.toLocaleString('en-US')}`;
  return formatGhs(amount);
}

export function payoutStatusVariant(status: string): 'default' | 'success' | 'warning' | 'error' | 'info' {
  if (status === 'paid' || status === 'settled' || status === 'active') return 'success';
  if (status === 'due' || status === 'processing' || status === 'settlement') return 'warning';
  if (status === 'declined') return 'error';
  return 'info';
}

export async function fetchPublicVlbPlans(): Promise<VlbPublicPlan[]> {
  const response = await fetch(`${API_URL}/api/vlb/plans`, { cache: 'no-store' });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body?.success === false) {
    throw new Error(typeof body?.message === 'string' ? body.message : 'Could not load plans.');
  }
  return (body.data || []) as VlbPublicPlan[];
}

export async function submitVlbApplication(input: {
  full_name: string;
  email: string;
  phone: string;
  plan_id: string;
  message?: string;
}) {
  const headers = await authHeaders();
  const response = await fetch(`${API_URL}/api/vlb/applications`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body?.success === false) {
    throw new Error(typeof body?.message === 'string' ? body.message : 'Could not save this application.');
  }
  return body;
}

export function vlbRequest<T>(path: string, init: RequestInit = {}) {
  return deviceRequest<T>(path, init);
}

export async function downloadAuthFile(path: string, filename: string) {
  const headers = await authHeaders();
  const response = await fetch(`${API_URL}${path}`, { headers });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(typeof body?.message === 'string' ? body.message : 'Could not download this file.');
  }
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
