'use client';

import React, { useState, useEffect } from 'react';
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

export default function ContactPage() {
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
      <section className="bg-gradient-to-r from-[#FF7A19] to-[#FF9A19] py-16">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-3xl md:text-4xl font-bold mb-4 text-white">Get in Touch</h1>
          <p className="text-lg text-white/90 max-w-2xl mx-auto">
            Have questions? We're here to help. Reach out to us anytime!
          </p>
        </div>
      </section>

      {/* Contact Info & Form */}
      <section className="container mx-auto px-4 py-16">
        <div className="grid md:grid-cols-5 gap-8 max-w-6xl mx-auto">
          {/* Contact Information */}
          <div className="md:col-span-2 space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-[#1A1A1A] mb-6">Contact Information</h2>
              <p className="text-[#3A3A3A] text-sm mb-8">
                Feel free to reach out through any of these channels. We typically respond within 24 hours.
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                    <Phone className="text-[#FF7A19]" size={20} />
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-[#1A1A1A] mb-1">Phone</h3>
                  <a href={`tel:${storePhone.replace(/\s/g, '')}`} className="text-[#3A3A3A] text-sm hover:text-[#FF7A19] transition-colors">
                    {storePhone}
                  </a>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                    <Mail className="text-[#FF7A19]" size={20} />
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-[#1A1A1A] mb-1">Email</h3>
                  <a href={`mailto:${storeEmail}`} className="text-[#3A3A3A] text-sm hover:text-[#FF7A19] transition-colors">
                    {storeEmail}
                  </a>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                    <MapPin className="text-[#FF7A19]" size={20} />
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-[#1A1A1A] mb-1">Address</h3>
                  <p className="text-[#3A3A3A] text-sm">
                    {addressHo && <>{addressHo}<br /></>}
                    {addressAccra && <>{addressAccra}<br /></>}
                    {!addressHo && !addressAccra && 'Ghana'}
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                    <Clock className="text-[#FF7A19]" size={20} />
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-[#1A1A1A] mb-1">Business Hours</h3>
                  <p className="text-[#3A3A3A] text-sm">{businessHours}</p>
                </div>
              </div>
            </div>

            {/* Quick Support */}
            <div className="bg-gray-50 rounded-xl p-6 mt-8">
              <div className="flex items-center gap-3 mb-3">
                <Headphones className="text-[#FF7A19]" size={24} />
                <h3 className="font-bold text-[#1A1A1A]">Need Immediate Help?</h3>
              </div>
              <p className="text-sm text-[#3A3A3A] mb-4">
                Our customer support team is available to assist you with any questions or concerns.
              </p>
              <Button variant="primary" size="sm" className="w-full">
                <MessageSquare size={16} />
                Start Live Chat
              </Button>
            </div>
          </div>

          {/* Contact Form */}
          <div className="md:col-span-3">
            <div className="bg-gray-50 rounded-xl p-8">
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
        </div>
      </section>

      {/* Map Section (Optional - can be added later) */}
      <section className="bg-gray-100 py-16">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto">
            <MapPin className="mx-auto mb-4 text-[#FF7A19]" size={48} />
            <h2 className="text-2xl font-bold text-[#1A1A1A] mb-3">Visit Our Store</h2>
            <p className="text-[#3A3A3A] text-sm mb-6">
              Come see our products in person. Our friendly staff is ready to help you find exactly what you need.
            </p>
            <Button variant="outline">Get Directions</Button>
          </div>
        </div>
      </section>
    </div>
  );
}


