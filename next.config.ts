import type { NextConfig } from "next";

// Suppress punycode deprecation warning at the process level
if (typeof process !== 'undefined') {
  const originalEmitWarning = process.emitWarning;
  process.emitWarning = function (warning: string | Error, ...args: any[]) {
    if (
      typeof warning === 'string' && 
      warning.includes('punycode') && 
      warning.includes('deprecated')
    ) {
      return; // Suppress punycode deprecation warnings
    }
    if (
      warning && 
      typeof warning === 'object' && 
      warning.name === 'DeprecationWarning' &&
      warning.message?.includes('punycode')
    ) {
      return; // Suppress punycode deprecation warnings
    }
    return (originalEmitWarning as any).apply(process, [warning, ...args]);
  };

  // Handle Windows-specific EPERM errors gracefully (Next.js process management)
  process.on('uncaughtException', (error: Error) => {
    // Ignore EPERM errors related to process killing (Windows-specific)
    if (error.message && error.message.includes('kill EPERM')) {
      // Silently ignore - this is a known Windows issue with Next.js hot reload
      return;
    }
    // Log other uncaught exceptions
    console.error('Uncaught Exception:', error);
  });
}

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'files.ventechgadgets.com',
      },
      {
        protocol: 'https',
        hostname: '**.r2.dev',
      },
      {
        protocol: 'https',
        hostname: '**.r2.cloudflarestorage.com',
      },
    ],
    // Increase cache time for external images
    minimumCacheTTL: 60,
    // Disable image optimization in development to avoid timeout errors
    // This will load images directly without optimization, which is faster for dev
    unoptimized: process.env.NODE_ENV === 'development',
  },
  // Turbopack configuration (Next.js 16 default)
  turbopack: {},
  // Webpack configuration (for production builds that may use webpack)
  webpack: (config, { isServer }) => {
    // Suppress punycode deprecation warning in webpack
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        punycode: false,
      };
    }
    return config;
  },
};

export default nextConfig;
