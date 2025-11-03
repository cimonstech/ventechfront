import { Metadata } from 'next';
import Script from 'next/script';
import { generatePageMetadata } from '@/lib/seo.utils';
import { generateStructuredData } from '@/lib/seo.config';
import { ContactContent } from './ContactContent';

export const metadata: Metadata = generatePageMetadata('contact');

export default function ContactPage() {
  const breadcrumbData = {
    items: [
      { name: 'Home', url: '/' },
      { name: 'Contact', url: '/contact' },
    ],
  };
  const breadcrumbSchema = generateStructuredData('BreadcrumbList', breadcrumbData);

  return (
    <>
      {breadcrumbSchema && (
        <Script
          id="breadcrumb-schema-contact"
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(breadcrumbSchema),
          }}
        />
      )}
      <ContactContent />
    </>
  );
}
