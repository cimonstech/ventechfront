'use client';

import { useState, useEffect } from 'react';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Calendar,
  Download,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

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
  const [timeFilter, setTimeFilter] = useState<'7days' | '30days' | '90days' | 'year'>('30days');
  const [revenueData, setRevenueData] = useState<RevenueData>({
    total: 0,
    growth: 0,
    transactions: 0,
    averageOrder: 0,
    byDay: [],
    byCategory: [],
  });

  useEffect(() => {
    fetchRevenueData();
  }, [timeFilter]);

  const fetchRevenueData = async () => {
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
        case 'year':
          startDate = new Date(now.getFullYear(), 0, 1);
          break;
        default:
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      }

      // Fetch paid transactions in date range (use transactions table as source of truth)
      // This ensures we capture all revenue from transactions, including those that might not be linked to orders
      let orders: any[] = [];
      let total = 0;
      let transactionCount = 0;
      let averageOrder = 0;

      const { data: transactions, error: transactionsError } = await supabase
        .from('transactions')
        .select('amount, payment_status, paid_at, created_at, order:orders!transactions_order_id_fkey(id, order_number, order_items(*))')
        .eq('payment_status', 'paid')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: true });

      if (transactionsError) {
        console.error('Error fetching transactions, falling back to orders:', transactionsError);
        // Fallback to orders if transactions fail
        const { data: ordersData, error: ordersError } = await supabase
          .from('orders')
          .select('total, created_at, order_items(*)')
          .eq('payment_status', 'paid')
          .gte('created_at', startDate.toISOString())
          .order('created_at', { ascending: true });

        if (ordersError) throw ordersError;

        orders = ordersData || [];
        // Calculate total revenue and transactions from orders
        total = orders.reduce((sum, order) => sum + (parseFloat(order.total) || 0), 0);
        transactionCount = orders.length;
        averageOrder = transactionCount > 0 ? total / transactionCount : 0;
      } else {
        // Calculate total revenue and transactions from transactions table
        transactionCount = transactions?.length || 0;
        total = transactions?.reduce((sum, tx) => sum + (parseFloat(tx.amount) || 0), 0) || 0;
        averageOrder = transactionCount > 0 ? total / transactionCount : 0;
        
        // Map transactions to orders format for compatibility with rest of code
        orders = transactions?.map((tx: any) => ({
          total: tx.amount,
          created_at: tx.paid_at || tx.created_at,
          order_items: tx.order?.order_items || [],
        })) || [];
      }

      // Calculate previous period for growth
      const previousStartDate = new Date(startDate.getTime() - (now.getTime() - startDate.getTime()));
      
      // Try to fetch previous period transactions
      const { data: previousTransactions } = await supabase
        .from('transactions')
        .select('amount, paid_at, created_at')
        .eq('payment_status', 'paid')
        .gte('created_at', previousStartDate.toISOString())
        .lt('created_at', startDate.toISOString());

      let previousTotal = 0;
      if (previousTransactions && previousTransactions.length > 0) {
        previousTotal = previousTransactions.reduce((sum, tx) => sum + (parseFloat(tx.amount) || 0), 0);
      } else {
        // Fallback to orders if transactions not available
        const { data: previousOrders } = await supabase
          .from('orders')
          .select('total')
          .eq('payment_status', 'paid')
          .gte('created_at', previousStartDate.toISOString())
          .lt('created_at', startDate.toISOString());

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
    } catch (error) {
      console.error('Error fetching revenue data:', error);
      toast.error('Failed to load revenue analytics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF7A19] mx-auto mb-4"></div>
          <p className="text-[#3A3A3A]">Loading revenue analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1A1A1A]">Revenue Analytics</h1>
          <p className="text-sm text-[#3A3A3A] mt-1">
            Track your sales revenue and growth
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
            <option value="year">This Year</option>
          </select>
          <Button variant="outline" icon={<Download size={18} />}>
            Export Report
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl shadow-sm p-6 border-2 border-green-200">
          <div className="flex items-center gap-3 mb-4">
            <DollarSign className="text-green-600" size={32} />
          </div>
          <p className="text-sm text-green-700 mb-1">Total Revenue</p>
          <p className="text-3xl font-bold text-green-900">
            GHS {revenueData.total.toLocaleString()}
          </p>
          <div className="flex items-center gap-1 mt-2 text-sm text-green-700">
            <TrendingUp size={14} />
            <span>+{revenueData.growth}% vs last period</span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <p className="text-sm text-[#3A3A3A] mb-1">Total Transactions</p>
          <p className="text-3xl font-bold text-[#1A1A1A]">
            {revenueData.transactions}
          </p>
          <p className="text-sm text-[#3A3A3A] mt-2">Completed orders</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <p className="text-sm text-[#3A3A3A] mb-1">Average Order Value</p>
          <p className="text-3xl font-bold text-[#FF7A19]">
            GHS {revenueData.averageOrder}
          </p>
          <p className="text-sm text-[#3A3A3A] mt-2">Per transaction</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <p className="text-sm text-[#3A3A3A] mb-1">Growth Rate</p>
          <p className="text-3xl font-bold text-green-600">+{revenueData.growth}%</p>
          <p className="text-sm text-[#3A3A3A] mt-2">Month over month</p>
        </div>
      </div>

      {/* Revenue Chart Placeholder */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-bold text-[#1A1A1A] mb-6">Revenue Trend</h2>
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
        <h2 className="text-lg font-bold text-[#1A1A1A] mb-6">Revenue by Category</h2>
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
    </div>
  );
}



