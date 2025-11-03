import { Metadata } from 'next';
import { seoConfig } from '@/lib/seo.config';

export const metadata: Metadata = {
  title: seoConfig.pages.shop.title,
  description: seoConfig.pages.shop.description,
  keywords: seoConfig.pages.shop.keywords,
  alternates: {
    canonical: '/shop',
  },
  openGraph: {
    title: seoConfig.pages.shop.title,
    description: seoConfig.pages.shop.description,
    url: `${seoConfig.website.url}/shop`,
    images: [seoConfig.website.defaultImage],
  },
};


