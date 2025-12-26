'use client';

import { useState } from 'react';

export default function AffiliatePage() {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    country: '',
    promotionChannel: '',
    platformLink: '',
    audienceSize: '',
    payoutMethod: '',
    reason: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus('idle');

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const response = await fetch(`${API_URL}/api/affiliate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fullName: formData.fullName,
          email: formData.email,
          phone: formData.phone,
          country: formData.country,
          promotionChannel: formData.promotionChannel,
          platformLink: formData.platformLink,
          audienceSize: formData.audienceSize || null,
          payoutMethod: formData.payoutMethod || null,
          reason: formData.reason || null,
        }),
      });

      if (response.ok) {
        setSubmitStatus('success');
        setFormData({
          fullName: '',
          email: '',
          phone: '',
          country: '',
          promotionChannel: '',
          platformLink: '',
          audienceSize: '',
          payoutMethod: '',
          reason: '',
        });
      } else {
        setSubmitStatus('error');
      }
    } catch (error) {
      console.error('Error submitting affiliate form:', error);
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-[#FF7A19] to-[#FF9A19] py-12 sm:py-16 text-white">
        <div className="container mx-auto px-4 sm:px-6 text-center">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4 text-white">
            Join the Ventech Gadgets Affiliate Program
          </h1>
          <p className="text-xl md:text-2xl font-semibold text-white mb-4">
            JOIN • PROMOTE • EARN
          </p>
          <p className="text-lg md:text-xl text-white/90 max-w-2xl mx-auto">
            Earn commissions by promoting smartphones, accessories, and the latest tech gadgets your audience already loves.
          </p>
        </div>
      </section>

      {/* What Affiliates Earn */}
      <section className="py-12 md:py-16 bg-white">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-center mb-8 text-[#FF7A19]">
              What Affiliates Earn
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              <div className="text-center p-4 md:p-6 bg-gray-50 rounded-lg hover:shadow-lg transition-shadow">
                <div className="text-4xl md:text-5xl mb-3 text-[#FF7A19]">
                  <i className="fas fa-dollar-sign"></i>
                </div>
                <p className="font-semibold text-[#1A1A1A] text-sm md:text-base">Competitive commission on every successful sale</p>
              </div>
              <div className="text-center p-4 md:p-6 bg-gray-50 rounded-lg hover:shadow-lg transition-shadow">
                <div className="text-4xl md:text-5xl mb-3 text-[#FF7A19]">
                  <i className="fas fa-link"></i>
                </div>
                <p className="font-semibold text-[#1A1A1A] text-sm md:text-base">Unique referral link & tracking</p>
              </div>
              <div className="text-center p-4 md:p-6 bg-gray-50 rounded-lg hover:shadow-lg transition-shadow">
                <div className="text-4xl md:text-5xl mb-3 text-[#FF7A19]">
                  <i className="fas fa-box"></i>
                </div>
                <p className="font-semibold text-[#1A1A1A] text-sm md:text-base">Promote trending gadgets & accessories</p>
              </div>
              <div className="text-center p-4 md:p-6 bg-gray-50 rounded-lg hover:shadow-lg transition-shadow">
                <div className="text-4xl md:text-5xl mb-3 text-[#FF7A19]">
                  <i className="fas fa-calendar-alt"></i>
                </div>
                <p className="font-semibold text-[#1A1A1A] text-sm md:text-base">Monthly payouts</p>
              </div>
              <div className="text-center p-4 md:p-6 bg-gray-50 rounded-lg col-span-2 lg:col-span-1 hover:shadow-lg transition-shadow">
                <div className="text-4xl md:text-5xl mb-3 text-[#FF7A19]">
                  <i className="fas fa-globe"></i>
                </div>
                <p className="font-semibold text-[#1A1A1A] text-sm md:text-base">Open to affiliates worldwide</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-12 md:py-16 bg-gray-50">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-center mb-12 text-[#FF7A19]">
              How It Works
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
              <div className="text-center p-4 md:p-6 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow">
                <div className="w-12 h-12 md:w-16 md:h-16 bg-[#FF7A19] rounded-full flex items-center justify-center text-white text-lg md:text-2xl mx-auto mb-3 md:mb-4">
                  <i className="fas fa-user-plus"></i>
                </div>
                <h3 className="font-semibold text-base md:text-lg mb-2 text-[#1A1A1A]">Sign Up</h3>
                <p className="text-gray-600 text-xs md:text-sm">Complete the affiliate form.</p>
              </div>
              <div className="text-center p-4 md:p-6 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow">
                <div className="w-12 h-12 md:w-16 md:h-16 bg-[#FF7A19] rounded-full flex items-center justify-center text-white text-lg md:text-2xl mx-auto mb-3 md:mb-4">
                  <i className="fas fa-link"></i>
                </div>
                <h3 className="font-semibold text-base md:text-lg mb-2 text-[#1A1A1A]">Get Your Link</h3>
                <p className="text-gray-600 text-xs md:text-sm">Receive your unique referral link.</p>
              </div>
              <div className="text-center p-4 md:p-6 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow">
                <div className="w-12 h-12 md:w-16 md:h-16 bg-[#FF7A19] rounded-full flex items-center justify-center text-white text-lg md:text-2xl mx-auto mb-3 md:mb-4">
                  <i className="fas fa-share-alt"></i>
                </div>
                <h3 className="font-semibold text-base md:text-lg mb-2 text-[#1A1A1A]">Promote Gadgets</h3>
                <p className="text-gray-600 text-xs md:text-sm">Share products with your audience.</p>
              </div>
              <div className="text-center p-4 md:p-6 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow">
                <div className="w-12 h-12 md:w-16 md:h-16 bg-[#FF7A19] rounded-full flex items-center justify-center text-white text-lg md:text-2xl mx-auto mb-3 md:mb-4">
                  <i className="fas fa-money-bill-wave"></i>
                </div>
                <h3 className="font-semibold text-base md:text-lg mb-2 text-[#1A1A1A]">Earn Commissions</h3>
                <p className="text-gray-600 text-xs md:text-sm">Get paid for every successful sale.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Sign-Up Form */}
      <section id="affiliate-form" className="py-12 md:py-16 bg-white">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-center mb-8 text-[#FF7A19]">
              Join as an Affiliate
            </h2>

            {submitStatus === 'success' && (
              <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-800">
                <p className="font-semibold">Application submitted successfully!</p>
                <p className="text-sm mt-1">We'll review your application and get back to you soon.</p>
              </div>
            )}

            {submitStatus === 'error' && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
                <p className="font-semibold">Error submitting application.</p>
                <p className="text-sm mt-1">Please try again or contact us directly.</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Full Name */}
              <div>
                <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="fullName"
                  name="fullName"
                  required
                  value={formData.fullName}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF7A19] focus:border-transparent outline-none"
                  placeholder="Enter your full name"
                />
              </div>

              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF7A19] focus:border-transparent outline-none"
                  placeholder="your.email@example.com"
                />
              </div>

              {/* Phone */}
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  required
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF7A19] focus:border-transparent outline-none"
                  placeholder="+233 XX XXX XXXX"
                />
              </div>

              {/* Country */}
              <div>
                <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-2">
                  Country <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="country"
                  name="country"
                  required
                  value={formData.country}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF7A19] focus:border-transparent outline-none"
                  placeholder="Ghana"
                />
              </div>

              {/* Promotion Channel */}
              <div>
                <label htmlFor="promotionChannel" className="block text-sm font-medium text-gray-700 mb-2">
                  Primary Promotion Channel <span className="text-red-500">*</span>
                </label>
                <select
                  id="promotionChannel"
                  name="promotionChannel"
                  required
                  value={formData.promotionChannel}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF7A19] focus:border-transparent outline-none bg-white"
                >
                  <option value="">Select a channel</option>
                  <option value="Instagram">Instagram</option>
                  <option value="TikTok">TikTok</option>
                  <option value="YouTube">YouTube</option>
                  <option value="WhatsApp">WhatsApp</option>
                  <option value="Website / Blog">Website / Blog</option>
                  <option value="Facebook">Facebook</option>
                  <option value="Twitter (X)">Twitter (X)</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {/* Platform Link */}
              <div>
                <label htmlFor="platformLink" className="block text-sm font-medium text-gray-700 mb-2">
                  Link to Your Platform <span className="text-red-500">*</span>
                  <span className="text-gray-500 text-xs ml-2">(Social profile, website, or channel)</span>
                </label>
                <input
                  type="url"
                  id="platformLink"
                  name="platformLink"
                  required
                  value={formData.platformLink}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF7A19] focus:border-transparent outline-none"
                  placeholder="https://instagram.com/yourprofile"
                />
              </div>

              {/* Audience Size */}
              <div>
                <label htmlFor="audienceSize" className="block text-sm font-medium text-gray-700 mb-2">
                  Estimated Audience Size <span className="text-gray-500 text-xs">(Optional but recommended)</span>
                </label>
                <select
                  id="audienceSize"
                  name="audienceSize"
                  value={formData.audienceSize}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF7A19] focus:border-transparent outline-none bg-white"
                >
                  <option value="">Select audience size</option>
                  <option value="0–1k">0–1k</option>
                  <option value="1k–5k">1k–5k</option>
                  <option value="5k–20k">5k–20k</option>
                  <option value="20k+">20k+</option>
                </select>
              </div>

              {/* Payout Method */}
              <div>
                <label htmlFor="payoutMethod" className="block text-sm font-medium text-gray-700 mb-2">
                  Preferred Payout Method <span className="text-gray-500 text-xs">(Optional)</span>
                </label>
                <select
                  id="payoutMethod"
                  name="payoutMethod"
                  value={formData.payoutMethod}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF7A19] focus:border-transparent outline-none bg-white"
                >
                  <option value="">Select payout method</option>
                  <option value="Mobile Money">Mobile Money</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="PayPal">PayPal</option>
                </select>
              </div>

              {/* Reason */}
              <div>
                <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-2">
                  Why do you want to join our affiliate program? <span className="text-gray-500 text-xs">(Optional)</span>
                </label>
                <textarea
                  id="reason"
                  name="reason"
                  rows={4}
                  value={formData.reason}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF7A19] focus:border-transparent outline-none resize-none"
                  placeholder="Tell us why you'd be a great affiliate partner..."
                />
              </div>

              {/* Submit Button */}
              <div className="pt-4">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-[#FF7A19] text-white font-semibold py-4 px-6 rounded-lg hover:bg-[#e66a0f] transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-lg"
                >
                  {isSubmitting ? 'Submitting...' : 'Apply Now'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 md:py-16 bg-gradient-to-br from-[#1A1A1A] to-[#2D2D2D] text-white">
        <div className="container mx-auto px-4 sm:px-6 text-center">
          <h2 className="affiliate-cta-heading text-2xl md:text-3xl font-bold mb-6 text-white" style={{ color: '#ffffff' }}>
            Start Earning with Ventech
          </h2>
          <p className="affiliate-cta-text text-lg mb-8 max-w-2xl mx-auto" style={{ color: '#ffffff' }}>
            Join thousands of affiliates promoting the latest tech gadgets and earning competitive commissions.
          </p>
          <a
            href="#affiliate-form"
            className="inline-block bg-[#FF7A19] text-white font-semibold py-4 px-8 rounded-lg hover:bg-[#e66a0f] transition-colors text-lg"
            onClick={(e) => {
              e.preventDefault();
              document.getElementById('affiliate-form')?.scrollIntoView({ behavior: 'smooth' });
            }}
          >
            Join as an Affiliate
          </a>
        </div>
      </section>
    </div>
  );
}

