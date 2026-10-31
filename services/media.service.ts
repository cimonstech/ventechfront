import { authHeaders } from '@/lib/authHeaders';
import { apiRequest, toApiError } from '@/lib/api';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export interface MediaFile {
  key: string;
  url: string;
  size?: number;
  lastModified?: Date;
}

export const mediaService = {
  // List all media files (optionally filtered by folder)
  async listFiles(folder?: string, maxKeys?: number): Promise<MediaFile[]> {
    const params = new URLSearchParams();
    if (folder) params.append('folder', folder);
    if (maxKeys) params.append('maxKeys', maxKeys.toString());
    const result = await apiRequest<MediaFile[]>(`/api/upload/list?${params.toString()}`);
    if (!result.ok) throw toApiError(result);
    return result.data || [];
  },

  // Upload a single file
  async uploadFile(file: File, folder: string = 'uploads'): Promise<string> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', folder);

      const response = await fetch(`${API_URL}/api/upload?folder=${encodeURIComponent(folder)}`, {
        method: 'POST',
        headers: await authHeaders(),
        body: formData,
      });

      const data = await response.json();

      if (data.success && data.url) {
        return data.url;
      }

      throw new Error(data.error || 'Failed to upload file');
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    }
  },

  // Upload multiple files
  async uploadMultipleFiles(files: File[], folder: string = 'uploads'): Promise<string[]> {
    try {
      const formData = new FormData();
      files.forEach((file) => {
        formData.append('images', file);
      });

      const response = await fetch(`${API_URL}/api/upload/multiple?folder=${encodeURIComponent(folder)}`, {
        method: 'POST',
        headers: await authHeaders(),
        body: formData,
      });

      const data = await response.json();

      if (data.success && data.urls) {
        return data.urls;
      }

      throw new Error(data.error || 'Failed to upload files');
    } catch (error) {
      console.error('Error uploading files:', error);
      throw error;
    }
  },

  // Delete a file
  async deleteFile(url: string): Promise<boolean> {
    try {
      const response = await fetch(`${API_URL}/api/upload`, {
        method: 'DELETE',
        headers: {
          ...(await authHeaders()),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });

      const data = await response.json();

      if (data.success) {
        return true;
      }

      throw new Error(data.error || 'Failed to delete file');
    } catch (error) {
      console.error('Error deleting file:', error);
      throw error;
    }
  },
};

