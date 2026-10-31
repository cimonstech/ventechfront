import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Script from 'next/script';
import { RetryError } from '@/components/ui-states';
import { generateCategoryMetadata } from '@/lib/seo.utils';
import { generateStructuredData } from '@/lib/seo.config';
import { CategoryContent } from './CategoryContent';
import { getCategoryBySlug } from '@/services/category.service';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const resolvedParams = await params;
  return generateCategoryMetadata(resolvedParams);
}

export default async function CategoryProductsPage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = await params;
  let category;
  try {
    category = await getCategoryBySlug(resolvedParams.slug);
  } catch {
    return (
      <RetryError
        title="We couldn't load this category"
        description="Try again in a moment, or browse all categories."
      />
    );
  }
  
  if (!category) {
    notFound();
  }

  const breadcrumbData = {
    items: [
      { name: 'Home', url: '/' },
      { name: 'Categories', url: '/categories' },
      { name: category.name, url: `/categories/${category.slug}` },
    ],
  };
  const breadcrumbSchema = generateStructuredData('BreadcrumbList', breadcrumbData);

  return (
    <>
      {breadcrumbSchema && (
        <Script
          id="breadcrumb-schema-category"
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(breadcrumbSchema),
          }}
        />
      )}
      <CategoryContent category={category} />
    </>
  );
}
