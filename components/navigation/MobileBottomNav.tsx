'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, ShoppingBag, Heart, Tag, User, Package } from 'lucide-react';
import { useAppSelector } from '@/store';

export const MobileBottomNav = () => {
  const pathname = usePathname();
  const { count: wishlistCount } = useAppSelector((state) => state.wishlist);
  const { isAuthenticated } = useAppSelector((state) => state.auth);

  const navItems = [
    {
      href: '/',
      label: 'Home',
      icon: Home,
      exact: true, // Only highlight if exact match
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
      href: '/wishlist',
      label: 'Wishlist',
      icon: Heart,
      exact: false,
      badge: wishlistCount > 0 ? wishlistCount : undefined,
    },
    {
      href: isAuthenticated ? '/profile' : '/login',
      label: 'My Account',
      icon: User,
      exact: false,
    },
  ];

  const isActive = (item: typeof navItems[0]) => {
    if (item.exact) {
      return pathname === item.href;
    }
    return pathname.startsWith(item.href);
  };

  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 md:hidden shadow-lg"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0)' }}
    >
      <div className="flex items-center justify-between px-1 py-2 gap-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item);
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                flex flex-col items-center justify-center gap-0.5 px-1.5 py-1.5 rounded-lg transition-colors flex-shrink-0
                ${active 
                  ? 'text-[#FF7A19]' 
                  : 'text-[#3A3A3A]'
                }
              `}
            >
              <div className="relative">
                <Icon 
                  size={22} 
                  className={active ? 'text-[#FF7A19]' : 'text-[#3A3A3A]'}
                />
                {item.badge && item.badge > 0 && (
                  <span className="absolute -top-2 -right-2 bg-[#FF7A19] text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                    {item.badge > 9 ? '9+' : item.badge}
                  </span>
                )}
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

