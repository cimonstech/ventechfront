'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { signIn, signOut, getUserProfile } from '@/services/auth.service';
import { useAppDispatch } from '@/store';
import { setUser } from '@/store/authSlice';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<any>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    // Clear error for this field
    if (errors[e.target.name]) {
      setErrors({ ...errors, [e.target.name]: '' });
    }
  };

  const validate = () => {
    const newErrors: any = {};

    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    }

    return newErrors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors = validate();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsLoading(true);

    try {
      const { user, session, error } = await signIn(formData);
      
      if (error) {
        throw error;
      }

      if (user && session) {
        // Get user profile
        const profile = await getUserProfile(user.id);
        
        if (profile) {
          // Handle both first_name/last_name and full_name formats
          const profileData = profile as any;
          const firstName = profileData.first_name || '';
          const lastName = profileData.last_name || '';
          const fullNameFromDb = profileData.full_name || '';
          const fullName = fullNameFromDb || `${firstName} ${lastName}`.trim() || user.email || '';
          
          dispatch(setUser({
            id: user.id,
            email: user.email || '',
            full_name: fullName,
            phone: profileData.phone || '',
            avatar_url: profileData.avatar_url || undefined,
            role: profileData.role || 'customer',
            email_verified: user.email_confirmed_at ? true : false,
            created_at: profileData.created_at || new Date().toISOString(),
            updated_at: profileData.updated_at || new Date().toISOString(),
          }));
          
          toast.success(`Welcome back, ${firstName || fullName.split(' ')[0] || 'User'}!`);
          
          // Redirect based on role
          if (profileData.role === 'admin') {
            router.push('/admin');
          } else {
            router.push('/');
          }
        } else {
          // No profile found, redirect to home
          router.push('/');
        }
      }
    } catch (error: any) {
      console.error('Login error:', error);
      
      // Provide more specific error messages
      let errorMessage = 'Login failed. Please check your credentials.';
      
      if (error?.message) {
        const message = error.message.toLowerCase();
        
        if (message.includes('invalid login credentials') || message.includes('invalid credentials')) {
          errorMessage = 'Invalid email or password. Please check your credentials and try again.';
        } else if (message.includes('email not confirmed') || message.includes('email not verified')) {
          errorMessage = 'Please verify your email before logging in. Check your inbox for the verification link.';
          // Optionally redirect to verification page
          setTimeout(() => {
            router.push('/verify-email');
          }, 2000);
        } else if (message.includes('user not found')) {
          errorMessage = 'No account found with this email. Please sign up first.';
        } else if (message.includes('too many requests') || message.includes('rate limit')) {
          errorMessage = 'Too many login attempts. Please wait a few minutes and try again.';
        } else {
          errorMessage = error.message;
        }
      }
      
      toast.error(errorMessage);
      setErrors({ form: errorMessage });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="flex justify-center mb-4">
            <Link href="/" className="inline-block">
              <div className="text-2xl font-bold text-[#FF7A19]">VENTECH</div>
            </Link>
          </div>
          <h2 className="mt-6 text-center text-3xl font-bold text-gray-900">
            Sign in to your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Or{' '}
            <Link
              href="/register"
              className="font-medium text-[#FF7A19] hover:text-orange-600"
            >
              create a new account
            </Link>
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email" className="sr-only">
                Email address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail size={18} className="text-[#3A3A3A]" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  suppressHydrationWarning
                  className="appearance-none rounded-t-lg relative block w-full px-3 py-3 pl-10 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-[#FF7A19] focus:border-[#FF7A19] focus:z-10 sm:text-sm"
                  placeholder="Email address"
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email}</p>
              )}
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock size={18} className="text-[#3A3A3A]" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  suppressHydrationWarning
                  className="appearance-none rounded-b-lg relative block w-full px-3 py-3 pl-10 pr-10 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-[#FF7A19] focus:border-[#FF7A19] focus:z-10 sm:text-sm"
                  placeholder="Password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#3A3A3A] hover:text-[#FF7A19]"
                  suppressHydrationWarning
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">{errors.password}</p>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                className="h-4 w-4 text-[#FF7A19] focus:ring-[#FF7A19] border-gray-300 rounded"
              />
              <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">
                Remember me
              </label>
            </div>

            <div className="text-sm">
              <Link
                href="/forgot-password"
                className="font-medium text-[#FF7A19] hover:text-orange-600"
              >
                Forgot your password?
              </Link>
            </div>
          </div>

          {errors.form && (
            <div className="rounded-md bg-red-50 p-4">
              <p className="text-sm text-red-800">{errors.form}</p>
            </div>
          )}

          <div>
            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? 'Signing in...' : 'Sign in'}
            </Button>
          </div>

          <div className="text-center">
            <Link
              href="/"
              className="text-sm font-medium text-[#FF7A19] hover:text-orange-600"
            >
              ← Back to Home
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

