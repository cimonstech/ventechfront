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
    // Check multiple ways the error might be formatted
    const errorMessage = error.message || String(error);
    const errorCode = (error as any)?.code || (error as any)?.errno;
    
    if (
      errorMessage.includes('kill EPERM') ||
      errorMessage.includes('EPERM') ||
      errorCode === 'EPERM' ||
      (error as any)?.syscall === 'kill' && errorCode === -4048
    ) {
      // Silently ignore - this is a known Windows issue with Next.js hot reload/Turbopack
      return;
    }
    // Log other uncaught exceptions
    console.error('Uncaught Exception:', error);
  });

  // Also handle unhandled promise rejections that might contain EPERM
  process.on('unhandledRejection', (reason: any) => {
    const reasonStr = reason?.message || String(reason);
    if (reasonStr.includes('kill EPERM') || reasonStr.includes('EPERM')) {
      // Silently ignore EPERM errors in promise rejections
      return;
    }
    // Log other unhandled rejections
    console.error('Unhandled Rejection:', reason);
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
