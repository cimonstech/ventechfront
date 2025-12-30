'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronDown, Mail, Phone, MapPin, MessageCircle } from 'lucide-react';

interface FAQItem {
  question: string;
  answer: string;
  category: string;
}

const faqs: FAQItem[] = [
  // Orders & Shipping
  {
    category: 'Orders & Shipping',
    question: 'How long does delivery take?',
    answer: 'Delivery typically takes 1-3 business days within Accra and Ho, and 3-5 business days for other regions in Ghana. Orders placed before 2 PM are processed the same day.',
  },
  {
    category: 'Orders & Shipping',
    question: 'Do you offer free delivery?',
    answer: 'Yes! We offer free delivery on all orders over GHS 20,000. For orders below this amount, a standard delivery fee applies based on your location.',
  },
  {
    category: 'Orders & Shipping',
    question: 'Can I track my order?',
    answer: 'Absolutely! Once your order is shipped, you\'ll receive a tracking number via email and SMS. You can also track your order status in your account dashboard.',
  },
  {
    category: 'Orders & Shipping',
    question: 'Can I change or cancel my order?',
    answer: 'Yes, you can cancel or modify your order within 2 hours of placing it. After that, the order enters processing and cannot be changed. Contact us immediately at +233 55 134 4310 if you need assistance.',
  },

  // Payment
  {
    category: 'Payment',
    question: 'What payment methods do you accept?',
    answer: 'We accept Mobile Money (MTN, Vodafone, AirtelTigo), credit/debit cards (Visa, Mastercard), and Cash on Delivery (COD) for eligible orders.',
  },
  {
    category: 'Payment',
    question: 'Is it safe to pay online?',
    answer: 'Yes! All online payments are processed through secure, PCI-DSS compliant payment gateways (Hubtel/Paystack). We never store your full payment card details.',
  },
  {
    category: 'Payment',
    question: 'Do you accept installment payments?',
    answer: 'Currently, we don\'t offer installment payment plans directly. However, you may use third-party services like Bank installment plans if your card supports it.',
  },

  // Returns & Refunds
  {
    category: 'Returns & Refunds',
    question: 'What is your return policy?',
    answer: 'We offer a 7-day return policy for most products. Items must be unused, in original packaging, and in resalable condition. See our Returns page for full details.',
  },
  {
    category: 'Returns & Refunds',
    question: 'How do I return an item?',
    answer: 'Contact our customer service at ventechgadgets@gmail.com or call +233 55 134 4310 to initiate a return. We\'ll provide you with a return authorization and instructions.',
  },
  {
    category: 'Returns & Refunds',
    question: 'How long do refunds take?',
    answer: 'Once we receive and inspect your returned item, refunds are processed within 5-7 business days. The refund will be credited to your original payment method.',
  },
  {
    category: 'Returns & Refunds',
    question: 'Can I exchange a product?',
    answer: 'Yes! If you want a different size, color, or model, we can arrange an exchange. Contact us within 7 days of receiving your order.',
  },

  // Products
  {
    category: 'Products',
    question: 'Are all products brand new?',
    answer: 'Yes, all products sold on VENTECH are 100% brand new, authentic, and come with manufacturer warranties where applicable.',
  },
  {
    category: 'Products',
    question: 'Do products come with warranty?',
    answer: 'Yes! Most products come with manufacturer warranties ranging from 3 months to 2 years depending on the product. Extended warranties are available for select items.',
  },
  {
    category: 'Products',
    question: 'What if I receive a defective product?',
    answer: 'If you receive a defective or damaged product, contact us immediately within 48 hours. We\'ll arrange a replacement or full refund at no extra cost.',
  },
  {
    category: 'Products',
    question: 'Can I request a product not listed on your site?',
    answer: 'Absolutely! Contact us with your request, and we\'ll do our best to source it for you. We have access to a wide network of suppliers.',
  },

  // Account & Security
  {
    category: 'Account & Security',
    question: 'How do I create an account?',
    answer: 'Click "Register" in the navigation menu, fill in your details (name, email, phone, password), verify your email, and you\'re all set!',
  },
  {
    category: 'Account & Security',
    question: 'I forgot my password. What should I do?',
    answer: 'Click "Forgot Password" on the login page, enter your email, and we\'ll send you a password reset link. Follow the instructions to create a new password.',
  },
  {
    category: 'Account & Security',
    question: 'Is my personal information secure?',
    answer: 'Yes! We use industry-standard encryption (SSL/TLS) to protect your data. See our Privacy Policy for complete details on how we protect your information.',
  },

  // Laptop Banking
  {
    category: 'Laptop Banking',
    question: 'What is VENTECH Laptop Banking?',
    answer: 'Laptop Banking is our investment program where you invest in our laptop trade business and earn monthly returns of 8-9% over 6 months. Your investment helps us bulk-purchase laptops for resale.',
  },
  {
    category: 'Laptop Banking',
    question: 'How do I start investing?',
    answer: 'Visit our Laptop Banking page, choose your investment tier (starting from GHS 2,500), fill out the application form, and our team will contact you with the investment agreement.',
  },
  {
    category: 'Laptop Banking',
    question: 'Is Laptop Banking safe?',
    answer: 'Your investment is backed by real inventory and trade. We provide monthly returns with proof of payment. However, like any investment, returns are subject to market conditions.',
  },
  {
    category: 'Laptop Banking',
    question: 'What are Premium Stars?',
    answer: 'Premium Stars allow investors to purchase up to 5 gadgets at supplier pricing (below retail). You get 5 stars with every investment, redeemable within your 6-month investment period.',
  },
];

