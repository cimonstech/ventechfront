'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Users, 
  Search, 
  ChevronLeft,
  Shield,
  User,
  Mail,
  Phone,
  Calendar,
  Eye,
  Download
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useAppSelector } from '@/store';
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
  const [roleFilter, setRoleFilter] = useState<string>('all');

  useEffect(() => {
    if (isAuthenticated && user?.role !== 'admin') {
      router.push('/');
      return;
    }
    fetchUsers();
  }, [isAuthenticated, user]);

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      
      // First, check current user's role and session
      const { data: { session } } = await supabase.auth.getSession();
      console.log('Current session:', session?.user?.id);
      
      // Try fetching all users first (to debug RLS)
      const { data: allUsersData, error: allUsersError } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      console.log('All users fetch:', {
        count: allUsersData?.length || 0,
        error: allUsersError?.message,
        sampleUsers: allUsersData?.slice(0, 3).map((u: any) => ({
          id: u.id,
          email: u.email,
          role: u.role,
          name: u.name || u.full_name,
        })),
      });

      // Now try fetching customers specifically
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'customer')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching customers:', {
          error,
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
        });
        
        // Check if it's an RLS policy error
        const errorMessage = error.message || '';
        const isRLSError = 
          errorMessage.includes('policy') ||
          errorMessage.includes('RLS') ||
          errorMessage.includes('permission denied') ||
          error.code === 'PGRST301';
        
        if (isRLSError) {
          toast.error('Permission denied. Please check your admin access.');
          // Try fallback: filter client-side if we got all users
          if (allUsersData && allUsersData.length > 0) {
            const customers = allUsersData.filter((u: any) => 
              u.role === 'customer' || u.role?.toLowerCase() === 'customer'
            );
            console.log('Filtered customers from all users:', {
              count: customers.length,
              roles: allUsersData.map((u: any) => u.role),
            });
            setUsers(customers);
            return;
          }
        } else {
          toast.error(`Failed to load users: ${error.message || 'Unknown error'}`);
        }
        setUsers([]);
        return;
      }
      
      console.log('Customers fetched:', {
        count: data?.length || 0,
        roles: data?.map((u: any) => u.role),
        sampleCustomers: data?.slice(0, 2).map((u: any) => ({
          id: u.id,
          email: u.email,
          role: u.role,
        })),
      });
      
      // If customer query failed but we got all users, filter client-side
      if ((!data || data.length === 0) && allUsersData && allUsersData.length > 0) {
        console.log('Customer query returned 0, but we have all users. Filtering client-side...');
        const customers = allUsersData.filter((u: any) => 
          u.role === 'customer' || u.role?.toLowerCase() === 'customer'
        );
        
        console.log('Filtered customers from all users:', {
          count: customers.length,
          allUsersRoles: allUsersData.map((u: any) => u.role),
          filteredRoles: customers.map((u: any) => u.role),
        });
        
        if (customers.length > 0) {
          setUsers(customers);
          return;
        }
      }
      
      setUsers(data || []);
      
      if (!data || data.length === 0) {
        console.warn('No customers found in database. Debug info:', {
          allUsersCount: allUsersData?.length || 0,
          allUsersRoles: allUsersData?.map((u: any) => u.role),
          queryRole: 'customer',
          sessionUser: session?.user?.id,
          currentUserRole: user?.role,
        });
        
        // If we got all users but no customers, show helpful message
        if (allUsersData && allUsersData.length > 0) {
          const uniqueRoles = [...new Set(allUsersData.map((u: any) => u.role))];
          toast.error(`No customers found. Found ${allUsersData.length} users with roles: ${uniqueRoles.join(', ')}`);
        } else {
          toast.error('No customers found in database');
        }
      }
    } catch (error: any) {
      console.error('Error fetching users:', error);
      toast.error(`Failed to load users: ${error.message || 'Unknown error'}`);
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

  const getRoleBadge = (role: string) => {
    return role === 'admin' ? (
      <Badge variant="error" className="flex items-center gap-1">
        <Shield size={12} />
        Admin
      </Badge>
    ) : (
      <Badge variant="default" className="flex items-center gap-1">
        <User size={12} />
        Customer
      </Badge>
    );
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


