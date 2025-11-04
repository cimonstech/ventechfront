'use client';

import { useState, useEffect } from 'react';
import { TrendingUp, Package, ShoppingBag, Star, Download } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

interface SalesData {
  totalOrders: number;
  totalUnits: number;
  conversionRate: number;
  topProducts: Array<{ name: string; units: number; revenue: number }>;
}

export default function SalesAnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState<'7days' | '30days' | '90days'>('30days');
  const [salesData, setSalesData] = useState<SalesData>({
    totalOrders: 0,
    totalUnits: 0,
    conversionRate: 0,
    topProducts: [],
  });

  useEffect(() => {
    fetchSalesData();
  }, [timeFilter]);

  const fetchSalesData = async () => {
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

      // Fetch orders with order items (use backend API first to bypass RLS)
      let orders: any[] = [];
      let totalOrders = 0;

      // Try backend API first (bypasses RLS)
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      try {
        const response = await fetch(`${API_URL}/api/orders`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data) {
            // Filter by date range and payment status (include both paid and pending)
            const filteredOrders = (result.data || []).filter((order: any) => {
              const orderDate = new Date(order.created_at);
              return orderDate >= startDate && 
                     (order.payment_status === 'paid' || order.payment_status === 'pending');
            });

            orders = filteredOrders.map((order: any) => ({
              id: order.id,
              total: parseFloat(order.total) || 0,
              order_items: order.order_items || [],
            }));
            totalOrders = orders.length;

            // If we got orders, skip Supabase query
            if (orders.length > 0) {
              console.log('Fetched orders via API:', orders.length);
            }
          }
        }
      } catch (apiError) {
        console.warn('Backend API failed, trying Supabase:', apiError);
      }

      // Fallback to Supabase if API didn't return data
      if (orders.length === 0) {
        // Try backend API for order items if we have order IDs
        try {
          // First, get orders from Supabase
          const { data: ordersData, error: ordersError } = await supabase
            .from('orders')
            .select('id, total, payment_status, created_at')
            .in('payment_status', ['paid', 'pending'])
            .gte('created_at', startDate.toISOString());

          if (ordersError) {
            console.error('Error fetching orders:', ordersError);
            throw ordersError;
          }

          if (ordersData && ordersData.length > 0) {
            // Try to fetch order items via backend API
            const orderIds = ordersData.map((o: any) => o.id).filter(Boolean);
            let orderItemsMap: { [key: string]: any[] } = {};

            try {
              for (const orderId of orderIds) {
                try {
                  const itemsResponse = await fetch(`${API_URL}/api/orders/${orderId}/items`, {
                    method: 'GET',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                  });

                  if (itemsResponse.ok) {
                    const itemsResult = await itemsResponse.json();
                    if (itemsResult.success && itemsResult.data) {
                      orderItemsMap[orderId] = itemsResult.data;
                    }
                  }
                } catch (itemError) {
                  console.warn(`Failed to fetch items for order ${orderId}:`, itemError);
                }
              }
            } catch (apiItemsError) {
              console.warn('Failed to fetch order items via API:', apiItemsError);
            }

            // Map orders with their items
            orders = ordersData.map((order: any) => ({
              id: order.id,
              total: parseFloat(order.total) || 0,
              order_items: orderItemsMap[order.id] || [],
            }));
            totalOrders = orders.length;
          }
        } catch (fallbackError) {
          console.error('Fallback query failed:', fallbackError);
          orders = [];
          totalOrders = 0;
        }
      }

      // Calculate total units and top products
      const productSales: { [key: string]: { name: string; units: number; revenue: number } } = {};
      let totalUnits = 0;

      console.log('Processing orders:', orders.length, 'orders');
      
      orders.forEach(order => {
        const orderItems = order.order_items || [];
        console.log('Order items:', orderItems.length, 'items for order', order.id);
        
        orderItems.forEach((item: any) => {
          const quantity = parseInt(item.quantity) || 0;
          const unitPrice = parseFloat(item.unit_price) || parseFloat(item.price) || 0;
          const productName = item.product_name || item.name || 'Unknown Product';
          
          if (quantity > 0) {
            totalUnits += quantity;

            if (!productSales[productName]) {
              productSales[productName] = { name: productName, units: 0, revenue: 0 };
            }
            productSales[productName].units += quantity;
            productSales[productName].revenue += quantity * unitPrice;
          }
        });
      });

      console.log('Total units:', totalUnits);
      console.log('Product sales:', Object.keys(productSales).length, 'products');

      const topProducts = Object.values(productSales)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

      // Conversion rate (orders / total users * 100) - simplified
      const { count: totalUsers } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'customer');

      const conversionRate = totalUsers && totalUsers > 0 
        ? (totalOrders / totalUsers) * 100 
        : 0;

      setSalesData({
        totalOrders,
        totalUnits,
        conversionRate: parseFloat(conversionRate.toFixed(1)),
        topProducts,
      });
    } catch (error) {
      console.error('Error fetching sales data:', error);
      toast.error('Failed to load sales analytics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF7A19] mx-auto mb-4"></div>
          <p className="text-[#3A3A3A]">Loading sales analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1A1A1A]">Sales Analytics</h1>
          <p className="text-sm text-[#3A3A3A] mt-1">
            Monitor sales performance and trends
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl shadow-sm p-6 border-2 border-blue-200">
          <div className="flex items-center gap-3 mb-4">
            <ShoppingBag className="text-blue-600" size={32} />
          </div>
          <p className="text-sm text-blue-700 mb-1">Total Orders</p>
          <p className="text-3xl font-bold text-blue-900">{salesData.totalOrders}</p>
          <p className="text-sm text-blue-700 mt-2">Completed transactions</p>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl shadow-sm p-6 border-2 border-purple-200">
          <div className="flex items-center gap-3 mb-4">
            <Package className="text-purple-600" size={32} />
          </div>
          <p className="text-sm text-purple-700 mb-1">Units Sold</p>
          <p className="text-3xl font-bold text-purple-900">{salesData.totalUnits}</p>
          <p className="text-sm text-purple-700 mt-2">Individual products</p>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl shadow-sm p-6 border-2 border-orange-200">
          <div className="flex items-center gap-3 mb-4">
            <TrendingUp className="text-orange-600" size={32} />
          </div>
          <p className="text-sm text-orange-700 mb-1">Conversion Rate</p>
          <p className="text-3xl font-bold text-orange-900">{salesData.conversionRate}%</p>
          <p className="text-sm text-orange-700 mt-2">Visitors to buyers</p>
        </div>
      </div>

      {/* Top Selling Products */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-bold text-[#1A1A1A]">Top Selling Products</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-[#1A1A1A] uppercase">
                  Rank
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-[#1A1A1A] uppercase">
                  Product
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-[#1A1A1A] uppercase">
                  Units Sold
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-[#1A1A1A] uppercase">
                  Revenue
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-[#1A1A1A] uppercase">
                  Performance
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {salesData.topProducts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-[#3A3A3A]">
                    No products sold yet
                  </td>
                </tr>
              ) : (
                salesData.topProducts.map((product, index) => {
                  const maxUnits = Math.max(...salesData.topProducts.map((p) => p.units), 1);
                  const performance = maxUnits > 0 ? (product.units / maxUnits) * 100 : 0;
                  return (
                  <tr key={index} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {index === 0 && <Star size={16} className="text-yellow-500 fill-yellow-500" />}
                        <span className="font-bold text-[#1A1A1A]">#{index + 1}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-semibold text-[#1A1A1A]">{product.name}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-bold text-[#3A3A3A]">{product.units} units</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-bold text-[#FF7A19]">
                        GHS {product.revenue.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden max-w-[120px]">
                          <div
                            className="bg-[#FF7A19] h-full rounded-full"
                            style={{ width: `${performance}%` }}
                          ></div>
                        </div>
                        <span className="text-sm text-[#3A3A3A]">{Math.round(performance)}%</span>
                      </div>
                    </td>
                  </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sales Insights - Dynamic based on actual data */}
      {salesData.topProducts.length > 0 && (
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl border-2 border-green-200 p-6">
          <h3 className="font-bold text-green-900 mb-3">💡 Sales Insights</h3>
          <ul className="space-y-2 text-sm text-green-700">
            {salesData.topProducts[0] && (
              <li>✓ {salesData.topProducts[0].name} is your best seller with {salesData.topProducts[0].units} units sold</li>
            )}
            {salesData.topProducts[0] && (
              <li>✓ {salesData.topProducts[0].name} generates the highest revenue at GHS {salesData.topProducts[0].revenue.toLocaleString()}</li>
            )}
            {salesData.topProducts.length > 1 && (
              <li>✓ {salesData.topProducts[1].name} shows strong performance with {salesData.topProducts[1].units} units sold</li>
            )}
            {salesData.totalOrders > 0 && (
              <li>✓ Average order value: GHS {((salesData.topProducts.reduce((sum, p) => sum + p.revenue, 0) / salesData.totalOrders) || 0).toFixed(2)}</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}