export default function FAQPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('All');

  const categories = ['All', ...Array.from(new Set(faqs.map(faq => faq.category)))];

  const filteredFaqs = activeCategory === 'All' 
    ? faqs 
    : faqs.filter(faq => faq.category === activeCategory);

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4 max-w-5xl">
        {/* Header */}
        <div className="text-center mb-12">
          <Link href="/" className="text-sm text-[#FF7A19] hover:underline mb-4 inline-block">
            ← Back to Home
          </Link>
          <h1 className="text-4xl md:text-5xl font-bold text-[#1A1A1A] mb-4">
            Frequently Asked Questions
          </h1>
          <p className="text-lg text-[#3A3A3A] max-w-2xl mx-auto">
            Find answers to common questions about shopping, shipping, returns, and more.
          </p>
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap gap-2 mb-8 justify-center">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                activeCategory === category
                  ? 'bg-[#FF7A19] text-white'
                  : 'bg-white text-[#3A3A3A] hover:bg-gray-100'
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* FAQ Accordion */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-12">
          {filteredFaqs.map((faq, index) => (
            <div key={index} className="border-b border-gray-200 last:border-b-0">
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full px-6 py-5 flex items-center justify-between hover:bg-gray-50 transition-colors text-left"
              >
                <div className="flex-1">
                  <span className="text-xs font-semibold text-[#FF7A19] uppercase tracking-wide">
                    {faq.category}
                  </span>
                  <h3 className="text-lg font-semibold text-[#1A1A1A] mt-1">
                    {faq.question}
                  </h3>
                </div>
                <ChevronDown
                  className={`w-5 h-5 text-[#3A3A3A] transition-transform flex-shrink-0 ml-4 ${
                    openIndex === index ? 'transform rotate-180' : ''
                  }`}
                />
              </button>
              {openIndex === index && (
                <div className="px-6 pb-5">
                  <p className="text-[#3A3A3A] leading-relaxed">{faq.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Still Have Questions */}
        <div className="bg-gradient-to-r from-[#FF7A19] to-orange-600 rounded-xl p-8 md:p-12 text-white text-center">
          <MessageCircle className="w-12 h-12 mx-auto mb-4" />
          <h2 className="text-3xl font-bold mb-4">Still have questions?</h2>
          <p className="text-lg mb-6 opacity-90">
            Our customer support team is here to help!
          </p>
          <div className="grid md:grid-cols-3 gap-6 max-w-3xl mx-auto">
            <a
              href="mailto:ventechgadgets@gmail.com"
              className="bg-white text-[#FF7A19] px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors flex items-center justify-center gap-2"
            >
              <Mail className="w-5 h-5" />
              Email Us
            </a>
            <a
              href="tel:+233551344310"
              className="bg-white text-[#FF7A19] px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors flex items-center justify-center gap-2"
            >
              <Phone className="w-5 h-5" />
              Call Us
            </a>
            <Link
              href="/contact"
              className="bg-white text-[#FF7A19] px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors flex items-center justify-center gap-2"
            >
              <MapPin className="w-5 h-5" />
              Visit Us
            </Link>
          </div>
        </div>

        {/* Quick Links */}
        <div className="mt-12 grid md:grid-cols-4 gap-4 text-center">
          <Link
            href="/shipping"
            className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow"
          >
            <h3 className="font-semibold text-[#1A1A1A] mb-2">Shipping Info</h3>
            <p className="text-sm text-[#3A3A3A]">Learn about delivery</p>
          </Link>
          <Link
            href="/returns"
            className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow"
          >
            <h3 className="font-semibold text-[#1A1A1A] mb-2">Returns</h3>
            <p className="text-sm text-[#3A3A3A]">Return policy details</p>
          </Link>
          <Link
            href="/terms"
            className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow"
          >
            <h3 className="font-semibold text-[#1A1A1A] mb-2">Terms</h3>
            <p className="text-sm text-[#3A3A3A]">Terms of service</p>
          </Link>
          <Link
            href="/privacy"
            className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow"
          >
            <h3 className="font-semibold text-[#1A1A1A] mb-2">Privacy</h3>
            <p className="text-sm text-[#3A3A3A]">Privacy policy</p>
          </Link>
        </div>
      </div>
    </div>
  );
}



