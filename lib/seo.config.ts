/**
 * SEO Configuration File
 * 
 * Edit this file to customize SEO settings for your business.
 * All SEO metadata across the site will use these settings.
 */

export const seoConfig = {
  // Business Information
  business: {
    name: 'VENTECH',
    fullName: 'VENTECH Gadgets',
    tagline: 'Your trusted tech partner in Ghana',
    description: 'VENTECH is a leading technology store in Accra, Ghana, offering the latest gadgets, smartphones, laptops, accessories, and electronics. We serve customers nationwide in Ghana and across West Africa with authentic products and exceptional service.',
    email: 'ventechgadgets@gmail.com',
    phone: '+233 55 134 4310',
    location: {
      city: 'Accra',
      region: 'Greater Accra',
      country: 'Ghana',
      address: 'Ho Civic Center Shop #22 & Accra',
    },
    operatingRegions: ['Ghana', 'West Africa'],
  },

  // Website Information
  website: {
    url: 'https://ventechgadgets.com', // Update with your actual domain
    defaultImage: '/og-image.jpg', // Add an OG image
    twitterHandle: '@ventechgadgets',
    facebookPage: 'https://facebook.com/ventechgadgets',
  },

  // SEO Keywords (Primary and Secondary)
  keywords: {
    primary: [
      'gadgets Ghana',
      'electronics Accra',
      'tech store Ghana',
      'smartphones Ghana',
      'laptops Accra',
      'buy gadgets online Ghana',
      'electronics store Accra',
      'technology products Ghana',
      'mobile phones Ghana',
      'computer accessories Ghana',
    ],
    secondary: [
      'West Africa gadgets',
      'online electronics store',
      'genuine gadgets Ghana',
      'tech products Accra',
      'smartphones West Africa',
      'laptops Ghana',
      'tablets Ghana',
      'smartwatches Ghana',
      'accessories Ghana',
      'tech deals Ghana',
      'electronics delivery Ghana',
      'gadget store Accra',
      'ventech gadgets',
      'ventech Ghana',
    ],
  },

  // Page-Specific SEO
  pages: {
    homepage: {
      title: 'VENTECH - Latest Gadgets & Electronics in Ghana | Online Tech Store Accra',
      description: 'Shop the latest gadgets, smartphones, laptops, and electronics in Ghana. VENTECH offers authentic tech products with nationwide delivery. Best prices on phones, computers, accessories & more in Accra and West Africa.',
      keywords: 'gadgets Ghana, electronics Accra, smartphones Ghana, laptops Accra, tech store Ghana, buy electronics online Ghana, mobile phones Ghana, computer accessories, technology products West Africa',
    },
    shop: {
      title: 'Shop All Products - VENTECH Gadgets Store Ghana',
      description: 'Browse our complete collection of gadgets, smartphones, laptops, tablets, smartwatches, and accessories. Authentic products, best prices, nationwide delivery in Ghana.',
      keywords: 'shop gadgets Ghana, buy electronics Ghana, tech products Ghana, smartphones Ghana, laptops Ghana, tablets Ghana, smartwatches Ghana, accessories Ghana',
    },
    deals: {
      title: 'Hot Deals & Discounts - VENTECH Gadgets Ghana',
      description: 'Don\'t miss our amazing deals on smartphones, laptops, gadgets, and electronics. Limited time offers with the best prices in Ghana. Shop now and save!',
      keywords: 'gadget deals Ghana, electronics discounts, smartphone deals Ghana, laptop sales Ghana, tech offers Ghana, electronics promotions, gadget sales Accra',
    },
    about: {
      title: 'About Us - VENTECH Gadgets | Your Trusted Tech Partner in Ghana',
      description: 'VENTECH is Ghana\'s trusted technology store. We provide authentic gadgets, smartphones, laptops, and electronics with exceptional service. Serving customers nationwide in Ghana and across West Africa since our founding.',
      keywords: 'about ventech, ventech gadgets Ghana, tech store Accra, electronics store Ghana, trusted gadget store, technology partner Ghana',
    },
    contact: {
      title: 'Contact Us - VENTECH Gadgets Ghana | Get in Touch',
      description: 'Contact VENTECH for inquiries, support, or orders. Located in Accra, Ghana. Call +233 55 134 4310 or email ventechgadgets@gmail.com. We\'re here to help!',
      keywords: 'contact ventech, ventech Ghana contact, electronics store contact, gadget store Accra, tech support Ghana',
    },
    'bulk-order': {
      title: 'Bulk Order Request - VENTECH Gadgets Ghana | Wholesale Electronics',
      description: 'Need laptops or gadgets in bulk? Submit your bulk order request to VENTECH. We offer competitive pricing for businesses, schools, and organizations. Get the best deals on bulk electronics orders in Ghana.',
      keywords: 'bulk order gadgets Ghana, wholesale electronics Ghana, bulk laptops Ghana, bulk smartphones Ghana, corporate orders Ghana, business electronics Ghana, wholesale tech Ghana',
    },
    register: {
      title: 'Create Account - VENTECH Gadgets Ghana',
      description: 'Create your VENTECH account to shop gadgets, track orders, save addresses, and enjoy exclusive deals. Sign up now for free and start shopping the latest tech!',
      keywords: 'register ventech, create account Ghana, sign up electronics store, gadget store account, ventech registration',
    },
    laptopBanking: {
      title: 'Laptop Banking - VENTECH Investment Program Ghana',
      description: 'Invest in VENTECH\'s laptop trade business. Earn 8-9% monthly returns over 6 months. Safe investment backed by real laptop inventory. Starting from GHS 2,500. Sign up now!',
      keywords: 'laptop banking Ghana, ventech investment, tech investment Ghana, laptop trade investment, investment program Ghana, tech business investment',
    },
  },

  // Category SEO Templates
  category: {
    title: '{category} in Ghana - Buy {category} Online | VENTECH',
    description: 'Shop {category} in Ghana. Authentic products, best prices, nationwide delivery. Browse our collection of {category} with genuine products from trusted brands.',
    keywords: '{category} Ghana, buy {category} online Ghana, {category} Accra, {category} prices Ghana, {category} store Ghana',
  },

  // Product SEO Templates
  product: {
    title: '{name} - Buy in Ghana | VENTECH Gadgets',
    description: 'Buy {name} in Ghana. {brand} {name} with authentic guarantee, best price, and nationwide delivery. Shop now at VENTECH!',
    keywords: '{name} Ghana, buy {name} Ghana, {brand} {name}, {name} price Ghana, {name} Accra, {category} Ghana',
  },
};

