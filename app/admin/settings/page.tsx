'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Eye,
  EyeOff,
  ArrowUp,
  ArrowDown,
  Save,
  X
} from 'lucide-react';
import { deliveryOptionsService } from '@/services/deliveryOptions.service';
import { formatCurrency } from '@/lib/helpers';
import { useAppSelector } from '@/store';
import toast from 'react-hot-toast';

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

  const [deliveryOptions, setDeliveryOptions] = useState<DeliveryOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingOption, setEditingOption] = useState<DeliveryOption | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    estimated_days: '',
    is_active: true,
    display_order: 0,
  });

  useEffect(() => {
    if (isAuthenticated && user?.role !== 'admin') {
      router.push('/');
      return;
    }
    fetchDeliveryOptions();
  }, [isAuthenticated, user, router]);

  const fetchDeliveryOptions = async () => {
    try {
      setLoading(true);
      const options = await deliveryOptionsService.getAllDeliveryOptions();
      setDeliveryOptions(options);
    } catch (error: any) {
      console.error('Error fetching delivery options:', error);
      toast.error('Failed to load delivery options');
    } finally {
      setLoading(false);
    }
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

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this delivery option?')) return;

    try {
      await deliveryOptionsService.deleteDeliveryOption(id);
      toast.success('Delivery option deleted successfully');
      fetchDeliveryOptions();
    } catch (error: any) {
      console.error('Delete error:', error);
      toast.error(error.message || 'Failed to delete delivery option');
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

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Delivery Options Settings</h1>
          <p className="text-sm text-gray-600 mt-1">Manage delivery options for checkout</p>
        </div>
        <Button
          variant="primary"
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
        >
          <Plus size={18} className="mr-2" />
          Add Delivery Option
        </Button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">
              {editingOption ? 'Edit Delivery Option' : 'Add New Delivery Option'}
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

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary">
                <Save size={18} className="mr-2" />
                {editingOption ? 'Update' : 'Create'} Delivery Option
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Delivery Options List */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Order
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Price
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Days
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {deliveryOptions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                    No delivery options yet. Click "Add Delivery Option" to create one.
                  </td>
                </tr>
              ) : (
                deliveryOptions.map((option) => (
                  <tr key={option.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => moveOrder(option, 'up')}
                          className="text-gray-400 hover:text-gray-600"
                          disabled={deliveryOptions.findIndex(o => o.id === option.id) === 0}
                        >
                          <ArrowUp size={16} />
                        </button>
                        <span className="text-sm font-medium text-gray-900">
                          {option.display_order}
                        </span>
                        <button
                          onClick={() => moveOrder(option, 'down')}
                          className="text-gray-400 hover:text-gray-600"
                          disabled={deliveryOptions.findIndex(o => o.id === option.id) === deliveryOptions.length - 1}
                        >
                          <ArrowDown size={16} />
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{option.name}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-500">{option.description || '-'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {option.price === 0 ? 'FREE' : formatCurrency(option.price)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {option.estimated_days ? `${option.estimated_days} days` : '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => toggleActive(option)}
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          option.is_active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {option.is_active ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEdit(option)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <Edit size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(option.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 size={18} />
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
    </div>
  );
}
