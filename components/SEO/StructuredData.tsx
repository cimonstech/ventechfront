'use client';

import { useEffect } from 'react';
import { generateStructuredData } from '@/lib/seo.config';

interface StructuredDataProps {
  type: 'Organization' | 'WebSite' | 'Product' | 'BreadcrumbList';
  data?: any;
}

export function StructuredData({ type, data }: StructuredDataProps) {
  useEffect(() => {
    const jsonLd = generateStructuredData(type, data);
    if (!jsonLd) return;

    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.text = JSON.stringify(jsonLd);
    document.head.appendChild(script);

    return () => {
      document.head.removeChild(script);
    };
  }, [type, data]);

  return null;
}


