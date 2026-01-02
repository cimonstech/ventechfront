'use client';

import { useState, useEffect } from 'react';
import { Upload, X, Grid, Search, ImageIcon, Loader2, Check } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { mediaService, MediaFile } from '@/services/media.service';
import toast from 'react-hot-toast';

interface MediaPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (url: string) => void;
  folder?: string;
  multiple?: boolean;
  onSelectMultiple?: (urls: string[]) => void;
}

export function MediaPicker({
  isOpen,
  onClose,
  onSelect,
  folder,
  multiple = false,
  onSelectMultiple,
}: MediaPickerProps) {
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [filteredFiles, setFilteredFiles] = useState<MediaFile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen) {
      fetchFiles();
    }
  }, [isOpen, folder]);

  useEffect(() => {
    let filtered = files;
    if (searchQuery) {
      filtered = filtered.filter(file =>
        file.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
        file.url.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    setFilteredFiles(filtered);
  }, [searchQuery, files]);

  const fetchFiles = async () => {
    try {
      setLoading(true);
      const mediaFiles = await mediaService.listFiles(folder);
      console.log(`📸 Fetched ${mediaFiles.length} files from folder: ${folder || 'all'}`);
      setFiles(mediaFiles);
      setFilteredFiles(mediaFiles);
      
      if (mediaFiles.length === 0 && folder) {
        console.warn(`⚠️ No files found in folder: ${folder}. Check if files exist in R2 bucket.`);
      }
    } catch (error: any) {
      console.error('Error fetching files:', error);
      const errorMessage = error?.message || 'Failed to fetch media files';
      toast.error(errorMessage);
      // Set empty arrays on error
      setFiles([]);
      setFilteredFiles([]);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFileList = e.target.files;
    if (!selectedFileList || selectedFileList.length === 0) return;

    setUploading(true);
    try {
      const fileArray = Array.from(selectedFileList);
      const uploadFolder = folder || 'uploads';
      
      const uploadPromises = fileArray.map(file => 
        mediaService.uploadFile(file, uploadFolder)
      );

      const urls = await Promise.all(uploadPromises);
      
      toast.success(`${urls.length} file(s) uploaded successfully`);
      await fetchFiles(); // Refresh the list
      
      // If single mode, select the first uploaded image
      if (!multiple && urls.length > 0) {
        handleSelect(urls[0]);
      } else if (multiple && onSelectMultiple) {
        // Select all uploaded images in multiple mode
        setSelectedFiles([...selectedFiles, ...urls]);
      }
      
      // Reset file input
      const input = document.getElementById('media-picker-upload') as HTMLInputElement;
      if (input) {
        input.value = '';
      }
    } catch (error: any) {
      console.error('Error uploading files:', error);
      toast.error(error.message || 'Failed to upload files');
    } finally {
      setUploading(false);
    }
  };

  const handleSelect = (url: string) => {
    if (multiple) {
      if (selectedFiles.includes(url)) {
        setSelectedFiles(selectedFiles.filter(u => u !== url));
      } else {
        setSelectedFiles([...selectedFiles, url]);
      }
    } else {
      onSelect(url);
      onClose();
    }
  };

  const handleConfirmMultiple = () => {
    if (onSelectMultiple && selectedFiles.length > 0) {
      onSelectMultiple(selectedFiles);
      onClose();
      setSelectedFiles([]);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-[#1A1A1A]">Select Media</h2>
            <p className="text-sm text-[#3A3A3A] mt-1">
              {multiple ? 'Select multiple images' : 'Choose an image or upload a new one'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="file"
              accept="image/*"
              multiple={multiple}
              onChange={handleUpload}
              className="hidden"
              id="media-picker-upload"
              disabled={uploading}
            />
            <label htmlFor="media-picker-upload">
              <Button
                variant="outline"
                icon={uploading ? <Loader2 className="animate-spin" size={18} /> : <Upload size={18} />}
                disabled={uploading}
                className="cursor-pointer"
              >
                {uploading ? 'Uploading...' : 'Upload New'}
              </Button>
            </label>
            {multiple && selectedFiles.length > 0 && (
              <Button
                variant="primary"
                onClick={handleConfirmMultiple}
                icon={<Check size={18} />}
              >
                Select {selectedFiles.length} image(s)
              </Button>
            )}
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search images..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF7A19]"
            />
          </div>
        </div>

        {/* Media Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="animate-spin text-[#FF7A19]" size={48} />
            </div>
          ) : filteredFiles.length === 0 ? (
            <div className="text-center py-12">
              <ImageIcon className="text-gray-400 mx-auto mb-4" size={64} />
              <h3 className="text-xl font-bold text-[#1A1A1A] mb-2">No images found</h3>
              <p className="text-[#3A3A3A] mb-6">
                {searchQuery ? 'Try adjusting your search' : 'Upload your first image to get started'}
              </p>
              {!searchQuery && (
                <label htmlFor="media-picker-upload">
                  <Button variant="primary" icon={<Upload size={18} />} className="cursor-pointer">
                    Upload Image
                  </Button>
                </label>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
              {filteredFiles.map((file) => {
                const isSelected = selectedFiles.includes(file.url);
                return (
                  <div
                    key={file.url}
                    className={`group relative aspect-square bg-gray-100 rounded-lg overflow-hidden border-2 cursor-pointer transition-all ${
                      isSelected
                        ? 'border-[#FF7A19] ring-2 ring-[#FF7A19]'
                        : 'border-transparent hover:border-gray-300'
                    }`}
                    onClick={() => handleSelect(file.url)}
                  >
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
                    {isSelected && (
                      <div className="absolute inset-0 bg-[#FF7A19]/20 flex items-center justify-center">
                        <div className="w-8 h-8 bg-[#FF7A19] rounded-full flex items-center justify-center">
                          <Check size={20} className="text-white" />
                        </div>
                      </div>
                    )}
                    {!isSelected && (
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors opacity-0 group-hover:opacity-100 flex items-center justify-center">
                        <div className="w-8 h-8 bg-white/90 rounded-full flex items-center justify-center">
                          <Check size={20} className="text-[#FF7A19]" />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

