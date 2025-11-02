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

const LOW_STOCK_THRESHOLD = 10; // Products with stock < 10 are considered low

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

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating notification:', error);
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
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/admin/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'low_stock',
          to: 'ventechgadget@gmail.com',
          productName,
          stockQuantity,
        }),
      });

      if (!response.ok) {
        console.error('Failed to send low stock email');
      }
    } catch (error) {
      console.error('Error sending low stock email:', error);
    }
  },

  // Send out of stock email to admin
  async sendOutOfStockEmail(productName: string): Promise<void> {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/admin/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'out_of_stock',
          to: 'ventechgadget@gmail.com',
          productName,
        }),
      });

      if (!response.ok) {
        console.error('Failed to send out of stock email');
      }
    } catch (error) {
      console.error('Error sending out of stock email:', error);
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

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching notifications:', error);
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

      if (error) throw error;
      return count || 0;
    } catch (error) {
      console.error('Error fetching unread count:', error);
      return 0;
    }
  },

  // Mark notification as read
  async markAsRead(notificationId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({
          is_read: true,
          read_at: new Date().toISOString(),
        })
        .eq('id', notificationId);

      if (error) throw error;
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  },

  // Mark all as read
  async markAllAsRead(): Promise<void> {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({
          is_read: true,
          read_at: new Date().toISOString(),
        })
        .eq('is_read', false);

      if (error) throw error;
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  },
};

