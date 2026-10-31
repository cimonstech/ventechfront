'use client';

import { ADMIN_DATA_DENIED, isAccessDeniedStatus } from '@/lib/access';
import { authHeaders } from '@/lib/authHeaders';
import { useState, useEffect } from 'react';
import { TrendingUp, Package, ShoppingBag, Star, Download } from 'lucide-react';
import {
  AdminPageHeader,
  AdminRowCard,
  filterSelectClassName,
  ResponsiveTable,
} from '@/components/admin/list';
import { LoadGate, StatCardSkeleton } from '@/components/ui-states';
import { noteQueryFail } from '@/lib/queryState';
import { supabase } from '@/lib/supabase';

interface SalesData {
  totalOrders: number;
  totalUnits: number;
  conversionRate: number;
  topProducts: Array<{ name: string; units: number; revenue: number }>;
}

export default function SalesAnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);
  const [failed, setFailed] = useState(false);
  const [timeFilter, setTimeFilter] = useState<'7days' | '30days' | '90days'>('30days');
  const [salesData, setSalesData] = useState<SalesData | null>(null);

  useEffect(() => {
    fetchSalesData();
  }, [timeFilter]);

  const fetchSalesData = async () => {
    try {
      setLoading(true);
      setDenied(false);

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
            ...(await authHeaders()),
            'Content-Type': 'application/json',
          },
        });

        if (isAccessDeniedStatus(response.status)) {
          throw new Error(ADMIN_DATA_DENIED);
        }

        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data) {
            // Filter by date range and payment status (only paid orders - actual purchases)
            const filteredOrders = (result.data || []).filter((order: any) => {
              const orderDate = new Date(order.created_at);
              return orderDate >= startDate && 
                     order.payment_status === 'paid';
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
        if (apiError instanceof Error && apiError.message === ADMIN_DATA_DENIED) throw apiError;
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
            .eq('payment_status', 'paid') // Only count paid orders (actual purchases)
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
                      ...(await authHeaders()),
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
      setFailed(false);
    } catch (error) {
      console.error('Error fetching sales data:', error);
      const kind = noteQueryFail(error);
      if (kind === 'forbidden' || (error instanceof Error && error.message === ADMIN_DATA_DENIED)) {
        setDenied(true);
      } else if (kind !== 'unauthorized') {
        setFailed(true);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-w-0 space-y-6">
      <AdminPageHeader
        title="Sales"
        subtitle="Monitor sales performance and trends"
        secondary={[{ label: 'Export report', icon: <Download size={16} /> }]}
        extra={
          <select
            value={timeFilter}
            onChange={(e) => setTimeFilter(e.target.value as any)}
            className={filterSelectClassName()}
          >
            <option value="7days">Last 7 days</option>
            <option value="30days">Last 30 days</option>
            <option value="90days">Last 90 days</option>
          </select>
        }
      />

      <LoadGate
        loaded={Boolean(salesData)}
        loading={loading || !salesData}
        error={failed}
        forbidden={denied}
        isEmpty={false}
        onRetry={() => void fetchSalesData()}
        skeleton={<StatCardSkeleton count={4} />}
        emptyTitle="No sales yet"
        emptyDescription="Paid orders will show up here."
        denyHome="/admin"
      >
        {salesData ? (
          <>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl shadow-sm p-6 border-2 border-blue-200">
          <div className="flex items-center gap-3 mb-4">
            <ShoppingBag className="text-blue-600" size={32} />
          </div>
          <p className="text-sm text-blue-700 mb-1">Total orders</p>
          <p className="text-3xl font-bold text-blue-900">{salesData.totalOrders}</p>
          <p className="text-sm text-blue-700 mt-2">Completed transactions</p>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl shadow-sm p-6 border-2 border-purple-200">
          <div className="flex items-center gap-3 mb-4">
            <Package className="text-purple-600" size={32} />
          </div>
          <p className="text-sm text-purple-700 mb-1">Units sold</p>
          <p className="text-3xl font-bold text-purple-900">{salesData.totalUnits}</p>
          <p className="text-sm text-purple-700 mt-2">Individual products</p>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl shadow-sm p-6 border-2 border-orange-200">
          <div className="flex items-center gap-3 mb-4">
            <TrendingUp className="text-orange-600" size={32} />
          </div>
          <p className="text-sm text-orange-700 mb-1">Conversion rate</p>
          <p className="text-3xl font-bold text-orange-900">{salesData.conversionRate}%</p>
          <p className="text-sm text-orange-700 mt-2">Visitors to buyers</p>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="border-b border-gray-200 p-6">
          <h2 className="text-lg font-bold text-[#1A1A1A]">Top selling products</h2>
        </div>
        {salesData.topProducts.length === 0 ? (
          <p className="px-6 py-12 text-center text-[#3A3A3A]">No products sold yet</p>
        ) : (
          <div className="p-4 md:p-0">
            <ResponsiveTable
              headers={
                <tr>
                  <th className="px-4 py-3">Rank</th>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">Units sold</th>
                  <th className="px-4 py-3">Revenue</th>
                  <th className="px-4 py-3">Performance</th>
                </tr>
              }
              cards={salesData.topProducts.map((product, index) => {
                const maxUnits = Math.max(...salesData.topProducts.map((p) => p.units), 1);
                const performance = maxUnits > 0 ? (product.units / maxUnits) * 100 : 0;
                return (
                  <AdminRowCard
                    key={product.name}
                    name={product.name}
                    status={index === 0 ? <Star size={16} className="text-yellow-500 fill-yellow-500" /> : <span className="text-sm text-[#3A3A3A]">#{index + 1}</span>}
                    facts={[
                      { label: 'Units', value: `${product.units} units` },
                      { label: 'Revenue', value: `GHS ${product.revenue.toLocaleString()}` },
                      { label: 'Performance', value: `${Math.round(performance)}%` },
                    ]}
                  />
                );
              })}
            >
              {salesData.topProducts.map((product, index) => {
                const maxUnits = Math.max(...salesData.topProducts.map((p) => p.units), 1);
                const performance = maxUnits > 0 ? (product.units / maxUnits) * 100 : 0;
                return (
                  <tr key={product.name} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {index === 0 && <Star size={16} className="text-yellow-500 fill-yellow-500" />}
                        <span className="font-bold text-[#1A1A1A]">#{index + 1}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-semibold text-[#1A1A1A]">{product.name}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-bold text-[#3A3A3A]">{product.units} units</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-bold text-[#FF7A19]">
                        GHS {product.revenue.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-2 max-w-[120px] flex-1 overflow-hidden rounded-full bg-gray-200">
                          <div
                            className="h-full rounded-full bg-[#FF7A19]"
                            style={{ width: `${performance}%` }}
                          ></div>
                        </div>
                        <span className="text-sm text-[#3A3A3A]">{Math.round(performance)}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </ResponsiveTable>
          </div>
        )}
      </div>

      {salesData.topProducts.length > 0 && (
        <div className="rounded-xl border-2 border-green-200 bg-gradient-to-br from-green-50 to-green-100 p-6">
          <h3 className="mb-3 font-bold text-green-900">Sales insights</h3>
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
          </>
        ) : null}
      </LoadGate>
    </div>
  );
}



