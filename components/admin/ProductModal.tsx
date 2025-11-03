'use client';

import { useState, useEffect } from 'react';
import { X, Upload, Loader2, Plus, Trash2, ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabase';
import { MediaPicker } from './MediaPicker';
import { ProductVariantManager } from './ProductVariantManager';
import { notificationService } from '@/services/notification.service';

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  product?: any;
  onSuccess: () => void;
}

export function ProductModal({ isOpen, onClose, product, onSuccess }: ProductModalProps) {
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [attributes, setAttributes] = useState<any[]>([]);
  const [selectedAttributes, setSelectedAttributes] = useState<string[]>([]);
  const [productVariants, setProductVariants] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    key_features: '', // Key features as comma-separated string
    specifications: '', // Specifications as JSON string
    category_id: '',
    brand_id: '',
    price: '',
    discount_price: '',
    discount_percentage: '',
    stock_quantity: '',
    sku: '',
    images: [] as string[],
    thumbnail: '',
    is_featured: false,
    in_stock: true,
  });

  useEffect(() => {
    if (isOpen) {
      fetchCategories();
      fetchBrands();
      fetchAttributes();
    }
  }, [isOpen]);

  useEffect(() => {
    if (product) {
      // Parse key_features and specifications if they're arrays/objects
      const keyFeatures = product.key_features 
        ? (Array.isArray(product.key_features) 
            ? product.key_features.join(', ')
            : typeof product.key_features === 'string' 
              ? (product.key_features.startsWith('[') 
                  ? JSON.parse(product.key_features).join(', ')
                  : product.key_features)
              : '')
        : '';
      
      const specifications = product.specifications
        ? (typeof product.specifications === 'string'
            ? product.specifications
            : JSON.stringify(product.specifications))
        : '';

      setFormData({
        name: product.name || '',
        slug: product.slug || '',
        description: product.description || '',
        key_features: keyFeatures,
        specifications: specifications,
        category_id: product.category_id || '',
        brand_id: product.brand_id || '',
        price: product.original_price?.toString() || '',
        discount_price: product.discount_price?.toString() || '',
        discount_percentage: product.discount_percentage?.toString() || '',
        stock_quantity: product.stock_quantity?.toString() || '',
        sku: product.sku || '',
        images: product.images || [],
        thumbnail: product.thumbnail || '',
        is_featured: product.is_featured || false,
        in_stock: product.in_stock !== undefined ? product.in_stock : true,
      });
      fetchProductAttributes(product.id);
    } else {
      resetForm();
    }
  }, [product, isOpen]);

  const resetForm = () => {
    setFormData({
      name: '',
      slug: '',
      description: '',
      key_features: '',
      specifications: '',
      category_id: '',
      brand_id: '',
      price: '',
      discount_price: '',
      discount_percentage: '',
      stock_quantity: '',
      sku: '',
      images: [],
      thumbnail: '',
      is_featured: false,
      in_stock: true,
    });
    setSelectedAttributes([]);
  };

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name')
        .order('name');
      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchBrands = async () => {
    try {
      const { data, error } = await supabase
        .from('brands')
        .select('id, name')
        .order('name');
      if (error) throw error;
      setBrands(data || []);
    } catch (error) {
      console.error('Error fetching brands:', error);
    }
  };

  const fetchAttributes = async () => {
    try {
      const { data, error } = await supabase
        .from('product_attributes')
        .select('*')
        .order('display_order');
      if (error) throw error;
      setAttributes(data || []);
    } catch (error) {
      console.error('Error fetching attributes:', error);
    }
  };

  const fetchProductAttributes = async (productId: string) => {
    try {
      const { data, error } = await supabase
        .from('product_attribute_mappings')
        .select('attribute_id')
        .eq('product_id', productId);
      if (error) throw error;
      setSelectedAttributes(data?.map(d => d.attribute_id) || []);
    } catch (error) {
      console.error('Error fetching product attributes:', error);
    }
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  const generateSKU = () => {
    const prefix = formData.name.substring(0, 3).toUpperCase();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `${prefix}-${random}`;
  };

  const handleNameChange = (name: string) => {
    setFormData({
      ...formData,
      name,
      slug: generateSlug(name),
      sku: formData.sku || generateSKU(),
    });
  };

  const calculateDiscount = (price: string, discountPrice: string) => {
    const p = parseFloat(price);
    const dp = parseFloat(discountPrice);
    if (p && dp && dp < p) {
      const percentage = Math.round(((p - dp) / p) * 100);
      setFormData(prev => ({ ...prev, discount_percentage: percentage.toString() }));
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        if (!file.type.startsWith('image/')) {
          throw new Error('Please upload image files only');
        }
        if (file.size > 2 * 1024 * 1024) {
          throw new Error('Image size should be less than 2MB');
        }

        const formData = new FormData();
        formData.append('file', file);
        
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
        const response = await fetch(`${apiUrl}/api/upload?folder=${encodeURIComponent('products')}`, {
          method: 'POST',
          body: formData,
        });

        const data = await response.json();
        if (!data.success || !data.url) {
          throw new Error(data.error || 'Upload failed');
        }
        return data.url;
      });

      const uploadedUrls = await Promise.all(uploadPromises);
      setFormData(prev => ({
        ...prev,
        images: [...prev.images, ...uploadedUrls],
        thumbnail: prev.thumbnail || uploadedUrls[0],
      }));
      toast.success(`${uploadedUrls.length} image(s) uploaded successfully`);
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error.message || 'Failed to upload images');
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (index: number) => {
    setFormData(prev => {
      const newImages = prev.images.filter((_, i) => i !== index);
      return {
        ...prev,
        images: newImages,
        thumbnail: prev.thumbnail === prev.images[index] ? (newImages[0] || '') : prev.thumbnail,
      };
    });
  };

  const setAsThumbnail = (url: string) => {
    setFormData(prev => ({ ...prev, thumbnail: url }));
    toast.success('Thumbnail updated');
  };

  const toggleAttribute = (attributeId: string) => {
    setSelectedAttributes(prev =>
      prev.includes(attributeId)
        ? prev.filter(id => id !== attributeId)
        : [...prev, attributeId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.slug || !formData.price) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (!formData.category_id || !formData.brand_id) {
      toast.error('Please select category and brand');
      return;
    }

    setLoading(true);
    try {
      // Parse key_features (comma-separated string to JSON array)
      const keyFeatures = formData.key_features
        ? JSON.stringify(formData.key_features.split(',').map(f => f.trim()).filter(f => f))
        : null;

      // Parse specifications (JSON string, validate it)
      let specifications = null;
      if (formData.specifications) {
        try {
          // Try to parse to validate JSON
          JSON.parse(formData.specifications);
          specifications = formData.specifications;
        } catch (error) {
          toast.error('Invalid JSON format in specifications field');
          setLoading(false);
          return;
        }
      }

      const productData = {
        name: formData.name,
        slug: formData.slug,
        description: formData.description,
        key_features: keyFeatures,
        specifications: specifications,
        category_id: formData.category_id,
        brand_id: formData.brand_id,
        price: parseFloat(formData.price),
        discount_price: formData.discount_price ? parseFloat(formData.discount_price) : null,
        discount_percentage: formData.discount_percentage ? parseInt(formData.discount_percentage) : null,
        stock_quantity: formData.stock_quantity ? parseInt(formData.stock_quantity) : 0,
        sku: formData.sku,
        images: formData.images,
        thumbnail: formData.thumbnail,
        is_featured: formData.is_featured,
        in_stock: formData.in_stock,
        updated_at: new Date().toISOString(),
      };

      let productId = product?.id;

      if (product) {
        // Update existing product
        const { error } = await supabase
          .from('products')
          .update(productData)
          .eq('id', product.id);

        if (error) throw error;
        toast.success('Product updated successfully');
      } else {
        // Create new product
        const { data, error } = await supabase
          .from('products')
          .insert(productData)
          .select()
          .single();

        if (error) throw error;
        productId = data.id;
        toast.success('Product created successfully');
      }

      // Check for low stock and create notifications (for both create and update)
      const stockQuantity = parseInt(formData.stock_quantity) || 0;
      if (productId && stockQuantity >= 0) {
        await notificationService.checkLowStock(productId, stockQuantity, formData.name);
      }

      // Save product variants/attributes
      if (productId) {
        // Delete existing mappings
        await supabase
          .from('product_attribute_mappings')
          .delete()
          .eq('product_id', productId);

        // Insert new mappings
        if (selectedAttributes.length > 0) {
          const mappings = selectedAttributes.map((attrId, index) => ({
            product_id: productId,
            attribute_id: attrId,
            is_required: true,
            display_order: index,
          }));

          const { error: mappingError } = await supabase
            .from('product_attribute_mappings')
            .insert(mappings);

          if (mappingError) throw mappingError;
        }
      }

      // Close modal first to prevent any visual glitches
      onClose();
      
      // Call onSuccess after a small delay to ensure modal is closed
      setTimeout(() => {
        onSuccess();
      }, 100);
    } catch (error: any) {
      console.error('Error saving product:', error);
      toast.error(error.message || 'Failed to save product');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl max-w-4xl w-full my-8">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white z-10 rounded-t-xl">
          <h2 className="text-xl font-bold text-[#1A1A1A]">
            {product ? 'Edit Product' : 'Add New Product'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto">
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Product Name */}
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-[#1A1A1A] mb-2">
                Product Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="e.g., iPhone 15 Pro"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF7A19]"
                required
              />
            </div>

            {/* Slug */}
            <div>
              <label className="block text-sm font-semibold text-[#1A1A1A] mb-2">
                Slug <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                placeholder="auto-generated"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF7A19]"
                required
              />
            </div>

            {/* SKU */}
            <div>
              <label className="block text-sm font-semibold text-[#1A1A1A] mb-2">
                SKU
              </label>
              <input
                type="text"
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                placeholder="auto-generated"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF7A19]"
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-semibold text-[#1A1A1A] mb-2">
                Category <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.category_id}
                onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF7A19]"
                required
              >
                <option value="">Select Category</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Brand */}
            <div>
              <label className="block text-sm font-semibold text-[#1A1A1A] mb-2">
                Brand <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.brand_id}
                onChange={(e) => setFormData({ ...formData, brand_id: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF7A19]"
                required
              >
                <option value="">Select Brand</option>
                {brands.map((brand) => (
                  <option key={brand.id} value={brand.id}>
                    {brand.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-[#1A1A1A] mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Product description..."
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF7A19]"
            />
          </div>

          {/* Key Features */}
          <div>
            <label className="block text-sm font-semibold text-[#1A1A1A] mb-2">
              Key Features
            </label>
            <textarea
              value={formData.key_features}
              onChange={(e) => setFormData({ ...formData, key_features: e.target.value })}
              placeholder="Enter key features separated by commas (e.g., Fast processor, Long battery life, HD display)"
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF7A19]"
            />
            <p className="text-xs text-gray-500 mt-1">Separate each feature with a comma</p>
          </div>

          {/* Specifications */}
          <div>
            <label className="block text-sm font-semibold text-[#1A1A1A] mb-2">
              Specifications (JSON)
            </label>
            <textarea
              value={formData.specifications}
              onChange={(e) => setFormData({ ...formData, specifications: e.target.value })}
              placeholder='{"processor": "Intel i7", "ram": "16GB", "storage": "512GB SSD", "screen": "15.6 inch"}'
              rows={6}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF7A19] font-mono text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">Enter specifications as JSON object (e.g., {`{"key": "value"}`})</p>
          </div>

          {/* Pricing */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-semibold text-[#1A1A1A] mb-2">
                Base Price <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.price}
                onChange={(e) => {
                  setFormData({ ...formData, price: e.target.value });
                  if (formData.discount_price) {
                    calculateDiscount(e.target.value, formData.discount_price);
                  }
                }}
                placeholder="0.00"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF7A19]"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-[#1A1A1A] mb-2">
                Discount Price
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.discount_price}
                onChange={(e) => {
                  setFormData({ ...formData, discount_price: e.target.value });
                  if (formData.price) {
                    calculateDiscount(formData.price, e.target.value);
                  }
                }}
                placeholder="0.00"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF7A19]"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-[#1A1A1A] mb-2">
                Discount %
              </label>
              <input
                type="number"
                value={formData.discount_percentage}
                readOnly
                placeholder="Auto"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
              />
            </div>
          </div>

          {/* Stock */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-[#1A1A1A] mb-2">
                Stock Quantity
              </label>
              <input
                type="number"
                value={formData.stock_quantity}
                onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })}
                placeholder="0"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF7A19]"
              />
            </div>

            <div className="flex items-center gap-6 pt-8">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="in_stock"
                  checked={formData.in_stock}
                  onChange={(e) => setFormData({ ...formData, in_stock: e.target.checked })}
                  className="w-5 h-5 text-[#FF7A19] border-gray-300 rounded focus:ring-[#FF7A19]"
                />
                <label htmlFor="in_stock" className="text-sm font-medium text-[#1A1A1A]">
                  In Stock
                </label>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="is_featured"
                  checked={formData.is_featured}
                  onChange={(e) => setFormData({ ...formData, is_featured: e.target.checked })}
                  className="w-5 h-5 text-[#FF7A19] border-gray-300 rounded focus:ring-[#FF7A19]"
                />
                <label htmlFor="is_featured" className="text-sm font-medium text-[#1A1A1A]">
                  Featured
                </label>
              </div>
            </div>
          </div>

          {/* Product Images */}
          <div>
            <label className="block text-sm font-semibold text-[#1A1A1A] mb-2">
              Product Images
            </label>
            <div className="space-y-4">
              {/* Upload Buttons */}
              <div>
                <div className="flex gap-2 mb-2">
                  <Button
                    type="button"
                    variant="outline"
                    icon={<ImageIcon size={18} />}
                    onClick={() => setShowMediaPicker(true)}
                  >
                    Select from Library
                  </Button>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageUpload}
                    className="hidden"
                    id="product-images"
                    disabled={uploading}
                  />
                  <label
                    htmlFor="product-images"
                    className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                  >
                    {uploading ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <Upload size={18} />
                    )}
                    {uploading ? 'Uploading...' : 'Upload from Local'}
                  </label>
                </div>
                <p className="text-xs text-[#3A3A3A] mt-2">
                  Choose from media library or upload new images. Multiple images allowed. First image will be thumbnail.
                </p>
              </div>

              {/* Image Gallery */}
              {formData.images.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {formData.images.map((url, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={url}
                        alt={`Product ${index + 1}`}
                        className="w-full h-32 object-cover rounded-lg border-2 border-gray-200"
                      />
                      {formData.thumbnail === url && (
                        <div className="absolute top-2 left-2 bg-[#FF7A19] text-white text-xs px-2 py-1 rounded">
                          Thumbnail
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
                        {formData.thumbnail !== url && (
                          <button
                            type="button"
                            onClick={() => setAsThumbnail(url)}
                            className="px-2 py-1 bg-white text-[#1A1A1A] text-xs rounded hover:bg-gray-100"
                          >
                            Set as Thumbnail
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          className="p-2 bg-red-500 text-white rounded hover:bg-red-600"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Product Variants/Attributes */}
          <div>
            <label className="block text-sm font-semibold text-[#1A1A1A] mb-2">
              Product Variants/Attributes
            </label>
            <p className="text-xs text-[#3A3A3A] mb-3">
              Select attributes and their values for this product. Price adjustments can be set per value.
            </p>
            <ProductVariantManager
              key={product?.id || 'new'} // Force re-render when product changes
              productId={product?.id}
              onVariantChange={(variants) => {
                // Use functional update to avoid stale closure issues
                setProductVariants(prev => {
                  const newVariants = variants;
                  setSelectedAttributes(newVariants.map(v => v.attribute_id));
                  return newVariants;
                });
              }}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 sticky bottom-0 bg-white border-t border-gray-200 -mx-6 px-6 py-4">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={onClose}
              disabled={loading || uploading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              className="flex-1"
              disabled={loading || uploading}
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Saving...
                </>
              ) : product ? (
                'Update Product'
              ) : (
                'Create Product'
              )}
            </Button>
          </div>
        </form>

        {/* Media Picker */}
        <MediaPicker
          isOpen={showMediaPicker}
          onClose={() => setShowMediaPicker(false)}
          onSelect={(url) => {
            setFormData(prev => {
              const newImages = [...prev.images, url];
              return {
                ...prev,
                images: newImages,
                thumbnail: prev.thumbnail || url,
              };
            });
            setShowMediaPicker(false);
          }}
          folder="products"
          multiple={true}
          onSelectMultiple={(urls) => {
            setFormData(prev => {
              const newImages = [...prev.images, ...urls];
              return {
                ...prev,
                images: newImages,
                thumbnail: prev.thumbnail || urls[0],
              };
            });
            setShowMediaPicker(false);
          }}
        />
      </div>
    </div>
  );
}


