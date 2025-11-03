// Dynamically load Paystack script (Paystack Popup V2)
export const loadPaystack = (): Promise<any> => {
  return new Promise((resolve, reject) => {
    // Check if Paystack is already loaded
    if (typeof window !== 'undefined' && (window as any).PaystackPop) {
      resolve((window as any).PaystackPop);
      return;
    }

    if (typeof window === 'undefined') {
      reject(new Error('Paystack can only be loaded in browser'));
      return;
    }

    // Load Paystack Inline JS script (Popup V2)
    const script = document.createElement('script');
    script.src = 'https://js.paystack.co/v1/inline.js';
    script.async = true;
    script.onload = () => {
      if ((window as any).PaystackPop) {
        resolve((window as any).PaystackPop);
      } else {
        reject(new Error('Paystack script failed to load'));
      }
    };
    script.onerror = () => {
      reject(new Error('Failed to load Paystack script'));
    };
    document.body.appendChild(script);
  });
};

// Initialize Paystack payment (simplified version)
export const initializePaystackPayment = (config: {
  key: string;
  email: string;
  amount: number;
  ref: string;
  metadata?: Record<string, any>;
  currency?: string;
  callback_url?: string;
}) => {
  return loadPaystack().then((PaystackPop: any) => {
    const handler = PaystackPop.setup({
      ...config,
      currency: config.currency || 'GHS',
    });

    handler.openIframe();
    return handler;
  });
};

