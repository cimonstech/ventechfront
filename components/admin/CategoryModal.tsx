'use client';

import { useState, useEffect } from 'react';
import { X, Upload, Loader2, ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabase';
import { MediaPicker } from './MediaPicker';

interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  category?: any;
  onSuccess: () => void;
}

export function CategoryModal({ isOpen, onClose, category, onSuccess }: CategoryModalProps) {
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    image_url: '',
    parent_id: '',
    show_in_mega_menu: false,
    mega_menu_column: '',
  });

  useEffect(() => {
    if (isOpen) {
      fetchCategories();
    }
  }, [isOpen]);

  useEffect(() => {
    if (category) {
      setFormData({
        name: category.name || '',
        slug: category.slug || '',
        description: category.description || '',
        image_url: category.image_url || '',
        parent_id: category.parent_id || '',
        show_in_mega_menu: category.show_in_mega_menu || false,
        mega_menu_column: category.mega_menu_column || '',
      });
    } else {
      setFormData({
        name: '',
        slug: '',
        description: '',
        image_url: '',
        parent_id: '',
        show_in_mega_menu: false,
        mega_menu_column: '',
      });
    }
  }, [category, isOpen]);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name, parent_id')
        .is('parent_id', null)
        .order('name');

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  const handleNameChange = (name: string) => {
    setFormData({
      ...formData,
      name,
      slug: generateSlug(name),
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image size should be less than 2MB');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'categories');

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/api/upload?folder=${encodeURIComponent('categories')}`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success && data.url) {
        console.log('Uploaded image URL:', data.url);
        // Verify the URL is accessible before setting it
        const testImg = new Image();
        testImg.onload = () => {
          setFormData((prev) => ({ ...prev, image_url: data.url }));
          toast.success('Image uploaded successfully');
        };
        testImg.onerror = () => {
          console.error('Image URL not accessible:', data.url);
          toast.error('Image uploaded but URL is not accessible. Please enable R2 public access.');
          // Still set the URL so user can see it
          setFormData((prev) => ({ ...prev, image_url: data.url }));
        };
        testImg.src = data.url;
      } else {
        throw new Error(data.error || 'Upload failed');
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error.message || 'Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.slug) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const categoryData = {
        name: formData.name,
        slug: formData.slug,
        description: formData.description,
        image_url: formData.image_url,
        parent_id: formData.parent_id || null,
        show_in_mega_menu: formData.show_in_mega_menu,
        mega_menu_column: formData.mega_menu_column || null,
        updated_at: new Date().toISOString(),
      };

      if (category) {
        const { error } = await supabase
          .from('categories')
          .update(categoryData)
          .eq('id', category.id);

        if (error) throw error;
        toast.success('Category updated successfully');
      } else {
        const { error } = await supabase.from('categories').insert(categoryData);

        if (error) throw error;
        toast.success('Category created successfully');
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error saving category:', error);
      toast.error(error.message || 'Failed to save category');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
          <h2 className="text-xl font-bold text-[#1A1A1A]">
            {category ? 'Edit Category' : 'Add New Category'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Category Name */}
          <div>
            <label className="block text-sm font-semibold text-[#1A1A1A] mb-2">
              Category Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="e.g., Phones, Laptops, Accessories"
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
              placeholder="e.g., phones, laptops"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF7A19]"
              required
            />
            <p className="text-xs text-[#3A3A3A] mt-1">
              URL-friendly version (auto-generated from name)
            </p>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-[#1A1A1A] mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief description of the category"
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF7A19]"
            />
          </div>

          {/* Parent Category */}
          <div>
            <label className="block text-sm font-semibold text-[#1A1A1A] mb-2">
              Parent Category (Optional)
            </label>
            <select
              value={formData.parent_id}
              onChange={(e) => setFormData({ ...formData, parent_id: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF7A19]"
            >
              <option value="">None (Top Level)</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Thumbnail Upload */}
          <div>
            <label className="block text-sm font-semibold text-[#1A1A1A] mb-2">
              Category Thumbnail
            </label>
            <div className="flex items-start gap-4">
              {formData.image_url && (
                <div className="w-32 h-32 border border-gray-300 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100 relative">
                  <img
                    src={formData.image_url}
                    alt="Category thumbnail"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      // If image fails to load, show error message
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      const parent = target.parentElement;
                      if (parent && !parent.querySelector('.image-error')) {
                        const errorDiv = document.createElement('div');
                        errorDiv.className = 'image-error w-full h-full flex flex-col items-center justify-center p-2 text-xs text-red-500 text-center';
                        errorDiv.innerHTML = `
                          <p class="font-semibold mb-1">Image failed to load</p>
                          <p class="text-gray-400 text-[10px] break-all">${formData.image_url.substring(0, 50)}...</p>
                        `;
                        parent.appendChild(errorDiv);
                      }
                    }}
                    onLoad={(e) => {
                      // Hide any error messages when image loads successfully
                      const parent = (e.target as HTMLImageElement).parentElement;
                      const errorDiv = parent?.querySelector('.image-error');
                      if (errorDiv) {
                        errorDiv.remove();
                      }
                    }}
                  />
                </div>
              )}
              <div className="flex-1">
                <div className="flex gap-2">
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
                    onChange={handleImageUpload}
                    className="hidden"
                    id="thumbnail-upload"
                    disabled={uploading}
                  />
                  <label
                    htmlFor="thumbnail-upload"
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
                  Choose from media library or upload a new image. Recommended: Square image (1:1 ratio), max 2MB
                </p>
              </div>
            </div>
          </div>

          {/* Show in Mega Menu */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="show_mega_menu"
              checked={formData.show_in_mega_menu}
              onChange={(e) =>
                setFormData({ ...formData, show_in_mega_menu: e.target.checked })
              }
              className="w-5 h-5 text-[#FF7A19] border-gray-300 rounded focus:ring-[#FF7A19]"
            />
            <label htmlFor="show_mega_menu" className="text-sm font-medium text-[#1A1A1A]">
              Show in Mega Menu
            </label>
          </div>

          {/* Mega Menu Column (if showing in mega menu) */}
          {formData.show_in_mega_menu && (
            <div>
              <label className="block text-sm font-semibold text-[#1A1A1A] mb-2">
                Mega Menu Column
              </label>
              <select
                value={formData.mega_menu_column}
                onChange={(e) =>
                  setFormData({ ...formData, mega_menu_column: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF7A19]"
              >
                <option value="">Select Column</option>
                <option value="shop-by-type">Shop by Type</option>
                <option value="shop-by-brand">Shop by Brand</option>
                <option value="shop-by-specs">Shop by Specs</option>
                <option value="special">Special</option>
              </select>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4">
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
              ) : category ? (
                'Update Category'
              ) : (
                'Create Category'
              )}
            </Button>
          </div>
        </form>

        {/* Media Picker */}
        <MediaPicker
          isOpen={showMediaPicker}
          onClose={() => setShowMediaPicker(false)}
          onSelect={(url) => {
            setFormData(prev => ({ ...prev, image_url: url }));
            setShowMediaPicker(false);
          }}
          folder="categories"
        />
      </div>
    </div>
  );
}


