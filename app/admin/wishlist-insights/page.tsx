'use client';

import { useState, useEffect } from 'react';
import {
  Heart,
  Mail,
  Search,
  TrendingUp,
  Package,
  DollarSign,
  MessageSquare,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { supabase } from '@/lib/supabase';

interface WishlistUser {
  id: string;
  name: string;
  email: string;
  items_count: number;
  total_value: number;
  added_date: string;
  last_active: string;
  products: string[];
}

export default function WishlistInsightsPage() {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<WishlistUser[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch real data from Supabase
  useEffect(() => {
    fetchWishlistData();
  }, []);

  const fetchWishlistData = async () => {
    setLoading(true);
    try {
      // Fetch wishlists with user and product data
      const { data, error } = await supabase
        .from('wishlists')
        .select(`
          *,
          user:users!wishlists_user_id_fkey(id, first_name, last_name, email, created_at)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch products separately for wishlist items
      const productIds = [...new Set(data?.map(item => item.product_id).filter(Boolean) || [])];
      
      let productsMap: { [key: string]: any } = {};
      if (productIds.length > 0) {
        const { data: productsData, error: productsError } = await supabase
          .from('products')
          .select('id, name, price, discount_price')
          .in('id', productIds);

        if (productsError) throw productsError;
        productsMap = productsData?.reduce((acc, p) => {
          acc[p.id] = p;
          return acc;
        }, {} as any) || {};
      }

      // Group by user and calculate stats
      const userMap = new Map();
      
      data?.forEach((item: any) => {
        const userId = item.user_id;
        const product = productsMap[item.product_id];
        
        if (!userMap.has(userId)) {
          userMap.set(userId, {
            id: userId,
            name: `${item.user?.first_name || ''} ${item.user?.last_name || ''}`.trim() || 'Unknown User',
            email: item.user?.email || 'No email',
            items_count: 0,
            total_value: 0,
            added_date: item.created_at,
            last_active: item.user?.created_at || item.created_at,
            products: [],
          });
        }
        
        const userData = userMap.get(userId);
        userData.items_count += 1;
        const productPrice = product?.discount_price || product?.price || 0;
        userData.total_value += parseFloat(productPrice) || 0;
        userData.products.push(product?.name || 'Unknown Product');
      });

      const usersArray = Array.from(userMap.values());
      setUsers(usersArray);
    } catch (error) {
      console.error('Error fetching wishlist data:', error);
      // Fallback to empty array
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(
    (user) =>
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalUsers = filteredUsers.length;
  const totalItems = filteredUsers.reduce((sum, u) => sum + u.items_count, 0);
  const totalValue = filteredUsers.reduce((sum, u) => sum + u.total_value, 0);

  const sendReminderEmail = (userId: string) => {
    // TODO: Implement email sending
    alert(`Sending reminder email to user ${userId}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF7A19] mx-auto mb-4"></div>
          <p className="text-[#3A3A3A]">Loading wishlist insights...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-pink-50 to-pink-100 rounded-xl shadow-sm p-6 border-2 border-pink-200">
          <div className="flex items-center gap-3 mb-4">
            <Heart className="text-pink-600" size={32} />
          </div>
          <p className="text-sm text-pink-700 mb-1">Users with Wishlists</p>
          <p className="text-3xl font-bold text-pink-900">{totalUsers}</p>
        </div>
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl shadow-sm p-6 border-2 border-purple-200">
          <div className="flex items-center gap-3 mb-4">
            <Package className="text-purple-600" size={32} />
          </div>
          <p className="text-sm text-purple-700 mb-1">Total Wishlist Items</p>
          <p className="text-3xl font-bold text-purple-900">{totalItems}</p>
        </div>
        <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl shadow-sm p-6 border-2 border-orange-200">
          <div className="flex items-center gap-3 mb-4">
            <DollarSign className="text-orange-600" size={32} />
          </div>
          <p className="text-sm text-orange-700 mb-1">Potential Revenue</p>
          <p className="text-3xl font-bold text-orange-900">
            GHS {totalValue.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6">
        <div className="flex items-start gap-4">
          <TrendingUp className="text-blue-600 flex-shrink-0" size={24} />
          <div>
            <h3 className="font-bold text-blue-900 mb-2">Convert Wishlist to Sales</h3>
            <p className="text-sm text-blue-700 mb-3">
              These users have shown interest but haven't purchased yet. Send them a reminder
              email with a special discount code to encourage conversion!
            </p>
            <div className="flex gap-2">
              <Button 
                variant="primary" 
                size="sm" 
                icon={<Mail size={16} />}
                disabled
                className="opacity-50 cursor-not-allowed"
              >
                Send Bulk Reminder Emails
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                icon={<MessageSquare size={16} />}
                disabled
                className="opacity-50 cursor-not-allowed"
              >
                Send Bulk Reminder SMS
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

      {/* Users List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-bold text-[#1A1A1A]">
            Users with Wishlist Items
          </h2>
        </div>
        <div className="divide-y divide-gray-200">
          {filteredUsers.length === 0 ? (
            <div className="p-12 text-center text-[#3A3A3A]">
              No users with wishlist items found
            </div>
          ) : (
            filteredUsers.map((user) => (
              <div key={user.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="font-bold text-[#1A1A1A] mb-1">{user.name}</h3>
                    <p className="text-sm text-[#3A3A3A] mb-2">{user.email}</p>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-[#3A3A3A]">
                        <strong>{user.items_count}</strong> items
                      </span>
                      <span className="text-[#FF7A19] font-semibold">
                        GHS {user.total_value.toLocaleString()}
                      </span>
                      <span className="text-[#3A3A3A]">
                        Added: {new Date(user.added_date).toLocaleDateString()}
                      </span>
                      <span className="text-[#3A3A3A]">
                        Last active: {new Date(user.last_active).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    icon={<Mail size={16} />}
                    onClick={() => sendReminderEmail(user.id)}
                    disabled
                    className="opacity-50 cursor-not-allowed"
                  >
                    Send Reminder
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {user.products.map((product, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-gray-100 rounded-full text-xs text-[#3A3A3A]"
                    >
                      {product}
                    </span>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}


