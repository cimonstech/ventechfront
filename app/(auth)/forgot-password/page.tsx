'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Mail, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { FieldError, SuccessPanel } from '@/components/ui-states';
import { resetPassword } from '@/services/auth.service';

const SENT = "If an account exists for that email, we've sent a reset link.";

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
      await resetPassword({ email });
    } catch (sendError) {
      console.error('Password reset request', sendError);
    } finally {
      setEmailSent(true);
      setIsLoading(false);
    }
  };

  if (emailSent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-100 flex items-center justify-center py-12 px-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-2xl shadow-xl p-8 border-t-4 border-[#FF7A19]">
            <SuccessPanel
              title="Check your email"
              description={SENT}
              primary={{ label: 'Back to sign in', href: '/login' }}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-100 flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[#1A1A1A] mb-2">Forgot Password?</h1>
          <p className="text-[#3A3A3A]">No worries, we'll send you reset instructions</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8 border-t-4 border-[#FF7A19]">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="forgot-email" className="block text-sm font-semibold text-[#1A1A1A] mb-2">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail size={18} className="text-[#3A3A3A]" />
                </div>
                <input
                  id="forgot-email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError('');
                  }}
                  aria-invalid={error ? true : undefined}
                  aria-describedby={error ? 'forgot-email-error' : undefined}
                  className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF7A19] focus:border-transparent text-sm ${error ? 'border-red-500' : 'border-gray-300'}`}
                  placeholder="Enter your email address"
                  required
                />
              </div>
              <FieldError id="forgot-email-error" message={error} />
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

        <div className="text-center mt-6">
          <Link href="/" className="text-sm text-[#3A3A3A] hover:text-[#FF7A19]">
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
