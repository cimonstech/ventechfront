'use client';

import { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { CategoryModal } from '@/components/admin/CategoryModal';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  image_url?: string;
  thumbnail_url?: string; // Keep for backward compatibility
  parent_id?: string;
  show_in_mega_menu: boolean;
  product_count: number;
  created_at: string;
}

export default function AdminCategoriesPage() {
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  // Fetch real data from Supabase
  const fetchCategories = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCategories(data || []);
    } catch (error: any) {
      console.error('Error fetching categories:', error);
      toast.error('Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const filteredCategories = categories.filter((category) =>
    category.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleMegaMenu = async (categoryId: string) => {
    try {
      const category = categories.find((c) => c.id === categoryId);
      if (!category) return;

      const { error } = await supabase
        .from('categories')
        .update({ show_in_mega_menu: !category.show_in_mega_menu })
        .eq('id', categoryId);

      if (error) throw error;

      await fetchCategories();
      toast.success('Category updated successfully');
    } catch (error: any) {
      console.error('Error updating category:', error);
      toast.error('Failed to update category');
    }
  };

  const deleteCategory = async (categoryId: string) => {
    if (!confirm('Are you sure you want to delete this category?')) return;

    try {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', categoryId);

      if (error) throw error;

      await fetchCategories();
      toast.success('Category deleted successfully');
    } catch (error: any) {
      console.error('Error deleting category:', error);
      toast.error('Failed to delete category');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF7A19] mx-auto mb-4"></div>
          <p className="text-[#3A3A3A]">Loading categories...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1A1A1A]">Categories</h1>
          <p className="text-sm text-[#3A3A3A] mt-1">
            Organize products into categories and manage mega menu
          </p>
        </div>
        <Button
          variant="primary"
          icon={<Plus size={18} />}
          onClick={() => setShowAddModal(true)}
        >
          Add Category
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <p className="text-sm text-[#3A3A3A] mb-1">Total Categories</p>
          <p className="text-3xl font-bold text-[#1A1A1A]">{categories.length}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <p className="text-sm text-[#3A3A3A] mb-1">In Mega Menu</p>
          <p className="text-3xl font-bold text-[#FF7A19]">
            {categories.filter((c) => c.show_in_mega_menu).length}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <p className="text-sm text-[#3A3A3A] mb-1">Total Products</p>
          <p className="text-3xl font-bold text-[#1A1A1A]">
            {categories.reduce((sum, c) => sum + c.product_count, 0)}
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
            placeholder="Search categories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF7A19]"
          />
        </div>
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCategories.length === 0 ? (
          <div className="col-span-full text-center py-12 text-[#3A3A3A]">
            No categories found
          </div>
        ) : (
          filteredCategories.map((category) => (
            <div
              key={category.id}
              className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
            >
              {/* Category Thumbnail - 1:1 Aspect Ratio */}
              <div className="relative w-full pt-[100%] bg-gray-100 overflow-hidden">
                <div className="absolute inset-0 flex items-center justify-center">
                  {(category.image_url || category.thumbnail_url) ? (
                    <img
                      src={category.image_url || category.thumbnail_url}
                      alt={category.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-4xl font-bold text-gray-400">
                      {category.name.charAt(0)}
                    </div>
                  )}
                </div>
              </div>

              {/* Category Info */}
              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-bold text-[#1A1A1A] text-lg">{category.name}</h3>
                  {category.show_in_mega_menu && (
                    <span className="px-2 py-1 bg-[#FF7A19] text-white text-xs rounded-full">
                      Mega Menu
                    </span>
                  )}
                </div>
                <p className="text-sm text-[#3A3A3A] mb-3">
                  {category.description || 'No description'}
                </p>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm text-[#3A3A3A]">
                    <strong>{category.product_count}</strong> products
                  </span>
                  <button
                    onClick={() => toggleMegaMenu(category.id)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    title={
                      category.show_in_mega_menu
                        ? 'Remove from mega menu'
                        : 'Add to mega menu'
                    }
                  >
                    {category.show_in_mega_menu ? (
                      <Eye size={18} className="text-[#FF7A19]" />
                    ) : (
                      <EyeOff size={18} className="text-gray-400" />
                    )}
                  </button>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    icon={<Edit size={16} />}
                    onClick={() => setEditingCategory(category)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-red-600 hover:bg-red-50"
                    icon={<Trash2 size={16} />}
                    onClick={() => deleteCategory(category.id)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Category Modal */}
      <CategoryModal
        isOpen={showAddModal || !!editingCategory}
        onClose={() => {
          setShowAddModal(false);
          setEditingCategory(null);
        }}
        category={editingCategory}
        onSuccess={() => {
          fetchCategories();
          setShowAddModal(false);
          setEditingCategory(null);
        }}
      />
    </div>
  );
}

