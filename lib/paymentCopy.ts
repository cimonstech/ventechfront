export const PAYMENT_COPY = {
  startFailed: "We couldn't start your payment. Please try again.",
  placeFailed: "We couldn't place your order. Please try again.",
  declined: "This payment didn't go through. You haven't been charged. Try again, or pick another method.",
  abandoned: 'Payment was cancelled. Your cart is still here.',
  confirmFailed(reference?: string | null) {
    const ref = reference?.trim();
    if (ref) {
      return `We couldn't confirm your payment yet. If you were charged, contact support with reference ${ref}. You won't be charged twice.`;
    }
    return "We couldn't confirm your payment yet. If you were charged, contact support with your payment reference. You won't be charged twice.";
  },
  pending(reference?: string | null) {
    const ref = reference?.trim();
    if (ref) {
      return `We're still waiting for this payment. If you were charged, contact support with reference ${ref}. You won't be charged twice.`;
    }
    return "We're still waiting for this payment. If you were charged, contact support with your payment reference. You won't be charged twice.";
  },
};

export type PaystackChargeStatus = 'success' | 'failed' | 'abandoned' | 'pending';

export function messageForChargeStatus(
  status: PaystackChargeStatus | string | undefined,
  reference?: string | null
): string {
  if (status === 'success') return 'Payment successful.';
  if (status === 'abandoned') return PAYMENT_COPY.abandoned;
  if (status === 'pending') return PAYMENT_COPY.pending(reference);
  if (status === 'failed') return PAYMENT_COPY.declined;
  return PAYMENT_COPY.confirmFailed(reference);
}
