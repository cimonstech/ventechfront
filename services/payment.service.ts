import { loadPaystack } from '@/lib/paystack';
import { apiRequest } from '@/lib/api';
import { PAYMENT_COPY, type PaystackChargeStatus } from '@/lib/paymentCopy';

interface PaymentData {
  email: string;
  amount: number; // Amount in pesewas (GHS * 100)
  reference: string;
  callback_url?: string;
  metadata?: {
    order_id?: string;
    user_id?: string;
    [key: string]: any;
  };
}

interface PaymentResponse {
  success: boolean;
  reference?: string;
  authorization_url?: string;
  access_code?: string;
  message?: string;
  status?: PaystackChargeStatus;
  data?: {
    status?: string;
    reference?: string;
    [key: string]: any;
  };
}

type InitializePayload = {
  access_code?: string;
  authorization_url?: string;
};

export const paymentService = {
  async initializePayment(data: PaymentData): Promise<PaymentResponse> {
    const result = await apiRequest<InitializePayload>('/api/payments/initialize', {
      method: 'POST',
      returnPath: '/checkout',
      body: JSON.stringify({
        email: data.email,
        amount: data.amount,
        reference: data.reference,
        callback_url: data.callback_url || `${typeof window !== 'undefined' ? window.location.origin : ''}/payment/callback`,
        metadata: data.metadata || {},
      }),
    });

    if (!result.ok) {
      const message =
        result.kind === 'network' || result.kind === 'rate_limited' || result.kind === 'unauthorized'
          ? result.message
          : PAYMENT_COPY.startFailed;
      return { success: false, message, reference: data.reference };
    }

    const access_code = result.data?.access_code;
    const authorization_url = result.data?.authorization_url;

    if (typeof window !== 'undefined') {
      sessionStorage.setItem('pending_checkout_data', JSON.stringify({
        reference: data.reference,
        email: data.email,
        metadata: data.metadata,
        checkout_data: data.metadata?.checkout_data,
      }));
      sessionStorage.setItem('pending_payment_reference', data.reference);

      try {
        const PaystackPop = await loadPaystack();

        if (authorization_url) {
          window.location.href = authorization_url;
        } else if (PaystackPop && typeof PaystackPop.resumeTransaction === 'function' && access_code) {
          PaystackPop.resumeTransaction(access_code);
          const callbackUrl = data.callback_url || `${window.location.origin}/payment/callback`;
          const redirectCheck = setInterval(() => {
            if (window.location.pathname.includes('/payment/callback') ||
                window.location.pathname.includes('/orders/')) {
              clearInterval(redirectCheck);
            }
          }, 500);
          setTimeout(() => {
            clearInterval(redirectCheck);
            if (!window.location.pathname.includes('/payment/callback') &&
                !window.location.pathname.includes('/orders/')) {
              window.location.href = `${callbackUrl}?reference=${data.reference}`;
            }
          }, 3000);
        } else if (PaystackPop && typeof PaystackPop.setup === 'function') {
          const publicKey = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY;
          if (!publicKey) {
            if (authorization_url) {
              window.location.href = authorization_url;
            } else {
              return { success: false, message: PAYMENT_COPY.startFailed, reference: data.reference };
            }
          } else {
            const callbackUrl = data.callback_url || `${window.location.origin}/payment/callback`;
            const handler = PaystackPop.setup({
              key: publicKey,
              email: data.email,
              amount: data.amount,
              ref: data.reference,
              currency: 'GHS',
              callback_url: callbackUrl,
              callback: (response: any) => {
                const ref = response.reference || data.reference;
                window.location.href = `${callbackUrl}?reference=${ref}`;
              },
              onClose: () => {
                setTimeout(() => {
                  if (!window.location.pathname.includes('/payment/callback') &&
                      !window.location.pathname.includes('/orders/')) {
                    window.location.href = `${callbackUrl}?reference=${data.reference}`;
                  }
                }, 1000);
              },
            });
            handler.openIframe();
          }
        } else if (authorization_url) {
          window.location.href = authorization_url;
        } else {
          return { success: false, message: PAYMENT_COPY.startFailed, reference: data.reference };
        }
      } catch (paystackError) {
        console.error('Paystack initialization error:', paystackError);
        if (authorization_url) {
          window.location.href = authorization_url;
        } else {
          return { success: false, message: PAYMENT_COPY.startFailed, reference: data.reference };
        }
      }
    }

    return {
      success: true,
      reference: data.reference,
      access_code,
      authorization_url,
    };
  },

  async verifyPayment(reference: string): Promise<PaymentResponse> {
    const result = await apiRequest<{ status?: PaystackChargeStatus; reference?: string }>(
      '/api/payments/verify',
      {
        method: 'POST',
        body: JSON.stringify({ reference }),
      }
    );

    if (!result.ok) {
      const message =
        result.kind === 'network' || result.kind === 'rate_limited'
          ? result.message
          : PAYMENT_COPY.confirmFailed(reference);
      return {
        success: false,
        reference,
        message,
      };
    }

    const status = (result.data?.status || 'failed') as PaystackChargeStatus;
    const ref = result.data?.reference || reference;
    return {
      success: true,
      reference: ref,
      status,
      message: result.message,
      data: {
        status,
        reference: ref,
      },
    };
  },
};
