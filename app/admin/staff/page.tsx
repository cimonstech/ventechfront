'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, Mail, Shield, UserPlus } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { InfoNote } from '@/components/ui/InfoNote';
import { Sheet } from '@/components/ui/Sheet';
import { useAppSelector } from '@/store';
import { hasAdminEntry, isAdminRole } from '@/lib/roles';
import { authHeaders } from '@/lib/authHeaders';
import { useRouter } from 'next/navigation';

const MODULES = [
  { id: 'orders', label: 'Orders' },
  { id: 'products', label: 'Products' },
  { id: 'content', label: 'Content' },
  { id: 'devices', label: 'Devices' },
  { id: 'tickets', label: 'Tickets' },
  { id: 'affiliates', label: 'Affiliates' },
  { id: 'vlb', label: 'Laptop Banking' },
  { id: 'finance', label: 'Finance' },
] as const;

type ModuleId = (typeof MODULES)[number]['id'];
type StaffRole = 'staff' | 'admin' | 'superadmin';

interface Permission {
  module: ModuleId;
  can_view: boolean;
  can_edit: boolean;
}

interface StaffMember {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  full_name: string | null;
  role: StaffRole;
  staff_permissions?: Permission[];
  permissions?: Permission[];
}

const emptyPermissions = (): Permission[] =>
  MODULES.map((module) => ({ module: module.id, can_view: false, can_edit: false }));

function permissionsOf(member: StaffMember | null): Permission[] {
  const saved = member?.staff_permissions || member?.permissions || [];
  return emptyPermissions().map((permission) => {
    const match = saved.find((item) => item.module === permission.module);
    if (!match) return permission;
    const canEdit = !!match.can_edit;
    return { module: permission.module, can_edit: canEdit, can_view: canEdit || !!match.can_view };
  });
}

function displayName(member: StaffMember): string {
  const named = `${member.first_name || ''} ${member.last_name || ''}`.trim();
  return named || member.full_name || member.email;
}

function permissionSummary(member: StaffMember): string {
  const rows = permissionsOf(member).filter((permission) => permission.can_view || permission.can_edit);
  if (rows.length === 0) return 'No module access';
  return rows
    .map((permission) => {
      const label = MODULES.find((module) => module.id === permission.module)?.label || permission.module;
      return `${label} (${permission.can_edit ? 'edit' : 'view'})`;
    })
    .join(', ');
}

