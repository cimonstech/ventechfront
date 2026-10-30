'use client';

import React, { useEffect, useLayoutEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Lock, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ErrorState, FieldError, LoadingMessage } from '@/components/ui-states';
import { supabase } from '@/lib/supabase';
import { getUserProfile, signOut } from '@/services/auth.service';
import { postSignInPath } from '@/lib/landing';
import {
  clearRecoveryOnly,
  hashRecoveryType,
  isRecoveryLinkType,
  isRecoveryOnly,
  markRecoveryOnly,
  type RecoveryLinkType,
} from '@/lib/recoverySession';
import { clearRememberedRedirect, peekRememberedRedirect } from '@/lib/safeRedirect';
import { useAppDispatch } from '@/store';
import { setUser } from '@/store/authSlice';
import type { User } from '@/types/user';
import toast from 'react-hot-toast';

const ROLES: User['role'][] = ['admin', 'superadmin', 'staff', 'customer'];

function asRole(value: string | undefined): User['role'] {
  return ROLES.includes(value as User['role']) ? (value as User['role']) : 'customer';
}

const EXPIRED = 'This link is invalid or has expired. Request a new one.';
const UPDATE_FAILED = 'Could not update your password. Please try again.';

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dispatch = useAppDispatch();
  const tokenHash = (searchParams.get('token_hash') || '').trim();
  const queryType = searchParams.get('type');
  const queryOk = Boolean(tokenHash) && isRecoveryLinkType(queryType);

  const [linkType, setLinkType] = useState<RecoveryLinkType | null>(
    isRecoveryLinkType(queryType) ? queryType : null
  );
  const [legacyReady, setLegacyReady] = useState(false);
  const [legacyOk, setLegacyOk] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [expired, setExpired] = useState(false);

  useLayoutEffect(() => {
    const hashType = hashRecoveryType();
    if (hashType) {
      markRecoveryOnly();
      setLinkType((current) => current || hashType);
      setLegacyOk(true);
      setExpired(false);
    } else if (isRecoveryOnly()) {
      setLegacyOk(true);
      setExpired(false);
    }
    setLegacyReady(true);
  }, []);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        markRecoveryOnly();
        setLinkType((current) => current || 'recovery');
        setLegacyOk(true);
        setExpired(false);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const invite = linkType === 'invite';
  const canSubmit = queryOk || legacyOk;

  const validate = () => {
    if (!password || !confirmPassword) {
      setError('Enter your new password twice.');
      return false;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return false;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return false;
    }
    return true;
  };

  const finishSignedIn = async () => {
    clearRecoveryOnly();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const profile = await getUserProfile(user.id);
      if (profile) {
        const profileData = profile as {
          first_name?: string;
          last_name?: string;
          full_name?: string;
          phone?: string;
          avatar_url?: string;
          role?: string;
          created_at?: string;
          updated_at?: string;
        };
        const firstName = profileData.first_name || '';
        const lastName = profileData.last_name || '';
        const fullName = profileData.full_name || `${firstName} ${lastName}`.trim() || user.email || '';
        dispatch(setUser({
          id: user.id,
          email: user.email || '',
          full_name: fullName,
          phone: profileData.phone || '',
          avatar_url: profileData.avatar_url || undefined,
          role: asRole(profileData.role),
          email_verified: user.email_confirmed_at ? true : false,
          created_at: profileData.created_at || new Date().toISOString(),
          updated_at: profileData.updated_at || new Date().toISOString(),
        }));
        const destination = await postSignInPath(peekRememberedRedirect(), asRole(profileData.role));
        clearRememberedRedirect();
        router.push(destination);
        return;
      }
    }
    const destination = await postSignInPath(peekRememberedRedirect());
    clearRememberedRedirect();
    router.push(destination);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!validate()) return;
    if (!canSubmit) {
      setExpired(true);
      return;
    }

    setIsLoading(true);
    try {
      if (queryOk && tokenHash && isRecoveryLinkType(queryType)) {
        const { error: verifyError } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: queryType,
        });
        if (verifyError) {
          setExpired(true);
          return;
        }
      }

      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        await signOut();
        dispatch(setUser(null));
        setError(UPDATE_FAILED);
        toast.error(UPDATE_FAILED);
        return;
      }

      toast.success('Password saved.');
      await finishSignedIn();
    } catch {
      await signOut();
      dispatch(setUser(null));
      setError(UPDATE_FAILED);
      toast.error(UPDATE_FAILED);
    } finally {
      setIsLoading(false);
    }
  };

  if (!legacyReady && !queryOk) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-100 flex items-center justify-center py-12 px-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-2xl shadow-xl p-8 border-t-4 border-[#FF7A19]">
            <LoadingMessage label="Checking your link" />
          </div>
        </div>
      </div>
    );
  }

  if (expired || (legacyReady && !canSubmit)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-100 flex items-center justify-center py-12 px-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-2xl shadow-xl p-8 border-t-4 border-red-500">
            <ErrorState
              title="This link has expired"
              description={EXPIRED}
              primary={{ label: 'Request a new one', href: '/forgot-password' }}
              secondary={{ label: 'Back to sign in', href: '/login', variant: 'outline' }}
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
          <h1 className="text-3xl font-bold text-[#1A1A1A] mb-2">
            {invite ? 'Set your password' : 'Reset Your Password'}
          </h1>
          <p className="text-[#3A3A3A]">Enter a new password of at least 8 characters.</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8 border-t-4 border-[#FF7A19]">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="reset-password" className="block text-sm font-semibold text-[#1A1A1A] mb-2">
                New Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock size={18} className="text-[#3A3A3A]" />
                </div>
                <input
                  id="reset-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError('');
                  }}
                  aria-invalid={error ? true : undefined}
                  aria-describedby={error ? 'reset-password-error' : undefined}
                  className={`w-full pl-10 pr-12 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF7A19] focus:border-transparent text-sm ${error ? 'border-red-500' : 'border-gray-300'}`}
                  placeholder="Enter new password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#3A3A3A] hover:text-[#FF7A19]"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="reset-password-confirm" className="block text-sm font-semibold text-[#1A1A1A] mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock size={18} className="text-[#3A3A3A]" />
                </div>
                <input
                  id="reset-password-confirm"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    setError('');
                  }}
                  aria-invalid={error ? true : undefined}
                  aria-describedby={error ? 'reset-password-error' : undefined}
                  className={`w-full pl-10 pr-12 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF7A19] focus:border-transparent text-sm ${error ? 'border-red-500' : 'border-gray-300'}`}
                  placeholder="Confirm new password"
                  required
                  minLength={8}
                  autoComplete="new-password"
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

            <FieldError id="reset-password-error" message={error} />

            <Button
              type="submit"
              variant="primary"
              size="lg"
              disabled={isLoading}
              className="w-full"
            >
              {isLoading
                ? 'Saving…'
                : invite
                  ? 'Set password and continue'
                  : 'Update Password'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
