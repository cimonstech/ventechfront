'use client';

import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { CategoryModal } from '@/components/admin/CategoryModal';
import { AccessDenied, EmptyState, ErrorState, NoResults, StatCardSkeleton, UpdatingNotice } from '@/components/ui-states';
import { useListQuery } from '@/hooks/useListQuery';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { useAccess } from '@/context/AccessContext';
import {
  AdminPageHeader,
  AdminRowCard,
  ConfirmDialog,
  FilterBar,
  ResponsiveTable,
  RowActions,
} from '@/components/admin/list';
import { Badge } from '@/components/ui/Badge';

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
  const { canEdit } = useAccess();
  const canEditProducts = canEdit('products');
  const query = useListQuery();
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchCategories = async () => {
    await query.run(async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setCategories(data || []);
    });
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

  const deleteCategory = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', deleteTarget.id);

      if (error) throw error;

      setDeleteTarget(null);
      await fetchCategories();
      toast.success('Category deleted successfully');
    } catch (error: any) {
      console.error('Error deleting category:', error);
      toast.error('Failed to delete category');
    } finally {
      setDeleting(false);
    }
  };

  const categoryActions = (category: Category) =>
    canEditProducts
      ? [
          { label: 'Edit', onClick: () => setEditingCategory(category) },
          {
            label: category.show_in_mega_menu ? 'Remove from mega menu' : 'Add to mega menu',
            onClick: () => void toggleMegaMenu(category.id),
          },
          { label: 'Delete', destructive: true, onClick: () => setDeleteTarget(category) },
        ]
      : [];

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
        title="We couldn't load categories"
        description="Try again in a moment."
        primary={{ label: 'Try again', onClick: () => void fetchCategories() }}
      />
    );
  }

  if (query.loading && !query.loaded) {
    return <StatCardSkeleton count={3} />;
  }

  return (
    <div className="min-w-0">
      {query.updating ? <UpdatingNotice /> : null}
      <AdminPageHeader
        title="Categories"
        subtitle={`${categories.length} categor${categories.length === 1 ? 'y' : 'ies'}`}
        primary={
          canEditProducts
            ? { label: 'Add category', icon: <Plus size={16} />, onClick: () => setShowAddModal(true) }
            : undefined
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <p className="mb-1 text-sm text-[#3A3A3A]">Total Categories</p>
          <p className="text-3xl font-bold text-[#1A1A1A]">{categories.length}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <p className="mb-1 text-sm text-[#3A3A3A]">In Mega Menu</p>
          <p className="text-3xl font-bold text-[#FF7A19]">
            {categories.filter((c) => c.show_in_mega_menu).length}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <p className="mb-1 text-sm text-[#3A3A3A]">Total Products</p>
          <p className="text-3xl font-bold text-[#1A1A1A]">
            {categories.reduce((sum, c) => sum + c.product_count, 0)}
          </p>
        </div>
      </div>

      <FilterBar
        search={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search categories"
      />

      {filteredCategories.length === 0 ? (
        searchQuery ? (
          <NoResults primary={{ label: 'Clear filters', onClick: () => setSearchQuery('') }} />
        ) : (
          <EmptyState
            title="No categories yet"
            description="Add a category to organize products."
            primary={canEditProducts ? { label: 'Add category', onClick: () => setShowAddModal(true) } : undefined}
          />
        )
      ) : (
        <ResponsiveTable
          headers={
            <tr>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Products</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          }
          cards={filteredCategories.map((category) => (
            <AdminRowCard
              key={category.id}
              name={category.name}
              thumbnail={category.image_url || category.thumbnail_url || undefined}
              status={
                category.show_in_mega_menu ? (
                  <Badge variant="info" size="sm">Mega menu</Badge>
                ) : undefined
              }
              facts={[
                { label: 'Products', value: category.product_count },
                { label: 'Description', value: category.description || 'No description' },
              ]}
              actions={<RowActions name={category.name} actions={categoryActions(category)} />}
            />
          ))}
        >
          {filteredCategories.map((category) => (
            <tr key={category.id} className="hover:bg-gray-50">
              <td className="px-4 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  {(category.image_url || category.thumbnail_url) ? (
                    <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                      <img
                        src={category.image_url || category.thumbnail_url}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    </div>
                  ) : null}
                  <div className="min-w-0">
                    <p className="truncate font-medium text-[#1A1A1A]">{category.name}</p>
                    <p className="truncate text-sm text-[#3A3A3A]">{category.description || 'No description'}</p>
                  </div>
                </div>
              </td>
              <td className="px-4 py-3 text-[#1A1A1A]">{category.product_count}</td>
              <td className="px-4 py-3">
                {category.show_in_mega_menu ? (
                  <Badge variant="info" size="sm">Mega menu</Badge>
                ) : null}
              </td>
              <td className="px-4 py-3 text-right">
                <RowActions name={category.name} actions={categoryActions(category)} />
              </td>
            </tr>
          ))}
        </ResponsiveTable>
      )}

      {deleteTarget ? (
        <ConfirmDialog
          title="Delete this category?"
          confirmLabel="Delete"
          busy={deleting}
          onClose={() => setDeleteTarget(null)}
          onConfirm={() => void deleteCategory()}
        >
          {deleteTarget.name} will be removed.
        </ConfirmDialog>
      ) : null}

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
