'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { 
  Package, 
  ShoppingCart, 
  Users, 
  DollarSign,
  TrendingUp,
  Eye
} from 'lucide-react';
import { useAppSelector } from '@/store';
import { hasAdminEntry, isAdminRole } from '@/lib/roles';
import { useAccess } from '@/context/AccessContext';
import { useRouter } from 'next/navigation';

export default function AdminDashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAppSelector((state) => state.auth);
  const { access } = useAccess();
  const showAnalytics = isAdminRole(access?.role || user?.role);

  useEffect(() => {
    // Redirect if not admin
    if (isAuthenticated && !hasAdminEntry(user?.role)) {
      router.push('/');
    }
  }, [isAuthenticated, user, router]);

  // Mock data - replace with real API calls
  const stats = [
    {
      title: 'Total Revenue',
      value: 'GHS 124,500',
      change: '+12.5%',
      icon: DollarSign,
      color: 'bg-green-500',
    },
    {
      title: 'Total Orders',
      value: '1,234',
      change: '+8.2%',
      icon: ShoppingCart,
      color: 'bg-blue-500',
    },
    {
      title: 'Total Products',
      value: '456',
      change: '+5.1%',
      icon: Package,
      color: 'bg-purple-500',
    },
    {
      title: 'Total Customers',
      value: '789',
      change: '+15.3%',
      icon: Users,
      color: 'bg-orange-500',
    },
  ];

  const recentOrders = [
    { id: '1', orderNumber: 'VT-2025-001', customer: 'John Doe', total: 1200, status: 'pending' },
    { id: '2', orderNumber: 'VT-2025-002', customer: 'Jane Smith', total: 850, status: 'processing' },
    { id: '3', orderNumber: 'VT-2025-003', customer: 'Bob Johnson', total: 2100, status: 'shipped' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Admin Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
              <p className="text-gray-600">Welcome back, {user?.full_name}</p>
            </div>
            <Link href="/">
              <Button variant="outline" size="sm">
                View Store
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Admin Content */}
      <div className="container mx-auto px-4 py-8">
        {showAnalytics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => (
            <div key={index} className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 ${stat.color} rounded-lg flex items-center justify-center`}>
                  <stat.icon className="text-white" size={24} />
                </div>
                <Badge variant="success" size="sm">
                  {stat.change}
                </Badge>
              </div>
              <p className="text-2xl font-bold text-gray-900 mb-1">{stat.value}</p>
              <p className="text-sm text-gray-600">{stat.title}</p>
            </div>
          ))}
        </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Orders */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Recent Orders</h2>
              <Link href="/admin/orders">
                <Button variant="outline" size="sm">
                  View All
                </Button>
              </Link>
            </div>

            <div className="space-y-4">
              {recentOrders.map((order) => (
                <div key={order.id} className="flex items-center justify-between p-4 border border-gray-100 rounded-lg">
                  <div>
                    <p className="font-semibold text-gray-900">{order.orderNumber}</p>
                    <p className="text-sm text-gray-600">{order.customer}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-900">GHS {order.total}</p>
                    <Badge
                      variant={
                        order.status === 'pending' ? 'warning' :
                        order.status === 'processing' ? 'info' :
                        'success'
                      }
                      size="sm"
                    >
                      {order.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Quick Actions</h2>

            <div className="grid grid-cols-2 gap-4">
              <Link href="/admin/products">
                <div className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 transition-colors cursor-pointer">
                  <Package className="text-blue-600 mb-2" size={32} />
                  <p className="font-semibold text-gray-900">Manage Products</p>
                </div>
              </Link>

              <Link href="/admin/orders">
                <div className="p-4 border-2 border-gray-200 rounded-lg hover:border-purple-500 transition-colors cursor-pointer">
                  <ShoppingCart className="text-purple-600 mb-2" size={32} />
                  <p className="font-semibold text-gray-900">View Orders</p>
                </div>
              </Link>

              <Link href="/admin/users">
                <div className="p-4 border-2 border-gray-200 rounded-lg hover:border-green-500 transition-colors cursor-pointer">
                  <Users className="text-green-600 mb-2" size={32} />
                  <p className="font-semibold text-gray-900">Manage Users</p>
                </div>
              </Link>

              <Link href="/admin/banners">
                <div className="p-4 border-2 border-gray-200 rounded-lg hover:border-orange-500 transition-colors cursor-pointer">
                  <Eye className="text-orange-600 mb-2" size={32} />
                  <p className="font-semibold text-gray-900">Manage Banners</p>
                </div>
              </Link>
            </div>
          </div>
        </div>

        {/* Sales Chart Placeholder */}
        <div className="bg-white rounded-xl shadow-sm p-6 mt-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Sales Overview</h2>
            <select className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option>Last 7 days</option>
              <option>Last 30 days</option>
              <option>Last 90 days</option>
            </select>
          </div>

          <div className="h-64 flex items-center justify-center border-2 border-dashed border-gray-200 rounded-lg">
            <div className="text-center">
              <TrendingUp className="mx-auto mb-2 text-gray-400" size={48} />
              <p className="text-gray-600">Sales chart will be displayed here</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}



