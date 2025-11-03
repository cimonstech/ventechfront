import { Metadata } from 'next';
import Script from 'next/script';
import { generatePageMetadata } from '@/lib/seo.utils';
import { generateStructuredData } from '@/lib/seo.config';
import { DealsContent } from './DealsContent';

export const metadata: Metadata = generatePageMetadata('deals');

export default function DealsPage() {
  const breadcrumbData = {
    items: [
      { name: 'Home', url: '/' },
      { name: 'Deals', url: '/deals' },
    ],
  };
  const breadcrumbSchema = generateStructuredData('BreadcrumbList', breadcrumbData);

  return (
    <>
      {breadcrumbSchema && (
        <Script
          id="breadcrumb-schema-deals"
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(breadcrumbSchema),
          }}
        />
      )}
      <DealsContent />
    </>
  );
}
