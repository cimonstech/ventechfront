'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAppSelector, useAppDispatch } from '@/store';
import { clearCart } from '@/store/cartSlice';
import { Check, CreditCard, Smartphone, Banknote, ChevronLeft } from 'lucide-react';
import { formatCurrency } from '@/lib/helpers';
import { orderService } from '@/services/order.service';
import { deliveryOptionsService } from '@/services/deliveryOptions.service';
import { paymentService } from '@/services/payment.service';
import { DeliveryOption } from '@/types/order';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

export default function CheckoutPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { items, total } = useAppSelector((state) => state.cart);
  const { user, isAuthenticated } = useAppSelector((state) => state.auth);

  const [step, setStep] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Delivery Information - Auto-fill from user if logged in
  const [deliveryInfo, setDeliveryInfo] = useState({
    full_name: user?.full_name || '',
    email: user?.email || '', // Add email field for guest checkout
    phone: user?.phone || '',
    street_address: '',
    city: '',
    region: '',
    postal_code: '',
  });

  // Auto-fill delivery info when user logs in or component mounts
  useEffect(() => {
    if (user && isAuthenticated) {
      setDeliveryInfo(prev => ({
        ...prev,
        full_name: user.full_name || prev.full_name,
        email: user.email || prev.email,
        phone: user.phone || prev.phone,
      }));
      
      // Try to fetch user's default address
      const fetchUserAddress = async () => {
        try {
          const { data: { user: currentUser } } = await supabase.auth.getUser();
          if (currentUser) {
            const { data: addresses } = await supabase
              .from('addresses')
              .select('*')
              .eq('user_id', currentUser.id)
              .eq('is_default', true)
              .maybeSingle();
            
            if (addresses) {
              setDeliveryInfo({
                full_name: addresses.full_name || user.full_name || '',
                email: user.email || '', // Add email from user
                phone: addresses.phone || user.phone || '',
                street_address: addresses.street_address || '',
                city: addresses.city || '',
                region: addresses.region || '',
                postal_code: addresses.postal_code || '',
              });
            }
          }
        } catch (error) {
          // Silently fail - user can fill manually
          console.error('Error fetching user address:', error);
        }
      };
      
      fetchUserAddress();
    }
  }, [user, isAuthenticated]);

  // Delivery Options
  const [deliveryOptions, setDeliveryOptions] = useState<DeliveryOption[]>([]);
  
  // Selected Options
  const [selectedDelivery, setSelectedDelivery] = useState<DeliveryOption | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'paystack' | 'cash_on_delivery'>('paystack');
  const [notes, setNotes] = useState('');

  // Fetch delivery options function
  const fetchDeliveryOptions = async () => {
    try {
      const options = await deliveryOptionsService.getActiveDeliveryOptions();
      setDeliveryOptions(options);
      if (options.length > 0 && !selectedDelivery) {
        setSelectedDelivery(options[0]);
      }
    } catch (error) {
      console.error('Error fetching delivery options:', error);
      // Fallback to default options if fetch fails
      const defaultOptions: DeliveryOption[] = [
        {
          id: 'standard',
          name: 'Standard Delivery',
          description: '5-7 business days',
          price: 0,
          estimated_days: 6,
        },
        {
          id: 'express',
          name: 'Express Delivery',
          description: '2-3 business days',
          price: 15,
          estimated_days: 3,
        },
        {
          id: 'overnight',
          name: 'Overnight Delivery',
          description: 'Next business day',
          price: 30,
          estimated_days: 1,
        },
      ];
      setDeliveryOptions(defaultOptions);
      setSelectedDelivery(defaultOptions[0]);
    }
  };

  // Handle client-side mounting
  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    // Only redirect on client-side after mount
    if (!isMounted) return;
    
    // Redirect if cart is empty
    if (items.length === 0) {
      router.push('/cart');
      return;
    }
    // Allow non-logged users to proceed - they'll need to provide address info
    fetchDeliveryOptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, router, isMounted]);

  const handleDeliveryInfoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDeliveryInfo({
      ...deliveryInfo,
      [e.target.name]: e.target.value,
    });
  };

  const validateDeliveryInfo = () => {
    const required = ['full_name', 'email', 'phone', 'street_address', 'city', 'region'];
    for (const field of required) {
      if (!deliveryInfo[field as keyof typeof deliveryInfo]) {
        toast.error(`${field.replace('_', ' ')} is required`);
        return false;
      }
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(deliveryInfo.email)) {
      toast.error('Please provide a valid email address');
      return false;
    }
    
    return true;
  };

  const handleNextStep = () => {
    if (step === 1 && !validateDeliveryInfo()) {
      return;
    }
    setStep(step + 1);
  };

  const handlePlaceOrder = async () => {
    // User can proceed without login - they provide address as billing address
    // If not logged in, create order as guest (user_id will be null or handled by backend)
    const userId = user?.id || null;
    
    if (!userId) {
      // For guest checkout, we still need to validate address
      if (!validateDeliveryInfo()) {
        return;
      }
    }

    setIsProcessing(true);

    try {
      const checkoutData = {
        items,
        delivery_address: {
          ...deliveryInfo,
          email: deliveryInfo.email || user?.email, // Include email for guest orders
          country: 'Ghana',
          is_default: false,
        },
        delivery_option: selectedDelivery || deliveryOptions[0],
        payment_method: paymentMethod,
        notes,
      };

      // For Paystack (Momo/Card), initialize payment first, then create order after payment
      if (paymentMethod === 'paystack') {
        // Use email from delivery info (collected from form, includes guest emails)
        const email = deliveryInfo.email || user?.email;
        
        if (!email) {
          throw new Error('Email is required for payment. Please provide your email address.');
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          throw new Error('Please provide a valid email address.');
        }
        
        // Generate a unique reference for this payment
        const paymentReference = `ORDER-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        // Store checkout data temporarily for order creation after payment
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('pending_checkout_data', JSON.stringify({
            ...checkoutData,
            payment_method: 'paystack',
            payment_reference: paymentReference,
            grand_total: grandTotal,
            user_id: userId, // Include user_id for order creation (null for guests)
            customer_email: email, // Store customer email for order emails
          }));
          sessionStorage.setItem('pending_payment_reference', paymentReference);
        }
        
        // Initialize Paystack payment via backend
        const paymentResult = await paymentService.initializePayment({
          email,
          amount: Math.round(grandTotal * 100), // Convert to pesewas
          reference: paymentReference,
          callback_url: `${window.location.origin}/payment/callback`,
          metadata: {
            user_id: userId || 'guest',
            payment_method: 'paystack',
            payment_reference: paymentReference,
            customer_email: email,
            checkout_data: checkoutData,
          },
        });

        if (paymentResult.success) {
          // Payment modal will open automatically
          // Don't clear cart yet - wait for payment verification
          toast.success('Redirecting to payment...');
          // The payment callback will handle order creation
        } else {
          const errorMsg = paymentResult.message || 'Failed to initialize payment. Please check your backend server is running and NEXT_PUBLIC_API_URL is configured correctly.';
          console.error('Payment initialization failed:', {
            message: paymentResult.message,
            API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000',
          });
          throw new Error(errorMsg);
        }
      } else {
        // For Cash on Delivery, create order directly (emails and notifications handled by backend)
        const order = await orderService.createOrder(checkoutData, userId);
        dispatch(clearCart());
        toast.success('Order placed successfully! You will receive a confirmation email shortly.');
        router.push(`/orders/${order.id}`);
      }
    } catch (error: any) {
      console.error('Order error:', {
        error,
        message: error?.message || 'Unknown error',
        stack: error?.stack,
        name: error?.name,
        response: error?.response,
        data: error?.data,
        details: error?.details,
        hint: error?.hint,
        code: error?.code,
        fullError: JSON.stringify(error, null, 2),
      });
      
      // Extract error message from various possible locations
      let errorMessage = 'Failed to place order';
      if (error?.message) {
        errorMessage = error.message;
      } else if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error?.data?.message) {
        errorMessage = error.data.message;
      } else if (error?.details) {
        errorMessage = error.details;
      } else if (error?.hint) {
        errorMessage = error.hint;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      toast.error(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  // Free shipping for orders over 20,000 cedis
  const deliveryFee = total >= 20000 ? 0 : (selectedDelivery?.price || deliveryOptions[0]?.price || 0);
  const tax = 0;
  const grandTotal = total + deliveryFee + tax;

  // Handle empty cart on client-side only to avoid hydration mismatch
  if (!isMounted) {
    // Return a consistent structure during SSR - matches the actual checkout page structure
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-4">
          <div className="mb-8">
            <div className="h-10 w-24 bg-gray-200 rounded animate-pulse"></div>
          </div>
        </div>
      </div>
    );
  }

  // Client-side check for empty cart
  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-4">
          <div className="text-center py-12">
            <p className="text-gray-600">Your cart is empty. Redirecting...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <Button 
            variant="ghost" 
            size="sm" 
            icon={<ChevronLeft size={16} />} 
            className="mb-4"
            onClick={() => router.push('/cart')}
          >
            Back to Cart
          </Button>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Checkout</h1>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center gap-4">
            <div className={`flex items-center gap-2 ${step >= 1 ? 'text-[#FF7A19]' : 'text-gray-400'}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                step >= 1 ? 'bg-[#FF7A19] text-white' : 'bg-gray-200'
              }`}>
                {step > 1 ? <Check size={20} /> : '1'}
              </div>
              <span className="font-medium hidden sm:block">Delivery</span>
            </div>

            <div className="w-16 h-0.5 bg-gray-300" />

            <div className={`flex items-center gap-2 ${step >= 2 ? 'text-[#FF7A19]' : 'text-gray-400'}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                step >= 2 ? 'bg-[#FF7A19] text-white' : 'bg-gray-200'
              }`}>
                {step > 2 ? <Check size={20} /> : '2'}
              </div>
              <span className="font-medium hidden sm:block">Payment</span>
            </div>

            <div className="w-16 h-0.5 bg-gray-300" />

            <div className={`flex items-center gap-2 ${step >= 3 ? 'text-[#FF7A19]' : 'text-gray-400'}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                step >= 3 ? 'bg-[#FF7A19] text-white' : 'bg-gray-200'
              }`}>
                3
              </div>
              <span className="font-medium hidden sm:block">Review</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Step 1: Delivery Information */}
            {step === 1 && (
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Delivery Information</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Full Name"
                    name="full_name"
                    value={deliveryInfo.full_name}
                    onChange={handleDeliveryInfoChange}
                    required
                  />
                  <Input
                    label="Email Address"
                    name="email"
                    type="email"
                    value={deliveryInfo.email}
                    onChange={handleDeliveryInfoChange}
                    required
                    placeholder="your@email.com"
                  />
                  <Input
                    label="Phone Number"
                    name="phone"
                    type="tel"
                    value={deliveryInfo.phone}
                    onChange={handleDeliveryInfoChange}
                    required
                  />
                  <div className="md:col-span-2">
                    <Input
                      label="Street Address"
                      name="street_address"
                      value={deliveryInfo.street_address}
                      onChange={handleDeliveryInfoChange}
                      required
                    />
                  </div>
                  <Input
                    label="City"
                    name="city"
                    value={deliveryInfo.city}
                    onChange={handleDeliveryInfoChange}
                    required
                  />
                  <Input
                    label="Region"
                    name="region"
                    value={deliveryInfo.region}
                    onChange={handleDeliveryInfoChange}
                    required
                  />
                  <Input
                    label="Postal Code"
                    name="postal_code"
                    value={deliveryInfo.postal_code}
                    onChange={handleDeliveryInfoChange}
                  />
                </div>

                {/* Delivery Options */}
                <div className="mt-6">
                  <h3 className="font-semibold text-gray-900 mb-4">Delivery Option</h3>
                  {deliveryOptions.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      Loading delivery options...
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {deliveryOptions.map((option) => (
                        <button
                          key={option.id}
                          onClick={() => setSelectedDelivery(option)}
                          className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                            selectedDelivery?.id === option.id
                              ? 'border-blue-600 bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-semibold text-gray-900">{option.name}</p>
                              <p className="text-sm text-gray-600">{option.description}</p>
                            </div>
                            <span className="font-bold text-gray-900">
                              {option.price === 0 ? 'FREE' : formatCurrency(option.price)}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <Button
                  variant="primary"
                  size="lg"
                  className="w-full mt-6"
                  onClick={handleNextStep}
                >
                  Continue to Payment
                </Button>
              </div>
            )}

            {/* Step 2: Payment Method */}
            {step === 2 && (
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Payment Method</h2>

                <div className="space-y-3 mb-6">
                  <button
                    onClick={() => setPaymentMethod('paystack')}
                    className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                      paymentMethod === 'paystack'
                        ? 'border-[#FF7A19] bg-orange-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <CreditCard className={paymentMethod === 'paystack' ? 'text-[#FF7A19]' : 'text-gray-600'} size={24} />
                      <div>
                        <p className="font-semibold text-gray-900">Momo/Card</p>
                        <p className="text-sm text-gray-600">Pay with Mobile Money or Card via Paystack</p>
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => setPaymentMethod('cash_on_delivery')}
                    className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                      paymentMethod === 'cash_on_delivery'
                        ? 'border-[#FF7A19] bg-orange-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Banknote className={paymentMethod === 'cash_on_delivery' ? 'text-[#FF7A19]' : 'text-gray-600'} size={24} />
                      <div>
                        <p className="font-semibold text-gray-900">Cash on Delivery</p>
                        <p className="text-sm text-gray-600">Pay when you receive your order</p>
                      </div>
                    </div>
                  </button>
                </div>

                {/* Additional Notes */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Order Notes (Optional)
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Any special instructions for your order?"
                  />
                </div>

                <div className="flex gap-4">
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => setStep(1)}
                    className="flex-1"
                  >
                    Back
                  </Button>
                  <Button
                    variant="primary"
                    size="lg"
                    onClick={handleNextStep}
                    className="flex-1"
                  >
                    Review Order
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: Review & Confirm */}
            {step === 3 && (
              <div className="space-y-6">
                {/* Order Items */}
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">Order Items</h2>
                  <div className="space-y-4">
                    {items.map((item, index) => (
                      <div key={index} className="flex gap-4">
                        <div className="relative w-16 h-16 flex-shrink-0 bg-gray-100 rounded-lg overflow-hidden">
                          <Image
                            src={item.thumbnail || '/placeholder-product.webp'}
                            alt={item.name}
                            fill
                            sizes="64px"
                            className="object-cover"
                          />
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900">{item.name}</p>
                          <p className="text-sm text-gray-600">Quantity: {item.quantity}</p>
                        </div>
                        <span className="font-semibold text-gray-900">{formatCurrency(item.subtotal)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Delivery Info */}
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <h3 className="font-bold text-gray-900 mb-2">Delivery Address</h3>
                  <p className="text-gray-600">
                    {deliveryInfo.full_name}<br />
                    {deliveryInfo.phone}<br />
                    {deliveryInfo.street_address}<br />
                    {deliveryInfo.city}, {deliveryInfo.region}
                  </p>
                </div>

                {/* Payment Method */}
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <h3 className="font-bold text-gray-900 mb-2">Payment Method</h3>
                  <p className="text-gray-600 capitalize">{paymentMethod === 'paystack' ? 'Momo/Card' : paymentMethod.replace('_', ' ')}</p>
                </div>

                <div className="flex gap-4">
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => setStep(2)}
                    className="flex-1"
                  >
                    Back
                  </Button>
                  <Button
                    variant="primary"
                    size="lg"
                    onClick={handlePlaceOrder}
                    isLoading={isProcessing}
                    className="flex-1"
                  >
                    Place Order
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Order Summary Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm p-6 sticky top-4">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Order Summary</h2>

              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span>
                  <span>{formatCurrency(total)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Delivery</span>
                  <span>{deliveryFee === 0 ? 'FREE' : formatCurrency(deliveryFee)}</span>
                </div>
                {tax > 0 && (
                  <div className="flex justify-between text-gray-600">
                    <span>Tax</span>
                    <span>{formatCurrency(tax)}</span>
                  </div>
                )}
              </div>

              <div className="border-t border-gray-200 pt-4">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-bold text-gray-900">Total</span>
                  <span className="text-2xl font-bold text-gray-900">
                    {formatCurrency(grandTotal)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}



