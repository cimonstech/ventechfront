const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export interface MediaFile {
  key: string;
  url: string;
  size?: number;
  lastModified?: Date;
}

export interface MediaListResponse {
  success: boolean;
  files?: MediaFile[];
  count?: number;
  error?: string;
}

export const mediaService = {
  // List all media files (optionally filtered by folder)
  async listFiles(folder?: string, maxKeys?: number): Promise<MediaFile[]> {
    try {
      const params = new URLSearchParams();
      if (folder) params.append('folder', folder);
      if (maxKeys) params.append('maxKeys', maxKeys.toString());

      const url = `${API_URL}/api/upload/list?${params.toString()}`;
      console.log(`📡 Fetching media files from: ${url}`);
      
      const response = await fetch(url);
      
      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        console.error(`❌ API error (${response.status}):`, errorText);
        throw new Error(`Failed to fetch files: ${response.status} ${response.statusText}`);
      }
      
      const data: MediaListResponse = await response.json();
      console.log(`✅ API response:`, { success: data.success, count: data.count, files: data.files?.length || 0 });

      if (data.success && data.files) {
        console.log(`📦 Returning ${data.files.length} files`);
        return data.files;
      }

      const errorMsg = data.error || 'Failed to list files';
      console.error(`❌ API returned error:`, errorMsg);
      throw new Error(errorMsg);
    } catch (error) {
      console.error('Error listing media files:', error);
      // Return empty array instead of throwing to prevent UI crashes
      return [];
    }
  },

  // Upload a single file
  async uploadFile(file: File, folder: string = 'uploads'): Promise<string> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', folder);

      const response = await fetch(`${API_URL}/api/upload?folder=${encodeURIComponent(folder)}`, {
        method: 'POST',
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
        formData.append('files', file);
      });

      const response = await fetch(`${API_URL}/api/upload/multiple?folder=${encodeURIComponent(folder)}`, {
        method: 'POST',
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

