import { supabasePublic } from '@/lib/supabase';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export interface PublicFaq {
  id: string;
  question: string;
  answer_html: string;
  sort_order: number;
}

export interface PublicFaqCategory {
  id: string;
  name: string;
  slug: string;
  sort_order: number;
  faqs: PublicFaq[];
}

export interface PublicContentPage {
  id: string;
  slug: string;
  title: string;
  body_html: string;
  version: number;
  updated_at: string;
}

export type ContentPageResult =
  | { state: 'published'; page: PublicContentPage }
  | { state: 'unpublished' }
  | { state: 'error' };

export interface StoreContact {
  phone: string;
  email: string;
}

const FALLBACK_CONTACT: StoreContact = {
  phone: '+233 55 134 4310',
  email: 'ventechgadgets@gmail.com',
};

export async function fetchPublicFaqs(): Promise<PublicFaqCategory[] | null> {
  try {
    const response = await fetch(`${API_URL}/api/content/faqs`, { next: { revalidate: 300 } });
    if (!response.ok) return null;
    const body = await response.json();
    return Array.isArray(body?.data) ? body.data : null;
  } catch (error) {
    console.error('fetch public faqs', error);
    return null;
  }
}

export async function fetchPublicPage(slug: string): Promise<ContentPageResult> {
  try {
    const response = await fetch(`${API_URL}/api/content/pages/${slug}`, { next: { revalidate: 300 } });
    if (response.status === 404) return { state: 'unpublished' };
    if (!response.ok) return { state: 'error' };
    const body = await response.json();
    if (!body?.data || typeof body.data.body_html !== 'string' || typeof body.data.title !== 'string') {
      return { state: 'error' };
    }
    return { state: 'published', page: body.data as PublicContentPage };
  } catch (error) {
    console.error('fetch public page', error);
    return { state: 'error' };
  }
}

export async function getStoreContact(): Promise<StoreContact> {
  try {
    const { data, error } = await supabasePublic
      .from('settings')
      .select('key, value')
      .in('key', ['store_phone', 'store_email']);

    if (error || !data) return FALLBACK_CONTACT;

    const phone = data.find((row) => row.key === 'store_phone')?.value;
    const email = data.find((row) => row.key === 'store_email')?.value;
    return {
      phone: phone || FALLBACK_CONTACT.phone,
      email: email || FALLBACK_CONTACT.email,
    };
  } catch (error) {
    console.error('fetch store contact', error);
    return FALLBACK_CONTACT;
  }
}

export function formatUpdatedDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}
