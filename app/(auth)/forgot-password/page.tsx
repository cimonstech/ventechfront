'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Mail, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { resetPassword } from '@/services/auth.service';
import toast from 'react-hot-toast';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [error, setError] = useState('');

  const validate = () => {
    if (!email) {
      setError('Email is required');
      return false;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setError('Email is invalid');
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

    setIsLoading(true);

    try {
      const { error: resetError } = await resetPassword({ email });
      
      if (resetError) {
        throw resetError;
      }

      setEmailSent(true);
      toast.success('Password reset email sent! Check your inbox.');
    } catch (error: any) {
      console.error('Password reset error:', error);
      // Handle rate limiting (429 error)
      if ((error?.status === 429) || error.message?.includes('429') || error.message?.toLowerCase().includes('rate limit')) {
        const errorMessage = 'Too many requests. Please wait a few minutes before trying again.';
        setError(errorMessage);
        toast.error(errorMessage, {
          duration: 5000,
        });
      } else {
      const errorMessage = error.message || 'Failed to send reset email. Please try again.';
      setError(errorMessage);
      toast.error(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (emailSent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-100 flex items-center justify-center py-12 px-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-2xl shadow-xl p-8 border-t-4 border-[#FF7A19] text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail className="text-green-600" size={32} />
            </div>
            <h2 className="text-2xl font-bold text-[#1A1A1A] mb-3">Check Your Email</h2>
            <p className="text-[#3A3A3A] mb-6">
              We've sent a password reset link to <strong>{email}</strong>.
              Please check your inbox and follow the instructions.
            </p>
            <div className="space-y-3">
              <Button
                variant="primary"
                size="lg"
                className="w-full"
                onClick={() => window.location.href = 'mailto:'}
              >
                Open Email App
              </Button>
              <Link href="/login">
                <Button variant="outline" size="lg" className="w-full">
                  Back to Sign In
                </Button>
              </Link>
            </div>
            <p className="text-xs text-[#3A3A3A] mt-6">
              Didn't receive the email?{' '}
              <button
                onClick={() => setEmailSent(false)}
                className="text-[#FF7A19] hover:underline font-semibold"
              >
                Try again
              </button>
            </p>
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
          <h1 className="text-3xl font-bold text-[#1A1A1A] mb-2">Forgot Password?</h1>
          <p className="text-[#3A3A3A]">No worries, we'll send you reset instructions</p>
        </div>

        {/* Form */}
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
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError('');
                  }}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF7A19] focus:border-transparent text-sm"
                  placeholder="Enter your email address"
                  required
                />
              </div>
              {error && (
                <p className="mt-1 text-xs text-red-600">{error}</p>
              )}
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? 'Sending...' : 'Send Reset Link'}
            </Button>
          </form>

          {/* Back to Login */}
          <Link href="/login">
            <Button
              variant="ghost"
              size="md"
              className="w-full mt-4 text-[#3A3A3A] hover:text-[#FF7A19]"
            >
              <ArrowLeft size={18} className="mr-2" />
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
