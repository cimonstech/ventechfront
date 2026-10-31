import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Script from 'next/script';
import { RetryError } from '@/components/ui-states';
import { generateProductMetadata } from '@/lib/seo.utils';
import { generateStructuredData, getProductSEO } from '@/lib/seo.config';
import { ProductContent } from './ProductContent';
import { getProductBySlug } from '@/services/product.service';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const resolvedParams = await params;
  return generateProductMetadata(resolvedParams);
}

// Revalidate product page every 60 seconds to ensure fresh data
export const revalidate = 60;

export default async function ProductDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = await params;
  let product;
  try {
    product = await getProductBySlug(resolvedParams.slug);
  } catch {
    return (
      <RetryError
        title="We couldn't load this product"
        description="Try again in a moment. If it keeps failing, browse the shop."
      />
    );
  }
  
  if (!product) {
    notFound();
  }

  const breadcrumbData = {
    items: [
      { name: 'Home', url: '/' },
      { name: 'Shop', url: '/shop' },
      ...(product.category_name ? [{ name: product.category_name, url: `/categories/${product.category_slug}` }] : []),
      { name: product.name, url: `/product/${resolvedParams.slug}` },
    ],
  };
  const breadcrumbSchema = generateStructuredData('BreadcrumbList', breadcrumbData);
  const productSchema = generateStructuredData('Product', product);

  return (
    <>
      {breadcrumbSchema && (
        <Script
          id="breadcrumb-schema-product"
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(breadcrumbSchema),
          }}
        />
      )}
      {productSchema && (
        <Script
          id="product-schema"
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(productSchema),
          }}
        />
      )}
      <ProductContent product={product} />
    </>
  );
}
