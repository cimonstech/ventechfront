'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, ShoppingBag, Heart, User, Package } from 'lucide-react';
import { useAppSelector } from '@/store';
import { useRecoverySession } from '@/components/RecoverySessionGuard';

export const MobileBottomNav = () => {
  const pathname = usePathname();
  const { count: wishlistCount } = useAppSelector((state) => state.wishlist);
  const { isAuthenticated } = useAppSelector((state) => state.auth);
  const { recoveryOnly } = useRecoverySession();
  const showAccount = isAuthenticated && !recoveryOnly;

  const navItems = [
    {
      href: '/',
      label: 'Home',
      icon: Home,
      exact: true,
    },
    {
      href: '/shop',
      label: 'Shop',
      icon: ShoppingBag,
      exact: false,
    },
    {
      href: '/pre-order',
      label: 'Pre-Order',
      icon: Package,
      exact: false,
    },
    {
      href: '/account/wishlist',
      label: 'Wishlist',
      icon: Heart,
      exact: false,
      badge: wishlistCount > 0 ? wishlistCount : undefined,
    },
    {
      href: showAccount ? '/account' : '/login?redirect=%2Faccount',
      label: 'My Account',
      icon: User,
      exact: false,
    },
  ];

  const isActive = (item: (typeof navItems)[0]) => {
    if (item.label === 'My Account') {
      return pathname.startsWith('/account') && !pathname.startsWith('/account/wishlist');
    }
    if (item.label === 'Wishlist') {
      return pathname.startsWith('/account/wishlist') || pathname.startsWith('/wishlist');
    }
    if (item.exact) {
      return pathname === item.href;
    }
    return pathname.startsWith(item.href);
  };

  return (
    <nav
      aria-label="Main"
      className="fixed bottom-0 left-0 right-0 z-30 border-t border-gray-200 bg-white shadow-lg print:hidden md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0)' }}
    >
      <div className="flex items-center justify-between gap-1 px-1 py-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex min-h-11 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-lg px-1 py-1.5 transition-colors ${
                active ? 'text-[#FF7A19]' : 'text-[#3A3A3A]'
              }`}
            >
              <div className="relative">
                <Icon
                  size={22}
                  className={active ? 'text-[#FF7A19]' : 'text-[#3A3A3A]'}
                />
                {'badge' in item && item.badge && item.badge > 0 ? (
                  <span className="absolute -top-2 -right-2 flex h-4 w-4 items-center justify-center rounded-full bg-[#FF7A19] text-[10px] font-bold text-white">
                    {item.badge > 9 ? '9+' : item.badge}
                  </span>
                ) : null}
              </div>
              <span className={`text-[9px] font-medium leading-tight ${active ? 'text-[#FF7A19]' : 'text-[#3A3A3A]'}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

