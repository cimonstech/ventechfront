'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams, useRouter } from 'next/navigation';
import { Mail, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { resendVerificationEmail } from '@/services/auth.service';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const emailParam = searchParams.get('email');
  const code = searchParams.get('code');
  const [email, setEmail] = useState(emailParam || '');
  const [isResending, setIsResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // If there's a verification code, redirect to callback page
  useEffect(() => {
    if (code) {
      router.push(`/auth/callback?code=${code}`);
    }
  }, [code, router]);

  // Try to get email from localStorage or Supabase session
  useEffect(() => {
    const loadEmail = async () => {
      if (!email) {
        // Try localStorage first
        const storedEmail = localStorage.getItem('pendingVerificationEmail');
        if (storedEmail) {
          setEmail(storedEmail);
          return;
        }

        // Try to get from Supabase session
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.email) {
          setEmail(session.user.email);
        }
      }
    };
    loadEmail();
  }, [email]);

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleResend = async () => {
    if (!email) {
      toast.error('Email address not found');
      return;
    }

    setIsResending(true);

    try {
      const { error } = await resendVerificationEmail(email);
      
      if (error) {
        throw error;
      }

      toast.success('Verification email sent! Please check your inbox.');
      setResendCooldown(60); // 60 second cooldown
    } catch (error: any) {
      console.error('Resend error:', error);
      // Handle rate limiting (429 error)
      if ((error?.status === 429) || error.message?.includes('429') || error.message?.toLowerCase().includes('rate limit')) {
        toast.error('Too many requests. Please wait a few minutes before requesting another email.', {
          duration: 5000,
        });
        setResendCooldown(300); // 5 minute cooldown for rate limiting
      } else {
      toast.error(error.message || 'Failed to resend email. Please try again.');
      }
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-100 flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full">
        {/* Header - Back link */}
        <div className="text-center mb-4">
          <Link href="/" className="text-sm text-[#FF7A19] hover:underline">
            ← Back to Home
          </Link>
        </div>

        {/* Content */}
        <div className="bg-white rounded-2xl shadow-xl p-8 border-t-4 border-[#FF7A19] text-center">
          <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Mail className="text-[#FF7A19]" size={40} />
          </div>

          <h1 className="text-2xl font-bold text-[#1A1A1A] mb-3">Verify Your Email</h1>
          
          {email && (
            <p className="text-[#3A3A3A] mb-6">
              We've sent a verification email to<br />
              <strong className="text-[#1A1A1A]">{email}</strong>
            </p>
          )}

          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6 text-left">
            <p className="text-sm text-[#3A3A3A] mb-3">
              <strong className="text-[#1A1A1A]">Next steps:</strong>
            </p>
            <ol className="text-sm text-[#3A3A3A] space-y-2 list-decimal list-inside">
              <li>Check your email inbox</li>
              <li>Click the verification link in the email</li>
              <li>You'll be redirected back to sign in</li>
            </ol>
          </div>

          <div className="space-y-3">
            <Button
              variant="primary"
              size="lg"
              className="w-full"
              onClick={() => window.location.href = 'mailto:'}
            >
              Open Email App
            </Button>

            <Button
              variant="outline"
              size="lg"
              className="w-full"
              onClick={handleResend}
              disabled={isResending || resendCooldown > 0}
            >
              {isResending ? (
                <>
                  <RefreshCw size={18} className="mr-2 animate-spin" />
                  Sending...
                </>
              ) : resendCooldown > 0 ? (
                `Resend in ${resendCooldown}s`
              ) : (
                <>
                  <RefreshCw size={18} className="mr-2" />
                  Resend Verification Email
                </>
              )}
            </Button>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-sm text-[#3A3A3A] mb-3">
              <strong>Didn't receive the email?</strong>
            </p>
            <ul className="text-xs text-[#3A3A3A] space-y-1">
              <li>• Check your spam or junk folder</li>
              <li>• Make sure {email} is correct</li>
              <li>• Wait a few minutes and try resending</li>
            </ul>
          </div>

          <p className="text-xs text-[#3A3A3A] mt-6">
            Need help?{' '}
            <a href="mailto:ventechgadgets@gmail.com" className="text-[#FF7A19] hover:underline font-semibold">
              Contact Support
            </a>
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
