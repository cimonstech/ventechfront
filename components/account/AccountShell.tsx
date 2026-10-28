'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { LogOut, Menu, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAppDispatch, useAppSelector } from '@/store';
import { logout as logoutAction } from '@/store/authSlice';
import { useAccess } from '@/context/AccessContext';
import { signOut } from '@/services/auth.service';
import { safeRedirectPath } from '@/lib/safeRedirect';
import { accountNavActive, visibleAccountNav } from '@/lib/account';

const NAV_LINK =
  'block rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF7A19] focus-visible:ring-offset-2';

export function AccountShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { isAuthenticated, isLoading } = useAppSelector((state) => state.auth);
  const { access } = useAccess();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

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

  const handleSignOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      dispatch(logoutAction());
      await signOut();
      toast.success('Signed out');
      router.push('/');
    } catch {
      toast.error('Could not sign out. Try again.');
      setSigningOut(false);
    }
  };

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-[50vh] px-4 py-16 text-center text-sm text-[#3A3A3A]">
        Loading your account…
      </div>
    );
  }

  const navList = (
    <ul className="space-y-1">
      {items.map((item) => {
        const active = accountNavActive(pathname, item);
        return (
          <li key={item.id}>
            <Link
              href={item.href}
              className={`${NAV_LINK} ${
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
  );

  const signOutButton = (
    <button
      type="button"
      onClick={handleSignOut}
      disabled={signingOut}
      className="mt-2 flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-red-600 transition-colors duration-150 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 disabled:opacity-50"
    >
      <LogOut size={16} aria-hidden="true" />
      {signingOut ? 'Signing out…' : 'Sign out'}
    </button>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-6xl px-4 py-4 sm:py-6">
        <div className="md:grid md:grid-cols-[13.75rem_minmax(0,1fr)] md:items-start md:gap-6">
          <aside className="hidden md:sticky md:top-20 md:z-20 md:block md:self-start">
            <nav
              aria-label="My account"
              className="max-h-[calc(100vh-6rem)] overflow-y-auto rounded-xl bg-white p-3 shadow-sm"
            >
              <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-wide text-[#3A3A3A]">
                My account
              </p>
              {navList}
              <div className="mt-2 border-t border-gray-100 pt-2">{signOutButton}</div>
            </nav>
          </aside>

          <div className="min-w-0">
            <div className="mb-3 flex items-center justify-between gap-3 md:hidden">
              <h1 className="text-lg font-bold text-[#1A1A1A]">{current?.label || 'My account'}</h1>
              <button
                type="button"
                className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-gray-200 bg-white text-[#1A1A1A] hover:bg-orange-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF7A19]"
                onClick={() => setDrawerOpen(true)}
                aria-label="Open account menu"
              >
                <Menu size={20} aria-hidden="true" />
              </button>
            </div>

            <div className="sticky top-14 z-20 mb-4 -mx-4 bg-gray-50/95 px-4 py-2 backdrop-blur sm:top-16 md:hidden">
              <nav aria-label="My account" className="flex w-full gap-2 overflow-x-auto pb-1">
                {items.map((item) => {
                  const active = accountNavActive(pathname, item);
                  return (
                    <Link
                      key={item.id}
                      href={item.href}
                      className={`inline-flex min-h-11 shrink-0 items-center rounded-full px-3 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF7A19] ${
                        active
                          ? 'bg-[#FF7A19] text-white'
                          : 'border border-gray-200 bg-white text-[#1A1A1A] hover:bg-orange-50'
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
          <div className="absolute bottom-0 left-0 right-0 max-h-[85vh] overflow-y-auto overscroll-contain rounded-t-2xl bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <div className="mb-3 flex items-center justify-between">
              <p className="font-semibold text-[#1A1A1A]">My account</p>
              <button
                type="button"
                className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-[#1A1A1A] hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF7A19]"
                onClick={() => setDrawerOpen(false)}
                aria-label="Close account menu"
              >
                <X size={20} aria-hidden="true" />
              </button>
            </div>
            <nav aria-label="My account" className="space-y-1">
              {items.map((item) => {
                const active = accountNavActive(pathname, item);
                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    className={`block rounded-lg px-3 py-3 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF7A19] ${
                      active ? 'bg-[#FF7A19] text-white' : 'text-[#1A1A1A] hover:bg-orange-50'
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            <div className="mt-2 border-t border-gray-100 pt-2">{signOutButton}</div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
