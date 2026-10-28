import { authHeaders } from '@/lib/authHeaders';
import { accessDeniedMessage } from '@/lib/access';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export type WarrantyStatus = 'active' | 'expired' | 'none';
export type DeviceStatus = 'active' | 'transferred' | 'retired';

export interface DeviceWarranty {
  status: WarrantyStatus;
  endsOn: string | null;
}

export interface DeviceRecord {
  id: string;
  order_id: string | null;
  order_item_id: string | null;
  product_id: string | null;
  user_id: string | null;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  model_name: string;
  serial_number: string;
  purchase_date: string;
  warranty_months: number;
  warranty_start: string;
  qr_token: string;
  status: DeviceStatus;
  notes: string | null;
  owner_linked_at?: string | null;
  created_at?: string;
  warranty: DeviceWarranty;
  order_number: string | null;
  product: { id: string; name: string; slug: string | null; thumbnail: string | null } | null;
  order: { id: string; order_number: string; user_id?: string | null } | null;
  owner: { id: string; full_name: string | null; email: string | null; phone: string | null } | null;
}

export interface OrderLookupItem {
  order_item_id: string;
  product_id: string | null;
  product_name: string;
  quantity: number;
  warranty_months: number | null;
  devices_registered: number;
}

export interface OrderLookup {
  order: {
    id: string;
    order_number: string;
    created_at: string;
    user_id: string | null;
    customer_name: string | null;
    customer_email: string | null;
    customer_phone: string | null;
  };
  items: OrderLookupItem[];
}

export interface DevicePage {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export function apiMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

export function formatDeviceDate(value: string | null | undefined): string {
  if (!value) return '';
  const [year, month, day] = value.slice(0, 10).split('-').map(Number);
  if (!year || !month || !day) return value;
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export function devicePublicUrl(token: string): string {
  const site = (process.env.NEXT_PUBLIC_SITE_URL || '').trim().replace(/\/$/, '');
  if (!site || !token) return '';
  return `${site}/d/${encodeURIComponent(token)}`;
}

export async function deviceRequest<T>(
  path: string,
  init: RequestInit = {}
): Promise<{ data: T; message: string; pagination?: DevicePage }> {
  const headers = await authHeaders();
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      ...headers,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok || body?.success === false) {
    const fallback = typeof body?.message === 'string' ? body.message : 'Request failed';
    throw new Error(accessDeniedMessage(response.status, fallback));
  }

  return {
    data: body.data as T,
    message: typeof body?.message === 'string' ? body.message : 'Saved',
    pagination: body.pagination,
  };
}
