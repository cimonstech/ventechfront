'use client';

import Link from 'next/link';

const LINKS = [
  { href: '/admin/vlb', label: 'Applications' },
  { href: '/admin/vlb/investors', label: 'Investors' },
  { href: '/admin/vlb/investments', label: 'Investments' },
  { href: '/admin/vlb/payouts', label: 'Payouts' },
  { href: '/admin/vlb/settlement', label: 'Settlement' },
  { href: '/admin/vlb/plans', label: 'Plans' },
  { href: '/admin/vlb/reports', label: 'Reports' },
  { href: '/admin/vlb/upgrades', label: 'Upgrades' },
];

export function VlbNav({ current }: { current: string }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {LINKS.map((item) => (
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
