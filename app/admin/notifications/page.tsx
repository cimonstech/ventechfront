'use client';

import { useState, useEffect } from 'react';
import {
  Bell,
  ShoppingCart,
  Package,
  Users,
  AlertCircle,
  CheckCircle,
  Clock,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { AccessDenied, EmptyState, ErrorState, NoResults } from '@/components/ui-states';
import { noteQueryFail } from '@/lib/queryState';
import { supabase } from '@/lib/supabase';

interface Notification {
  id: string;
  type: 'order' | 'stock' | 'user' | 'alert' | 'success';
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  action_url?: string;
}

export default function NotificationsPage() {
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [forbidden, setForbidden] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  // Fetch real data from Supabase
  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNotifications(data || []);
      setLoaded(true);
      setFailed(false);
      setForbidden(false);
    } catch (error: any) {
      const kind = noteQueryFail(error);
      if (kind === 'forbidden') setForbidden(true);
      else if (kind !== 'unauthorized') setFailed(true);
    } finally {
      setLoading(false);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'order':
        return <ShoppingCart size={20} className="text-blue-600" />;
      case 'stock':
        return <Package size={20} className="text-orange-600" />;
      case 'user':
        return <Users size={20} className="text-purple-600" />;
      case 'alert':
        return <AlertCircle size={20} className="text-red-600" />;
      case 'success':
        return <CheckCircle size={20} className="text-green-600" />;
      default:
        return <Bell size={20} className="text-gray-600" />;
    }
  };

  const getBgColor = (type: string) => {
    switch (type) {
      case 'order':
        return 'bg-blue-50';
      case 'stock':
        return 'bg-orange-50';
      case 'user':
        return 'bg-purple-50';
      case 'alert':
        return 'bg-red-50';
      case 'success':
        return 'bg-green-50';
      default:
        return 'bg-gray-50';
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      // Only update is_read - read_at column may not exist in schema
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) {
        if (error.code === '42P01') return; // Table doesn't exist
        throw error;
      }

      // Update local state
      setNotifications(
        notifications.map((n) =>
          n.id === notificationId ? { ...n, is_read: true } : n
        )
      );
    } catch (error) {
      // Only log meaningful error messages
      if (process.env.NODE_ENV === 'development') {
        const errorObj = error as any;
        const errorMessage = errorObj?.message || errorObj?.details || errorObj?.hint || errorObj?.error_description || '';
        
        // Only log if we have a meaningful error message
        if (errorMessage && typeof errorMessage === 'string' && errorMessage.trim() !== '' && errorMessage !== '{}') {
          console.error('Error marking notification as read:', errorMessage);
        }
        // Don't log if error is empty or has no meaningful message
      }
    }
  };

  const markAllAsRead = async () => {
    try {
      const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
      if (unreadIds.length === 0) return;
      
      // Only update is_read - read_at column may not exist in schema
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .in('id', unreadIds);

      if (error) {
        // Check if it's a "table doesn't exist" or "column doesn't exist" error
        const errorMessage = error.message || '';
        if (
          error.code === '42P01' ||
          error.code === 'PGRST116' ||
          errorMessage.includes('does not exist') ||
          errorMessage.includes('schema cache') ||
          errorMessage.includes('column')
        ) {
          return; // Table or column doesn't exist - silently fail
        }
        throw error;
      }

      // Update local state
      setNotifications(notifications.map((n) => ({ ...n, is_read: true })));
    } catch (error) {
      // Only log meaningful error messages
      if (process.env.NODE_ENV === 'development') {
        const errorObj = error as any;
        const errorMessage = errorObj?.message || errorObj?.details || errorObj?.hint || errorObj?.error_description || '';
        
        // Only log if we have a meaningful error message
        if (errorMessage && typeof errorMessage === 'string' && errorMessage.trim() !== '' && errorMessage !== '{}') {
          console.error('Error marking all as read:', errorMessage);
        }
        // Don't log if error is empty or has no meaningful message
      }
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (error) {
        if (error.code === '42P01') return; // Table doesn't exist
        throw error;
      }

      // Update local state
      setNotifications(notifications.filter((n) => n.id !== notificationId));
    } catch (error) {
      // Only log meaningful error messages
      if (process.env.NODE_ENV === 'development') {
        const errorObj = error as any;
        const errorMessage = errorObj?.message || errorObj?.details || errorObj?.hint || errorObj?.error_description || '';
        
        // Only log if we have a meaningful error message
        if (errorMessage && typeof errorMessage === 'string' && errorMessage.trim() !== '' && errorMessage !== '{}') {
          console.error('Error deleting notification:', errorMessage);
        }
        // Don't log if error is empty or has no meaningful message
      }
    }
  };

  const filteredNotifications =
    filter === 'unread'
      ? notifications.filter((n) => !n.is_read)
      : notifications;

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  if (forbidden) {
    return (
      <AccessDenied
        title="You don't have access"
        description="You don't have access to this data."
        primary={{ label: 'Go back', href: '/admin' }}
      />
    );
  }

  if (failed && !loaded) {
    return (
      <ErrorState
        title="We couldn't load notifications"
        description="Try again in a moment."
        primary={{ label: 'Try again', onClick: () => void fetchNotifications() }}
      />
    );
  }

  if (loading && !loaded) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF7A19] mx-auto mb-4"></div>
          <p className="text-[#3A3A3A]">Loading notifications...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1A1A1A]">Notifications</h1>
          <p className="text-sm text-[#3A3A3A] mt-1">
            {unreadCount > 0
              ? `You have ${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}`
              : 'All notifications are read'}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={markAllAsRead}>
            Mark All as Read
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-200">
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'all'
                ? 'bg-[#FF7A19] text-white'
                : 'bg-gray-100 text-[#3A3A3A] hover:bg-gray-200'
            }`}
          >
            All ({notifications.length})
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'unread'
                ? 'bg-[#FF7A19] text-white'
                : 'bg-gray-100 text-[#3A3A3A] hover:bg-gray-200'
            }`}
          >
            Unread ({unreadCount})
          </button>
        </div>
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {filteredNotifications.length === 0 ? (
          filter === 'unread' && notifications.length > 0 ? (
            <NoResults
              title="No unread notifications"
              description="Nothing matches this filter."
              primary={{ label: 'Clear filters', onClick: () => setFilter('all') }}
            />
          ) : (
            <EmptyState
              title="No notifications yet"
              description="You'll see updates here when something needs your attention."
            />
          )
        ) : (
          filteredNotifications.map((notification) => (
            <div
              key={notification.id}
              className={`${
                notification.is_read ? 'bg-white' : getBgColor(notification.type)
              } rounded-xl shadow-sm border ${
                notification.is_read ? 'border-gray-200' : 'border-gray-300'
              } p-5 hover:shadow-md transition-all`}
            >
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 mt-1">{getIcon(notification.type)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-[#1A1A1A] mb-1">
                        {notification.title}
                        {!notification.is_read && (
                          <span className="ml-2 inline-block w-2 h-2 bg-[#FF7A19] rounded-full"></span>
                        )}
                      </h3>
                      <p className="text-sm text-[#3A3A3A] mb-2">
                        {notification.message}
                      </p>
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Clock size={12} />
                          {new Date(notification.created_at).toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {!notification.is_read && (
                        <button
                          onClick={() => markAsRead(notification.id)}
                          className="p-2 hover:bg-white rounded-lg transition-colors"
                          title="Mark as read"
                        >
                          <CheckCircle size={18} className="text-green-600" />
                        </button>
                      )}
                      <button
                        onClick={() => deleteNotification(notification.id)}
                        className="p-2 hover:bg-white rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={18} className="text-red-600" />
                      </button>
                    </div>
                  </div>
                  {notification.action_url && (
                    <a
                      href={notification.action_url}
                      className="inline-block mt-3 text-sm text-[#FF7A19] hover:underline font-semibold"
                    >
                      View Details →
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}


