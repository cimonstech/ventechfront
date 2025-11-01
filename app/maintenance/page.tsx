'use client';

import { useEffect, useState } from 'react';
import { Settings, Wrench } from 'lucide-react';
import { settingsService } from '@/lib/settings.service';
import Link from 'next/link';

export default function MaintenancePage() {
  const [maintenanceMessage, setMaintenanceMessage] = useState('We are currently performing scheduled maintenance. Please check back soon!');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMaintenanceMessage = async () => {
      try {
        const message = await settingsService.getSetting('maintenance_message');
        if (message) {
          setMaintenanceMessage(message);
        }
      } catch (error) {
        console.error('Error fetching maintenance message:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMaintenanceMessage();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1A1A1A] via-[#2A2A2A] to-[#1A1A1A] flex items-center justify-center px-4">
      <div className="max-w-2xl w-full text-center">
        <div className="mb-8 flex justify-center">
          <div className="relative">
            <div className="absolute inset-0 bg-[#FF7A19] rounded-full blur-2xl opacity-20 animate-pulse"></div>
            <div className="relative bg-[#1A1A1A] border-2 border-[#FF7A19] rounded-full p-8">
              <Wrench size={64} className="text-[#FF7A19]" />
            </div>
          </div>
        </div>

        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
          We&apos;ll Be Back Soon!
        </h1>

        <p className="text-xl text-gray-300 mb-8 leading-relaxed">
          {loading ? 'Loading...' : maintenanceMessage}
        </p>

        <div className="bg-[#2A2A2A] border border-gray-700 rounded-xl p-6 mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Settings className="text-[#FF7A19]" size={24} />
            <h2 className="text-lg font-semibold text-white">System Maintenance</h2>
          </div>
          <p className="text-gray-400 text-sm mb-4">
            Our team is working hard to improve your experience. We apologize for any inconvenience.
          </p>
          <div className="flex flex-wrap justify-center gap-4 text-sm text-gray-500">
            <div>
              <strong className="text-gray-300">Expected Duration:</strong> Varies
            </div>
            <div>
              <strong className="text-gray-300">Status:</strong> In Progress
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <p className="text-gray-400 text-sm">
            If you need immediate assistance, please contact us:
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="mailto:ventechgadgets@gmail.com"
              className="px-6 py-3 bg-[#FF7A19] hover:bg-[#FF8A29] text-white rounded-lg font-medium transition-colors"
            >
              Email Support
            </Link>
            <Link
              href="tel:+233551344310"
              className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
            >
              Call Us
            </Link>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-700">
          <p className="text-gray-500 text-sm">
            &copy; {new Date().getFullYear()} VENTECH. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}

