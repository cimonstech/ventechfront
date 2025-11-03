import { Metadata } from 'next';
import Script from 'next/script';
import { generatePageMetadata } from '@/lib/seo.utils';
import { generateStructuredData } from '@/lib/seo.config';
import { RegisterContent } from './RegisterContent';

export const metadata: Metadata = generatePageMetadata('register');

export default function RegisterPage() {
  const breadcrumbData = {
    items: [
      { name: 'Home', url: '/' },
      { name: 'Register', url: '/register' },
    ],
  };
  const breadcrumbSchema = generateStructuredData('BreadcrumbList', breadcrumbData);

  return (
    <>
      {breadcrumbSchema && (
        <Script
          id="breadcrumb-schema-register"
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(breadcrumbSchema),
          }}
        />
      )}
      <RegisterContent />
    </>
  );
}
