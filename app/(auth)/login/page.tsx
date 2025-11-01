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
          const fullName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim();
          
          dispatch(setUser({
            id: user.id,
            email: user.email!,
            name: fullName || user.email!,
            role: profile.role,
          }));
          
          toast.success(`Welcome back, ${profile.first_name || 'User'}!`);
          
          // Redirect based on role
          if (profile.role === 'admin') {
            router.push('/admin');
          } else {
            router.push('/');
          }
        } else {
          // Profile doesn't exist - this shouldn't happen but handle it
          toast.error('User profile not found. Please contact support.');
          await signOut();
        }
      }
    } catch (error: any) {
      console.error('Login error:', error);
      console.log('Full error object:', JSON.stringify(error, null, 2));
      
      // Check for specific error types
      let errorMessage = 'Invalid email or password';
      
      if (error.message?.includes('Email not confirmed')) {
        // Store email for verification page
        localStorage.setItem('pendingVerificationEmail', formData.email);
        toast.error('Please verify your email before logging in.');
        // Redirect to verify-email page
        router.push('/verify-email?email=' + encodeURIComponent(formData.email));
        return;
      } else if (error.message?.includes('Invalid login credentials')) {
        // Check if user exists in database first
        try {
          const { data: existingUser } = await supabase
            .from('users')
            .select('id, email_confirmed_at')
            .eq('email', formData.email)
            .single();
          
          if (existingUser) {
            // User exists but credentials are wrong or email not confirmed
            if (!existingUser.email_confirmed_at) {
              // Email not confirmed
              localStorage.setItem('pendingVerificationEmail', formData.email);
              toast.error('Please verify your email before logging in.');
              router.push('/verify-email?email=' + encodeURIComponent(formData.email));
              return;
            } else {
              // Wrong password
              errorMessage = 'Invalid password. Please try again.';
            }
          } else {
            // User doesn't exist - show different message
            errorMessage = 'No account found with this email address.';
            toast.error(errorMessage);
            return;
          }
        } catch (dbError) {
          // Database error - fall back to generic message
          errorMessage = 'Invalid email or password.';
        }
        
        toast.error(errorMessage);
        
        // Only show verification option if user exists but email not confirmed
        if (errorMessage === 'Invalid password. Please try again.') {
          setTimeout(() => {
            toast((t) => (
              <div className="flex flex-col gap-2">
                <p className="font-semibold">Haven't verified your email?</p>
                <button
                  onClick={() => {
                    localStorage.setItem('pendingVerificationEmail', formData.email);
                    router.push('/verify-email?email=' + encodeURIComponent(formData.email));
                  }}
                  className="text-[#FF7A19] hover:underline text-sm font-semibold"
                >
                  Click here to resend verification email →
                </button>
              </div>
            ), { duration: 6000 });
          }, 1000);
        }
        return;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-100 flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[#1A1A1A] mb-2">Welcome Back</h1>
          <p className="text-[#3A3A3A]">Sign in to your account to continue</p>
        </div>

        {/* Login Form */}
        <div className="bg-white rounded-2xl shadow-xl p-8 border-t-4 border-[#FF7A19]">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-[#1A1A1A] mb-2">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail size={18} className="text-[#3A3A3A]" />
                </div>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF7A19] focus:border-transparent text-sm"
                  placeholder="you@example.com"
                  required
                  suppressHydrationWarning
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-xs text-red-600">{errors.email}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-[#1A1A1A] mb-2">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock size={18} className="text-[#3A3A3A]" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF7A19] focus:border-transparent text-sm"
                  placeholder="Enter your password"
                  required
                  suppressHydrationWarning
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#3A3A3A] hover:text-[#FF7A19]"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-xs text-red-600">{errors.password}</p>
              )}
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  className="w-4 h-4 text-[#FF7A19] border-gray-300 rounded focus:ring-[#FF7A19]"
                />
                <span className="ml-2 text-sm text-[#3A3A3A]">Remember me</span>
              </label>

              <Link
                href="/forgot-password"
                className="text-sm text-[#FF7A19] hover:text-[#E66600] font-medium"
              >
                Forgot password?
              </Link>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          {/* Sign Up Link */}
          <p className="text-center text-sm text-[#3A3A3A] mt-6">
            Don't have an account?{' '}
            <Link href="/register" className="text-[#FF7A19] hover:text-[#E66600] font-semibold">
              Sign up
            </Link>
          </p>
        </div>

        {/* Back to Home */}
        <div className="text-center mt-6">
          <Link href="/" className="text-sm text-[#3A3A3A] hover:text-[#FF7A19]">
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
