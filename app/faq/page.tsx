import Link from 'next/link';
import { Mail, Phone, MapPin, MessageCircle } from 'lucide-react';
import { FaqBrowser } from '@/components/content/FaqBrowser';
import { ContentUnavailable } from '@/components/content/ContentUnavailable';
import { fetchPublicFaqs, getStoreContact } from '@/lib/publicContent';

export default async function FAQPage() {
  const [categories, contact] = await Promise.all([fetchPublicFaqs(), getStoreContact()]);

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto max-w-5xl px-4">
        <div className="mb-12 text-center">
          <Link href="/" className="mb-4 inline-block text-sm text-[#FF7A19] hover:underline">
            ← Back to Home
          </Link>
          <h1 className="mb-4 text-4xl font-bold text-[#1A1A1A] md:text-5xl">
            Frequently Asked Questions
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-[#3A3A3A]">
            Find answers to common questions about shopping, shipping, returns, and more.
          </p>
        </div>

        {categories ? (
          <FaqBrowser categories={categories} />
        ) : (
          <div className="mb-12">
            <ContentUnavailable
              message="We couldn't load the questions right now."
              contact={contact}
            />
          </div>
        )}

        <div className="rounded-xl bg-gradient-to-r from-[#FF7A19] to-orange-600 p-8 text-center text-white md:p-12">
          <MessageCircle className="mx-auto mb-4 h-12 w-12" />
          <h2 className="mb-4 text-3xl font-bold">Still have questions?</h2>
          <p className="mb-6 text-lg opacity-90">
            Our customer support team is here to help!
          </p>
          <div className="mx-auto grid max-w-3xl gap-6 md:grid-cols-3">
            <a
              href={`mailto:${contact.email}`}
              className="flex items-center justify-center gap-2 rounded-lg bg-white px-6 py-3 font-semibold text-[#FF7A19] transition-colors hover:bg-gray-100"
            >
              <Mail className="h-5 w-5" />
              Email Us
            </a>
            <a
              href={`tel:${contact.phone.replace(/\s/g, '')}`}
              className="flex items-center justify-center gap-2 rounded-lg bg-white px-6 py-3 font-semibold text-[#FF7A19] transition-colors hover:bg-gray-100"
            >
              <Phone className="h-5 w-5" />
              Call Us
            </a>
            <Link
              href="/contact"
              className="flex items-center justify-center gap-2 rounded-lg bg-white px-6 py-3 font-semibold text-[#FF7A19] transition-colors hover:bg-gray-100"
            >
              <MapPin className="h-5 w-5" />
              Visit Us
            </Link>
          </div>
        </div>

        <div className="mt-12 grid gap-4 text-center md:grid-cols-4">
          <Link href="/shipping" className="rounded-lg bg-white p-6 shadow transition-shadow hover:shadow-lg">
            <h3 className="mb-2 font-semibold text-[#1A1A1A]">Shipping Info</h3>
            <p className="text-sm text-[#3A3A3A]">Learn about delivery</p>
          </Link>
          <Link href="/returns" className="rounded-lg bg-white p-6 shadow transition-shadow hover:shadow-lg">
            <h3 className="mb-2 font-semibold text-[#1A1A1A]">Returns</h3>
            <p className="text-sm text-[#3A3A3A]">Return policy details</p>
          </Link>
          <Link href="/terms" className="rounded-lg bg-white p-6 shadow transition-shadow hover:shadow-lg">
            <h3 className="mb-2 font-semibold text-[#1A1A1A]">Terms</h3>
            <p className="text-sm text-[#3A3A3A]">Terms of service</p>
          </Link>
          <Link href="/privacy" className="rounded-lg bg-white p-6 shadow transition-shadow hover:shadow-lg">
            <h3 className="mb-2 font-semibold text-[#1A1A1A]">Privacy</h3>
            <p className="text-sm text-[#3A3A3A]">Privacy policy</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
