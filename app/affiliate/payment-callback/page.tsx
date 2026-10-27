'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle, Loader, XCircle } from 'lucide-react';
import { useAppSelector } from '@/store';
import { safeRedirectPath } from '@/lib/safeRedirect';
import { affiliateRequest, apiMessage } from '@/lib/affiliates';

export default function AffiliatePaymentCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, isLoading } = useAppSelector((state) => state.auth);
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Verifying payment...');
  const ran = useRef(false);

  useEffect(() => {
    if (isLoading) return;
    const reference = searchParams.get('reference') || searchParams.get('trxref');
    if (!isAuthenticated) {
      const path = reference
        ? `/affiliate/payment-callback?reference=${encodeURIComponent(reference)}`
        : '/affiliate/payment-callback';
      const next = safeRedirectPath(path);
      router.replace(next ? `/login?redirect=${encodeURIComponent(next)}` : '/login');
      return;
    }
    if (!reference) {
      setStatus('error');
      setMessage('No payment reference found.');
      return;
    }
    if (ran.current) return;
    ran.current = true;

    const verify = async () => {
      try {
        await affiliateRequest('/api/affiliates/fee/verify', {
          method: 'POST',
          body: JSON.stringify({ reference }),
        });
        setStatus('success');
        setMessage('Payment received, your application is under review');
      } catch (error) {
        setStatus('error');
        setMessage(apiMessage(error, 'Could not verify this payment.'));
      }
    };
    void verify();
  }, [isAuthenticated, isLoading, router, searchParams]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-16">
      <div className="w-full max-w-md rounded-xl bg-white p-8 text-center shadow-lg">
        {status === 'loading' && (
          <Loader className="mx-auto mb-4 h-12 w-12 animate-spin text-[#FF7A19]" />
        )}
        {status === 'success' && <CheckCircle className="mx-auto mb-4 h-12 w-12 text-green-600" />}
        {status === 'error' && <XCircle className="mx-auto mb-4 h-12 w-12 text-red-600" />}
        <h1 className="mb-2 text-xl font-bold text-[#1A1A1A]">
          {status === 'success' ? 'Payment received' : status === 'error' ? 'Payment issue' : 'Please wait'}
        </h1>
        <p className="mb-6 text-[#3A3A3A]">{message}</p>
        {status !== 'loading' && (
          <Link
            href={status === 'success' ? '/affiliate/dashboard' : '/affiliate/join'}
            className="inline-flex rounded-lg bg-[#FF7A19] px-4 py-2 font-medium text-white hover:bg-[#e66a0f]"
          >
            {status === 'success' ? 'Go to dashboard' : 'Back to application'}
          </Link>
        )}
      </div>
    </div>
  );
}
