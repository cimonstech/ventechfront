'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Percent, DollarSign, Settings } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

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

export default function AdminTaxesPage() {
  const [taxes, setTaxes] = useState<Tax[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTax, setEditingTax] = useState<Tax | null>(null);
  const [newTax, setNewTax] = useState<Partial<Tax>>({
    name: '',
    description: '',
    rate: 0,
    type: 'percentage',
    is_active: true,
    applies_to: 'all',
  });

  useEffect(() => {
    fetchTaxes();
  }, []);

  const fetchTaxes = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('taxes')
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
          setTaxes([]);
          return;
        }
        throw error;
      }
      setTaxes(data || []);
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
        setTaxes([]);
      } else {
        // Real error - log it
        console.error('Error fetching taxes:', error);
        toast.error('Failed to fetch taxes');
        setTaxes([]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateTax = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase
        .from('taxes')
        .insert([newTax]);

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
          toast.error('Taxes table does not exist. Please run the create_taxes_discounts_system.sql migration in Supabase.');
          return;
        }
        throw error;
      }
      toast.success('Tax created successfully!');
      setShowCreateModal(false);
      setNewTax({
        name: '',
        description: '',
        rate: 0,
        type: 'percentage',
        is_active: true,
        applies_to: 'all',
      });
      fetchTaxes();
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
        toast.error('Taxes table does not exist. Please run the create_taxes_discounts_system.sql migration in Supabase.');
      } else {
        console.error('Error creating tax:', error);
        toast.error('Failed to create tax');
      }
    }
  };

  const handleUpdateTax = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTax) return;

    try {
      const { error } = await supabase
        .from('taxes')
        .update(newTax)
        .eq('id', editingTax.id);

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
          toast.error('Taxes table does not exist. Please run the create_taxes_discounts_system.sql migration in Supabase.');
          return;
        }
        throw error;
      }
      toast.success('Tax updated successfully!');
      setEditingTax(null);
      setNewTax({
        name: '',
        description: '',
        rate: 0,
        type: 'percentage',
        is_active: true,
        applies_to: 'all',
      });
      fetchTaxes();
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
        toast.error('Taxes table does not exist. Please run the create_taxes_discounts_system.sql migration in Supabase.');
      } else {
        console.error('Error updating tax:', error);
        toast.error('Failed to update tax');
      }
    }
  };

  const handleDeleteTax = async (taxId: string) => {
    if (!confirm('Are you sure you want to delete this tax?')) return;

    try {
      const { error } = await supabase
        .from('taxes')
        .delete()
        .eq('id', taxId);

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
      toast.success('Tax deleted successfully!');
      fetchTaxes();
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
        console.error('Error deleting tax:', error);
        toast.error('Failed to delete tax');
      }
    }
  };

  const handleEditTax = (tax: Tax) => {
    setEditingTax(tax);
    setNewTax(tax);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'percentage':
        return <Percent className="w-4 h-4" />;
      case 'fixed':
        return <DollarSign className="w-4 h-4" />;
      default:
        return <Settings className="w-4 h-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'percentage':
        return 'bg-blue-100 text-blue-800';
      case 'fixed':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatRate = (rate: number, type: string) => {
    if (type === 'percentage') {
      return `${(rate * 100).toFixed(2)}%`;
    } else {
      return `GHS ${rate.toFixed(2)}`;
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
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
        <h1 className="text-2xl font-bold text-[#1A1A1A]">Tax Management</h1>
        <Button
          variant="primary"
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Tax
        </Button>
      </div>

      {/* Taxes Table */}
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
                  Rate
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Applies To
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {taxes.map((tax) => (
                <tr key={tax.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{tax.name}</div>
                      {tax.description && (
                        <div className="text-sm text-gray-500">{tax.description}</div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge className={`${getTypeColor(tax.type)} flex items-center gap-1 w-fit`}>
                      {getTypeIcon(tax.type)}
                      {tax.type}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatRate(tax.rate, tax.type)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {tax.applies_to}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge variant={tax.is_active ? 'success' : 'error'}>
                      {tax.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEditTax(tax)}
                        className="text-[#FF7A19] hover:text-[#FF7A19]/80"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteTax(tax.id)}
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
      {(showCreateModal || editingTax) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h2 className="text-xl font-bold text-[#1A1A1A] mb-4">
              {editingTax ? 'Edit Tax' : 'Create New Tax'}
            </h2>
            
            <form onSubmit={editingTax ? handleUpdateTax : handleCreateTax}>
              <div className="space-y-4">
                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tax Name *
                  </label>
                  <input
                    type="text"
                    value={newTax.name || ''}
                    onChange={(e) => setNewTax({ ...newTax, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#FF7A19]"
                    placeholder="VAT"
                    required
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={newTax.description || ''}
                    onChange={(e) => setNewTax({ ...newTax, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#FF7A19]"
                    rows={3}
                    placeholder="Description of the tax"
                  />
                </div>

                {/* Type and Rate */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Type *
                    </label>
                    <select
                      value={newTax.type || 'percentage'}
                      onChange={(e) => setNewTax({ ...newTax, type: e.target.value as 'percentage' | 'fixed' })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#FF7A19]"
                    >
                      <option value="percentage">Percentage</option>
                      <option value="fixed">Fixed Amount</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Rate *
                    </label>
                    <input
                      type="number"
                      value={newTax.rate || 0}
                      onChange={(e) => setNewTax({ ...newTax, rate: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#FF7A19]"
                      min="0"
                      step="0.0001"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {newTax.type === 'percentage' ? 'Enter as decimal (0.15 = 15%)' : 'Enter amount in GHS'}
                    </p>
                  </div>
                </div>

                {/* Applies To */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Applies To
                  </label>
                  <select
                    value={newTax.applies_to || 'all'}
                    onChange={(e) => setNewTax({ ...newTax, applies_to: e.target.value as any })}
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
                    checked={newTax.is_active || false}
                    onChange={(e) => setNewTax({ ...newTax, is_active: e.target.checked })}
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
                  {editingTax ? 'Update Tax' : 'Create Tax'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditingTax(null);
                    setNewTax({
                      name: '',
                      description: '',
                      rate: 0,
                      type: 'percentage',
                      is_active: true,
                      applies_to: 'all',
                    });
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
