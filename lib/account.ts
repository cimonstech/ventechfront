import { deviceRequest } from '@/lib/devicesAdmin';
import type { ProgramRoleRow } from '@/lib/access';

export interface AccountLatestOrder {
  order_number: string;
  date: string;
  status: string;
  payment_status: string;
  total: number | string;
}

export interface AccountDeviceItem {
  model: string;
  warranty_status: 'active' | 'expired' | 'none' | string;
  warranty_end: string | null;
}

export interface AccountOpenTicket {
  ticket_number: string;
  model: string;
  status: string;
  updated_at: string;
}

export interface AccountAffiliateSummary {
  available_pesewas: number;
  pending_pesewas: number;
  link: string | null;
}

export interface AccountOverview {
  orders: {
    count: number;
    latest: AccountLatestOrder | null;
  };
  devices: {
    count: number;
    items: AccountDeviceItem[];
    warranty_ending_soon: number;
  };
  service_requests: {
    open_count: number;
    open: AccountOpenTicket[];
  };
  wishlist_count: number;
  roles: {
    programRoles: ProgramRoleRow[];
    staff_admin: boolean;
  };
  affiliate: AccountAffiliateSummary | null;
}

export type AccountNavId =
  | 'overview'
  | 'orders'
  | 'devices'
  | 'service'
  | 'wishlist'
  | 'affiliate'
  | 'investments'
  | 'profile';

export interface AccountNavItem {
  id: AccountNavId;
  href: string;
  label: string;
  exact?: boolean;
  require?: 'affiliate' | 'investor-active';
}

export const ACCOUNT_NAV: AccountNavItem[] = [
  { id: 'overview', href: '/account', label: 'Overview', exact: true },
  { id: 'orders', href: '/account/orders', label: 'Orders' },
  { id: 'devices', href: '/account/devices', label: 'My devices' },
  { id: 'service', href: '/account/service', label: 'Service requests' },
  { id: 'wishlist', href: '/account/wishlist', label: 'Wishlist' },
  { id: 'affiliate', href: '/account/affiliate', label: 'Affiliate', require: 'affiliate' },
  { id: 'investments', href: '/account/investments', label: 'Investments', require: 'investor-active' },
  { id: 'profile', href: '/account/profile', label: 'Profile and security' },
];

export function hasAffiliateRole(roles: ProgramRoleRow[] | undefined): boolean {
  return Boolean(roles?.some((row) => row.role === 'affiliate'));
}

export function hasActiveInvestorRole(roles: ProgramRoleRow[] | undefined): boolean {
  return Boolean(roles?.some((row) => row.role === 'investor' && row.status === 'active'));
}

export function visibleAccountNav(roles: ProgramRoleRow[] | undefined): AccountNavItem[] {
  return ACCOUNT_NAV.filter((item) => {
    if (item.require === 'affiliate') return hasAffiliateRole(roles);
    if (item.require === 'investor-active') return hasActiveInvestorRole(roles);
    return true;
  });
}

export function accountNavActive(pathname: string, item: AccountNavItem): boolean {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function fetchAccountOverview() {
  return deviceRequest<AccountOverview>('/api/me/overview');
}
