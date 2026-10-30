'use client';

import { usePathname } from 'next/navigation';
import { NavBar } from '@/components/navigation/NavBar';
import { Footer } from '@/components/Footer';
import { MobileBottomNav } from '@/components/navigation/MobileBottomNav';
import React, { Suspense } from 'react';
import CheckmarkLoader from '@/components/loaders/CheckmarkLoader';
import { OfflineBanner, SessionExpiredHost } from '@/components/ui-states';

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdminRoute = pathname.startsWith('/admin');

  if (isAdminRoute) {
    return (
      <>
        <OfflineBanner />
        <SessionExpiredHost />
        {children}
      </>
    );
  }

  return (
    <>
      <OfflineBanner />
      <SessionExpiredHost />
      <NavBar />
      <main className="flex-1 pb-20 md:pb-0">
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
      <MobileBottomNav />
    </>
  );
}


