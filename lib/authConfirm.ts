import type { EmailOtpType } from '@supabase/supabase-js';

/** Signup confirmation links use type=email with token_hash (supabase-js ^2.76). */
export const SIGNUP_CONFIRM_OTP_TYPE: EmailOtpType = 'email';

/** Never call verifyOtp on page load — email scanners consume the code. */
export function shouldVerifyAuthLinkOnLoad(): boolean {
  return false;
}

export function isAlreadyConfirmedError(message: string | null | undefined): boolean {
  const text = String(message || '').toLowerCase();
  return (
    text.includes('already confirmed') ||
    text.includes('email address has already been confirmed') ||
    text.includes('user already registered') ||
    (text.includes('already') && text.includes('confirm'))
  );
}