/**
 * Generate page title with site name
 */
export const getPageTitle = (title: string): string => {
  return `${title} | ${seoConfig.business.fullName}`;
};

/**
 * Generate category SEO metadata
 */
export const getCategorySEO = (categoryName: string, slug: string) => {
  const title = seoConfig.category.title
    .replace('{category}', categoryName);
  
  const description = seoConfig.category.description
    .replace(/{category}/g, categoryName);
  
  const keywords = seoConfig.category.keywords
    .replace(/{category}/g, categoryName.toLowerCase());

  return {
    title: getPageTitle(title),
    description,
    keywords,
  };
};

/**
 * Generate product SEO metadata
 */
export const getProductSEO = (product: {
  name: string;
  brand?: string;
  category?: string;
  description?: string;
}) => {
  const brand = product.brand || '';
  const category = product.category || 'gadgets';
  
  const title = seoConfig.product.title
    .replace('{name}', product.name)
    .replace('{brand}', brand);
  
  const description = product.description || seoConfig.product.description
    .replace('{name}', product.name)
    .replace('{brand}', brand);
  
  const keywords = seoConfig.product.keywords
    .replace(/{name}/g, product.name)
    .replace(/{brand}/g, brand)
    .replace(/{category}/g, category.toLowerCase());

  return {
    title: getPageTitle(title),
    description,
    keywords,
  };
};

/**
 * Generate structured data (JSON-LD) for SEO
 */
export const generateStructuredData = (type: 'Organization' | 'WebSite' | 'Product' | 'BreadcrumbList', data?: any) => {
  const baseUrl = seoConfig.website.url;
  const business = seoConfig.business;

  switch (type) {
    case 'Organization':
      return {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: business.fullName,
        legalName: business.fullName,
        url: baseUrl,
        logo: `${baseUrl}/logo.png`,
        description: business.description,
        address: {
          '@type': 'PostalAddress',
          addressLocality: business.location.city,
          addressRegion: business.location.region,
          addressCountry: business.location.country,
          streetAddress: business.location.address,
        },
        contactPoint: {
          '@type': 'ContactPoint',
          telephone: business.phone,
          contactType: 'Customer Service',
          email: business.email,
          areaServed: business.operatingRegions,
        },
        sameAs: [
          seoConfig.website.facebookPage,
        ],
      };

    case 'WebSite':
      return {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: business.fullName,
        url: baseUrl,
        description: business.description,
        potentialAction: {
          '@type': 'SearchAction',
          target: {
            '@type': 'EntryPoint',
            urlTemplate: `${baseUrl}/search?q={search_term_string}`,
          },
          'query-input': 'required name=search_term_string',
        },
      };

    case 'Product':
      if (!data) return null;
      return {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: data.name,
        description: data.description || `${data.name} - Buy in Ghana at VENTECH`,
        image: data.images || [],
        brand: {
          '@type': 'Brand',
          name: data.brand || 'VENTECH',
        },
        category: data.category,
        offers: {
          '@type': 'Offer',
          price: data.price || data.original_price || 0,
          priceCurrency: 'GHS',
          availability: data.in_stock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
          seller: {
            '@type': 'Organization',
            name: business.fullName,
          },
          url: `${baseUrl}/product/${data.slug}`,
        },
      };

    case 'BreadcrumbList':
      if (!data?.items) return null;
      return {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: data.items.map((item: any, index: number) => ({
          '@type': 'ListItem',
          position: index + 1,
          name: item.name,
          item: `${baseUrl}${item.url}`,
        })),
      };

    default:
      return null;
  }
};


