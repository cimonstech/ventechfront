import { authHeaders } from '@/lib/authHeaders';
import { apiMessage, deviceRequest } from '@/lib/devicesAdmin';
import { formatGhs, ghsInput, nested, pesewasFromGhs } from '@/lib/affiliatesAdmin';
import type { VlbPayoutRow, VlbPublicPlan } from '@/lib/vlb';
import { downloadAuthFile } from '@/lib/vlb';

export { apiMessage, deviceRequest, downloadAuthFile, formatGhs, ghsInput, nested, pesewasFromGhs };

export async function downloadVlbCsv(path: string, filename: string) {
  return downloadAuthFile(path, filename);
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export interface VlbAdminPlan extends VlbPublicPlan {
  is_active: boolean;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
}

export interface VlbApplicationRow {
  id: string;
  user_id: string | null;
  full_name: string;
  email: string;
  phone: string;
  plan_id: string | null;
  message: string | null;
  status: string;
  notes: string | null;
  created_at: string;
  vlb_plans?:
    | { name?: string; plan_group?: string; tier?: string; version?: string; principal_pesewas?: number }
    | Array<{ name?: string; plan_group?: string; tier?: string; version?: string; principal_pesewas?: number }>
    | null;
}

export interface VlbSchedulePreview {
  plan: VlbPublicPlan;
  schedule: Array<{
    type: string;
    term_no: number | null;
    period_no: number;
    due_date: string;
    gross_pesewas: number;
    scholar_pesewas: number;
    net_pesewas: number;
  }>;
  totals: {
    monthly_net: number;
    term_totals: number[];
    total_net: number;
    scholar_fund_total: number;
    principal: number;
  };
}

export interface VlbPayoutQueueRow extends VlbPayoutRow {
  vlb_investments?:
    | {
        id: string;
        status: string;
        renewal_choice: string;
        investor_id: string;
        plan_snapshot?: { name?: string } | null;
        investors?: { investor_no?: string | null } | Array<{ investor_no?: string | null }> | null;
      }
    | Array<{
        id: string;
        status: string;
        renewal_choice: string;
        investor_id: string;
        plan_snapshot?: { name?: string } | null;
        investors?: { investor_no?: string | null } | Array<{ investor_no?: string | null }> | null;
      }>
    | null;
}

export function payoutQueueMeta(row: VlbPayoutQueueRow) {
  const investment = nested(row.vlb_investments);
  const investor = nested(investment?.investors);
  return {
    investor_no: investor?.investor_no || null,
    plan_name: investment?.plan_snapshot?.name || '—',
  };
}

export async function uploadVlbDocument(
  investorId: string,
  file: File,
  kind: string,
  title: string,
  investmentId?: string
) {
  const headers = await authHeaders();
  const body = new FormData();
  body.append('file', file);
  body.append('kind', kind);
  body.append('title', title);
  if (investmentId) body.append('investment_id', investmentId);
  const response = await fetch(`${API_URL}/api/admin/vlb/investors/${investorId}/documents`, {
    method: 'POST',
    headers,
    body,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.success === false) {
    throw new Error(typeof payload?.message === 'string' ? payload.message : 'Could not store this file.');
  }
  return payload.data;
}
