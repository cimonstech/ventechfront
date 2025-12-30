'use client';

import Link from 'next/link';

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="bg-white rounded-xl shadow-lg p-8 md:p-12">
          {/* Header */}
          <div className="mb-8">
            <Link href="/" className="text-sm text-[#FF7A19] hover:underline mb-4 inline-block">
              ← Back to Home
            </Link>
            <h1 className="text-4xl font-bold text-[#1A1A1A] mb-4">Terms of Service</h1>
            <p className="text-sm text-[#3A3A3A]">Last updated: October 28, 2025</p>
          </div>

          {/* Introduction */}
          <section className="mb-8">
            <p className="text-[#3A3A3A] leading-relaxed mb-4">
              Welcome to VENTECH. By accessing and using our website (ventechgadgets.com) and services, 
              you agree to be bound by these Terms of Service. Please read them carefully.
            </p>
          </section>

          {/* 1. Acceptance of Terms */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-[#1A1A1A] mb-4">1. Acceptance of Terms</h2>
            <p className="text-[#3A3A3A] leading-relaxed mb-3">
              By creating an account, placing an order, or using any part of our service, you acknowledge 
              that you have read, understood, and agree to be bound by these Terms of Service and our Privacy Policy.
            </p>
            <p className="text-[#3A3A3A] leading-relaxed">
              If you do not agree to these terms, please do not use our services.
            </p>
          </section>

          {/* 2. Eligibility */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-[#1A1A1A] mb-4">2. Eligibility</h2>
            <p className="text-[#3A3A3A] leading-relaxed">
              You must be at least 18 years old to use our services. By using VENTECH, you represent and 
              warrant that you meet this age requirement and have the legal capacity to enter into these Terms.
            </p>
          </section>

          {/* 3. Account Registration */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-[#1A1A1A] mb-4">3. Account Registration</h2>
            <ul className="list-disc list-inside space-y-2 text-[#3A3A3A]">
              <li>You must provide accurate and complete information during registration</li>
              <li>You are responsible for maintaining the confidentiality of your account credentials</li>
              <li>You must notify us immediately of any unauthorized access to your account</li>
              <li>You are responsible for all activities that occur under your account</li>
              <li>We reserve the right to suspend or terminate accounts that violate these terms</li>
            </ul>
          </section>

          {/* 4. Products & Services */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-[#1A1A1A] mb-4">4. Products & Services</h2>
            <p className="text-[#3A3A3A] leading-relaxed mb-3">
              <strong>Product Information:</strong> We strive to provide accurate product descriptions, 
              images, and pricing. However, we do not warrant that product descriptions or other content 
              is accurate, complete, reliable, current, or error-free.
            </p>
            <p className="text-[#3A3A3A] leading-relaxed mb-3">
              <strong>Pricing:</strong> All prices are listed in Ghanaian Cedis (GHS) and are subject to 
              change without notice. We reserve the right to modify prices at any time.
            </p>
            <p className="text-[#3A3A3A] leading-relaxed">
              <strong>Availability:</strong> Product availability is subject to stock. We reserve the right 
              to limit quantities or discontinue any product at any time.
            </p>
          </section>

          {/* 5. Orders & Payment */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-[#1A1A1A] mb-4">5. Orders & Payment</h2>
            <p className="text-[#3A3A3A] leading-relaxed mb-3">
              <strong>Order Acceptance:</strong> Your receipt of an order confirmation does not signify our 
              acceptance of your order. We reserve the right to refuse or cancel any order for any reason.
            </p>
            <p className="text-[#3A3A3A] leading-relaxed mb-3">
              <strong>Payment Methods:</strong> We accept Mobile Money (MTN, Vodafone, AirtelTigo), 
              credit/debit cards, and Cash on Delivery (COD) for eligible orders.
            </p>
            <p className="text-[#3A3A3A] leading-relaxed">
              <strong>Payment Security:</strong> All payment transactions are processed securely through 
              our payment partners (Hubtel/Paystack). We do not store your full payment card details.
            </p>
          </section>

          {/* 6. Shipping & Delivery */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-[#1A1A1A] mb-4">6. Shipping & Delivery</h2>
            <ul className="list-disc list-inside space-y-2 text-[#3A3A3A]">
              <li>Delivery times are estimates and not guaranteed</li>
              <li>We ship to addresses within Ghana (Accra, Ho, and other regions)</li>
              <li>Free delivery available for orders over GHS 20,000</li>
              <li>You are responsible for providing accurate delivery information</li>
              <li>Risk of loss passes to you upon delivery to the carrier</li>
            </ul>
          </section>

          {/* 7. Returns & Refunds */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-[#1A1A1A] mb-4">7. Returns & Refunds</h2>
            <p className="text-[#3A3A3A] leading-relaxed mb-3">
              We offer a 7-day return policy for most products. Please see our{' '}
              <Link href="/returns" className="text-[#FF7A19] hover:underline">
                Returns Policy
              </Link>{' '}
              for detailed information.
            </p>
            <p className="text-[#3A3A3A] leading-relaxed">
              Items must be unused, in original packaging, and in resalable condition to be eligible for return.
            </p>
          </section>

          {/* 8. Laptop Banking */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-[#1A1A1A] mb-4">8. VENTECH Laptop Banking</h2>
            <p className="text-[#3A3A3A] leading-relaxed mb-3">
              Our Laptop Banking investment program is subject to separate terms and conditions provided 
              during the application process. By investing, you acknowledge:
            </p>
            <ul className="list-disc list-inside space-y-2 text-[#3A3A3A]">
              <li>Investment returns are subject to market conditions</li>
              <li>Terms are 6 months (3 + 3) with early exit options</li>
              <li>Premium membership benefits are non-transferable</li>
              <li>Referral bonuses are subject to verification</li>
            </ul>
          </section>

          {/* 9. Intellectual Property */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-[#1A1A1A] mb-4">9. Intellectual Property</h2>
            <p className="text-[#3A3A3A] leading-relaxed">
              All content on VENTECH, including logos, text, graphics, images, and software, is the property 
              of VENTECH or its licensors and is protected by Ghanaian and international copyright laws. 
              You may not reproduce, distribute, or create derivative works without our express permission.
            </p>
          </section>

          {/* 10. Limitation of Liability */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-[#1A1A1A] mb-4">10. Limitation of Liability</h2>
            <p className="text-[#3A3A3A] leading-relaxed">
              To the fullest extent permitted by law, VENTECH shall not be liable for any indirect, 
              incidental, special, consequential, or punitive damages arising from your use of our services.
            </p>
          </section>

          {/* 11. Warranty Disclaimer */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-[#1A1A1A] mb-4">11. Warranty Disclaimer</h2>
            <p className="text-[#3A3A3A] leading-relaxed">
              Our services and products are provided "as is" without warranties of any kind. While we provide 
              manufacturer warranties where applicable, we make no additional warranties regarding product 
              performance or fitness for a particular purpose.
            </p>
          </section>

          {/* 12. Governing Law */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-[#1A1A1A] mb-4">12. Governing Law</h2>
            <p className="text-[#3A3A3A] leading-relaxed">
              These Terms of Service shall be governed by and construed in accordance with the laws of Ghana. 
              Any disputes arising under these terms shall be subject to the exclusive jurisdiction of the 
              courts of Ghana.
            </p>
          </section>

          {/* 13. Changes to Terms */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-[#1A1A1A] mb-4">13. Changes to Terms</h2>
            <p className="text-[#3A3A3A] leading-relaxed">
              We reserve the right to modify these Terms of Service at any time. We will notify users of 
              material changes via email or website notification. Your continued use of our services after 
              changes constitutes acceptance of the modified terms.
            </p>
          </section>

          {/* Contact */}
          <section className="mb-8 bg-orange-50 border border-orange-200 rounded-lg p-6">
            <h2 className="text-xl font-bold text-[#1A1A1A] mb-4">Contact Us</h2>
            <p className="text-[#3A3A3A] leading-relaxed mb-3">
              If you have any questions about these Terms of Service, please contact us:
            </p>
            <ul className="space-y-2 text-[#3A3A3A]">
              <li><strong>Email:</strong> ventechgadgets@gmail.com</li>
              <li><strong>Phone:</strong> +233 55 134 4310</li>
              <li><strong>Address:</strong> Ho Civic Center Shop #22, Ho, Ghana</li>
              <li><strong>Address:</strong> Accra, Ghana</li>
            </ul>
          </section>

          {/* Footer */}
          <div className="pt-8 border-t border-gray-200">
            <p className="text-sm text-[#3A3A3A] text-center">
              © 2025 VENTECH. All rights reserved. |{' '}
              <Link href="/privacy" className="text-[#FF7A19] hover:underline">
                Privacy Policy
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

