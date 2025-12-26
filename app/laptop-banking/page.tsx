'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { 
  TrendingUp, 
  Shield, 
  DollarSign, 
  Users, 
  Calendar,
  Award,
  Phone,
  Mail,
  MapPin,
  CheckCircle,
  ArrowRight,
  Gift,
  Percent,
  Laptop
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
      <section className="bg-gradient-to-br from-[#FF7A19] via-[#FF8C3A] to-[#FFA05C] text-white py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 mb-6">
              <Laptop size={20} />
              <span className="text-sm font-semibold">INVESTMENT OPPORTUNITY</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              VENTECH Laptop Banking
            </h1>
            <p className="text-xl md:text-2xl mb-4 text-white">
              Your Smart, Hands-Free Way to Grow Money Through Tech
            </p>
            <p className="text-lg text-white mb-8 max-w-3xl mx-auto">
              Why struggle to invest alone when you can earn more by partnering with experts? 
              We handle the bulk laptop trade, market sales, and risk — you enjoy monthly returns, 
              flexible terms, and full control.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Button 
                variant="secondary" 
                size="lg" 
                icon={<ArrowRight size={20} />}
                onClick={() => scrollToSection('investment-form')}
              >
                Start Investing
              </Button>
              <Button 
                variant="ghost" 
                size="lg" 
                className="text-white border-white hover:bg-white/10"
                onClick={() => scrollToSection('how-it-works')}
              >
                Learn More
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Key Benefits */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8 max-w-6xl mx-auto">
            <div className="text-center">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Percent className="text-[#FF7A19]" size={28} />
              </div>
              <h3 className="font-bold text-lg text-[#1A1A1A] mb-2">8-9% Returns</h3>
              <p className="text-sm text-[#3A3A3A]">Fixed monthly returns</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="text-[#FF7A19]" size={28} />
              </div>
              <h3 className="font-bold text-lg text-[#1A1A1A] mb-2">Low Risk</h3>
              <p className="text-sm text-[#3A3A3A]">Backed by real inventory</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Calendar className="text-[#FF7A19]" size={28} />
              </div>
              <h3 className="font-bold text-lg text-[#1A1A1A] mb-2">6 Months</h3>
              <p className="text-sm text-[#3A3A3A]">Flexible investment terms</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Gift className="text-[#FF7A19]" size={28} />
              </div>
              <h3 className="font-bold text-lg text-[#1A1A1A] mb-2">Premium Stars</h3>
              <p className="text-sm text-[#3A3A3A]">Buy gadgets at supplier pricing</p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center mb-12">
            <h2 className="text-3xl font-bold text-[#1A1A1A] mb-4">How It Works</h2>
            <p className="text-[#3A3A3A]">VENTECH Laptop Banking is a 6-month investment program powered by real laptop trade</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto mb-12">
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-[#FF7A19] text-white rounded-full flex items-center justify-center font-bold text-xl">
                  1
                </div>
                <div>
                  <h3 className="font-bold text-lg text-[#1A1A1A]">Term 1 (3 months)</h3>
                  <p className="text-sm text-[#3A3A3A]">Earn 8% monthly</p>
                </div>
              </div>
              <p className="text-sm text-[#3A3A3A] leading-relaxed">
                Full principal returned at the end of the term
              </p>
            </div>

            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-[#FF7A19] text-white rounded-full flex items-center justify-center font-bold text-xl">
                  2
                </div>
                <div>
                  <h3 className="font-bold text-lg text-[#1A1A1A]">Term 2 (3 months)</h3>
                  <p className="text-sm text-[#3A3A3A]">Earn 9% monthly</p>
                </div>
              </div>
              <p className="text-sm text-[#3A3A3A] leading-relaxed">
                Exit available after Term 1 with 28-day notice
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {[
              { step: '1', title: 'You Invest', desc: 'Choose your tier and sign agreement' },
              { step: '2', title: 'We Purchase', desc: 'Import laptops from trusted suppliers' },
              { step: '3', title: 'We Sell', desc: 'Sell through retail outlets nationwide' },
              { step: '4', title: 'You Earn', desc: 'Monthly returns via MoMo or bank' },
            ].map((item, i) => (
              <div key={i} className="text-center">
                <div className="w-12 h-12 bg-[#FF7A19] text-white rounded-full flex items-center justify-center mx-auto mb-3 font-bold">
                  {item.step}
                </div>
                <h4 className="font-bold text-sm text-[#1A1A1A] mb-2">{item.title}</h4>
                <p className="text-xs text-[#3A3A3A]">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Investment Tiers */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center text-[#1A1A1A] mb-12">Choose Your Investment Path</h2>

          {/* VTS Banking */}
          <div className="max-w-6xl mx-auto mb-12">
            <div className="text-center mb-8">
              <h3 className="text-2xl font-bold text-[#1A1A1A] mb-2">VTS Banking</h3>
              <p className="text-sm text-[#3A3A3A]">Perfect for first-time investors</p>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {vtsBankingTiers.map((tier) => (
                <div key={tier.name} className="bg-white rounded-xl p-6 border-2 border-gray-200 hover:border-[#FF7A19] transition-all">
                  <h4 className="font-bold text-xl text-[#1A1A1A] mb-4">{tier.name}</h4>
                  <div className="mb-6">
                    <p className="text-sm text-[#3A3A3A] mb-2">Investment</p>
                    <p className="text-2xl font-bold text-[#FF7A19]">GHS {tier.investment.toLocaleString()}</p>
                  </div>
                  <div className="space-y-3 mb-6">
                    <div className="flex justify-between text-sm">
                      <span className="text-[#3A3A3A]">Term 1 (8%)</span>
                      <span className="font-semibold text-[#1A1A1A]">GHS {tier.term1.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-[#3A3A3A]">Term 2 (9%)</span>
                      <span className="font-semibold text-[#1A1A1A]">GHS {tier.term2.toLocaleString()}</span>
                    </div>
                    <div className="border-t pt-3 flex justify-between">
                      <span className="font-bold text-[#1A1A1A]">Total Return</span>
                      <span className="font-bold text-[#FF7A19] text-lg">GHS {tier.total.toLocaleString()}</span>
                    </div>
                  </div>
                  <Button variant="primary" className="w-full" onClick={() => handleSelectPlan(tier.fullName)}>
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
            <div className="grid md:grid-cols-3 gap-6">
              {exclusiveBankingTiers.map((tier) => (
                <div key={tier.name} className="bg-gradient-to-br from-[#1A1A1A] to-[#3A3A3A] rounded-xl p-6 border-2 border-[#FF7A19] text-white">
                  <div className="inline-flex items-center gap-2 bg-[#FF7A19] rounded-full px-3 py-1 mb-4">
                    <Award size={14} />
                    <span className="text-xs font-semibold">EXCLUSIVE</span>
                  </div>
                  <h4 className="font-bold text-xl mb-4">{tier.name}</h4>
                  <div className="mb-6">
                    <p className="text-sm text-white/80 mb-2">Investment</p>
                    <p className="text-2xl font-bold text-[#FF7A19]">GHS {tier.investment.toLocaleString()}</p>
                  </div>
                  <div className="space-y-3 mb-6">
                    <div className="flex justify-between text-sm">
                      <span className="text-white/80">Term 1 (8%)</span>
                      <span className="font-semibold">GHS {tier.term1.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-white/80">Term 2 (9%)</span>
                      <span className="font-semibold">GHS {tier.term2.toLocaleString()}</span>
                    </div>
                    <div className="border-t border-white/20 pt-3 flex justify-between">
                      <span className="font-bold">Total Return</span>
                      <span className="font-bold text-[#FF7A19] text-lg">GHS {tier.total.toLocaleString()}</span>
                    </div>
                  </div>
                  <Button variant="secondary" className="w-full" onClick={() => handleSelectPlan(tier.fullName)}>
                    Select Plan
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Premium Benefits */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="grid md:grid-cols-2 gap-8">
              {/* Premium Membership */}
              <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-8">
                <div className="flex items-center gap-3 mb-4">
                  <Gift className="text-[#FF7A19]" size={32} />
                  <h3 className="text-2xl font-bold text-[#1A1A1A]">Premium Membership</h3>
                </div>
                <p className="text-[#3A3A3A] mb-6">
                  Every investor gets <strong>5 Premium Stars</strong> to buy up to 5 gadgets at supplier pricing
                </p>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="text-[#FF7A19]" size={20} />
                    <span className="text-sm text-[#1A1A1A]">Redeem within 6-month period anytime</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="text-[#FF7A19]" size={20} />
                    <span className="text-sm text-[#1A1A1A]">Buy laptops, phones, accessories below retail</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="text-[#FF7A19]" size={20} />
                    <span className="text-sm text-[#1A1A1A]">Shareable with family or friends</span>
                  </div>
                </div>
              </div>

              {/* Referral Bonus */}
              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-8">
                <div className="flex items-center gap-3 mb-4">
                  <Users className="text-green-600" size={32} />
                  <h3 className="text-2xl font-bold text-[#1A1A1A]">Referral Bonus</h3>
                </div>
                <p className="text-[#3A3A3A] mb-6">
                  Refer a customer who buys and earn <strong className="text-green-600">GHS 100 cash</strong>
                </p>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="text-green-600" size={20} />
                    <span className="text-sm text-[#1A1A1A]">Unlimited referrals</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="text-green-600" size={20} />
                    <span className="text-sm text-[#1A1A1A]">Paid via MoMo or bank transfer</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="text-green-600" size={20} />
                    <span className="text-sm text-[#1A1A1A]">Bonus after sale confirmation</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Form */}
      <section id="investment-form" className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-[#1A1A1A] mb-4">Start Your Investment Journey</h2>
              <p className="text-[#3A3A3A]">Fill out the form below and we'll contact you within 24 hours</p>
            </div>

            <div className="bg-white rounded-xl p-8 shadow-lg">
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
                  icon={<ArrowRight size={20} />}
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
                  icon={<ArrowRight size={20} />}
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
            <p className="mt-8 text-sm text-[#FF7A19]">
              Signed contract within 24 hours | Limited slots available per cycle
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

