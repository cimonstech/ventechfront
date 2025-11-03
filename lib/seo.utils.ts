import { Metadata } from 'next';
import { seoConfig } from './seo.config';

/**
 * Generate page metadata from SEO config
 */
export function generatePageMetadata(page: keyof typeof seoConfig.pages): Metadata {
  const pageConfig = seoConfig.pages[page];
  const path = page === 'homepage' ? '' : page === 'laptopBanking' ? 'laptop-banking' : page;
  
  return {
    title: pageConfig.title,
    description: pageConfig.description,
    keywords: pageConfig.keywords,
    alternates: {
      canonical: `/${path}`,
    },
    openGraph: {
      title: pageConfig.title,
      description: pageConfig.description,
      url: `${seoConfig.website.url}/${path}`,
      images: [seoConfig.website.defaultImage],
      type: 'website',
      locale: 'en_GH',
    },
    twitter: {
      card: 'summary_large_image',
      title: pageConfig.title,
      description: pageConfig.description,
      images: [seoConfig.website.defaultImage],
    },
  };
}

/**
 * Generate metadata for dynamic product pages
 */
export async function generateProductMetadata(params: { slug: string }): Promise<Metadata> {
  const { getProductBySlug } = await import('@/services/product.service');
  const { getProductSEO } = await import('@/lib/seo.config');
  
  try {
    const product = await getProductBySlug(params.slug);
    
    if (!product) {
      return {
        title: 'Product Not Found',
        description: 'The requested product could not be found.',
        robots: {
          index: false,
          follow: false,
        },
      };
    }

    const seoData = getProductSEO(product);
    const imageUrl = product.thumbnail || seoConfig.website.defaultImage;
    
    return {
      title: seoData.title,
      description: seoData.description,
      keywords: seoData.keywords,
      alternates: {
        canonical: `/product/${product.slug}`,
      },
      openGraph: {
        title: seoData.title,
        description: seoData.description,
        url: `${seoConfig.website.url}/product/${product.slug}`,
        images: [imageUrl],
        type: 'website',
        locale: 'en_GH',
      },
      twitter: {
        card: 'summary_large_image',
        title: seoData.title,
        description: seoData.description,
        images: [imageUrl],
      },
    };
  } catch (error) {
    console.error('Error generating product metadata:', error);
    return {
      title: 'Product',
      description: seoConfig.pages.shop.description,
    };
  }
}

/**
 * Generate metadata for dynamic category pages
 */
export async function generateCategoryMetadata(params: { slug: string }): Promise<Metadata> {
  const { getCategoryBySlug } = await import('@/services/category.service');
  const { getCategorySEO } = await import('@/lib/seo.config');
  
  try {
    const category = await getCategoryBySlug(params.slug);
    
    if (!category) {
      return {
        title: 'Category Not Found',
        description: 'The requested category could not be found.',
        robots: {
          index: false,
          follow: false,
        },
      };
    }

    const seoData = getCategorySEO(category.name, category.slug);
    
    return {
      title: seoData.title,
      description: seoData.description,
      keywords: seoData.keywords,
      alternates: {
        canonical: `/categories/${category.slug}`,
      },
      openGraph: {
        title: seoData.title,
        description: seoData.description,
        url: `${seoConfig.website.url}/categories/${category.slug}`,
        images: [category.thumbnail || seoConfig.website.defaultImage],
        type: 'website',
        locale: 'en_GH',
      },
      twitter: {
        card: 'summary_large_image',
        title: seoData.title,
        description: seoData.description,
        images: [category.thumbnail || seoConfig.website.defaultImage],
      },
    };
  } catch (error) {
    console.error('Error generating category metadata:', error);
    return {
      title: 'Category',
      description: seoConfig.pages.shop.description,
    };
  }
}


