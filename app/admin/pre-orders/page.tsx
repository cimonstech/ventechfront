'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ProductModal } from '@/components/admin/ProductModal';
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Package,
  Clock,
  Download
} from 'lucide-react';
import { Product } from '@/types/product';
import { productService } from '@/services/product.service';
import { formatCurrency } from '@/lib/helpers';
import { useAppSelector } from '@/store';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

export default function AdminPreOrdersPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAppSelector((state) => state.auth);

  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isNewPreOrder, setIsNewPreOrder] = useState(false);

  useEffect(() => {
    if (isAuthenticated && user?.role !== 'admin') {
      router.push('/');
      return;
    }
    // Debounce search
    const timeoutId = setTimeout(() => {
      fetchPreOrderProducts();
    }, 300);
    
    return () => clearTimeout(timeoutId);
  }, [isAuthenticated, user, searchQuery]);

  const fetchPreOrderProducts = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          categories!products_category_id_fkey(id, name, slug),
          brands!products_brand_id_fkey(id, name, slug)
        `)
        .eq('is_pre_order', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching pre-order products:', error);
        toast.error('Failed to load pre-order products');
        return;
      }

      // Transform products to ensure proper structure
      let productsData = (data || []).map((product: any) => ({
        ...product,
        // Transform price field from DB to original_price (database uses 'price', interface expects 'original_price')
        original_price: product.price || product.original_price || 0,
        discount_price: product.discount_price || null,
        // Flatten category and brand data
        category_name: product.categories?.name || product.category_name || null,
        category_slug: product.categories?.slug || product.category_slug || null,
        brand_name: product.brands?.name || product.brand_name || product.brand || null,
        brand_slug: product.brands?.slug || product.brand_slug || null,
        brand: product.brands?.name || product.brand_name || product.brand || '',
      })) as Product[];

      // Apply search filter client-side
      if (searchQuery) {
        const searchLower = searchQuery.toLowerCase();
        productsData = productsData.filter(product =>
          product.name.toLowerCase().includes(searchLower) ||
          (product as any).sku?.toLowerCase().includes(searchLower) ||
          product.id.toLowerCase().includes(searchLower) ||
          product.description?.toLowerCase().includes(searchLower)
        );
      }

      setProducts(productsData);
    } catch (error: any) {
      console.error('Error fetching pre-order products:', error);
      toast.error('Failed to load pre-order products');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this pre-order product?')) {
      return;
    }

    try {
      await productService.deleteProduct(id);
      toast.success('Pre-order product deleted successfully');
      fetchPreOrderProducts();
    } catch (error: any) {
      console.error('Error deleting pre-order product:', error);
      toast.error('Failed to delete pre-order product');
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Pre-Order Management</h1>
              <p className="text-gray-600">{products.length} pre-order product{products.length !== 1 ? 's' : ''}</p>
            </div>
            <div className="flex gap-2">
              <Link href="/admin/dashboard">
                <Button variant="outline" size="sm">
                  Back to Dashboard
                </Button>
              </Link>
              <Button 
                variant="primary" 
                size="sm" 
                icon={<Plus size={16} />}
                onClick={() => {
                  setIsNewPreOrder(true);
                  setShowAddModal(true);
                }}
              >
                Add Pre-Order Product
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8">
        {/* Search & Filters */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search pre-order products by name, SKU, ID or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Products Table */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF7A19]"></div>
          </div>
        ) : products.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <Clock className="mx-auto mb-4 text-gray-400" size={48} />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No pre-order products found</h3>
            <p className="text-gray-600 mb-6">Get started by adding your first pre-order product</p>
            <Button variant="primary" icon={<Plus size={16} />} onClick={() => setShowAddModal(true)}>
              Add Pre-Order Product
            </Button>
          </div>
        ) : (
          <>
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Product
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Category
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Price
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Pre-Order Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Arrival Date
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {products.map((product) => (
                      <tr key={product.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="relative w-12 h-12 flex-shrink-0 bg-gray-100 rounded-lg overflow-hidden">
                              <Image
                                src={product.thumbnail || '/placeholder-product.webp'}
                                alt={product.name}
                                fill
                                className="object-cover"
                              />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-medium text-gray-900">{product.name}</p>
                                <Badge variant="info" size="sm">
                                  Pre-Order
                                </Badge>
                              </div>
                              <p className="text-sm text-gray-500">{product.brand}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-900">
                            {product.category_name || (product as any).categories?.name || 'Uncategorized'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {(() => {
                              const originalPrice = product.original_price || (product as any).price || 0;
                              const discountPrice = product.discount_price || null;
                              const hasDiscount = discountPrice && discountPrice < originalPrice && originalPrice > 0;
                              
                              if (originalPrice === 0) {
                                return <span className="text-gray-500">Not set</span>;
                              }
                              
                              if (hasDiscount) {
                                return (
                                  <>
                                    <span className="font-semibold">{formatCurrency(discountPrice!)}</span>
                                    <span className="text-gray-500 line-through ml-2">{formatCurrency(originalPrice)}</span>
                                  </>
                                );
                              }
                              
                              return <span className="font-semibold">{formatCurrency(originalPrice)}</span>;
                            })()}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {(product as any).pre_order_available ? (
                            <Badge variant="success" size="sm">Available</Badge>
                          ) : (
                            <Badge variant="default" size="sm">Not Available</Badge>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-900">
                            {(product as any).estimated_arrival_date
                              ? new Date((product as any).estimated_arrival_date).toLocaleDateString('en-GH', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                })
                              : 'Not set'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleEdit(product)}
                              className="text-blue-600 hover:text-blue-900 p-2 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Edit"
                            >
                              <Edit size={18} />
                            </button>
                            <button
                              onClick={() => handleDelete(product.id)}
                              className="text-red-600 hover:text-red-900 p-2 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Product Modal */}
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

