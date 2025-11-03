import React, { Suspense } from 'react';
import { Metadata } from 'next';
import { seoConfig, generateStructuredData } from '@/lib/seo.config';
import { HomeContent } from './HomeContent';
import Script from 'next/script';

export const metadata: Metadata = {
  title: seoConfig.pages.homepage.title,
  description: seoConfig.pages.homepage.description,
  keywords: seoConfig.pages.homepage.keywords,
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: seoConfig.pages.homepage.title,
    description: seoConfig.pages.homepage.description,
    url: seoConfig.website.url,
    images: [seoConfig.website.defaultImage],
  },
};

export default function Home() {
  const orgStructuredData = generateStructuredData('Organization');
  const websiteStructuredData = generateStructuredData('WebSite');

  return (
    <>
      {/* Structured Data */}
      {orgStructuredData && (
        <Script
          id="organization-schema"
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(orgStructuredData),
          }}
        />
      )}
      {websiteStructuredData && (
        <Script
          id="website-schema"
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(websiteStructuredData),
          }}
        />
      )}
      <Suspense fallback={<div>Loading...</div>}>
        <HomeContent />
      </Suspense>
    </>
  );
}
