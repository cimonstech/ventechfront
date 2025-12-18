'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { CheckCircle, XCircle, Loader } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Verifying your email...');

  // Helper function to handle user profile creation
  const handleUserProfile = async (user: any) => {
          try {
            const { data: profile, error: profileError } = await supabase
              .from('users')
              .select('*')
        .eq('id', user.id)
              .maybeSingle();

            if (profileError && profileError.code !== 'PGRST116') {
              console.error('Error checking user profile:', profileError);
            }

            // Create profile if it doesn't exist
            if (!profile) {
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
                    } else {
                      console.log('User profile created successfully (with name field):', newProfile2);
                    }
                  } else {
                    console.error('Error creating user profile:', createError);
                  }
                } else {
                  console.log('User profile created successfully:', newProfile);
                }
              } catch (insertError: any) {
                console.error('Error inserting user profile:', insertError);
              }
            }
          } catch (error) {
            console.error('Error ensuring user profile exists:', error);
          }
  };

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get the code from the URL (check both query params and hash)
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const code = searchParams.get('code') || hashParams.get('code');
        const type = searchParams.get('type') || hashParams.get('type');
        const error = searchParams.get('error') || hashParams.get('error');
        const error_description = searchParams.get('error_description') || hashParams.get('error_description');
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');

        if (error) {
          setStatus('error');
          setMessage(error_description || 'Authentication failed');
          return;
        }

        // If we have tokens in the hash, set the session directly (password reset flow)
        if (accessToken && refreshToken) {
          const { data: { session }, error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (sessionError) {
            console.error('Session error:', sessionError);
            setStatus('error');
            setMessage(sessionError.message || 'Failed to authenticate');
            return;
          }

          if (session && session.user) {
            // If it's a password reset, redirect to reset password page
            // Note: Session is already set, so reset-password page will detect it
            if (type === 'recovery') {
              // Use window.location to preserve any hash fragments
              window.location.href = '/reset-password';
              return;
            }

            // Otherwise, proceed with email verification flow
            await handleUserProfile(session.user);
          setStatus('success');
          setMessage('Email verified successfully!');
            localStorage.removeItem('pendingVerificationEmail');
            setTimeout(() => {
              router.push('/');
            }, 2000);
            return;
          }
        }

        // If we have a code, exchange it for a session
        if (code) {
          const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

          if (exchangeError) {
            console.error('Exchange error:', exchangeError);
            setStatus('error');
            setMessage(exchangeError.message || 'Failed to verify email');
            return;
          }

          if (data.session && data.user) {
            // If it's a password reset, redirect to reset password page
            // Note: Session is already set, so reset-password page will detect it
            if (type === 'recovery') {
              // Use window.location to ensure proper redirect
              window.location.href = '/reset-password';
              return;
            }

            // Otherwise, proceed with email verification flow
            await handleUserProfile(data.user);
            setStatus('success');
            setMessage('Email verified successfully!');
          localStorage.removeItem('pendingVerificationEmail');
          setTimeout(() => {
            router.push('/');
          }, 2000);
            return;
          }
        }

        // No code or tokens found
        if (!code && !accessToken) {
          setStatus('error');
          setMessage('No verification code found');
          return;
        }
      } catch (error: any) {
        console.error('Callback error:', error);
        setStatus('error');
        setMessage(error.message || 'An error occurred during verification');
      }
    };

    handleCallback();
  }, [searchParams, router]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
        {status === 'loading' && (
          <div className="text-center">
            <div className="bg-blue-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Loader className="w-10 h-10 text-blue-600 animate-spin" />
            </div>
            <h1 className="text-2xl font-bold text-[#1A1A1A] mb-3">Verifying Email</h1>
            <p className="text-[#3A3A3A]">{message}</p>
          </div>
        )}

        {status === 'success' && (
          <div className="text-center">
            <div className="bg-green-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-[#1A1A1A] mb-3">Email Verified!</h1>
            <p className="text-[#3A3A3A] mb-6">{message}</p>
            <p className="text-sm text-[#3A3A3A] mb-6">Redirecting you to the homepage...</p>
            <Link href="/">
              <Button variant="primary" className="w-full">
                Go to Homepage
              </Button>
            </Link>
          </div>
        )}

        {status === 'error' && (
          <div className="text-center">
            <div className="bg-red-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
              <XCircle className="w-10 h-10 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-[#1A1A1A] mb-3">Verification Failed</h1>
            <p className="text-[#3A3A3A] mb-6">{message}</p>
            <div className="space-y-3">
              <Link href="/login">
                <Button variant="primary" className="w-full">
                  Go to Login
                </Button>
              </Link>
              <Link href="/register">
                <Button variant="outline" className="w-full">
                  Register Again
                </Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
