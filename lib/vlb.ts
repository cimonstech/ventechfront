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
  scholar_fund_percent?: number;
  scholar_fund_basis?: string;
  principal_settlement: {
    status: string;
    due_date: string;
    net_pesewas: number;
    paid_at: string | null;
  } | null;
  renewal_choice: 'settle' | 'renew';
  renewal_chosen_at: string | null;
  renewal_open: boolean;
  renewal_deadline?: string | null;
  stars_total: number;
  stars_used: number;
  horizon_months?: number;
  horizon_progress?: { days_elapsed: number; days_total: number };
  paid_payouts?: Array<{
    id: string;
    type: string;
    period_no: number;
    due_date: string;
    paid_at: string | null;
    net_pesewas: number;
  }>;
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
  return formatGhs(pesewas);
}

export const VLB_EARLY_EXIT_ALLOWED = false;

export function formatPercentLabel(value: number | null | undefined, fallback = '1'): string {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return fallback;
  const text = amount.toFixed(4).replace(/\.?0+$/, '');
  return text || fallback;
}

export function scholarFundCopy(percent?: number | null, basis?: string | null): string {
  const shown = formatPercentLabel(percent);
  if (basis === 'principal') {
    return `${shown}% of your principal, taken once per term`;
  }
  return `${shown}% of each payout goes to the VENTECH Scholar Fund, which supports students. It is shown on every payout so you can see exactly what you receive.`;
}

export function payoutStatusTip(status: string, reference?: string | null): string | null {
  if (status === 'scheduled') return 'Not due yet.';
  if (status === 'due') return 'Due now; VENTECH will send it shortly.';
  if (status === 'paid') return `Sent. Reference: ${reference || '—'}.`;
  return null;
}

export function payoutStatusVariant(status: string): 'default' | 'success' | 'warning' | 'error' | 'info' {
  if (status === 'paid' || status === 'settled' || status === 'active') return 'success';
  if (status === 'due' || status === 'processing' || status === 'settlement') return 'warning';
  if (status === 'declined') return 'error';
  return 'info';
}

export async function fetchPublicVlbPlans(): Promise<VlbPublicPlan[]> {
  const { apiRequest, toApiError } = await import('@/lib/api');
  const result = await apiRequest<VlbPublicPlan[]>('/api/vlb/plans');
  if (!result.ok) throw toApiError(result);
  return result.data || [];
}

export async function submitVlbApplication(input: {
  full_name: string;
  email: string;
  phone: string;
  plan_id: string;
  message?: string;
  files?: File[];
}) {
  const headers = await authHeaders();
  const body = new FormData();
  body.append('full_name', input.full_name);
  body.append('email', input.email);
  body.append('phone', input.phone);
  body.append('plan_id', input.plan_id);
  if (input.message) body.append('message', input.message);
  for (const file of input.files || []) body.append('files', file);
  const response = await fetch(`${API_URL}/api/vlb/applications`, {
    method: 'POST',
    headers,
    body,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.success === false) {
    const error = new Error(typeof payload?.message === 'string' ? payload.message : 'Could not save this application.') as Error & {
      fields?: Record<string, string>;
    };
    if (payload?.errors && typeof payload.errors === 'object') error.fields = payload.errors;
    throw error;
  }
  return payload;
}

export function vlbRequest<T>(path: string, init: RequestInit = {}) {
  return deviceRequest<T>(path, init);
}

export interface VlbPublicDocs {
  guide?: { title: string; url: string };
  agreement_template?: { title: string; url: string };
  agreement?: { title: string; url: string };
}

export async function fetchPublicVlbDocs(): Promise<VlbPublicDocs> {
  const response = await fetch(`${API_URL}/api/vlb/public-docs`, { cache: 'no-store' });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body?.success === false) {
    throw new Error(typeof body?.message === 'string' ? body.message : 'Could not load documents.');
  }
  const data = (body.data || {}) as VlbPublicDocs;
  const agreement = data.agreement?.url ? data.agreement : data.agreement_template?.url ? data.agreement_template : undefined;
  return {
    guide: data.guide?.url ? data.guide : undefined,
    agreement_template: agreement,
    agreement,
  };
}

export async function fetchPublicAgreementTemplate(): Promise<{ url: string; title: string } | null> {
  const docs = await fetchPublicVlbDocs().catch(() => ({} as VlbPublicDocs));
  return docs.agreement_template || null;
}

export async function openSignedVlbDocument(documentId: string) {
  const result = await vlbRequest<{ url: string | null }>(`/api/vlb/me/documents/${documentId}`);
  if (!result.data?.url) {
    throw new Error('Could not download this file.');
  }
  window.open(result.data.url, '_blank', 'noopener,noreferrer');
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
