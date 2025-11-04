'use client';

import { useState, useEffect } from 'react';
import { X, Upload, Loader2, ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabase';
import { MediaPicker } from './MediaPicker';
import { ProductPicker } from './ProductPicker';

interface SidebarAdModalProps {
  isOpen: boolean;
  onClose: () => void;
  ad?: any;
  onSuccess: () => void;
}

export function SidebarAdModal({ isOpen, onClose, ad, onSuccess }: SidebarAdModalProps) {
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [showProductPicker, setShowProductPicker] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    image_url: '',
    link: '',
    position: 'right',
    show_on: [] as string[],
    slider_group: '',
    active: true,
    sort_order: 0,
  });

  useEffect(() => {
    if (ad) {
      setFormData({
        title: ad.title || '',
        image_url: ad.image_url || '',
        link: ad.link || '',
        position: ad.position || 'right',
        show_on: ad.show_on || [],
        slider_group: ad.slider_group || '',
        active: ad.active !== undefined ? ad.active : true,
        sort_order: ad.sort_order || 0,
      });
    } else {
      setFormData({
        title: '',
        image_url: '',
        link: '',
        position: 'right',
        show_on: [],
        slider_group: '',
        active: true,
        sort_order: 0,
      });
    }
  }, [ad, isOpen]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      // Use centralized upload service that checks media library first
      const { uploadImage } = await import('@/services/image-upload.service');
      
      const result = await uploadImage(file, 'sidebar-ads', true);
      
      if (result.success && result.url) {
        setFormData((prev) => ({ ...prev, image_url: result.url! }));
        if (result.fromLibrary) {
          toast.success('Image selected from media library');
        } else {
          toast.success('Image uploaded successfully');
        }
      } else {
        throw new Error(result.error || 'Upload failed');
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error.message || 'Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const handleShowOnChange = (page: string) => {
    setFormData((prev) => ({
      ...prev,
      show_on: prev.show_on.includes(page)
        ? prev.show_on.filter((p) => p !== page)
        : [...prev.show_on, page],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title || !formData.image_url || !formData.link) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (formData.show_on.length === 0) {
      toast.error('Please select at least one page to show the ad');
      return;
    }

    setLoading(true);
    try {
      const adData = {
        title: formData.title,
        image_url: formData.image_url,
        link: formData.link,
        position: formData.position,
        show_on: formData.show_on,
        slider_group: formData.slider_group || null,
        active: formData.active,
        sort_order: formData.sort_order,
        updated_at: new Date().toISOString(),
      };

      if (ad) {
        const { error } = await supabase
          .from('sidebar_ads')
          .update(adData)
          .eq('id', ad.id);

        if (error) throw error;
        toast.success('Sidebar ad updated successfully');
      } else {
        const { error } = await supabase.from('sidebar_ads').insert(adData);

        if (error) throw error;
        toast.success('Sidebar ad created successfully');
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error saving sidebar ad:', error);
      toast.error(error.message || 'Failed to save sidebar ad');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const availablePages = [
    { value: 'shop', label: 'Shop' },
    { value: 'product', label: 'Product Details' },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
          <h2 className="text-xl font-bold text-[#1A1A1A]">
            {ad ? 'Edit Sidebar Ad' : 'Add New Sidebar Ad'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Ad Title */}
          <div>
            <label className="block text-sm font-semibold text-[#1A1A1A] mb-2">
              Ad Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., iPhone 15 Pro Launch"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF7A19]"
              required
            />
          </div>

          {/* Ad Link - Can be product or URL */}
          <div>
            <label className="block text-sm font-semibold text-[#1A1A1A] mb-2">
              Link <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowProductPicker(true)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm"
              >
                Select Product
              </button>
              <input
                type="text"
                value={formData.link}
                onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                placeholder="Or enter URL: /product/iphone-15-pro or https://..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF7A19]"
                required
              />
            </div>
            <p className="text-xs text-[#3A3A3A] mt-1">
              Select a product or enter a URL (e.g., /deals, /product/slug, or external URL)
            </p>
          </div>

          {/* Image Upload */}
          <div>
            <label className="block text-sm font-semibold text-[#1A1A1A] mb-2">
              Ad Image (1:1 Ratio) <span className="text-red-500">*</span>
            </label>
            <div className="flex items-start gap-4">
              {formData.image_url && (
                <div className="w-32 h-32 border border-gray-300 rounded-lg overflow-hidden flex-shrink-0">
                  <img
                    src={formData.image_url}
                    alt="Ad preview"
                    className="w-full h-full object-cover"
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
                    id="ad-upload"
                    disabled={uploading}
                  />
                  <label
                    htmlFor="ad-upload"
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

          {/* Show On Pages */}
          <div>
            <label className="block text-sm font-semibold text-[#1A1A1A] mb-2">
              Show On Pages <span className="text-red-500">*</span>
            </label>
            <div className="space-y-2">
              {availablePages.map((page) => (
                <div key={page.value} className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id={`page-${page.value}`}
                    checked={formData.show_on.includes(page.value)}
                    onChange={() => handleShowOnChange(page.value)}
                    className="w-5 h-5 text-[#FF7A19] border-gray-300 rounded focus:ring-[#FF7A19]"
                  />
                  <label
                    htmlFor={`page-${page.value}`}
                    className="text-sm font-medium text-[#1A1A1A]"
                  >
                    {page.label}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Sort Order */}
          <div>
            <label className="block text-sm font-semibold text-[#1A1A1A] mb-2">
              Sort Order
            </label>
            <input
              type="number"
              value={formData.sort_order}
              onChange={(e) =>
                setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })
              }
              placeholder="0"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF7A19]"
            />
            <p className="text-xs text-[#3A3A3A] mt-1">
              Lower numbers appear first (0, 1, 2, etc.)
            </p>
          </div>

          {/* Active Toggle */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="active"
              checked={formData.active}
              onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
              className="w-5 h-5 text-[#FF7A19] border-gray-300 rounded focus:ring-[#FF7A19]"
            />
            <label htmlFor="active" className="text-sm font-medium text-[#1A1A1A]">
              Active (Show on website)
            </label>
          </div>

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
              ) : ad ? (
                'Update Ad'
              ) : (
                'Create Ad'
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
          folder="uploads"
        />

        {/* Product Picker */}
        <ProductPicker
          isOpen={showProductPicker}
          onClose={() => setShowProductPicker(false)}
          onSelect={(product) => {
            setFormData(prev => ({ 
              ...prev, 
              link: `/product/${product.slug}`,
              title: prev.title || product.name,
              image_url: prev.image_url || product.image_url || '',
            }));
            setShowProductPicker(false);
            toast.success(`Product "${product.name}" selected`);
          }}
        />
      </div>
    </div>
  );
}


