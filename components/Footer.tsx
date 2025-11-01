'use client';

import { useEffect, useState } from 'react';
import { settingsService } from '@/lib/settings.service';
import Link from 'next/link';

export function Footer() {
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
          console.error('Error fetching settings for footer:', error);
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

  const storeName = settings.store_name || 'VENTECH';
  const storeTagline = settings.store_tagline || 'Your trusted tech partner in Ghana';
  const storePhone = settings.store_phone || '+233 55 134 4310';
  const storeEmail = settings.store_email || 'ventechgadgets@gmail.com';
  const addressHo = settings.store_address_ho || '';
  const addressAccra = settings.store_address_accra || '';
  const facebookUrl = settings.store_facebook_url || '';
  const twitterUrl = settings.store_twitter_url || '';
  const instagramUrl = settings.store_instagram_url || '';
  const linkedinUrl = settings.store_linkedin_url || '';
  const whatsappNumber = settings.store_whatsapp_number || '';

  if (loading) {
    return null; // Don't show footer while loading
  }

  return (
    <footer className="bg-[#1A1A1A] text-white py-6 sm:py-8 mt-12 sm:mt-16 border-t border-gray-800">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 mb-6">
          {/* Store Info */}
          <div>
            <h3 className="font-bold text-lg mb-3 text-[#FF7A19]">{storeName}</h3>
            <p className="text-sm text-gray-400 mb-4">{storeTagline}</p>
            <div className="space-y-2 text-sm text-gray-400">
              {storePhone && (
                <a href={`tel:${storePhone.replace(/\s/g, '')}`} className="block hover:text-[#FF7A19] transition-colors">
                  {storePhone}
                </a>
              )}
              {storeEmail && (
                <a href={`mailto:${storeEmail}`} className="block hover:text-[#FF7A19] transition-colors">
                  {storeEmail}
                </a>
              )}
              {(addressHo || addressAccra) && (
                <div className="mt-2">
                  {addressHo && <p className="mb-1">{addressHo}</p>}
                  {addressAccra && <p>{addressAccra}</p>}
                </div>
              )}
            </div>
          </div>

          {/* Shop */}
          <div>
            <h4 className="font-semibold text-sm mb-3">Shop</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li>
                <Link href="/categories" className="hover:text-[#FF7A19] transition-colors">
                  All Products
                </Link>
              </li>
              <li>
                <Link href="/deals" className="hover:text-[#FF7A19] transition-colors">
                  Deals
                </Link>
              </li>
              <li>
                <Link href="/categories" className="hover:text-[#FF7A19] transition-colors">
                  Categories
                </Link>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="font-semibold text-sm mb-3">Support</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li>
                <Link href="/contact" className="hover:text-[#FF7A19] transition-colors">
                  Contact Us
                </Link>
              </li>
              <li>
                <Link href="/faq" className="hover:text-[#FF7A19] transition-colors">
                  FAQ
                </Link>
              </li>
              <li>
                <Link href="/shipping" className="hover:text-[#FF7A19] transition-colors">
                  Shipping Info
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal & Social */}
          <div>
            <h4 className="font-semibold text-sm mb-3">Legal</h4>
            <ul className="space-y-2 text-sm text-gray-400 mb-4">
              <li>
                <Link href="/privacy" className="hover:text-[#FF7A19] transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-[#FF7A19] transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/returns" className="hover:text-[#FF7A19] transition-colors">
                  Returns
                </Link>
              </li>
            </ul>

            {/* Social Media Links */}
            {(facebookUrl || twitterUrl || instagramUrl || linkedinUrl || whatsappNumber) && (
              <div className="mt-4">
                <h4 className="font-semibold text-sm mb-3">Follow Us</h4>
                <div className="flex gap-3">
                  {facebookUrl && (
                    <a href={facebookUrl} target="_blank" rel="noopener noreferrer" className="hover:text-[#FF7A19] transition-colors">
                      Facebook
                    </a>
                  )}
                  {twitterUrl && (
                    <a href={twitterUrl} target="_blank" rel="noopener noreferrer" className="hover:text-[#FF7A19] transition-colors">
                      Twitter
                    </a>
                  )}
                  {instagramUrl && (
                    <a href={instagramUrl} target="_blank" rel="noopener noreferrer" className="hover:text-[#FF7A19] transition-colors">
                      Instagram
                    </a>
                  )}
                  {linkedinUrl && (
                    <a href={linkedinUrl} target="_blank" rel="noopener noreferrer" className="hover:text-[#FF7A19] transition-colors">
                      LinkedIn
                    </a>
                  )}
                  {whatsappNumber && (
                    <a href={`https://wa.me/${whatsappNumber.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="hover:text-[#FF7A19] transition-colors">
                      WhatsApp
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-gray-800 pt-6 text-center">
          <p className="text-sm text-gray-400">
            &copy; {new Date().getFullYear()} {storeName}. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

