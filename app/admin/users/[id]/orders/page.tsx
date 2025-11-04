'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ChevronLeft, 
  Search, 
  Package, 
  CreditCard, 
  MapPin,
  Calendar,
  Eye,
  Download
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { supabase } from '@/lib/supabase';
import { formatCurrency, formatDate, getOrderStatusColor } from '@/lib/helpers';
import toast from 'react-hot-toast';
import { Spinner } from '@/components/loaders/Spinner';

interface Order {
  id: string;
  order_number: string;
  status: string;
  payment_status: string;
  payment_method: string;
  total: number;
  created_at: string;
  updated_at: string;
  items_count: number;
}

interface UserData {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

export default function UserOrdersPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.id as string;
  
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<UserData | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (userId) {
      fetchUserData();
      fetchUserOrders();
    }
  }, [userId]);

  const fetchUserData = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, first_name, last_name, email')
        .eq('id', userId)
        .single();

      if (error) throw error;
      setUser(data);
    } catch (error: any) {
      console.error('Error fetching user:', error);
      toast.error('Failed to load user data');
      router.push('/admin/users');
    }
  };

  const fetchUserOrders = async () => {
    try {
      setLoading(true);
      
      // Try backend API first (bypasses RLS)
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      try {
        const response = await fetch(`${API_URL}/api/orders?user_id=${userId}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data) {
            const formattedOrders = result.data.map((order: any) => ({
              id: order.id,
              order_number: order.order_number,
              status: order.status,
              payment_status: order.payment_status,
              payment_method: order.payment_method,
              total: parseFloat(order.total) || 0,
              created_at: order.created_at,
              updated_at: order.updated_at,
              items_count: order.order_items?.length || 0,
            }));
            setOrders(formattedOrders);
            return;
          }
        }
      } catch (apiError) {
        console.warn('Backend API failed, trying Supabase:', apiError);
      }

      // Fallback to Supabase
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id,
          order_number,
          status,
          payment_status,
          payment_method,
          total,
          created_at,
          updated_at,
          order_items(id)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedOrders = (data || []).map((order: any) => ({
        id: order.id,
        order_number: order.order_number,
        status: order.status,
        payment_status: order.payment_status,
        payment_method: order.payment_method,
        total: parseFloat(order.total) || 0,
        created_at: order.created_at,
        updated_at: order.updated_at,
        items_count: order.order_items?.length || 0,
      }));

      setOrders(formattedOrders);
    } catch (error: any) {
      console.error('Error fetching orders:', error);
      toast.error('Failed to load orders');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredOrders = orders.filter(order =>
    order.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    order.status.toLowerCase().includes(searchQuery.toLowerCase()) ||
    order.payment_status.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    const colors = getOrderStatusColor(status);
    return (
      <Badge className={colors.bg} size="sm">
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const getPaymentStatusBadge = (status: string) => {
    const statusColors: { [key: string]: string } = {
      paid: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      failed: 'bg-red-100 text-red-800',
      refunded: 'bg-blue-100 text-blue-800',
    };
    return (
      <Badge className={statusColors[status] || 'bg-gray-100 text-gray-800'} size="sm">
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  if (loading && !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/users">
            <Button variant="outline" size="sm" icon={<ChevronLeft size={18} />}>
              Back to Users
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-[#1A1A1A]">
              {user ? `${user.first_name} ${user.last_name}'s Orders` : 'User Orders'}
            </h1>
            <p className="text-sm text-[#3A3A3A] mt-1">
              {user?.email || 'Loading...'}
            </p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search orders by order number, status..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF7A19]"
          />
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Spinner />
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="text-center py-12">
            <Package className="mx-auto text-gray-400 mb-4" size={48} />
            <p className="text-gray-600">No orders found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Order Number
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Payment
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Items
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <span className="font-mono text-sm font-semibold text-[#1A1A1A]">
                        {order.order_number}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(order.status)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        {getPaymentStatusBadge(order.payment_status)}
                        <p className="text-xs text-gray-600 capitalize">{order.payment_method?.replace('_', ' ')}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-900">{order.items_count} item{order.items_count !== 1 ? 's' : ''}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-semibold text-gray-900">{formatCurrency(order.total)}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-600">{formatDate(order.created_at)}</span>
                    </td>
                    <td className="px-6 py-4">
                      <Link href={`/admin/orders/${order.id}`}>
                        <Button variant="outline" size="sm" icon={<Eye size={16} />}>
                          View
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

