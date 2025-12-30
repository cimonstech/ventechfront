import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ReduxProvider } from "@/store/Provider";
import { LayoutWrapper } from "@/components/LayoutWrapper";
import { Toaster } from "react-hot-toast";
import { seoConfig } from "@/lib/seo.config";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: {
    default: seoConfig.pages.homepage.title,
    template: `%s | ${seoConfig.business.fullName}`,
  },
  description: seoConfig.pages.homepage.description,
  keywords: [...seoConfig.keywords.primary, ...seoConfig.keywords.secondary],
  authors: [{ name: seoConfig.business.fullName }],
  creator: seoConfig.business.fullName,
  publisher: seoConfig.business.fullName,
  metadataBase: new URL(seoConfig.website.url),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'en_GH',
    url: seoConfig.website.url,
    siteName: seoConfig.business.fullName,
    title: seoConfig.pages.homepage.title,
    description: seoConfig.pages.homepage.description,
    images: [
      {
        url: seoConfig.website.defaultImage,
        width: 1200,
        height: 630,
        alt: seoConfig.business.fullName,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: seoConfig.pages.homepage.title,
    description: seoConfig.pages.homepage.description,
    images: [seoConfig.website.defaultImage],
    creator: seoConfig.website.twitterHandle,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: '/favicons/favicon.ico',
    apple: '/favicons/apple-touch-icon.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" integrity="sha512-DTOQO9RWCH3ppGqcWaEA1BIZOC6xxalwEsw9c2QQeAIftl+Vegovlnee1c9QX4TctnWMn13TZye+giMm8e2LwA==" crossOrigin="anonymous" referrerPolicy="no-referrer" />
      </head>
      <body className={`${inter.variable} font-sans antialiased bg-gray-50`} suppressHydrationWarning>
        <ReduxProvider>
          <div className="min-h-screen flex flex-col">
            <LayoutWrapper>{children}</LayoutWrapper>
          </div>
          <Toaster
            position="top-right"
            containerClassName="hidden md:block"
            toastOptions={{
              duration: 3000,
              style: {
                background: '#363636',
                color: '#fff',
              },
              success: {
                duration: 3000,
                iconTheme: {
                  primary: '#10b981',
                  secondary: '#fff',
                },
              },
              error: {
                duration: 4000,
                iconTheme: {
                  primary: '#ef4444',
                  secondary: '#fff',
                },
              },
            }}
          />
        </ReduxProvider>
      </body>
    </html>
  );
}
