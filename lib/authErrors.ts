export type SignInMapped = {
  kind: 'credentials' | 'unconfirmed' | 'rate_limited' | 'generic';
  message: string;
};

export type SignUpMapped = {
  kind: 'already_registered' | 'rate_limited' | 'generic';
  message: string;
};

function textOf(error: unknown): string {
  if (!error) return '';
  if (error instanceof Error) return error.message || '';
  if (typeof error === 'string') return error;
  if (typeof error === 'object') {
    const record = error as { message?: unknown; code?: unknown; error_description?: unknown };
    const parts = [record.message, record.code, record.error_description];
    return parts.filter((part) => typeof part === 'string').join(' ');
  }
  return '';
}

function statusOf(error: unknown): number | undefined {
  if (!error || typeof error !== 'object') return undefined;
  const record = error as { status?: unknown; statusCode?: unknown };
  if (typeof record.status === 'number') return record.status;
  if (typeof record.statusCode === 'number') return record.statusCode;
  return undefined;
}

function codeOf(error: unknown): string {
  if (!error || typeof error !== 'object') return '';
  const record = error as { code?: unknown };
  return typeof record.code === 'string' ? record.code : '';
}

function isRateLimited(error: unknown, haystack: string): boolean {
  const status = statusOf(error);
  const code = codeOf(error).toLowerCase();
  return (
    status === 429 ||
    code.includes('over_request_rate_limit') ||
    code.includes('over_email_send_rate_limit') ||
    haystack.includes('rate limit') ||
    haystack.includes('too many requests') ||
    haystack.includes('429')
  );
}

export function mapSignInError(error: unknown): SignInMapped {
  const haystack = `${codeOf(error)} ${textOf(error)}`.toLowerCase();
  if (isRateLimited(error, haystack)) {
    return { kind: 'rate_limited', message: 'Too many attempts. Try again in a few minutes.' };
  }
  if (haystack.includes('email not confirmed') || haystack.includes('email_not_confirmed')) {
    return { kind: 'unconfirmed', message: 'Confirm your email first.' };
  }
  if (
    haystack.includes('invalid login credentials') ||
    haystack.includes('invalid_credentials') ||
    haystack.includes('invalid credentials') ||
    haystack.includes('user not found') ||
    haystack.includes('invalid email or password')
  ) {
    return { kind: 'credentials', message: 'Email or password is incorrect.' };
  }
  return { kind: 'generic', message: "We couldn't sign you in. Please try again." };
}

export function mapSignUpError(error: unknown): SignUpMapped {
  const haystack = `${codeOf(error)} ${textOf(error)}`.toLowerCase();
  if (isRateLimited(error, haystack)) {
    return { kind: 'rate_limited', message: 'Too many attempts. Try again in a few minutes.' };
  }
  if (
    haystack.includes('already registered') ||
    haystack.includes('already exists') ||
    haystack.includes('user_already_exists')
  ) {
    return {
      kind: 'already_registered',
      message: 'Check your email to continue. If you already have an account, sign in instead.',
    };
  }
  return { kind: 'generic', message: "We couldn't create your account. Please try again." };
}

export function mapAuthCallbackError(): string {
  return "We couldn't complete sign-in. Please try again.";
}

export function mapAuthLinkError(): string {
  return 'This sign-in link is invalid or has expired.';
}

export function mapResendError(error: unknown): string {
  const haystack = `${codeOf(error)} ${textOf(error)}`.toLowerCase();
  if (isRateLimited(error, haystack)) {
    return 'Too many attempts. Try again in a few minutes.';
  }
  return "We couldn't send that email. Please try again.";
}
