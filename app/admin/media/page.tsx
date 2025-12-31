'use client';

import { useState, useEffect, useRef } from 'react';
import { Upload, Trash2, Search, Grid, List, Image as ImageIcon, X, Loader2, Check, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { mediaService, MediaFile } from '@/services/media.service';
import toast from 'react-hot-toast';

type ViewMode = 'grid' | 'list';
type FolderFilter = 'all' | 'products' | 'categories' | 'banners' | 'brands' | 'uploads';

export default function MediaLibraryPage() {
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [filteredFiles, setFilteredFiles] = useState<MediaFile[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [folderFilter, setFolderFilter] = useState<FolderFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
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
    try {
      if (isSync) {
        setSyncing(true);
      } else {
        setLoading(true);
      }
      
      // Fetch all files from R2 (no folder filter when syncing)
      const folder = (isSync || folderFilter === 'all') ? undefined : folderFilter;
      const mediaFiles = await mediaService.listFiles(folder, 10000); // Large limit to get all files
      
      setFiles(mediaFiles);
      setFilteredFiles(mediaFiles);
      
      if (isSync) {
        toast.success(`Synced ${mediaFiles.length} file(s) from R2`);
      }
    } catch (error: any) {
      console.error('Error fetching files:', error);
      toast.error(error.message || 'Failed to fetch media files');
    } finally {
      setLoading(false);
      setSyncing(false);
    }
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

  const handleDelete = async (file: MediaFile) => {
    if (!confirm(`Are you sure you want to delete this file?\n${file.key}`)) {
      return;
    }

    setDeleting(file.url);
    try {
      await mediaService.deleteFile(file.url);
      toast.success('File deleted successfully');
      await fetchFiles(); // Refresh the list
    } catch (error: any) {
      console.error('Error deleting file:', error);
      toast.error(error.message || 'Failed to delete file');
    } finally {
      setDeleting(null);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="animate-spin text-[#FF7A19] mx-auto mb-4" size={48} />
          <p className="text-[#3A3A3A]">Loading media library...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1A1A1A]">Media Library</h1>
          <p className="text-sm text-[#3A3A3A] mt-1">
            Manage and organize all your uploaded images and media files
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            icon={syncing ? <Loader2 className="animate-spin" size={18} /> : <RefreshCw size={18} />}
            onClick={handleSyncFromR2}
            disabled={loading || syncing}
            title="Sync and refresh all files from R2 bucket"
          >
            {syncing ? 'Syncing...' : 'Sync from R2'}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleUpload}
            className="hidden"
            id="media-upload"
            disabled={uploading}
          />
          <label htmlFor="media-upload">
            <Button
              variant="primary"
              icon={uploading ? <Loader2 className="animate-spin" size={18} /> : <Upload size={18} />}
              disabled={uploading}
              className="cursor-pointer"
            >
              {uploading ? 'Uploading...' : 'Upload Media'}
            </Button>
          </label>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-200">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Folder Filter */}
          <select
            value={folderFilter}
            onChange={(e) => setFolderFilter(e.target.value as FolderFilter)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF7A19]"
          >
            <option value="all">All Folders</option>
            <option value="products">Products</option>
            <option value="categories">Categories</option>
            <option value="banners">Banners</option>
            <option value="brands">Brands</option>
            <option value="uploads">Uploads</option>
          </select>

          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF7A19]"
            />
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded transition-colors ${
                viewMode === 'grid' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'
              }`}
              title="Grid View"
            >
              <Grid size={20} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded transition-colors ${
                viewMode === 'list' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'
              }`}
              title="List View"
            >
              <List size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <p className="text-sm text-[#3A3A3A] mb-1">Total Files</p>
          <p className="text-3xl font-bold text-[#1A1A1A]">{files.length}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <p className="text-sm text-[#3A3A3A] mb-1">Filtered Results</p>
          <p className="text-3xl font-bold text-[#FF7A19]">{filteredFiles.length}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <p className="text-sm text-[#3A3A3A] mb-1">Total Size</p>
          <p className="text-3xl font-bold text-[#1A1A1A]">
            {formatFileSize(filteredFiles.reduce((sum, f) => sum + (f.size || 0), 0))}
          </p>
        </div>
      </div>

      {/* Media Grid/List */}
      {filteredFiles.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 border border-gray-200 text-center">
          <ImageIcon className="text-gray-400 mx-auto mb-4" size={64} />
          <h3 className="text-xl font-bold text-[#1A1A1A] mb-2">No media files found</h3>
          <p className="text-[#3A3A3A] mb-6">
            {searchQuery ? 'Try adjusting your search filters' : 'Upload your first media file to get started'}
          </p>
          {!searchQuery && (
            <label htmlFor="media-upload">
              <Button variant="primary" icon={<Upload size={18} />} className="cursor-pointer">
                Upload Media
              </Button>
            </label>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {filteredFiles.map((file) => (
            <div
              key={file.url}
              className="group relative bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-all"
            >
              {/* Image */}
              <div className="relative aspect-square bg-gray-100 overflow-hidden">
                <img
                  src={file.url}
                  alt={file.key}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = '/placeholders/placeholder-product.webp';
                  }}
                />
                
                {/* Overlay on hover */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                  <button
                    onClick={() => handleSelect(file)}
                    className="p-2 bg-white rounded-lg hover:bg-gray-100 transition-colors"
                    title="Copy URL"
                  >
                    {selectedFile === file.url ? (
                      <Check size={18} className="text-green-600" />
                    ) : (
                      <ImageIcon size={18} className="text-[#FF7A19]" />
                    )}
                  </button>
                  <button
                    onClick={() => handleDelete(file)}
                    disabled={deleting === file.url}
                    className="p-2 bg-white rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
                    title="Delete"
                  >
                    {deleting === file.url ? (
                      <Loader2 size={18} className="animate-spin text-red-600" />
                    ) : (
                      <Trash2 size={18} className="text-red-600" />
                    )}
                  </button>
                </div>
              </div>

              {/* File Info */}
              <div className="p-2">
                <p className="text-xs text-[#3A3A3A] truncate" title={file.key}>
                  {file.key.split('/').pop()}
                </p>
                <p className="text-[10px] text-gray-400 mt-1">
                  {formatFileSize(file.size)}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#1A1A1A]">Preview</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#1A1A1A]">Filename</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#1A1A1A]">Folder</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#1A1A1A]">Size</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#1A1A1A]">Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#1A1A1A]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredFiles.map((file) => (
                <tr key={file.url} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="w-12 h-12 bg-gray-100 rounded overflow-hidden">
                      <img
                        src={file.url}
                        alt={file.key}
                        className="w-full h-full object-cover"
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
                      {file.key.split('/').pop()}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-[#3A3A3A] bg-gray-100 px-2 py-1 rounded">
                      {file.key.split('/')[0]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-[#3A3A3A]">
                    {formatFileSize(file.size)}
                  </td>
                  <td className="px-4 py-3 text-sm text-[#3A3A3A]">
                    {formatDate(file.lastModified)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleSelect(file)}
                        className="p-1.5 hover:bg-gray-100 rounded transition-colors"
                        title="Copy URL"
                      >
                        {selectedFile === file.url ? (
                          <Check size={16} className="text-green-600" />
                        ) : (
                          <ImageIcon size={16} className="text-[#FF7A19]" />
                        )}
                      </button>
                      <button
                        onClick={() => handleDelete(file)}
                        disabled={deleting === file.url}
                        className="p-1.5 hover:bg-red-100 rounded transition-colors disabled:opacity-50"
                        title="Delete"
                      >
                        {deleting === file.url ? (
                          <Loader2 size={16} className="animate-spin text-red-600" />
                        ) : (
                          <Trash2 size={16} className="text-red-600" />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

