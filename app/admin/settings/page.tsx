'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import {
  Plus,
  ArrowUp,
  ArrowDown,
  Save,
  X,
} from 'lucide-react';
import { deliveryOptionsService } from '@/services/deliveryOptions.service';
import { formatCurrency } from '@/lib/helpers';
import { useAppSelector } from '@/store';
import { hasAdminEntry } from '@/lib/roles';
import { FeaturesCard } from '@/components/admin/FeaturesCard';
import {
  AdminPageHeader,
  AdminRowCard,
  ConfirmDialog,
  ResponsiveTable,
  RowActions,
} from '@/components/admin/list';
import toast from 'react-hot-toast';
import { AccessDenied, EmptyState, ErrorState, TableSkeleton, UpdatingNotice } from '@/components/ui-states';
import { useListQuery } from '@/hooks/useListQuery';

interface DeliveryOption {
  id: string;
  name: string;
  description: string;
  price: number;
  estimated_days?: number;
  is_active: boolean;
  display_order: number;
  created_at?: string;
  updated_at?: string;
}

export default function AdminSettingsPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAppSelector((state) => state.auth);

  const query = useListQuery();
  const [deliveryOptions, setDeliveryOptions] = useState<DeliveryOption[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingOption, setEditingOption] = useState<DeliveryOption | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeliveryOption | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    estimated_days: '',
    is_active: true,
    display_order: 0,
  });

  useEffect(() => {
    if (isAuthenticated && !hasAdminEntry(user?.role)) {
      router.push('/');
      return;
    }
    fetchDeliveryOptions();
  }, [isAuthenticated, user, router]);

  const fetchDeliveryOptions = async () => {
    await query.run(async () => {
      setDeliveryOptions(await deliveryOptionsService.getAllDeliveryOptions());
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.price) {
      toast.error('Please fill in name and price');
      return;
    }

    try {
      if (editingOption) {
        await deliveryOptionsService.updateDeliveryOption(editingOption.id, {
          name: formData.name,
          description: formData.description || undefined,
          price: parseFloat(formData.price),
          estimated_days: formData.estimated_days ? parseInt(formData.estimated_days) : undefined,
          is_active: formData.is_active,
          display_order: formData.display_order,
        });
        toast.success('Delivery option updated successfully');
      } else {
        await deliveryOptionsService.createDeliveryOption({
          name: formData.name,
          description: formData.description || undefined,
          price: parseFloat(formData.price),
          estimated_days: formData.estimated_days ? parseInt(formData.estimated_days) : undefined,
          is_active: formData.is_active,
          display_order: formData.display_order,
        });
        toast.success('Delivery option created successfully');
      }

      setShowForm(false);
      resetForm();
      fetchDeliveryOptions();
    } catch (error: any) {
      console.error('Save error:', error);
      toast.error(error.message || 'Failed to save delivery option');
    }
  };

  const handleEdit = (option: DeliveryOption) => {
    setEditingOption(option);
    setFormData({
      name: option.name,
      description: option.description || '',
      price: option.price.toString(),
      estimated_days: option.estimated_days?.toString() || '',
      is_active: option.is_active,
      display_order: option.display_order,
    });
    setShowForm(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deliveryOptionsService.deleteDeliveryOption(deleteTarget.id);
      toast.success('Delivery option deleted');
      setDeleteTarget(null);
      fetchDeliveryOptions();
    } catch (error: any) {
      toast.error(error.message || 'Could not delete this delivery option');
    } finally {
      setDeleting(false);
    }
  };

  const toggleActive = async (option: DeliveryOption) => {
    try {
      await deliveryOptionsService.updateDeliveryOption(option.id, {
        is_active: !option.is_active,
      });
      toast.success(`Delivery option ${!option.is_active ? 'activated' : 'deactivated'}`);
      fetchDeliveryOptions();
    } catch (error: any) {
      console.error('Toggle error:', error);
      toast.error(error.message || 'Failed to toggle delivery option');
    }
  };

  const moveOrder = async (option: DeliveryOption, direction: 'up' | 'down') => {
    const currentIndex = deliveryOptions.findIndex(o => o.id === option.id);
    if (currentIndex === -1) return;

    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= deliveryOptions.length) return;

    const targetOption = deliveryOptions[targetIndex];
    
    try {
      // Swap display orders
      await deliveryOptionsService.updateDeliveryOption(option.id, {
        display_order: targetOption.display_order,
      });
      await deliveryOptionsService.updateDeliveryOption(targetOption.id, {
        display_order: option.display_order,
      });
      
      fetchDeliveryOptions();
    } catch (error: any) {
      console.error('Move error:', error);
      toast.error(error.message || 'Failed to move delivery option');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price: '',
      estimated_days: '',
      is_active: true,
      display_order: deliveryOptions.length,
    });
    setEditingOption(null);
  };

  if (query.forbidden) {
    return (
      <AccessDenied
        title="You don't have access"
        description="You don't have access to this data."
        primary={{ label: 'Go back', href: '/admin' }}
      />
    );
  }

  if (query.error && !query.loaded) {
    return (
      <ErrorState
        title="We couldn't load delivery options"
        description="Try again in a moment."
        primary={{ label: 'Try again', onClick: () => void fetchDeliveryOptions() }}
      />
    );
  }

  if (query.loading && !query.loaded) {
    return <TableSkeleton />;
  }

  return (
    <div className="min-w-0">
      {query.updating ? <UpdatingNotice /> : null}
      <AdminPageHeader
        title="Delivery options"
        subtitle="Checkout delivery methods"
        primary={{
          label: 'Add option',
          icon: <Plus size={16} />,
          onClick: () => {
            resetForm();
            setShowForm(true);
          },
        }}
      />
      {user?.role === 'superadmin' ? <FeaturesCard /> : null}

      {showForm && (
        <div className="mb-6 min-w-0 overflow-hidden rounded-xl border border-gray-200 bg-white p-4">
          <div className="mb-4 flex items-center justify-between gap-2">
            <h2 className="min-w-0 text-lg font-bold text-[#1A1A1A]">
              {editingOption ? 'Edit option' : 'New option'}
            </h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setShowForm(false);
                resetForm();
              }}
            >
              <X size={18} />
            </Button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Name"
                name="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Standard Delivery"
                required
              />
              <Input
                label="Price (GHS)"
                name="price"
                type="number"
                step="0.01"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                placeholder="0.00"
                required
              />
              <div className="md:col-span-2">
                <Input
                  label="Description"
                  name="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="e.g., 5-7 business days"
                />
              </div>
              <Input
                label="Estimated Days"
                name="estimated_days"
                type="number"
                value={formData.estimated_days}
                onChange={(e) => setFormData({ ...formData, estimated_days: e.target.value })}
                placeholder="e.g., 5"
              />
              <Input
                label="Display Order"
                name="display_order"
                type="number"
                value={formData.display_order}
                onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                placeholder="0"
              />
            </div>

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">Active</span>
              </label>
            </div>

            <div className="flex flex-row gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                className="min-w-0 flex-1 sm:flex-none"
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" className="min-w-0 flex-1 sm:flex-none">
                <Save size={16} className="mr-2" />
                {editingOption ? 'Save' : 'Add option'}
              </Button>
            </div>
          </form>
        </div>
      )}

      {deliveryOptions.length === 0 ? (
        <EmptyState
          title="No delivery options yet"
          description="Add a delivery option so shoppers can choose how orders arrive."
          primary={{ label: 'Add option', onClick: () => setShowForm(true) }}
        />
      ) : (
        <ResponsiveTable
          headers={
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Price</th>
              <th className="px-4 py-3">Days</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          }
          cards={deliveryOptions.map((option) => (
            <AdminRowCard
              key={option.id}
              name={option.name}
              status={
                <Badge variant={option.is_active ? 'success' : 'default'} size="sm">
                  {option.is_active ? 'Active' : 'Inactive'}
                </Badge>
              }
              facts={[
                { label: 'Price', value: option.price === 0 ? 'Free' : formatCurrency(option.price) },
                { label: 'Days', value: option.estimated_days ? `${option.estimated_days} days` : '—' },
              ]}
              actions={
                <RowActions
                  name={option.name}
                  actions={[
                    { label: 'Edit', onClick: () => handleEdit(option) },
                    { label: 'Delete', destructive: true, onClick: () => setDeleteTarget(option) },
                  ]}
                />
              }
            />
          ))}
        >
          {deliveryOptions.map((option, index) => (
            <tr key={option.id} className="hover:bg-gray-50">
              <td className="px-4 py-3">
                <div className="flex min-w-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => moveOrder(option, 'up')}
                    className="inline-flex min-h-11 min-w-11 items-center justify-center text-[#3A3A3A] disabled:opacity-30"
                    disabled={index === 0}
                    aria-label="Move up"
                  >
                    <ArrowUp size={16} />
                  </button>
                  <div className="min-w-0">
                    <p className="font-medium text-[#1A1A1A]">{option.name}</p>
                    <p className="truncate text-sm text-[#3A3A3A]">{option.description || '—'}</p>
                  </div>
                </div>
              </td>
              <td className="px-4 py-3">{option.price === 0 ? 'Free' : formatCurrency(option.price)}</td>
              <td className="px-4 py-3">{option.estimated_days ? `${option.estimated_days} days` : '—'}</td>
              <td className="px-4 py-3">
                <button type="button" onClick={() => void toggleActive(option)} className="min-h-11">
                  <Badge variant={option.is_active ? 'success' : 'default'} size="sm">
                    {option.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </button>
              </td>
              <td className="px-4 py-3 text-right">
                <div className="flex items-center justify-end gap-1">
                  <button
                    type="button"
                    onClick={() => moveOrder(option, 'down')}
                    className="inline-flex min-h-11 min-w-11 items-center justify-center text-[#3A3A3A] disabled:opacity-30"
                    disabled={index === deliveryOptions.length - 1}
                    aria-label="Move down"
                  >
                    <ArrowDown size={16} />
                  </button>
                  <RowActions
                    name={option.name}
                    actions={[
                      { label: 'Edit', onClick: () => handleEdit(option) },
                      { label: 'Delete', destructive: true, onClick: () => setDeleteTarget(option) },
                    ]}
                  />
                </div>
              </td>
            </tr>
          ))}
        </ResponsiveTable>
      )}

      {deleteTarget ? (
        <ConfirmDialog
          title="Delete this delivery option?"
          confirmLabel="Delete"
          busy={deleting}
          onClose={() => setDeleteTarget(null)}
          onConfirm={() => void handleDelete()}
        >
          {deleteTarget.name} will no longer be offered at checkout.
        </ConfirmDialog>
      ) : null}
    </div>
  );
}
