'use client';

import { ADMIN_DATA_DENIED, isAccessDeniedStatus } from '@/lib/access';
import { authHeaders } from '@/lib/authHeaders';
import { useState, useEffect } from 'react';
import {
  DollarSign,
  TrendingUp,
  Download,
} from 'lucide-react';
import {
  AdminPageHeader,
  filterSelectClassName,
} from '@/components/admin/list';
import { LoadGate, StatCardSkeleton } from '@/components/ui-states';
import { noteQueryFail } from '@/lib/queryState';
import { supabase } from '@/lib/supabase';

interface RevenueData {
  total: number;
  growth: number;
  transactions: number;
  averageOrder: number;
  byDay: Array<{ date: string; revenue: number }>;
  byCategory: Array<{ name: string; revenue: number; percentage: number }>;
}

export default function RevenueAnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);
  const [failed, setFailed] = useState(false);
  const [timeFilter, setTimeFilter] = useState<'7days' | '30days' | '90days' | 'year'>('30days');
  const [revenueData, setRevenueData] = useState<RevenueData | null>(null);

  useEffect(() => {
    fetchRevenueData();
  }, [timeFilter]);

  const fetchRevenueData = async () => {
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
        case 'year':
          startDate = new Date(now.getFullYear(), 0, 1);
          break;
        default:
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      }

      // Fetch revenue from orders table (source of truth for revenue)
      // Use backend API first to bypass RLS, then fallback to Supabase
      let orders: any[] = [];
      let total = 0;
      let transactionCount = 0;
      let averageOrder = 0;
      let apiDenied = false;

      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      
      // Try backend API first (bypasses RLS)
      try {
        const response = await fetch(`${API_URL}/api/orders`, {
          method: 'GET',
          headers: {
            ...(await authHeaders()),
            'Content-Type': 'application/json',
          },
        });

        if (isAccessDeniedStatus(response.status)) {
          apiDenied = true;
        } else if (response.ok) {
          const result = await response.json();
          if (result.success && result.data) {
            // Filter orders by date range and payment status (paid only)
            const filteredOrders = (result.data || []).filter((order: any) => {
              const orderDate = new Date(order.created_at);
              return orderDate >= startDate && order.payment_status === 'paid';
            });

            orders = filteredOrders.map((order: any) => ({
              total: parseFloat(order.total) || 0,
              created_at: order.created_at,
              order_items: order.order_items || [],
            }));

            total = orders.reduce((sum, order) => sum + order.total, 0);
            transactionCount = orders.length;
            averageOrder = transactionCount > 0 ? total / transactionCount : 0;
          }
        }
      } catch (apiError) {
        console.warn('Backend API failed, trying Supabase:', apiError);
      }

      // Fallback to Supabase if API didn't return data
      if (orders.length === 0) {
        const { data: ordersData, error: ordersError } = await supabase
          .from('orders')
          .select('total, created_at, order_items(*)')
          .eq('payment_status', 'paid')
          .gte('created_at', startDate.toISOString())
          .order('created_at', { ascending: true });

        if (ordersError) {
          console.error('Error fetching orders:', ordersError);
          throw ordersError;
        }

        orders = (ordersData || []).map((order: any) => ({
          total: parseFloat(order.total) || 0,
          created_at: order.created_at,
          order_items: order.order_items || [],
        }));

        // Calculate total revenue and transactions from orders
        total = orders.reduce((sum, order) => sum + order.total, 0);
        transactionCount = orders.length;
        averageOrder = transactionCount > 0 ? total / transactionCount : 0;
      }

      if (apiDenied && orders.length === 0) {
        throw new Error(ADMIN_DATA_DENIED);
      }

      // Calculate previous period for growth
      const periodDuration = now.getTime() - startDate.getTime();
      const previousStartDate = new Date(startDate.getTime() - periodDuration);
      const previousEndDate = startDate;

      // Fetch previous period orders for growth calculation
      let previousTotal = 0;
      
      // Try backend API first
      try {
        const response = await fetch(`${API_URL}/api/orders`, {
          method: 'GET',
          headers: {
            ...(await authHeaders()),
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data) {
            const previousPeriodOrders = (result.data || []).filter((order: any) => {
              const orderDate = new Date(order.created_at);
              return orderDate >= previousStartDate && 
                     orderDate < previousEndDate && 
                     order.payment_status === 'paid';
            });

            previousTotal = previousPeriodOrders.reduce((sum: number, order: any) => 
              sum + (parseFloat(order.total) || 0), 0
            );
          }
        }
      } catch (apiError) {
        console.warn('Backend API failed for previous period, trying Supabase:', apiError);
      }

      // Fallback to Supabase if API didn't return data
      if (previousTotal === 0) {
        const { data: previousOrders } = await supabase
          .from('orders')
          .select('total')
          .eq('payment_status', 'paid')
          .gte('created_at', previousStartDate.toISOString())
          .lt('created_at', previousEndDate.toISOString());

        previousTotal = previousOrders?.reduce((sum, order) => sum + (parseFloat(order.total) || 0), 0) || 0;
      }
      
      const growth = previousTotal > 0 ? ((total - previousTotal) / previousTotal) * 100 : 0;

      // Group by day
      const byDayMap: { [key: string]: number } = {};
      orders.forEach(order => {
        const date = new Date(order.created_at).toISOString().split('T')[0];
        byDayMap[date] = (byDayMap[date] || 0) + (parseFloat(order.total) || 0);
      });

      const byDay = Object.entries(byDayMap)
        .map(([date, revenue]) => ({ date, revenue }))
        .sort((a, b) => a.date.localeCompare(b.date));

      // Calculate revenue by category from order_items
      const categoryRevenue: { [key: string]: number } = {};
      
      // Fetch products with categories
      const productIds = [...new Set(orders?.flatMap(o => o.order_items?.map((item: any) => item.product_id).filter(Boolean) || []) || [])];
      
      let productsMap: { [key: string]: any } = {};
      if (productIds.length > 0) {
        const { data: products } = await supabase
          .from('products')
          .select('id, category_id, category:categories!products_category_id_fkey(name)')
          .in('id', productIds);

        productsMap = products?.reduce((acc, p) => {
          acc[p.id] = p;
          return acc;
        }, {} as any) || {};
      }

      orders.forEach(order => {
        order.order_items?.forEach((item: any) => {
          const product = productsMap[item.product_id];
          const categoryName = product?.category?.name || 'Uncategorized';
          const itemRevenue = (item.quantity || 0) * (parseFloat(item.unit_price) || 0);
          categoryRevenue[categoryName] = (categoryRevenue[categoryName] || 0) + itemRevenue;
        });
      });

      const totalCategoryRevenue = Object.values(categoryRevenue).reduce((sum: number, val: number) => sum + val, 0);
      const byCategory = Object.entries(categoryRevenue)
        .map(([name, revenue]) => ({
          name,
          revenue,
          percentage: totalCategoryRevenue > 0 ? (revenue / totalCategoryRevenue) * 100 : 0,
        }))
        .sort((a, b) => b.revenue - a.revenue);

      setRevenueData({
        total,
        growth: parseFloat(growth.toFixed(1)),
        transactions: transactionCount,
        averageOrder: parseFloat(averageOrder.toFixed(2)),
        byDay,
        byCategory,
      });
      setFailed(false);
    } catch (error) {
      console.error('Error fetching revenue data:', error);
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
        title="Revenue"
        subtitle="Track your sales revenue and growth"
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
            <option value="year">This year</option>
          </select>
        }
      />

      <LoadGate
        loaded={Boolean(revenueData)}
        loading={loading || !revenueData}
        error={failed}
        forbidden={denied}
        isEmpty={false}
        onRetry={() => void fetchRevenueData()}
        skeleton={<StatCardSkeleton count={4} />}
        emptyTitle="No revenue yet"
        emptyDescription="Paid orders will show up here."
        denyHome="/admin"
      >
        {revenueData ? (
          <>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl shadow-sm p-6 border-2 border-green-200">
          <div className="flex items-center gap-3 mb-4">
            <DollarSign className="text-green-600" size={32} />
          </div>
          <p className="text-sm text-green-700 mb-1">Total revenue</p>
          <p className="text-3xl font-bold text-green-900">
            GHS {revenueData.total.toLocaleString()}
          </p>
          <div className="flex items-center gap-1 mt-2 text-sm text-green-700">
            <TrendingUp size={14} />
            <span>+{revenueData.growth}% vs last period</span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <p className="text-sm text-[#3A3A3A] mb-1">Total transactions</p>
          <p className="text-3xl font-bold text-[#1A1A1A]">
            {revenueData.transactions}
          </p>
          <p className="text-sm text-[#3A3A3A] mt-2">Completed orders</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <p className="text-sm text-[#3A3A3A] mb-1">Average order value</p>
          <p className="text-3xl font-bold text-[#FF7A19]">
            GHS {revenueData.averageOrder}
          </p>
          <p className="text-sm text-[#3A3A3A] mt-2">Per transaction</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <p className="text-sm text-[#3A3A3A] mb-1">Growth rate</p>
          <p className="text-3xl font-bold text-green-600">+{revenueData.growth}%</p>
          <p className="text-sm text-[#3A3A3A] mt-2">Month over month</p>
        </div>
      </div>

      {/* Revenue Chart Placeholder */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="mb-6 text-lg font-bold text-[#1A1A1A]">Revenue trend</h2>
        <div className="h-64 flex items-end justify-between gap-2">
          {revenueData.byDay.map((day, index) => {
            const maxRevenue = Math.max(...revenueData.byDay.map((d) => d.revenue));
            const height = (day.revenue / maxRevenue) * 100;
            return (
              <div key={index} className="flex-1 flex flex-col items-center gap-2">
                <div className="w-full flex flex-col justify-end" style={{ height: '200px' }}>
                  <div
                    className="w-full bg-[#FF7A19] rounded-t-lg hover:bg-[#FF8A29] transition-colors cursor-pointer"
                    style={{ height: `${height}%` }}
                    title={`GHS ${day.revenue}`}
                  ></div>
                </div>
                <span className="text-xs text-[#3A3A3A]">
                  {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Revenue by Category */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="mb-6 text-lg font-bold text-[#1A1A1A]">Revenue by category</h2>
        <div className="space-y-4">
          {revenueData.byCategory.map((category, index) => (
            <div key={index}>
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-[#1A1A1A]">{category.name}</span>
                <div className="text-right">
                  <span className="font-bold text-[#1A1A1A]">
                    GHS {category.revenue.toLocaleString()}
                  </span>
                  <span className="text-sm text-[#3A3A3A] ml-2">
                    ({category.percentage}%)
                  </span>
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-[#FF7A19] h-full rounded-full transition-all duration-500"
                  style={{ width: `${category.percentage}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>
          </>
        ) : null}
      </LoadGate>
    </div>
  );
}



