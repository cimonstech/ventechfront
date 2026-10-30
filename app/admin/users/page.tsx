'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Users, 
  Search, 
  ChevronLeft,
  Mail,
  Phone,
  Calendar,
  Eye,
  Download
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
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

      if (error) {
        toast.error(error.message || 'Failed to load users');
        setUsers([]);
        return;
      }

      setUsers(data || []);
    } catch (error: any) {
      toast.error(error.message || 'Failed to load users');
      setUsers([]);
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
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
                <h1 className="text-3xl font-bold text-[#1A1A1A]">Customers</h1>
                <p className="text-sm text-[#3A3A3A] mt-1">
                  Manage customer accounts
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm"
                icon={<Download size={16} />}
                onClick={handleExportCustomers}
              >
                Export
              </Button>
              <Badge variant="info">{filteredUsers.length} customers</Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Filters */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#3A3A3A]" size={20} />
            <input
              type="text"
              placeholder="Search by name, email, phone or user ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF7A19]"
            />
          </div>
        </div>

        {/* Users List */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF7A19]"></div>
            </div>
          ) : filteredUsers.length === 0 ? (
            /* Empty State */
            <div className="text-center py-20">
              <div className="bg-orange-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Users className="w-10 h-10 text-[#FF7A19]" />
              </div>
              <h3 className="text-xl font-bold text-[#1A1A1A] mb-2">No Users Found</h3>
              <p className="text-[#3A3A3A]">
                No users match your search criteria
              </p>
            </div>
          ) : (
            /* Users Table */
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-[#1A1A1A]">Name</th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-[#1A1A1A]">Email</th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-[#1A1A1A]">Phone</th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-[#1A1A1A]">Joined</th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-[#1A1A1A]">Newsletter</th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-[#1A1A1A]">Orders</th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-[#1A1A1A]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredUsers.map((userData) => (
                    <tr key={userData.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                            <span className="text-[#FF7A19] font-semibold">
                              {userData.first_name?.[0]}{userData.last_name?.[0]}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-sm text-[#1A1A1A]">
                              {userData.first_name} {userData.last_name}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-sm text-[#3A3A3A]">
                          <Mail size={14} />
                          {userData.email}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {userData.phone ? (
                          <div className="flex items-center gap-2 text-sm text-[#3A3A3A]">
                            <Phone size={14} />
                            {userData.phone}
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-sm text-[#3A3A3A]">
                          <Calendar size={14} />
                          {new Date(userData.created_at).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {userData.newsletter_subscribed ? (
                          <Badge variant="success">Subscribed</Badge>
                        ) : (
                          <Badge variant="default">Not subscribed</Badge>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <Link href={`/admin/users/${userData.id}/orders`}>
                          <span className="text-sm text-[#FF7A19] hover:underline cursor-pointer">
                            View Orders
                          </span>
                        </Link>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Link href={`/admin/users/${userData.id}`}>
                            <button 
                              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                              title="View Details"
                            >
                              <Eye size={16} className="text-[#3A3A3A]" />
                            </button>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="grid md:grid-cols-3 gap-4 mt-6">
          <div className="bg-white rounded-lg p-4 border">
            <p className="text-sm text-[#3A3A3A] mb-1">Total Customers</p>
            <p className="text-2xl font-bold text-[#1A1A1A]">{users.length}</p>
          </div>
          <div className="bg-white rounded-lg p-4 border">
            <p className="text-sm text-[#3A3A3A] mb-1">Newsletter Subscribers</p>
            <p className="text-2xl font-bold text-[#1A1A1A]">
              {users.filter(u => u.newsletter_subscribed).length}
            </p>
          </div>
          <div className="bg-white rounded-lg p-4 border">
            <p className="text-sm text-[#3A3A3A] mb-1">Active This Month</p>
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
    </div>
  );
}


