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
    <div className="min-h-screen overflow-x-hidden bg-gray-50 py-8 sm:py-12">
      <div className={`container mx-auto px-4 ${wide ? 'max-w-5xl' : 'max-w-4xl'}`}>
        <div className={wide ? '' : 'rounded-xl bg-white p-4 shadow-lg sm:p-8 md:p-12'}>
          <div className={wide ? 'mb-8 text-center sm:mb-12' : 'mb-6 sm:mb-8'}>
            <Link href="/" className="mb-4 inline-flex min-h-11 items-center text-sm text-[#FF7A19] hover:underline">
              ← Back to Home
            </Link>
            <h1 className={`font-bold break-words text-[#1A1A1A] ${wide ? 'mb-4 text-2xl sm:text-4xl md:text-5xl' : 'mb-4 text-2xl sm:text-4xl'}`}>
              {title}
            </h1>
            {updated && <p className="text-sm text-[#3A3A3A]">Last updated: {updated}</p>}
          </div>

          {wide ? (
            <div className="rounded-xl bg-white p-4 shadow-lg sm:p-8 md:p-12">
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
