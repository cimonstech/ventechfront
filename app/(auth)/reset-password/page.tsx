'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Lock, Eye, EyeOff, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { supabase } from '@/lib/supabase';
import { updatePassword } from '@/services/auth.service';
import toast from 'react-hot-toast';

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isValidating, setIsValidating] = useState(true);
  const [isValid, setIsValid] = useState(false);
  const [error, setError] = useState('');

  // Validate the reset token from URL
  useEffect(() => {
    const validateToken = async () => {
      try {
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const code = hashParams.get('code') || searchParams.get('code');
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        const type = hashParams.get('type');

        // If we have tokens in the hash, exchange them for a session
        if (accessToken && refreshToken) {
          const { data: { session }, error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (sessionError) {
            console.error('Session error:', sessionError);
            setIsValid(false);
            setError('Invalid or expired reset link. Please request a new one.');
            setIsValidating(false);
            return;
          }

          if (session) {
            setIsValid(true);
            setIsValidating(false);
            return;
          }
        }

        // If we have a code, exchange it for a session
        if (code) {
          const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

          if (exchangeError) {
            console.error('Exchange error:', exchangeError);
            setIsValid(false);
            setError('Invalid or expired reset link. Please request a new one.');
            setIsValidating(false);
            return;
          }

          if (data.session) {
            setIsValid(true);
            setIsValidating(false);
            return;
          }
        }

        // If no code or tokens, check if user has an active session (already authenticated)
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          setIsValid(true);
          setIsValidating(false);
          return;
        }

        // No valid session or code
        setIsValid(false);
        setError('Invalid or expired reset link. Please request a new one.');
        setIsValidating(false);
      } catch (error: any) {
        console.error('Validation error:', error);
        setIsValid(false);
        setError('An error occurred while validating the reset link.');
        setIsValidating(false);
      }
    };

    validateToken();
  }, [searchParams]);

  const validate = () => {
    setError('');

    if (!password) {
      setError('Password is required');
      return false;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return false;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validate()) {
      return;
    }

    if (!isValid) {
      setError('Invalid or expired reset link. Please request a new one.');
      return;
    }

    setIsLoading(true);

    try {
      const { error: updateError } = await updatePassword({ password });

      if (updateError) {
        throw updateError;
      }

      toast.success('Password updated successfully!');
      
      // Redirect to login after a short delay
      setTimeout(() => {
        router.push('/login');
      }, 1500);
    } catch (error: any) {
      console.error('Password update error:', error);
      const errorMessage = error.message || 'Failed to update password. Please try again.';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  if (isValidating) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-100 flex items-center justify-center py-12 px-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-2xl shadow-xl p-8 border-t-4 border-[#FF7A19] text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="text-blue-600 animate-pulse" size={32} />
            </div>
            <h2 className="text-2xl font-bold text-[#1A1A1A] mb-3">Validating Reset Link</h2>
            <p className="text-[#3A3A3A]">Please wait while we verify your reset link...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isValid) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-100 flex items-center justify-center py-12 px-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-2xl shadow-xl p-8 border-t-4 border-red-500 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="text-red-600" size={32} />
            </div>
            <h2 className="text-2xl font-bold text-[#1A1A1A] mb-3">Invalid Reset Link</h2>
            <p className="text-[#3A3A3A] mb-6">{error}</p>
            <div className="space-y-3">
              <Link href="/forgot-password">
                <Button variant="primary" size="lg" className="w-full">
                  Request New Reset Link
                </Button>
              </Link>
              <Link href="/login">
                <Button variant="outline" size="lg" className="w-full">
                  Back to Sign In
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-100 flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[#1A1A1A] mb-2">Reset Your Password</h1>
          <p className="text-[#3A3A3A]">Enter your new password below</p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-2xl shadow-xl p-8 border-t-4 border-[#FF7A19]">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* New Password */}
            <div>
              <label className="block text-sm font-semibold text-[#1A1A1A] mb-2">
                New Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock size={18} className="text-[#3A3A3A]" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError('');
                  }}
                  className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF7A19] focus:border-transparent text-sm"
                  placeholder="Enter new password"
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#3A3A3A] hover:text-[#FF7A19]"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <p className="mt-1 text-xs text-[#3A3A3A]">Must be at least 8 characters</p>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-semibold text-[#1A1A1A] mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock size={18} className="text-[#3A3A3A]" />
                </div>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    setError('');
                  }}
                  className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF7A19] focus:border-transparent text-sm"
                  placeholder="Confirm new password"
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#3A3A3A] hover:text-[#FF7A19]"
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? 'Updating Password...' : 'Update Password'}
            </Button>
          </form>

          {/* Back to Login */}
          <Link href="/login">
            <Button
              variant="ghost"
              size="md"
              className="w-full mt-4 text-[#3A3A3A] hover:text-[#FF7A19]"
            >
              Back to Sign In
            </Button>
          </Link>
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

