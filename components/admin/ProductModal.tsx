'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
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
  const pathname = usePathname();
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
    is_pre_order: false,
    pre_order_available: false,
    estimated_arrival_date: '',
  });
  
  const [keySpecs, setKeySpecs] = useState<Array<{ label: string; color: string }>>([]);

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

      // Format estimated_arrival_date if it exists
      const estimatedDate = product.estimated_arrival_date 
        ? new Date(product.estimated_arrival_date).toISOString().split('T')[0]
        : '';

      const isPreOrder = product.is_pre_order || false;
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
        // Pre-order products cannot be featured
        is_featured: isPreOrder ? false : (product.is_featured || false),
        in_stock: product.in_stock !== undefined ? product.in_stock : true,
        is_pre_order: isPreOrder,
        pre_order_available: isPreOrder, // Auto-set based on is_pre_order
        estimated_arrival_date: estimatedDate,
      });
      fetchProductAttributes(product.id);
      // Reset productVariants when opening a product - ProductVariantManager will fetch them
      setProductVariants([]);
      
      // Load key_specs if they exist
      if (product.key_specs) {
        try {
          const specs = typeof product.key_specs === 'string' 
            ? JSON.parse(product.key_specs) 
            : product.key_specs;
          setKeySpecs(Array.isArray(specs) ? specs : []);
        } catch (error) {
          console.error('Error parsing key_specs:', error);
          setKeySpecs([]);
        }
      } else {
        setKeySpecs([]);
      }
    } else {
      resetForm();
      setProductVariants([]);
    }
  }, [product, isOpen]);

  const resetForm = () => {
    // Auto-enable pre-order if we're on the pre-orders page
    const isPreOrderPage = pathname === '/admin/pre-orders';
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
      is_pre_order: isPreOrderPage,
      pre_order_available: isPreOrderPage, // Auto-set to true if on pre-orders page
      estimated_arrival_date: '',
    });
    setSelectedAttributes([]);
    setKeySpecs([]);
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
      // Use centralized upload service that checks media library first
      const { uploadImages } = await import('@/services/image-upload.service');
      
      const filesArray = Array.from(files);
      const uploadResults = await uploadImages(filesArray, 'products', true);
      
      // Filter successful uploads
      const successfulUploads = uploadResults.filter(r => r.success && r.url);
      const failedUploads = uploadResults.filter(r => !r.success);
      
      if (failedUploads.length > 0) {
        const errors = failedUploads.map(r => r.error).filter(Boolean);
        toast.error(errors.join(', ') || 'Some uploads failed');
      }
      
      if (successfulUploads.length > 0) {
        const uploadedUrls = successfulUploads.map(r => r.url!);
        const fromLibrary = successfulUploads.filter(r => r.fromLibrary).length;
        
        setFormData(prev => ({
          ...prev,
          images: [...prev.images, ...uploadedUrls],
          thumbnail: prev.thumbnail || uploadedUrls[0],
        }));
        
        if (fromLibrary > 0) {
          toast.success(`${uploadedUrls.length} image(s) selected (${fromLibrary} from library)`);
        } else {
          toast.success(`${uploadedUrls.length} image(s) uploaded successfully`);
        }
      } else {
        toast.error('No images were uploaded successfully');
      }
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

  // Key Specs management functions
  const addKeySpec = () => {
    if (keySpecs.length >= 6) {
      toast.error('Maximum 6 key specs allowed');
      return;
    }
    setKeySpecs([...keySpecs, { label: '', color: '#9333ea' }]); // Default purple color
  };

  const removeKeySpec = (index: number) => {
    setKeySpecs(keySpecs.filter((_, i) => i !== index));
  };

  const updateKeySpec = (index: number, field: 'label' | 'color', value: string) => {
    const updated = [...keySpecs];
    updated[index] = { ...updated[index], [field]: value };
    setKeySpecs(updated);
  };

  // Predefined color options for quick selection
  const colorOptions = [
    { name: 'Purple', value: '#9333ea' },
    { name: 'Blue', value: '#2563eb' },
    { name: 'Green', value: '#16a34a' },
    { name: 'Cyan', value: '#0891b2' },
    { name: 'Orange', value: '#ea580c' },
    { name: 'Red', value: '#dc2626' },
    { name: 'Pink', value: '#db2777' },
    { name: 'Indigo', value: '#4f46e5' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.slug || !formData.price) {
      toast.error('Please fill in all required fields');
      return;
    }

    // Validate stock quantity is provided and is a valid number
    const stockQuantity = parseInt(formData.stock_quantity);
    if (!formData.stock_quantity || isNaN(stockQuantity) || stockQuantity < 0) {
      toast.error('Please enter a valid stock quantity (must be 0 or greater)');
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

      // Validate key specs (filter out empty labels)
      const validKeySpecs = keySpecs.filter(spec => spec.label.trim() !== '');

      const productData = {
        name: formData.name,
        slug: formData.slug,
        description: formData.description,
        key_features: keyFeatures,
        // Supabase JSONB accepts objects directly, but we can also send as JSON string
        // The service layer will parse it back to an array
        key_specs: validKeySpecs.length > 0 ? validKeySpecs : null,
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
        // Pre-order products cannot be featured
        is_featured: formData.is_pre_order ? false : formData.is_featured,
        // ✅ Auto-sync in_stock with stock_quantity (backend also does this, but frontend ensures consistency)
        in_stock: (formData.stock_quantity ? parseInt(formData.stock_quantity) : 0) > 0,
        is_pre_order: formData.is_pre_order,
        pre_order_available: formData.is_pre_order, // Auto-set to true if is_pre_order is true
        estimated_arrival_date: formData.estimated_arrival_date ? new Date(formData.estimated_arrival_date).toISOString() : null,
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
        // Delete existing mappings and selected options
        await supabase
          .from('product_attribute_mappings')
          .delete()
          .eq('product_id', productId);
        
        await supabase
          .from('product_selected_options')
          .delete()
          .eq('product_id', productId);

        // Insert new mappings and selected options
        if (productVariants.length > 0) {
          // Save attribute mappings
          const mappings = productVariants.map((variant, index) => ({
            product_id: productId,
            attribute_id: variant.attribute_id,
            is_required: variant.is_required,
            display_order: index,
          }));

          const { error: mappingError } = await supabase
            .from('product_attribute_mappings')
            .insert(mappings);

          if (mappingError) throw mappingError;

          // Save selected options for each variant
          console.log('Saving productVariants:', productVariants);
          const selectedOptions = productVariants.flatMap(variant =>
            variant.selected_options.map((optionId: string) => ({
              product_id: productId,
              attribute_id: variant.attribute_id,
              option_id: optionId,
            }))
          );

          console.log('Saving selectedOptions:', selectedOptions);

          if (selectedOptions.length > 0) {
            const { error: optionsError } = await supabase
              .from('product_selected_options')
              .insert(selectedOptions);

            if (optionsError) {
              console.error('Error saving selected options:', optionsError);
              throw optionsError;
            }
            console.log('Successfully saved selected options');
          } else {
            console.warn('No selected options to save');
          }
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

          {/* Key Specs Buttons */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-semibold text-[#1A1A1A]">
                Key Specs Buttons (Max 6)
              </label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addKeySpec}
                disabled={keySpecs.length >= 6}
                icon={<Plus size={16} />}
              >
                Add Spec
              </Button>
            </div>
            <p className="text-xs text-gray-500 mb-3">
              These will appear as colored buttons on product cards. Desktop: above "Add to Cart", Mobile: below prices.
            </p>
            
            {keySpecs.length === 0 ? (
              <div className="p-4 border-2 border-dashed border-gray-300 rounded-lg text-center text-gray-500 text-sm">
                No key specs added. Click "Add Spec" to add one.
              </div>
            ) : (
              <div className="space-y-3">
                {keySpecs.map((spec, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 border border-gray-300 rounded-lg bg-gray-50">
                    <div className="flex-1">
                      <input
                        type="text"
                        value={spec.label}
                        onChange={(e) => updateKeySpec(index, 'label', e.target.value)}
                        placeholder="e.g., 8GB RAM, 512GB SSD, Intel i7"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF7A19] text-sm"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Color Picker */}
                      <input
                        type="color"
                        value={spec.color}
                        onChange={(e) => updateKeySpec(index, 'color', e.target.value)}
                        className="w-12 h-10 border border-gray-300 rounded-lg cursor-pointer"
                        title="Choose color"
                      />
                      {/* Quick Color Options */}
                      <div className="flex gap-1">
                        {colorOptions.slice(0, 4).map((color) => (
                          <button
                            key={color.value}
                            type="button"
                            onClick={() => updateKeySpec(index, 'color', color.value)}
                            className="w-6 h-6 rounded border-2 border-gray-300 hover:border-gray-500 transition-colors"
                            style={{ backgroundColor: color.value }}
                            title={color.name}
                          />
                        ))}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeKeySpec(index)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Remove spec"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
              </div>
            )}
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
                Stock Quantity <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={formData.stock_quantity}
                onChange={(e) => {
                  const stockQty = parseInt(e.target.value) || 0;
                  setFormData({ 
                    ...formData, 
                    stock_quantity: e.target.value,
                    // ✅ Auto-sync in_stock: true if stock > 0, false if stock === 0
                    in_stock: stockQty > 0
                  });
                }}
                placeholder="Enter stock quantity (required)"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF7A19]"
                min="0"
                required
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

              {/* Featured checkbox - hidden for pre-order products */}
              {!formData.is_pre_order && (
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
              )}
            </div>

            {/* Pre-Order Section */}
            <div className="pt-8 border-t border-gray-200">
              <h3 className="text-lg font-semibold text-[#1A1A1A] mb-4">Pre-Order Settings</h3>
              
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="is_pre_order"
                    checked={formData.is_pre_order}
                    onChange={(e) => {
                      const isPreOrder = e.target.checked;
                      // If enabling pre-order, disable featured (pre-order products can't be featured)
                      setFormData({ 
                        ...formData, 
                        is_pre_order: isPreOrder,
                        is_featured: isPreOrder ? false : formData.is_featured // Uncheck featured if pre-order is enabled
                      });
                    }}
                    className="w-5 h-5 text-[#FF7A19] border-gray-300 rounded focus:ring-[#FF7A19]"
                  />
                  <label htmlFor="is_pre_order" className="text-sm font-medium text-[#1A1A1A]">
                    Enable Pre-Order
                  </label>
                  <p className="text-xs text-gray-500">
                    Products added from the pre-orders page will automatically show on the pre-order page
                  </p>
                </div>

                {formData.is_pre_order && (
                  <div>
                    <label htmlFor="estimated_arrival_date" className="block text-sm font-medium text-[#1A1A1A] mb-2">
                      Estimated Arrival Date (Optional)
                    </label>
                    <input
                      type="date"
                      id="estimated_arrival_date"
                      value={formData.estimated_arrival_date}
                      onChange={(e) => setFormData({ ...formData, estimated_arrival_date: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF7A19]"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      This date will be shown to customers as an estimated arrival date
                    </p>
                  </div>
                )}
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
                console.log('ProductVariantManager: Variants changed', variants);
                // Use functional update to avoid stale closure issues
                setProductVariants(prev => {
                  const newVariants = variants;
                  console.log('ProductModal: Setting productVariants', newVariants);
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


