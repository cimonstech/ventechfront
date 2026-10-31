'use client';

import Link from 'next/link';
import {
  Handshake,
  LayoutDashboard,
  Settings,
  ShoppingBag,
  Users,
  type LucideIcon,
} from 'lucide-react';

type DockItem = {
  label: string;
  href?: string;
  icon: LucideIcon;
  children?: DockItem[];
};

const TABS = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    href: '/admin',
    icon: LayoutDashboard,
    active: (path: string) => path === '/admin' || path === '/admin/dashboard',
  },
  {
    id: 'orders',
    label: 'Orders',
    href: '/admin/orders',
    icon: ShoppingBag,
    active: (path: string) => path.startsWith('/admin/orders'),
  },
  {
    id: 'customers',
    label: 'Customers',
    href: '/admin/users',
    icon: Users,
    active: (path: string) => path.startsWith('/admin/users'),
  },
  {
    id: 'settings',
    label: 'Settings',
    href: '/admin/settings',
    icon: Settings,
    active: (path: string) => path.startsWith('/admin/settings'),
  },
  {
    id: 'affiliates',
    label: 'Affiliate',
    href: '/admin/affiliates',
    icon: Handshake,
    active: (path: string) => path.startsWith('/admin/affiliates'),
  },
] as const;

function hrefsOf(items: DockItem[]): string[] {
  return items.flatMap((item) => [
    ...(item.href ? [item.href] : []),
    ...(item.children ? hrefsOf(item.children) : []),
  ]);
}

export function AdminMobileDock({
  items,
  pathname,
}: {
  items: DockItem[];
  pathname: string;
}) {
  const allowed = new Set(hrefsOf(items));
  const tabs = TABS.filter((item) => allowed.has(item.href));
  if (tabs.length === 0) return null;

  return (
    <nav
      aria-label="Admin"
      className="fixed bottom-0 left-0 right-0 z-30 border-t border-gray-200 bg-white shadow-lg print:hidden md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0)' }}
    >
      <div className="flex items-center justify-between gap-1 px-1 py-1">
        {tabs.map((item) => {
          const Icon = item.icon;
          const active = item.active(pathname);
          return (
            <Link
              key={item.id}
              href={item.href}
              className={`flex min-h-11 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-lg px-1 py-1.5 ${
                active ? 'text-[#FF7A19]' : 'text-[#3A3A3A]'
              }`}
            >
              <Icon size={22} aria-hidden />
              <span className="text-[9px] font-medium leading-tight">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
