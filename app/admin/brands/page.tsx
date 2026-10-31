'use client';

import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { BrandModal } from '@/components/admin/BrandModal';
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
  const query = useListQuery();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Brand | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchBrands = async () => {
    await query.run(async () => {
      const { data, error } = await supabase
        .from('brands')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setBrands(data || []);
    });
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

  const deleteBrand = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const { error } = await supabase
        .from('brands')
        .delete()
        .eq('id', deleteTarget.id);

      if (error) throw error;

      setDeleteTarget(null);
      await fetchBrands();
      toast.success('Brand deleted successfully');
    } catch (error: any) {
      console.error('Error deleting brand:', error);
      toast.error('Failed to delete brand');
    } finally {
      setDeleting(false);
    }
  };

  const brandActions = (brand: Brand) =>
    canEditProducts
      ? [
          { label: 'Edit', onClick: () => setEditingBrand(brand) },
          {
            label: brand.is_featured ? 'Remove from featured' : 'Add to featured',
            onClick: () => void toggleFeatured(brand.id),
          },
          { label: 'Delete', destructive: true, onClick: () => setDeleteTarget(brand) },
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
        title="We couldn't load brands"
        description="Try again in a moment."
        primary={{ label: 'Try again', onClick: () => void fetchBrands() }}
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
        title="Brands"
        subtitle={`${brands.length} brand${brands.length === 1 ? '' : 's'}`}
        primary={
          canEditProducts
            ? { label: 'Add brand', icon: <Plus size={16} />, onClick: () => setShowAddModal(true) }
            : undefined
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <p className="mb-1 text-sm text-[#3A3A3A]">Total Brands</p>
          <p className="text-3xl font-bold text-[#1A1A1A]">{brands.length}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <p className="mb-1 text-sm text-[#3A3A3A]">Featured Brands</p>
          <p className="text-3xl font-bold text-[#FF7A19]">
            {brands.filter((b) => b.is_featured).length}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <p className="mb-1 text-sm text-[#3A3A3A]">Total Products</p>
          <p className="text-3xl font-bold text-[#1A1A1A]">
            {brands.reduce((sum, b) => sum + b.product_count, 0)}
          </p>
        </div>
      </div>

      <FilterBar
        search={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search brands"
      />

      {filteredBrands.length === 0 ? (
        searchQuery ? (
          <NoResults primary={{ label: 'Clear filters', onClick: () => setSearchQuery('') }} />
        ) : (
          <EmptyState
            title="No brands yet"
            description="Add a brand to group products."
            primary={canEditProducts ? { label: 'Add brand', onClick: () => setShowAddModal(true) } : undefined}
          />
        )
      ) : (
        <ResponsiveTable
          headers={
            <tr>
              <th className="px-4 py-3">Brand</th>
              <th className="px-4 py-3">Products</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          }
          cards={filteredBrands.map((brand) => (
            <AdminRowCard
              key={brand.id}
              name={brand.name}
              thumbnail={brand.logo_url || undefined}
              status={
                brand.is_featured ? (
                  <Badge variant="info" size="sm">Featured</Badge>
                ) : undefined
              }
              facts={[
                { label: 'Products', value: brand.product_count },
                { label: 'Description', value: brand.description || 'No description' },
              ]}
              actions={<RowActions name={brand.name} actions={brandActions(brand)} />}
            />
          ))}
        >
          {filteredBrands.map((brand) => (
            <tr key={brand.id} className="hover:bg-gray-50">
              <td className="px-4 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  {brand.logo_url ? (
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gray-100">
                      <img
                        src={brand.logo_url}
                        alt=""
                        className="max-h-10 max-w-full object-contain"
                      />
                    </div>
                  ) : null}
                  <div className="min-w-0">
                    <p className="truncate font-medium text-[#1A1A1A]">{brand.name}</p>
                    <p className="truncate text-sm text-[#3A3A3A]">{brand.description || 'No description'}</p>
                  </div>
                </div>
              </td>
              <td className="px-4 py-3 text-[#1A1A1A]">{brand.product_count}</td>
              <td className="px-4 py-3">
                {brand.is_featured ? (
                  <Badge variant="info" size="sm">Featured</Badge>
                ) : null}
              </td>
              <td className="px-4 py-3 text-right">
                <RowActions name={brand.name} actions={brandActions(brand)} />
              </td>
            </tr>
          ))}
        </ResponsiveTable>
      )}

      {deleteTarget ? (
        <ConfirmDialog
          title="Delete this brand?"
          confirmLabel="Delete"
          busy={deleting}
          onClose={() => setDeleteTarget(null)}
          onConfirm={() => void deleteBrand()}
        >
          {deleteTarget.name} will be removed.
        </ConfirmDialog>
      ) : null}

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
