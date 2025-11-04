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
export const signUp = async (data: SignUpData): Promise<AuthResponse> => {
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
                  console.error('Error creating user profile (with name field):', createError2);
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
                console.error('Error creating user profile:', createError);
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
            console.error('Error inserting user profile:', insertError);
            return null;
          }
        }
      } catch (error: any) {
        console.error('Error creating user profile:', error);
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
