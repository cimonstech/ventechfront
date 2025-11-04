/**
 * Centralized Image Upload Service
 * 
 * This service handles all image uploads with the following workflow:
 * 1. Check if image exists in media library (by URL or hash)
 * 2. If found, return existing URL
 * 3. If not found, upload to R2 storage
 * 4. Save to media library table
 * 5. Return the URL
 */

import { supabase } from '@/lib/supabase';

interface MediaLibraryItem {
  id: string;
  url: string;
  filename: string;
  folder: string;
  size: number;
  mime_type: string;
  created_at: string;
}

interface UploadResult {
  success: boolean;
  url?: string;
  error?: string;
  fromLibrary?: boolean; // Whether image was found in library
}

/**
 * Calculate file hash for deduplication
 */
async function calculateFileHash(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Check if image exists in media library by URL or hash
 */
async function checkMediaLibrary(
  url: string,
  file?: File
): Promise<MediaLibraryItem | null> {
  try {
    // First, try to find by URL
    const { data: existingByUrl, error: urlError } = await supabase
      .from('media_library')
      .select('*')
      .eq('url', url)
      .limit(1)
      .maybeSingle();

    if (!urlError && existingByUrl) {
      return existingByUrl;
    }

    // If file provided, try to find by hash
    if (file) {
      const hash = await calculateFileHash(file);
      const { data: existingByHash, error: hashError } = await supabase
        .from('media_library')
        .select('*')
        .eq('file_hash', hash)
        .limit(1)
        .maybeSingle();

      if (!hashError && existingByHash) {
        return existingByHash;
      }
    }

    return null;
  } catch (error) {
    // If table doesn't exist, that's okay - we'll just skip checking
    console.log('Media library check skipped:', error);
    return null;
  }
}

/**
 * Save image to media library
 */
async function saveToMediaLibrary(
  url: string,
  filename: string,
  folder: string,
  size: number,
  mimeType: string,
  file?: File
): Promise<void> {
  try {
    const hash = file ? await calculateFileHash(file) : null;
    
    // Check if already exists
    const { data: existing } = await supabase
      .from('media_library')
      .select('id')
      .eq('url', url)
      .limit(1)
      .maybeSingle();

    if (existing) {
      // Already exists, skip insert
      return;
    }
    
    const { error } = await supabase
      .from('media_library')
      .insert({
        url,
        filename,
        folder,
        size,
        mime_type: mimeType,
        file_hash: hash,
      });

    if (error) {
      // If it's a unique constraint error, that's okay - image already exists
      if (error.code !== '23505' && error.code !== '42P01') {
        console.error('Error saving to media library:', error);
      }
    }
  } catch (error: any) {
    // If table doesn't exist, that's okay - we'll just skip saving
    if (error.code !== '42P01' && error.message?.includes('does not exist')) {
      console.log('Media library table not found, skipping save');
    } else {
      console.error('Error saving to media library:', error);
    }
    // Don't throw - uploading is more important than saving metadata
  }
}

/**
 * Upload image to R2 via backend API
 */
async function uploadToR2(
  file: File,
  folder: string = 'uploads'
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const formData = new FormData();
    formData.append('file', file);
    
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
    const response = await fetch(`${apiUrl}/api/upload?folder=${encodeURIComponent(folder)}`, {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();

    if (data.success && data.url) {
      return { success: true, url: data.url };
    } else {
      return { success: false, error: data.error || 'Upload failed' };
    }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to upload image' };
  }
}

/**
 * Main upload function - checks media library first, then uploads to R2
 */
export async function uploadImage(
  file: File,
  folder: string = 'uploads',
  checkLibrary: boolean = true
): Promise<UploadResult> {
  try {
    // Validate file
    if (!file.type.startsWith('image/')) {
      return { success: false, error: 'Please upload image files only' };
    }

    if (file.size > 5 * 1024 * 1024) {
      return { success: false, error: 'Image size should be less than 5MB' };
    }

    // If checkLibrary is enabled, check media library first
    if (checkLibrary) {
      // Calculate hash to check if file already exists
      const hash = await calculateFileHash(file);
      
      // Check by hash
      const { data: existing, error: checkError } = await supabase
        .from('media_library')
        .select('*')
        .eq('file_hash', hash)
        .limit(1)
        .maybeSingle();

      if (!checkError && existing) {
        // Image already exists in library - return existing URL
        return {
          success: true,
          url: existing.url,
          fromLibrary: true,
        };
      }
      
      // If table doesn't exist, that's okay - continue with upload
      if (checkError && (checkError.code === '42P01' || checkError.code === 'PGRST116')) {
        console.log('Media library table not found, skipping check');
      }
    }

    // Upload to R2
    const uploadResult = await uploadToR2(file, folder);
    
    if (!uploadResult.success || !uploadResult.url) {
      return uploadResult;
    }

    // Save to media library
    await saveToMediaLibrary(
      uploadResult.url,
      file.name,
      folder,
      file.size,
      file.type,
      file
    );

    return {
      success: true,
      url: uploadResult.url,
      fromLibrary: false,
    };
  } catch (error: any) {
    console.error('Error uploading image:', error);
    return {
      success: false,
      error: error.message || 'Failed to upload image',
    };
  }
}

/**
 * Upload multiple images
 */
export async function uploadImages(
  files: File[],
  folder: string = 'uploads',
  checkLibrary: boolean = true
): Promise<UploadResult[]> {
  const uploadPromises = files.map(file => uploadImage(file, folder, checkLibrary));
  return Promise.all(uploadPromises);
}

/**
 * Get image from media library by URL
 */
export async function getImageFromLibrary(url: string): Promise<MediaLibraryItem | null> {
  try {
    const { data, error } = await supabase
      .from('media_library')
      .select('*')
      .eq('url', url)
      .limit(1)
      .single();

    if (error || !data) {
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error getting image from library:', error);
    return null;
  }
}

