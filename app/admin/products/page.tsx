'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { Badge } from '@/components/ui/Badge';
import { ProductModal } from '@/components/admin/ProductModal';
import {
  AdminPageHeader,
  AdminPagination,
  AdminRowCard,
  AttentionCard,
  ConfirmDialog,
  FilterBar,
  filterSelectClassName,
  ResponsiveTable,
  RowActions,
} from '@/components/admin/list';
import { Plus, Download } from 'lucide-react';
import { Product } from '@/types/product';
import { productService } from '@/services/product.service';
import { AccessDenied, EmptyState, ErrorState, LoadGate, TableSkeleton } from '@/components/ui-states';
import { apiRequest, toApiError } from '@/lib/api';
import { noteQueryFail } from '@/lib/queryState';
import { formatCurrency } from '@/lib/helpers';
import { useAppSelector } from '@/store';
import { hasAdminEntry } from '@/lib/roles';
import { useAccess } from '@/context/AccessContext';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { CSVExporter, ProductColumns } from '@/lib/csvExport';
import { deviceRequest } from '@/lib/devicesAdmin';
import { OPERATING_SYSTEMS, PRODUCT_CONDITIONS } from '@/lib/portalTargeting';

export default function AdminProductsPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAppSelector((state) => state.auth);
  const { canEdit } = useAccess();
  const canEditProducts = canEdit('products');

  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [forbidden, setForbidden] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [warrantyGaps, setWarrantyGaps] = useState<{ count: number; ids: string[] }>({ count: 0, ids: [] });
  const [osGaps, setOsGaps] = useState<{ count: number; ids: string[] }>({ count: 0, ids: [] });
  const [missingWarrantyOnly, setMissingWarrantyOnly] = useState(false);
  const [missingOsOnly, setMissingOsOnly] = useState(false);
  const [osFilter, setOsFilter] = useState('');
  const [conditionFilter, setConditionFilter] = useState('');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState(false);

  const mapProduct = (product: any): Product => ({
    ...product,
    original_price: product.price || product.original_price || 0,
    category_name: product.category?.name || product.categories?.name || product.category_name || null,
    brand: product.brands?.name || product.brand_name || product.brand || '',
    featured: product.is_featured || product.featured || false,
  });

  useEffect(() => {
    if (isAuthenticated && !hasAdminEntry(user?.role)) {
      router.push('/');
      return;
    }
    // Debounce search
    const timeoutId = setTimeout(() => {
      fetchProducts();
    }, 300);
    
    return () => clearTimeout(timeoutId);
  }, [isAuthenticated, user, pagination.page, searchQuery, missingWarrantyOnly, missingOsOnly, osFilter, conditionFilter]);

  useEffect(() => {
    if (!isAuthenticated || !hasAdminEntry(user?.role)) return;
    let cancelled = false;
    deviceRequest<{ count: number; ids: string[] }>('/api/admin/devices/laptop-warranty-gaps')
      .then((result) => {
        if (!cancelled) setWarrantyGaps(result.data || { count: 0, ids: [] });
      })
      .catch((error) => console.error('laptop warranty gaps', error));
    deviceRequest<{ count: number; ids: string[] }>('/api/admin/devices/laptop-os-gaps')
      .then((result) => {
        if (!cancelled) setOsGaps(result.data || { count: 0, ids: [] });
      })
      .catch((error) => console.error('laptop os gaps', error));
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, user]);

  const fetchProducts = async () => {
    try {
      setIsLoading(true);
      const gapIds = missingOsOnly ? osGaps.ids : missingWarrantyOnly ? warrantyGaps.ids : [];
      if (gapIds.length) {
        const from = (pagination.page - 1) * pagination.limit;
        let query = supabase
          .from('products')
          .select(
            `
            *,
            categories!products_category_id_fkey(id, name, slug),
            brands!products_brand_id_fkey(id, name, slug)
          `,
            { count: 'exact' }
          )
          .in('id', gapIds)
          .order('name');
        const cleaned = searchQuery.trim().slice(0, 100).replace(/[,():*%\\]/g, '');
        if (cleaned) {
          query = query.or(`name.ilike.%${cleaned}%,description.ilike.%${cleaned}%,sku.ilike.%${cleaned}%`);
        }
        if (osFilter) query = query.eq('operating_system', osFilter);
        if (conditionFilter) query = query.eq('condition', conditionFilter);
        const { data, error, count } = await query.range(from, from + pagination.limit - 1);
        if (error) throw error;
        setProducts((data || []).map(mapProduct));
        setPagination((current) => ({
          ...current,
          total: count || 0,
          totalPages: Math.max(1, Math.ceil((count || 0) / current.limit)),
        }));
      } else {
        const params = new URLSearchParams({
          page: String(pagination.page),
          limit: String(pagination.limit),
          sortBy: 'created_at',
        });
        if (searchQuery.trim()) params.set('search', searchQuery.trim());
        if (osFilter) params.set('operating_system', osFilter);
        if (conditionFilter) params.set('condition', conditionFilter);
        const result = await apiRequest<any[]>(`/api/products?${params.toString()}`);
        if (!result.ok) throw toApiError(result);
        setProducts((result.data || []).map(mapProduct));
        setPagination((current) => ({
          ...current,
          total: result.pagination?.total || 0,
          totalPages: result.pagination?.totalPages || 1,
        }));
      }
      setLoaded(true);
      setFailed(false);
      setForbidden(false);
    } catch (error: any) {
      console.error('Error fetching products:', error);
      const kind = noteQueryFail(error);
      if (kind === 'forbidden') setForbidden(true);
      else if (kind !== 'unauthorized') setFailed(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await productService.deleteProduct(deleteTarget.id);
      toast.success('Product deleted successfully');
      setDeleteTarget(null);
      fetchProducts();
    } catch (error: any) {
      console.error('Error deleting product:', error);
      toast.error('Could not delete this product');
    } finally {
      setDeleting(false);
    }
  };

  const handleExportProducts = () => {
    const productsToExport = selectedProducts.length > 0
      ? products.filter(p => selectedProducts.includes(p.id))
      : products;

    const exportData = productsToExport.map(product => ({
      name: product.name,
      sku: (product as any).sku || 'N/A',
      description: product.description || '',
      key_features: product.key_features 
        ? (Array.isArray(product.key_features) 
            ? product.key_features.join('; ') 
            : typeof product.key_features === 'string'
              ? (product.key_features.startsWith('[') 
                  ? JSON.parse(product.key_features).join('; ')
                  : product.key_features)
              : '')
        : '',
      specifications: product.specifications
        ? (typeof product.specifications === 'string'
            ? product.specifications
            : JSON.stringify(product.specifications))
        : '',
      price: product.original_price,
      discount_price: product.discount_price || null,
      price_range: (product as any).price_range 
        ? ((product as any).price_range.min === (product as any).price_range.max
            ? (product as any).price_range.min
            : `${(product as any).price_range.min} - ${(product as any).price_range.max}`)
        : null,
      stock_quantity: product.stock_quantity || 0,
      in_stock: product.in_stock || false,
      category_name: (product as any).category?.name || product.category_name || 'Uncategorized',
      brand_name: (product as any).brand?.name || product.brand || 'No Brand',
      is_featured: product.featured || false,
      rating: product.rating || 0,
      review_count: product.review_count || 0,
      images: Array.isArray(product.images) ? product.images.join(' | ') : (product.images || ''),
      thumbnail: product.thumbnail || '',
      created_at: product.created_at,
      updated_at: product.updated_at || product.created_at,
    }));

    CSVExporter.export(exportData, ProductColumns, 'products');
    toast.success(`Exported ${productsToExport.length} product(s)!`);
  };

  const handleExportExample = () => {
    const exampleData = [
      {
        name: 'iPhone 15 Pro',
        slug: 'iphone-15-pro',
        description: 'The latest iPhone with A17 Pro chip',
        category_name: 'Smartphones',
        brand_name: 'Apple',
        price: '1299.99',
        discount_price: '',
        discount_percentage: '',
        stock_quantity: '50',
        sku: 'IPH15P-001',
        in_stock: 'true',
        is_featured: 'false',
        thumbnail: 'https://example.com/image.jpg',
        images: 'https://example.com/img1.jpg,https://example.com/img2.jpg',
      },
      {
        name: 'Samsung Galaxy S24 Ultra',
        slug: 'samsung-galaxy-s24-ultra',
        description: 'Flagship Android smartphone',
        category_name: 'Smartphones',
        brand_name: 'Samsung',
        price: '1199.99',
        discount_price: '1099.99',
        discount_percentage: '8',
        stock_quantity: '30',
        sku: 'SGS24U-001',
        in_stock: 'true',
        is_featured: 'true',
        thumbnail: 'https://example.com/image.jpg',
        images: 'https://example.com/img1.jpg,https://example.com/img2.jpg',
      },
    ];

    const exampleColumns = [
      { key: 'name', label: 'Product Name' },
      { key: 'slug', label: 'Slug (URL-friendly)' },
      { key: 'description', label: 'Description' },
      { key: 'category_name', label: 'Category Name' },
      { key: 'brand_name', label: 'Brand Name' },
      { key: 'price', label: 'Price (GHS)' },
      { key: 'discount_price', label: 'Discount Price (optional, GHS)' },
      { key: 'discount_percentage', label: 'Discount % (optional)' },
      { key: 'stock_quantity', label: 'Stock Quantity' },
      { key: 'sku', label: 'SKU (Stock Keeping Unit)' },
      { key: 'in_stock', label: 'In Stock (true/false)' },
      { key: 'is_featured', label: 'Featured (true/false)' },
      { key: 'thumbnail', label: 'Thumbnail URL' },
      { key: 'images', label: 'Images (comma-separated URLs)' },
    ];

    CSVExporter.export(exampleData, exampleColumns, 'product-import-template');
    toast.success('Example spreadsheet exported! Use this template to import products.');
  };

  const productPrice = (product: Product) => {
    if (product.price_range?.hasRange) {
      return `${formatCurrency(product.price_range.min)} - ${formatCurrency(product.price_range.max)}`;
    }
    return formatCurrency(product.discount_price || product.original_price || (product as any).price || 0);
  };

  const activeFilterCount = [osFilter, conditionFilter, missingWarrantyOnly, missingOsOnly].filter(Boolean).length;

  return (
    <div className="min-w-0">
      <AdminPageHeader
        title="Products"
        subtitle={`${pagination.total} product${pagination.total === 1 ? '' : 's'}`}
        primary={
          canEditProducts
            ? { label: 'Add product', icon: <Plus size={16} />, onClick: () => setShowAddModal(true) }
            : undefined
        }
        secondary={[
          {
            label: selectedProducts.length > 0 ? `Export (${selectedProducts.length})` : 'Export all',
            icon: <Download size={16} />,
            onClick: handleExportProducts,
          },
        ]}
      />

      <AttentionCard
        items={[
          warrantyGaps.count > 0
            ? {
                id: 'warranty',
                message: `${warrantyGaps.count} laptop product${warrantyGaps.count === 1 ? '' : 's'} have no default warranty`,
                showing: missingWarrantyOnly,
                onShow: () => {
                  setMissingOsOnly(false);
                  setMissingWarrantyOnly((current) => !current);
                  setPagination((current) => ({ ...current, page: 1 }));
                },
              }
            : null,
          osGaps.count > 0
            ? {
                id: 'os',
                message: `${osGaps.count} laptop product${osGaps.count === 1 ? '' : 's'} have no operating system set`,
                showing: missingOsOnly,
                onShow: () => {
                  setMissingWarrantyOnly(false);
                  setMissingOsOnly((current) => !current);
                  setPagination((current) => ({ ...current, page: 1 }));
                },
              }
            : null,
        ].filter(Boolean) as { id: string; message: string; showing?: boolean; onShow: () => void }[]}
      />

      <FilterBar
        search={searchQuery}
        onSearchChange={(value) => {
          setSearchQuery(value);
          setPagination((current) => ({ ...current, page: 1 }));
        }}
        searchPlaceholder="Search products"
        activeCount={activeFilterCount}
        onClear={() => {
          setOsFilter('');
          setConditionFilter('');
          setMissingWarrantyOnly(false);
          setMissingOsOnly(false);
          setPagination((current) => ({ ...current, page: 1 }));
        }}
      >
        <select
          value={osFilter}
          onChange={(event) => {
            setOsFilter(event.target.value);
            setPagination((current) => ({ ...current, page: 1 }));
          }}
          className={filterSelectClassName()}
        >
          <option value="">All operating systems</option>
          {OPERATING_SYSTEMS.map((item) => (
            <option key={item.value} value={item.value}>{item.label}</option>
          ))}
        </select>
        <select
          value={conditionFilter}
          onChange={(event) => {
            setConditionFilter(event.target.value);
            setPagination((current) => ({ ...current, page: 1 }));
          }}
          className={filterSelectClassName()}
        >
          <option value="">All conditions</option>
          {PRODUCT_CONDITIONS.map((item) => (
            <option key={item.value} value={item.value}>{item.label}</option>
          ))}
        </select>
      </FilterBar>

        <LoadGate
          loaded={loaded}
          loading={isLoading}
          updating={isLoading && loaded}
          error={failed}
          forbidden={forbidden}
          isEmpty={products.length === 0}
          filtered={Boolean(searchQuery || osFilter || conditionFilter || missingWarrantyOnly || missingOsOnly)}
          onRetry={() => void fetchProducts()}
          onClearFilters={() => {
            setSearchQuery('');
            setOsFilter('');
            setConditionFilter('');
            setMissingWarrantyOnly(false);
            setMissingOsOnly(false);
          }}
          skeleton={<TableSkeleton rows={8} />}
          emptyTitle="No products yet"
          emptyDescription="Add your first product to start selling."
          emptyPrimary={canEditProducts ? { label: 'Add product', href: '/admin/products/new' } : undefined}
          denyHome="/admin"
        >
          <>
            <ResponsiveTable
              headers={
                <tr>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Price</th>
                  <th className="px-4 py-3">Stock</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              }
              cards={products.map((product) => (
                <AdminRowCard
                  key={product.id}
                  name={product.name}
                  thumbnail={product.thumbnail || '/placeholder-product.webp'}
                  status={
                    <Badge variant={product.in_stock ? 'success' : 'error'} size="sm">
                      {product.in_stock ? 'In stock' : 'Out of stock'}
                    </Badge>
                  }
                  facts={[
                    { label: 'Price', value: productPrice(product) },
                    { label: 'Stock', value: product.stock_quantity },
                    { label: 'Category', value: product.category_name || (product as any).category?.name || 'Uncategorized' },
                  ]}
                  actions={
                    <RowActions
                      name={product.name}
                      actions={[
                        { label: 'View', href: `/product/${product.slug}`, target: '_blank' },
                        ...(canEditProducts
                          ? [
                              { label: 'Edit', onClick: () => setEditingProduct(product) },
                              { label: 'Delete', destructive: true, onClick: () => setDeleteTarget(product) },
                            ]
                          : []),
                      ]}
                    />
                  }
                />
              ))}
            >
              {products.map((product) => (
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
                        <p className="truncate font-medium text-[#1A1A1A]">{product.name}</p>
                        <p className="truncate text-sm text-[#3A3A3A]">{product.brand}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[#1A1A1A]">
                    {product.category_name || (product as any).category?.name || 'Uncategorized'}
                  </td>
                  <td className="px-4 py-3 font-medium text-[#1A1A1A]">{productPrice(product)}</td>
                  <td className="px-4 py-3">
                    {product.stock_quantity < 5 && product.stock_quantity > 0 ? (
                      <span className="font-semibold text-red-600">{product.stock_quantity}</span>
                    ) : (
                      product.stock_quantity
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={product.in_stock ? 'success' : 'error'} size="sm">
                      {product.in_stock ? 'In stock' : 'Out of stock'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <RowActions
                      name={product.name}
                      actions={[
                        { label: 'View', href: `/product/${product.slug}`, target: '_blank' },
                        ...(canEditProducts
                          ? [
                              { label: 'Edit', onClick: () => setEditingProduct(product) },
                              { label: 'Delete', destructive: true, onClick: () => setDeleteTarget(product) },
                            ]
                          : []),
                      ]}
                    />
                  </td>
                </tr>
              ))}
            </ResponsiveTable>

            <AdminPagination
              page={pagination.page}
              totalPages={pagination.totalPages}
              onPage={(page) => setPagination((current) => ({ ...current, page }))}
            />
          </>
        </LoadGate>

      {deleteTarget ? (
        <ConfirmDialog
          title="Delete this product?"
          confirmLabel="Delete"
          busy={deleting}
          onClose={() => setDeleteTarget(null)}
          onConfirm={() => void handleDelete()}
        >
          {deleteTarget.name} will be removed from the shop.
        </ConfirmDialog>
      ) : null}

      <ProductModal
        isOpen={showAddModal || !!editingProduct}
        onClose={() => {
          setShowAddModal(false);
          setEditingProduct(null);
        }}
        product={editingProduct}
        onSuccess={() => {
          fetchProducts();
          setShowAddModal(false);
          setEditingProduct(null);
        }}
      />
    </div>
  );
}

