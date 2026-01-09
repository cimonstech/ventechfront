'use client';

import { useState, useEffect } from 'react';
import { Upload, Plus, Trash2, Eye, EyeOff, MoveUp, MoveDown, ImageIcon, Edit } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabase';
import { MediaPicker } from '@/components/admin/MediaPicker';

interface Banner {
  id: string;
  title: string;
  subtitle: string;
  image_url: string;
  link_url: string;
  button_text: string;
  display_order: number;
  active: boolean;
  text_color?: string;
}

export default function BannersPage() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showMediaPicker, setShowMediaPicker] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    subtitle: '',
    image_url: '',
    link_url: '',
    button_text: 'Shop Now',
    display_order: 1,
    active: true,
    text_color: '#FFFFFF',
  });

  const fetchBanners = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error('Please login to manage banners');
        setLoading(false);
        return;
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/api/banners`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to fetch banners' }));
        throw new Error(errorData.message || `Failed to fetch banners: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      
      // Filter for hero type banners and map to expected format
      const heroBanners = (result.data || [])
        .filter((b: any) => !b.type || b.type === 'hero')
        .map((b: any) => ({
          id: b.id,
          title: b.title || '',
          subtitle: b.subtitle || '',
          image_url: b.image_url || '',
          link_url: b.link_url || b.link || '',
          button_text: b.button_text || 'Shop Now',
          display_order: b.position || b.order || b.display_order || 1,
          active: b.active !== false,
          text_color: b.text_color ?? '#FFFFFF',
        }))
        .sort((a: any, b: any) => a.display_order - b.display_order);

      setBanners(heroBanners);
    } catch (error: any) {
      console.error('Error fetching banners:', error);
      const errorMessage = error.message || 'Failed to load banners';
      toast.error(errorMessage);
      setBanners([]);
      
      // If it's an auth error, log more details
      if (errorMessage.includes('Unauthorized') || errorMessage.includes('401')) {
        console.error('Authentication failed. Please check your session.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBanners();
  }, []);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      // Use centralized upload service that checks media library first
      const { uploadImage } = await import('@/services/image-upload.service');
      
      const result = await uploadImage(file, 'banners', true);
      
      if (result.success && result.url) {
        setFormData({ ...formData, image_url: result.url });
        if (result.fromLibrary) {
          toast.success('Image selected from media library');
        } else {
          toast.success('Image uploaded successfully!');
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

  const handleEdit = (banner: Banner) => {
    setEditingBanner(banner);
    setFormData({
      title: banner.title || '',
      subtitle: banner.subtitle || '',
      image_url: banner.image_url || '',
      link_url: banner.link_url || '',
      button_text: banner.button_text || 'Shop Now',
      display_order: banner.display_order || 1,
      active: banner.active !== false,
      text_color: banner.text_color ?? '#FFFFFF',
    });
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingBanner(null);
    setFormData({
      title: '',
      subtitle: '',
      image_url: '',
      link_url: '',
      button_text: 'Shop Now',
      display_order: banners.length + 1,
      active: true,
      text_color: '#FFFFFF',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.image_url) {
      toast.error('Please upload an image');
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error('Please login to manage banners');
        return;
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const isEditing = !!editingBanner;
      const response = await fetch(
        isEditing ? `${apiUrl}/api/banners/${editingBanner!.id}` : `${apiUrl}/api/banners`,
        {
          method: isEditing ? 'PUT' : 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            title: formData.title || null,
            subtitle: formData.subtitle || null,
            image_url: formData.image_url,
            link: formData.link_url || null,
            button_text: formData.button_text || null,
            order: formData.display_order || 0,
            active: formData.active !== false,
            text_color: formData.text_color,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || `Failed to ${isEditing ? 'update' : 'create'} banner`);
      }

      await response.json();

      toast.success(`Banner ${isEditing ? 'updated' : 'added'} successfully!`);
      handleCancel();

      // Refresh banners list
      await fetchBanners();
    } catch (error: any) {
      console.error('Save error:', error);
      toast.error(error.message || 'Failed to save banner');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this banner?')) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error('Please login to delete banners');
        return;
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/api/banners/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete banner');
      }

      toast.success('Banner deleted successfully!');
      
      // Refresh banners list
      fetchBanners();
    } catch (error: any) {
      console.error('Delete error:', error);
      toast.error(error.message || 'Failed to delete banner');
    }
  };

  const toggleActive = async (id: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error('Please login to update banners');
        return;
      }

      const banner = banners.find(b => b.id === id);
      if (!banner) return;

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/api/banners/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          active: !banner.active,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update banner');
      }

      toast.success(`Banner ${!banner.active ? 'activated' : 'deactivated'}!`);
      
      // Refresh banners list
      fetchBanners();
    } catch (error: any) {
      console.error('Update error:', error);
      toast.error(error.message || 'Failed to update status');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-[#1A1A1A]">Homepage Hero Sliders</h1>
            <p className="text-[#3A3A3A] mt-2">Manage banner images for the homepage carousel</p>
          </div>
          <Button
            variant="primary"
            icon={<Plus size={20} />}
            onClick={() => {
              if (showForm) {
                handleCancel();
              } else {
                setShowForm(true);
                setEditingBanner(null);
              }
            }}
          >
            {showForm ? 'Cancel' : 'Add New Banner'}
          </Button>
        </div>

        {/* Add/Edit Banner Form */}
        {showForm && (
          <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
            <h2 className="text-xl font-bold text-[#1A1A1A] mb-6">
              {editingBanner ? 'Edit Hero Slider' : 'Add New Hero Slider'}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Image Upload */}
              <div>
                <label className="block text-sm font-semibold text-[#1A1A1A] mb-2">
                  Hero Image *
                </label>
                {formData.image_url ? (
                  <div className="relative">
                    <img
                      src={formData.image_url}
                      alt="Preview"
                      className="max-h-64 mx-auto rounded-lg border border-gray-300"
                    />
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, image_url: '' })}
                      className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full hover:bg-red-600"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        icon={<ImageIcon size={18} />}
                        onClick={() => setShowMediaPicker(true)}
                      >
                        Select from R2/Media Library
                      </Button>
                      <div className="relative flex-1">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          disabled={uploading}
                          className="hidden"
                          id="banner-upload"
                        />
                        <label
                          htmlFor="banner-upload"
                          className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors w-full justify-center"
                        >
                          <Upload size={18} />
                          {uploading ? 'Uploading...' : 'Upload from Local'}
                        </label>
                      </div>
                    </div>
                    <p className="text-xs text-[#3A3A3A] text-center">
                      Choose from media library or upload a new image. Recommended: 1920x600px, max 5MB
                    </p>
                  </div>
                )}
              </div>

              {/* Title */}
              <div>
                <label className="block text-sm font-semibold text-[#1A1A1A] mb-2">
                  Title
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., iPhone 15 Pro Max Now Available"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF7A19]"
                />
              </div>

              {/* Subtitle */}
              <div>
                <label className="block text-sm font-semibold text-[#1A1A1A] mb-2">
                  Subtitle
                </label>
                <input
                  type="text"
                  value={formData.subtitle}
                  onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                  placeholder="e.g., Starting from GHS 7,999"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF7A19]"
                />
              </div>

              {/* Button Text & Link */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-[#1A1A1A] mb-2">
                    Button Text
                  </label>
                  <input
                    type="text"
                    value={formData.button_text}
                    onChange={(e) => setFormData({ ...formData, button_text: e.target.value })}
                    placeholder="Shop Now"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF7A19]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#1A1A1A] mb-2">
                    Link URL
                  </label>
                  <input
                    type="text"
                    value={formData.link_url}
                    onChange={(e) => setFormData({ ...formData, link_url: e.target.value })}
                    placeholder="/shop/iphone-15-pro"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF7A19]"
                  />
                </div>
              </div>

              {/* Text Color */}
              <div>
                <label className="block text-sm font-semibold text-[#1A1A1A] mb-2">
                  Text Color
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="color"
                    value={formData.text_color}
                    onChange={(e) => setFormData({ ...formData, text_color: e.target.value })}
                    className="w-20 h-12 border border-gray-300 rounded-lg cursor-pointer"
                  />
                  <input
                    type="text"
                    value={formData.text_color}
                    onChange={(e) => setFormData({ ...formData, text_color: e.target.value })}
                    placeholder="#FFFFFF"
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF7A19]"
                  />
                </div>
                <p className="text-xs text-[#3A3A3A] mt-1">
                  Choose the color for title, subtitle, and button text
                </p>
              </div>

              {/* Display Order & Active */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-[#1A1A1A] mb-2">
                    Display Order
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.display_order}
                    onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF7A19]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#1A1A1A] mb-2">
                    Status
                  </label>
                  <select
                    value={formData.active ? 'active' : 'inactive'}
                    onChange={(e) => setFormData({ ...formData, active: e.target.value === 'active' })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF7A19]"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              {/* Submit */}
              <div className="flex gap-4">
                <Button type="submit" variant="primary" className="flex-1">
                  {editingBanner ? 'Update Banner' : 'Add Banner'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* Banners List */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-bold text-[#1A1A1A]">Current Hero Sliders</h2>
          </div>

          {loading ? (
            <div className="p-8 text-center text-[#3A3A3A]">Loading banners...</div>
          ) : banners.length === 0 ? (
            <div className="p-8 text-center text-[#3A3A3A]">
              No banners yet. Click "Add New Banner" to create your first hero slider!
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {banners.map((banner) => (
                <div key={banner.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex gap-6">
                    {/* Image Preview */}
                    <img
                      src={banner.image_url}
                      alt={banner.title}
                      className="w-48 h-32 object-cover rounded-lg"
                    />

                    {/* Details */}
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-[#1A1A1A] mb-1">{banner.title}</h3>
                      <p className="text-[#3A3A3A] mb-3">{banner.subtitle}</p>
                      <div className="flex items-center gap-4 text-sm text-[#3A3A3A]">
                        <span>Order: {banner.display_order}</span>
                        <span className={banner.active ? 'text-green-600' : 'text-red-600'}>
                          {banner.active ? '● Active' : '○ Inactive'}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => handleEdit(banner)}
                        className="p-2 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors"
                        title="Edit Banner"
                      >
                        <Edit size={20} />
                      </button>
                      <button
                        onClick={() => toggleActive(banner.id)}
                        className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                        title={banner.active ? 'Deactivate' : 'Activate'}
                      >
                        {banner.active ? <EyeOff size={20} /> : <Eye size={20} />}
                      </button>
                      <button
                        onClick={() => handleDelete(banner.id)}
                        className="p-2 hover:bg-red-100 text-red-600 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Media Picker */}
      <MediaPicker
        isOpen={showMediaPicker}
        onClose={() => setShowMediaPicker(false)}
        onSelect={(url) => {
          setFormData(prev => ({ ...prev, image_url: url }));
          setShowMediaPicker(false);
          toast.success('Image selected from media library');
        }}
        folder="banners"
      />
    </div>
  );
}



