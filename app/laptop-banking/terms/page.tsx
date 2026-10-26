import type { Metadata } from 'next';
import Link from 'next/link';
import { ContentHtml } from '@/components/content/ContentHtml';
import { ContentUnavailable } from '@/components/content/ContentUnavailable';
import { fetchPublicPage, getStoreContact } from '@/lib/publicContent';

export async function generateMetadata(): Promise<Metadata> {
  const result = await fetchPublicPage('laptop-banking-terms');
  if (result.state === 'unpublished') {
    return {
      title: 'Laptop Banking Terms',
      robots: { index: false, follow: false },
    };
  }
  if (result.state === 'published') {
    return { title: result.page.title };
  }
  return { title: 'Laptop Banking Terms' };
}

export default async function LaptopBankingTermsPage() {
  const [result, contact] = await Promise.all([
    fetchPublicPage('laptop-banking-terms'),
    getStoreContact(),
  ]);

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto max-w-4xl px-4">
        <div className="rounded-xl bg-white p-8 shadow-lg md:p-12">
          <Link href="/laptop-banking" className="mb-4 inline-block text-sm text-[#FF7A19] hover:underline">
            ← Back to Laptop Banking
          </Link>
          <h1 className="mb-8 text-4xl font-bold text-[#1A1A1A]">
            {result.state === 'published' ? result.page.title : 'Laptop Banking Terms'}
          </h1>
          {result.state === 'published' ? (
            <ContentHtml html={result.page.body_html} />
          ) : (
            <ContentUnavailable
              message="The Laptop Banking terms will be published here soon."
              contact={contact}
            />
          )}
        </div>
      </div>
    </div>
  );
}
