'use client';

import { useState, useEffect } from 'react';
import {
  ShoppingCart,
  Mail,
  Search,
  AlertCircle,
  TrendingDown,
  DollarSign,
  Clock,
  MessageSquare,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { supabase } from '@/lib/supabase';

interface AbandonedCart {
  id: string;
  customer_name: string;
  customer_email: string;
  items_count: number;
  cart_value: number;
  abandoned_at: string;
  time_elapsed: string;
  products: string[];
  recovery_sent: boolean;
}

export default function CartAnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [carts, setCarts] = useState<AbandonedCart[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchAbandonedCarts();
  }, []);

  const fetchAbandonedCarts = async () => {
    try {
      setLoading(true);
      
      // Fetch pending orders older than 24 hours (abandoned carts)
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      
      const { data: abandonedOrders, error: ordersError } = await supabase
        .from('orders')
        .select(`
          id,
          total,
          created_at,
          order_items(*),
          user:users!orders_user_id_fkey(first_name, last_name, email)
        `)
        .eq('status', 'pending')
        .lt('created_at', twentyFourHoursAgo)
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;

      const formattedCarts: AbandonedCart[] = (abandonedOrders || []).map(order => {
        const userName = order.user 
          ? `${order.user.first_name || ''} ${order.user.last_name || ''}`.trim() || 'Unknown'
          : 'Guest';
        
        const items = order.order_items || [];
        const products = items.map((item: any) => item.product_name || 'Unknown Product');
        const itemsCount = items.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0);
        
        const abandonedDate = new Date(order.created_at);
        const now = new Date();
        const diffHours = Math.floor((now.getTime() - abandonedDate.getTime()) / (1000 * 60 * 60));
        const diffDays = Math.floor(diffHours / 24);
        
        let timeElapsed = '';
        if (diffHours < 24) timeElapsed = `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
        else if (diffDays === 1) timeElapsed = '1 day ago';
        else timeElapsed = `${diffDays} days ago`;

        return {
          id: order.id,
          customer_name: userName,
          customer_email: order.user?.email || 'No email',
          items_count: itemsCount,
          cart_value: parseFloat(order.total) || 0,
          abandoned_at: order.created_at,
          time_elapsed: timeElapsed,
          products,
          recovery_sent: false, // This would need to be tracked in the database
        };
      });

      setCarts(formattedCarts);
    } catch (error) {
      console.error('Error fetching abandoned carts:', error);
      setCarts([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredCarts = carts.filter(
    (cart) =>
      cart.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cart.customer_email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalCarts = filteredCarts.length;
  const totalValue = filteredCarts.reduce((sum, c) => sum + c.cart_value, 0);
  const recoveryRate = Math.round(
    (filteredCarts.filter((c) => c.recovery_sent).length / totalCarts) * 100
  );

  const sendRecoveryEmail = (cartId: string) => {
    // TODO: Implement email sending
    setCarts(
      carts.map((cart) =>
        cart.id === cartId ? { ...cart, recovery_sent: true } : cart
      )
    );
    alert(`Recovery email sent for cart ${cartId}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF7A19] mx-auto mb-4"></div>
          <p className="text-[#3A3A3A]">Loading cart analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl shadow-sm p-6 border-2 border-yellow-200">
          <div className="flex items-center gap-3 mb-4">
            <ShoppingCart className="text-yellow-600" size={32} />
          </div>
          <p className="text-sm text-yellow-700 mb-1">Abandoned Carts</p>
          <p className="text-3xl font-bold text-yellow-900">{totalCarts}</p>
        </div>
        <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl shadow-sm p-6 border-2 border-red-200">
          <div className="flex items-center gap-3 mb-4">
            <DollarSign className="text-red-600" size={32} />
          </div>
          <p className="text-sm text-red-700 mb-1">Lost Revenue</p>
          <p className="text-3xl font-bold text-red-900">
            GHS {totalValue.toLocaleString()}
          </p>
        </div>
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl shadow-sm p-6 border-2 border-blue-200">
          <div className="flex items-center gap-3 mb-4">
            <Mail className="text-blue-600" size={32} />
          </div>
          <p className="text-sm text-blue-700 mb-1">Recovery Emails Sent</p>
          <p className="text-3xl font-bold text-blue-900">
            {filteredCarts.filter((c) => c.recovery_sent).length}
          </p>
        </div>
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl shadow-sm p-6 border-2 border-green-200">
          <div className="flex items-center gap-3 mb-4">
            <TrendingDown className="text-green-600" size={32} />
          </div>
          <p className="text-sm text-green-700 mb-1">Recovery Rate</p>
          <p className="text-3xl font-bold text-green-900">{recoveryRate}%</p>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-orange-50 border-2 border-orange-200 rounded-xl p-6">
        <div className="flex items-start gap-4">
          <AlertCircle className="text-orange-600 flex-shrink-0" size={24} />
          <div>
            <h3 className="font-bold text-orange-900 mb-2">Recover Lost Sales</h3>
            <p className="text-sm text-orange-700 mb-3">
              Send personalized recovery emails to customers who abandoned their carts. Offer a
              small discount (5-10%) to encourage them to complete their purchase within 24
              hours!
            </p>
            <div className="flex gap-2">
              <Button 
                variant="primary" 
                size="sm" 
                icon={<Mail size={16} />}
                disabled
                className="opacity-50 cursor-not-allowed"
              >
                Send Bulk Recovery Emails
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                icon={<MessageSquare size={16} />}
                disabled
                className="opacity-50 cursor-not-allowed"
              >
                Send Bulk Recovery SMS
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            size={20}
          />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF7A19]"
          />
        </div>
      </div>

      {/* Abandoned Carts List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-bold text-[#1A1A1A]">Abandoned Carts</h2>
        </div>
        <div className="divide-y divide-gray-200">
          {filteredCarts.length === 0 ? (
            <div className="p-12 text-center text-[#3A3A3A]">
              No abandoned carts found
            </div>
          ) : (
            filteredCarts.map((cart) => (
              <div key={cart.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-bold text-[#1A1A1A]">{cart.customer_name}</h3>
                      {cart.recovery_sent && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                          ✉️ Email Sent
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-[#3A3A3A] mb-2">{cart.customer_email}</p>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-[#3A3A3A]">
                        <strong>{cart.items_count}</strong> items
                      </span>
                      <span className="text-[#FF7A19] font-semibold text-lg">
                        GHS {cart.cart_value.toLocaleString()}
                      </span>
                      <span className="flex items-center gap-1 text-[#3A3A3A]">
                        <Clock size={14} />
                        {cart.time_elapsed}
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    icon={<Mail size={16} />}
                    onClick={() => sendRecoveryEmail(cart.id)}
                    disabled
                    className="opacity-50 cursor-not-allowed"
                  >
                    Send Recovery Email
                  </Button>
                </div>
                <div>
                  <p className="text-xs text-[#3A3A3A] mb-2 font-semibold">
                    Items in cart:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {cart.products.map((product, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-gray-100 rounded-full text-xs text-[#3A3A3A]"
                      >
                        {product}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}



