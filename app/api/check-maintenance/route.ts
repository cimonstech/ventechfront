import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Cache maintenance mode check for 30 seconds to avoid excessive database calls
let maintenanceCache: { value: boolean; timestamp: number } | null = null;
const CACHE_TTL = 30000; // 30 seconds

export async function GET(request: NextRequest) {
  try {
    // Check cache first
    const now = Date.now();
    if (maintenanceCache && (now - maintenanceCache.timestamp) < CACHE_TTL) {
      return NextResponse.json({ maintenanceMode: maintenanceCache.value });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    const { data: setting, error } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'maintenance_mode')
      .maybeSingle(); // Use maybeSingle to handle cases where setting doesn't exist

    if (error && error.code !== 'PGRST116') {
      // Only log non-"not found" errors
      if (process.env.NODE_ENV === 'development') {
        console.error('Error fetching maintenance mode:', error);
      }
      return NextResponse.json({ maintenanceMode: false });
    }

    const maintenanceMode = setting?.value === 'true' || false;

    // Update cache
    maintenanceCache = {
      value: maintenanceMode,
      timestamp: now,
    };

    return NextResponse.json({ maintenanceMode });
  } catch (error) {
    // If error checking maintenance mode, default to false
    if (process.env.NODE_ENV === 'development') {
      console.error('Error checking maintenance mode:', error);
    }
    return NextResponse.json({ maintenanceMode: false });
  }
}

