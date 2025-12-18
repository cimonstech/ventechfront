'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Send, Package, ShoppingBag, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { bulkOrderService, BulkOrderFormData } from '@/services/bulkOrder.service';

export function BulkOrderContent() {
  const [formData, setFormData] = useState<BulkOrderFormData>({
    name: '',
    phone: '',
    email: '',
    organization: '',
    productType: '',
    quantity: '',
    preferredSpecs: '',
    deliveryLocation: '',
    paymentMethod: '',
    preferredDeliveryDate: '',
    notes: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const result = await bulkOrderService.submitBulkOrderRequest(formData);
      
      if (result.success) {
        toast.success('Bulk order request submitted! We\'ll contact you shortly.');
        // Reset form
        setFormData({
          name: '',
          phone: '',
          email: '',
          organization: '',
          productType: '',
          quantity: '',
          preferredSpecs: '',
          deliveryLocation: '',
          paymentMethod: '',
          preferredDeliveryDate: '',
          notes: '',
        });
      } else {
        toast.error(result.error || 'Failed to submit request. Please try again.');
      }
    } catch (error) {
      console.error('Bulk order form error:', error);
      toast.error('Failed to submit request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-[#FF7A19] to-[#FF9A19] py-12 sm:py-16">
        <div className="container mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 mb-4">
            <Package className="text-white" size={20} />
            <span className="text-sm font-semibold text-white">BULK ORDERS</span>
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 text-white">
            VENTECH BULK ORDER REQUEST FORM
          </h1>
          <p className="text-lg text-white/90 max-w-2xl mx-auto">
            Need laptops or gadgets in bulk? Let&apos;s make it easy.
          </p>
        </div>
      </section>

      {/* Form Section */}
      <section className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white rounded-xl shadow-lg p-6 sm:p-8 md:p-10">
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* 1. Contact Info */}
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-[#FF7A19] rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-lg">1</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold text-[#1A1A1A]">Contact Info</h2>
                </div>
                
                <div className="space-y-4 pl-14">
                  <div>
                    <label className="block text-sm font-semibold text-[#1A1A1A] mb-2">
                      Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF7A19] focus:border-transparent text-sm"
                      placeholder="Your full name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-[#1A1A1A] mb-2">
                      Phone Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF7A19] focus:border-transparent text-sm"
                      placeholder="+233 55 134 4310"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-[#1A1A1A] mb-2">
                      Email Address <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF7A19] focus:border-transparent text-sm"
                      placeholder="your.email@example.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-[#1A1A1A] mb-2">
                      Organization (if any)
                    </label>
                    <input
                      type="text"
                      name="organization"
                      value={formData.organization}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF7A19] focus:border-transparent text-sm"
                      placeholder="Company or organization name"
                    />
                  </div>
                </div>
              </div>

              {/* 2. What Would You Like to Order? */}
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-[#FF7A19] rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-lg">2</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold text-[#1A1A1A]">What Would You Like to Order?</h2>
                </div>
                
                <div className="space-y-4 pl-14">
                  <div>
                    <label className="block text-sm font-semibold text-[#1A1A1A] mb-2">
                      Product Type <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="productType"
                      value={formData.productType}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF7A19] focus:border-transparent text-sm"
                      placeholder="e.g. Laptops, Accessories, Tablets, etc."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-[#1A1A1A] mb-2">
                      Quantity <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="quantity"
                      value={formData.quantity}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF7A19] focus:border-transparent text-sm"
                      placeholder="e.g. 10 units, 50 units"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-[#1A1A1A] mb-2">
                      Preferred Specs / Models <span className="text-gray-500 text-xs">(Optional)</span>
                    </label>
                    <textarea
                      name="preferredSpecs"
                      value={formData.preferredSpecs}
                      onChange={handleChange}
                      rows={3}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF7A19] focus:border-transparent text-sm resize-none"
                      placeholder="e.g. i5, 16GB RAM, 256SSD"
                    />
                  </div>
                </div>
              </div>

              {/* 3. Delivery & Payment */}
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-[#FF7A19] rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-lg">3</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold text-[#1A1A1A]">Delivery & Payment</h2>
                </div>
                
                <div className="space-y-4 pl-14">
                  <div>
                    <label className="block text-sm font-semibold text-[#1A1A1A] mb-2">
                      Delivery Location <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="deliveryLocation"
                      value={formData.deliveryLocation}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF7A19] focus:border-transparent text-sm"
                      placeholder="City, Address, or Region"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-[#1A1A1A] mb-2">
                      Preferred Payment Method <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="paymentMethod"
                      value={formData.paymentMethod}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF7A19] focus:border-transparent text-sm"
                    >
                      <option value="">Select payment method</option>
                      <option value="Bank Transfer">Bank Transfer</option>
                      <option value="MoMo">MoMo (Mobile Money)</option>
                      <option value="Cash">Cash</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-[#1A1A1A] mb-2">
                      Preferred Date for Delivery
                    </label>
                    <input
                      type="date"
                      name="preferredDeliveryDate"
                      value={formData.preferredDeliveryDate}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF7A19] focus:border-transparent text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* 4. Notes */}
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-[#FF7A19] rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-lg">4</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold text-[#1A1A1A]">Notes (Optional)</h2>
                </div>
                
                <div className="pl-14">
                  <label className="block text-sm font-semibold text-[#1A1A1A] mb-2">
                    Any extra info, requests, or questions?
                  </label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleChange}
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF7A19] focus:border-transparent text-sm resize-none"
                    placeholder="Tell us anything else we should know..."
                  />
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-4">
                <Button 
                  type="submit" 
                  variant="primary" 
                  size="lg" 
                  className="w-full sm:w-auto min-w-[200px]"
                  icon={<Send size={18} />}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Request'}
                </Button>
              </div>
            </form>
          </div>

          {/* Info Section */}
          <div className="mt-8 bg-white rounded-xl shadow-lg p-6 sm:p-8">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <CheckCircle className="text-green-600" size={24} />
                </div>
              </div>
              <div>
                <h3 className="font-bold text-lg text-[#1A1A1A] mb-2">What Happens Next?</h3>
                <p className="text-[#3A3A3A] text-sm leading-relaxed">
                  We&apos;ll contact you shortly to confirm your request and share the best offers. 
                  Our team will review your bulk order requirements and get back to you with competitive pricing 
                  and delivery options.
                </p>
              </div>
            </div>
          </div>

          {/* Branding */}
          <div className="mt-6 text-center">
            <p className="text-[#3A3A3A] text-sm">
              <span className="font-bold text-[#FF7A19]">VENTECH</span> – Trusted For Tech. No Compromise.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

