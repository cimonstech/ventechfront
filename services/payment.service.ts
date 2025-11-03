import { loadPaystack } from '@/lib/paystack';
import toast from 'react-hot-toast';

export interface PaymentData {
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

export interface PaymentResponse {
  success: boolean;
  reference?: string;
  authorization_url?: string;
  access_code?: string;
  message?: string;
}

export const paymentService = {
  // Initialize Paystack payment via backend (proper Paystack flow)
  async initializePayment(data: PaymentData): Promise<PaymentResponse> {
    try {
      // Get API URL from environment or use default
      const API_URL = typeof window !== 'undefined' 
        ? (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000')
        : 'http://localhost:5000';
      
      if (!API_URL) {
        throw new Error('API URL is not configured. Please set NEXT_PUBLIC_API_URL in your environment variables.');
      }
      
      console.log('Initializing payment with API URL:', API_URL);
      
      // Initialize transaction from backend (as per Paystack best practices)
      const response = await fetch(`${API_URL}/api/payments/initialize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: data.email,
          amount: data.amount,
          reference: data.reference,
          callback_url: data.callback_url || `${typeof window !== 'undefined' ? window.location.origin : ''}/payment/callback`,
          metadata: data.metadata || {},
        }),
      });

      if (!response.ok) {
        let errorMessage = 'Failed to initialize payment';
        try {
          const error = await response.json();
          errorMessage = error.message || errorMessage;
        } catch (parseError) {
          // If response is not JSON, use status text
          errorMessage = `HTTP ${response.status}: ${response.statusText || 'Failed to connect to payment server. Please check if your backend server is running and NEXT_PUBLIC_API_URL is configured correctly.'}`;
          console.error('Payment API error:', {
            status: response.status,
            statusText: response.statusText,
            url: `${API_URL}/api/payments/initialize`,
            API_URL,
          });
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();

      if (result.success && result.data) {
        const { access_code, authorization_url } = result.data;
        
        // Use Paystack Popup to complete transaction
        if (typeof window !== 'undefined') {
          const PaystackPop = await loadPaystack();
          
          // Use resumeTransaction with access_code (Paystack Popup V2)
          const popup = new PaystackPop();
          popup.resumeTransaction(access_code);
        }

        // Store checkout data for order creation after payment
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('pending_checkout_data', JSON.stringify({
            reference: data.reference,
            email: data.email,
            metadata: data.metadata,
          }));
          sessionStorage.setItem('pending_payment_reference', data.reference);
        }

        return {
          success: true,
          reference: data.reference,
          access_code,
          authorization_url,
        };
      } else {
        throw new Error(result.message || 'Failed to initialize payment');
      }
    } catch (error: any) {
      console.error('Payment initialization error:', error);
      return {
        success: false,
        message: error.message || 'Failed to initialize payment',
      };
    }
  },

  // Verify payment (for callback after payment)
  async verifyPayment(reference: string): Promise<PaymentResponse> {
    try {
      // Get API URL from environment or use default
      const API_URL = typeof window !== 'undefined' 
        ? (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000')
        : 'http://localhost:5000';
      
      if (!API_URL) {
        throw new Error('API URL is not configured. Please set NEXT_PUBLIC_API_URL in your environment variables.');
      }
      
      const response = await fetch(`${API_URL}/api/payments/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reference }),
      });

      if (!response.ok) {
        let errorMessage = 'Payment verification failed';
        try {
          const error = await response.json();
          errorMessage = error.message || errorMessage;
        } catch (parseError) {
          errorMessage = `HTTP ${response.status}: ${response.statusText || 'Failed to connect to payment server'}`;
          console.error('Payment verification API error:', {
            status: response.status,
            statusText: response.statusText,
            url: `${API_URL}/api/payments/verify`,
          });
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();
      return result;
    } catch (error: any) {
      console.error('Payment verification error:', error);
      return {
        success: false,
        message: error.message || 'Failed to verify payment',
      };
    }
  },
};