export default function AdminStaffPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAppSelector((state) => state.auth);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialog, setDialog] = useState<'add' | 'edit' | null>(null);
  const [editing, setEditing] = useState<StaffMember | null>(null);
  const [removeTarget, setRemoveTarget] = useState<StaffMember | null>(null);
  const [form, setForm] = useState({
    email: '',
    first_name: '',
    last_name: '',
    role: 'staff' as StaffRole,
    permissions: emptyPermissions(),
  });

  const actorRole = user?.role || '';
  const viewerIsOwner = actorRole === 'superadmin';
  const roleOptions: StaffRole[] = viewerIsOwner
    ? ['staff', 'admin', 'superadmin']
    : ['staff'];
  const ownerCount = viewerIsOwner ? staff.filter((member) => member.role === 'superadmin').length : 0;

  useEffect(() => {
    if (isAuthenticated && !hasAdminEntry(user?.role)) {
      router.push('/');
      return;
    }
    if (isAuthenticated && isAdminRole(user?.role)) {
      loadStaff();
    }
  }, [isAuthenticated, user]);

  const loadStaff = async () => {
    try {
      setIsLoading(true);
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/api/admin/staff`, {
        headers: await authHeaders(),
      });
      const payload = await response.json();
      if (!response.ok || payload.success === false) {
        throw new Error(payload.message || 'Failed to load staff');
      }
      setStaff(payload.data || []);
    } catch (error: any) {
      toast.error(error.message || 'Failed to load staff');
    } finally {
      setIsLoading(false);
    }
  };

  const openAdd = () => {
    setEditing(null);
    setForm({
      email: '',
      first_name: '',
      last_name: '',
      role: 'staff',
      permissions: emptyPermissions(),
    });
    setDialog('add');
  };

  const openEdit = (member: StaffMember) => {
    setEditing(member);
    setForm({
      email: member.email,
      first_name: member.first_name || '',
      last_name: member.last_name || '',
      role: roleOptions.includes(member.role) ? member.role : 'staff',
      permissions: permissionsOf(member),
    });
    setDialog('edit');
  };

  const setPermission = (module: ModuleId, field: 'can_view' | 'can_edit', checked: boolean) => {
    setForm((current) => ({
      ...current,
      permissions: current.permissions.map((permission) => {
        if (permission.module !== module) return permission;
        if (field === 'can_edit') {
          return { ...permission, can_edit: checked, can_view: checked ? true : permission.can_view };
        }
        if (!checked && permission.can_edit) return permission;
        return { ...permission, can_view: checked };
      }),
    }));
  };

  const save = async () => {
    try {
      setSaving(true);
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const isEdit = dialog === 'edit' && editing;
      const response = await fetch(
        isEdit ? `${apiUrl}/api/admin/staff/${editing.id}` : `${apiUrl}/api/admin/staff`,
        {
          method: isEdit ? 'PATCH' : 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(await authHeaders()),
          },
          body: JSON.stringify(
            isEdit
              ? { role: form.role, permissions: form.permissions }
              : {
                  email: form.email,
                  first_name: form.first_name,
                  last_name: form.last_name,
                  role: form.role,
                  permissions: form.permissions,
                }
          ),
        }
      );
      const payload = await response.json();
      if (!response.ok || payload.success === false) {
        throw new Error(payload.message || 'Failed to save staff member');
      }
      toast.success(isEdit ? 'Staff member updated' : 'Staff member saved');
      setDialog(null);
      await loadStaff();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save staff member');
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!removeTarget) return;
    try {
      setSaving(true);
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/api/admin/staff/${removeTarget.id}`, {
        method: 'DELETE',
        headers: await authHeaders(),
      });
      const payload = await response.json();
      if (!response.ok || payload.success === false) {
        throw new Error(payload.message || 'Failed to remove staff member');
      }
      toast.success('Staff member is now a customer');
      setRemoveTarget(null);
      await loadStaff();
    } catch (error: any) {
      toast.error(error.message || 'Failed to remove staff member');
    } finally {
      setSaving(false);
    }
  };

  const canManage = (member: StaffMember) => {
    if (viewerIsOwner) return true;
    return member.role === 'staff';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/admin">
                <Button variant="ghost" size="sm">
                  <ChevronLeft size={20} />
                  Back
                </Button>
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-[#1A1A1A]">Staff</h1>
                <p className="text-sm text-[#3A3A3A] mt-1">Manage staff, admins, and their module access</p>
              </div>
            </div>
            <Button size="sm" icon={<UserPlus size={16} />} onClick={openAdd}>
              Add staff
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 space-y-4">
        <InfoNote>
          View lets this person see the section. Edit lets them make changes. Finance is needed to record payments, refunds and investment amounts.
        </InfoNote>
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF7A19]" />
            </div>
          ) : staff.length === 0 ? (
            <div className="text-center py-20">
              <div className="bg-orange-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Shield className="w-10 h-10 text-[#FF7A19]" />
              </div>
              <h3 className="text-xl font-bold text-[#1A1A1A] mb-2">No staff yet</h3>
              <p className="text-[#3A3A3A]">Add a staff member to give them module access.</p>
            </div>
          ) : (
            <div className="overflow-x-auto sticky-first">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-[#1A1A1A]">Name</th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-[#1A1A1A]">Email</th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-[#1A1A1A]">Role</th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-[#1A1A1A]">Permissions</th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-[#1A1A1A]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {staff.map((member) => {
                    const lastOwner = viewerIsOwner && member.role === 'superadmin' && ownerCount <= 1;
                    const manageable = canManage(member);
                    return (
                      <tr key={member.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm font-medium text-[#1A1A1A]">{displayName(member)}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 text-sm text-[#3A3A3A]">
                            <Mail size={14} />
                            {member.email}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant={member.role === 'admin' ? 'warning' : member.role === 'staff' ? 'info' : 'error'}>
                            {member.role}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-sm text-[#3A3A3A] max-w-md">{permissionSummary(member)}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" disabled={!manageable} onClick={() => openEdit(member)}>
                              Edit
                            </Button>
                            <Button
                              variant="danger"
                              size="sm"
                              disabled={!manageable || member.id === user?.id || lastOwner}
                              onClick={() => setRemoveTarget(member)}
                            >
                              Remove
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {dialog && (
        <Sheet
          title={dialog === 'add' ? 'Add staff' : 'Edit staff'}
          onClose={() => setDialog(null)}
          wide
          footer={(
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="ghost" className="w-full sm:w-auto" onClick={() => setDialog(null)}>Cancel</Button>
              <Button className="w-full sm:w-auto" onClick={save} isLoading={saving}>Save</Button>
            </div>
          )}
        >
            <div className="space-y-4">
              {dialog === 'add' && (
                <>
                  <Input label="Email" type="email" required value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Input label="First name" required value={form.first_name} onChange={(event) => setForm({ ...form, first_name: event.target.value })} />
                    <Input label="Last name" required value={form.last_name} onChange={(event) => setForm({ ...form, last_name: event.target.value })} />
                  </div>
                </>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Role</label>
                <select
                  value={form.role}
                  onChange={(event) => setForm({ ...form, role: event.target.value as StaffRole })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#FF7A19]"
                >
                  {roleOptions
                    .filter((role) => !(viewerIsOwner && editing?.role === 'superadmin' && editing.id === user?.id && ownerCount <= 1 && role !== 'superadmin'))
                    .map((role) => (
                      <option key={role} value={role}>{role}</option>
                    ))}
                </select>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Module access</p>
                <InfoNote className="mb-3">
                  View lets this person see the section. Edit lets them make changes. Finance is needed to record payments, refunds and investment amounts.
                </InfoNote>
                <div className="border rounded-lg divide-y">
                  {form.permissions.map((permission) => {
                    const label = MODULES.find((module) => module.id === permission.module)?.label;
                    return (
                      <div key={permission.module} className="flex min-h-11 flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                        <span className="text-sm text-[#1A1A1A]">{label}</span>
                        <div className="flex items-center gap-4 text-sm">
                          <label className="flex min-h-11 items-center gap-2">
                            <input
                              type="checkbox"
                              checked={permission.can_view}
                              disabled={permission.can_edit}
                              onChange={(event) => setPermission(permission.module, 'can_view', event.target.checked)}
                            />
                            View
                          </label>
                          <label className="flex min-h-11 items-center gap-2">
                            <input
                              type="checkbox"
                              checked={permission.can_edit}
                              onChange={(event) => setPermission(permission.module, 'can_edit', event.target.checked)}
                            />
                            Edit
                          </label>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
        </Sheet>
      )}

      {removeTarget && (
        <Sheet
          title="Remove staff member"
          onClose={() => setRemoveTarget(null)}
          footer={(
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="ghost" className="w-full sm:w-auto" onClick={() => setRemoveTarget(null)}>Cancel</Button>
              <Button variant="danger" className="w-full sm:w-auto" onClick={remove} isLoading={saving}>Remove</Button>
            </div>
          )}
        >
            <p className="text-sm text-[#3A3A3A]">
              {displayName(removeTarget)} will become a customer and lose module access.
            </p>
        </Sheet>
      )}
    </div>
  );
}
