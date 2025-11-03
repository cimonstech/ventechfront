import { Metadata } from 'next';
import Script from 'next/script';
import { generatePageMetadata } from '@/lib/seo.utils';
import { generateStructuredData } from '@/lib/seo.config';
import { ShopContent } from './ShopContent';

export const metadata: Metadata = generatePageMetadata('shop');

export default function ShopPage() {
  const breadcrumbData = {
    items: [
      { name: 'Home', url: '/' },
      { name: 'Shop', url: '/shop' },
    ],
  };
  const breadcrumbSchema = generateStructuredData('BreadcrumbList', breadcrumbData);

  return (
    <>
      {breadcrumbSchema && (
        <Script
          id="breadcrumb-schema-shop"
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(breadcrumbSchema),
          }}
        />
      )}
      <ShopContent />
    </>
  );
}
