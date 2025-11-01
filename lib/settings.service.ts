import { supabase } from './supabase';

export interface Setting {
  id: string;
  key: string;
  value: string | null;
  category: string;
  description: string | null;
}

class SettingsService {
  private cache: Map<string, string> = new Map();
  private cacheTimestamp: number = 0;
  private cacheTTL: number = 5 * 60 * 1000; // 5 minutes

  /**
   * Fetch all settings from database
   */
  async fetchAllSettings(): Promise<Map<string, string>> {
    const now = Date.now();
    
    // Return cached settings if still valid
    if (now - this.cacheTimestamp < this.cacheTTL && this.cache.size > 0) {
      return this.cache;
    }

    try {
      const { data, error } = await supabase
        .from('settings')
        .select('key, value');

      if (error) {
        console.error('Error fetching settings:', error);
        return this.cache; // Return cached settings on error
      }

      // Update cache
      this.cache.clear();
      data?.forEach((setting) => {
        if (setting.value !== null) {
          this.cache.set(setting.key, setting.value);
        }
      });
      this.cacheTimestamp = now;

      return this.cache;
    } catch (error) {
      console.error('Error fetching settings:', error);
      return this.cache; // Return cached settings on error
    }
  }

  /**
   * Get a single setting value by key
   */
  async getSetting(key: string): Promise<string | null> {
    const settings = await this.fetchAllSettings();
    return settings.get(key) || null;
  }

  /**
   * Get multiple settings by keys
   */
  async getSettings(keys: string[]): Promise<Record<string, string | null>> {
    const settings = await this.fetchAllSettings();
    const result: Record<string, string | null> = {};
    
    keys.forEach((key) => {
      result[key] = settings.get(key) || null;
    });

    return result;
  }

  /**
   * Get all settings for a specific category
   */
  async getSettingsByCategory(category: string): Promise<Record<string, string | null>> {
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('key, value')
        .eq('category', category);

      if (error) {
        // Silently handle missing table or other errors
        if (process.env.NODE_ENV === 'development') {
          console.error('Error fetching settings by category:', error);
        }
        return {};
      }

      const result: Record<string, string | null> = {};
      data?.forEach((setting) => {
        result[setting.key] = setting.value;
      });

      return result;
    } catch (error) {
      // Silently handle errors (settings table might not exist yet)
      if (process.env.NODE_ENV === 'development') {
        console.error('Error fetching settings by category:', error);
      }
      return {};
    }
  }

  /**
   * Clear cache (useful after settings update)
   */
  clearCache(): void {
    this.cache.clear();
    this.cacheTimestamp = 0;
  }

  /**
   * Check if a boolean setting is enabled
   */
  async isEnabled(key: string): Promise<boolean> {
    const value = await this.getSetting(key);
    return value === 'true';
  }
}

export const settingsService = new SettingsService();

