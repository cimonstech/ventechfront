import { Metadata } from 'next';
import Script from 'next/script';
import { generatePageMetadata } from '@/lib/seo.utils';
import { generateStructuredData } from '@/lib/seo.config';
import { BulkOrderContent } from './BulkOrderContent';

export const metadata: Metadata = generatePageMetadata('bulk-order');

export default function BulkOrderPage() {
  const breadcrumbData = {
    items: [
      { name: 'Home', url: '/' },
      { name: 'Bulk Order', url: '/bulk-order' },
    ],
  };
  const breadcrumbSchema = generateStructuredData('BreadcrumbList', breadcrumbData);

  return (
    <>
      {breadcrumbSchema && (
        <Script
          id="breadcrumb-schema-bulk-order"
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(breadcrumbSchema),
          }}
        />
      )}
      <BulkOrderContent />
    </>
  );
}

