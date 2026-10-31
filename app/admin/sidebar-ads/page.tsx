'use client';

import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { SidebarAdModal } from '@/components/admin/SidebarAdModal';
import { AccessDenied, EmptyState, ErrorState, NoResults, TableSkeleton, UpdatingNotice } from '@/components/ui-states';
import { useListQuery } from '@/hooks/useListQuery';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { useAccess } from '@/context/AccessContext';
import {
  AdminPageHeader,
  AdminRowCard,
  ConfirmDialog,
  FilterBar,
  ResponsiveTable,
  RowActions,
} from '@/components/admin/list';
import { Badge } from '@/components/ui/Badge';

interface SidebarAd {
  id: string;
  title: string;
  image_url: string;
  link: string;
  position: 'right';
  show_on: string[];
  active: boolean;
  sort_order: number;
  created_at: string;
}

export default function SidebarAdsPage() {
  const { canEdit } = useAccess();
  const canEditContent = canEdit('content');
  const query = useListQuery();
  const [ads, setAds] = useState<SidebarAd[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingAd, setEditingAd] = useState<SidebarAd | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SidebarAd | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchAds();
  }, []);

  const fetchAds = async () => {
    await query.run(async () => {
      const { data, error } = await supabase
        .from('sidebar_ads')
        .select('*')
        .order('sort_order', { ascending: true });
      if (error) throw error;
      setAds((data || []).map((ad: any) => ({
        id: ad.id,
        title: ad.title || '',
        image_url: ad.image_url || '',
        link: ad.link || '',
        position: ad.position || 'right',
        show_on: Array.isArray(ad.show_on) ? ad.show_on : (ad.show_on ? [ad.show_on] : []),
        active: ad.active !== false,
        sort_order: ad.sort_order || 0,
        created_at: ad.created_at || new Date().toISOString(),
      })));
    });
  };

  const filteredAds = ads.filter((ad) =>
    ad.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleActive = async (adId: string) => {
    try {
      const ad = ads.find((a) => a.id === adId);
      if (!ad) return;

      const { error } = await supabase
        .from('sidebar_ads')
        .update({ active: !ad.active })
        .eq('id', adId);

      if (error) throw error;
      await fetchAds();
      toast.success('Ad status updated');
    } catch (error: any) {
      console.error('Error updating ad:', error);
      toast.error('Failed to update ad');
    }
  };

  const deleteAd = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const { error } = await supabase
        .from('sidebar_ads')
        .delete()
        .eq('id', deleteTarget.id);

      if (error) throw error;
      setDeleteTarget(null);
      await fetchAds();
      toast.success('Ad deleted successfully');
    } catch (error: any) {
      console.error('Error deleting ad:', error);
      toast.error('Failed to delete ad');
    } finally {
      setDeleting(false);
    }
  };

  const adActions = (ad: SidebarAd) =>
    canEditContent
      ? [
          { label: 'Edit', onClick: () => setEditingAd(ad) },
          {
            label: ad.active ? 'Deactivate' : 'Activate',
            onClick: () => void toggleActive(ad.id),
          },
          { label: 'Delete', destructive: true, onClick: () => setDeleteTarget(ad) },
        ]
      : [];

  if (query.forbidden) {
    return (
      <AccessDenied
        title="You don't have access"
        description="You don't have access to this data."
        primary={{ label: 'Go back', href: '/admin' }}
      />
    );
  }

  if (query.error && !query.loaded) {
    return (
      <ErrorState
        title="We couldn't load sidebar ads"
        description="Try again in a moment."
        primary={{ label: 'Try again', onClick: () => void fetchAds() }}
      />
    );
  }

  if (query.loading && !query.loaded) {
    return <TableSkeleton />;
  }

  return (
    <div className="min-w-0">
      {query.updating ? <UpdatingNotice /> : null}
      <AdminPageHeader
        title="Sidebar ads"
        subtitle={`${ads.length} ad${ads.length === 1 ? '' : 's'}`}
        primary={
          canEditContent
            ? { label: 'Add ad', icon: <Plus size={16} />, onClick: () => setShowAddModal(true) }
            : undefined
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <p className="mb-1 text-sm text-[#3A3A3A]">Total Ads</p>
          <p className="text-3xl font-bold text-[#1A1A1A]">{ads.length}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <p className="mb-1 text-sm text-[#3A3A3A]">Active Ads</p>
          <p className="text-3xl font-bold text-green-600">
            {ads.filter((a) => a.active).length}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <p className="mb-1 text-sm text-[#3A3A3A]">Inactive Ads</p>
          <p className="text-3xl font-bold text-gray-400">
            {ads.filter((a) => !a.active).length}
          </p>
        </div>
      </div>

      <div className="mb-6 rounded-xl border-2 border-blue-200 bg-blue-50 p-4">
        <p className="text-sm text-blue-700">
          <strong>Tip:</strong> Sidebar ads are displayed in a 1:1 ratio on the right side
          of the page. They rotate automatically if multiple ads are active for the same page.
        </p>
      </div>

      <FilterBar
        search={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search ads"
      />

      {filteredAds.length === 0 ? (
        searchQuery ? (
          <NoResults primary={{ label: 'Clear filters', onClick: () => setSearchQuery('') }} />
        ) : (
          <EmptyState
            title="No sidebar ads yet"
            description="Add an ad to show in the storefront sidebar."
            primary={canEditContent ? { label: 'Add ad', onClick: () => setShowAddModal(true) } : undefined}
          />
        )
      ) : (
        <ResponsiveTable
          headers={
            <tr>
              <th className="px-4 py-3">Preview</th>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Show on</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Order</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          }
          cards={filteredAds.map((ad) => (
            <AdminRowCard
              key={ad.id}
              name={ad.title}
              thumbnail={ad.image_url || undefined}
              status={
                <Badge variant={ad.active ? 'success' : 'default'} size="sm">
                  {ad.active ? 'Active' : 'Inactive'}
                </Badge>
              }
              facts={[
                { label: 'Show on', value: ad.show_on.join(', ') || '—' },
                { label: 'Order', value: ad.sort_order },
                { label: 'Link', value: ad.link || '—' },
              ]}
              actions={<RowActions name={ad.title} actions={adActions(ad)} />}
            />
          ))}
        >
          {filteredAds.map((ad) => (
            <tr key={ad.id} className="hover:bg-gray-50">
              <td className="px-4 py-3">
                <div className="h-16 w-16 overflow-hidden rounded-lg bg-gray-100">
                  <img
                    src={ad.image_url}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                </div>
              </td>
              <td className="px-4 py-3">
                <p className="font-semibold text-[#1A1A1A]">{ad.title}</p>
                <p className="text-xs text-[#3A3A3A]">{ad.link}</p>
              </td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-1">
                  {ad.show_on.map((page, index) => (
                    <span
                      key={index}
                      className="rounded bg-gray-100 px-2 py-1 text-xs text-[#3A3A3A]"
                    >
                      {page}
                    </span>
                  ))}
                </div>
              </td>
              <td className="px-4 py-3">
                <Badge variant={ad.active ? 'success' : 'default'} size="sm">
                  {ad.active ? 'Active' : 'Inactive'}
                </Badge>
              </td>
              <td className="px-4 py-3 text-sm text-[#3A3A3A]">{ad.sort_order}</td>
              <td className="px-4 py-3 text-right">
                <RowActions name={ad.title} actions={adActions(ad)} />
              </td>
            </tr>
          ))}
        </ResponsiveTable>
      )}

      {deleteTarget ? (
        <ConfirmDialog
          title="Delete this ad?"
          confirmLabel="Delete"
          busy={deleting}
          onClose={() => setDeleteTarget(null)}
          onConfirm={() => void deleteAd()}
        >
          {deleteTarget.title} will be removed.
        </ConfirmDialog>
      ) : null}

      <SidebarAdModal
        isOpen={showAddModal || !!editingAd}
        onClose={() => {
          setShowAddModal(false);
          setEditingAd(null);
        }}
        ad={editingAd}
        onSuccess={() => {
          fetchAds();
          setShowAddModal(false);
          setEditingAd(null);
        }}
      />
    </div>
  );
}
