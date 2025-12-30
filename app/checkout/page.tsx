'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAppSelector, useAppDispatch } from '@/store';
import { clearCart } from '@/store/cartSlice';
import { Check, Banknote, ChevronLeft, Package, Clock } from 'lucide-react';
import { formatCurrency } from '@/lib/helpers';
import { orderService } from '@/services/order.service';
import { deliveryOptionsService } from '@/services/deliveryOptions.service';
import { paymentService } from '@/services/payment.service';
import { DeliveryOption } from '@/types/order';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { 
  PRE_ORDER_SHIPPING_OPTIONS, 
  PreOrderShippingOption,
  calculateEstimatedArrival,
  formatEstimatedDelivery 
} from '@/services/preOrder.service';

export default function CheckoutPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { items, total } = useAppSelector((state) => state.cart);
  const { user, isAuthenticated } = useAppSelector((state) => state.auth);

  const [step, setStep] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  
  // Get applied coupon from sessionStorage (set by cart page)
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  
  useEffect(() => {
    // Load coupon from sessionStorage on mount
    if (typeof window !== 'undefined') {
      const storedCoupon = sessionStorage.getItem('applied_coupon');
      if (storedCoupon) {
        try {
          setAppliedCoupon(JSON.parse(storedCoupon));
        } catch (e) {
          console.error('Error parsing stored coupon:', e);
        }
      }
    }
  }, []);

  // Customer Bio Information (for identification - guest and registered)
  const [customerBio, setCustomerBio] = useState({
    name: user?.full_name || '',
    email: user?.email || '',
    phone: user?.phone || '',
  });

  // Delivery Information - New structure
  const [deliveryInfo, setDeliveryInfo] = useState({
    gadget_name: '', // Will be auto-filled from cart items
    recipient_name: user?.full_name || '',
    recipient_number: user?.phone || '',
    recipient_location: '',
    recipient_region: '',
    alternate_contact_number: '',
  });

  // Auto-fill delivery info when user logs in or component mounts
  useEffect(() => {
    // Auto-fill gadget name from cart items
    if (items.length > 0) {
      const gadgetNames = items.map(item => item.name).join(', ');
      setDeliveryInfo(prev => ({
        ...prev,
        gadget_name: gadgetNames,
      }));
    }

    if (user && isAuthenticated) {
      // Auto-fill customer bio for registered users
      setCustomerBio({
        name: user.full_name || '',
        email: user.email || '',
        phone: user.phone || '',
      });

      setDeliveryInfo(prev => ({
        ...prev,
        recipient_name: user.full_name || prev.recipient_name,
        recipient_number: user.phone || prev.recipient_number,
      }));
      
      // Try to fetch user's default address
      const fetchUserAddress = async () => {
        try {
          const { data: { user: currentUser } } = await supabase.auth.getUser();
          if (currentUser) {
            const { data: userProfile } = await supabase
              .from('users')
              .select('shipping_address, first_name, last_name, phone')
              .eq('id', currentUser.id)
              .maybeSingle();
            
            if (userProfile && userProfile.shipping_address) {
              const shipping = userProfile.shipping_address as any;
              setDeliveryInfo(prev => ({
                ...prev,
                recipient_name: shipping.full_name || `${userProfile.first_name || ''} ${userProfile.last_name || ''}`.trim() || user.full_name || prev.recipient_name,
                recipient_number: shipping.phone || userProfile.phone || user.phone || prev.recipient_number,
                recipient_location: shipping.street_address || shipping.address_line1 || prev.recipient_location,
                recipient_region: shipping.region || prev.recipient_region,
              }));
            }
          }
        } catch (error) {
          console.error('Error fetching user address:', error);
        }
      };
      
      fetchUserAddress();
    }
  }, [user, isAuthenticated, items]);

  // Delivery Options
  const [deliveryOptions, setDeliveryOptions] = useState<DeliveryOption[]>([]);
  
  // Pre-order shipping options
  const [selectedPreOrderShipping, setSelectedPreOrderShipping] = useState<PreOrderShippingOption | null>(null);
  
  // Split items into regular and pre-order groups
  const regularItems = items.filter(item => !item.is_pre_order);
  const preOrderItems = items.filter(item => item.is_pre_order);
  const hasPreOrderItems = preOrderItems.length > 0;
  const hasRegularItems = regularItems.length > 0;
  const hasMixedCart = hasRegularItems && hasPreOrderItems;
  
  // Selected Options
  const [selectedDelivery, setSelectedDelivery] = useState<DeliveryOption | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'cash_on_delivery' | 'paystack'>('paystack'); // Paystack as default
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
    
    // If cart has pre-order items, set pre-order shipping option
    if (hasPreOrderItems && !selectedPreOrderShipping) {
      setSelectedPreOrderShipping(PRE_ORDER_SHIPPING_OPTIONS[0]); // Default to Air Cargo
    }
    
    // Fetch regular delivery options if we have regular items (or mixed cart)
    if (hasRegularItems || !hasPreOrderItems) {
      fetchDeliveryOptions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, router, isMounted, hasPreOrderItems]);

  const handleDeliveryInfoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDeliveryInfo({
      ...deliveryInfo,
      [e.target.name]: e.target.value,
    });
  };

  const handleCustomerBioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomerBio({
      ...customerBio,
      [e.target.name]: e.target.value,
    });
  };

  const validateDeliveryInfo = () => {
    // Validate customer bio (required for all customers)
    if (!customerBio.name || !customerBio.email || !customerBio.phone) {
      toast.error('Please fill in all customer identification fields (Name, Email, Phone)');
      return false;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(customerBio.email)) {
      toast.error('Please provide a valid email address');
      return false;
    }

    // Validate phone number format (basic validation)
    const phoneRegex = /^[0-9+\s()-]+$/;
    if (!phoneRegex.test(customerBio.phone)) {
      toast.error('Please provide a valid customer phone number');
      return false;
    }

    // Validate delivery info
    const required = ['gadget_name', 'recipient_name', 'recipient_number', 'recipient_location', 'recipient_region'];
    for (const field of required) {
      if (!deliveryInfo[field as keyof typeof deliveryInfo]) {
        const fieldName = field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        toast.error(`${fieldName} is required`);
        return false;
      }
    }
    
    if (!phoneRegex.test(deliveryInfo.recipient_number)) {
      toast.error('Please provide a valid recipient phone number');
      return false;
    }
    
    if (deliveryInfo.alternate_contact_number && !phoneRegex.test(deliveryInfo.alternate_contact_number)) {
      toast.error('Please provide a valid alternate contact number');
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

  // Handle Paystack payment initialization
  const handlePaystackPayment = async () => {
    const userId = user?.id || null;
    
    if (!userId) {
      // For guest checkout, we still need to validate address
      if (!validateDeliveryInfo()) {
        return;
      }
    }

    setIsProcessing(true);

    try {
      // Calculate totals
      const regularDeliveryFee = hasRegularItems
        ? (regularSubtotal >= 20000 ? 0 : (selectedDelivery?.price || deliveryOptions[0]?.price || 0))
        : 0;
      const preOrderDeliveryFee = hasPreOrderItems
        ? (selectedPreOrderShipping?.price || PRE_ORDER_SHIPPING_OPTIONS[0].price)
        : 0;
      const totalDeliveryFee = regularDeliveryFee + preOrderDeliveryFee;
      const tax = 0;
      const amountToPay = grandTotal; // Total in GHS

      // Generate unique payment reference
      const paymentReference = `VENTECH_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

      // Prepare checkout data for order creation after payment
      const checkoutData: any = {
        delivery_address: {
          gadget_name: deliveryInfo.gadget_name,
          recipient_name: deliveryInfo.recipient_name,
          recipient_number: deliveryInfo.recipient_number,
          recipient_location: deliveryInfo.recipient_location,
          recipient_region: deliveryInfo.recipient_region,
          alternate_contact_number: deliveryInfo.alternate_contact_number || '',
          country: 'Ghana',
          is_default: false,
        },
        subtotal: total, // Cart subtotal (sum of all items) - MUST be in GHS
        discount: couponDiscount, // Coupon discount - MUST be in GHS
        coupon_id: appliedCoupon?.coupon_id || null,
        applied_coupon: appliedCoupon, // Store full coupon validation for reference
        tax, // Tax - MUST be in GHS
        delivery_fee: totalDeliveryFee, // Delivery fee - MUST be in GHS
        total: amountToPay, // Final total after discount: subtotal + delivery + tax - discount - MUST be in GHS
        payment_method: 'paystack',
        notes,
        hasRegularItems,
        hasPreOrderItems,
        regularItems: hasRegularItems ? regularItems.map(item => ({
          id: item.id,
          product_id: item.id, // Explicitly set product_id for backend
          name: item.name,
          thumbnail: item.thumbnail,
          image_url: item.thumbnail,
          quantity: item.quantity,
          discount_price: item.discount_price,
          original_price: item.original_price,
          subtotal: item.subtotal,
          is_pre_order: false,
          selected_variants: item.selected_variants || {},
        })) : [],
        preOrderItems: hasPreOrderItems ? preOrderItems.map(item => ({
          id: item.id,
          product_id: item.id, // Explicitly set product_id for backend
          name: item.name,
          thumbnail: item.thumbnail,
          image_url: item.thumbnail,
          quantity: item.quantity,
          discount_price: item.discount_price,
          original_price: item.original_price,
          subtotal: item.subtotal,
          is_pre_order: true,
          pre_order_shipping_option: selectedPreOrderShipping?.id,
          selected_variants: item.selected_variants || {},
        })) : [],
      };

      // Add delivery options
      if (hasRegularItems && selectedDelivery) {
        checkoutData.delivery_option = selectedDelivery;
      }

      if (hasPreOrderItems && selectedPreOrderShipping) {
        const estimatedArrival = calculateEstimatedArrival(selectedPreOrderShipping);
        checkoutData.pre_order_shipping_option = selectedPreOrderShipping.id;
        checkoutData.estimated_arrival_date = estimatedArrival.date.toISOString();
      }

      // Store checkout data in sessionStorage for order creation after payment
      sessionStorage.setItem('pending_checkout_data', JSON.stringify(checkoutData));
      sessionStorage.setItem('pending_payment_reference', paymentReference);
      sessionStorage.setItem('clear_cart_after_payment', 'true');

      // ✅ CRITICAL: Log all values before payment to ensure they're in GHS
      console.log('💰 Payment initialization (all values in GHS):', {
        subtotal: total,
        discount: couponDiscount,
        deliveryFee: totalDeliveryFee,
        tax,
        grandTotal: amountToPay,
        amountInPesewas: Math.round(amountToPay * 100),
      });

      // Initialize Paystack payment
      // Use user email if logged in, otherwise use a placeholder (Paystack requires email)
      const paymentEmail = user?.email || 'customer@ventechgadgets.com';
      const paymentResult = await paymentService.initializePayment({
        email: paymentEmail,
        amount: Math.round(amountToPay * 100), // ✅ Convert to pesewas ONLY for Paystack
        reference: paymentReference,
        callback_url: `${typeof window !== 'undefined' ? window.location.origin : ''}/payment/callback`,
        metadata: {
          user_id: userId || 'guest',
          checkout_data: checkoutData,
          payment_reference: paymentReference,
        },
      });

      if (!paymentResult.success) {
        throw new Error(paymentResult.message || 'Failed to initialize payment');
      }

      // Payment popup/redirect will be handled by paymentService
      // Order will be created after payment verification in callback page
      // Don't set isProcessing to false here - let the redirect/callback handle it
      // The loading state will be cleared when user is redirected to callback page
    } catch (error: any) {
      console.error('Paystack payment error:', error);
      toast.error(error.message || 'Failed to initialize payment. Please try again.');
      setIsProcessing(false);
    }
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

    // If Paystack payment, initialize payment first
    if (paymentMethod === 'paystack') {
      await handlePaystackPayment();
      return;
    }

    // For cash on delivery, proceed with order creation
    setIsProcessing(true);

    try {
      const orders: any[] = [];
      const errors: string[] = [];

      // Create regular order if we have regular items
      if (hasRegularItems) {
        try {
          const regularDeliveryOption = selectedDelivery || deliveryOptions[0];
          if (!regularDeliveryOption) {
            throw new Error('Please select a delivery option for regular items');
          }

          const regularCheckoutData = {
            items: regularItems.map(item => ({
              ...item,
              is_pre_order: false,
            })),
            delivery_address: {
              gadget_name: deliveryInfo.gadget_name,
              recipient_name: deliveryInfo.recipient_name,
              recipient_number: deliveryInfo.recipient_number,
              recipient_location: deliveryInfo.recipient_location,
              recipient_region: deliveryInfo.recipient_region,
              alternate_contact_number: deliveryInfo.alternate_contact_number || '',
              country: 'Ghana',
              is_default: false,
            },
            delivery_option: regularDeliveryOption,
            payment_method: paymentMethod,
            notes: hasMixedCart ? `${notes || ''}\n\n[Regular Items Order]`.trim() : notes,
            is_pre_order: false,
            subtotal: regularSubtotal,
            discount: couponDiscount,
            coupon_id: appliedCoupon?.coupon_id || null,
            delivery_fee: regularDeliveryFee,
            tax: 0,
            total: regularSubtotal + regularDeliveryFee - couponDiscount,
          };

          const regularOrder = await orderService.createOrder(regularCheckoutData, userId);
          orders.push({ type: 'regular', order: regularOrder });
          console.log('✅ Regular order created:', regularOrder.id);
        } catch (error: any) {
          console.error('❌ Regular order failed:', error);
          const errorMessage = error?.message || error?.response?.data?.message || 'Failed to create regular order';
          errors.push(`Regular order: ${errorMessage}`);
        }
      }

      // Create pre-order if we have pre-order items
      if (hasPreOrderItems) {
        try {
          if (!selectedPreOrderShipping) {
            throw new Error('Please select a shipping option for pre-order items');
          }

          const preOrderDeliveryOption: DeliveryOption = {
            id: selectedPreOrderShipping.id,
            name: selectedPreOrderShipping.name,
            description: `${selectedPreOrderShipping.description} - ${formatEstimatedDelivery(selectedPreOrderShipping)}`,
            price: selectedPreOrderShipping.price,
            estimated_days: selectedPreOrderShipping.estimated_days_max,
          };

          const estimatedArrival = calculateEstimatedArrival(selectedPreOrderShipping);

          const preOrderCheckoutData = {
            items: preOrderItems.map(item => ({
              ...item,
              is_pre_order: true,
              pre_order_shipping_option: selectedPreOrderShipping.id,
            })),
            delivery_address: {
              gadget_name: deliveryInfo.gadget_name,
              recipient_name: deliveryInfo.recipient_name,
              recipient_number: deliveryInfo.recipient_number,
              recipient_location: deliveryInfo.recipient_location,
              recipient_region: deliveryInfo.recipient_region,
              alternate_contact_number: deliveryInfo.alternate_contact_number || '',
              country: 'Ghana',
              is_default: false,
            },
            delivery_option: preOrderDeliveryOption,
            payment_method: paymentMethod,
            notes: hasMixedCart ? `${notes || ''}\n\n[Pre-Order Items]`.trim() : notes,
            is_pre_order: true,
            pre_order_shipping_option: selectedPreOrderShipping.id,
            estimated_arrival_date: estimatedArrival.date.toISOString(),
            subtotal: preOrderSubtotal,
            discount: couponDiscount,
            coupon_id: appliedCoupon?.coupon_id || null,
            delivery_fee: preOrderDeliveryFee, // ✅ Include pre-order shipping fee
            tax: 0,
            total: preOrderSubtotal + preOrderDeliveryFee - couponDiscount, // ✅ Include shipping in total
          };

          const preOrder = await orderService.createOrder(preOrderCheckoutData, userId);
          orders.push({ type: 'pre-order', order: preOrder });
          console.log('✅ Pre-order created:', preOrder.id);
        } catch (error: any) {
          console.error('❌ Pre-order failed:', error);
          const errorMessage = error?.message || error?.response?.data?.message || 'Failed to create pre-order';
          errors.push(`Pre-order: ${errorMessage}`);
        }
      }

      // Handle results
      if (errors.length > 0 && orders.length === 0) {
        // All orders failed
        toast.error(`Failed to place orders: ${errors.join('; ')}`);
        setIsProcessing(false);
        return;
      } else if (errors.length > 0) {
        // Some orders succeeded, some failed
        toast.error(`Some orders were placed successfully, but some failed: ${errors.join('; ')}`);
      } else {
        // All orders succeeded
        if (hasMixedCart) {
          toast.success(`Both orders placed successfully! You will receive confirmation emails shortly.`);
        } else {
          toast.success('Order placed successfully! You will receive a confirmation email shortly.');
        }
      }

      // Clear cart only if at least one order succeeded
      if (orders.length > 0) {
        dispatch(clearCart());
        // Clear coupon after successful order
        sessionStorage.removeItem('applied_coupon');
        // Redirect to the first order (or could show a summary page)
        router.push(`/orders/${orders[0].order.id}`);
      } else {
        setIsProcessing(false);
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

  // Calculate subtotals separately for regular and pre-order items
  const regularSubtotal = regularItems.reduce((sum, item) => sum + item.subtotal, 0);
  const preOrderSubtotal = preOrderItems.reduce((sum, item) => sum + item.subtotal, 0);
  
  // Calculate delivery fees separately
  const regularDeliveryFee = hasRegularItems
    ? (regularSubtotal >= 20000 ? 0 : (selectedDelivery?.price || deliveryOptions[0]?.price || 0))
    : 0;
  const preOrderDeliveryFee = hasPreOrderItems
    ? (selectedPreOrderShipping?.price || PRE_ORDER_SHIPPING_OPTIONS[0].price)
    : 0;
  const totalDeliveryFee = regularDeliveryFee + preOrderDeliveryFee;
  
  const tax = 0;
  const couponDiscount = appliedCoupon?.discount_amount || 0;
  const grandTotal = total + totalDeliveryFee + tax - couponDiscount;
  
  // Calculate estimated arrival for pre-orders
  const estimatedArrival = hasPreOrderItems && selectedPreOrderShipping
    ? calculateEstimatedArrival(selectedPreOrderShipping)
    : null;

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
            {/* Step 1: Delivery Details */}
            {step === 1 && (
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">DELIVERY DETAILS</h2>
                
                {/* Customer Bio Information */}
                <div className="mb-8 p-4 bg-gray-50 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Customer Information (For Identification)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="Your Name *"
                      name="name"
                      value={customerBio.name}
                      onChange={handleCustomerBioChange}
                      required
                      disabled={isAuthenticated && !!user?.full_name}
                    />
                    <Input
                      label="Your Email *"
                      name="email"
                      type="email"
                      value={customerBio.email}
                      onChange={handleCustomerBioChange}
                      required
                      disabled={isAuthenticated && !!user?.email}
                      placeholder="your@email.com"
                    />
                    <Input
                      label="Your Phone Number *"
                      name="phone"
                      type="tel"
                      value={customerBio.phone}
                      onChange={handleCustomerBioChange}
                      required
                      disabled={isAuthenticated && !!user?.phone}
                      placeholder="+233 XX XXX XXXX"
                    />
                  </div>
                </div>
                
                <div className="space-y-4 mb-6">
                  <Input
                    label="GADGET NAME"
                    name="gadget_name"
                    value={deliveryInfo.gadget_name}
                    onChange={handleDeliveryInfoChange}
                    required
                    placeholder="Product name(s) from your cart"
                  />
                  <Input
                    label="RECIPIENT'S NAME"
                    name="recipient_name"
                    value={deliveryInfo.recipient_name}
                    onChange={handleDeliveryInfoChange}
                    required
                  />
                  <Input
                    label="RECIPIENT'S NUMBER"
                    name="recipient_number"
                    type="tel"
                    value={deliveryInfo.recipient_number}
                    onChange={handleDeliveryInfoChange}
                    required
                    placeholder="+233 XX XXX XXXX"
                  />
                  <Input
                    label="RECIPIENT'S LOCATION"
                    name="recipient_location"
                    value={deliveryInfo.recipient_location}
                    onChange={handleDeliveryInfoChange}
                    required
                    placeholder="Street address, area, landmark"
                  />
                  <Input
                    label="RECIPIENT'S REGION"
                    name="recipient_region"
                    value={deliveryInfo.recipient_region}
                    onChange={handleDeliveryInfoChange}
                    required
                    placeholder="e.g., Greater Accra, Ashanti"
                  />
                  <Input
                    label="ALTERNATE CONTACT NUMBER"
                    name="alternate_contact_number"
                    type="tel"
                    value={deliveryInfo.alternate_contact_number}
                    onChange={handleDeliveryInfoChange}
                    placeholder="Optional: +233 XX XXX XXXX"
                  />
                </div>

                {/* Thank you message */}
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                  <p className="text-[#3A3A3A] text-sm">
                    Thank you for choosing Ventech Gadgets as your trusted tech partner.
                  </p>
                </div>

                {/* Important Notice */}
                <div className="mb-6 p-4 bg-orange-50 border-l-4 border-[#FF7A19] rounded-lg">
                  <h3 className="font-bold text-[#1A1A1A] mb-3 text-lg">IMPORTANT NOTICE:</h3>
                  <ul className="space-y-2 text-sm text-[#3A3A3A] list-disc list-inside">
                    <li>Payment is required via Cash or Momo upon delivery or before delivery.</li>
                    <li>Ensure you&apos;re ready to make payment before providing your details.</li>
                    <li>Failure to make payment upon delivery will result in restricted access to our catalogue.</li>
                    <li>Declined orders at delivery still incur delivery payment.</li>
                    <li>Don&apos;t stress vendors, Thank you.</li>
                  </ul>
                </div>

                {/* Contact Information */}
                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-[#3A3A3A]">
                    For more information, call or WhatsApp: <a href="tel:0257140078" className="text-[#FF7A19] font-semibold hover:underline">0257140078</a>
                  </p>
                </div>

                {/* Delivery Notice for Outside Accra */}
                <div className="mt-6 p-4 bg-orange-50 border-l-4 border-[#FF7A19] rounded-lg">
                  <h3 className="font-bold text-[#1A1A1A] mb-3 text-lg">
                    VENTECH DELIVERY DETAILS – OUTSIDE ACCRA
                  </h3>
                  <p className="text-sm text-[#3A3A3A] mb-4 font-medium">
                    Please Note: For all orders outside Greater Accra, a <strong>60% commitment payment</strong> is required before processing.
                  </p>
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-[#1A1A1A] mb-2">We can:</p>
                    <ul className="list-disc list-inside space-y-1 text-sm text-[#3A3A3A] ml-2">
                      <li>Deliver to a trusted relative or contact, they inspect the item, and once confirmed, you make payment.</li>
                      <li>Or, you may pay in full before delivery.</li>
                    </ul>
                  </div>
                </div>

                {/* Delivery Options / Pre-Order Shipping Options */}
                <div className="mt-6 space-y-6">
                  {/* Mixed Cart Notice */}
                  {hasMixedCart && (
                    <div className="p-4 bg-yellow-50 border-l-4 border-yellow-600 rounded-lg">
                      <h3 className="font-semibold text-yellow-900 mb-2">Mixed Cart Notice</h3>
                      <p className="text-sm text-yellow-700">
                        Your cart contains both regular and pre-order items. These will be processed as separate orders with their respective shipping options.
                      </p>
                    </div>
                  )}

                  {/* Regular Items Delivery Options */}
                  {hasRegularItems && (
                    <div>
                      <div className="mb-4 p-4 bg-blue-50 border-l-4 border-blue-600 rounded-lg">
                        <h3 className="font-semibold text-blue-900 mb-2">Regular Items Delivery</h3>
                        <p className="text-sm text-blue-700">
                          Select your preferred delivery method for regular items ({regularItems.length} item{regularItems.length > 1 ? 's' : ''}).
                        </p>
                      </div>
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
                  )}

                  {/* Pre-Order Shipping Options */}
                  {hasPreOrderItems && (
                    <div>
                      <div className="mb-4 p-4 bg-orange-50 border-l-4 border-orange-600 rounded-lg">
                        <h3 className="font-semibold text-orange-900 mb-2">Pre-Order Shipping</h3>
                        <p className="text-sm text-orange-700">
                          Select your preferred shipping method for pre-order items ({preOrderItems.length} item{preOrderItems.length > 1 ? 's' : ''}). Estimated delivery dates are provided for each option.
                        </p>
                      </div>
                      <h3 className="font-semibold text-gray-900 mb-4">Shipping Option</h3>
                      <div className="space-y-3">
                        {PRE_ORDER_SHIPPING_OPTIONS.map((option) => {
                          const estimatedArrival = calculateEstimatedArrival(option);
                          return (
                            <button
                              key={option.id}
                              onClick={() => setSelectedPreOrderShipping(option)}
                              className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                                selectedPreOrderShipping?.id === option.id
                                  ? 'border-[#FF7A19] bg-orange-50'
                                  : 'border-gray-200 hover:border-gray-300'
                              }`}
                            >
                              <div className="flex justify-between items-start mb-2">
                                <div className="flex-1">
                                  <p className="font-semibold text-gray-900">{option.name}</p>
                                  <p className="text-sm text-gray-600">{option.description}</p>
                                </div>
                                <span className="font-bold text-gray-900 ml-4">
                                  {formatCurrency(option.price)}
                                </span>
                              </div>
                              <div className="mt-2 pt-2 border-t border-gray-200">
                                <p className="text-xs text-gray-600">
                                  <strong>Estimated Delivery:</strong> {formatEstimatedDelivery(option)} 
                                  {' '}(Arrives by {estimatedArrival.formatted})
                                </p>
                              </div>
                            </button>
                          );
                        })}
                      </div>
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
                  {/* Paystack Payment */}
                  <button
                    onClick={() => setPaymentMethod('paystack')}
                    className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                      paymentMethod === 'paystack'
                        ? 'border-[#FF7A19] bg-orange-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        paymentMethod === 'paystack'
                          ? 'border-[#FF7A19] bg-[#FF7A19]'
                          : 'border-gray-300'
                      }`}>
                        {paymentMethod === 'paystack' && (
                          <div className="w-2 h-2 rounded-full bg-white"></div>
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">Pay with Paystack</p>
                        <p className="text-sm text-gray-600">Pay securely with card, mobile money, or bank transfer</p>
                      </div>
                    </div>
                  </button>

                  {/* Cash on Delivery */}
                  <button
                    onClick={() => setPaymentMethod('cash_on_delivery')}
                    className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                      paymentMethod === 'cash_on_delivery'
                        ? 'border-[#FF7A19] bg-orange-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        paymentMethod === 'cash_on_delivery'
                          ? 'border-[#FF7A19] bg-[#FF7A19]'
                          : 'border-gray-300'
                      }`}>
                        {paymentMethod === 'cash_on_delivery' && (
                          <div className="w-2 h-2 rounded-full bg-white"></div>
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">Cash on Delivery</p>
                        <p className="text-sm text-gray-600">Pay when you receive your order</p>
                      </div>
                    </div>
                  </button>

                  {/* Payment method info */}
                  <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    {paymentMethod === 'paystack' ? (
                      <p className="text-sm text-blue-800">
                        <strong>Secure Payment:</strong> Your payment will be processed securely through Paystack. 
                        You can pay with card, mobile money, or bank transfer. Order will be created after successful payment.
                      </p>
                    ) : (
                      <p className="text-sm text-blue-800">
                        <strong>Note:</strong> Payment will be collected when your order is delivered. 
                        You'll receive a confirmation email once your order is placed.
                      </p>
                    )}
                    {hasPreOrderItems && (
                      <p className="text-sm text-orange-600 mt-2 font-semibold">
                        ⚠️ Full payment required for pre-orders
                      </p>
                    )}
                  </div>
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
                {/* Mixed Cart Notice */}
                {hasMixedCart && (
                  <div className="bg-yellow-50 border-l-4 border-yellow-600 rounded-lg p-4">
                    <h3 className="font-bold text-yellow-900 mb-2 flex items-center gap-2">
                      <Package size={20} />
                      Split Order Notice
                    </h3>
                    <p className="text-sm text-yellow-800 mb-2">
                      Your cart contains both regular and pre-order items. These will be processed as <strong>two separate orders</strong>:
                    </p>
                    <ul className="list-disc list-inside text-sm text-yellow-800 space-y-1 ml-2">
                      <li><strong>Regular Order:</strong> {regularItems.length} item{regularItems.length > 1 ? 's' : ''} with standard delivery</li>
                      <li><strong>Pre-Order:</strong> {preOrderItems.length} item{preOrderItems.length > 1 ? 's' : ''} with pre-order shipping</li>
                    </ul>
                  </div>
                )}

                {/* Pre-Order Notice (only if no regular items) */}
                {hasPreOrderItems && !hasRegularItems && (
                  <div className="bg-blue-50 border-l-4 border-blue-600 rounded-lg p-4">
                    <h3 className="font-bold text-blue-900 mb-2 flex items-center gap-2">
                      <Package size={20} />
                      Pre-Order Notice
                    </h3>
                    <p className="text-sm text-blue-800 mb-2">
                      This order contains pre-order items. Full payment is required upfront.
                    </p>
                    {selectedPreOrderShipping && estimatedArrival && (
                      <div className="mt-3 pt-3 border-t border-blue-200">
                        <p className="text-sm font-semibold text-blue-900">
                          Selected Shipping: {selectedPreOrderShipping.name}
                        </p>
                        <p className="text-sm text-blue-700">
                          Estimated Arrival: {estimatedArrival.formatted} 
                          {' '}({formatEstimatedDelivery(selectedPreOrderShipping)})
                        </p>
                      </div>
                    )}
                  </div>
                )}

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
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-semibold text-gray-900">{item.name}</p>
                            {item.is_pre_order && (
                              <span className="px-2 py-0.5 bg-[#FF7A19] text-white text-xs font-semibold rounded">
                                Pre-Order
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600">Quantity: {item.quantity}</p>
                        </div>
                        <span className="font-semibold text-gray-900">{formatCurrency(item.subtotal)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Customer Information */}
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <h3 className="font-bold text-gray-900 mb-2">Customer Information</h3>
                  <p className="text-gray-600">
                    <strong>Name:</strong> {customerBio.name}<br />
                    <strong>Email:</strong> {customerBio.email}<br />
                    <strong>Phone:</strong> {customerBio.phone}
                  </p>
                </div>

                {/* Delivery Details */}
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <h3 className="font-bold text-gray-900 mb-2">Delivery Details</h3>
                  <p className="text-gray-600">
                    <strong>Gadget:</strong> {deliveryInfo.gadget_name}<br />
                    <strong>Recipient:</strong> {deliveryInfo.recipient_name}<br />
                    <strong>Phone:</strong> {deliveryInfo.recipient_number}<br />
                    <strong>Location:</strong> {deliveryInfo.recipient_location}<br />
                    <strong>Region:</strong> {deliveryInfo.recipient_region}
                    {deliveryInfo.alternate_contact_number && (
                      <>
                        <br />
                        <strong>Alternate Contact:</strong> {deliveryInfo.alternate_contact_number}
                      </>
                    )}
                  </p>
                </div>

                {/* Shipping Method */}
                {hasMixedCart ? (
                  <div className="space-y-4">
                    {hasRegularItems && (
                      <div className="bg-white rounded-xl shadow-sm p-6">
                        <h3 className="font-bold text-gray-900 mb-2">Regular Items Delivery</h3>
                        <p className="text-gray-600">
                          {selectedDelivery?.name || 'Standard Delivery'}
                        </p>
                      </div>
                    )}
                    {hasPreOrderItems && selectedPreOrderShipping && (
                      <div className="bg-white rounded-xl shadow-sm p-6">
                        <h3 className="font-bold text-gray-900 mb-2">Pre-Order Shipping</h3>
                        <p className="text-gray-900 font-semibold">{selectedPreOrderShipping.name}</p>
                        <p className="text-sm text-gray-600">{selectedPreOrderShipping.description}</p>
                        {estimatedArrival && (
                          <p className="text-sm text-blue-600 mt-1">
                            Estimated Arrival: {estimatedArrival.formatted}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-white rounded-xl shadow-sm p-6">
                    <h3 className="font-bold text-gray-900 mb-2">
                      {hasPreOrderItems ? 'Shipping Method' : 'Delivery Method'}
                    </h3>
                    {hasPreOrderItems && selectedPreOrderShipping ? (
                      <div>
                        <p className="text-gray-900 font-semibold">{selectedPreOrderShipping.name}</p>
                        <p className="text-sm text-gray-600">{selectedPreOrderShipping.description}</p>
                        {estimatedArrival && (
                          <p className="text-sm text-blue-600 mt-1">
                            Estimated Arrival: {estimatedArrival.formatted}
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-gray-600">
                        {selectedDelivery?.name || 'Standard Delivery'}
                      </p>
                    )}
                  </div>
                )}

                {/* Payment Method */}
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <h3 className="font-bold text-gray-900 mb-2">Payment Method</h3>
                  <p className="text-gray-600 capitalize">
                    {paymentMethod === 'paystack' ? 'Paystack (Card/Mobile Money/Bank Transfer)' : 'Cash on Delivery'}
                  </p>
                  {hasPreOrderItems && (
                    <p className="text-sm text-orange-600 mt-2 font-semibold">
                      ⚠️ Full payment required for pre-orders
                    </p>
                  )}
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
                  <span className="font-semibold">Subtotal</span>
                  <span>{formatCurrency(total)}</span>
                </div>
                
                {/* Show breakdown for mixed carts */}
                {hasMixedCart && (
                  <>
                    <div className="flex justify-between text-sm text-gray-500 pl-2">
                      <span>Regular Items ({regularItems.length})</span>
                      <span>{formatCurrency(regularSubtotal)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-gray-500 pl-2">
                      <span>Pre-Order Items ({preOrderItems.length})</span>
                      <span>{formatCurrency(preOrderSubtotal)}</span>
                    </div>
                  </>
                )}
                
                <div className="flex justify-between text-gray-600">
                  <span className="font-semibold">Delivery</span>
                  <span>{totalDeliveryFee === 0 ? 'FREE' : formatCurrency(totalDeliveryFee)}</span>
                </div>
                
                {/* Show delivery breakdown for mixed carts */}
                {hasMixedCart && (
                  <>
                    {regularDeliveryFee > 0 && (
                      <div className="flex justify-between text-sm text-gray-500 pl-2">
                        <span>Regular Delivery</span>
                        <span>{formatCurrency(regularDeliveryFee)}</span>
                      </div>
                    )}
                    {preOrderDeliveryFee > 0 && (
                      <div className="flex justify-between text-sm text-gray-500 pl-2">
                        <span>Pre-Order Shipping</span>
                        <span>{formatCurrency(preOrderDeliveryFee)}</span>
                      </div>
                    )}
                  </>
                )}
                
                {tax > 0 && (
                  <div className="flex justify-between text-gray-600">
                    <span>Tax</span>
                    <span>{formatCurrency(tax)}</span>
                  </div>
                )}
                
                {couponDiscount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Coupon Discount</span>
                    <span>-{formatCurrency(couponDiscount)}</span>
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



