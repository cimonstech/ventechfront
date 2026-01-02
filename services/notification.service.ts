import { supabase } from '@/lib/supabase';

export interface Notification {
  id: string;
  type: 'order' | 'stock' | 'user' | 'alert' | 'success';
  title: string;
  message: string;
  is_read: boolean;
  action_url?: string;
  created_at: string;
  read_at?: string;
}

const LOW_STOCK_THRESHOLD = 5; // Products with stock < 5 are considered low

export const notificationService = {
  // Create a notification
  async createNotification(
    type: Notification['type'],
    title: string,
    message: string,
    actionUrl?: string
  ): Promise<Notification | null> {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .insert({
          type,
          title,
          message,
          action_url: actionUrl,
        })
        .select()
        .single();

      if (error) {
        // Check if it's a "table doesn't exist" error
        const errorMessage = error.message || '';
        const errorCode = (error as any).code || '';
        
        if (
          errorCode === '42P01' || // Table doesn't exist
          errorCode === 'PGRST116' ||
          errorMessage.includes('does not exist') ||
          errorMessage.includes('relation') ||
          errorMessage.includes('not found')
        ) {
          // Table doesn't exist - silently fail (user needs to run SQL script)
          if (process.env.NODE_ENV === 'development') {
            console.warn('Notifications table does not exist. Run create_notifications_table.sql in Supabase.');
          }
          return null;
        }
        throw error;
      }
      return data;
    } catch (error) {
      // Silently handle notification errors - notifications are non-critical
      if (process.env.NODE_ENV === 'development') {
        const errorMessage = (error as any)?.message || (error as any)?.details || (error as any)?.hint || 'Unknown error';
        const errorCode = (error as any)?.code || '';
        
        // Only log if it's not a "table doesn't exist" error
        if (
          errorCode !== '42P01' &&
          errorCode !== 'PGRST116' &&
          !errorMessage.includes('does not exist') &&
          !errorMessage.includes('relation') &&
          !errorMessage.includes('not found')
        ) {
          // Only log meaningful error messages
          if (errorMessage && errorMessage !== 'Unknown error' && errorMessage !== '{}') {
            console.error('Error creating notification:', errorMessage);
          }
        }
      }
      return null;
    }
  },

  // Check for low stock and create notification
  async checkLowStock(productId: string, stockQuantity: number, productName: string): Promise<void> {
    if (stockQuantity < LOW_STOCK_THRESHOLD && stockQuantity > 0) {
      // Check if we already have a recent notification for this product
      const { data: existingNotifications } = await supabase
        .from('notifications')
        .select('id')
        .eq('type', 'stock')
        .like('message', `%${productName}%`)
        .eq('is_read', false)
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Within last 24 hours
        .limit(1);

      if (existingNotifications && existingNotifications.length > 0) {
        // Already notified recently, skip
        return;
      }

      // Create low stock notification
      await this.createNotification(
        'stock',
        'Low Stock Alert',
        `${productName} is running low - only ${stockQuantity} unit${stockQuantity !== 1 ? 's' : ''} left`,
        `/admin/products`
      );

      // Send email notification to admin
      await this.sendLowStockEmail(productName, stockQuantity);
    } else if (stockQuantity === 0) {
      // Out of stock notification
      await this.createNotification(
        'alert',
        'Product Out of Stock',
        `${productName} is now out of stock`,
        `/admin/products`
      );

      // Send email notification to admin
      await this.sendOutOfStockEmail(productName);
    }
  },

  // Send low stock email to admin
  async sendLowStockEmail(productName: string, stockQuantity: number): Promise<void> {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/api/admin/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'low_stock',
          to: 'ventechgadgets@gmail.com',
          productName,
          stockQuantity,
        }),
      });

      if (!response.ok) {
        // Check if endpoint doesn't exist (404) - silently skip
        if (response.status === 404) {
          if (process.env.NODE_ENV === 'development') {
            console.warn('Email endpoint not found. Low stock emails are disabled.');
          }
          return;
        }
        
        // For other errors, log in development only
        if (process.env.NODE_ENV === 'development') {
          const errorText = await response.text().catch(() => 'Unknown error');
          console.error('Failed to send low stock email:', response.status, errorText);
        }
      }
    } catch (error) {
      // Silently handle email errors - emails are non-critical
      // Only log network errors in development
      if (process.env.NODE_ENV === 'development') {
        const errorMessage = (error as any)?.message || 'Network error';
        // Don't log if it's just a missing endpoint
        if (!errorMessage.includes('fetch') || errorMessage.includes('Failed to fetch')) {
          console.warn('Email service unavailable:', errorMessage);
        }
      }
    }
  },

  // Send out of stock email to admin
  async sendOutOfStockEmail(productName: string): Promise<void> {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/api/admin/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'out_of_stock',
          to: 'ventechgadgets@gmail.com',
          productName,
        }),
      });

      if (!response.ok) {
        // Check if endpoint doesn't exist (404) - silently skip
        if (response.status === 404) {
          if (process.env.NODE_ENV === 'development') {
            console.warn('Email endpoint not found. Out of stock emails are disabled.');
          }
          return;
        }
        
        // For other errors, log in development only
        if (process.env.NODE_ENV === 'development') {
          const errorText = await response.text().catch(() => 'Unknown error');
          console.error('Failed to send out of stock email:', response.status, errorText);
        }
      }
    } catch (error) {
      // Silently handle email errors - emails are non-critical
      if (process.env.NODE_ENV === 'development') {
        const errorMessage = (error as any)?.message || 'Network error';
        // Don't log if it's just a missing endpoint
        if (!errorMessage.includes('fetch') || errorMessage.includes('Failed to fetch')) {
          console.warn('Email service unavailable:', errorMessage);
        }
      }
    }
  },

  // Get all notifications
  async getAllNotifications(limit: number = 50): Promise<Notification[]> {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        // Check if it's a "table doesn't exist" error
        const errorMessage = error.message || '';
        const errorCode = (error as any).code || '';
        
        if (
          errorCode === '42P01' ||
          errorCode === 'PGRST116' ||
          errorMessage.includes('does not exist') ||
          errorMessage.includes('relation') ||
          errorMessage.includes('not found')
        ) {
          // Table doesn't exist - return empty array
          return [];
        }
        throw error;
      }
      return data || [];
    } catch (error) {
      // Only log meaningful error messages
      if (process.env.NODE_ENV === 'development') {
        const errorMessage = (error as any)?.message || (error as any)?.details || (error as any)?.hint || 'Unknown error';
        if (errorMessage && errorMessage !== 'Unknown error' && errorMessage !== '{}') {
          console.error('Error fetching notifications:', errorMessage);
        }
      }
      return [];
    }
  },

  // Get unread notifications count
  async getUnreadCount(): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('is_read', false);

      if (error) {
        // Check if it's a "table doesn't exist" error
        const errorMessage = error.message || '';
        const errorCode = (error as any).code || '';
        
        if (
          errorCode === '42P01' ||
          errorCode === 'PGRST116' ||
          errorMessage.includes('does not exist') ||
          errorMessage.includes('relation') ||
          errorMessage.includes('not found')
        ) {
          // Table doesn't exist - return 0
          return 0;
        }
        throw error;
      }
      return count || 0;
    } catch (error) {
      // Only log meaningful error messages
      if (process.env.NODE_ENV === 'development') {
        const errorMessage = (error as any)?.message || (error as any)?.details || (error as any)?.hint || 'Unknown error';
        if (errorMessage && errorMessage !== 'Unknown error' && errorMessage !== '{}') {
          console.error('Error fetching unread count:', errorMessage);
        }
      }
      return 0;
    }
  },

  // Mark notification as read
  async markAsRead(notificationId: string): Promise<void> {
    try {
      // Only update is_read - read_at column may not exist in schema
      const { error } = await supabase
        .from('notifications')
        .update({
          is_read: true,
        })
        .eq('id', notificationId);

      if (error) {
        // Check if it's a "table doesn't exist" error
        const errorMessage = error.message || '';
        const errorCode = (error as any).code || '';
        
        if (
          errorCode === '42P01' ||
          errorCode === 'PGRST116' ||
          errorMessage.includes('does not exist') ||
          errorMessage.includes('relation') ||
          errorMessage.includes('not found') ||
          errorMessage.includes('schema cache') ||
          errorMessage.includes('column')
        ) {
          // Table or column doesn't exist - silently fail
          return;
        }
        throw error;
      }
    } catch (error) {
      // Only log meaningful error messages
      if (process.env.NODE_ENV === 'development') {
        // Extract error message from various possible locations
        const errorObj = error as any;
        const errorMessage = errorObj?.message || errorObj?.details || errorObj?.hint || errorObj?.error_description || '';
        
        // Only log if we have a meaningful error message
        if (errorMessage && typeof errorMessage === 'string' && errorMessage.trim() !== '' && errorMessage !== '{}') {
          console.error('Error marking notification as read:', errorMessage);
        }
        // Don't log if error is empty or has no meaningful message
      }
    }
  },

  // Mark all as read
  async markAllAsRead(): Promise<void> {
    try {
      // Only update is_read - read_at column may not exist in schema
      const { error } = await supabase
        .from('notifications')
        .update({
          is_read: true,
        })
        .eq('is_read', false);

      if (error) {
        // Check if it's a "table doesn't exist" error
        const errorMessage = error.message || '';
        const errorCode = (error as any).code || '';
        
        if (
          errorCode === '42P01' ||
          errorCode === 'PGRST116' ||
          errorMessage.includes('does not exist') ||
          errorMessage.includes('relation') ||
          errorMessage.includes('not found') ||
          errorMessage.includes('schema cache') ||
          errorMessage.includes('column')
        ) {
          // Table or column doesn't exist - silently fail
          return;
        }
        throw error;
      }
    } catch (error) {
      // Only log meaningful error messages
      if (process.env.NODE_ENV === 'development') {
        const errorMessage = (error as any)?.message || (error as any)?.details || (error as any)?.hint || 'Unknown error';
        if (errorMessage && errorMessage !== 'Unknown error' && errorMessage !== '{}') {
          console.error('Error marking all notifications as read:', errorMessage);
        }
      }
    }
  },
};

