'use client';

import React, { Suspense, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { ErrorState, FieldError, LoadingMessage, SuccessPanel } from '@/components/ui-states';
import { supabase } from '@/lib/supabase';
import {
  SIGNUP_CONFIRM_OTP_TYPE,
  isAlreadyConfirmedError,
  shouldVerifyAuthLinkOnLoad,
} from '@/lib/authConfirm';
import toast from 'react-hot-toast';

type View = 'ready' | 'success' | 'already' | 'expired' | 'missing';

function ConfirmEmailInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tokenHash = (searchParams.get('token_hash') || '').trim();
  const typeParam = (searchParams.get('type') || '').trim().toLowerCase();
  const emailParam = (searchParams.get('email') || '').trim();

  const otpType = typeParam === 'signup' || typeParam === 'email' || typeParam === 'magiclink'
    ? (typeParam === 'signup' ? SIGNUP_CONFIRM_OTP_TYPE : (typeParam as 'email' | 'magiclink'))
    : SIGNUP_CONFIRM_OTP_TYPE;

  const [view, setView] = useState<View>(() => (tokenHash ? 'ready' : 'missing'));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [resendEmail, setResendEmail] = useState(emailParam);
  const [resendBusy, setResendBusy] = useState(false);

  const title = useMemo(() => {
    if (view === 'success') return 'Email confirmed';
    if (view === 'already') return 'Your email is already confirmed';
    return 'Confirm your email';
  }, [view]);

  const confirm = async () => {
    // verifyOtp only on click — never on load (shouldVerifyAuthLinkOnLoad is false).
    if (shouldVerifyAuthLinkOnLoad()) return;
    if (!tokenHash) {
      setView('missing');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const { error: verifyError } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: otpType,
      });
      if (verifyError) {
        if (isAlreadyConfirmedError(verifyError.message)) {
          setView('already');
          return;
        }
        setView('expired');
        setError(verifyError.message || 'This link is invalid or has expired.');
        return;
      }
      setView('success');
      toast.success('Email confirmed.');
    } catch {
      setView('expired');
      setError('This link is invalid or has expired.');
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    const email = resendEmail.trim();
    if (!email) {
      setError('Enter the email address you signed up with.');
      return;
    }
    setResendBusy(true);
    setError('');
    try {
      const { error: resendError } = await supabase.auth.resend({
        type: 'signup',
        email,
      });
      if (resendError) {
        setError(resendError.message || 'Could not send a new confirmation email.');
        return;
      }
      toast.success('Confirmation email sent. Check your inbox.');
    } catch {
      setError('Could not send a new confirmation email.');
    } finally {
      setResendBusy(false);
    }
  };

  if (view === 'success') {
    return (
      <SuccessPanel
        title={title}
        description="Your email is confirmed. You can sign in now."
        primary={{ label: 'Sign in', href: '/login' }}
      />
    );
  }

  if (view === 'already') {
    return (
      <SuccessPanel
        title={title}
        description="You can sign in with your password."
        primary={{ label: 'Sign in', href: '/login' }}
      />
    );
  }

  if (view === 'missing') {
    return (
      <ErrorState
        title="Confirmation link incomplete"
        description="Open the link from your email again, or request a new confirmation email."
        primary={{ label: 'Back to sign in', href: '/login' }}
      />
    );
  }

  if (view === 'expired') {
    return (
      <div className="mx-auto max-w-md px-4 py-12">
        <ErrorState
          title="This link has expired"
          description="Request a new signup confirmation email. This does not reset your password."
        />
        <div className="mt-6 space-y-3">
          <label className="block text-sm font-semibold text-[#1A1A1A]" htmlFor="confirm-resend-email">
            Email
          </label>
          <input
            id="confirm-resend-email"
            type="email"
            autoComplete="email"
            value={resendEmail}
            onChange={(event) => setResendEmail(event.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-3 text-sm text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#FF7A19]"
          />
          <FieldError id="confirm-resend-error" message={error} />
          <Button type="button" className="w-full min-h-11" isLoading={resendBusy} onClick={() => void resend()}>
            Request a new one
          </Button>
          <Button type="button" variant="outline" className="w-full min-h-11" onClick={() => router.push('/login')}>
            Sign in
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 py-12 text-center">
      <h1 className="text-2xl font-bold text-[#1A1A1A]">{title}</h1>
      <p className="mt-3 text-sm leading-6 text-[#3A3A3A]">
        Tap the button below to confirm this email address. We wait for your click so the link is not used up by email scanners.
      </p>
      <FieldError id="confirm-error" message={error} />
      <div className="mt-8 flex flex-col gap-3">
        <Button type="button" className="w-full min-h-11" isLoading={busy} onClick={() => void confirm()}>
          Confirm your email
        </Button>
        <Link href="/login" className="text-sm font-semibold text-[#C2410C] hover:underline">
          Back to sign in
        </Link>
      </div>
    </div>
  );
}

export default function ConfirmEmailPage() {
  return (
    <Suspense fallback={<LoadingMessage label="Loading confirmation…" />}>
      <ConfirmEmailInner />
    </Suspense>
  );
}
