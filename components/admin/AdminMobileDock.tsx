'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Handshake,
  LayoutDashboard,
  MoreHorizontal,
  Settings,
  ShoppingBag,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { Sheet } from '@/components/ui/Sheet';

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

function leavesOf(items: DockItem[]): Array<{ label: string; href: string; icon: LucideIcon }> {
  return items.flatMap((item) => {
    if (item.children?.length) return leavesOf(item.children);
    if (!item.href) return [];
    return [{ label: item.label, href: item.href, icon: item.icon }];
  });
}

export function AdminMobileDock({
  items,
  pathname,
}: {
  items: DockItem[];
  pathname: string;
}) {
  const [moreOpen, setMoreOpen] = useState(false);
  const allowed = new Set(hrefsOf(items));
  const tabs = TABS.filter((item) => allowed.has(item.href)).slice(0, 5);
  const tabHrefs = new Set<string>(tabs.map((item) => item.href));
  const rest = leavesOf(items).filter((item) => item.href && !tabHrefs.has(item.href) && allowed.has(item.href));
  if (tabs.length === 0) return null;

  return (
    <>
      <nav
        aria-label="Admin"
        className="fixed bottom-0 left-0 right-0 z-30 border-t border-gray-200 bg-white shadow-lg print:hidden md:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0)' }}
      >
        <div className="flex items-stretch justify-between gap-0.5 px-1 py-1">
          {tabs.map((item) => {
            const Icon = item.icon;
            const active = item.active(pathname);
            return (
              <Link
                key={item.id}
                href={item.href}
                className={`flex min-h-11 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-lg px-0.5 py-1.5 ${
                  active ? 'text-[#FF7A19]' : 'text-[#3A3A3A]'
                }`}
              >
                <Icon size={22} aria-hidden />
                <span className="w-full truncate text-center text-[10px] font-medium leading-tight">{item.label}</span>
              </Link>
            );
          })}
          {rest.length > 0 ? (
            <button
              type="button"
              className={`flex min-h-11 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-lg px-0.5 py-1.5 ${
                rest.some((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))
                  ? 'text-[#FF7A19]'
                  : 'text-[#3A3A3A]'
              }`}
              onClick={() => setMoreOpen(true)}
            >
              <MoreHorizontal size={22} aria-hidden />
              <span className="w-full truncate text-center text-[10px] font-medium leading-tight">More</span>
            </button>
          ) : null}
        </div>
      </nav>
      {moreOpen ? (
        <Sheet title="More" onClose={() => setMoreOpen(false)}>
          <nav className="space-y-1">
            {rest.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMoreOpen(false)}
                  className={`flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium ${
                    active ? 'bg-orange-50 text-[#FF7A19]' : 'text-[#1A1A1A] hover:bg-gray-50'
                  }`}
                >
                  <Icon size={20} aria-hidden />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </Sheet>
      ) : null}
    </>
  );
}
