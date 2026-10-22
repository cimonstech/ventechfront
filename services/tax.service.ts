import { supabase } from '@/lib/supabase';

interface Tax {
  id: string;
  name: string;
  description?: string;
  rate: number;
  type: 'percentage' | 'fixed';
  is_active: boolean;
  applies_to: 'all' | 'products' | 'shipping' | 'total';
  created_at: string;
  updated_at: string;
}

export const taxService = {
  // Get all taxes
  async getTaxes(): Promise<Tax[]> {
    try {
      const { data, error } = await supabase
        .from('taxes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching taxes:', error);
      return [];
    }
  },

  // Get active taxes
  async getActiveTaxes(): Promise<Tax[]> {
    try {
      const { data, error } = await supabase
        .from('taxes')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching active taxes:', error);
      return [];
    }
  },

  // Create tax
  async createTax(tax: Omit<Tax, 'id' | 'created_at' | 'updated_at'>): Promise<Tax | null> {
    try {
      const { data, error } = await supabase
        .from('taxes')
        .insert([tax])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating tax:', error);
      return null;
    }
  },

  // Update tax
  async updateTax(id: string, tax: Partial<Tax>): Promise<Tax | null> {
    try {
      const { data, error } = await supabase
        .from('taxes')
        .update(tax)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating tax:', error);
      return null;
    }
  },

  // Delete tax
  async deleteTax(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('taxes')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting tax:', error);
      return false;
    }
  },

  // Calculate tax for an amount
  async calculateTax(amount: number, type: string = 'all'): Promise<number> {
    try {
      const { data, error } = await supabase
        .rpc('calculate_tax', { amount, tax_type: type });

      if (error) throw error;
      return data || 0;
    } catch (error) {
      console.error('Error calculating tax:', error);
      return 0;
    }
  },
};
