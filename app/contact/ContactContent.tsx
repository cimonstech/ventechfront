'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/Button';
import { 
  Mail, 
  Phone, 
  MapPin, 
  Clock,
  Send,
  MessageSquare,
  Headphones
} from 'lucide-react';
import toast from 'react-hot-toast';
import { contactService } from '@/services/contact.service';
import { settingsService } from '@/lib/settings.service';

export function ContactContent() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [settings, setSettings] = useState<Record<string, string | null>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const fetchSettings = async () => {
      try {
        const storeSettings = await settingsService.getSettingsByCategory('store');
        if (isMounted) {
          setSettings(storeSettings);
        }
      } catch (error) {
        if (isMounted) {
          console.error('Error fetching settings for contact page:', error);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchSettings();

    return () => {
      isMounted = false;
    };
  }, []);

  const storePhone = settings.store_phone || '+233 55 134 4310';
  const storeEmail = settings.store_email || 'ventechgadgets@gmail.com';
  const addressHo = settings.store_address_ho || '';
  const addressAccra = settings.store_address_accra || '';
  const businessHours = settings.store_business_hours || 'Mon-Sat: 9AM-6PM, Sun: Closed';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const result = await contactService.submitContactForm(formData);
      
      if (result.success) {
        toast.success('Message sent! We\'ll get back to you soon.');
        setFormData({ name: '', email: '', phone: '', subject: '', message: '' });
      } else {
        toast.error(result.error || 'Failed to send message. Please try again.');
      }
    } catch (error) {
      console.error('Contact form error:', error);
      toast.error('Failed to send message. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
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
                src="/contactpageimage.webp"
                alt="Contact VENTECH"
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
          <div className="max-w-2xl md:max-w-3xl mx-auto text-center">
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4 md:mb-6 leading-tight text-white">
              Get in Touch
            </h1>
            <p className="text-lg sm:text-xl md:text-2xl text-white leading-relaxed">
              Have a questions or need assistance? We&apos;re here to help. Reach out us anytime!
            </p>
          </div>
        </div>
      </section>

      {/* Reach Out to Ventech Section */}
      <section className="bg-gray-50 py-12 md:py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center mb-8 md:mb-12">
            <h2 className="text-2xl md:text-3xl font-bold text-[#1A1A1A] mb-3">Reach Out to Ventech</h2>
            <p className="text-[#3A3A3A] text-sm md:text-base">
              Feel free to contact us through any of the options below. We typically respond within 24 hours.
            </p>
          </div>

          {/* Contact Options Cards */}
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto mb-12 md:mb-16">
            {/* Call or WhatsApp */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 border-2 border-[#FF7A19] rounded-lg flex items-center justify-center mb-4 mx-auto">
                <Phone className="text-[#FF7A19]" size={24} />
              </div>
              <h3 className="font-bold text-[#1A1A1A] mb-2 text-center">Call or WhatsApp</h3>
              <a 
                href={`tel:${storePhone.replace(/\s/g, '')}`} 
                className="text-[#3A3A3A] text-sm hover:text-[#FF7A19] transition-colors text-center block"
              >
                {storePhone}
              </a>
            </div>

            {/* Email Us */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 border-2 border-[#FF7A19] rounded-lg flex items-center justify-center mb-4 mx-auto">
                <Mail className="text-[#FF7A19]" size={24} />
              </div>
              <h3 className="font-bold text-[#1A1A1A] mb-2 text-center">Email Us</h3>
              <a 
                href={`mailto:${storeEmail}`} 
                className="text-[#3A3A3A] text-sm hover:text-[#FF7A19] transition-colors text-center block"
              >
                {storeEmail}
              </a>
            </div>

            {/* Visit Our Office */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 border-2 border-[#FF7A19] rounded-lg flex items-center justify-center mb-4 mx-auto">
                <MapPin className="text-[#FF7A19]" size={24} />
              </div>
              <h3 className="font-bold text-[#1A1A1A] mb-2 text-center">Visit Our Office</h3>
              <p className="text-[#3A3A3A] text-sm text-center">
                {addressAccra || addressHo || 'Accra Office: 123 Tech Avenue, Near XYZ Plaza, Accra, Ghana'}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Form Section */}
      <section className="container mx-auto px-4 py-12 md:py-16">
        <div className="max-w-2xl mx-auto">
          <div className="bg-gray-50 rounded-xl p-6 md:p-8">
            <h2 className="text-2xl font-bold text-[#1A1A1A] mb-6">Send us a Message</h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-[#1A1A1A] mb-2">
                  Full Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF7A19] focus:border-transparent text-sm"
                  placeholder="John Doe"
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-[#1A1A1A] mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF7A19] focus:border-transparent text-sm"
                    placeholder="john@example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-[#1A1A1A] mb-2">
                    Phone
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF7A19] focus:border-transparent text-sm"
                    placeholder="+233 55 134 4310"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#1A1A1A] mb-2">
                  Subject *
                </label>
                <select
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF7A19] focus:border-transparent text-sm"
                >
                  <option value="">Select a subject</option>
                  <option value="general">General Inquiry</option>
                  <option value="order">Order Status</option>
                  <option value="product">Product Question</option>
                  <option value="return">Return/Refund</option>
                  <option value="technical">Technical Support</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#1A1A1A] mb-2">
                  Message *
                </label>
                <textarea
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  required
                  rows={6}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF7A19] focus:border-transparent text-sm resize-none"
                  placeholder="Tell us how we can help you..."
                />
              </div>

              <Button 
                type="submit" 
                variant="primary" 
                size="lg" 
                className="w-full"
                icon={<Send size={18} />}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Sending...' : 'Send Message'}
              </Button>
            </form>
          </div>
        </div>
      </section>

      {/* Map Section */}
      <section className="bg-white py-8 md:py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="relative w-full" style={{ height: '400px', minHeight: '400px' }}>
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3970.755622056123!2d-0.1969!3d5.6037!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zNcKwMzYnMTMuMyJOIDDCsDExJzQ4LjgiVw!5e0!3m2!1sen!2sgh!4v1234567890"
                width="100%"
                height="100%"
                style={{ border: 0, borderRadius: '12px' }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="VENTECH Gadgets Location"
              ></iframe>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom Section - Follow & Action Buttons */}
      <section className="relative py-12 md:py-16 overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0 z-0">
          <Image
            src="/contactpage-.webp"
            alt="Contact Background"
            fill
            sizes="100vw"
            className="object-cover"
            priority
          />
        </div>
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <p className="text-base md:text-lg mb-8" style={{ color: '#ffffff' }}>
              Follow @VentechGadgets for the latest deals & updates.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-2xl mx-auto">
              <Button
                variant="primary"
                size="lg"
                icon={<MessageSquare className="w-5 h-5" />}
                className="bg-[#FF7A19] hover:bg-[#e66a0f] text-white border-none"
                onClick={() => window.open('mailto:ventechgadgets@gmail.com', '_blank')}
              >
                Contact Support
              </Button>
              <Button
                variant="secondary"
                size="lg"
                className="bg-[#1A1A1A] hover:bg-[#2D2D2D] text-white border-none"
                onClick={() => window.open(`https://wa.me/${storePhone.replace(/\D/g, '')}`, '_blank')}
              >
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                </svg>
                WhatsApp Us
              </Button>
            </div>
            
            <p className="text-white text-sm mt-8">
              Call/WhatsApp: {storePhone}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

