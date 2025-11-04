'use client';

import { useState, useEffect } from 'react';
import { Users, UserPlus, Heart, ShoppingCart, Download } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

interface CustomerData {
  totalCustomers: number;
  newCustomers: number;
  returningRate: number;
  avgLifetimeValue: number;
  topCustomers: Array<{ name: string; orders: number; spent: number; since: string }>;
  customerSegments: Array<{ segment: string; count: number; percentage: number }>;
}

export default function CustomersAnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState<'7days' | '30days' | '90days'>('30days');
  const [customerData, setCustomerData] = useState<CustomerData>({
    totalCustomers: 0,
    newCustomers: 0,
    returningRate: 0,
    avgLifetimeValue: 0,
    topCustomers: [],
    customerSegments: [],
  });

  useEffect(() => {
    fetchCustomerData();
  }, [timeFilter]);

  const fetchCustomerData = async () => {
    try {
      setLoading(true);

      // Calculate date range
      const now = new Date();
      let startDate: Date;
      switch (timeFilter) {
        case '7days':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30days':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case '90days':
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      }

      // Fetch all customers
      const { data: allCustomers, error: customersError } = await supabase
        .from('users')
        .select('id, first_name, last_name, created_at')
        .eq('role', 'customer');

      if (customersError) throw customersError;

      const totalCustomers = allCustomers?.length || 0;
      const newCustomers = allCustomers?.filter(c => new Date(c.created_at) >= startDate).length || 0;

      // Fetch orders with user info for top customers
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('user_id, total, created_at, user:users!orders_user_id_fkey(first_name, last_name, created_at)')
        .eq('payment_status', 'paid');

      if (ordersError) throw ordersError;

      // Calculate customer spending
      const customerSpending: { [key: string]: { name: string; orders: number; spent: number; since: string } } = {};
      
      orders?.forEach(order => {
        const userId = order.user_id;
        if (!userId) return;

        const user = order.user as any;
        const userName = user 
          ? (user.full_name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Unknown')
          : 'Unknown';
        
        if (!customerSpending[userId]) {
          customerSpending[userId] = {
            name: userName,
            orders: 0,
            spent: 0,
            since: (user && !Array.isArray(user) && user.created_at) ? user.created_at : order.created_at,
          };
        }
        customerSpending[userId].orders += 1;
        customerSpending[userId].spent += parseFloat(order.total) || 0;
      });

      const topCustomers = Object.values(customerSpending)
        .sort((a, b) => b.spent - a.spent)
        .slice(0, 5);

      // Calculate customer segments - include all customers (even those without orders)
      const totalWithOrders = Object.keys(customerSpending).length;
      const totalCustomersWithoutOrders = Math.max(0, totalCustomers - totalWithOrders);
      
      const vipCount = Object.values(customerSpending).filter(c => c.orders >= 10).length;
      const loyalCount = Object.values(customerSpending).filter(c => c.orders >= 5 && c.orders < 10).length;
      const regularCount = Object.values(customerSpending).filter(c => c.orders >= 2 && c.orders < 4).length;
      const newCount = Object.values(customerSpending).filter(c => c.orders === 1).length;

      const customerSegments = [
        { segment: 'VIP (10+ orders)', count: vipCount, percentage: totalCustomers > 0 ? (vipCount / totalCustomers) * 100 : 0 },
        { segment: 'Loyal (5-9 orders)', count: loyalCount, percentage: totalCustomers > 0 ? (loyalCount / totalCustomers) * 100 : 0 },
        { segment: 'Regular (2-4 orders)', count: regularCount, percentage: totalCustomers > 0 ? (regularCount / totalCustomers) * 100 : 0 },
        { segment: 'New (1 order)', count: newCount, percentage: totalCustomers > 0 ? (newCount / totalCustomers) * 100 : 0 },
        { segment: 'No Orders Yet', count: totalCustomersWithoutOrders, percentage: totalCustomers > 0 ? (totalCustomersWithoutOrders / totalCustomers) * 100 : 0 },
      ];

      // Calculate returning rate
      const customersWithMultipleOrders = Object.values(customerSpending).filter(c => c.orders > 1).length;
      const returningRate = totalWithOrders > 0 ? (customersWithMultipleOrders / totalWithOrders) * 100 : 0;

      // Calculate average lifetime value
      const totalSpent = Object.values(customerSpending).reduce((sum, c) => sum + c.spent, 0);
      const avgLifetimeValue = totalWithOrders > 0 ? totalSpent / totalWithOrders : 0;

      setCustomerData({
        totalCustomers,
        newCustomers,
        returningRate: parseFloat(returningRate.toFixed(1)),
        avgLifetimeValue: parseFloat(avgLifetimeValue.toFixed(2)),
        topCustomers,
        customerSegments,
      });
    } catch (error) {
      console.error('Error fetching customer data:', error);
      toast.error('Failed to load customer analytics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF7A19] mx-auto mb-4"></div>
          <p className="text-[#3A3A3A]">Loading customer analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1A1A1A]">Customer Analytics</h1>
          <p className="text-sm text-[#3A3A3A] mt-1">
            Understand your customer base and behavior
          </p>
        </div>
        <div className="flex gap-3">
          <select
            value={timeFilter}
            onChange={(e) => setTimeFilter(e.target.value as any)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF7A19]"
          >
            <option value="7days">Last 7 Days</option>
            <option value="30days">Last 30 Days</option>
            <option value="90days">Last 90 Days</option>
          </select>
          <Button variant="outline" icon={<Download size={18} />}>
            Export Report
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl shadow-sm p-6 border-2 border-blue-200">
          <div className="flex items-center gap-3 mb-4">
            <Users className="text-blue-600" size={32} />
          </div>
          <p className="text-sm text-blue-700 mb-1">Total Customers</p>
          <p className="text-3xl font-bold text-blue-900">{customerData.totalCustomers}</p>
          <p className="text-sm text-blue-700 mt-2">Registered users</p>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl shadow-sm p-6 border-2 border-green-200">
          <div className="flex items-center gap-3 mb-4">
            <UserPlus className="text-green-600" size={32} />
          </div>
          <p className="text-sm text-green-700 mb-1">New Customers</p>
          <p className="text-3xl font-bold text-green-900">{customerData.newCustomers}</p>
          <p className="text-sm text-green-700 mt-2">This period</p>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl shadow-sm p-6 border-2 border-purple-200">
          <div className="flex items-center gap-3 mb-4">
            <Heart className="text-purple-600" size={32} />
          </div>
          <p className="text-sm text-purple-700 mb-1">Returning Rate</p>
          <p className="text-3xl font-bold text-purple-900">{customerData.returningRate}%</p>
          <p className="text-sm text-purple-700 mt-2">Customer retention</p>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl shadow-sm p-6 border-2 border-orange-200">
          <div className="flex items-center gap-3 mb-4">
            <ShoppingCart className="text-orange-600" size={32} />
          </div>
          <p className="text-sm text-orange-700 mb-1">Avg. Lifetime Value</p>
          <p className="text-3xl font-bold text-orange-900">
            GHS {customerData.avgLifetimeValue}
          </p>
          <p className="text-sm text-orange-700 mt-2">Per customer</p>
        </div>
      </div>

      {/* Customer Segments */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-bold text-[#1A1A1A] mb-6">Customer Segments</h2>
        <div className="space-y-4">
          {customerData.customerSegments.map((segment, index) => (
            <div key={index}>
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-[#1A1A1A]">{segment.segment}</span>
                <div className="text-right">
                  <span className="font-bold text-[#1A1A1A]">
                    {segment.count} customers
                  </span>
                  <span className="text-sm text-[#3A3A3A] ml-2">
                    ({segment.percentage}%)
                  </span>
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-[#FF7A19] h-full rounded-full transition-all duration-500"
                  style={{ width: `${segment.percentage}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Top Customers */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-bold text-[#1A1A1A]">Top Customers (By Spending)</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-[#1A1A1A] uppercase">
                  Rank
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-[#1A1A1A] uppercase">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-[#1A1A1A] uppercase">
                  Orders
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-[#1A1A1A] uppercase">
                  Total Spent
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-[#1A1A1A] uppercase">
                  Customer Since
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {customerData.topCustomers.map((customer, index) => (
                <tr key={index} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <span className="font-bold text-[#1A1A1A]">#{index + 1}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <span className="font-semibold text-[#1A1A1A]">{customer.name}</span>
                      {index === 0 && (
                        <span className="ml-2 px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full">
                          ⭐ VIP
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-bold text-[#3A3A3A]">{customer.orders} orders</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-bold text-[#FF7A19]">
                      GHS {customer.spent.toLocaleString()}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-[#3A3A3A]">
                      {new Date(customer.since).toLocaleDateString()}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Insights */}
      <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl border-2 border-purple-200 p-6">
        <h3 className="font-bold text-purple-900 mb-3">💡 Customer Insights</h3>
        <ul className="space-y-2 text-sm text-purple-700">
          <li>✓ Nearly 50% of customers are first-time buyers - focus on retention strategies</li>
          <li>✓ VIP customers (3.6%) contribute significantly to revenue - reward them</li>
          <li>✓ Returning customer rate is 34.5% - implement loyalty programs</li>
          <li>✓ Average lifetime value is GHS 456.78 - upselling opportunities exist</li>
        </ul>
      </div>
    </div>
  );
}



