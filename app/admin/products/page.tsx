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
  Eye,
  Package,
  Download
} from 'lucide-react';
import { Product } from '@/types/product';
import { productService } from '@/services/product.service';
import { formatCurrency } from '@/lib/helpers';
import { useAppSelector } from '@/store';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { CSVExporter, ProductColumns } from '@/lib/csvExport';

export default function AdminProductsPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAppSelector((state) => state.auth);

  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  useEffect(() => {
    if (isAuthenticated && user?.role !== 'admin') {
      router.push('/');
      return;
    }
    // Debounce search
    const timeoutId = setTimeout(() => {
      fetchProducts();
    }, 300);
    
    return () => clearTimeout(timeoutId);
  }, [isAuthenticated, user, pagination.page, searchQuery]);

  const fetchProducts = async () => {
    try {
      setIsLoading(true);
      let productsData = await productService.getProducts({
        limit: pagination.limit,
        offset: (pagination.page - 1) * pagination.limit,
      });
      
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
      setPagination({
        ...pagination,
        total: productsData.length,
        totalPages: Math.ceil(productsData.length / pagination.limit),
      });
    } catch (error: any) {
      console.error('Error fetching products:', error);
      toast.error('Failed to load products');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product?')) {
      return;
    }

    try {
      await productService.deleteProduct(id);
      toast.success('Product deleted successfully');
      fetchProducts();
    } catch (error: any) {
      console.error('Error deleting product:', error);
      toast.error('Failed to delete product');
    }
  };

  const handleExportProducts = () => {
    const productsToExport = selectedProducts.length > 0
      ? products.filter(p => selectedProducts.includes(p.id))
      : products;

    const exportData = productsToExport.map(product => ({
      name: product.name,
      sku: (product as any).sku || 'N/A',
      price: product.original_price,
      discount_price: product.discount_price || null,
      stock_quantity: product.stock_quantity || 0,
      category_name: (product as any).category?.name || product.category_name || 'Uncategorized',
      brand_name: (product as any).brand?.name || product.brand || 'No Brand',
      is_featured: product.featured || false,
      created_at: product.created_at,
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Product Management</h1>
              <p className="text-gray-600">{pagination.total} products total</p>
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
                onClick={() => setShowAddModal(true)}
              >
                Add Product
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                icon={<Download size={16} />}
                onClick={handleExportProducts}
              >
                Export {selectedProducts.length > 0 ? `(${selectedProducts.length})` : 'All'}
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                icon={<Download size={16} />}
                onClick={handleExportExample}
                title="Export example template for product import"
              >
                Export Example
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
                placeholder="Search by product name, SKU, ID or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <select className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option>All Categories</option>
              <option>Smartphones</option>
              <option>Laptops</option>
              <option>Accessories</option>
            </select>
            <select className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option>All Status</option>
              <option>In Stock</option>
              <option>Out of Stock</option>
            </select>
          </div>
        </div>

        {/* Products Table */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF7A19]"></div>
          </div>
        ) : products.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <Package className="mx-auto mb-4 text-gray-400" size={48} />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No products found</h3>
            <p className="text-gray-600 mb-6">Get started by adding your first product</p>
            <Link href="/admin/products/new">
              <Button variant="primary" icon={<Plus size={16} />}>
                Add Product
              </Button>
            </Link>
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
                        Stock
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
                              <p className="font-medium text-gray-900">{product.name}</p>
                              <p className="text-sm text-gray-500">{product.brand}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-900">
                            {product.category_name || (product as any).category?.name || 'Uncategorized'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            {product.price_range?.hasRange ? (
                              <p className="text-sm font-medium text-gray-900">
                                {formatCurrency(product.price_range.min)} - {formatCurrency(product.price_range.max)}
                              </p>
                            ) : (
                              <>
                                <p className="text-sm font-medium text-gray-900">
                                  {formatCurrency(
                                    product.discount_price || 
                                    product.original_price || 
                                    (product as any).price || 
                                    0
                                  )}
                                </p>
                                {product.discount_price && product.discount_price < product.original_price && (
                                  <p className="text-xs text-gray-500 line-through">
                                    {formatCurrency(product.original_price)}
                                  </p>
                                )}
                              </>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-900">{product.stock_quantity}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge
                            variant={product.in_stock ? 'success' : 'error'}
                            size="sm"
                          >
                            {product.in_stock ? 'In Stock' : 'Out of Stock'}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end gap-2">
                            <Link href={`/product/${product.slug}`} target="_blank">
                              <button className="text-gray-600 hover:text-blue-600 p-1">
                                <Eye size={16} />
                              </button>
                            </Link>
                            <button 
                              onClick={() => setEditingProduct(product)}
                              className="text-gray-600 hover:text-blue-600 p-1"
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              onClick={() => handleDelete(product.id)}
                              className="text-gray-600 hover:text-red-600 p-1"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 mt-6">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page === 1}
                  onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                >
                  Previous
                </Button>

                <span className="text-sm text-gray-600">
                  Page {pagination.page} of {pagination.totalPages}
                </span>

                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page === pagination.totalPages}
                  onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                >
                  Next
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Product Modal */}
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

