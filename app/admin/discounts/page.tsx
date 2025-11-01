'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Percent, DollarSign, Truck, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

interface Discount {
  id: string;
  name: string;
  description?: string;
  type: 'percentage' | 'fixed_amount' | 'free_shipping';
  value: number;
  minimum_amount: number;
  maximum_discount?: number;
  is_active: boolean;
  valid_from: string;
  valid_until?: string;
  usage_limit?: number;
  used_count: number;
  applies_to: 'all' | 'products' | 'shipping' | 'total';
  created_at: string;
  updated_at: string;
}

export default function AdminDiscountsPage() {
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState<Discount | null>(null);
  const [newDiscount, setNewDiscount] = useState<Partial<Discount>>({
    name: '',
    description: '',
    type: 'percentage',
    value: 0,
    minimum_amount: 0,
    maximum_discount: 0,
    is_active: true,
    valid_from: new Date().toISOString(),
    valid_until: '',
    usage_limit: 0,
    applies_to: 'all',
  });

  useEffect(() => {
    fetchDiscounts();
  }, []);

  const fetchDiscounts = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('discounts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        // Check if table doesn't exist - handle silently
        const errorStr = String(JSON.stringify(error)).toLowerCase();
        const errorMessage = String(error.message || '').toLowerCase();
        const errorCode = String(error.code || '');
        
        // PGRST205 = table not found in schema cache
        if (errorCode === '42P01' || errorCode === 'PGRST116' || errorCode === 'PGRST205' ||
            errorMessage.includes('does not exist') || 
            errorMessage.includes('could not find the table') ||
            errorMessage.includes('relation') || 
            errorMessage.includes('not found') ||
            errorStr.includes('does not exist') ||
            errorStr.includes('could not find the table') ||
            errorStr.includes('relation') ||
            errorStr.includes('not found') ||
            Object.keys(error).length === 0) {
          // Table doesn't exist or empty error - set empty array silently
          setDiscounts([]);
          return;
        }
        throw error;
      }
      setDiscounts(data || []);
    } catch (error: any) {
      // Check if it's a "table doesn't exist" error
      const errorStr = String(JSON.stringify(error || {})).toLowerCase();
      const errorMessage = String(error?.message || '').toLowerCase();
      const errorCode = String(error?.code || '');
      
      // PGRST205 = table not found in schema cache
      if (errorCode === '42P01' || errorCode === 'PGRST116' || errorCode === 'PGRST205' ||
          errorMessage.includes('does not exist') || 
          errorMessage.includes('could not find the table') ||
          errorMessage.includes('relation') || 
          errorMessage.includes('not found') ||
          errorStr.includes('does not exist') ||
          errorStr.includes('could not find the table') ||
          errorStr.includes('relation') ||
          errorStr.includes('not found') ||
          Object.keys(error || {}).length === 0) {
        // Table doesn't exist or empty error - set empty array silently
        setDiscounts([]);
      } else {
        // Real error - log it
        console.error('Error fetching discounts:', error);
        toast.error('Failed to fetch discounts');
        setDiscounts([]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateDiscount = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase
        .from('discounts')
        .insert([{
          ...newDiscount,
          valid_until: newDiscount.valid_until || null,
          usage_limit: newDiscount.usage_limit || null,
        }]);

      if (error) {
        // Check if table doesn't exist
        const errorStr = String(JSON.stringify(error || {})).toLowerCase();
        const errorMessage = String(error.message || '').toLowerCase();
        const errorCode = String(error.code || '');
        
        if (errorCode === '42P01' || errorCode === 'PGRST116' || errorCode === 'PGRST205' ||
            errorMessage.includes('does not exist') || 
            errorMessage.includes('could not find the table') ||
            errorMessage.includes('relation') || 
            errorMessage.includes('not found') ||
            errorStr.includes('does not exist') ||
            errorStr.includes('could not find the table') ||
            errorStr.includes('relation') ||
            errorStr.includes('not found') ||
            Object.keys(error || {}).length === 0) {
          toast.error('Discounts table does not exist. Please run the create_taxes_discounts_system.sql migration in Supabase.');
          return;
        }
        throw error;
      }
      toast.success('Discount created successfully!');
      setShowCreateModal(false);
      resetForm();
      fetchDiscounts();
    } catch (error: any) {
      // Only log if it's not a "table doesn't exist" error
      const errorStr = String(JSON.stringify(error || {})).toLowerCase();
      const errorMessage = String(error?.message || '').toLowerCase();
      const errorCode = String(error?.code || '');
      
      if (errorCode === '42P01' || errorCode === 'PGRST116' || errorCode === 'PGRST205' ||
          errorMessage.includes('does not exist') || 
          errorMessage.includes('could not find the table') ||
          errorMessage.includes('relation') || 
          errorMessage.includes('not found') ||
          errorStr.includes('does not exist') ||
          errorStr.includes('could not find the table') ||
          errorStr.includes('relation') ||
          errorStr.includes('not found') ||
          Object.keys(error || {}).length === 0) {
        toast.error('Discounts table does not exist. Please run the create_taxes_discounts_system.sql migration in Supabase.');
      } else {
        console.error('Error creating discount:', error);
        toast.error('Failed to create discount');
      }
    }
  };

  const handleUpdateDiscount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDiscount) return;

    try {
      const { error } = await supabase
        .from('discounts')
        .update({
          ...newDiscount,
          valid_until: newDiscount.valid_until || null,
          usage_limit: newDiscount.usage_limit || null,
        })
        .eq('id', editingDiscount.id);

      if (error) {
        // Check if table doesn't exist
        const errorStr = String(JSON.stringify(error || {})).toLowerCase();
        const errorMessage = String(error.message || '').toLowerCase();
        const errorCode = String(error.code || '');
        
        if (errorCode === '42P01' || errorCode === 'PGRST116' || errorCode === 'PGRST205' ||
            errorMessage.includes('does not exist') || 
            errorMessage.includes('could not find the table') ||
            errorMessage.includes('relation') || 
            errorMessage.includes('not found') ||
            errorStr.includes('does not exist') ||
            errorStr.includes('could not find the table') ||
            errorStr.includes('relation') ||
            errorStr.includes('not found') ||
            Object.keys(error || {}).length === 0) {
          toast.error('Discounts table does not exist. Please run the create_taxes_discounts_system.sql migration in Supabase.');
          return;
        }
        throw error;
      }
      toast.success('Discount updated successfully!');
      setEditingDiscount(null);
      resetForm();
      fetchDiscounts();
    } catch (error: any) {
      // Only log if it's not a "table doesn't exist" error
      const errorStr = String(JSON.stringify(error || {})).toLowerCase();
      const errorMessage = String(error?.message || '').toLowerCase();
      const errorCode = String(error?.code || '');
      
      if (errorCode === '42P01' || errorCode === 'PGRST116' || errorCode === 'PGRST205' ||
          errorMessage.includes('does not exist') || 
          errorMessage.includes('could not find the table') ||
          errorMessage.includes('relation') || 
          errorMessage.includes('not found') ||
          errorStr.includes('does not exist') ||
          errorStr.includes('could not find the table') ||
          errorStr.includes('relation') ||
          errorStr.includes('not found') ||
          Object.keys(error || {}).length === 0) {
        toast.error('Discounts table does not exist. Please run the create_taxes_discounts_system.sql migration in Supabase.');
      } else {
        console.error('Error updating discount:', error);
        toast.error('Failed to update discount');
      }
    }
  };

  const handleDeleteDiscount = async (discountId: string) => {
    if (!confirm('Are you sure you want to delete this discount?')) return;

    try {
      const { error } = await supabase
        .from('discounts')
        .delete()
        .eq('id', discountId);

      if (error) {
        // Check if table doesn't exist - handle silently
        const errorStr = String(JSON.stringify(error || {})).toLowerCase();
        const errorMessage = String(error.message || '').toLowerCase();
        const errorCode = String(error.code || '');
        
        if (errorCode === '42P01' || errorCode === 'PGRST116' || errorCode === 'PGRST205' ||
            errorMessage.includes('does not exist') || 
            errorMessage.includes('could not find the table') ||
            errorMessage.includes('relation') || 
            errorMessage.includes('not found') ||
            errorStr.includes('does not exist') ||
            errorStr.includes('could not find the table') ||
            errorStr.includes('relation') ||
            errorStr.includes('not found') ||
            Object.keys(error || {}).length === 0) {
          // Table doesn't exist - don't show error
          return;
        }
        throw error;
      }
      toast.success('Discount deleted successfully!');
      fetchDiscounts();
    } catch (error: any) {
      // Only log if it's not a "table doesn't exist" error
      const errorStr = String(JSON.stringify(error || {})).toLowerCase();
      const errorMessage = String(error?.message || '').toLowerCase();
      const errorCode = String(error?.code || '');
      
      if (!(errorCode === '42P01' || errorCode === 'PGRST116' || errorCode === 'PGRST205' ||
            errorMessage.includes('does not exist') || 
            errorMessage.includes('could not find the table') ||
            errorMessage.includes('relation') || 
            errorMessage.includes('not found') ||
            errorStr.includes('does not exist') ||
            errorStr.includes('could not find the table') ||
            errorStr.includes('relation') ||
            errorStr.includes('not found') ||
            Object.keys(error || {}).length === 0)) {
        console.error('Error deleting discount:', error);
        toast.error('Failed to delete discount');
      }
    }
  };

  const handleEditDiscount = (discount: Discount) => {
    setEditingDiscount(discount);
    setNewDiscount(discount);
  };

  const resetForm = () => {
    setNewDiscount({
      name: '',
      description: '',
      type: 'percentage',
      value: 0,
      minimum_amount: 0,
      maximum_discount: 0,
      is_active: true,
      valid_from: new Date().toISOString(),
      valid_until: '',
      usage_limit: 0,
      applies_to: 'all',
    });
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'percentage':
        return <Percent className="w-4 h-4" />;
      case 'fixed_amount':
        return <DollarSign className="w-4 h-4" />;
      case 'free_shipping':
        return <Truck className="w-4 h-4" />;
      default:
        return <DollarSign className="w-4 h-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'percentage':
        return 'bg-blue-100 text-blue-800';
      case 'fixed_amount':
        return 'bg-green-100 text-green-800';
      case 'free_shipping':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatValue = (value: number, type: string) => {
    if (type === 'percentage') {
      return `${value}%`;
    } else if (type === 'fixed_amount') {
      return `GHS ${value.toFixed(2)}`;
    } else {
      return 'Free Shipping';
    }
  };

  const isExpired = (validUntil?: string) => {
    if (!validUntil) return false;
    return new Date(validUntil) < new Date();
  };

  const isActive = (discount: Discount) => {
    const now = new Date();
    const validFrom = new Date(discount.valid_from);
    const validUntil = discount.valid_until ? new Date(discount.valid_until) : null;
    
    return discount.is_active && 
           validFrom <= now && 
           (!validUntil || validUntil >= now) &&
           (!discount.usage_limit || discount.used_count < discount.usage_limit);
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[#1A1A1A]">Discount Management</h1>
        <Button
          variant="primary"
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Discount
        </Button>
      </div>

      {/* Discounts Table */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Value
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Usage
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Valid Until
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {discounts.map((discount) => (
                <tr key={discount.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{discount.name}</div>
                      {discount.description && (
                        <div className="text-sm text-gray-500">{discount.description}</div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge className={`${getTypeColor(discount.type)} flex items-center gap-1 w-fit`}>
                      {getTypeIcon(discount.type)}
                      {discount.type.replace('_', ' ')}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatValue(discount.value, discount.type)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {discount.used_count}
                    {discount.usage_limit && ` / ${discount.usage_limit}`}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge 
                      variant={isActive(discount) ? 'success' : 'error'}
                    >
                      {isActive(discount) ? 'Active' : 
                       isExpired(discount.valid_until) ? 'Expired' : 'Inactive'}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {discount.valid_until ? 
                        new Date(discount.valid_until).toLocaleDateString() : 
                        'No expiry'
                      }
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEditDiscount(discount)}
                        className="text-[#FF7A19] hover:text-[#FF7A19]/80"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteDiscount(discount.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create/Edit Modal */}
      {(showCreateModal || editingDiscount) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-[#1A1A1A] mb-4">
              {editingDiscount ? 'Edit Discount' : 'Create New Discount'}
            </h2>
            
            <form onSubmit={editingDiscount ? handleUpdateDiscount : handleCreateDiscount}>
              <div className="space-y-4">
                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Discount Name *
                  </label>
                  <input
                    type="text"
                    value={newDiscount.name || ''}
                    onChange={(e) => setNewDiscount({ ...newDiscount, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#FF7A19]"
                    placeholder="Summer Sale"
                    required
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={newDiscount.description || ''}
                    onChange={(e) => setNewDiscount({ ...newDiscount, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#FF7A19]"
                    rows={3}
                    placeholder="Description of the discount"
                  />
                </div>

                {/* Type and Value */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Type *
                    </label>
                    <select
                      value={newDiscount.type || 'percentage'}
                      onChange={(e) => setNewDiscount({ ...newDiscount, type: e.target.value as any })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#FF7A19]"
                    >
                      <option value="percentage">Percentage</option>
                      <option value="fixed_amount">Fixed Amount</option>
                      <option value="free_shipping">Free Shipping</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Value *
                    </label>
                    <input
                      type="number"
                      value={newDiscount.value || 0}
                      onChange={(e) => setNewDiscount({ ...newDiscount, value: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#FF7A19]"
                      min="0"
                      step="0.01"
                      required
                    />
                  </div>
                </div>

                {/* Minimum Amount */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Minimum Order Amount (GHS)
                  </label>
                  <input
                    type="number"
                    value={newDiscount.minimum_amount || 0}
                    onChange={(e) => setNewDiscount({ ...newDiscount, minimum_amount: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#FF7A19]"
                    min="0"
                    step="0.01"
                  />
                </div>

                {/* Maximum Discount (for percentage) */}
                {newDiscount.type === 'percentage' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Maximum Discount (GHS)
                    </label>
                    <input
                      type="number"
                      value={newDiscount.maximum_discount || 0}
                      onChange={(e) => setNewDiscount({ ...newDiscount, maximum_discount: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#FF7A19]"
                      min="0"
                      step="0.01"
                    />
                  </div>
                )}

                {/* Usage Limit */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Usage Limit
                  </label>
                  <input
                    type="number"
                    value={newDiscount.usage_limit || 0}
                    onChange={(e) => setNewDiscount({ ...newDiscount, usage_limit: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#FF7A19]"
                    min="0"
                  />
                  <p className="text-xs text-gray-500 mt-1">Leave 0 for unlimited usage</p>
                </div>

                {/* Valid Until */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Valid Until
                  </label>
                  <input
                    type="datetime-local"
                    value={newDiscount.valid_until ? new Date(newDiscount.valid_until).toISOString().slice(0, 16) : ''}
                    onChange={(e) => setNewDiscount({ ...newDiscount, valid_until: e.target.value ? new Date(e.target.value).toISOString() : '' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#FF7A19]"
                  />
                </div>

                {/* Applies To */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Applies To
                  </label>
                  <select
                    value={newDiscount.applies_to || 'all'}
                    onChange={(e) => setNewDiscount({ ...newDiscount, applies_to: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#FF7A19]"
                  >
                    <option value="all">All Items</option>
                    <option value="products">Products Only</option>
                    <option value="shipping">Shipping Only</option>
                    <option value="total">Total Amount</option>
                  </select>
                </div>

                {/* Active Status */}
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={newDiscount.is_active || false}
                    onChange={(e) => setNewDiscount({ ...newDiscount, is_active: e.target.checked })}
                    className="rounded border-gray-300 text-[#FF7A19] focus:ring-[#FF7A19]"
                  />
                  <label htmlFor="is_active" className="text-sm font-medium text-gray-700">
                    Active
                  </label>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <Button
                  type="submit"
                  variant="primary"
                  className="flex-1"
                >
                  {editingDiscount ? 'Update Discount' : 'Create Discount'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditingDiscount(null);
                    resetForm();
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
