import { accessDeniedMessage } from '@/lib/access';
import { authHeaders } from '@/lib/authHeaders';
import { apiMessage, deviceRequest } from '@/lib/devicesAdmin';
import { AFFILIATE_STATUS_LABEL, affiliateStatusVariant } from '@/lib/affiliatesAdmin';

export { apiMessage, deviceRequest, AFFILIATE_STATUS_LABEL, affiliateStatusVariant };

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export type CustomerType = 'all' | 'regular' | 'affiliate' | 'investor';
export type InvestorListStatus = 'active' | 'past';

export type CustomerCounts = {
  all: number;
  regular: number;
  affiliate: number | null;
  investor: number | null;
};

export type CustomerListRow = {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string | null;
  phone: string | null;
  created_at: string;
  newsletter_subscribed: boolean;
  is_affiliate: boolean | null;
  affiliate_no: string | null;
  affiliate_status: string | null;
  is_investor: boolean | null;
  investor_no: string | null;
  active_investments_count: number | null;
};

export type CustomerDetail = CustomerListRow & {
  affiliate: {
    id: string;
    affiliate_no: string | null;
    status: string;
    created_at: string;
  } | null;
  investor: {
    id: string;
    investor_no: string | null;
    active_investments_count: number;
  } | null;
};

export function customerName(row: { first_name?: string | null; last_name?: string | null; full_name?: string | null; email: string }) {
  const joined = `${row.first_name || ''} ${row.last_name || ''}`.trim();
  return joined || row.full_name || row.email;
}

export function affiliateTypeHint(row: Pick<CustomerListRow, 'affiliate_no' | 'affiliate_status'>): string {
  const status = AFFILIATE_STATUS_LABEL[row.affiliate_status || ''] || row.affiliate_status || 'Active';
  const no = row.affiliate_no?.trim();
  return no ? `Affiliate ${no}, ${status}` : `Affiliate, ${status}`;
}

export function investorTypeHint(row: Pick<CustomerListRow, 'investor_no' | 'active_investments_count'>): string {
  const live = row.active_investments_count || 0;
  if (live <= 0) return 'Past investor';
  const investments = live === 1 ? '1 active investment' : `${live} active investments`;
  const no = row.investor_no?.trim();
  return no ? `Laptop Banking investor ${no}, ${investments}` : `Laptop Banking investor, ${investments}`;
}

export async function downloadCustomersCsv(params: URLSearchParams): Promise<void> {
  const headers = await authHeaders();
  const response = await fetch(`${API_URL}/api/admin/customers/export?${params.toString()}`, { headers });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(
      accessDeniedMessage(response.status, typeof body?.message === 'string' ? body.message : 'Could not export this file.')
    );
  }
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'customers.csv';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
