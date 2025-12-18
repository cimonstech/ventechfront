import { supabase } from '@/lib/supabase';
import type { User, Session } from '@supabase/supabase-js';

export interface SignUpData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
}

export interface SignInData {
  email: string;
  password: string;
}

export interface ResetPasswordData {
  email: string;
}

export interface UpdatePasswordData {
  password: string;
}

export interface AuthResponse {
  user: User | null;
  session: Session | null;
  error: Error | null;
}

// Sign up with email and password
// Includes retry logic for rate limit errors
export const signUp = async (data: SignUpData, retryCount = 0): Promise<AuthResponse> => {
  const MAX_RETRIES = 2;
  const RETRY_DELAY = 2000; // 2 seconds

  try {
    const { data: authData, error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          first_name: data.firstName,
          last_name: data.lastName,
          phone: data.phone,
        },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      // Log error details for debugging
      console.error('Supabase signup error:', {
        message: error.message,
        status: (error as any).status,
        code: (error as any).code,
        error,
      });

      // Retry logic for rate limit errors (with exponential backoff)
      const errorCode = (error as any).code || '';
      const isRateLimit = 
        (error as any).status === 429 ||
        errorCode === 'over_email_send_rate_limit' ||
        error.message?.toLowerCase().includes('rate limit');

      if (isRateLimit && retryCount < MAX_RETRIES) {
        const delay = RETRY_DELAY * Math.pow(2, retryCount); // Exponential backoff
        console.log(`Rate limit hit, retrying in ${delay}ms (attempt ${retryCount + 1}/${MAX_RETRIES})`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
        return signUp(data, retryCount + 1);
      }

      throw error;
    }

    return {
      user: authData.user,
      session: authData.session,
      error: null,
    };
  } catch (error: any) {
    // Preserve error details for better handling
    return {
      user: null,
      session: null,
      error: error,
    };
  }
};

// Sign in with email and password
export const signIn = async (data: SignInData): Promise<AuthResponse> => {
  try {
    const { data: authData, error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });

    if (error) throw error;

    return {
      user: authData.user,
      session: authData.session,
      error: null,
    };
  } catch (error: any) {
    return {
      user: null,
      session: null,
      error: error,
    };
  }
};

// Sign out
export const signOut = async (): Promise<{ error: Error | null }> => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    return { error: null };
  } catch (error: any) {
    return { error };
  }
};

// Send password reset email
export const resetPassword = async (data: ResetPasswordData): Promise<{ error: Error | null }> => {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) throw error;
    return { error: null };
  } catch (error: any) {
    return { error };
  }
};

// Update password (after reset)
export const updatePassword = async (data: UpdatePasswordData): Promise<{ error: Error | null }> => {
  try {
    const { error} = await supabase.auth.updateUser({
      password: data.password,
    });

    if (error) throw error;
    return { error: null };
  } catch (error: any) {
    return { error };
  }
};

// Get current user
export const getCurrentUser = async (): Promise<User | null> => {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    return user;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
};

// Get current session
export const getCurrentSession = async (): Promise<Session | null> => {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) throw error;
    return session;
  } catch (error) {
    console.error('Error getting current session:', error);
    return null;
  }
};

// Resend verification email
export const resendVerificationEmail = async (email: string): Promise<{ error: Error | null }> => {
  try {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) throw error;
    return { error: null };
  } catch (error: any) {
    return { error };
  }
};

// Listen to auth state changes
export const onAuthStateChange = (callback: (event: string, session: Session | null) => void) => {
  return supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session);
  });
};

