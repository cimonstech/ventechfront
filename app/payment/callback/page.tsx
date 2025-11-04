'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { CheckCircle, XCircle, Loader } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { paymentService } from '@/services/payment.service';
import { orderService } from '@/services/order.service';
import { useAppDispatch } from '@/store';
import { clearCart } from '@/store/cartSlice';
import toast from 'react-hot-toast';
import Link from 'next/link';

export default function PaymentCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dispatch = useAppDispatch();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Verifying payment...');
  const hasProcessedRef = React.useRef(false);

  useEffect(() => {
    // Prevent multiple executions
    if (hasProcessedRef.current || status !== 'loading') {
      return;
    }

    // Extract reference inside useEffect to avoid dependency issues
    const reference = searchParams.get('reference');
    
    // Only run if we have a reference
    if (!reference) {
      setStatus('error');
      setMessage('No payment reference found');
      return;
    }

    const handlePaymentCallback = async () => {
      try {
        hasProcessedRef.current = true;

        // Verify payment with backend
        const verifyResult = await paymentService.verifyPayment(reference);

        if (verifyResult.success && verifyResult.data?.status === 'success') {
          // Payment verified successfully
          // Get checkout data from sessionStorage
          const checkoutDataStr = sessionStorage.getItem('pending_checkout_data');
          
          if (checkoutDataStr) {
            const checkoutData = JSON.parse(checkoutDataStr);
            
            // Get user ID from metadata
            const userId = verifyResult.data?.metadata?.user_id || checkoutData.user_id || null;
            
            // Create order after successful payment verification
            try {
              // Get checkout data from stored session or metadata
              const orderCheckoutData = checkoutData.checkout_data || checkoutData;
              
              // Ensure email is included in delivery address for guest customers
              if (orderCheckoutData.delivery_address && checkoutData.customer_email) {
                orderCheckoutData.delivery_address.email = checkoutData.customer_email;
              }
              
              // Include payment reference from stored data
              if (checkoutData.payment_reference) {
                orderCheckoutData.payment_reference = checkoutData.payment_reference;
              }
              
              const order = await orderService.createOrder(orderCheckoutData, userId);
              
              // Update transaction with order_id after order is created
              try {
                const API_URL = typeof window !== 'undefined' 
                  ? (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000')
                  : 'http://localhost:5000';
                await fetch(`${API_URL}/api/payments/update-order-link`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    transaction_reference: reference,
                    order_id: order.id,
                  }),
                });
              } catch (linkError) {
                console.error('Error linking transaction to order:', linkError);
                // Don't fail if linking fails
              }
              
              // Clear cart
              dispatch(clearCart());
              
              // Clear sessionStorage
              sessionStorage.removeItem('pending_checkout_data');
              sessionStorage.removeItem('pending_payment_reference');
              sessionStorage.removeItem('clear_cart_after_payment');
              
              setStatus('success');
              setMessage('Payment successful! Your order has been created.');
              
              // Redirect to success page
              setTimeout(() => {
                router.push(`/orders/success?order=${order.id}&reference=${reference}`);
              }, 2000);
            } catch (orderError: any) {
              console.error('Error creating order:', orderError);
              setStatus('error');
              setMessage('Payment verified but failed to create order. Please contact support.');
            }
          } else {
            setStatus('error');
            setMessage('Payment verified but checkout data is missing. Please contact support.');
          }
        } else {
          setStatus('error');
          setMessage(verifyResult.message || 'Payment verification failed');
        }
      } catch (error: any) {
        console.error('Payment callback error:', error);
        setStatus('error');
        setMessage(error.message || 'An error occurred during payment verification');
      }
    };

    handlePaymentCallback();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
        {status === 'loading' && (
          <div className="text-center">
            <div className="bg-blue-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Loader className="w-10 h-10 text-blue-600 animate-spin" />
            </div>
            <h1 className="text-2xl font-bold text-[#1A1A1A] mb-3">Processing Payment</h1>
            <p className="text-[#3A3A3A]">{message}</p>
          </div>
        )}

        {status === 'success' && (
          <div className="text-center">
            <div className="bg-green-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-[#1A1A1A] mb-3">Payment Successful!</h1>
            <p className="text-[#3A3A3A] mb-6">{message}</p>
            <p className="text-sm text-[#3A3A3A] mb-6">Redirecting you to your order...</p>
            <Link href="/orders">
              <Button variant="primary" className="w-full">
                View My Orders
              </Button>
            </Link>
          </div>
        )}

        {status === 'error' && (
          <div className="text-center">
            <div className="bg-red-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
              <XCircle className="w-10 h-10 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-[#1A1A1A] mb-3">Payment Failed</h1>
            <p className="text-[#3A3A3A] mb-6">{message}</p>
            <div className="flex gap-4">
              <Link href="/checkout" className="flex-1">
                <Button variant="outline" className="w-full">
                  Try Again
                </Button>
              </Link>
              <Link href="/" className="flex-1">
                <Button variant="primary" className="w-full">
                  Go Home
                </Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

