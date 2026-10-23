export function isAdminRole(role: string | null | undefined): boolean {
  return role === 'admin' || role === 'superadmin';
}

export function hasAdminEntry(role: string | null | undefined): boolean {
  return role === 'staff' || role === 'admin' || role === 'superadmin';
}
