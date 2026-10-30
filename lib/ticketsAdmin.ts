import { accessDeniedMessage } from '@/lib/access';
import { authHeaders } from '@/lib/authHeaders';
import { apiMessage, deviceRequest, formatDeviceDate } from '@/lib/devicesAdmin';

export { apiMessage, deviceRequest, formatDeviceDate };

export const TICKET_STAGES = [
  'submitted',
  'under_review',
  'diagnosing',
  'repair_resolution',
  'ready',
  'completed',
] as const;

export type TicketStatus = (typeof TICKET_STAGES)[number] | 'closed';

export const STATUS_LABEL: Record<string, string> = {
  submitted: 'Submitted',
  under_review: 'Under review',
  diagnosing: 'Diagnosing',
  repair_resolution: 'Repair resolution',
  ready: 'Ready',
  completed: 'Completed',
  closed: 'Closed',
};

export function statusVariant(status: string): 'default' | 'success' | 'warning' | 'error' | 'info' {
  if (status === 'submitted' || status === 'repair_resolution') return 'warning';
  if (status === 'ready' || status === 'completed') return 'success';
  if (status === 'closed') return 'default';
  return 'info';
}

export interface TicketListItem {
  id: string;
  ticket_no: string;
  status: string;
  laptop_model: string;
  serial_number: string | null;
  contact_phone: string;
  assigned_to: string | null;
  assignee_name?: string | null;
  assignee_locked?: boolean;
  warranty_status_at_submit: string | null;
  updated_at: string;
  issue: { id: string; name: string } | null;
  customer: { name: string | null; email: string | null };
}

export interface TicketSummary {
  counts: Record<string, number>;
  open_older_than_7_days: number;
  average_days_to_complete_90: number | null;
}

export interface TicketAssignee {
  id: string;
  name: string | null;
  email: string | null;
}

export interface TicketIssueType {
  id: string;
  name: string;
  sort_order: number;
  is_active?: boolean;
}

export interface TicketEvent {
  id: string;
  type: string;
  from_status: string | null;
  to_status: string | null;
  body: string | null;
  is_internal: boolean;
  actor_role: string | null;
  created_at: string;
}

export interface TicketMedia {
  id: string;
  kind: 'image' | 'video' | 'receipt' | string;
  mime: string;
  size_bytes: number;
  previewUrl: string;
  created_at?: string;
}

export interface TicketDetail {
  id: string;
  ticket_no: string;
  status: string;
  laptop_model: string;
  serial_number: string | null;
  description: string;
  date_started: string;
  contact_name: string;
  contact_phone: string;
  warranty_status_at_submit: string | null;
  is_warranty: boolean | null;
  resolution: string | null;
  repair_cost: number | string | null;
  repair_paid: boolean;
  repair_paid_amount: number | string | null;
  repair_paid_method: string | null;
  repair_paid_reference: string | null;
  repair_paid_at: string | null;
  order_number_text: string | null;
  issue_type: { id: string; name: string } | null;
  customer: { id: string; name: string | null; email: string | null } | null;
  assignee: { id: string | null; name: string | null; email: string | null; locked?: boolean } | null;
  device: { id: string; model_name: string; serial_number: string } | null;
  order: { id: string; order_number: string } | null;
  events: TicketEvent[];
  media: TicketMedia[];
  previous_tickets: Array<{ ticket_no: string; status: string; date: string }>;
}

export function openTicketCount(summary: TicketSummary | null): number {
  if (!summary) return 0;
  return TICKET_STAGES.filter((status) => status !== 'completed').reduce(
    (sum, status) => sum + (summary.counts[status] || 0),
    0
  );
}

export const PAYMENT_METHODS = [
  { id: 'cash', label: 'Cash' },
  { id: 'momo', label: 'MoMo' },
  { id: 'card', label: 'Card' },
  { id: 'bank_transfer', label: 'Bank transfer' },
] as const;

export interface RepairReceipt {
  ticket_no: string;
  laptop_model: string;
  amount: number | null;
  method: string | null;
  method_label: string | null;
  reference: string | null;
  paid_at: string | null;
  contact: { phone: string; email: string };
}

export async function downloadReceiptPdf(path: string, filename: string): Promise<void> {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
  const response = await fetch(`${API_URL}${path}${path.includes('?') ? '&' : '?'}format=pdf`, {
    headers: await authHeaders(),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(accessDeniedMessage(response.status, typeof body?.message === 'string' ? body.message : 'Could not download this receipt.'));
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

export function formatTicketWhen(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return formatDeviceDate(value) || value;
  return date.toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
