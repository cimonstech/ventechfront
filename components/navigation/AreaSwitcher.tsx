'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDown } from 'lucide-react';
import { useAppSelector } from '@/store';
import { useAccess } from '@/context/AccessContext';
import { PROGRAM_AREAS, hasAdminEntry } from '@/lib/access';
import { getRoleLabel } from '@/lib/roles';

interface AreaLink {
  id: string;
  label: string;
  href: string | null;
}

export function AreaSwitcher({
  variant = 'dropdown',
  onNavigate,
}: {
  variant?: 'dropdown' | 'list';
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const { user, isAuthenticated } = useAppSelector((state) => state.auth);
  const { access } = useAccess();

  if (!isAuthenticated || !user) return null;

  const areas: AreaLink[] = [
    { id: 'account', label: 'My account', href: '/account' },
  ];

  if (hasAdminEntry(access?.role || user.role)) {
    areas.push({ id: 'admin', label: 'Admin panel', href: '/admin' });
  }

  for (const area of PROGRAM_AREAS) {
    const active = access?.programRoles?.some(
      (row) => row.role === area.role && row.status === 'active'
    );
    if (!active) continue;
    areas.push({ id: area.role, label: area.label, href: area.href });
  }

  const current = pathname.startsWith('/admin')
    ? 'Admin panel'
    : pathname.startsWith('/account/affiliate') || pathname.startsWith('/affiliate')
      ? 'Affiliate'
      : pathname.startsWith('/account/investments')
        ? 'Investor'
        : 'My account';
  const buttonLabel = hasAdminEntry(user.role) ? getRoleLabel(user.role) : current;

  if (variant === 'list') {
    return (
      <div>
        {areas.map((area) =>
          area.href ? (
            <Link
              key={area.id}
              href={area.href}
              onClick={onNavigate}
              className={`block px-4 py-2.5 text-sm transition-colors ${
                area.label === current
                  ? 'text-[#FF7A19] font-medium'
                  : 'text-[#3A3A3A] hover:bg-gray-50 hover:text-[#FF7A19]'
              }`}
            >
              {area.label}
            </Link>
          ) : (
            <div key={area.id} className="block px-4 py-2.5 text-sm text-[#3A3A3A]">
              {area.label}
            </div>
          )
        )}
      </div>
    );
  }

  return (
    <div className="relative group">
      <button
        type="button"
        className="flex items-center gap-1 px-3 py-2 rounded-lg hover:bg-gray-50 text-sm font-medium text-[#1A1A1A]"
      >
        {buttonLabel}
        <ChevronDown size={14} className="text-[#3A3A3A]" />
      </button>
      <div className="absolute right-0 mt-2 w-44 bg-white rounded-lg shadow-xl border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
        {areas.map((area) =>
          area.href ? (
            <Link
              key={area.id}
              href={area.href}
              className={`block px-4 py-2.5 text-sm hover:bg-gray-50 ${
                area.label === current ? 'text-[#FF7A19] font-medium' : 'text-[#1A1A1A]'
              } first:rounded-t-lg last:rounded-b-lg`}
            >
              {area.label}
            </Link>
          ) : (
            <div key={area.id} className="block px-4 py-2.5 text-sm text-[#3A3A3A] last:rounded-b-lg">
              {area.label}
            </div>
          )
        )}
      </div>
    </div>
  );
}
