'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  DollarSign,
  ShoppingCart,
  Users,
  Package,
  TrendingUp,
  TrendingDown,
  Heart,
  AlertCircle,
  Eye,
  CreditCard,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

interface DashboardStats {
  totalRevenue: number;
  totalOrders: number;
  totalCustomers: number;
  totalProducts: number;
  revenueChange: number;
  ordersChange: number;
  customersChange: number;
  averageOrderValue: number;
}

interface RecentTransaction {
  id: string;
  customer: string;
  amount: number;
  status: 'completed' | 'pending' | 'failed';
  date: string;
}

interface TopProduct {
  name: string;
  sales: number;
  revenue: number;
}

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    totalRevenue: 0,
    totalOrders: 0,
    totalCustomers: 0,
    totalProducts: 0,
    revenueChange: 0,
    ordersChange: 0,
    customersChange: 0,
    averageOrderValue: 0,
  });
  const [recentTransactions, setRecentTransactions] = useState<RecentTransaction[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [insights, setInsights] = useState({
    wishlistUsers: 0,
    abandonedCarts: 0,
    lowStockProducts: 0,
    pendingOrders: 0,
  });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Calculate date ranges for comparison
      const now = new Date();
      const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

      // Fetch total revenue (from paid orders)
      const { data: paidOrders, error: revenueError } = await supabase
        .from('orders')
        .select('total, created_at')
        .eq('payment_status', 'paid');

      if (revenueError) throw revenueError;

      const totalRevenue = paidOrders?.reduce((sum, order) => sum + (parseFloat(order.total) || 0), 0) || 0;
      
      // Calculate current month vs last month revenue
      const currentMonthRevenue = paidOrders?.filter(order => {
        const orderDate = new Date(order.created_at);
        return orderDate >= currentMonthStart;
      }).reduce((sum, order) => sum + (parseFloat(order.total) || 0), 0) || 0;

      const lastMonthRevenue = paidOrders?.filter(order => {
        const orderDate = new Date(order.created_at);
        return orderDate >= lastMonthStart && orderDate <= lastMonthEnd;
      }).reduce((sum, order) => sum + (parseFloat(order.total) || 0), 0) || 0;

      const revenueChange = lastMonthRevenue > 0 
        ? ((currentMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 
        : 0;

      // Fetch total orders
      const { count: totalOrdersCount, error: ordersError } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true });

      if (ordersError) throw ordersError;

      // Calculate current month vs last month orders
      const { data: allOrders, error: allOrdersError } = await supabase
        .from('orders')
        .select('created_at');

      if (allOrdersError) throw allOrdersError;

      const currentMonthOrders = allOrders?.filter(order => {
        const orderDate = new Date(order.created_at);
        return orderDate >= currentMonthStart;
      }).length || 0;

      const lastMonthOrders = allOrders?.filter(order => {
        const orderDate = new Date(order.created_at);
        return orderDate >= lastMonthStart && orderDate <= lastMonthEnd;
      }).length || 0;

      const ordersChange = lastMonthOrders > 0 
        ? ((currentMonthOrders - lastMonthOrders) / lastMonthOrders) * 100 
        : 0;

      // Fetch total customers
      const { count: totalCustomersCount, error: customersError } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'customer');

      if (customersError) throw customersError;

      // Calculate current month vs last month customers
      const { data: allCustomers, error: allCustomersError } = await supabase
        .from('users')
        .select('created_at')
        .eq('role', 'customer');

      if (allCustomersError) throw allCustomersError;

      const currentMonthCustomers = allCustomers?.filter(user => {
        const userDate = new Date(user.created_at);
        return userDate >= currentMonthStart;
      }).length || 0;

      const lastMonthCustomers = allCustomers?.filter(user => {
        const userDate = new Date(user.created_at);
        return userDate >= lastMonthStart && userDate <= lastMonthEnd;
      }).length || 0;

      const customersChange = lastMonthCustomers > 0 
        ? ((currentMonthCustomers - lastMonthCustomers) / lastMonthCustomers) * 100 
        : 0;

      // Fetch total products
      const { count: totalProductsCount, error: productsError } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true });

      if (productsError) throw productsError;

      // Calculate average order value
      const averageOrderValue = totalOrdersCount && totalOrdersCount > 0 
        ? totalRevenue / totalOrdersCount 
        : 0;

      // Update stats
      setStats({
        totalRevenue,
        totalOrders: totalOrdersCount || 0,
        totalCustomers: totalCustomersCount || 0,
        totalProducts: totalProductsCount || 0,
        revenueChange: parseFloat(revenueChange.toFixed(1)),
        ordersChange: parseFloat(ordersChange.toFixed(1)),
        customersChange: parseFloat(customersChange.toFixed(1)),
        averageOrderValue: parseFloat(averageOrderValue.toFixed(2)),
      });

      // Fetch recent transactions (recent orders)
      const { data: recentOrders, error: recentOrdersError } = await supabase
        .from('orders')
        .select(`
          id,
          total,
          status,
          payment_status,
          created_at,
          user:users!orders_user_id_fkey(first_name, last_name)
        `)
        .order('created_at', { ascending: false })
        .limit(5);

      if (recentOrdersError) throw recentOrdersError;

      const formattedTransactions: RecentTransaction[] = (recentOrders || []).map(order => {
        const userName = order.user 
          ? ((order.user as any).full_name || `${(order.user as any).first_name || ''} ${(order.user as any).last_name || ''}`.trim() || 'Unknown')
          : 'Guest';
        
        const orderDate = new Date(order.created_at);
        const now = new Date();
        const diffHours = Math.floor((now.getTime() - orderDate.getTime()) / (1000 * 60 * 60));
        const diffDays = Math.floor(diffHours / 24);
        
        let dateString = '';
        if (diffHours < 1) dateString = 'Just now';
        else if (diffHours < 24) dateString = `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
        else if (diffDays === 1) dateString = '1 day ago';
        else dateString = `${diffDays} days ago`;

        return {
          id: order.id,
          customer: userName,
          amount: parseFloat(order.total) || 0,
          status: order.payment_status === 'paid' ? 'completed' : order.payment_status === 'pending' ? 'pending' : 'failed',
          date: dateString,
        };
      });

      setRecentTransactions(formattedTransactions);

      // Fetch top products by revenue
      // First, get all paid orders
      const { data: paidOrderIds, error: paidOrdersError } = await supabase
        .from('orders')
        .select('id')
        .eq('payment_status', 'paid');

      if (paidOrdersError) throw paidOrdersError;

      const paidOrderIdsArray = paidOrderIds?.map(o => o.id) || [];

      // Then get order items for paid orders
      const { data: orderItems, error: orderItemsError } = paidOrderIdsArray.length > 0
        ? await supabase
            .from('order_items')
            .select('product_name, quantity, unit_price')
            .in('order_id', paidOrderIdsArray)
        : { data: [], error: null };

      if (orderItemsError) throw orderItemsError;

      // Calculate product revenue
      const productRevenue: { [key: string]: { sales: number; revenue: number } } = {};
      
      (orderItems || []).forEach(item => {
        const productName = item.product_name;
        if (!productRevenue[productName]) {
          productRevenue[productName] = { sales: 0, revenue: 0 };
        }
        productRevenue[productName].sales += item.quantity || 0;
        productRevenue[productName].revenue += (item.quantity || 0) * (parseFloat(item.unit_price) || 0);
      });

      const topProductsList: TopProduct[] = Object.entries(productRevenue)
        .map(([name, data]) => ({
          name,
          sales: data.sales,
          revenue: data.revenue,
        }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 3);

      setTopProducts(topProductsList);

      // Fetch insights
      // Wishlist users count
      const { data: wishlistData, error: wishlistError } = await supabase
        .from('wishlists')
        .select('user_id', { count: 'exact' });

      if (wishlistError) throw wishlistError;
      
      const uniqueWishlistUsers = new Set(wishlistData?.map(w => w.user_id) || []).size;

      // Abandoned carts (carts in local storage - can't query directly, using a proxy: orders that were created but never completed)
      // For now, we'll use a simple approach: pending orders older than 24 hours
      const { count: abandonedCount, error: abandonedError } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending')
        .lt('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      if (abandonedError) throw abandonedError;

      // Low stock products (products with stock_quantity < 10)
      const { count: lowStockCount, error: lowStockError } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .lt('stock_quantity', 10)
        .eq('in_stock', true);

      if (lowStockError) throw lowStockError;

      // Pending orders
      const { count: pendingOrdersCount, error: pendingOrdersError } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      if (pendingOrdersError) throw pendingOrdersError;

      setInsights({
        wishlistUsers: uniqueWishlistUsers,
        abandonedCarts: abandonedCount || 0,
        lowStockProducts: lowStockCount || 0,
        pendingOrders: pendingOrdersCount || 0,
      });

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: 'Total Revenue',
      value: `GHS ${stats.totalRevenue.toLocaleString()}`,
      change: stats.revenueChange,
      icon: DollarSign,
      color: 'bg-green-500',
      bgColor: 'bg-green-50',
      textColor: 'text-green-600',
    },
    {
      title: 'Total Orders',
      value: stats.totalOrders.toLocaleString(),
      change: stats.ordersChange,
      icon: ShoppingCart,
      color: 'bg-blue-500',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-600',
    },
    {
      title: 'Total Customers',
      value: stats.totalCustomers.toLocaleString(),
      change: stats.customersChange,
      icon: Users,
      color: 'bg-purple-500',
      bgColor: 'bg-purple-50',
      textColor: 'text-purple-600',
    },
    {
      title: 'Avg Order Value',
      value: `GHS ${stats.averageOrderValue.toFixed(2)}`,
      change: 5.8,
      icon: CreditCard,
      color: 'bg-orange-500',
      bgColor: 'bg-orange-50',
      textColor: 'text-orange-600',
    },
  ];

  const insightCards = [
    {
      title: 'Wishlist But No Purchase',
      count: insights.wishlistUsers,
      subtitle: 'Users with items in wishlist',
      icon: Heart,
      color: 'text-pink-600',
      bgColor: 'bg-pink-50',
      link: '/admin/wishlist-insights',
    },
    {
      title: 'Abandoned Carts',
      count: insights.abandonedCarts,
      subtitle: 'Carts not completed',
      icon: ShoppingCart,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      link: '/admin/cart-analytics',
    },
    {
      title: 'Low Stock Products',
      count: insights.lowStockProducts,
      subtitle: 'Products below threshold',
      icon: AlertCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      link: '/admin/products?filter=low-stock',
    },
    {
      title: 'Pending Orders',
      count: insights.pendingOrders,
      subtitle: 'Awaiting processing',
      icon: Package,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      link: '/admin/orders?status=pending',
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF7A19] mx-auto mb-4"></div>
          <p className="text-[#3A3A3A]">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card) => (
          <div
            key={card.title}
            className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-4">
              <div className={`${card.bgColor} p-3 rounded-lg`}>
                <card.icon className={card.textColor} size={24} />
              </div>
              <div
                className={`flex items-center gap-1 text-sm font-semibold ${
                  card.change >= 0 ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {card.change >= 0 ? (
                  <TrendingUp size={16} />
                ) : (
                  <TrendingDown size={16} />
                )}
                {Math.abs(card.change)}%
              </div>
            </div>
            <p className="text-[#3A3A3A] text-sm mb-1">{card.title}</p>
            <p className="text-2xl font-bold text-[#1A1A1A]">{card.value}</p>
            <p className="text-xs text-[#3A3A3A] mt-2">vs last month</p>
          </div>
        ))}
      </div>

      {/* Insights Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {insightCards.map((card) => (
          <Link
            key={card.title}
            href={card.link}
            className={`${card.bgColor} rounded-xl p-6 border-2 border-transparent hover:border-[#FF7A19] transition-all cursor-pointer`}
          >
            <div className="flex items-start justify-between mb-3">
              <card.icon className={card.color} size={32} />
              <Eye size={16} className="text-gray-400" />
            </div>
            <p className="text-3xl font-bold text-[#1A1A1A] mb-1">{card.count}</p>
            <p className="text-sm font-semibold text-[#1A1A1A] mb-1">{card.title}</p>
            <p className="text-xs text-[#3A3A3A]">{card.subtitle}</p>
          </Link>
        ))}
      </div>

      {/* Recent Transactions & Top Products */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Transactions */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-bold text-[#1A1A1A]">Recent Transactions</h2>
            <a
              href="/admin/transactions"
              className="text-sm text-[#FF7A19] hover:underline font-medium"
            >
              View All →
            </a>
          </div>
          <div className="divide-y divide-gray-200">
            {recentTransactions.length > 0 ? (
              recentTransactions.map((transaction) => (
              <div key={transaction.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-semibold text-[#1A1A1A]">{transaction.customer}</p>
                  <p className="font-bold text-[#1A1A1A]">
                    GHS {transaction.amount.toFixed(2)}
                  </p>
                </div>
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      transaction.status === 'completed'
                        ? 'bg-green-100 text-green-700'
                        : transaction.status === 'pending'
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {transaction.status}
                  </span>
                  <span className="text-xs text-[#3A3A3A]">{transaction.date}</span>
                </div>
              </div>
              ))
            ) : (
              <div className="p-6 text-center text-[#3A3A3A]">
                No recent transactions
              </div>
            )}
          </div>
        </div>

        {/* Top Products */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-bold text-[#1A1A1A]">Top Products</h2>
            <a
              href="/admin/products"
              className="text-sm text-[#FF7A19] hover:underline font-medium"
            >
              View All →
            </a>
          </div>
          <div className="divide-y divide-gray-200">
            {topProducts.length > 0 ? (
              topProducts.map((product, index) => {
                const maxSales = Math.max(...topProducts.map(p => p.sales), 1);
                return (
              <div key={index} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <p className="font-semibold text-[#1A1A1A] mb-1">{product.name}</p>
                    <p className="text-sm text-[#3A3A3A]">{product.sales} units sold</p>
                  </div>
                  <p className="font-bold text-[#FF7A19]">
                    GHS {product.revenue.toLocaleString()}
                  </p>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-3">
                  <div
                    className="bg-[#FF7A19] h-2 rounded-full"
                        style={{ width: `${(product.sales / maxSales) * 100}%` }}
                  ></div>
                </div>
                  </div>
                );
              })
            ) : (
              <div className="p-6 text-center text-[#3A3A3A]">
                No products sold yet
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
