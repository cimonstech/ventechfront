'use client';

import { useState, useEffect } from 'react';
import { Upload, Plus, Trash2, Eye, EyeOff, MoveUp, MoveDown } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabase';

interface Banner {
  id: string;
  title: string;
  subtitle: string;
  image_url: string;
  link_url: string;
  button_text: string;
  display_order: number;
  active: boolean;
}

export default function BannersPage() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    subtitle: '',
    image_url: '',
    link_url: '',
    button_text: 'Shop Now',
    display_order: 1,
    active: true,
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
        .filter((b: any) => !b.type || b.type === 'hero') // Include all if no type field exists, or filter by hero
        .map((b: any) => ({
          id: b.id,
          title: b.title || '',
          subtitle: b.subtitle || '',
          image_url: b.image_url || '',
          link_url: b.link_url || b.link || '',
          button_text: b.button_text || 'Shop Now',
          display_order: b.position || b.order || b.display_order || 1,
          active: b.active !== false,
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

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }

    setUploading(true);

    try {
      const uploadFormData = new FormData();
      uploadFormData.append('file', file);

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/api/upload?folder=${encodeURIComponent('banners')}`, {
        method: 'POST',
        body: uploadFormData,
      });

      const data = await response.json();

      if (data.success) {
        setFormData({ ...formData, image_url: data.url });
        toast.success('Image uploaded successfully!');
      } else {
        toast.error(data.error || 'Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.image_url) {
      toast.error('Please upload an image');
      return;
    }

    if (!formData.title) {
      toast.error('Please enter a title');
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error('Please login to create banners');
        return;
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/api/banners`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          title: formData.title,
          subtitle: formData.subtitle || null,
          image_url: formData.image_url,
          link: formData.link_url || null, // Use 'link' column (matches database schema)
          button_text: formData.button_text || 'Shop Now',
          order: formData.display_order || 0, // Use 'order' column (matches database schema)
          active: formData.active !== false,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create banner');
      }

      toast.success('Banner added successfully!');
      setShowForm(false);
      
      // Reset form
      setFormData({
        title: '',
        subtitle: '',
        image_url: '',
        link_url: '',
        button_text: 'Shop Now',
        display_order: banners.length + 1,
        active: true,
      });

      // Refresh banners list
      fetchBanners();
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
            onClick={() => setShowForm(!showForm)}
          >
            {showForm ? 'Cancel' : 'Add New Banner'}
          </Button>
        </div>

        {/* Add Banner Form */}
        {showForm && (
          <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
            <h2 className="text-xl font-bold text-[#1A1A1A] mb-6">Add New Hero Slider</h2>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Image Upload */}
              <div>
                <label className="block text-sm font-semibold text-[#1A1A1A] mb-2">
                  Hero Image *
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-[#FF7A19] transition-colors">
                  {formData.image_url ? (
                    <div className="relative">
                      <img
                        src={formData.image_url}
                        alt="Preview"
                        className="max-h-64 mx-auto rounded-lg"
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
                    <div>
                      <Upload className="mx-auto text-gray-400 mb-4" size={48} />
                      <p className="text-[#3A3A3A] mb-2">
                        {uploading ? 'Uploading...' : 'Click to upload or drag and drop'}
                      </p>
                      <p className="text-sm text-gray-500">
                        JPEG, PNG, WEBP (max 5MB) - Recommended: 1920x600px
                      </p>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        disabled={uploading}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-sm font-semibold text-[#1A1A1A] mb-2">
                  Title *
                </label>
                <input
                  type="text"
                  required
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
                  Add Banner
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowForm(false)}
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
    </div>
  );
}



