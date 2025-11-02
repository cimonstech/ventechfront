import { supabase } from '@/lib/supabase';
import { DeliveryOption } from '@/types/order';

export const deliveryOptionsService = {
  // Get all active delivery options for public use
  async getActiveDeliveryOptions(): Promise<DeliveryOption[]> {
    try {
      const { data, error } = await supabase
        .from('delivery_options')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (error) throw error;

      return (data || []).map((option: any) => ({
        id: option.id,
        name: option.name,
        description: option.description || '',
        price: parseFloat(option.price) || 0,
        estimated_days: option.estimated_days || undefined,
      }));
    } catch (error: any) {
      console.error('Error fetching active delivery options:', error);
      // Return default options if database fetch fails
      return [
        {
          id: 'standard',
          name: 'Standard Delivery',
          description: '5-7 business days',
          price: 0,
          estimated_days: 6,
        },
        {
          id: 'express',
          name: 'Express Delivery',
          description: '2-3 business days',
          price: 15,
          estimated_days: 3,
        },
        {
          id: 'overnight',
          name: 'Overnight Delivery',
          description: 'Next business day',
          price: 30,
          estimated_days: 1,
        },
      ];
    }
  },

  // Get all delivery options (including inactive) for admin
  async getAllDeliveryOptions(): Promise<any[]> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Authentication required');
      }

      const { data, error } = await supabase
        .from('delivery_options')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw error;

      return (data || []).map((option: any) => ({
        id: option.id,
        name: option.name,
        description: option.description || '',
        price: parseFloat(option.price) || 0,
        estimated_days: option.estimated_days || null,
        is_active: option.is_active !== false,
        display_order: option.display_order || 0,
        created_at: option.created_at,
        updated_at: option.updated_at,
      }));
    } catch (error: any) {
      console.error('Error fetching all delivery options:', error);
      throw error;
    }
  },

  // Create a new delivery option
  async createDeliveryOption(option: {
    name: string;
    description?: string;
    price: number;
    estimated_days?: number;
    is_active?: boolean;
    display_order?: number;
  }): Promise<any> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Authentication required');
      }

      const { data, error } = await supabase
        .from('delivery_options')
        .insert({
          name: option.name,
          description: option.description || null,
          price: option.price,
          estimated_days: option.estimated_days || null,
          is_active: option.is_active !== false,
          display_order: option.display_order || 0,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error: any) {
      console.error('Error creating delivery option:', error);
      throw error;
    }
  },

  // Update a delivery option
  async updateDeliveryOption(
    id: string,
    updates: {
      name?: string;
      description?: string;
      price?: number;
      estimated_days?: number;
      is_active?: boolean;
      display_order?: number;
    }
  ): Promise<any> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Authentication required');
      }

      const updateData: any = {};
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.description !== undefined) updateData.description = updates.description || null;
      if (updates.price !== undefined) updateData.price = updates.price;
      if (updates.estimated_days !== undefined) updateData.estimated_days = updates.estimated_days || null;
      if (updates.is_active !== undefined) updateData.is_active = updates.is_active;
      if (updates.display_order !== undefined) updateData.display_order = updates.display_order;

      const { data, error } = await supabase
        .from('delivery_options')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error: any) {
      console.error('Error updating delivery option:', error);
      throw error;
    }
  },

  // Delete a delivery option
  async deleteDeliveryOption(id: string): Promise<void> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Authentication required');
      }

      const { error } = await supabase
        .from('delivery_options')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error: any) {
      console.error('Error deleting delivery option:', error);
      throw error;
    }
  },
};

