'use client';

import React, { useState } from 'react';
import Image from 'next/image';
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
      <section className="relative bg-gradient-to-r from-[#FF7A19] to-[#FF9A19] py-12 sm:py-16 overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src="/bulkrequest.jpeg"
            alt="Bulk Order"
            fill
            className="object-cover opacity-20"
            priority
          />
        </div>
        <div className="container mx-auto px-4 text-center relative z-10">
          <h1 className="bulk-order-header-title text-3xl sm:text-4xl md:text-5xl font-bold mb-4" style={{ color: '#ffffff' }}>
            VENTECH Bulk Order Request
          </h1>
          <p className="bulk-order-header-subtitle text-lg md:text-xl max-w-2xl mx-auto mt-4" style={{ color: '#ffffff' }}>
            Smart sourcing for large-scale tech needs
          </p>
          <p className="bulk-order-header-description text-base md:text-lg max-w-3xl mx-auto mt-4" style={{ color: '#ffffff' }}>
            Need laptops, smartphones, or gadgets in bulk? VENTECH makes bulk procurement simple, secure, and cost-effective. Whether you&apos;re equipping an office, school, organization, or resale business, we provide genuine devices at competitive supplier prices—delivered on time.
          </p>
        </div>
      </section>

      {/* Value Highlights */}
      <section className="bg-white py-8 md:py-12 border-b border-gray-200">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold text-[#1A1A1A] text-center mb-6 md:mb-8">
            Why Choose VENTECH for Bulk Orders?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 max-w-5xl mx-auto">
            <div className="flex items-center gap-2 text-sm md:text-base text-[#3A3A3A]">
              <CheckCircle className="text-green-600 flex-shrink-0" size={20} />
              <span>Genuine, factory-sealed devices</span>
            </div>
            <div className="flex items-center gap-2 text-sm md:text-base text-[#3A3A3A]">
              <CheckCircle className="text-green-600 flex-shrink-0" size={20} />
              <span>Competitive bulk & supplier pricing</span>
            </div>
            <div className="flex items-center gap-2 text-sm md:text-base text-[#3A3A3A]">
              <CheckCircle className="text-green-600 flex-shrink-0" size={20} />
              <span>Nationwide delivery across Ghana</span>
            </div>
            <div className="flex items-center gap-2 text-sm md:text-base text-[#3A3A3A]">
              <CheckCircle className="text-green-600 flex-shrink-0" size={20} />
              <span>Flexible payment & pre-order options</span>
            </div>
            <div className="flex items-center gap-2 text-sm md:text-base text-[#3A3A3A]">
              <CheckCircle className="text-green-600 flex-shrink-0" size={20} />
              <span>Dedicated bulk order support team</span>
            </div>
          </div>
        </div>
      </section>

      {/* Form Section */}
      <section className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white rounded-xl shadow-lg p-6 sm:p-8 md:p-10">
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* 1. Contact Info */}
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-[#FF7A19] rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-lg">1</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold text-[#1A1A1A]">Contact Information</h2>
                </div>
                <p className="text-sm text-[#3A3A3A] mb-6 pl-14">
                  Provide your contact details so our bulk sales team can reach you quickly and prepare a tailored quotation.
                </p>
                
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

              {/* 2. Order Details */}
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-[#FF7A19] rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-lg">2</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold text-[#1A1A1A]">Order Details</h2>
                </div>
                <p className="text-sm text-[#3A3A3A] mb-6 pl-14">
                  Tell us what you need. The more details you provide, the faster we can serve you. Include product type, brand, specifications, quantity, and preferred delivery timeline.
                </p>
                
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

              {/* 3. Business / Purpose */}
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-[#FF7A19] rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-lg">3</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold text-[#1A1A1A]">Business or Order Purpose</h2>
                </div>
                <p className="text-sm text-[#3A3A3A] mb-6 pl-14">
                  Help us understand your needs better—corporate procurement, institutional supply, resale, or special projects.
                </p>
                
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

                  <div>
                    <label className="block text-sm font-semibold text-[#1A1A1A] mb-2">
                      Purpose / Notes (Optional)
                    </label>
                    <textarea
                      name="notes"
                      value={formData.notes}
                      onChange={handleChange}
                      rows={4}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF7A19] focus:border-transparent text-sm resize-none"
                      placeholder="Tell us about your business needs, purpose, or any special requirements..."
                    />
                  </div>
                </div>
              </div>

              {/* Trust & Assurance */}
              <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                      <CheckCircle className="text-green-600" size={24} />
                    </div>
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-[#1A1A1A] mb-2">Secure & Reliable Procurement</h3>
                    <p className="text-[#3A3A3A] text-sm leading-relaxed">
                      All bulk requests are handled professionally and confidentially. Once submitted, a VENTECH bulk specialist will contact you within 24 hours to confirm availability, pricing, and delivery schedule.
                    </p>
                  </div>
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

