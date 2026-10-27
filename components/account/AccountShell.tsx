'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import { useAppSelector } from '@/store';
import { useAccess } from '@/context/AccessContext';
import { safeRedirectPath } from '@/lib/safeRedirect';
import { accountNavActive, visibleAccountNav } from '@/lib/account';

export function AccountShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAppSelector((state) => state.auth);
  const { access } = useAccess();
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    if (isLoading) return;
    if (isAuthenticated) return;
    const search = searchParams.toString();
    const next = safeRedirectPath(search ? `${pathname}?${search}` : pathname);
    router.replace(next ? `/login?redirect=${encodeURIComponent(next)}` : '/login');
  }, [isAuthenticated, isLoading, pathname, router, searchParams]);

  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  const items = useMemo(
    () => visibleAccountNav(access?.programRoles),
    [access?.programRoles]
  );
  const current = items.find((item) => accountNavActive(pathname, item));

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-[50vh] px-4 py-16 text-center text-sm text-[#3A3A3A]">
        Loading your account…
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="mx-auto max-w-6xl px-4 py-4 sm:py-6">
        <div className="md:grid md:grid-cols-[13.75rem_minmax(0,1fr)] md:gap-6 md:items-start">
          <aside className="hidden md:block">
            <nav className="sticky top-24 rounded-xl bg-white p-3 shadow-sm">
              <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-wide text-[#3A3A3A]">
                My account
              </p>
              <ul className="space-y-1">
                {items.map((item) => {
                  const active = accountNavActive(pathname, item);
                  return (
                    <li key={item.id}>
                      <Link
                        href={item.href}
                        className={`block rounded-lg px-3 py-2 text-sm font-medium ${
                          active
                            ? 'bg-[#FF7A19] text-white'
                            : 'text-[#1A1A1A] hover:bg-orange-50'
                        }`}
                      >
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>
          </aside>

          <div className="min-w-0">
            <div className="mb-3 flex items-center justify-between gap-3 md:hidden">
              <h1 className="text-lg font-bold text-[#1A1A1A]">{current?.label || 'My account'}</h1>
              <button
                type="button"
                className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-gray-200 bg-white text-[#1A1A1A]"
                onClick={() => setDrawerOpen(true)}
                aria-label="Open account menu"
              >
                <Menu size={20} />
              </button>
            </div>

            <div className="mb-4 -mx-4 overflow-x-auto px-4 md:hidden">
              <nav className="flex w-max gap-2 pb-1">
                {items.map((item) => {
                  const active = accountNavActive(pathname, item);
                  return (
                    <Link
                      key={item.id}
                      href={item.href}
                      className={`inline-flex min-h-11 shrink-0 items-center rounded-full px-3 text-sm font-medium ${
                        active
                          ? 'bg-[#FF7A19] text-white'
                          : 'bg-white text-[#1A1A1A] border border-gray-200'
                      }`}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            </div>

            {children}
          </div>
        </div>
      </div>

      {drawerOpen ? (
        <div className="fixed inset-0 z-[60] md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Close account menu"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="absolute bottom-0 left-0 right-0 max-h-[85vh] overflow-y-auto rounded-t-2xl bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <div className="mb-3 flex items-center justify-between">
              <p className="font-semibold text-[#1A1A1A]">My account</p>
              <button
                type="button"
                className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-[#1A1A1A]"
                onClick={() => setDrawerOpen(false)}
                aria-label="Close account menu"
              >
                <X size={20} />
              </button>
            </div>
            <nav className="space-y-1">
              {items.map((item) => {
                const active = accountNavActive(pathname, item);
                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    className={`block rounded-lg px-3 py-3 text-sm font-medium ${
                      active ? 'bg-[#FF7A19] text-white' : 'text-[#1A1A1A] hover:bg-orange-50'
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      ) : null}
    </div>
  );
}
