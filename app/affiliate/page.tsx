'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/Button';
import { Laptop, ArrowRight, TrendingUp, Target, FileText, Users, Share2, DollarSign, FolderOpen } from 'lucide-react';

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

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="relative text-white py-12 md:py-20 lg:py-24 overflow-hidden">
        {/* Background Image with Orange Overlay */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Orange Background - hidden on mobile, visible on desktop */}
          <div className="hidden md:block absolute inset-0 bg-[#FF7A19] z-0"></div>
          
          {/* Image - full width on mobile, starts from middle on desktop */}
          <div className="absolute inset-0 md:left-1/2 md:right-0 top-0 bottom-0 z-0">
            <div className="relative w-full h-full">
              <Image
                src="/affiliate-.webp"
                alt="VENTECH Affiliate Program"
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover"
                priority
              />
              {/* Orange Overlay - full on mobile, partial on desktop */}
              <div className="absolute inset-0 bg-[#FF7A19]/80 md:bg-[#FF7A19]/60"></div>
            </div>
          </div>
        </div>
        
        <div className="container mx-auto px-4 relative z-20">
          <div className="max-w-2xl md:max-w-3xl">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-3 md:px-4 py-2 mb-4 md:mb-6">
              <Laptop className="w-4 h-4 md:w-[18px] md:h-[18px]" />
              <span className="text-xs md:text-sm font-semibold">Partner with VENTECH</span>
            </div>
            
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4 md:mb-6 leading-tight text-white md:text-white">
              Crush It as a Ventech Gadgets Affiliate
            </h1>
            
            <p className="text-lg sm:text-xl md:text-2xl mb-6 md:mb-8 text-white leading-relaxed">
              Turn your following into income. Promote the tech everyone wants. Earn for every sale you make.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
              <Button 
                variant="secondary" 
                size="lg" 
                icon={<ArrowRight className="w-[18px] h-[18px] md:w-5 md:h-5" />}
                onClick={() => scrollToSection('affiliate-form')}
                className="bg-black hover:bg-gray-800 text-white border-none text-sm md:text-base"
              >
                Join Now
              </Button>
              <Button 
                variant="ghost" 
                size="lg" 
                className="text-white border-2 border-white hover:bg-white/10 bg-transparent text-sm md:text-base"
                onClick={() => scrollToSection('how-it-works')}
              >
                How It Works
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Why Partner with Ventech */}
      <section className="py-12 md:py-16 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#1A1A1A] text-center mb-8 md:mb-12">
            Why Partner with Ventech
          </h2>
          
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6 md:gap-8 max-w-6xl mx-auto">
            {/* Competitive Commissions */}
            <div className="bg-white rounded-xl p-6 md:p-8 shadow-lg border border-gray-100">
              <div className="w-12 h-12 md:w-16 md:h-16 bg-orange-100 rounded-full flex items-center justify-center mb-4 md:mb-6">
                <TrendingUp className="text-[#FF7A19] w-6 h-6 md:w-8 md:h-8" />
              </div>
              <h3 className="text-lg md:text-xl font-bold text-[#1A1A1A] mb-3 md:mb-4">Competitive Commissions</h3>
              <p className="text-sm md:text-base text-[#3A3A3A] leading-relaxed">
                Earn up to 12% on every sale you refer. More sales mean higher commissions.
              </p>
            </div>
            
            {/* In-Demand Products */}
            <div className="bg-white rounded-xl p-6 md:p-8 shadow-lg border border-gray-100">
              <div className="w-12 h-12 md:w-16 md:h-16 bg-orange-100 rounded-full flex items-center justify-center mb-4 md:mb-6">
                <Target className="text-[#FF7A19] w-6 h-6 md:w-8 md:h-8" />
              </div>
              <h3 className="text-lg md:text-xl font-bold text-[#1A1A1A] mb-3 md:mb-4">In-Demand Products</h3>
              <p className="text-sm md:text-base text-[#3A3A3A] leading-relaxed">
                Promote the latest smartphones, laptops, earbuds, and gadgets your audience wants.
              </p>
            </div>
            
            {/* Reliable Payouts */}
            <div className="bg-white rounded-xl p-6 md:p-8 shadow-lg border border-gray-100 sm:col-span-2 md:col-span-1">
              <div className="w-12 h-12 md:w-16 md:h-16 bg-orange-100 rounded-full flex items-center justify-center mb-4 md:mb-6">
                <FileText className="text-[#FF7A19] w-6 h-6 md:w-8 md:h-8" />
              </div>
              <h3 className="text-lg md:text-xl font-bold text-[#1A1A1A] mb-3 md:mb-4">Reliable Payouts</h3>
              <p className="text-sm md:text-base text-[#3A3A3A] leading-relaxed">
                Enjoy monthly payouts via MoMo, bank transfer, or crypto.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How the Affiliate Program Works */}
      <section id="how-it-works" className="py-12 md:py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#1A1A1A] text-center mb-8 md:mb-12">
            How the Affiliate Program Works
          </h2>
          
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6 md:gap-8 max-w-6xl mx-auto">
            {/* Join */}
            <div className="bg-white rounded-xl p-6 md:p-8 shadow-lg border border-gray-100">
              <div className="w-12 h-12 md:w-16 md:h-16 bg-orange-100 rounded-full flex items-center justify-center mb-4 md:mb-6">
                <FileText className="text-[#FF7A19] w-6 h-6 md:w-8 md:h-8" />
              </div>
              <h3 className="text-lg md:text-xl font-bold text-[#1A1A1A] mb-3 md:mb-4">Join</h3>
              <p className="text-sm md:text-base text-[#3A3A3A] leading-relaxed">
                Sign up and get your unique referral link. It's quick and free.
              </p>
            </div>
            
            {/* Promote */}
            <div className="bg-white rounded-xl p-6 md:p-8 shadow-lg border border-gray-100">
              <div className="w-12 h-12 md:w-16 md:h-16 bg-orange-100 rounded-full flex items-center justify-center mb-4 md:mb-6">
                <Share2 className="text-[#FF7A19] w-6 h-6 md:w-8 md:h-8" />
              </div>
              <h3 className="text-lg md:text-xl font-bold text-[#1A1A1A] mb-3 md:mb-4">Promote</h3>
              <p className="text-sm md:text-base text-[#3A3A3A] leading-relaxed">
                Share your link and content. Drive traffic to ventechgadgets.com.
              </p>
            </div>
            
            {/* Earn */}
            <div className="bg-white rounded-xl p-6 md:p-8 shadow-lg border border-gray-100 sm:col-span-2 md:col-span-1">
              <div className="w-12 h-12 md:w-16 md:h-16 bg-orange-100 rounded-full flex items-center justify-center mb-4 md:mb-6">
                <DollarSign className="text-[#FF7A19] w-6 h-6 md:w-8 md:h-8" />
              </div>
              <h3 className="text-lg md:text-xl font-bold text-[#1A1A1A] mb-3 md:mb-4">Earn</h3>
              <p className="text-sm md:text-base text-[#3A3A3A] leading-relaxed">
                Receive real-time earnings into your account for every verified sale.
              </p>
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

      {/* Unlock Exclusive Benefits */}
      <section className="relative py-12 md:py-16 text-white overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0 z-0">
          <Image
            src="/affiliatepageimage.webp"
            alt="Affiliate Benefits"
            fill
            sizes="100vw"
            className="object-cover"
            priority
          />
          {/* White Overlay */}
          <div className="absolute inset-0 bg-white/60 z-10"></div>
        </div>
        
        <div className="container mx-auto px-4 text-center relative z-20">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 md:mb-6 text-[#1A1A1A]">
            Unlock Exclusive Benefits
          </h2>
          <p className="text-lg md:text-xl mb-8 md:mb-12 max-w-2xl mx-auto text-[#3A3A3A]">
            Get rewarded for sharing quality tech with your followers.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-2xl mx-auto">
            <Button
              variant="secondary"
              size="lg"
              icon={<ArrowRight className="w-5 h-5" />}
              onClick={() => scrollToSection('affiliate-form')}
              className="bg-[#FF7A19] hover:bg-[#e66a0f] text-white border-none"
            >
              Join Now
            </Button>
            <Button
              variant="outline"
              size="lg"
              icon={<FolderOpen className="w-5 h-5" />}
              onClick={() => window.open('mailto:ventechgadgets@gmail.com', '_blank')}
              className="border-2 border-[#1A1A1A] text-[#1A1A1A] hover:bg-[#1A1A1A] hover:text-white bg-transparent"
            >
              Contact Support
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}

