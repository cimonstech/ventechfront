'use client';

import Head from 'next/head';

interface SEOHeadProps {
  title: string;
  description: string;
  keywords: string;
  canonical?: string;
  ogImage?: string;
  noindex?: boolean;
}

export function SEOHead({
  title,
  description,
  keywords,
  canonical,
  ogImage,
  noindex = false,
}: SEOHeadProps) {
  const { seoConfig } = require('@/lib/seo.config');
  const baseUrl = seoConfig.website.url;
  const fullTitle = `${title} | ${seoConfig.business.fullName}`;
  const image = ogImage || seoConfig.website.defaultImage;
  const canonicalUrl = canonical ? `${baseUrl}${canonical}` : baseUrl;

  return (
    <Head>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      {canonical && <link rel="canonical" href={canonicalUrl} />}
      
      {/* Open Graph */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content={seoConfig.business.fullName} />
      <meta property="og:locale" content="en_GH" />
      
      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
      <meta name="twitter:creator" content={seoConfig.website.twitterHandle} />
      
      {/* Robots */}
      {noindex && <meta name="robots" content="noindex, nofollow" />}
      
      {/* Geographic */}
      <meta name="geo.region" content="GH" />
      <meta name="geo.placename" content={seoConfig.business.location.city} />
      <meta name="geo.position" content="5.6037;-0.1870" /> {/* Accra coordinates */}
      <meta name="ICBM" content="5.6037, -0.1870" />
    </Head>
  );
}


