import { Metadata } from 'next';
import Script from 'next/script';
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
  const category = await getCategoryBySlug(resolvedParams.slug);
  
  if (!category) {
    return <div>Category not found</div>;
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
