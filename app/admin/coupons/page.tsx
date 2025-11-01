'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Copy, Calendar, Users, Percent, DollarSign, Truck } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Coupon, CreateCouponData } from '@/types/coupon';
import { couponService } from '@/services/coupon.service';
import toast from 'react-hot-toast';

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [newCoupon, setNewCoupon] = useState<CreateCouponData>({
    code: '',
    name: '',
    description: '',
    type: 'percentage',
    value: 0,
    minimum_amount: 0,
    maximum_discount: 0,
    usage_limit: 0,
    is_active: true,
    valid_from: new Date().toISOString(),
    valid_until: '',
  });

  useEffect(() => {
    fetchCoupons();
  }, []);

  const fetchCoupons = async () => {
    setIsLoading(true);
    try {
      const data = await couponService.getAllCoupons();
      setCoupons(data);
    } catch (error) {
      console.error('Error fetching coupons:', error);
      toast.error('Failed to fetch coupons');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateCode = async () => {
    try {
      const code = await couponService.generateCouponCode();
      setNewCoupon({ ...newCoupon, code });
      toast.success('Coupon code generated!');
    } catch (error) {
      console.error('Error generating code:', error);
      toast.error('Failed to generate coupon code');
    }
  };

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await couponService.createCoupon(newCoupon);
      toast.success('Coupon created successfully!');
      setShowCreateModal(false);
      setNewCoupon({
        code: '',
        name: '',
        description: '',
        type: 'percentage',
        value: 0,
        minimum_amount: 0,
        maximum_discount: 0,
        usage_limit: 0,
        is_active: true,
        valid_from: new Date().toISOString(),
        valid_until: '',
      });
      fetchCoupons();
    } catch (error) {
      console.error('Error creating coupon:', error);
      toast.error('Failed to create coupon');
    }
  };

  const handleUpdateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCoupon) return;

    try {
      await couponService.updateCoupon(editingCoupon.id, newCoupon);
      toast.success('Coupon updated successfully!');
      setEditingCoupon(null);
      setNewCoupon({
        code: '',
        name: '',
        description: '',
        type: 'percentage',
        value: 0,
        minimum_amount: 0,
        maximum_discount: 0,
        usage_limit: 0,
        is_active: true,
        valid_from: new Date().toISOString(),
        valid_until: '',
      });
      fetchCoupons();
    } catch (error) {
      console.error('Error updating coupon:', error);
      toast.error('Failed to update coupon');
    }
  };

  const handleDeleteCoupon = async (couponId: string) => {
    if (!confirm('Are you sure you want to delete this coupon?')) return;

    try {
      await couponService.deleteCoupon(couponId);
      toast.success('Coupon deleted successfully!');
      fetchCoupons();
    } catch (error) {
      console.error('Error deleting coupon:', error);
      toast.error('Failed to delete coupon');
    }
  };

  const handleEditCoupon = (coupon: Coupon) => {
    setEditingCoupon(coupon);
    setNewCoupon({
      code: coupon.code,
      name: coupon.name,
      description: coupon.description || '',
      type: coupon.type,
      value: coupon.value,
      minimum_amount: coupon.minimum_amount,
      maximum_discount: coupon.maximum_discount || 0,
      usage_limit: coupon.usage_limit || 0,
      is_active: coupon.is_active,
      valid_from: coupon.valid_from,
      valid_until: coupon.valid_until || '',
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'percentage':
        return <Percent className="w-4 h-4" />;
      case 'fixed_amount':
        return <DollarSign className="w-4 h-4" />;
      case 'free_delivery':
        return <Truck className="w-4 h-4" />;
      default:
        return <Percent className="w-4 h-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'percentage':
        return 'bg-blue-100 text-blue-800';
      case 'fixed_amount':
        return 'bg-green-100 text-green-800';
      case 'free_delivery':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const isExpired = (validUntil: string | undefined) => {
    if (!validUntil) return false;
    return new Date(validUntil) < new Date();
  };

  const isActive = (coupon: Coupon) => {
    const now = new Date();
    const validFrom = new Date(coupon.valid_from);
    const validUntil = coupon.valid_until ? new Date(coupon.valid_until) : null;
    
    return coupon.is_active && 
           validFrom <= now && 
           (!validUntil || validUntil >= now) &&
           (!coupon.usage_limit || coupon.used_count < coupon.usage_limit);
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
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
        <h1 className="text-2xl font-bold text-[#1A1A1A]">Coupons</h1>
        <Button
          variant="primary"
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Create Coupon
        </Button>
      </div>

      {/* Coupons Table */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead className="bg-gray-50 border-b">
              <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Code
                </th>
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
              {coupons.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    No coupons found. Create your first coupon above.
                  </td>
                </tr>
              ) : (
                coupons.map((coupon) => (
                  <tr key={coupon.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono">
                          {coupon.code}
                        </code>
                        <button
                          onClick={() => copyToClipboard(coupon.code)}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{coupon.name}</div>
                        {coupon.description && (
                          <div className="text-xs text-gray-500 truncate max-w-xs">
                            {coupon.description}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge className={`${getTypeColor(coupon.type)} flex items-center gap-1 w-fit`}>
                        {getTypeIcon(coupon.type)}
                        {coupon.type.replace('_', ' ')}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {coupon.type === 'percentage' ? `${coupon.value}%` : 
                       coupon.type === 'fixed_amount' ? `GHS ${coupon.value}` : 
                       'Free Delivery'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        {coupon.used_count}
                        {coupon.usage_limit && ` / ${coupon.usage_limit}`}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge 
                        variant={isActive(coupon) ? 'success' : 'error'}
                      >
                        {isActive(coupon) ? 'Active' : 
                         isExpired(coupon.valid_until) ? 'Expired' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {coupon.valid_until ? 
                          new Date(coupon.valid_until).toLocaleDateString() : 
                          'No expiry'
                        }
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEditCoupon(coupon)}
                          className="text-[#FF7A19] hover:text-[#FF7A19]/80"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteCoupon(coupon.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create/Edit Modal */}
      {(showCreateModal || editingCoupon) && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-white border-b px-6 py-4 z-10">
              <h2 className="text-xl font-bold text-[#1A1A1A]">
                {editingCoupon ? 'Edit Coupon' : 'Create New Coupon'}
              </h2>
            </div>
            <div className="p-6">
              <form onSubmit={editingCoupon ? handleUpdateCoupon : handleCreateCoupon}>
              <div className="space-y-4">
                {/* Code */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Coupon Code *
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newCoupon.code}
                      onChange={(e) => setNewCoupon({ ...newCoupon, code: e.target.value.toUpperCase() })}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#FF7A19]"
                      placeholder="WELCOME10"
                      maxLength={8}
                      required
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleGenerateCode}
                      className="px-3"
                    >
                      Generate
                    </Button>
                  </div>
                </div>

                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name *
                  </label>
                  <input
                    type="text"
                    value={newCoupon.name}
                    onChange={(e) => setNewCoupon({ ...newCoupon, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#FF7A19]"
                    placeholder="Welcome Discount"
                    required
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={newCoupon.description}
                    onChange={(e) => setNewCoupon({ ...newCoupon, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#FF7A19]"
                    rows={3}
                    placeholder="Description of the coupon"
                  />
                </div>

                {/* Type and Value */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Type *
                    </label>
                    <select
                      value={newCoupon.type}
                      onChange={(e) => setNewCoupon({ ...newCoupon, type: e.target.value as any })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#FF7A19]"
                    >
                      <option value="percentage">Percentage</option>
                      <option value="fixed_amount">Fixed Amount</option>
                      <option value="free_delivery">Free Delivery</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Value *
                    </label>
                    <input
                      type="number"
                      value={newCoupon.value}
                      onChange={(e) => setNewCoupon({ ...newCoupon, value: parseFloat(e.target.value) || 0 })}
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
                    value={newCoupon.minimum_amount}
                    onChange={(e) => setNewCoupon({ ...newCoupon, minimum_amount: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#FF7A19]"
                    min="0"
                    step="0.01"
                  />
                </div>

                {/* Maximum Discount (for percentage) */}
                {newCoupon.type === 'percentage' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Maximum Discount (GHS)
                    </label>
                    <input
                      type="number"
                      value={newCoupon.maximum_discount}
                      onChange={(e) => setNewCoupon({ ...newCoupon, maximum_discount: parseFloat(e.target.value) || 0 })}
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
                    value={newCoupon.usage_limit}
                    onChange={(e) => setNewCoupon({ ...newCoupon, usage_limit: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#FF7A19]"
                    min="0"
                  />
                </div>

                {/* Valid Until */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Valid Until
                  </label>
                  <input
                    type="datetime-local"
                    value={newCoupon.valid_until ? new Date(newCoupon.valid_until).toISOString().slice(0, 16) : ''}
                    onChange={(e) => setNewCoupon({ ...newCoupon, valid_until: e.target.value ? new Date(e.target.value).toISOString() : '' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#FF7A19]"
                  />
                </div>

                {/* Active Status */}
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={newCoupon.is_active}
                    onChange={(e) => setNewCoupon({ ...newCoupon, is_active: e.target.checked })}
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
                  {editingCoupon ? 'Update Coupon' : 'Create Coupon'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditingCoupon(null);
                    setNewCoupon({
                      code: '',
                      name: '',
                      description: '',
                      type: 'percentage',
                      value: 0,
                      minimum_amount: 0,
                      maximum_discount: 0,
                      usage_limit: 0,
                      is_active: true,
                      valid_from: new Date().toISOString(),
                      valid_until: '',
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
        </div>
      )}
    </div>
  );
}

