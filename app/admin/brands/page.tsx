'use client';

import { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { BrandModal } from '@/components/admin/BrandModal';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { useAccess } from '@/context/AccessContext';

interface Brand {
  id: string;
  name: string;
  slug: string;
  logo_url?: string;
  description?: string;
  is_featured: boolean;
  show_in_mega_menu?: boolean;
  product_count: number;
  created_at: string;
}

export default function BrandsPage() {
  const { canEdit } = useAccess();
  const canEditProducts = canEdit('products');
  const [loading, setLoading] = useState(true);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);

  // Fetch real data from Supabase
  const fetchBrands = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('brands')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBrands(data || []);
    } catch (error: any) {
      console.error('Error fetching brands:', error);
      toast.error('Failed to load brands');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBrands();
  }, []);

  const filteredBrands = brands.filter((brand) =>
    brand.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleFeatured = async (brandId: string) => {
    try {
      const brand = brands.find((b) => b.id === brandId);
      if (!brand) return;

      const { error } = await supabase
        .from('brands')
        .update({ show_in_mega_menu: !(brand as any).show_in_mega_menu })
        .eq('id', brandId);

      if (error) throw error;

      await fetchBrands();
      toast.success('Brand updated successfully');
    } catch (error: any) {
      console.error('Error updating brand:', error);
      toast.error('Failed to update brand');
    }
  };

  const deleteBrand = async (brandId: string) => {
    if (!confirm('Are you sure you want to delete this brand?')) return;

    try {
      const { error } = await supabase
        .from('brands')
        .delete()
        .eq('id', brandId);

      if (error) throw error;

      await fetchBrands();
      toast.success('Brand deleted successfully');
    } catch (error: any) {
      console.error('Error deleting brand:', error);
      toast.error('Failed to delete brand');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF7A19] mx-auto mb-4"></div>
          <p className="text-[#3A3A3A]">Loading brands...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1A1A1A]">Brands</h1>
          <p className="text-sm text-[#3A3A3A] mt-1">
            Manage product brands and manufacturers
          </p>
        </div>
        {canEditProducts && (
        <Button
          variant="primary"
          icon={<Plus size={18} />}
          onClick={() => setShowAddModal(true)}
        >
          Add Brand
        </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <p className="text-sm text-[#3A3A3A] mb-1">Total Brands</p>
          <p className="text-3xl font-bold text-[#1A1A1A]">{brands.length}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <p className="text-sm text-[#3A3A3A] mb-1">Featured Brands</p>
          <p className="text-3xl font-bold text-[#FF7A19]">
            {brands.filter((b) => b.is_featured).length}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <p className="text-sm text-[#3A3A3A] mb-1">Total Products</p>
          <p className="text-3xl font-bold text-[#1A1A1A]">
            {brands.reduce((sum, b) => sum + b.product_count, 0)}
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            size={20}
          />
          <input
            type="text"
            placeholder="Search brands..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF7A19]"
          />
        </div>
      </div>

      {/* Brands Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredBrands.length === 0 ? (
          <div className="col-span-full text-center py-12 text-[#3A3A3A]">
            No brands found
          </div>
        ) : (
          filteredBrands.map((brand) => (
            <div
              key={brand.id}
              className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
            >
              {/* Brand Logo */}
              <div className="h-40 bg-gray-100 flex items-center justify-center">
                {brand.logo_url ? (
                  <img
                    src={brand.logo_url}
                    alt={brand.name}
                    className="max-h-24 max-w-full object-contain px-6"
                    onError={(e) => {
                      // If image fails to load, show placeholder
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      const parent = target.parentElement;
                      if (parent && !parent.querySelector('.placeholder')) {
                        const placeholder = document.createElement('div');
                        placeholder.className = 'placeholder text-4xl font-bold text-gray-400';
                        placeholder.textContent = brand.name.charAt(0);
                        parent.appendChild(placeholder);
                      }
                    }}
                  />
                ) : (
                  <div className="text-4xl font-bold text-gray-400">
                    {brand.name.charAt(0)}
                  </div>
                )}
              </div>

              {/* Brand Info */}
              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-bold text-[#1A1A1A] text-lg">{brand.name}</h3>
                  {brand.is_featured && (
                    <span className="px-2 py-1 bg-[#FF7A19] text-white text-xs rounded-full">
                      Featured
                    </span>
                  )}
                </div>
                <p className="text-sm text-[#3A3A3A] mb-3">
                  {brand.description || 'No description'}
                </p>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm text-[#3A3A3A]">
                    <strong>{brand.product_count}</strong> products
                  </span>
                  {canEditProducts && (
                  <button
                    onClick={() => toggleFeatured(brand.id)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    title={brand.is_featured ? 'Remove from featured' : 'Add to featured'}
                  >
                    {brand.is_featured ? (
                      <Eye size={18} className="text-[#FF7A19]" />
                    ) : (
                      <EyeOff size={18} className="text-gray-400" />
                    )}
                  </button>
                  )}
                </div>

                {canEditProducts && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    icon={<Edit size={16} />}
                    onClick={() => setEditingBrand(brand)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-red-600 hover:bg-red-50"
                    icon={<Trash2 size={16} />}
                    onClick={() => deleteBrand(brand.id)}
                  >
                    Delete
                  </Button>
                </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Brand Modal */}
      <BrandModal
        isOpen={showAddModal || !!editingBrand}
        onClose={() => {
          setShowAddModal(false);
          setEditingBrand(null);
        }}
        brand={editingBrand}
        onSuccess={() => {
          fetchBrands();
          setShowAddModal(false);
          setEditingBrand(null);
        }}
      />
    </div>
  );
}

