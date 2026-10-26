import Link from 'next/link';
import { ContentHtml } from '@/components/content/ContentHtml';
import { ContentUnavailable } from '@/components/content/ContentUnavailable';
import { fetchPublicPage, formatUpdatedDate, getStoreContact } from '@/lib/publicContent';

export async function LegalDocument({
  slug,
  fallbackTitle,
  wide = false,
}: {
  slug: string;
  fallbackTitle: string;
  wide?: boolean;
}) {
  const [result, contact] = await Promise.all([fetchPublicPage(slug), getStoreContact()]);
  const title = result.state === 'published' ? result.page.title : fallbackTitle;
  const updated = result.state === 'published' ? formatUpdatedDate(result.page.updated_at) : '';

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className={`container mx-auto px-4 ${wide ? 'max-w-5xl' : 'max-w-4xl'}`}>
        <div className={wide ? '' : 'rounded-xl bg-white p-8 shadow-lg md:p-12'}>
          <div className={wide ? 'mb-12 text-center' : 'mb-8'}>
            <Link href="/" className="mb-4 inline-block text-sm text-[#FF7A19] hover:underline">
              ← Back to Home
            </Link>
            <h1 className={`font-bold text-[#1A1A1A] ${wide ? 'mb-4 text-4xl md:text-5xl' : 'mb-4 text-4xl'}`}>
              {title}
            </h1>
            {updated && <p className="text-sm text-[#3A3A3A]">Last updated: {updated}</p>}
          </div>

          {wide ? (
            <div className="rounded-xl bg-white p-8 shadow-lg md:p-12">
              {result.state === 'published' ? (
                <ContentHtml html={result.page.body_html} />
              ) : (
                <ContentUnavailable
                  message="This page isn't available right now."
                  contact={contact}
                />
              )}
            </div>
          ) : result.state === 'published' ? (
            <ContentHtml html={result.page.body_html} />
          ) : (
            <ContentUnavailable
              message="This page isn't available right now."
              contact={contact}
            />
          )}
        </div>
      </div>
    </div>
  );
}
