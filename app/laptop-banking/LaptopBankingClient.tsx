'use client';

import React, { useMemo, useState } from 'react';
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
  Headphones,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { fetchPublicAgreementTemplate, submitVlbApplication, vlbGhs, type VlbPublicPlan } from '@/lib/vlb';

export default function LaptopBankingPage({
  termsPublished,
  plans,
}: {
  termsPublished: boolean;
  plans: VlbPublicPlan[];
}) {
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    message: '',
  });

  const sample = plans[0];
  const vtsPlans = plans.filter((plan) => plan.plan_group === 'vts');
  const exclusivePlans = plans.filter((plan) => plan.plan_group === 'exclusive');
  const maxStars = Math.max(0, ...plans.map((plan) => Number(plan.premium_stars) || 0));
  const maxReferral = Math.max(0, ...plans.map((plan) => Number(plan.referral_bonus_percent) || 0));
  const monthsTotal = sample
    ? Number(sample.terms_count) * Number(sample.months_per_term) + Number(sample.settlement_months)
    : 10;

  const timeline = useMemo(() => {
    if (!sample) return [];
    const items: Array<{ month: number; label: string }> = [];
    const terms = Number(sample.terms_count);
    const perTerm = Number(sample.months_per_term);
    for (let month = 1; month <= monthsTotal; month += 1) {
      if (month > terms * perTerm) {
        items.push({ month, label: 'Settlement' });
      } else {
        items.push({ month, label: `Term ${Math.ceil(month / perTerm)}` });
      }
    }
    return items;
  }, [sample, monthsTotal]);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) element.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleSelectPlan = (planId: string) => {
    setSelectedPlanId(planId);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlanId) {
      toast.error('Please select an investment tier');
      return;
    }
    setIsSubmitting(true);
    try {
      await submitVlbApplication({
        full_name: formData.name,
        email: formData.email,
        phone: formData.phone,
        plan_id: selectedPlanId,
        message: formData.message || undefined,
      });
      toast.success('Thank you! We will contact you within 24 hours. Check your email for confirmation.');
      setFormData({ name: '', email: '', phone: '', message: '' });
      setSelectedPlanId('');
      setShowModal(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to submit investment request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const planOptions = (group: 'vts' | 'exclusive') =>
    plans.filter((plan) => plan.plan_group === group);

  const applicationFields = (
    <>
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
            minLength={8}
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
          value={selectedPlanId}
          onChange={(e) => setSelectedPlanId(e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF7A19] text-sm"
        >
          <option value="">Select a tier</option>
          {planOptions('vts').length > 0 && (
            <optgroup label="VTS Banking">
              {planOptions('vts').map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.name} ({vlbGhs(plan.principal_pesewas)})
                </option>
              ))}
            </optgroup>
          )}
          {planOptions('exclusive').length > 0 && (
            <optgroup label="Exclusive Banking">
              {planOptions('exclusive').map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.name} ({vlbGhs(plan.principal_pesewas)})
                </option>
              ))}
            </optgroup>
          )}
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
    </>
  );

  return (
    <div className="min-h-screen bg-white">
      <section className="relative bg-gradient-to-b from-[#FF7A19] via-[#FF8C3A] to-[#D2691E] text-white py-20 md:py-28 overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src="/laptopbanking.webp"
            alt="VENTECH Laptop Banking"
            fill
            className="object-cover opacity-30"
            priority
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#FF7A19]/90 via-[#FF8C3A]/85 to-[#D2691E]/90"></div>
        </div>
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
            backgroundSize: '40px 40px',
          }}
        />
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-2xl md:max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-3 md:px-4 py-2 mb-6">
              <Laptop className="w-4 h-4 md:w-[18px] md:h-[18px]" />
              <span className="text-xs md:text-sm font-semibold">Private Investment Opportunity</span>
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4 drop-shadow-lg">
              VENTECH Laptop Banking
            </h1>
            <p className="text-lg md:text-xl mb-4 text-white font-medium drop-shadow-md">
              Earn Consistent Monthly Returns from Ghana's Growing Tech Market
            </p>
            <p className="text-base md:text-lg text-white mb-8 leading-relaxed drop-shadow-md">
              Partner with VENTECH to finance high-demand laptop inventory. We manage sourcing, sales, and operations — you earn predictable monthly returns from real tech trade.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 md:gap-4 justify-center">
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

      <section className="py-12 md:py-16 bg-white border-b border-gray-200 rounded-t-3xl -mt-10 md:-mt-16 relative z-20">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#1A1A1A] text-center mb-8 md:mb-12">
            Why Laptop Banking Works
          </h2>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6 md:gap-8 max-w-6xl mx-auto mb-8 md:mb-12">
            <div className="bg-white rounded-xl p-6 md:p-8 shadow-lg border border-gray-100">
              <div className="w-12 h-12 md:w-16 md:h-16 bg-orange-100 rounded-full flex items-center justify-center mb-4 md:mb-6">
                <TrendingUp className="text-[#FF7A19] w-6 h-6 md:w-8 md:h-8" />
              </div>
              <h3 className="text-lg md:text-xl font-bold text-[#1A1A1A] mb-3 md:mb-4">Real Market Demand</h3>
              <p className="text-sm md:text-base text-[#3A3A3A] leading-relaxed">
                Laptops are essential tools in Ghana, with consistent and growing demand from students, professionals, and businesses.
              </p>
            </div>
            <div className="bg-white rounded-xl p-6 md:p-8 shadow-lg border border-gray-100">
              <div className="w-12 h-12 md:w-16 md:h-16 bg-orange-100 rounded-full flex items-center justify-center mb-4 md:mb-6">
                <RefreshCw className="text-[#FF7A19] w-6 h-6 md:w-8 md:h-8" />
              </div>
              <h3 className="text-lg md:text-xl font-bold text-[#1A1A1A] mb-3 md:mb-4">Trade-Backed Returns</h3>
              <p className="text-sm md:text-base text-[#3A3A3A] leading-relaxed">
                Returns are generated from actual laptop sales, not speculation or high-risk instruments.
              </p>
            </div>
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
          <div className="grid grid-cols-2 sm:flex sm:flex-row gap-3 sm:gap-4 justify-center max-w-2xl mx-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open('https://files.ventechgadgets.com/laptopbanking.pdf', '_blank', 'noopener,noreferrer')}
              className="w-full px-3 py-2 sm:px-4 sm:py-2 text-sm border-2 border-[#FF7A19] text-[#FF7A19] hover:!bg-[#FF7A19] hover:!text-white transition-colors"
            >
              Learn More
            </Button>
            {termsPublished ? (
              <button
                type="button"
                onClick={async () => {
                  const template = await fetchPublicAgreementTemplate();
                  if (template?.url) {
                    window.open(template.url, '_blank', 'noopener,noreferrer');
                    return;
                  }
                  window.location.href = '/laptop-banking/terms';
                }}
                className="inline-flex w-full items-center justify-center rounded-lg border-2 border-[#FF7A19] px-3 py-2 text-sm font-medium text-[#FF7A19] transition-colors hover:bg-[#FF7A19] hover:text-white sm:px-4"
              >
                Read Agreement
              </button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  const template = await fetchPublicAgreementTemplate();
                  if (template?.url) {
                    window.open(template.url, '_blank', 'noopener,noreferrer');
                    return;
                  }
                  window.open('https://files.ventechgadgets.com/VENTECH%20LAPTOP%20BANKING%20INVESTMENT%20AGREEMENT.pdf', '_blank', 'noopener,noreferrer');
                }}
                className="w-full px-3 py-2 sm:px-4 sm:py-2 text-sm border-2 border-[#FF7A19] text-[#FF7A19] hover:!bg-[#FF7A19] hover:!text-white transition-colors"
              >
                Read Agreement
              </Button>
            )}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="py-12 md:py-16 bg-gray-50 rounded-t-3xl -mt-10 md:-mt-16 relative z-20">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#1A1A1A] text-center mb-8 md:mb-12">
            How Laptop Banking Works
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6 md:gap-8 max-w-5xl mx-auto mb-8 md:mb-12">
            <div className="text-center bg-white rounded-xl p-4 md:p-6 shadow-md border border-gray-200">
              <div className="w-16 h-16 md:w-20 md:h-20 bg-[#FF7A19] text-white rounded-full flex items-center justify-center mx-auto mb-4 md:mb-6 font-bold text-xl md:text-2xl">1</div>
              <h3 className="text-lg md:text-xl font-bold text-[#1A1A1A] mb-2 md:mb-3">You Invest</h3>
              <p className="text-sm md:text-base text-[#3A3A3A] leading-relaxed">Choose an investment tier and fund laptop inventory.</p>
            </div>
            <div className="text-center bg-white rounded-xl p-4 md:p-6 shadow-md border border-gray-200">
              <div className="w-16 h-16 md:w-20 md:h-20 bg-[#FF7A19] text-white rounded-full flex items-center justify-center mx-auto mb-4 md:mb-6 font-bold text-xl md:text-2xl">2</div>
              <h3 className="text-lg md:text-xl font-bold text-[#1A1A1A] mb-2 md:mb-3">We Trade</h3>
              <p className="text-sm md:text-base text-[#3A3A3A] leading-relaxed">VENTECH imports and sells laptops through our nationwide distribution network.</p>
            </div>
            <div className="text-center col-span-1 md:col-span-1 bg-white rounded-xl p-4 md:p-6 shadow-md border border-gray-200">
              <div className="w-16 h-16 md:w-20 md:h-20 bg-[#FF7A19] text-white rounded-full flex items-center justify-center mx-auto mb-4 md:mb-6 font-bold text-xl md:text-2xl">3</div>
              <h3 className="text-lg md:text-xl font-bold text-[#1A1A1A] mb-2 md:mb-3">You Earn</h3>
              <p className="text-sm md:text-base text-[#3A3A3A] leading-relaxed">You receive monthly returns while your capital works in real trade.</p>
            </div>
          </div>

          <div className="max-w-3xl mx-auto bg-white rounded-xl p-6 md:p-8 shadow-lg border border-gray-100">
            <h3 className="text-xl md:text-2xl font-bold text-[#1A1A1A] mb-4 md:mb-6 text-center">
              {sample?.version || 'V3.0'} structure
            </h3>
            {sample ? (
              <>
                <p className="text-sm md:text-base text-[#3A3A3A] text-center mb-6">
                  {sample.terms_count} terms of {sample.months_per_term} months, then a {sample.settlement_months}-month settlement.
                  Principal is returned in month {monthsTotal}.
                </p>
                <div className="flex gap-1 overflow-x-auto pb-2 mb-6">
                  {timeline.map((item) => (
                    <div key={item.month} className="min-w-[2.4rem] flex-1 text-center">
                      <div
                        className={`h-10 rounded-md flex items-center justify-center text-xs font-bold ${
                          item.label === 'Settlement' ? 'bg-[#1A1A1A] text-white' : 'bg-[#FF7A19] text-white'
                        }`}
                      >
                        {item.month}
                      </div>
                      <p className="mt-1 text-[10px] leading-tight text-[#3A3A3A]">{item.label}</p>
                    </div>
                  ))}
                </div>
                <div className="space-y-3 md:space-y-4">
                  <div className="flex items-center gap-3 md:gap-4 p-3 md:p-4 bg-gray-50 rounded-lg">
                    <Calendar className="text-[#FF7A19] flex-shrink-0 w-5 h-5 md:w-6 md:h-6" />
                    <p className="font-semibold text-sm md:text-base text-[#1A1A1A]">
                      {sample.months_per_term} months per term · {sample.terms_count} terms
                    </p>
                  </div>
                  {(sample.term_rates_percent || []).map((rate, index) => (
                    <div key={index} className="flex items-center gap-3 md:gap-4 p-3 md:p-4 bg-gray-50 rounded-lg">
                      <Percent className="text-[#FF7A19] flex-shrink-0 w-5 h-5 md:w-6 md:h-6" />
                      <p className="font-semibold text-sm md:text-base text-[#1A1A1A]">
                        Term {index + 1}: {rate}% {sample.rate_basis === 'per_month' ? 'monthly' : 'per term'}
                      </p>
                    </div>
                  ))}
                  <div className="flex items-center gap-3 md:gap-4 p-3 md:p-4 bg-gray-50 rounded-lg">
                    <Shield className="text-[#FF7A19] flex-shrink-0 w-5 h-5 md:w-6 md:h-6" />
                    <p className="font-semibold text-sm md:text-base text-[#1A1A1A]">
                      Principal: 100% returned in month {monthsTotal}
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-sm text-center text-[#3A3A3A]">Plans will appear here shortly.</p>
            )}
            <p className="text-xs md:text-sm text-[#3A3A3A] text-center mt-4 md:mt-6 italic">
              This is a private, trade-backed agreement, not a public savings product.
            </p>
            <p className="text-xs md:text-sm text-[#3A3A3A] text-center mt-2">
              Returns come from laptop trading and are not a bank deposit.
            </p>
          </div>
        </div>
      </section>

      <section className="py-12 md:py-16 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#1A1A1A] text-center mb-8 md:mb-12">
            Exclusive Investor Benefits
          </h2>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6 md:gap-8 max-w-6xl mx-auto">
            {maxStars > 0 && (
              <div className="bg-white rounded-xl p-6 md:p-8 shadow-lg border border-gray-100">
                <div className="w-12 h-12 md:w-16 md:h-16 bg-orange-100 rounded-full flex items-center justify-center mb-4 md:mb-6">
                  <Award className="text-[#FF7A19] w-6 h-6 md:w-8 md:h-8" />
                </div>
                <h3 className="text-lg md:text-xl font-bold text-[#1A1A1A] mb-3 md:mb-4">Premium Membership</h3>
                <p className="text-sm md:text-base text-[#3A3A3A] leading-relaxed">
                  Investors receive Premium Stars to purchase gadgets at supplier pricing. Current plans include up to {maxStars} stars.
                </p>
              </div>
            )}
            {maxReferral > 0 && (
              <div className="bg-white rounded-xl p-6 md:p-8 shadow-lg border border-gray-100">
                <div className="w-12 h-12 md:w-16 md:h-16 bg-orange-100 rounded-full flex items-center justify-center mb-4 md:mb-6">
                  <Users className="text-[#FF7A19] w-6 h-6 md:w-8 md:h-8" />
                </div>
                <h3 className="text-lg md:text-xl font-bold text-[#1A1A1A] mb-3 md:mb-4">Referral Bonus</h3>
                <p className="text-sm md:text-base text-[#3A3A3A] leading-relaxed">
                  Earn {maxReferral}% additional interest for each successful referral.
                </p>
              </div>
            )}
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

      <section className="py-12 md:py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl sm:text-3xl font-bold text-center text-[#1A1A1A] mb-8 md:mb-12">Choose Your Investment Path</h2>
          {plans.length === 0 ? (
            <p className="text-center text-sm text-[#3A3A3A]">Plans will appear here shortly.</p>
          ) : (
            <>
              {vtsPlans.length > 0 && (
                <div className="max-w-6xl mx-auto mb-12">
                  <div className="text-center mb-8">
                    <h3 className="text-2xl font-bold text-[#1A1A1A] mb-2">VTS Banking</h3>
                    <p className="text-sm text-[#3A3A3A]">Perfect for first-time investors</p>
                  </div>
                  <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
                    {vtsPlans.map((plan) => (
                      <PlanCard key={plan.id} plan={plan} onSelect={() => handleSelectPlan(plan.id)} exclusive={false} />
                    ))}
                  </div>
                </div>
              )}
              {exclusivePlans.length > 0 && (
                <div className="max-w-6xl mx-auto">
                  <div className="text-center mb-8">
                    <h3 className="text-2xl font-bold text-[#1A1A1A] mb-2">Exclusive Banking</h3>
                    <p className="text-sm text-[#3A3A3A]">For growth-focused investors</p>
                  </div>
                  <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
                    {exclusivePlans.map((plan) => (
                      <PlanCard key={plan.id} plan={plan} onSelect={() => handleSelectPlan(plan.id)} exclusive />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      <section id="investment-form" className="py-12 md:py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-6 md:mb-8">
              <h2 className="text-2xl sm:text-3xl font-bold text-[#1A1A1A] mb-3 md:mb-4">Start Your Investment Journey</h2>
              <p className="text-sm md:text-base text-[#3A3A3A]">Fill out the form below and we'll contact you within 24 hours</p>
            </div>
            <div className="bg-white rounded-xl p-6 md:p-8 shadow-lg border border-gray-200">
              <form onSubmit={handleSubmit} className="space-y-4">{applicationFields}</form>
            </div>
          </div>
        </div>
      </section>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end sm:items-center justify-center sm:p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white w-full max-w-2xl max-h-[100dvh] sm:max-h-[90vh] overflow-y-auto sm:rounded-xl" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 sm:p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-[#1A1A1A]">Start Your Investment Journey</h2>
                <button type="button" onClick={() => setShowModal(false)} className="text-[#3A3A3A] hover:text-[#1A1A1A] min-h-11 min-w-11">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">{applicationFields}</form>
            </div>
          </div>
        </div>
      )}

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

function PlanCard({
  plan,
  exclusive,
  onSelect,
}: {
  plan: VlbPublicPlan;
  exclusive: boolean;
  onSelect: () => void;
}) {
  const display = plan.display;
  const text = exclusive ? 'text-white' : 'text-[#1A1A1A]';
  const muted = exclusive ? 'text-white' : 'text-[#3A3A3A]';
  return (
    <div
      className={
        exclusive
          ? 'exclusive-vip-card bg-gradient-to-br from-[#1A1A1A] to-[#3A3A3A] rounded-xl p-4 md:p-6 border-2 border-[#FF7A19] text-white'
          : 'bg-white rounded-xl p-4 md:p-6 border-2 border-gray-200 hover:border-[#FF7A19] transition-all'
      }
    >
      {exclusive && (
        <div className="inline-flex items-center gap-2 bg-[#FF7A19] rounded-full px-2 md:px-3 py-1 mb-3 md:mb-4">
          <Award className="w-3 h-3 md:w-[14px] md:h-[14px]" />
          <span className="text-[10px] md:text-xs font-semibold">EXCLUSIVE</span>
        </div>
      )}
      <h4 className={`font-bold text-lg md:text-xl ${text} mb-3 md:mb-4`}>{plan.tier}</h4>
      <div className="mb-4 md:mb-6">
        <p className={`text-xs md:text-sm ${muted} mb-1 md:mb-2`}>Principal</p>
        <p className={`text-xl md:text-2xl font-bold ${exclusive ? 'text-white' : 'text-[#FF7A19]'}`}>
          {vlbGhs(plan.principal_pesewas)}
        </p>
      </div>
      <div className="space-y-2 md:space-y-3 mb-4 md:mb-6">
        <div className={`flex justify-between text-xs md:text-sm ${muted}`}>
          <span>Monthly net</span>
          <span className={`font-semibold ${text}`}>{vlbGhs(display.monthly_net_pesewas)}</span>
        </div>
        <div className={`flex justify-between text-xs md:text-sm ${muted}`}>
          <span>Scholar Fund / month</span>
          <span className={`font-semibold ${text}`}>{vlbGhs(display.scholar_monthly_pesewas)}</span>
        </div>
        {(display.term_totals_pesewas || []).map((total, index) => (
          <div key={index} className={`flex justify-between text-xs md:text-sm ${muted}`}>
            <span>Term {index + 1} net</span>
            <span className={`font-semibold ${text}`}>{vlbGhs(total)}</span>
          </div>
        ))}
        <div className={`border-t ${exclusive ? 'border-white/20' : ''} pt-2 md:pt-3 flex justify-between`}>
          <span className={`font-bold text-sm md:text-base ${text}`}>Total net</span>
          <span className="font-bold text-[#FF7A19] text-base md:text-lg">{vlbGhs(display.total_net_pesewas)}</span>
        </div>
        <p className={`text-xs ${muted}`}>
          Principal back in month {plan.terms_count * plan.months_per_term + plan.settlement_months}: {vlbGhs(display.principal_pesewas)}
        </p>
        {plan.premium_stars > 0 && (
          <p className={`text-xs ${muted}`}>Premium Stars: {plan.premium_stars}</p>
        )}
        {plan.referral_bonus_percent > 0 && (
          <p className={`text-xs ${muted}`}>Referral bonus: {plan.referral_bonus_percent}%</p>
        )}
      </div>
      <Button variant={exclusive ? 'secondary' : 'primary'} className="w-full text-sm md:text-base" onClick={onSelect}>
        Select Plan
      </Button>
    </div>
  );
}
