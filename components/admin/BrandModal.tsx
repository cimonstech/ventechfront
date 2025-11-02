'use client';

import { useState, useEffect } from 'react';
import { X, Upload, Loader2, ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabase';
import { MediaPicker } from './MediaPicker';

interface BrandModalProps {
  isOpen: boolean;
  onClose: () => void;
  brand?: any;
  onSuccess: () => void;
}

export function BrandModal({ isOpen, onClose, brand, onSuccess }: BrandModalProps) {
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    website: '',
    logo_url: '',
    show_in_mega_menu: false,
  });

  useEffect(() => {
    if (brand) {
      setFormData({
        name: brand.name || '',
        slug: brand.slug || '',
        description: brand.description || '',
        website: brand.website || '',
        logo_url: brand.logo_url || '',
        show_in_mega_menu: brand.show_in_mega_menu || false,
      });
    } else {
      setFormData({
        name: '',
        slug: '',
        description: '',
        website: '',
        logo_url: '',
        show_in_mega_menu: false,
      });
    }
  }, [brand, isOpen]);

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

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image size should be less than 2MB');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'brands');

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/api/upload?folder=${encodeURIComponent('brands')}`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success && data.url) {
        setFormData((prev) => ({ ...prev, logo_url: data.url }));
        toast.success('Logo uploaded successfully');
      } else {
        throw new Error(data.error || 'Upload failed');
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error.message || 'Failed to upload logo');
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
      if (brand) {
        // Update existing brand
        const { error } = await supabase
          .from('brands')
          .update({
            name: formData.name,
            slug: formData.slug,
            description: formData.description,
            website: formData.website,
            logo_url: formData.logo_url,
            show_in_mega_menu: formData.show_in_mega_menu,
            updated_at: new Date().toISOString(),
          })
          .eq('id', brand.id);

        if (error) throw error;
        toast.success('Brand updated successfully');
      } else {
        // Create new brand
        const { error } = await supabase.from('brands').insert({
          name: formData.name,
          slug: formData.slug,
          description: formData.description,
          website: formData.website,
          logo_url: formData.logo_url,
          show_in_mega_menu: formData.show_in_mega_menu,
        });

        if (error) throw error;
        toast.success('Brand created successfully');
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error saving brand:', error);
      toast.error(error.message || 'Failed to save brand');
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
            {brand ? 'Edit Brand' : 'Add New Brand'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Brand Name */}
          <div>
            <label className="block text-sm font-semibold text-[#1A1A1A] mb-2">
              Brand Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="e.g., Apple, Samsung, Dell"
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
              placeholder="e.g., apple, samsung"
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
              placeholder="Brief description of the brand"
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF7A19]"
            />
          </div>

          {/* Website */}
          <div>
            <label className="block text-sm font-semibold text-[#1A1A1A] mb-2">
              Website URL
            </label>
            <input
              type="url"
              value={formData.website}
              onChange={(e) => setFormData({ ...formData, website: e.target.value })}
              placeholder="https://www.example.com"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF7A19]"
            />
          </div>

          {/* Logo Upload */}
          <div>
            <label className="block text-sm font-semibold text-[#1A1A1A] mb-2">
              Brand Logo
            </label>
            <div className="flex items-start gap-4">
              {formData.logo_url && (
                <div className="w-24 h-24 border border-gray-300 rounded-lg overflow-hidden flex-shrink-0">
                  <img
                    src={formData.logo_url}
                    alt="Brand logo"
                    className="w-full h-full object-contain"
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
                    id="logo-upload"
                    disabled={uploading}
                  />
                  <label
                    htmlFor="logo-upload"
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
                  Choose from media library or upload a new image. Recommended: Square image, max 2MB
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
              ) : brand ? (
                'Update Brand'
              ) : (
                'Create Brand'
              )}
            </Button>
          </div>
        </form>

        {/* Media Picker */}
        <MediaPicker
          isOpen={showMediaPicker}
          onClose={() => setShowMediaPicker(false)}
          onSelect={(url) => {
            setFormData(prev => ({ ...prev, logo_url: url }));
            setShowMediaPicker(false);
          }}
          folder="brands"
        />
      </div>
    </div>
  );
}



