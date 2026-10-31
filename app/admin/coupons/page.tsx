'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Coupon, CreateCouponData } from '@/types/coupon';
import { couponService } from '@/services/coupon.service';
import { Plus, Copy, Tag, Percent, DollarSign, Truck } from 'lucide-react';
import toast from 'react-hot-toast';
import { LoadGate, TableSkeleton } from '@/components/ui-states';
import {
  AdminPageHeader,
  AdminRowCard,
  ConfirmDialog,
  ResponsiveTable,
  RowActions,
} from '@/components/admin/list';
import { useListQuery } from '@/hooks/useListQuery';

export default function AdminCouponsPage() {
  const query = useListQuery();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<Coupon | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [newCoupon, setNewCoupon] = useState<CreateCouponData>({
    code: '',
    name: '',
    description: '',
    discount_type: 'percentage',
    discount_value: 0,
    minimum_amount: 0,
    maximum_discount: 0,
    applies_to: 'all',
    usage_limit: undefined,
    per_user_limit: 1,
    is_active: true,
    valid_from: new Date().toISOString().slice(0, 16),
    valid_until: '',
  });

  useEffect(() => {
    fetchCoupons();
  }, []);

  const fetchCoupons = async () => {
    await query.run(async () => {
      setCoupons(await couponService.getAllCoupons());
    });
  };

  const generateCouponCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewCoupon({ ...newCoupon, code: result });
    toast.success('Coupon code generated!');
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
        discount_type: 'percentage',
        discount_value: 0,
        minimum_amount: 0,
        maximum_discount: 0,
        applies_to: 'all',
        usage_limit: undefined,
        per_user_limit: 1,
        is_active: true,
        valid_from: new Date().toISOString().slice(0, 16),
        valid_until: '',
      });
      fetchCoupons();
    } catch (error: any) {
      console.error('Error creating coupon:', error);
      toast.error(error.message || 'Failed to create coupon');
    }
  };

  const handleUpdateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCoupon) return;

    try {
      await couponService.updateCoupon(editingCoupon.id, newCoupon);
      toast.success('Coupon updated successfully!');
      setEditingCoupon(null);
      setShowCreateModal(false);
      setNewCoupon({
        code: '',
        name: '',
        description: '',
        discount_type: 'percentage',
        discount_value: 0,
        minimum_amount: 0,
        maximum_discount: 0,
        applies_to: 'all',
        usage_limit: undefined,
        per_user_limit: 1,
        is_active: true,
        valid_from: new Date().toISOString().slice(0, 16),
        valid_until: '',
      });
      fetchCoupons();
    } catch (error: any) {
      console.error('Error updating coupon:', error);
      toast.error(error.message || 'Failed to update coupon');
    }
  };

  const handleDeleteCoupon = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await couponService.deleteCoupon(deleteTarget.id);
      toast.success('Coupon deleted successfully!');
      setDeleteTarget(null);
      fetchCoupons();
    } catch (error: any) {
      console.error('Error deleting coupon:', error);
      toast.error(error.message || 'Failed to delete coupon');
    } finally {
      setDeleting(false);
    }
  };

  const handleEditCoupon = (coupon: Coupon) => {
    setEditingCoupon(coupon);
    setNewCoupon({
      code: coupon.code,
      name: coupon.name,
      description: coupon.description || '',
      discount_type: coupon.discount_type,
      discount_value: coupon.discount_value,
      minimum_amount: coupon.minimum_amount,
      maximum_discount: coupon.maximum_discount || 0,
      applies_to: coupon.applies_to,
      usage_limit: coupon.usage_limit || undefined,
      per_user_limit: coupon.per_user_limit,
      is_active: coupon.is_active,
      valid_from: coupon.valid_from ? new Date(coupon.valid_from).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16),
      valid_until: coupon.valid_until ? new Date(coupon.valid_until).toISOString().slice(0, 16) : '',
    });
    setShowCreateModal(true);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'percentage':
        return <Percent size={14} />;
      case 'fixed_amount':
        return <DollarSign size={14} />;
      case 'free_shipping':
        return <Truck size={14} />;
      default:
        return <Tag size={14} />;
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

  const isActive = (coupon: Coupon) => {
    if (!coupon.is_active) return false;
    const now = new Date();
    const validFrom = new Date(coupon.valid_from);
    const validUntil = coupon.valid_until ? new Date(coupon.valid_until) : null;

    return (
      validFrom <= now &&
      (!validUntil || validUntil >= now) &&
      (!coupon.usage_limit || coupon.used_count < coupon.usage_limit)
    );
  };

  const isExpired = (validUntil?: string) => {
    if (!validUntil) return false;
    return new Date(validUntil) < new Date();
  };

  const couponValue = (coupon: Coupon) =>
    coupon.discount_type === 'percentage'
      ? `${coupon.discount_value}%`
      : coupon.discount_type === 'fixed_amount'
        ? `GHS ${coupon.discount_value}`
        : 'Free shipping';

  const couponStatus = (coupon: Coupon) =>
    isActive(coupon) ? 'Active' : isExpired(coupon.valid_until) ? 'Expired' : 'Inactive';

  const couponActions = (coupon: Coupon) => [
    { label: 'Edit', onClick: () => handleEditCoupon(coupon) },
    { label: 'Delete', destructive: true, onClick: () => setDeleteTarget(coupon) },
  ];

  return (
    <div className="min-w-0 space-y-6">
      <AdminPageHeader
        title="Coupons"
        subtitle={`${coupons.length} coupon${coupons.length === 1 ? '' : 's'}`}
        primary={{
          label: 'Add coupon',
          icon: <Plus size={16} />,
          onClick: () => {
            setEditingCoupon(null);
            setNewCoupon({
              code: '',
              name: '',
              description: '',
              discount_type: 'percentage',
              discount_value: 0,
              minimum_amount: 0,
              maximum_discount: 0,
              applies_to: 'all',
              usage_limit: undefined,
              per_user_limit: 1,
              is_active: true,
              valid_from: new Date().toISOString().slice(0, 16),
              valid_until: '',
            });
            setShowCreateModal(true);
          },
        }}
      />

      <LoadGate
        loaded={query.loaded}
        loading={query.loading}
        updating={query.updating}
        error={query.error}
        forbidden={query.forbidden}
        isEmpty={coupons.length === 0}
        onRetry={() => void fetchCoupons()}
        skeleton={<TableSkeleton />}
        emptyTitle="No coupons yet"
        emptyDescription="Create a coupon to offer a discount at checkout."
        emptyPrimary={{ label: 'Add coupon', onClick: () => setShowCreateModal(true) }}
        denyHome="/admin"
      >
        <ResponsiveTable
          headers={
            <tr>
              <th className="px-4 py-3">Code</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Value</th>
              <th className="px-4 py-3">Usage</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Valid until</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          }
          cards={coupons.map((coupon) => (
            <AdminRowCard
              key={coupon.id}
              name={coupon.code}
              status={
                <Badge variant={isActive(coupon) ? 'success' : 'error'} size="sm">
                  {couponStatus(coupon)}
                </Badge>
              }
              facts={[
                { label: 'Name', value: coupon.name },
                { label: 'Value', value: couponValue(coupon) },
                { label: 'Usage', value: `${coupon.used_count}${coupon.usage_limit ? ` / ${coupon.usage_limit}` : ''}` },
              ]}
              actions={<RowActions name={coupon.code} actions={couponActions(coupon)} />}
            />
          ))}
        >
          {coupons.map((coupon) => (
            <tr key={coupon.id} className="hover:bg-gray-50">
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-medium text-[#1A1A1A]">{coupon.code}</span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(coupon.code)}
                    className="text-gray-400 hover:text-[#FF7A19]"
                    title="Copy code"
                  >
                    <Copy size={14} />
                  </button>
                </div>
              </td>
              <td className="px-4 py-3">
                <p className="text-sm font-medium text-[#1A1A1A]">{coupon.name}</p>
                {coupon.description ? (
                  <p className="mt-1 max-w-xs truncate text-xs text-[#3A3A3A]">{coupon.description}</p>
                ) : null}
              </td>
              <td className="px-4 py-3">
                <Badge className={`${getTypeColor(coupon.discount_type)} flex w-fit items-center gap-1`}>
                  {getTypeIcon(coupon.discount_type)}
                  {coupon.discount_type.replace('_', ' ')}
                </Badge>
              </td>
              <td className="px-4 py-3">
                <p className="text-sm text-[#1A1A1A]">{couponValue(coupon)}</p>
                {coupon.minimum_amount > 0 ? (
                  <p className="text-xs text-[#3A3A3A]">Min: GHS {coupon.minimum_amount}</p>
                ) : null}
              </td>
              <td className="px-4 py-3 text-sm text-[#1A1A1A]">
                {coupon.used_count}
                {coupon.usage_limit && ` / ${coupon.usage_limit}`}
              </td>
              <td className="px-4 py-3">
                <Badge variant={isActive(coupon) ? 'success' : 'error'} size="sm">
                  {couponStatus(coupon)}
                </Badge>
              </td>
              <td className="px-4 py-3 text-sm text-[#3A3A3A]">
                {coupon.valid_until ? new Date(coupon.valid_until).toLocaleDateString() : 'No expiry'}
              </td>
              <td className="px-4 py-3 text-right">
                <RowActions name={coupon.code} actions={couponActions(coupon)} />
              </td>
            </tr>
          ))}
        </ResponsiveTable>
      </LoadGate>

      {/* Create/Edit Modal */}
      {(showCreateModal || editingCoupon) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">
                {editingCoupon ? 'Edit Coupon' : 'Create New Coupon'}
              </h2>
            </div>
            <form onSubmit={editingCoupon ? handleUpdateCoupon : handleCreateCoupon} className="p-6 space-y-4">
              {/* Coupon Code */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Coupon Code *
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    value={newCoupon.code}
                    onChange={(e) => setNewCoupon({ ...newCoupon, code: e.target.value.toUpperCase() })}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF7A19] focus:border-transparent"
                    placeholder="COUPON123"
                    maxLength={50}
                    disabled={!!editingCoupon}
                  />
                  {!editingCoupon && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={generateCouponCode}
                    >
                      Generate
                    </Button>
                  )}
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Name *
                </label>
                <input
                  type="text"
                  required
                  value={newCoupon.name}
                  onChange={(e) => setNewCoupon({ ...newCoupon, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF7A19] focus:border-transparent"
                  placeholder="Summer Sale 2025"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={newCoupon.description}
                  onChange={(e) => setNewCoupon({ ...newCoupon, description: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF7A19] focus:border-transparent"
                  rows={3}
                  placeholder="Description of the coupon"
                />
              </div>

              {/* Discount Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Discount Type *
                </label>
                <select
                  required
                  value={newCoupon.discount_type}
                  onChange={(e) => setNewCoupon({ ...newCoupon, discount_type: e.target.value as any })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF7A19] focus:border-transparent"
                >
                  <option value="percentage">Percentage</option>
                  <option value="fixed_amount">Fixed Amount</option>
                  <option value="free_shipping">Free Shipping</option>
                </select>
              </div>

              {/* Discount Value */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {newCoupon.discount_type === 'percentage' ? 'Discount Percentage *' : 
                   newCoupon.discount_type === 'fixed_amount' ? 'Discount Amount (GHS) *' : 
                   'Free Shipping (no value needed)'}
                </label>
                <input
                  type="number"
                  required={newCoupon.discount_type !== 'free_shipping'}
                  min="0"
                  step={newCoupon.discount_type === 'percentage' ? '1' : '0.01'}
                  value={newCoupon.discount_value}
                  onChange={(e) => setNewCoupon({ ...newCoupon, discount_value: parseFloat(e.target.value) || 0 })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF7A19] focus:border-transparent"
                  disabled={newCoupon.discount_type === 'free_shipping'}
                />
              </div>

              {/* Minimum Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Minimum Order Amount (GHS)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={newCoupon.minimum_amount}
                  onChange={(e) => setNewCoupon({ ...newCoupon, minimum_amount: parseFloat(e.target.value) || 0 })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF7A19] focus:border-transparent"
                />
              </div>

              {/* Maximum Discount (for percentage) */}
              {newCoupon.discount_type === 'percentage' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Maximum Discount (GHS)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={newCoupon.maximum_discount}
                    onChange={(e) => setNewCoupon({ ...newCoupon, maximum_discount: parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF7A19] focus:border-transparent"
                  />
                </div>
              )}

              {/* Usage Limit */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Total Usage Limit (leave empty for unlimited)
                </label>
                <input
                  type="number"
                  min="1"
                  value={newCoupon.usage_limit || ''}
                  onChange={(e) => setNewCoupon({ ...newCoupon, usage_limit: e.target.value ? parseInt(e.target.value) : undefined })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF7A19] focus:border-transparent"
                  placeholder="Unlimited"
                />
              </div>

              {/* Per User Limit */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Per User Limit *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={newCoupon.per_user_limit}
                  onChange={(e) => setNewCoupon({ ...newCoupon, per_user_limit: parseInt(e.target.value) || 1 })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF7A19] focus:border-transparent"
                />
              </div>

              {/* Valid From */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Valid From *
                </label>
                <input
                  type="datetime-local"
                  required
                  value={newCoupon.valid_from}
                  onChange={(e) => setNewCoupon({ ...newCoupon, valid_from: e.target.value ? new Date(e.target.value).toISOString() : new Date().toISOString() })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF7A19] focus:border-transparent"
                />
              </div>

              {/* Valid Until */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Valid Until (leave empty for no expiry)
                </label>
                <input
                  type="datetime-local"
                  value={newCoupon.valid_until ? new Date(newCoupon.valid_until).toISOString().slice(0, 16) : ''}
                  onChange={(e) => setNewCoupon({ ...newCoupon, valid_until: e.target.value ? new Date(e.target.value).toISOString() : '' })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF7A19] focus:border-transparent"
                />
              </div>

              {/* Active Status */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={newCoupon.is_active}
                  onChange={(e) => setNewCoupon({ ...newCoupon, is_active: e.target.checked })}
                  className="w-4 h-4 text-[#FF7A19] rounded focus:ring-[#FF7A19]"
                />
                <label htmlFor="is_active" className="text-sm font-medium text-gray-700">
                  Active
                </label>
              </div>

              {/* Form Actions */}
              <div className="flex gap-3 pt-4">
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
                      discount_type: 'percentage',
                      discount_value: 0,
                      minimum_amount: 0,
                      maximum_discount: 0,
                      applies_to: 'all',
                      usage_limit: undefined,
                      per_user_limit: 1,
                      is_active: true,
                      valid_from: new Date().toISOString().slice(0, 16),
                      valid_until: '',
                    });
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteTarget ? (
        <ConfirmDialog
          title="Delete this coupon?"
          confirmLabel="Delete"
          busy={deleting}
          onClose={() => setDeleteTarget(null)}
          onConfirm={() => void handleDeleteCoupon()}
        >
          {deleteTarget.code} will be removed.
        </ConfirmDialog>
      ) : null}
    </div>
  );
}

