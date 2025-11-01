'use client';

import { usePathname } from 'next/navigation';
import { NavBar } from '@/components/navigation/NavBar';
import { Footer } from '@/components/Footer';
import React, { Suspense } from 'react';
import CheckmarkLoader from '@/components/loaders/CheckmarkLoader';

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdminRoute = pathname.startsWith('/admin');

  if (isAdminRoute) {
    // Admin routes: No NavBar, No Footer
    return <>{children}</>;
  }

  // Regular routes: With NavBar and Footer
  return (
    <>
      <NavBar />
      <main className="flex-1">
        <Suspense
          fallback={
            <div className="py-20 flex items-center justify-center">
              <CheckmarkLoader size={72} color="#FF7A19" speedMs={600} />
            </div>
          }
        >
          {children}
        </Suspense>
      </main>
      <Footer />
    </>
  );
}


