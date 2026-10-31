'use client';

import { useState, useEffect, useRef } from 'react';
import { Upload, Loader2, RefreshCw } from 'lucide-react';
import { mediaService, MediaFile } from '@/services/media.service';
import { AccessDenied, EmptyState, ErrorState, NoResults, StatCardSkeleton, UpdatingNotice } from '@/components/ui-states';
import { useListQuery } from '@/hooks/useListQuery';
import toast from 'react-hot-toast';
import { useAccess } from '@/context/AccessContext';
import {
  AdminPageHeader,
  AdminRowCard,
  ConfirmDialog,
  FilterBar,
  filterSelectClassName,
  ResponsiveTable,
  RowActions,
} from '@/components/admin/list';

type FolderFilter = 'all' | 'products' | 'categories' | 'banners' | 'brands' | 'uploads';

export default function MediaLibraryPage() {
  const { canEdit } = useAccess();
  const canEditProducts = canEdit('products');
  const query = useListQuery();
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [filteredFiles, setFilteredFiles] = useState<MediaFile[]>([]);
  const [folderFilter, setFolderFilter] = useState<FolderFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<MediaFile | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchFiles();
  }, [folderFilter]);

  useEffect(() => {
    // Filter files based on search query
    let filtered = files;

    if (searchQuery) {
      filtered = filtered.filter(file =>
        file.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
        file.url.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredFiles(filtered);
  }, [searchQuery, files]);

  const fetchFiles = async (isSync: boolean = false) => {
    if (isSync) setSyncing(true);
    await query.run(async () => {
      const folder = (isSync || folderFilter === 'all') ? undefined : folderFilter;
      const mediaFiles = await mediaService.listFiles(folder, 10000);
      setFiles(mediaFiles);
      setFilteredFiles(mediaFiles);
      if (isSync) {
        toast.success(`Synced ${mediaFiles.length} file(s)`);
      }
    });
    setSyncing(false);
  };

  const handleSyncFromR2 = async () => {
    await fetchFiles(true);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    setUploading(true);
    try {
      const fileArray = Array.from(selectedFiles);
      const folder = folderFilter === 'all' ? 'uploads' : folderFilter;

      const uploadPromises = fileArray.map(file =>
        mediaService.uploadFile(file, folder)
      );

      const urls = await Promise.all(uploadPromises);

      toast.success(`${urls.length} file(s) uploaded successfully`);
      await fetchFiles(); // Refresh the list

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error: any) {
      console.error('Error uploading files:', error);
      toast.error(error.message || 'Failed to upload files');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    setDeleting(true);
    try {
      await mediaService.deleteFile(deleteTarget.url);
      toast.success('File deleted successfully');
      setDeleteTarget(null);
      await fetchFiles(); // Refresh the list
    } catch (error: any) {
      console.error('Error deleting file:', error);
      toast.error(error.message || 'Failed to delete file');
    } finally {
      setDeleting(false);
    }
  };

  const handleSelect = (file: MediaFile) => {
    // Copy URL to clipboard
    navigator.clipboard.writeText(file.url);
    toast.success('Image URL copied to clipboard!');
    setSelectedFile(file.url);
    setTimeout(() => setSelectedFile(null), 2000);
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const formatDate = (date?: Date | string) => {
    if (!date) return 'Unknown';
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString();
  };

  const fileName = (file: MediaFile) => file.key.split('/').pop() || file.key;

  const fileActions = (file: MediaFile) => [
    { label: selectedFile === file.url ? 'Copied' : 'Copy URL', onClick: () => handleSelect(file) },
    ...(canEditProducts
      ? [{ label: 'Delete', destructive: true, onClick: () => setDeleteTarget(file) }]
      : []),
  ];

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
        title="We couldn't load media"
        description="Try again in a moment."
        primary={{ label: 'Try again', onClick: () => void fetchFiles() }}
      />
    );
  }

  if (query.loading && !query.loaded) {
    return <StatCardSkeleton count={3} />;
  }

  return (
    <div className="min-w-0">
      {query.updating ? <UpdatingNotice /> : null}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleUpload}
        className="hidden"
        disabled={uploading}
      />
      <AdminPageHeader
        title="Media"
        subtitle={`${files.length} file${files.length === 1 ? '' : 's'}`}
        primary={
          canEditProducts
            ? {
                label: uploading ? 'Uploading...' : 'Upload',
                icon: uploading ? <Loader2 className="animate-spin" size={16} /> : <Upload size={16} />,
                disabled: uploading,
                onClick: () => fileInputRef.current?.click(),
              }
            : undefined
        }
        secondary={
          canEditProducts
            ? [
                {
                  label: syncing ? 'Syncing...' : 'Sync from R2',
                  icon: syncing ? <Loader2 className="animate-spin" size={16} /> : <RefreshCw size={16} />,
                  disabled: query.loading || syncing,
                  onClick: () => void handleSyncFromR2(),
                },
              ]
            : []
        }
      />

      <FilterBar
        search={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search files"
        activeCount={folderFilter === 'all' ? 0 : 1}
        onClear={() => setFolderFilter('all')}
      >
        <select
          value={folderFilter}
          onChange={(e) => setFolderFilter(e.target.value as FolderFilter)}
          className={filterSelectClassName()}
        >
          <option value="all">All folders</option>
          <option value="products">Products</option>
          <option value="categories">Categories</option>
          <option value="banners">Banners</option>
          <option value="brands">Brands</option>
          <option value="uploads">Uploads</option>
        </select>
      </FilterBar>

      <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <p className="mb-1 text-sm text-[#3A3A3A]">Total Files</p>
          <p className="text-3xl font-bold text-[#1A1A1A]">{files.length}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <p className="mb-1 text-sm text-[#3A3A3A]">Filtered Results</p>
          <p className="text-3xl font-bold text-[#FF7A19]">{filteredFiles.length}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <p className="mb-1 text-sm text-[#3A3A3A]">Total Size</p>
          <p className="text-3xl font-bold text-[#1A1A1A]">
            {formatFileSize(filteredFiles.reduce((sum, f) => sum + (f.size || 0), 0))}
          </p>
        </div>
      </div>

      {filteredFiles.length === 0 ? (
        searchQuery || folderFilter !== 'all' ? (
          <NoResults
            primary={{
              label: 'Clear filters',
              onClick: () => {
                setSearchQuery('');
                setFolderFilter('all');
              },
            }}
          />
        ) : (
          <EmptyState
            title="No media files yet"
            description="Upload an image to use on products, banners, and pages."
            primary={canEditProducts ? { label: 'Upload media', onClick: () => fileInputRef.current?.click() } : undefined}
          />
        )
      ) : (
        <ResponsiveTable
          headers={
            <tr>
              <th className="px-4 py-3">Preview</th>
              <th className="px-4 py-3">Filename</th>
              <th className="px-4 py-3">Folder</th>
              <th className="px-4 py-3">Size</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          }
          cards={filteredFiles.map((file) => (
            <AdminRowCard
              key={file.url}
              name={fileName(file)}
              thumbnail={file.url}
              facts={[
                { label: 'Folder', value: file.key.split('/')[0] },
                { label: 'Size', value: formatFileSize(file.size) },
                { label: 'Date', value: formatDate(file.lastModified) },
              ]}
              actions={<RowActions name={fileName(file)} actions={fileActions(file)} />}
            />
          ))}
        >
          {filteredFiles.map((file) => (
            <tr key={file.url} className="hover:bg-gray-50">
              <td className="px-4 py-3">
                <div className="h-12 w-12 overflow-hidden rounded bg-gray-100">
                  <img
                    src={file.url}
                    alt=""
                    className="h-full w-full object-cover"
                    loading="lazy"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = '/placeholders/placeholder-image.webp';
                    }}
                  />
                </div>
              </td>
              <td className="px-4 py-3">
                <p className="text-sm font-medium text-[#1A1A1A]" title={file.key}>
                  {fileName(file)}
                </p>
              </td>
              <td className="px-4 py-3">
                <span className="rounded bg-gray-100 px-2 py-1 text-xs text-[#3A3A3A]">
                  {file.key.split('/')[0]}
                </span>
              </td>
              <td className="px-4 py-3 text-sm text-[#3A3A3A]">
                {formatFileSize(file.size)}
              </td>
              <td className="px-4 py-3 text-sm text-[#3A3A3A]">
                {formatDate(file.lastModified)}
              </td>
              <td className="px-4 py-3 text-right">
                <RowActions name={fileName(file)} actions={fileActions(file)} />
              </td>
            </tr>
          ))}
        </ResponsiveTable>
      )}

      {deleteTarget ? (
        <ConfirmDialog
          title="Delete this file?"
          confirmLabel="Delete"
          busy={deleting}
          onClose={() => setDeleteTarget(null)}
          onConfirm={() => void handleDelete()}
        >
          {deleteTarget.key} will be removed.
        </ConfirmDialog>
      ) : null}
    </div>
  );
}
