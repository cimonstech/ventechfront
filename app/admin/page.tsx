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

      if (revenueError) {
        console.error('Error fetching paid orders:', revenueError);
        // Continue with empty array - don't break the whole dashboard
      }

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

      // Fetch total orders - combine count and dates in one query
      const { data: allOrders, error: allOrdersError, count: totalOrdersCount } = await supabase
        .from('orders')
        .select('created_at', { count: 'exact' });

      if (allOrdersError) {
        console.error('Error fetching orders:', allOrdersError);
        // Continue with empty array - don't break the whole dashboard
      }

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

      // Fetch total customers - try multiple approaches
      let totalCustomersCount: number | null = null;
      let customersError: any = null;
      let allCustomers: any[] = [];
      
      // First, try to get count
      const { count, error: countError } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'customer');

      if (!countError) {
        totalCustomersCount = count;
      } else {
        customersError = countError;
        console.error('Error fetching customer count:', {
          error: countError,
          message: countError.message,
          code: countError.code,
          details: countError.details,
          hint: countError.hint,
        });
      }

      // Also try to fetch actual data (might work even if count doesn't due to RLS)
      const { data: customersData, error: dataError } = await supabase
        .from('users')
        .select('id, created_at, role, email')
        .eq('role', 'customer');

      if (!dataError && customersData) {
        allCustomers = customersData;
        // If we got data but count failed, use data length
        if (totalCustomersCount === null && allCustomers.length > 0) {
          totalCustomersCount = allCustomers.length;
        }
      } else if (dataError) {
        console.error('Error fetching customer data:', {
          error: dataError,
          message: dataError.message,
          code: dataError.code,
          details: dataError.details,
          hint: dataError.hint,
        });
        // If both failed, try fetching all users and filtering client-side
        const { data: allUsers, error: allUsersError } = await supabase
          .from('users')
          .select('id, created_at, role, email');
        
        if (!allUsersError && allUsers) {
          // Filter client-side
          allCustomers = allUsers.filter((u: any) => u.role === 'customer');
          if (allCustomers.length > 0) {
            totalCustomersCount = allCustomers.length;
          }
        }
      }

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
      // Use actual count from allCustomers array if available, otherwise use the count query result
      // Priority: allCustomers.length > totalCustomersCount > 0
      let actualCustomerCount = 0;
      if (allCustomers && allCustomers.length > 0) {
        // Use actual array length if we successfully fetched customers
        actualCustomerCount = allCustomers.length;
      } else if (totalCustomersCount !== null && totalCustomersCount !== undefined && totalCustomersCount > 0) {
        // Use count query result if available
        actualCustomerCount = totalCustomersCount;
      }
      
      // Log for debugging
      if (process.env.NODE_ENV === 'development') {
        console.log('Customer count calculation:', {
          allCustomersLength: allCustomers?.length,
          totalCustomersCount,
          customersError: customersError?.message,
          dataError: dataError?.message,
          actualCustomerCount,
          sampleCustomers: allCustomers?.slice(0, 2).map((c: any) => ({ id: c.id, email: c.email, role: c.role })),
        });
      }
      
      setStats({
        totalRevenue,
        totalOrders: totalOrdersCount || 0,
        totalCustomers: actualCustomerCount,
        totalProducts: totalProductsCount || 0,
        revenueChange: parseFloat(revenueChange.toFixed(1)),
        ordersChange: parseFloat(ordersChange.toFixed(1)),
        customersChange: parseFloat(customersChange.toFixed(1)),
        averageOrderValue: parseFloat(averageOrderValue.toFixed(2)),
      });

      // Fetch recent transactions (recent orders) - simplified query without join
      const { data: recentOrders, error: recentOrdersError } = await supabase
        .from('orders')
        .select('id, total, status, payment_status, created_at, user_id')
        .order('created_at', { ascending: false })
        .limit(5);

      if (recentOrdersError) {
        console.error('Error fetching recent orders:', recentOrdersError);
        setRecentTransactions([]);
      } else {
        // Fetch user names separately if needed
        const userIds = [...new Set((recentOrders || []).map(o => o.user_id).filter(Boolean))];
        let usersMap: { [key: string]: any } = {};
        
        if (userIds.length > 0) {
          const { data: users, error: usersError } = await supabase
            .from('users')
            .select('id, first_name, last_name')
            .in('id', userIds);
          
          if (!usersError && users) {
            usersMap = users.reduce((acc, u) => {
              acc[u.id] = u;
              return acc;
            }, {} as any);
          }
        }

      const formattedTransactions: RecentTransaction[] = (recentOrders || []).map(order => {
          const user = usersMap[order.user_id] || null;
          const userName = user 
            ? `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Unknown'
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
      }

      // Fetch top products by revenue - use backend API first to bypass RLS
      let orderItems: any[] = [];
      
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
            // Get only paid orders (actual purchases, not just placed orders)
            const allOrders = (result.data || []).filter((order: any) => 
              order.payment_status === 'paid'
            );

            // Extract order items from all orders
            allOrders.forEach((order: any) => {
              if (order.order_items && Array.isArray(order.order_items)) {
                orderItems.push(...order.order_items);
              }
            });

            // If we got items via API, skip Supabase query
            if (orderItems.length > 0) {
              console.log('Fetched order items via API:', orderItems.length);
            }
          }
        }
      } catch (apiError) {
        console.warn('Backend API failed, trying Supabase:', apiError);
      }

      // Fallback to Supabase if API didn't return data
      if (orderItems.length === 0) {
        // Try transactions first (source of truth for revenue)
        const { data: transactions, error: transactionsError } = await supabase
          .from('transactions')
          .select(`
            id,
            amount,
            order:orders!transactions_order_id_fkey(id, order_items(product_name, quantity, unit_price))
          `)
          .eq('payment_status', 'paid') // Only count paid transactions (actual purchases)
          .limit(1000); // Limit to prevent huge queries

        if (!transactionsError && transactions && transactions.length > 0) {
          // Extract order items from transactions
          transactions.forEach((tx: any) => {
            if (tx.order?.order_items && Array.isArray(tx.order.order_items)) {
              orderItems.push(...tx.order.order_items);
            }
          });
        } else {
          // Fallback to orders if transactions fail
          if (paidOrders && paidOrders.length > 0) {
            const paidOrderIdsArray = paidOrders.map((o: any) => o.id).filter(Boolean);
            
            if (paidOrderIdsArray.length > 0) {
              const { data: items, error: orderItemsError } = await supabase
                .from('order_items')
                .select('product_name, quantity, unit_price')
                .in('order_id', paidOrderIdsArray)
                .limit(1000); // Limit to prevent huge queries

              if (orderItemsError) {
                console.error('Error fetching order items:', orderItemsError);
              } else {
                orderItems = items || [];
              }
            }
          }
        }
      }

      // Calculate product revenue
      const productRevenue: { [key: string]: { sales: number; revenue: number } } = {};
      
      orderItems.forEach(item => {
        const productName = item.product_name;
        if (!productName) return; // Skip items without product name
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

      // Fetch insights - with error handling to prevent breaking the dashboard
      // Wishlist users count
      let uniqueWishlistUsers = 0;
      try {
      const { data: wishlistData, error: wishlistError } = await supabase
        .from('wishlists')
        .select('user_id', { count: 'exact' });

        if (!wishlistError && wishlistData) {
          uniqueWishlistUsers = new Set(wishlistData.map(w => w.user_id).filter(Boolean)).size;
        }
      } catch (error) {
        console.error('Error fetching wishlist users:', error);
      }

      // Abandoned carts - pending orders older than 24 hours
      let abandonedCount = 0;
      try {
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const { count, error: abandonedError } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending')
          .lt('created_at', twentyFourHoursAgo);

        if (!abandonedError) {
          abandonedCount = count || 0;
        }
      } catch (error) {
        console.error('Error fetching abandoned carts:', error);
      }

      // Low stock products
      let lowStockCount = 0;
      try {
        const { count, error: lowStockError } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .lt('stock_quantity', 10)
        .eq('in_stock', true);

        if (!lowStockError) {
          lowStockCount = count || 0;
        }
      } catch (error) {
        console.error('Error fetching low stock products:', error);
      }

      // Pending orders
      let pendingOrdersCount = 0;
      try {
        const { count, error: pendingOrdersError } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

        if (!pendingOrdersError) {
          pendingOrdersCount = count || 0;
        }
      } catch (error) {
        console.error('Error fetching pending orders:', error);
      }

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
