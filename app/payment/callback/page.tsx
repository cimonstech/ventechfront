'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { CheckCircle, XCircle, Loader } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { paymentService } from '@/services/payment.service';
import { orderService } from '@/services/order.service';
import { useAppDispatch } from '@/store';
import { clearCart } from '@/store/cartSlice';
import { PRE_ORDER_SHIPPING_OPTIONS } from '@/services/preOrder.service';
import { PAYMENT_COPY, messageForChargeStatus } from '@/lib/paymentCopy';
import toast from 'react-hot-toast';
import Link from 'next/link';

export default function PaymentCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dispatch = useAppDispatch();
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'pending' | 'abandoned' | 'failed'>('loading');
  const [message, setMessage] = useState('Verifying payment...');
  const [paymentReference, setPaymentReference] = useState('');
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
      setMessage(PAYMENT_COPY.confirmFailed());
      return;
    }
    setPaymentReference(reference);

    const handlePaymentCallback = async () => {
      try {
        hasProcessedRef.current = true;

        // Verify payment with backend
        const verifyResult = await paymentService.verifyPayment(reference);
        const chargeStatus = verifyResult.data?.status || verifyResult.status;

        if (!verifyResult.success) {
          setStatus('error');
          setMessage(verifyResult.message || PAYMENT_COPY.confirmFailed(reference));
          return;
        }

        if (chargeStatus === 'pending') {
          setStatus('pending');
          setMessage(messageForChargeStatus('pending', reference));
          return;
        }

        if (chargeStatus === 'abandoned') {
          setStatus('abandoned');
          setMessage(messageForChargeStatus('abandoned', reference));
          return;
        }

        if (chargeStatus !== 'success') {
          setStatus('failed');
          setMessage(messageForChargeStatus('failed', reference));
          return;
        }

        if (chargeStatus === 'success') {
          // Payment verified successfully
          // ✅ CRITICAL: NEVER use prices from Paystack metadata
          // Paystack metadata may contain prices in pesewas, not GHS
          // ALWAYS use sessionStorage checkout data (prices in GHS)
          const checkoutDataStr = sessionStorage.getItem('pending_checkout_data');
          let checkoutData: any = null;
          
          if (checkoutDataStr) {
            try {
              const parsed = JSON.parse(checkoutDataStr);
              checkoutData = parsed.checkout_data || parsed;
            } catch (e) {
              console.error('Error parsing checkout data from sessionStorage:', e);
            }
          }
          
          // Validate checkout data - check for items, regularItems, or preOrderItems
          const hasItems = checkoutData.items && Array.isArray(checkoutData.items) && checkoutData.items.length > 0;
          const hasRegularItems = checkoutData.regularItems && Array.isArray(checkoutData.regularItems) && checkoutData.regularItems.length > 0;
          const hasPreOrderItems = checkoutData.preOrderItems && Array.isArray(checkoutData.preOrderItems) && checkoutData.preOrderItems.length > 0;
          
          if (!checkoutData || (!hasItems && !hasRegularItems && !hasPreOrderItems)) {
            console.error('Invalid checkout data:', checkoutData);
            console.error('Checkout data validation:', {
              hasItems,
              hasRegularItems,
              hasPreOrderItems,
              checkoutDataKeys: checkoutData ? Object.keys(checkoutData) : [],
            });
            setStatus('error');
            setMessage(PAYMENT_COPY.confirmFailed(reference));
            return;
          }
          
          const userId = checkoutData.user_id && checkoutData.user_id !== 'guest'
            ? checkoutData.user_id
            : null;
          
          // Ensure payment reference is included
          if (!checkoutData.payment_reference) {
            checkoutData.payment_reference = reference;
          }
          
          // Ensure payment method is set
          if (!checkoutData.payment_method) {
            checkoutData.payment_method = 'paystack';
          }
          
          // Ensure email is included in delivery address for guest customers
          if (checkoutData.delivery_address) {
            if (!checkoutData.delivery_address.email) {
              checkoutData.delivery_address.email = checkoutData.customer_bio?.email || checkoutData.customer_email || null;
            }
          }
          
          // Create order(s) after successful payment verification
          
          // Create order(s) after successful payment verification
          try {
            const orders: any[] = [];
            const errors: string[] = [];

            // Check if we have mixed cart (regular + pre-order items)
            const hasRegularItems = checkoutData.hasRegularItems && checkoutData.regularItems && checkoutData.regularItems.length > 0;
            const hasPreOrderItems = checkoutData.hasPreOrderItems && checkoutData.preOrderItems && checkoutData.preOrderItems.length > 0;
            const hasMixedCart = hasRegularItems && hasPreOrderItems;

            // Create order(s) based on cart type

            // Create regular order if we have regular items
            if (hasRegularItems) {
              try {
                // ✅ CRITICAL: Recalculate subtotal from items (prices in GHS from database)
                // NEVER trust checkoutData.subtotal or checkoutData.total - they may be from Paystack metadata (pesewas)
                const regularSubtotal = checkoutData.regularItems.reduce((sum: number, item: any) => {
                  // Use item prices directly from database (already in GHS)
                  // discount_price and original_price are from database, not Paystack metadata
                  const itemPrice = item.discount_price || item.original_price || 0;
                  const itemQuantity = item.quantity || 1;
                  const itemSubtotal = itemPrice * itemQuantity;
                  return sum + (Number(itemSubtotal) || 0);
                }, 0);
                // ✅ Use delivery fee, discount, and tax from checkoutData
                // These should be in GHS (from sessionStorage), not from Paystack metadata
                // Backend will validate total < 100,000 to catch any pesewas conversion errors
                const regularDeliveryFee = checkoutData.delivery_option?.price || 0;
                const discount = checkoutData.discount || 0;
                const tax = checkoutData.tax || 0;
                const regularTotal = regularSubtotal + regularDeliveryFee + tax - discount;
                
                const regularCheckoutData = {
                  items: checkoutData.regularItems.map((item: any) => ({
                    ...item,
                    id: item.product_id || item.id, // Ensure id is set
                    product_id: item.product_id || item.id, // Ensure product_id is set
                    is_pre_order: false,
                  })),
                  delivery_address: checkoutData.delivery_address,
                  delivery_option: checkoutData.delivery_option,
                  payment_method: checkoutData.payment_method || 'paystack',
                  payment_reference: checkoutData.payment_reference || reference,
                  notes: hasMixedCart ? `${checkoutData.notes || ''}\n\n[Regular Items Order]`.trim() : checkoutData.notes,
                  is_pre_order: false,
                  subtotal: regularSubtotal,
                  discount: discount,
                  coupon_id: checkoutData.coupon_id || null,
                  delivery_fee: regularDeliveryFee,
                  tax: checkoutData.tax || 0,
                  total: regularTotal, // Already includes discount subtraction
                  referral: checkoutData.referral || undefined,
                };

                const regularOrder = await orderService.createOrder(regularCheckoutData, userId);
                orders.push({ type: 'regular', order: regularOrder });
              } catch (error) {
                console.error('❌ Regular order failed:', error);
                errors.push(PAYMENT_COPY.confirmFailed(reference));
              }
            }

            // Create pre-order if we have pre-order items
            if (hasPreOrderItems) {
              try {
                // ✅ CRITICAL: Recalculate subtotal from items (prices in GHS from database)
                // NEVER trust checkoutData.subtotal or checkoutData.total - they may be from Paystack metadata (pesewas)
                const preOrderSubtotal = checkoutData.preOrderItems.reduce((sum: number, item: any) => {
                  // Use item prices directly from database (already in GHS)
                  // discount_price and original_price are from database, not Paystack metadata
                  const itemPrice = item.discount_price || item.original_price || 0;
                  const itemQuantity = item.quantity || 1;
                  const itemSubtotal = itemPrice * itemQuantity;
                  return sum + (Number(itemSubtotal) || 0);
                }, 0);
                // ✅ CRITICAL: Get pre-order shipping fee
                // Priority: 1) checkoutData.delivery_fee (already calculated in checkout), 2) delivery_option.price, 3) lookup from PRE_ORDER_SHIPPING_OPTIONS
                let preOrderDeliveryFee = checkoutData.delivery_fee || 0;
                
                if (!preOrderDeliveryFee && checkoutData.delivery_option?.price) {
                  // Use delivery_option price if delivery_fee not set
                  preOrderDeliveryFee = checkoutData.delivery_option.price;
                } else if (!preOrderDeliveryFee && checkoutData.pre_order_shipping_option) {
                  // Fallback: Look up from PRE_ORDER_SHIPPING_OPTIONS by ID
                  const shippingOption = PRE_ORDER_SHIPPING_OPTIONS.find(
                    opt => opt.id === checkoutData.pre_order_shipping_option
                  );
                  preOrderDeliveryFee = shippingOption?.price || 0;
                }
                
                // ✅ Use discount and tax from checkoutData (already in GHS)
                const discount = checkoutData.discount || 0;
                const tax = checkoutData.tax || 0;
                const preOrderTotal = preOrderSubtotal + preOrderDeliveryFee + tax - discount;
                
                const preOrderCheckoutData = {
                  items: checkoutData.preOrderItems.map((item: any) => ({
                    ...item,
                    id: item.product_id || item.id, // Ensure id is set
                    product_id: item.product_id || item.id, // Ensure product_id is set
                    is_pre_order: true,
                  })),
                  delivery_address: checkoutData.delivery_address,
                  delivery_option: checkoutData.delivery_option,
                  payment_method: checkoutData.payment_method || 'paystack',
                  payment_reference: checkoutData.payment_reference || reference,
                  notes: hasMixedCart ? `${checkoutData.notes || ''}\n\n[Pre-Order Items]`.trim() : checkoutData.notes,
                  is_pre_order: true,
                  pre_order_shipping_option: checkoutData.pre_order_shipping_option,
                  estimated_arrival_date: checkoutData.estimated_arrival_date,
                  subtotal: preOrderSubtotal,
                  discount: discount,
                  coupon_id: checkoutData.coupon_id || null,
                  delivery_fee: preOrderDeliveryFee,
                  tax: checkoutData.tax || 0,
                  total: preOrderTotal, // Already includes discount subtraction
                  referral: checkoutData.referral || undefined,
                };

                const preOrder = await orderService.createOrder(preOrderCheckoutData, userId);
                orders.push({ type: 'pre-order', order: preOrder });
              } catch (error) {
                console.error('❌ Pre-order failed:', error);
                errors.push(PAYMENT_COPY.confirmFailed(reference));
              }
            }

            // If no separate items, try creating single order with all items (fallback for old format)
            if (!hasRegularItems && !hasPreOrderItems && checkoutData.items && Array.isArray(checkoutData.items) && checkoutData.items.length > 0) {
              const singleOrder = await orderService.createOrder(checkoutData, userId);
              orders.push({ type: 'single', order: singleOrder });
            }

            // Handle results
            if (errors.length > 0 && orders.length === 0) {
              throw new Error(PAYMENT_COPY.confirmFailed(reference));
            } else if (errors.length > 0) {
              // Some orders succeeded, some failed
              if (process.env.NODE_ENV === 'development') {
                console.warn('Some orders were created successfully, but some failed:', errors);
              }
            }

            if (orders.length === 0) {
              throw new Error(PAYMENT_COPY.confirmFailed(reference));
            }

            const firstOrder = orders[0].order;
            
            if (!firstOrder || !firstOrder.id) {
              throw new Error(PAYMENT_COPY.confirmFailed(reference));
            }
            
            // Order(s) created successfully
              
              // Clear cart
              dispatch(clearCart());
              
              // Clear sessionStorage
              sessionStorage.removeItem('pending_checkout_data');
              sessionStorage.removeItem('pending_payment_reference');
              sessionStorage.removeItem('clear_cart_after_payment');
              sessionStorage.removeItem('applied_coupon'); // Clear coupon after successful order
              
              setStatus('success');
              if (orders.length > 1) {
                setMessage(`Payment successful! ${orders.length} orders have been created.`);
                toast.success(`${orders.length} orders created successfully! Check your email for confirmation. We'll also call you to confirm your order.`, { duration: 5000 });
              } else {
                setMessage('Payment successful! Your order has been created.');
                toast.success(`Order ${firstOrder.order_number || firstOrder.id} created successfully! Check your email for confirmation. We'll also call you to confirm your order.`, { duration: 5000 });
              }
              
              // Redirect to order detail page
              const accessEmail = sessionStorage.getItem('order_access_email') || '';
              const emailQuery = accessEmail ? `?email=${encodeURIComponent(accessEmail)}` : '';
              router.push(`/orders/${firstOrder.id}${emailQuery}`);
            } catch (orderError) {
              console.error('Error creating order:', orderError);
              setStatus('error');
              setMessage(PAYMENT_COPY.confirmFailed(reference));
            }
        }
      } catch (error) {
        console.error('Payment callback error:', error);
        setStatus('error');
        setMessage(PAYMENT_COPY.confirmFailed(reference));
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
            <div className="bg-orange-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Loader className="w-10 h-10 text-[#FF7A19] animate-spin" />
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
            <Link href="/account/orders">
              <Button variant="primary" className="w-full">
                View My Orders
              </Button>
            </Link>
          </div>
        )}

        {(status === 'error' || status === 'failed' || status === 'abandoned' || status === 'pending') && (
          <div className="text-center">
            <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${status === 'pending' ? 'bg-amber-100' : 'bg-red-100'}`}>
              <XCircle className={`w-10 h-10 ${status === 'pending' ? 'text-amber-700' : 'text-red-600'}`} />
            </div>
            <h1 className="text-2xl font-bold text-[#1A1A1A] mb-3">
              {status === 'pending' ? 'Payment pending' : status === 'abandoned' ? 'Payment cancelled' : 'Payment did not go through'}
            </h1>
            <p className="text-[#3A3A3A] mb-6">{message}</p>
            {paymentReference ? (
              <p className="mb-6 text-xs text-[#3A3A3A]">Reference: {paymentReference}</p>
            ) : null}
            <div className="flex gap-4">
              <Link href="/checkout" className="flex-1">
                <Button variant="outline" className="w-full">
                  Back to checkout
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

