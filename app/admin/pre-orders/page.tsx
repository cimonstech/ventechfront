'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { Badge } from '@/components/ui/Badge';
import { ProductModal } from '@/components/admin/ProductModal';
import { Plus } from 'lucide-react';
import { Product } from '@/types/product';
import { productService } from '@/services/product.service';
import { formatCurrency } from '@/lib/helpers';
import { useAppSelector } from '@/store';
import { hasAdminEntry } from '@/lib/roles';
import { useAccess } from '@/context/AccessContext';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { AccessDenied, EmptyState, ErrorState, NoResults, TableSkeleton, UpdatingNotice } from '@/components/ui-states';
import { useListQuery } from '@/hooks/useListQuery';
import {
  AdminPageHeader,
  AdminRowCard,
  ConfirmDialog,
  FilterBar,
  ResponsiveTable,
  RowActions,
} from '@/components/admin/list';

export default function AdminPreOrdersPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAppSelector((state) => state.auth);
  const { canEdit } = useAccess();
  const canEditOrders = canEdit('orders');
  const canEditProducts = canEdit('products');
  const canSavePreOrder = canEditOrders || canEditProducts;

  const query = useListQuery();
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isNewPreOrder, setIsNewPreOrder] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (isAuthenticated && !hasAdminEntry(user?.role)) {
      router.push('/');
      return;
    }
    void fetchPreOrderProducts();
  }, [isAuthenticated, user]);

  const fetchPreOrderProducts = async () => {
    await query.run(async () => {
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          categories!products_category_id_fkey(id, name, slug),
          brands!products_brand_id_fkey(id, name, slug)
        `)
        .eq('is_pre_order', true)
        .order('created_at', { ascending: false });
      if (error) throw error;

      const productsData = (data || []).map((product: any) => ({
        ...product,
        original_price: product.price || product.original_price || 0,
        discount_price: product.discount_price || null,
        category_name: product.categories?.name || product.category_name || null,
        category_slug: product.categories?.slug || product.category_slug || null,
        brand_name: product.brands?.name || product.brand_name || product.brand || null,
        brand_slug: product.brands?.slug || product.brand_slug || null,
        brand: product.brands?.name || product.brand_name || product.brand || '',
      })) as Product[];
      setProducts(productsData);
    });
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await productService.deleteProduct(deleteTarget.id);
      toast.success('Pre-order product deleted successfully');
      setDeleteTarget(null);
      fetchPreOrderProducts();
    } catch (error: any) {
      console.error('Error deleting pre-order product:', error);
      toast.error('Failed to delete pre-order product');
    } finally {
      setDeleting(false);
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setShowAddModal(true);
  };

  const handleModalClose = () => {
    setShowAddModal(false);
    setEditingProduct(null);
    setIsNewPreOrder(false);
  };

  const handleSuccess = () => {
    fetchPreOrderProducts();
    handleModalClose();
  };

  const searchLower = searchQuery.toLowerCase();
  const filteredProducts = searchQuery
    ? products.filter((product) =>
        product.name.toLowerCase().includes(searchLower) ||
        (product as any).sku?.toLowerCase().includes(searchLower) ||
        product.id.toLowerCase().includes(searchLower) ||
        product.description?.toLowerCase().includes(searchLower)
      )
    : products;

  const productPrice = (product: Product) => {
    const originalPrice = product.original_price || (product as any).price || 0;
    const discountPrice = product.discount_price || null;
    const hasDiscount = discountPrice && discountPrice < originalPrice && originalPrice > 0;

    if (originalPrice === 0) return 'Not set';
    if (hasDiscount) return `${formatCurrency(discountPrice!)} (${formatCurrency(originalPrice)})`;
    return formatCurrency(originalPrice);
  };

  const arrivalDate = (product: Product) =>
    (product as any).estimated_arrival_date
      ? new Date((product as any).estimated_arrival_date).toLocaleDateString('en-GH', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        })
      : 'Not set';

  const productActions = (product: Product) => [
    ...(canSavePreOrder ? [{ label: 'Edit', onClick: () => handleEdit(product) }] : []),
    ...(canEditProducts
      ? [{ label: 'Delete', destructive: true, onClick: () => setDeleteTarget(product) }]
      : []),
  ];

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
        title="We couldn't load pre-order products"
        description="Try again in a moment."
        primary={{ label: 'Try again', onClick: () => void fetchPreOrderProducts() }}
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
        title="Pre-orders"
        subtitle={`${filteredProducts.length} pre-order product${filteredProducts.length !== 1 ? 's' : ''}`}
        primary={
          canEditProducts
            ? {
                label: 'Add pre-order product',
                icon: <Plus size={16} />,
                onClick: () => {
                  setIsNewPreOrder(true);
                  setShowAddModal(true);
                },
              }
            : undefined
        }
      />

      <FilterBar
        search={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search pre-orders"
      />

      {filteredProducts.length === 0 ? (
        searchQuery ? (
          <NoResults primary={{ label: 'Clear filters', onClick: () => setSearchQuery('') }} />
        ) : (
          <EmptyState
            title="No pre-order products yet"
            description="Add a product that customers can reserve before it arrives."
            primary={canEditProducts ? { label: 'Add pre-order product', onClick: () => { setIsNewPreOrder(true); setShowAddModal(true); } } : undefined}
          />
        )
      ) : (
        <ResponsiveTable
          headers={
            <tr>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Price</th>
              <th className="px-4 py-3">Pre-order status</th>
              <th className="px-4 py-3">Arrival date</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          }
          cards={filteredProducts.map((product) => (
            <AdminRowCard
              key={product.id}
              name={product.name}
              thumbnail={product.thumbnail || '/placeholder-product.webp'}
              status={
                (product as any).pre_order_available ? (
                  <Badge variant="success" size="sm">Available</Badge>
                ) : (
                  <Badge variant="default" size="sm">Not available</Badge>
                )
              }
              facts={[
                { label: 'Category', value: product.category_name || (product as any).categories?.name || 'Uncategorized' },
                { label: 'Price', value: productPrice(product) },
                { label: 'Arrival', value: arrivalDate(product) },
              ]}
              actions={<RowActions name={product.name} actions={productActions(product)} />}
            />
          ))}
        >
          {filteredProducts.map((product) => (
            <tr key={product.id} className="hover:bg-gray-50">
              <td className="px-4 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                    <Image
                      src={product.thumbnail || '/placeholder-product.webp'}
                      alt=""
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-medium text-[#1A1A1A]">{product.name}</p>
                      <Badge variant="info" size="sm">Pre-order</Badge>
                    </div>
                    <p className="truncate text-sm text-[#3A3A3A]">{product.brand}</p>
                  </div>
                </div>
              </td>
              <td className="px-4 py-3 text-[#1A1A1A]">
                {product.category_name || (product as any).categories?.name || 'Uncategorized'}
              </td>
              <td className="px-4 py-3">
                {(() => {
                  const originalPrice = product.original_price || (product as any).price || 0;
                  const discountPrice = product.discount_price || null;
                  const hasDiscount = discountPrice && discountPrice < originalPrice && originalPrice > 0;

                  if (originalPrice === 0) {
                    return <span className="text-[#3A3A3A]">Not set</span>;
                  }

                  if (hasDiscount) {
                    return (
                      <>
                        <span className="font-semibold">{formatCurrency(discountPrice!)}</span>
                        <span className="ml-2 text-[#3A3A3A] line-through">{formatCurrency(originalPrice)}</span>
                      </>
                    );
                  }

                  return <span className="font-semibold">{formatCurrency(originalPrice)}</span>;
                })()}
              </td>
              <td className="px-4 py-3">
                {(product as any).pre_order_available ? (
                  <Badge variant="success" size="sm">Available</Badge>
                ) : (
                  <Badge variant="default" size="sm">Not available</Badge>
                )}
              </td>
              <td className="px-4 py-3 text-sm text-[#1A1A1A]">{arrivalDate(product)}</td>
              <td className="px-4 py-3 text-right">
                <RowActions name={product.name} actions={productActions(product)} />
              </td>
            </tr>
          ))}
        </ResponsiveTable>
      )}

      {deleteTarget ? (
        <ConfirmDialog
          title="Delete this pre-order product?"
          confirmLabel="Delete"
          busy={deleting}
          onClose={() => setDeleteTarget(null)}
          onConfirm={() => void handleDelete()}
        >
          {deleteTarget.name} will be removed from the shop.
        </ConfirmDialog>
      ) : null}

      {showAddModal && (
        <ProductModal
          isOpen={showAddModal}
          onClose={handleModalClose}
          product={editingProduct}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  );
}
