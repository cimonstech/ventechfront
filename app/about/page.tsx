import { Metadata } from 'next';
import Script from 'next/script';
import { generatePageMetadata } from '@/lib/seo.utils';
import { generateStructuredData } from '@/lib/seo.config';
import { AboutContent } from './AboutContent';

export const metadata: Metadata = generatePageMetadata('about');

export default function AboutPage() {
  const breadcrumbData = {
    items: [
      { name: 'Home', url: '/' },
      { name: 'About Us', url: '/about' },
    ],
  };
  const breadcrumbSchema = generateStructuredData('BreadcrumbList', breadcrumbData);

  return (
    <>
      {breadcrumbSchema && (
        <Script
          id="breadcrumb-schema-about"
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(breadcrumbSchema),
          }}
        />
      )}
      <AboutContent />
    </>
  );
}
