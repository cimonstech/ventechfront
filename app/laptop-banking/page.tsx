'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/Button';
import { 
  TrendingUp, 
  Shield, 
  Users, 
  Calendar,
  Award,
  Phone,
  Mail,
  MapPin,
  ArrowRight,
  Percent,
  Laptop,
  Handshake,
  RefreshCw,
  Headphones
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function LaptopBankingPage() {
  const [selectedTier, setSelectedTier] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    tier: '',
    message: '',
  });

  const vtsBankingTiers = [
    { name: 'VIP 1', investment: 2500, term1: 600, term2: 675, total: 1275, fullName: 'VTS - VIP 1 (GHS 2,500)' },
    { name: 'VIP 2', investment: 5000, term1: 1200, term2: 1350, total: 2550, fullName: 'VTS - VIP 2 (GHS 5,000)' },
    { name: 'VIP 3', investment: 10000, term1: 2400, term2: 2700, total: 5100, fullName: 'VTS - VIP 3 (GHS 10,000)' },
  ];

  const exclusiveBankingTiers = [
    { name: 'VIP 1', investment: 15000, term1: 3600, term2: 4050, total: 7650, fullName: 'Exclusive - VIP 1 (GHS 15,000)' },
    { name: 'VIP 2', investment: 20000, term1: 4800, term2: 5400, total: 10200, fullName: 'Exclusive - VIP 2 (GHS 20,000)' },
    { name: 'VIP 3', investment: 30000, term1: 7200, term2: 8100, total: 15300, fullName: 'Exclusive - VIP 3 (GHS 30,000)' },
  ];

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleSelectPlan = (tierFullName: string) => {
    setFormData({ ...formData, tier: tierFullName });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.tier) {
      toast.error('Please select an investment tier');
      return;
    }

    setIsSubmitting(true);

    try {
      // Extract amount from tier string (e.g., "VTS - VIP 1 (GHS 2,500)" -> "2,500")
      const amountMatch = formData.tier.match(/GHS ([\d,]+)/);
      const amount = amountMatch ? amountMatch[1] : '0';
      
      // Extract plan type (VTS or Exclusive)
      const plan = formData.tier.includes('VTS') ? 'VTS Banking' : 'Exclusive Banking';

      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      
      const response = await fetch(`${API_URL}/api/investment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fullName: formData.name,
          email: formData.email,
          phone: formData.phone,
          tier: formData.tier,
          amount,
          plan,
          message: formData.message,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success('Thank you! We will contact you within 24 hours. Check your email for confirmation.');
        setFormData({ name: '', email: '', phone: '', tier: '', message: '' });
        setShowModal(false);
      } else {
        toast.error(data.error || 'Failed to submit investment request. Please try again.');
      }
    } catch (error) {
      console.error('Error submitting investment form:', error);
      toast.error('Network error. Please check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
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
                src="/laptopbanking.webp"
                alt="VENTECH Laptop Banking"
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
              <span className="text-xs md:text-sm font-semibold">Private Investment Opportunity</span>
            </div>
            
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4 md:mb-6 leading-tight text-white md:text-white">
              VENTECH Laptop Banking
            </h1>
            
            <p className="text-lg sm:text-xl md:text-2xl mb-3 md:mb-4 text-white font-medium">
              Earn Consistent Monthly Returns from Ghana's Growing Tech Market
            </p>
            
            <p className="text-base sm:text-lg text-white mb-6 md:mb-8 leading-relaxed">
              Partner with VENTECH to finance high-demand laptop inventory. We manage sourcing, sales, and operations — you earn predictable monthly returns from real tech trade.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
              <Button 
                variant="secondary" 
                size="lg" 
                icon={<ArrowRight className="w-[18px] h-[18px] md:w-5 md:h-5" />}
                onClick={() => scrollToSection('investment-form')}
                className="bg-black hover:bg-gray-800 text-white border-none text-sm md:text-base"
              >
                Start Investing
              </Button>
              <Button 
                variant="ghost" 
                size="lg" 
                className="text-white border-2 border-white hover:bg-white/10 bg-transparent text-sm md:text-base"
                onClick={() => scrollToSection('how-it-works')}
              >
                View How It Works
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Why Laptop Banking Works */}
      <section className="py-12 md:py-16 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#1A1A1A] text-center mb-8 md:mb-12">
            Why Laptop Banking Works
          </h2>
          
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6 md:gap-8 max-w-6xl mx-auto mb-8 md:mb-12">
            {/* Real Market Demand */}
            <div className="bg-white rounded-xl p-6 md:p-8 shadow-lg border border-gray-100">
              <div className="w-12 h-12 md:w-16 md:h-16 bg-orange-100 rounded-full flex items-center justify-center mb-4 md:mb-6">
                <TrendingUp className="text-[#FF7A19] w-6 h-6 md:w-8 md:h-8" />
              </div>
              <h3 className="text-lg md:text-xl font-bold text-[#1A1A1A] mb-3 md:mb-4">Real Market Demand</h3>
              <p className="text-sm md:text-base text-[#3A3A3A] leading-relaxed">
                Laptops are essential tools in Ghana, with consistent and growing demand from students, professionals, and businesses.
              </p>
            </div>
            
            {/* Trade-Backed Returns */}
            <div className="bg-white rounded-xl p-6 md:p-8 shadow-lg border border-gray-100">
              <div className="w-12 h-12 md:w-16 md:h-16 bg-orange-100 rounded-full flex items-center justify-center mb-4 md:mb-6">
                <RefreshCw className="text-[#FF7A19] w-6 h-6 md:w-8 md:h-8" />
              </div>
              <h3 className="text-lg md:text-xl font-bold text-[#1A1A1A] mb-3 md:mb-4">Trade-Backed Returns</h3>
              <p className="text-sm md:text-base text-[#3A3A3A] leading-relaxed">
                Returns are generated from actual laptop sales, not speculation or high-risk instruments.
              </p>
            </div>
            
            {/* Expert-Led Operations */}
            <div className="bg-white rounded-xl p-6 md:p-8 shadow-lg border border-gray-100 sm:col-span-2 md:col-span-1">
              <div className="w-12 h-12 md:w-16 md:h-16 bg-orange-100 rounded-full flex items-center justify-center mb-4 md:mb-6">
                <Handshake className="text-[#FF7A19] w-6 h-6 md:w-8 md:h-8" />
              </div>
              <h3 className="text-lg md:text-xl font-bold text-[#1A1A1A] mb-3 md:mb-4">Expert-Led Operations</h3>
              <p className="text-sm md:text-base text-[#3A3A3A] leading-relaxed">
                VENTECH handles import, pricing, distribution, and sales, making it hands-free for investors.
              </p>
            </div>
          </div>

          {/* PDF Buttons */}
          <div className="grid grid-cols-2 sm:flex sm:flex-row gap-3 sm:gap-4 justify-center max-w-2xl mx-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open('https://files.ventechgadgets.com/laptopbanking.pdf', '_blank', 'noopener,noreferrer')}
              className="w-full px-3 py-2 sm:px-4 sm:py-2 text-sm border-2 border-[#FF7A19] text-[#FF7A19] hover:!bg-[#FF7A19] hover:!text-white transition-colors"
            >
              Learn More
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open('https://files.ventechgadgets.com/VENTECH%20LAPTOP%20BANKING%20INVESTMENT%20AGREEMENT.pdf', '_blank', 'noopener,noreferrer')}
              className="w-full px-3 py-2 sm:px-4 sm:py-2 text-sm border-2 border-[#FF7A19] text-[#FF7A19] hover:!bg-[#FF7A19] hover:!text-white transition-colors"
            >
              Read Agreement
            </Button>
          </div>
        </div>
      </section>

      {/* How Laptop Banking Works */}
      <section id="how-it-works" className="py-12 md:py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#1A1A1A] text-center mb-8 md:mb-12">
            How Laptop Banking Works
          </h2>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6 md:gap-8 max-w-5xl mx-auto mb-8 md:mb-12">
            {/* Step 1 */}
            <div className="text-center bg-white rounded-xl p-4 md:p-6 shadow-md border border-gray-200">
              <div className="w-16 h-16 md:w-20 md:h-20 bg-[#FF7A19] text-white rounded-full flex items-center justify-center mx-auto mb-4 md:mb-6 font-bold text-xl md:text-2xl">
                1
              </div>
              <h3 className="text-lg md:text-xl font-bold text-[#1A1A1A] mb-2 md:mb-3">You Invest</h3>
              <p className="text-sm md:text-base text-[#3A3A3A] leading-relaxed">
                Choose an investment tier and fund laptop inventory.
              </p>
            </div>
            
            {/* Step 2 */}
            <div className="text-center bg-white rounded-xl p-4 md:p-6 shadow-md border border-gray-200">
              <div className="w-16 h-16 md:w-20 md:h-20 bg-[#FF7A19] text-white rounded-full flex items-center justify-center mx-auto mb-4 md:mb-6 font-bold text-xl md:text-2xl">
                2
              </div>
              <h3 className="text-lg md:text-xl font-bold text-[#1A1A1A] mb-2 md:mb-3">We Trade</h3>
              <p className="text-sm md:text-base text-[#3A3A3A] leading-relaxed">
                VENTECH imports and sells laptops through our nationwide distribution network.
              </p>
            </div>
            
            {/* Step 3 - Under Step 1 on mobile */}
            <div className="text-center col-span-1 md:col-span-1 bg-white rounded-xl p-4 md:p-6 shadow-md border border-gray-200">
              <div className="w-16 h-16 md:w-20 md:h-20 bg-[#FF7A19] text-white rounded-full flex items-center justify-center mx-auto mb-4 md:mb-6 font-bold text-xl md:text-2xl">
                3
              </div>
              <h3 className="text-lg md:text-xl font-bold text-[#1A1A1A] mb-2 md:mb-3">You Earn</h3>
              <p className="text-sm md:text-base text-[#3A3A3A] leading-relaxed">
                You receive monthly returns while your capital works in real trade.
              </p>
            </div>
          </div>

          {/* Investment Structure Card */}
          <div className="max-w-2xl mx-auto bg-white rounded-xl p-6 md:p-8 shadow-lg border border-gray-100">
            <h3 className="text-xl md:text-2xl font-bold text-[#1A1A1A] mb-4 md:mb-6 text-center">Investment Structure</h3>
            
            <div className="space-y-3 md:space-y-4">
              <div className="flex items-center gap-3 md:gap-4 p-3 md:p-4 bg-gray-50 rounded-lg">
                <Calendar className="text-[#FF7A19] flex-shrink-0 w-5 h-5 md:w-6 md:h-6" />
                <div>
                  <p className="font-semibold text-sm md:text-base text-[#1A1A1A]">3 Months per Term</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 md:gap-4 p-3 md:p-4 bg-gray-50 rounded-lg">
                <Percent className="text-[#FF7A19] flex-shrink-0 w-5 h-5 md:w-6 md:h-6" />
                <div>
                  <p className="font-semibold text-sm md:text-base text-[#1A1A1A]">Term 2: 9% monthly</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 md:gap-4 p-3 md:p-4 bg-gray-50 rounded-lg">
                <Percent className="text-[#FF7A19] flex-shrink-0 w-5 h-5 md:w-6 md:h-6" />
                <div>
                  <p className="font-semibold text-sm md:text-base text-[#1A1A1A]">Term 1: 8% monthly</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 md:gap-4 p-3 md:p-4 bg-gray-50 rounded-lg">
                <Shield className="text-[#FF7A19] flex-shrink-0 w-5 h-5 md:w-6 md:h-6" />
                <div>
                  <p className="font-semibold text-sm md:text-base text-[#1A1A1A]">Principal: 100% returned at the end of the term</p>
                </div>
              </div>
            </div>
            
            <p className="text-xs md:text-sm text-[#3A3A3A] text-center mt-4 md:mt-6 italic">
              This is a private, trade-backed agreement, not a public savings product.
            </p>
          </div>
        </div>
      </section>

      {/* Exclusive Investor Benefits */}
      <section className="py-12 md:py-16 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#1A1A1A] text-center mb-8 md:mb-12">
            Exclusive Investor Benefits
          </h2>
          
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6 md:gap-8 max-w-6xl mx-auto">
            {/* Premium Membership */}
            <div className="bg-white rounded-xl p-6 md:p-8 shadow-lg border border-gray-100">
              <div className="w-12 h-12 md:w-16 md:h-16 bg-orange-100 rounded-full flex items-center justify-center mb-4 md:mb-6">
                <Award className="text-[#FF7A19] w-6 h-6 md:w-8 md:h-8" />
              </div>
              <h3 className="text-lg md:text-xl font-bold text-[#1A1A1A] mb-3 md:mb-4">Premium Membership</h3>
              <p className="text-sm md:text-base text-[#3A3A3A] leading-relaxed">
                Every investor receives 5 Premium Stars to purchase up to 5 gadgets at supplier pricing.
              </p>
            </div>
            
            {/* Referral Bonus */}
            <div className="bg-white rounded-xl p-6 md:p-8 shadow-lg border border-gray-100">
              <div className="w-12 h-12 md:w-16 md:h-16 bg-orange-100 rounded-full flex items-center justify-center mb-4 md:mb-6">
                <Users className="text-[#FF7A19] w-6 h-6 md:w-8 md:h-8" />
              </div>
              <h3 className="text-lg md:text-xl font-bold text-[#1A1A1A] mb-3 md:mb-4">Referral Bonus</h3>
              <p className="text-sm md:text-base text-[#3A3A3A] leading-relaxed">
                Earn 1% additional monthly interest for each successful referral.
              </p>
            </div>
            
            {/* Priority Support */}
            <div className="bg-white rounded-xl p-6 md:p-8 shadow-lg border border-gray-100 sm:col-span-2 md:col-span-1">
              <div className="w-12 h-12 md:w-16 md:h-16 bg-orange-100 rounded-full flex items-center justify-center mb-4 md:mb-6">
                <Headphones className="text-[#FF7A19] w-6 h-6 md:w-8 md:h-8" />
              </div>
              <h3 className="text-lg md:text-xl font-bold text-[#1A1A1A] mb-3 md:mb-4">Priority Support</h3>
              <p className="text-sm md:text-base text-[#3A3A3A] leading-relaxed">
                Direct access to VENTECH investment team for personalized assistance.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Investment Tiers */}
      <section className="py-12 md:py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl sm:text-3xl font-bold text-center text-[#1A1A1A] mb-8 md:mb-12">Choose Your Investment Path</h2>

          {/* VTS Banking */}
          <div className="max-w-6xl mx-auto mb-12">
            <div className="text-center mb-8">
              <h3 className="text-2xl font-bold text-[#1A1A1A] mb-2">VTS Banking</h3>
              <p className="text-sm text-[#3A3A3A]">Perfect for first-time investors</p>
            </div>
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
              {vtsBankingTiers.map((tier) => (
                <div key={tier.name} className="bg-white rounded-xl p-4 md:p-6 border-2 border-gray-200 hover:border-[#FF7A19] transition-all">
                  <h4 className="font-bold text-lg md:text-xl text-[#1A1A1A] mb-3 md:mb-4">{tier.name}</h4>
                  <div className="mb-4 md:mb-6">
                    <p className="text-xs md:text-sm text-[#3A3A3A] mb-1 md:mb-2">Investment</p>
                    <p className="text-xl md:text-2xl font-bold text-[#FF7A19]">GHS {tier.investment.toLocaleString()}</p>
                  </div>
                  <div className="space-y-2 md:space-y-3 mb-4 md:mb-6">
                    <div className="flex justify-between text-xs md:text-sm">
                      <span className="text-[#3A3A3A]">Term 1 (8%)</span>
                      <span className="font-semibold text-[#1A1A1A]">GHS {tier.term1.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-xs md:text-sm">
                      <span className="text-[#3A3A3A]">Term 2 (9%)</span>
                      <span className="font-semibold text-[#1A1A1A]">GHS {tier.term2.toLocaleString()}</span>
                    </div>
                    <div className="border-t pt-2 md:pt-3 flex justify-between">
                      <span className="font-bold text-sm md:text-base text-[#1A1A1A]">Total Return</span>
                      <span className="font-bold text-[#FF7A19] text-base md:text-lg">GHS {tier.total.toLocaleString()}</span>
                    </div>
                  </div>
                  <Button variant="primary" className="w-full text-sm md:text-base" onClick={() => handleSelectPlan(tier.fullName)}>
                    Select Plan
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Exclusive Banking */}
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-8">
              <h3 className="text-2xl font-bold text-[#1A1A1A] mb-2">Exclusive Banking</h3>
              <p className="text-sm text-[#3A3A3A]">For growth-focused investors</p>
            </div>
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
              {exclusiveBankingTiers.map((tier) => (
                <div key={tier.name} className="exclusive-vip-card bg-gradient-to-br from-[#1A1A1A] to-[#3A3A3A] rounded-xl p-4 md:p-6 border-2 border-[#FF7A19] text-white">
                  <div className="inline-flex items-center gap-2 bg-[#FF7A19] rounded-full px-2 md:px-3 py-1 mb-3 md:mb-4">
                    <Award className="w-3 h-3 md:w-[14px] md:h-[14px]" />
                    <span className="text-[10px] md:text-xs font-semibold">EXCLUSIVE</span>
                  </div>
                  <h4 className="font-bold text-lg md:text-xl mb-3 md:mb-4">{tier.name}</h4>
                  <div className="mb-4 md:mb-6">
                    <p className="text-xs md:text-sm text-white mb-1 md:mb-2" style={{ color: '#ffffff' }}>Investment</p>
                    <p className="text-xl md:text-2xl font-bold text-white" style={{ color: '#ffffff' }}>GHS {tier.investment.toLocaleString()}</p>
                  </div>
                  <div className="space-y-2 md:space-y-3 mb-4 md:mb-6">
                    <div className="flex justify-between text-xs md:text-sm">
                      <span className="text-white" style={{ color: '#ffffff' }}>Term 1 (8%)</span>
                      <span className="font-semibold text-white" style={{ color: '#ffffff' }}>GHS {tier.term1.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-xs md:text-sm">
                      <span className="text-white" style={{ color: '#ffffff' }}>Term 2 (9%)</span>
                      <span className="font-semibold text-white" style={{ color: '#ffffff' }}>GHS {tier.term2.toLocaleString()}</span>
                    </div>
                    <div className="border-t border-white/20 pt-2 md:pt-3 flex justify-between">
                      <span className="font-bold text-sm md:text-base text-white" style={{ color: '#ffffff' }}>Total Return</span>
                      <span className="font-bold text-[#FF7A19] text-base md:text-lg">GHS {tier.total.toLocaleString()}</span>
                    </div>
                  </div>
                  <Button variant="secondary" className="w-full text-sm md:text-base" onClick={() => handleSelectPlan(tier.fullName)}>
                    Select Plan
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Contact Form */}
      <section id="investment-form" className="py-12 md:py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-6 md:mb-8">
              <h2 className="text-2xl sm:text-3xl font-bold text-[#1A1A1A] mb-3 md:mb-4">Start Your Investment Journey</h2>
              <p className="text-sm md:text-base text-[#3A3A3A]">Fill out the form below and we'll contact you within 24 hours</p>
            </div>

            <div className="bg-white rounded-xl p-6 md:p-8 shadow-lg border border-gray-200">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-[#1A1A1A] mb-2">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF7A19] text-sm"
                  />
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-[#1A1A1A] mb-2">Email *</label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF7A19] text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-[#1A1A1A] mb-2">Phone *</label>
                    <input
                      type="tel"
                      required
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF7A19] text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#1A1A1A] mb-2">Investment Tier *</label>
                  <select
                    required
                    value={formData.tier}
                    onChange={(e) => setFormData({ ...formData, tier: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF7A19] text-sm"
                  >
                    <option value="">Select a tier</option>
                    <optgroup label="VTS Banking">
                      <option>VTS - VIP 1 (GHS 2,500)</option>
                      <option>VTS - VIP 2 (GHS 5,000)</option>
                      <option>VTS - VIP 3 (GHS 10,000)</option>
                    </optgroup>
                    <optgroup label="Exclusive Banking">
                      <option>Exclusive - VIP 1 (GHS 15,000)</option>
                      <option>Exclusive - VIP 2 (GHS 20,000)</option>
                      <option>Exclusive - VIP 3 (GHS 30,000)</option>
                    </optgroup>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#1A1A1A] mb-2">Message (Optional)</label>
                  <textarea
                    rows={4}
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF7A19] text-sm resize-none"
                  />
                </div>
                <Button 
                  type="submit" 
                  variant="primary" 
                  size="lg" 
                  className="w-full" 
                  icon={<ArrowRight className="w-5 h-5" />}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Application'}
                </Button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* Modal */}
      {showModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
          onClick={() => setShowModal(false)}
        >
          <div 
            className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-[#1A1A1A]">Start Your Investment Journey</h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-[#3A3A3A] hover:text-[#1A1A1A] transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-[#1A1A1A] mb-2">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF7A19] text-sm"
                  />
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-[#1A1A1A] mb-2">Email *</label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF7A19] text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-[#1A1A1A] mb-2">Phone *</label>
                    <input
                      type="tel"
                      required
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF7A19] text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#1A1A1A] mb-2">Investment Tier *</label>
                  <select
                    required
                    value={formData.tier}
                    onChange={(e) => setFormData({ ...formData, tier: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF7A19] text-sm"
                  >
                    <option value="">Select a tier</option>
                    <optgroup label="VTS Banking">
                      <option>VTS - VIP 1 (GHS 2,500)</option>
                      <option>VTS - VIP 2 (GHS 5,000)</option>
                      <option>VTS - VIP 3 (GHS 10,000)</option>
                    </optgroup>
                    <optgroup label="Exclusive Banking">
                      <option>Exclusive - VIP 1 (GHS 15,000)</option>
                      <option>Exclusive - VIP 2 (GHS 20,000)</option>
                      <option>Exclusive - VIP 3 (GHS 30,000)</option>
                    </optgroup>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#1A1A1A] mb-2">Message (Optional)</label>
                  <textarea
                    rows={4}
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF7A19] text-sm resize-none"
                  />
                </div>
                <Button 
                  type="submit" 
                  variant="primary" 
                  size="lg" 
                  className="w-full" 
                  icon={<ArrowRight className="w-5 h-5" />}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Application'}
                </Button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Contact Info */}
      <section className="py-12 bg-[#1A1A1A] text-white">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h3 className="text-2xl font-bold mb-6 text-white">Get In Touch</h3>
            <div className="grid md:grid-cols-3 gap-6">
              <a href="tel:+233551344310" className="flex flex-col items-center gap-2 hover:text-[#FF7A19] transition-colors">
                <Phone size={24} />
                <span className="text-sm">+233 55 134 4310</span>
              </a>
              <a href="mailto:ventechgadgets@gmail.com" className="flex flex-col items-center gap-2 hover:text-[#FF7A19] transition-colors">
                <Mail size={24} />
                <span className="text-sm">ventechgadgets@gmail.com</span>
              </a>
              <div className="flex flex-col items-center gap-2">
                <MapPin size={24} />
                <span className="text-sm">Ho Civic Center Shop #22 & Accra</span>
              </div>
            </div>
            <p className="mt-8 text-sm" style={{ color: '#ffffff' }}>
              Signed contract within 24 hours | Limited slots available per cycle
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
