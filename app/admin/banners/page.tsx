'use client';

import { useState, useEffect } from 'react';
import { Upload, Plus, Trash2, ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { AccessDenied, EmptyState, ErrorState, TableSkeleton } from '@/components/ui-states';
import { noteQueryFail } from '@/lib/queryState';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabase';
import { MediaPicker } from '@/components/admin/MediaPicker';
import { accessDeniedMessage } from '@/lib/access';
import { useAccess } from '@/context/AccessContext';
import {
  AdminPageHeader,
  AdminRowCard,
  ConfirmDialog,
  ResponsiveTable,
  RowActions,
} from '@/components/admin/list';

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
  const { canEdit } = useAccess();
  const canEditContent = canEdit('content');
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [forbidden, setForbidden] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Banner | null>(null);
  const [deleting, setDeleting] = useState(false);

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
        throw new Error(accessDeniedMessage(response.status, errorData.message || `Failed to fetch banners: ${response.status} ${response.statusText}`));
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
      setLoaded(true);
      setFailed(false);
      setForbidden(false);
    } catch (error: any) {
      console.error('Error fetching banners:', error);
      const kind = noteQueryFail(error);
      if (kind === 'forbidden') setForbidden(true);
      else if (kind !== 'unauthorized') setFailed(true);
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

  const handleDelete = async () => {
    if (!deleteTarget) return;

    setDeleting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error('Please login to delete banners');
        return;
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/api/banners/${deleteTarget.id}`, {
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
      setDeleteTarget(null);
      
      // Refresh banners list
      fetchBanners();
    } catch (error: any) {
      console.error('Delete error:', error);
      toast.error(error.message || 'Failed to delete banner');
    } finally {
      setDeleting(false);
    }
  };

  const bannerActions = (banner: Banner) =>
    canEditContent
      ? [
          { label: 'Edit', onClick: () => handleEdit(banner) },
          {
            label: banner.active ? 'Deactivate' : 'Activate',
            onClick: () => void toggleActive(banner.id),
          },
          { label: 'Delete', destructive: true, onClick: () => setDeleteTarget(banner) },
        ]
      : [];

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
    <div className="min-w-0">
      <AdminPageHeader
        title="Banners"
        subtitle={`${banners.length} banner${banners.length === 1 ? '' : 's'}`}
        primary={
          canEditContent
            ? {
                label: showForm ? 'Cancel' : 'Add banner',
                icon: showForm ? undefined : <Plus size={16} />,
                onClick: () => {
                  if (showForm) {
                    handleCancel();
                  } else {
                    setShowForm(true);
                    setEditingBanner(null);
                  }
                },
              }
            : undefined
        }
      />

        {/* Add/Edit Banner Form */}
        {canEditContent && showForm && (
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

        {forbidden ? (
          <AccessDenied title="You don't have access" description="You don't have access to this data." primary={{ label: 'Go back', href: '/admin' }} />
        ) : failed && !loaded ? (
          <ErrorState title="We couldn't load banners" description="Try again in a moment." primary={{ label: 'Try again', onClick: () => void fetchBanners() }} />
        ) : loading && !loaded ? (
          <TableSkeleton rows={4} />
        ) : banners.length === 0 ? (
          <EmptyState title="No banners yet" description="Add a hero slider to show on the home page." />
        ) : (
          <ResponsiveTable
            headers={
              <tr>
                <th className="px-4 py-3">Banner</th>
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            }
            cards={banners.map((banner) => (
              <AdminRowCard
                key={banner.id}
                name={banner.title || 'Untitled banner'}
                thumbnail={banner.image_url || undefined}
                status={
                  <Badge variant={banner.active ? 'success' : 'default'} size="sm">
                    {banner.active ? 'Active' : 'Inactive'}
                  </Badge>
                }
                facts={[
                  { label: 'Subtitle', value: banner.subtitle || '—' },
                  { label: 'Order', value: banner.display_order },
                ]}
                actions={<RowActions name={banner.title || 'Untitled banner'} actions={bannerActions(banner)} />}
              />
            ))}
          >
            {banners.map((banner) => (
              <tr key={banner.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="flex min-w-0 items-center gap-3">
                    {banner.image_url ? (
                      <div className="h-16 w-24 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                        <img
                          src={banner.image_url}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      </div>
                    ) : null}
                    <div className="min-w-0">
                      <p className="truncate font-medium text-[#1A1A1A]">{banner.title || 'Untitled banner'}</p>
                      <p className="truncate text-sm text-[#3A3A3A]">{banner.subtitle}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-[#1A1A1A]">{banner.display_order}</td>
                <td className="px-4 py-3">
                  <Badge variant={banner.active ? 'success' : 'default'} size="sm">
                    {banner.active ? 'Active' : 'Inactive'}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-right">
                  <RowActions name={banner.title || 'Untitled banner'} actions={bannerActions(banner)} />
                </td>
              </tr>
            ))}
          </ResponsiveTable>
        )}

      {deleteTarget ? (
        <ConfirmDialog
          title="Delete this banner?"
          confirmLabel="Delete"
          busy={deleting}
          onClose={() => setDeleteTarget(null)}
          onConfirm={() => void handleDelete()}
        >
          {deleteTarget.title || 'This banner'} will be removed.
        </ConfirmDialog>
      ) : null}

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