// Get user profile from public.users table
export const getUserProfile = async (userId?: string) => {
  try {
    // If no userId provided, get the current user's ID
    if (!userId) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        // No error log - user might be logged out
        return null;
      }
      userId = user.id;
    }

    // Use maybeSingle() instead of single() to handle missing/duplicate records gracefully
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching profile:', error.message);
      
      // If error is about duplicates, log more details
      if (error.message.includes('multiple') || error.message.includes('coerce')) {
        console.error('⚠️ DUPLICATE USER PROFILES DETECTED!');
        console.error('Run fix_duplicate_users.sql to clean up the database');
      }
      
      return null;
    }

    if (!data) {
      console.warn('No user profile found for ID:', userId);
      
      // Try to create the profile if it doesn't exist
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user && user.id === userId) {
          // Build profile data - handle both name and first_name/last_name schemas
          const firstName = user.user_metadata?.first_name || user.user_metadata?.firstName || '';
          const lastName = user.user_metadata?.last_name || user.user_metadata?.lastName || '';
          const fullName = `${firstName} ${lastName}`.trim() || user.email?.split('@')[0] || 'User';
          
          const profileData: any = {
            id: user.id,
            email: user.email || '',
            phone: user.user_metadata?.phone || user.phone || null,
            role: 'customer',
          };

          // Try to use first_name/last_name if columns exist, otherwise use name
          try {
            const { data: newProfile, error: createError } = await supabase
              .from('users')
              .insert({
                ...profileData,
                first_name: firstName,
                last_name: lastName,
              })
              .select()
              .single();

            if (createError) {
              // If error, try with 'name' field instead (might be the actual schema)
              if (createError.message?.includes('column') || createError.code === '42703') {
                const { data: newProfile2, error: createError2 } = await supabase
                  .from('users')
                  .insert({
                    ...profileData,
                    name: fullName,
                  })
                  .select()
                  .single();

                if (createError2) {
                  // Log detailed error information
                  console.error('Error creating user profile (with name field):', {
                    message: createError2?.message || 'Unknown error',
                    code: createError2?.code,
                    details: createError2?.details,
                    hint: createError2?.hint,
                    error: createError2,
                  });
                  
                  // If it's a duplicate key error, the trigger already created it - try to fetch it
                  if (createError2?.code === '23505' || createError2?.message?.includes('duplicate')) {
                    console.warn('Profile already exists (duplicate key). Fetching existing profile...');
                    const { data: existingProfile } = await supabase
                      .from('users')
                      .select('*')
                      .eq('id', userId)
                      .maybeSingle();
                    
                    if (existingProfile) {
                      const firstName = existingProfile.first_name || '';
                      const lastName = existingProfile.last_name || '';
                      const fullName = `${firstName} ${lastName}`.trim() || existingProfile.full_name || existingProfile.name || user.email?.split('@')[0] || 'User';
                      
                      return {
                        ...existingProfile,
                        full_name: fullName,
                        first_name: firstName,
                        last_name: lastName,
                      };
                    }
                  }
                  
                  // If it's an RLS policy error, the trigger should handle it
                  if (createError2?.code === '42501' || createError2?.message?.includes('permission denied')) {
                    console.warn('Profile creation blocked by RLS policy. Database trigger should handle this.');
                  }
                  
                  return null;
                }
                // Format the response to match User type
                return {
                  ...newProfile2,
                  full_name: fullName,
                  first_name: firstName,
                  last_name: lastName,
                };
              } else {
                // Log detailed error information
                console.error('Error creating user profile:', {
                  message: createError?.message || 'Unknown error',
                  code: createError?.code,
                  details: createError?.details,
                  hint: createError?.hint,
                  error: createError,
                });
                
                // If it's a duplicate key error, the trigger already created it - try to fetch it
                if (createError?.code === '23505' || createError?.message?.includes('duplicate')) {
                  console.warn('Profile already exists (duplicate key). Fetching existing profile...');
                  const { data: existingProfile } = await supabase
                    .from('users')
                    .select('*')
                    .eq('id', userId)
                    .maybeSingle();
                  
                  if (existingProfile) {
                    const firstName = existingProfile.first_name || '';
                    const lastName = existingProfile.last_name || '';
                    const fullName = `${firstName} ${lastName}`.trim() || existingProfile.full_name || existingProfile.name || user.email?.split('@')[0] || 'User';
                    
                    return {
                      ...existingProfile,
                      full_name: fullName,
                      first_name: firstName,
                      last_name: lastName,
                    };
                  }
                }
                
                // If it's an RLS policy error, the trigger should handle it
                if (createError?.code === '42501' || createError?.message?.includes('permission denied')) {
                  console.warn('Profile creation blocked by RLS policy. Database trigger should handle this.');
                }
                
                return null;
              }
            }

            // Format the response to match User type
            return {
              ...newProfile,
              full_name: fullName,
              first_name: firstName,
              last_name: lastName,
            };
          } catch (insertError: any) {
            // Log detailed error information - handle both Supabase errors and generic errors
            const errorMessage = insertError?.message || insertError?.toString() || 'Unknown error';
            const errorCode = insertError?.code || insertError?.status || insertError?.statusCode;
            
            console.error('Error inserting user profile:', {
              message: errorMessage,
              code: errorCode,
              details: insertError?.details,
              hint: insertError?.hint,
              fullError: insertError,
              userId,
            });
            
            // If it's an RLS policy error, the trigger should handle it
            // This is just a fallback, so we can safely return null
            if (errorCode === '42501' || errorMessage.includes('permission denied') || errorMessage.includes('row-level security')) {
              console.warn('Profile creation blocked by RLS policy. Database trigger should handle this.');
            } else if (errorCode === '23505' || errorMessage.includes('duplicate') || errorMessage.includes('unique constraint')) {
              console.warn('Profile already exists (duplicate key). This is normal if trigger already created it.');
              // Try to fetch the existing profile
              try {
                const { data: existingProfile } = await supabase
                  .from('users')
                  .select('*')
                  .eq('id', userId)
                  .maybeSingle();
                
                if (existingProfile) {
                  const firstName = existingProfile.first_name || '';
                  const lastName = existingProfile.last_name || '';
                  const fullName = `${firstName} ${lastName}`.trim() || existingProfile.full_name || existingProfile.name || '';
                  
                  return {
                    ...existingProfile,
                    full_name: fullName,
                    first_name: firstName,
                    last_name: lastName,
                  };
                }
              } catch (fetchError) {
                console.error('Error fetching existing profile:', fetchError);
              }
            }
            
            return null;
          }
        }
      } catch (error: any) {
        // Log detailed error information - handle both Supabase errors and generic errors
        const errorMessage = error?.message || error?.toString() || 'Unknown error';
        const errorCode = error?.code || error?.status || error?.statusCode;
        
        console.error('Error creating user profile (outer catch):', {
          message: errorMessage,
          code: errorCode,
          details: error?.details,
          hint: error?.hint,
          fullError: error,
          userId,
        });
      }
      
      return null;
    }

    // Format the response to match User type - construct full_name from first_name + last_name
    const firstName = data.first_name || '';
    const lastName = data.last_name || '';
    const fullName = `${firstName} ${lastName}`.trim() || data.full_name || data.name || data.email?.split('@')[0] || 'User';
    
    return {
      ...data,
      full_name: fullName,
      first_name: firstName,
      last_name: lastName,
    };
  } catch (error: any) {
    // Only log actual errors, not "user not authenticated"
    if (error?.message && !error.message.includes('not authenticated')) {
      console.error('Error fetching user profile:', error.message);
    }
    return null;
  }
};

// Update user profile
export const updateUserProfile = async (updates: Partial<{
  first_name: string;
  last_name: string;
  phone: string;
  date_of_birth: string | null;
  gender: string | null;
  shipping_address: any;
  billing_address: any;
  newsletter_subscribed: boolean;
  sms_notifications: boolean;
  email_notifications: boolean;
  avatar_url: string;
}>) => {
  try {
    // Get current user ID
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('No authenticated user');
    }

    console.log('Updating profile for user:', user.id);
    console.log('Updates:', updates);

    const { data, error } = await supabase
      .from('users')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Update error:', error);
      throw error;
    }

    console.log('Profile updated successfully:', data);
    return { data, error: null };
  } catch (error: any) {
    console.error('Error updating profile:', error);
    return { data: null, error };
  }
};

// Export as object for convenience
export const authService = {
  signUp,
  signIn,
  signOut,
  resetPassword,
  updatePassword,
  getCurrentUser,
  getUserProfile,
  updateUserProfile,
  resendVerificationEmail,
  onAuthStateChange,
};
