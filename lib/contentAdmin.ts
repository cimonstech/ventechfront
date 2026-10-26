import { authHeaders } from '@/lib/authHeaders';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export const ARTICLE_TYPES = [
  { value: 'user_guide', label: 'User guide' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'troubleshooting', label: 'Troubleshooting' },
  { value: 'hardware', label: 'Hardware' },
  { value: 'software', label: 'Software' },
  { value: 'warranty', label: 'Warranty' },
] as const;

export type ArticleType = (typeof ARTICLE_TYPES)[number]['value'];
export type ContentStatus = 'draft' | 'published';
export type TargetType = 'all' | 'brand' | 'category' | 'product';

export interface ContentTarget {
  id?: string;
  target_type: TargetType;
  target_id?: string | null;
}

export interface ArticleRecord {
  id: string;
  type: ArticleType;
  title: string;
  slug: string;
  summary: string | null;
  body_html?: string;
  attachment_url?: string | null;
  status: ContentStatus;
  sort_order: number;
  published_at?: string | null;
  updated_at: string;
  created_at?: string;
  targets?: ContentTarget[];
}

export interface FaqCategoryRecord {
  id: string;
  name: string;
  slug: string;
  sort_order: number;
  is_active: boolean;
}

export interface FaqRecord {
  id: string;
  category_id: string;
  question: string;
  answer_html: string;
  status: ContentStatus;
  sort_order: number;
  updated_at: string;
}

export interface ContentPageRecord {
  id: string;
  slug: string;
  title: string;
  body_html?: string;
  status: ContentStatus;
  version: number;
  updated_at: string;
  updated_by?: string | null;
  updated_by_name?: string | null;
}

export function apiMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

export async function contentRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = await authHeaders();
  const isForm = typeof FormData !== 'undefined' && init.body instanceof FormData;
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      ...headers,
      ...(isForm ? {} : { 'Content-Type': 'application/json' }),
      ...(init.headers || {}),
    },
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = typeof body?.message === 'string'
      ? body.message
      : typeof body?.error === 'string'
        ? body.error
        : 'Request failed';
    throw new Error(message);
  }

  return body.data as T;
}

export function articleTypeLabel(type: string): string {
  return ARTICLE_TYPES.find((item) => item.value === type)?.label || type;
}

export function targetsSummary(targets: ContentTarget[] | undefined): string {
  if (!targets || targets.length === 0) return 'No targets';
  if (targets.some((target) => target.target_type === 'all')) return 'All laptops';
  const brands = targets.filter((target) => target.target_type === 'brand').length;
  const categories = targets.filter((target) => target.target_type === 'category').length;
  const products = targets.filter((target) => target.target_type === 'product').length;
  const parts = [
    brands ? `${brands} brand${brands === 1 ? '' : 's'}` : '',
    categories ? `${categories} categor${categories === 1 ? 'y' : 'ies'}` : '',
    products ? `${products} product${products === 1 ? '' : 's'}` : '',
  ].filter(Boolean);
  return parts.join(', ') || 'No targets';
}

export function savedAtLabel(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
