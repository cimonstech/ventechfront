export function getRoleLabel(role: string | null | undefined): string {
  switch (role) {
    case 'customer':
      return 'Customer';
    case 'staff':
      return 'Staff';
    case 'admin':
      return 'Admin';
    case 'superadmin':
      return 'Super Admin';
    default:
      return 'Customer';
  }
}

export function isAdminRole(role: string | null | undefined): boolean {
  return role === 'admin' || role === 'superadmin';
}

export function hasAdminEntry(role: string | null | undefined): boolean {
  return role === 'staff' || role === 'admin' || role === 'superadmin';
}
