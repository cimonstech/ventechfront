'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Download } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import {
  AdminPageHeader,
  AdminRowCard,
  FilterBar,
  ResponsiveTable,
  RowActions,
} from '@/components/admin/list';
import { LoadGate, TableSkeleton } from '@/components/ui-states';
import { noteQueryFail } from '@/lib/queryState';
import { useAppSelector } from '@/store';
import { hasAdminEntry } from '@/lib/roles';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { CSVExporter, CustomerColumns } from '@/lib/csvExport';

interface UserData {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  role: string;
  created_at: string;
  newsletter_subscribed: boolean;
}

export default function AdminUsersPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAppSelector((state) => state.auth);
  const [users, setUsers] = useState<UserData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [forbidden, setForbidden] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (isAuthenticated && !hasAdminEntry(user?.role)) {
      router.push('/');
      return;
    }
    fetchUsers();
  }, [isAuthenticated, user]);

  const fetchUsers = async () => {
    try {
      setIsLoading(true);

      const { data, error } = await supabase
        .from('users')
        .select('id, email, first_name, last_name, phone, role, created_at, newsletter_subscribed')
        .eq('role', 'customer')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
      setLoaded(true);
      setFailed(false);
      setForbidden(false);
    } catch (error: any) {
      const kind = noteQueryFail(error);
      if (kind === 'forbidden') setForbidden(true);
      else if (kind !== 'unauthorized') setFailed(true);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = 
      u.email.toLowerCase().includes(searchLower) ||
      u.id.toLowerCase().includes(searchLower) ||
      u.first_name?.toLowerCase().includes(searchLower) ||
      u.last_name?.toLowerCase().includes(searchLower) ||
      u.phone?.toLowerCase().includes(searchLower);
    
    return matchesSearch;
  });

  const handleExportCustomers = () => {
    const exportData = filteredUsers.map(user => ({
      first_name: (user as any).first_name || '',
      last_name: (user as any).last_name || '',
      email: user.email,
      phone: user.phone || '',
      newsletter_subscribed: user.newsletter_subscribed || false,
      created_at: user.created_at,
    }));

    CSVExporter.export(exportData, CustomerColumns, 'customers');
    toast.success(`Exported ${exportData.length} customer(s)!`);
  };

  const customerName = (userData: UserData) =>
    `${userData.first_name || ''} ${userData.last_name || ''}`.trim() || userData.email;

  const userActions = (userData: UserData) => [
    { label: 'View', href: `/admin/users/${userData.id}` },
    { label: 'View orders', href: `/admin/users/${userData.id}/orders` },
  ];

  return (
    <div className="min-w-0">
      <AdminPageHeader
        title="Customers"
        subtitle={`${filteredUsers.length} customer${filteredUsers.length === 1 ? '' : 's'}`}
        secondary={[{ label: 'Export all', icon: <Download size={16} />, onClick: handleExportCustomers }]}
      />

      <FilterBar
        search={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search customers"
      />

      <LoadGate
        loaded={loaded}
        loading={isLoading}
        updating={isLoading && loaded}
        error={failed}
        forbidden={forbidden}
        isEmpty={filteredUsers.length === 0}
        filtered={Boolean(searchQuery)}
        onRetry={() => void fetchUsers()}
        onClearFilters={() => setSearchQuery('')}
        skeleton={<TableSkeleton rows={6} />}
        emptyTitle="No customers yet"
        emptyDescription="Customer accounts will show up here."
        denyHome="/admin"
      >
        <ResponsiveTable
          headers={
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">Joined</th>
              <th className="px-4 py-3">Newsletter</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          }
          cards={filteredUsers.map((userData) => (
            <AdminRowCard
              key={userData.id}
              name={customerName(userData)}
              status={
                userData.newsletter_subscribed ? (
                  <Badge variant="success">Subscribed</Badge>
                ) : (
                  <Badge variant="default">Not subscribed</Badge>
                )
              }
              facts={[
                { label: 'Email', value: userData.email },
                { label: 'Phone', value: userData.phone || '—' },
                { label: 'Joined', value: new Date(userData.created_at).toLocaleDateString() },
              ]}
              actions={<RowActions name={customerName(userData)} actions={userActions(userData)} />}
            />
          ))}
        >
          {filteredUsers.map((userData) => (
            <tr key={userData.id} className="hover:bg-gray-50">
              <td className="px-4 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-100">
                    <span className="font-semibold text-[#FF7A19]">
                      {userData.first_name?.[0]}{userData.last_name?.[0]}
                    </span>
                  </div>
                  <p className="truncate font-medium text-[#1A1A1A]">
                    {customerName(userData)}
                  </p>
                </div>
              </td>
              <td className="px-4 py-3 text-sm text-[#3A3A3A]">{userData.email}</td>
              <td className="px-4 py-3 text-sm text-[#3A3A3A]">{userData.phone || '—'}</td>
              <td className="px-4 py-3 text-sm text-[#3A3A3A]">
                {new Date(userData.created_at).toLocaleDateString()}
              </td>
              <td className="px-4 py-3">
                {userData.newsletter_subscribed ? (
                  <Badge variant="success">Subscribed</Badge>
                ) : (
                  <Badge variant="default">Not subscribed</Badge>
                )}
              </td>
              <td className="px-4 py-3 text-right">
                <RowActions name={customerName(userData)} actions={userActions(userData)} />
              </td>
            </tr>
          ))}
        </ResponsiveTable>
      </LoadGate>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border bg-white p-4">
          <p className="mb-1 text-sm text-[#3A3A3A]">Total customers</p>
          <p className="text-2xl font-bold text-[#1A1A1A]">{users.length}</p>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <p className="mb-1 text-sm text-[#3A3A3A]">Newsletter subscribers</p>
          <p className="text-2xl font-bold text-[#1A1A1A]">
            {users.filter(u => u.newsletter_subscribed).length}
          </p>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <p className="mb-1 text-sm text-[#3A3A3A]">Active this month</p>
          <p className="text-2xl font-bold text-[#1A1A1A]">
            {users.filter(u => {
              const created = new Date(u.created_at);
              const now = new Date();
              return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
            }).length}
          </p>
        </div>
      </div>
    </div>
  );
}
