'use client';

import Link from 'next/link';
import { useAccess } from '@/context/AccessContext';

const LINKS: Array<{ href: string; label: string; finance?: boolean }> = [
  { href: '/admin/affiliates', label: 'Affiliates' },
  { href: '/admin/affiliates/commissions', label: 'Commissions' },
  { href: '/admin/affiliates/withdrawals', label: 'Withdrawals' },
  { href: '/admin/affiliates/settings', label: 'Settings', finance: true },
];

export function AffiliatesNav({ current }: { current: string }) {
  const { canEdit } = useAccess();
  const finance = canEdit('finance');

  return (
    <div className="flex flex-wrap items-center gap-2">
      {LINKS.filter((item) => !item.finance || finance).map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={`px-3 py-1.5 rounded-full text-sm font-medium ${
            current === item.href
              ? 'bg-[#FF7A19] text-white'
              : 'bg-white border border-gray-200 text-[#1A1A1A]'
          }`}
        >
          {item.label}
        </Link>
      ))}
    </div>
  );
}
