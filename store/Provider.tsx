'use client';

import { Provider } from 'react-redux';
import { store } from './index';
import { useEffect } from 'react';
import { loadCartFromStorage } from './cartSlice';
import { setUser, setLoading } from './authSlice';
import { onAuthStateChange, getUserProfile } from '@/services/auth.service';
import { supabase } from '@/lib/supabase';

export function ReduxProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Load cart from localStorage on app start
    if (typeof window !== 'undefined') {
      try {
        const savedCart = localStorage.getItem('cart');
        if (savedCart) {
          store.dispatch(loadCartFromStorage(JSON.parse(savedCart)));
        }
      } catch (error) {
        console.error('Error loading cart from localStorage:', error);
      }
    }

    // Check initial session first
    const checkInitialSession = async () => {
      try {
        store.dispatch(setLoading(true));
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
          store.dispatch(setLoading(false));
          return;
        }

        if (session?.user) {
          // Session exists - fetch user profile
          const profile = await getUserProfile(session.user.id);
          if (profile) {
            store.dispatch(setUser(profile));
          } else {
            // Session exists but profile fetch failed - clear state
            store.dispatch(setUser(null));
          }
        } else {
          // No session - user is not authenticated
          store.dispatch(setUser(null));
        }
      } catch (error) {
        console.error('Error checking initial session:', error);
        store.dispatch(setUser(null));
      } finally {
        store.dispatch(setLoading(false));
      }
    };

    checkInitialSession();

    // Set up auth state listener
    const { data: { subscription } } = onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session?.user?.id);
      
      // Handle INITIAL_SESSION - this happens on page refresh
      if (event === 'INITIAL_SESSION' && session?.user) {
        // Initial session load - fetch user profile
        const profile = await getUserProfile(session.user.id);
        if (profile) {
          store.dispatch(setUser(profile));
        } else {
          // Session exists but profile fetch failed - clear state
          store.dispatch(setUser(null));
        }
        store.dispatch(setLoading(false));
        return;
      }
      
      if (event === 'SIGNED_IN' && session?.user) {
        // User signed in - fetch their profile
        const profile = await getUserProfile(session.user.id);
        if (profile) {
          store.dispatch(setUser(profile));
        }
      } else if (event === 'SIGNED_OUT') {
        // User signed out - clear state
        store.dispatch(setUser(null));
      } else if (event === 'TOKEN_REFRESHED' && session?.user) {
        // Token refreshed - ensure user is still set
        const profile = await getUserProfile(session.user.id);
        if (profile) {
          store.dispatch(setUser(profile));
        }
      } else if (event === 'USER_UPDATED' && session?.user) {
        // User updated - refresh profile
        const profile = await getUserProfile(session.user.id);
        if (profile) {
          store.dispatch(setUser(profile));
        }
      }
      
      store.dispatch(setLoading(false));
    });

    // Cleanup subscription on unmount
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return <Provider store={store}>{children}</Provider>;
}


