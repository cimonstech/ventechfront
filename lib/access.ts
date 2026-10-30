import { emitSessionExpired } from '@/lib/httpErrors';
import { hasAdminEntry, isAdminRole } from '@/lib/roles';

export const ACCESS_MODULES = [
  'orders',
  'products',
  'content',
  'devices',
  'tickets',
  'affiliates',
  'vlb',
  'finance',
] as const;

export type AccessModule = (typeof ACCESS_MODULES)[number];

export interface ModulePermission {
  module: string;
  can_view: boolean;
  can_edit: boolean;
}

export interface ProgramRoleRow {
  role: string;
  status: string;
}

export interface AccessProfile {
  role: string;
  permissions: ModulePermission[];
  programRoles: ProgramRoleRow[];
}

/**
 * Program-area entries for the switcher.
 * Leave href null until that area's pages exist. The row is shown only when
 * programRoles contains an active row for the same role.
 */
export const PROGRAM_AREAS: Array<{
  role: 'affiliate' | 'investor';
  label: string;
  href: string | null;
}> = [
  { role: 'affiliate', label: 'Affiliate', href: '/account/affiliate' },
  { role: 'investor', label: 'Investor', href: '/account/investments' },
];

const FULL_ADMIN_PREFIXES = [
  '/admin/users',
  '/admin/coupons',
  '/admin/discounts',
  '/admin/taxes',
  '/admin/settings',
  '/admin/notifications',
  '/admin/analytics/sales',
  '/admin/analytics/customers',
  '/admin/wishlist-insights',
  '/admin/cart-analytics',
  '/admin/staff',
  '/admin/dashboard',
];

const MODULE_PREFIXES: Array<{ prefix: string; module: AccessModule }> = [
  { prefix: '/admin/pre-orders', module: 'orders' },
  { prefix: '/admin/orders', module: 'orders' },
  { prefix: '/admin/transactions', module: 'finance' },
  { prefix: '/admin/analytics/revenue', module: 'finance' },
  { prefix: '/admin/products', module: 'products' },
  { prefix: '/admin/categories', module: 'products' },
  { prefix: '/admin/brands', module: 'products' },
  { prefix: '/admin/reviews', module: 'products' },
  { prefix: '/admin/media', module: 'products' },
  { prefix: '/admin/devices', module: 'devices' },
  { prefix: '/admin/tickets', module: 'tickets' },
  { prefix: '/admin/affiliates', module: 'affiliates' },
  { prefix: '/admin/vlb', module: 'vlb' },
  { prefix: '/admin/content', module: 'content' },
  { prefix: '/admin/faqs', module: 'content' },
  { prefix: '/admin/pages', module: 'content' },
  { prefix: '/admin/banners', module: 'content' },
  { prefix: '/admin/sidebar-ads', module: 'content' },
];

export { hasAdminEntry };

export const ADMIN_DATA_DENIED = "You don't have access to this data.";

export function isAccessDeniedStatus(status: number): boolean {
  return status === 401 || status === 403;
}

export function accessDeniedMessage(status: number, fallback = 'Request failed'): string {
  if (status === 401) {
    emitSessionExpired();
    return 'Your session expired. Sign in again.';
  }
  if (status === 403) return ADMIN_DATA_DENIED;
  if (status === 429) return 'Too many requests. Wait a moment and try again.';
  return fallback;
}

export function isFullAdmin(role: string | null | undefined): boolean {
  return isAdminRole(role);
}

export function permissionFor(access: AccessProfile | null, module: AccessModule): ModulePermission | undefined {
  return access?.permissions.find((permission) => permission.module === module);
}

export function canViewModule(access: AccessProfile | null, module: AccessModule): boolean {
  if (!access) return false;
  if (isFullAdmin(access.role)) return true;
  const permission = permissionFor(access, module);
  return permission?.can_view === true || permission?.can_edit === true;
}

export function canEditModule(access: AccessProfile | null, module: AccessModule): boolean {
  if (!access) return false;
  if (isFullAdmin(access.role)) return true;
  return permissionFor(access, module)?.can_edit === true;
}

function matchesPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function canOpenAdminPath(pathname: string, access: AccessProfile | null): boolean {
  if (!access || !hasAdminEntry(access.role)) return false;
  if (access.role === 'superadmin') return true;
  if (access.role === 'admin') return true;
  if (pathname === '/admin') return true;
  if (FULL_ADMIN_PREFIXES.some((prefix) => matchesPrefix(pathname, prefix))) return false;
  const match = MODULE_PREFIXES.find((entry) => matchesPrefix(pathname, entry.prefix));
  if (!match) return false;
  return canViewModule(access, match.module);
}

export function fullAdminAccess(role: 'admin' | 'superadmin'): AccessProfile {
  return {
    role,
    permissions: ACCESS_MODULES.map((module) => ({
      module,
      can_view: true,
      can_edit: true,
    })),
    programRoles: [],
  };
}
