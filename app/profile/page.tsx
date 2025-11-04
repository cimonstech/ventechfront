'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  User, 
  MapPin, 
  CreditCard, 
  Bell, 
  Shield, 
  Package,
  Heart,
  LogOut 
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { authService } from '@/services/auth.service';
import { useAppDispatch } from '@/store';
import { logout as logoutAction } from '@/store/authSlice';
import toast from 'react-hot-toast';

interface UserProfile {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  date_of_birth: string | null;
  gender: string | null;
  shipping_address: any;
  billing_address: any;
  newsletter_subscribed: boolean;
  sms_notifications: boolean;
  email_notifications: boolean;
}

type TabType = 'personal' | 'shipping' | 'billing' | 'preferences' | 'orders';

export default function ProfilePage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [activeTab, setActiveTab] = useState<TabType>('personal');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    date_of_birth: '',
    gender: '',
    shipping_address: {
      street_address: '',
      city: '',
      region: '',
      postal_code: '',
      country: 'Ghana',
    },
    billing_address: {
      address_line1: '',
      address_line2: '',
      city: '',
      region: '',
      postal_code: '',
      country: 'Ghana',
    },
    sameAsShipping: false,
    newsletter_subscribed: false,
    sms_notifications: true,
    email_notifications: true,
  });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const user = await authService.getUserProfile();
      if (!user) {
        router.push('/login');
        return;
      }
      
      setProfile(user);
      setFormData({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        phone: user.phone || '',
        date_of_birth: user.date_of_birth || '',
        gender: user.gender || '',
        shipping_address: user.shipping_address ? {
          street_address: user.shipping_address.street_address || user.shipping_address.address_line1 || '',
          city: user.shipping_address.city || '',
          region: user.shipping_address.region || '',
          postal_code: user.shipping_address.postal_code || '',
          country: user.shipping_address.country || 'Ghana',
        } : {
          street_address: '',
          city: '',
          region: '',
          postal_code: '',
          country: 'Ghana',
        },
        billing_address: user.billing_address || {
          address_line1: '',
          address_line2: '',
          city: '',
          region: '',
          postal_code: '',
          country: 'Ghana',
        },
        sameAsShipping: false,
        newsletter_subscribed: user.newsletter_subscribed || false,
        sms_notifications: user.sms_notifications ?? true,
        email_notifications: user.email_notifications ?? true,
      });
    } catch (error) {
      console.error('Error loading profile:', error);
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updateData = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        phone: formData.phone,
        date_of_birth: formData.date_of_birth || null,
        gender: formData.gender || null,
        shipping_address: formData.shipping_address,
        billing_address: formData.sameAsShipping ? formData.shipping_address : formData.billing_address,
        newsletter_subscribed: formData.newsletter_subscribed,
        sms_notifications: formData.sms_notifications,
        email_notifications: formData.email_notifications,
      };

      const result = await authService.updateUserProfile(updateData);
      
      if (result.error) {
        throw result.error;
      }

      toast.success('Profile updated successfully!');
      await loadProfile();
    } catch (error) {
      console.error('Error saving profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    try {
      // Clear Redux state first
      dispatch(logoutAction());
      
      // Then sign out from Supabase
      await authService.signOut();
      
      toast.success('Logged out successfully');
      router.push('/');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Failed to logout');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF7A19] mx-auto mb-4"></div>
          <p className="text-[#3A3A3A]">Loading profile...</p>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'personal', label: 'Personal Info', icon: User },
    { id: 'shipping', label: 'Shipping Address', icon: MapPin },
    { id: 'billing', label: 'Billing Address', icon: CreditCard },
    { id: 'preferences', label: 'Preferences', icon: Bell },
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#1A1A1A] mb-2">My Profile</h1>
          <p className="text-[#3A3A3A]">Manage your account settings and preferences</p>
        </div>

        <div className="grid lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
              <div className="text-center mb-6">
                <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <User className="w-10 h-10 text-[#FF7A19]" />
                </div>
                <h2 className="font-bold text-lg text-[#1A1A1A]">
                  {formData.first_name} {formData.last_name}
                </h2>
                <p className="text-sm text-[#3A3A3A]">{profile?.email}</p>
              </div>
              
              <nav className="space-y-2">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as TabType)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                        activeTab === tab.id
                          ? 'bg-[#FF7A19] text-white'
                          : 'text-[#3A3A3A] hover:bg-gray-100'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="text-sm font-medium">{tab.label}</span>
                    </button>
                  );
                })}
              </nav>

              <button
                onClick={handleSignOut}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left text-red-600 hover:bg-red-50 transition-colors mt-4"
              >
                <LogOut className="w-5 h-5" />
                <span className="text-sm font-medium">Sign Out</span>
              </button>
            </div>

            {/* Quick Stats */}
            <div className="bg-white rounded-xl shadow-lg p-6 hidden lg:block">
              <h3 className="font-bold text-sm text-[#1A1A1A] mb-4">Quick Stats</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#3A3A3A]">Orders</span>
                  <span className="font-semibold text-sm text-[#1A1A1A]">0</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#3A3A3A]">Wishlist</span>
                  <span className="font-semibold text-sm text-[#1A1A1A]">0</span>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-xl shadow-lg p-8">
              {/* Personal Info Tab */}
              {activeTab === 'personal' && (
                <div>
                  <h2 className="text-2xl font-bold text-[#1A1A1A] mb-6">Personal Information</h2>
                  <div className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-[#1A1A1A] mb-2">
                          First Name *
                        </label>
                        <input
                          type="text"
                          value={formData.first_name}
                          onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF7A19] text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-[#1A1A1A] mb-2">
                          Last Name *
                        </label>
                        <input
                          type="text"
                          value={formData.last_name}
                          onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF7A19] text-sm"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-[#1A1A1A] mb-2">
                        Email
                      </label>
                      <input
                        type="email"
                        value={profile?.email}
                        disabled
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-100 text-sm text-[#3A3A3A]"
                      />
                      <p className="text-xs text-[#3A3A3A] mt-1">Email cannot be changed</p>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-[#1A1A1A] mb-2">
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="+233 XX XXX XXXX"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF7A19] text-sm"
                      />
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-[#1A1A1A] mb-2">
                          Date of Birth
                        </label>
                        <input
                          type="date"
                          value={formData.date_of_birth}
                          onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF7A19] text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-[#1A1A1A] mb-2">
                          Gender
                        </label>
                        <select
                          value={formData.gender}
                          onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF7A19] text-sm"
                        >
                          <option value="">Select gender</option>
                          <option value="male">Male</option>
                          <option value="female">Female</option>
                          <option value="other">Other</option>
                          <option value="prefer_not_to_say">Prefer not to say</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Shipping Address Tab */}
              {activeTab === 'shipping' && (
                <div>
                  <h2 className="text-2xl font-bold text-[#1A1A1A] mb-6">Shipping Address</h2>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-[#1A1A1A] mb-2">
                        Street Address *
                      </label>
                      <input
                        type="text"
                        value={formData.shipping_address.street_address}
                        onChange={(e) => setFormData({
                          ...formData,
                          shipping_address: { ...formData.shipping_address, street_address: e.target.value }
                        })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF7A19] text-sm"
                        required
                      />
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-[#1A1A1A] mb-2">
                          City *
                        </label>
                        <input
                          type="text"
                          value={formData.shipping_address.city}
                          onChange={(e) => setFormData({
                            ...formData,
                            shipping_address: { ...formData.shipping_address, city: e.target.value }
                          })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF7A19] text-sm"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-[#1A1A1A] mb-2">
                          Region *
                        </label>
                        <input
                          type="text"
                          value={formData.shipping_address.region}
                          onChange={(e) => setFormData({
                            ...formData,
                            shipping_address: { ...formData.shipping_address, region: e.target.value }
                          })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF7A19] text-sm"
                          required
                        />
                      </div>
                    </div>

                      <div>
                        <label className="block text-sm font-semibold text-[#1A1A1A] mb-2">
                          Postal Code
                        </label>
                        <input
                          type="text"
                          value={formData.shipping_address.postal_code}
                          onChange={(e) => setFormData({
                            ...formData,
                            shipping_address: { ...formData.shipping_address, postal_code: e.target.value }
                          })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF7A19] text-sm"
                        />
                    </div>
                  </div>
                </div>
              )}

              {/* Billing Address Tab */}
              {activeTab === 'billing' && (
                <div>
                  <h2 className="text-2xl font-bold text-[#1A1A1A] mb-6">Billing Address</h2>
                  
                  <div className="mb-6">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.sameAsShipping}
                        onChange={(e) => setFormData({ ...formData, sameAsShipping: e.target.checked })}
                        className="w-5 h-5 text-[#FF7A19] border-gray-300 rounded focus:ring-[#FF7A19]"
                      />
                      <span className="text-sm text-[#3A3A3A]">Same as shipping address</span>
                    </label>
                  </div>

                  {!formData.sameAsShipping && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-semibold text-[#1A1A1A] mb-2">
                          Address Line 1 *
                        </label>
                        <input
                          type="text"
                          value={formData.billing_address.address_line1}
                          onChange={(e) => setFormData({
                            ...formData,
                            billing_address: { ...formData.billing_address, address_line1: e.target.value }
                          })}
                          placeholder="Street address, P.O. box, company name"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF7A19] text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-[#1A1A1A] mb-2">
                          Address Line 2
                        </label>
                        <input
                          type="text"
                          value={formData.billing_address.address_line2}
                          onChange={(e) => setFormData({
                            ...formData,
                            billing_address: { ...formData.billing_address, address_line2: e.target.value }
                          })}
                          placeholder="Apartment, suite, unit, building, floor, etc."
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF7A19] text-sm"
                        />
                      </div>

                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-semibold text-[#1A1A1A] mb-2">
                            City *
                          </label>
                          <input
                            type="text"
                            value={formData.billing_address.city}
                            onChange={(e) => setFormData({
                              ...formData,
                              billing_address: { ...formData.billing_address, city: e.target.value }
                            })}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF7A19] text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-[#1A1A1A] mb-2">
                            Region *
                          </label>
                          <select
                            value={formData.billing_address.region}
                            onChange={(e) => setFormData({
                              ...formData,
                              billing_address: { ...formData.billing_address, region: e.target.value }
                            })}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF7A19] text-sm"
                          >
                            <option value="">Select region</option>
                            <option value="Greater Accra">Greater Accra</option>
                            <option value="Ashanti">Ashanti</option>
                            <option value="Central">Central</option>
                            <option value="Eastern">Eastern</option>
                            <option value="Northern">Northern</option>
                            <option value="Volta">Volta</option>
                            <option value="Western">Western</option>
                            <option value="Upper East">Upper East</option>
                            <option value="Upper West">Upper West</option>
                            <option value="Brong-Ahafo">Brong-Ahafo</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-semibold text-[#1A1A1A] mb-2">
                            Postal Code
                          </label>
                          <input
                            type="text"
                            value={formData.billing_address.postal_code}
                            onChange={(e) => setFormData({
                              ...formData,
                              billing_address: { ...formData.billing_address, postal_code: e.target.value }
                            })}
                            placeholder="GA-XXX-XXXX"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF7A19] text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-[#1A1A1A] mb-2">
                            Country *
                          </label>
                          <input
                            type="text"
                            value={formData.billing_address.country}
                            disabled
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-100 text-sm text-[#3A3A3A]"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Preferences Tab */}
              {activeTab === 'preferences' && (
                <div>
                  <h2 className="text-2xl font-bold text-[#1A1A1A] mb-6">Communication Preferences</h2>
                  <div className="space-y-6">
                    <div className="bg-gray-50 rounded-lg p-6">
                      <div className="flex items-start gap-4">
                        <input
                          type="checkbox"
                          checked={formData.email_notifications}
                          onChange={(e) => setFormData({ ...formData, email_notifications: e.target.checked })}
                          className="w-5 h-5 text-[#FF7A19] border-gray-300 rounded focus:ring-[#FF7A19] mt-1"
                        />
                        <div>
                          <h3 className="font-semibold text-[#1A1A1A] mb-1">Email Notifications</h3>
                          <p className="text-sm text-[#3A3A3A]">
                            Receive order updates, shipping confirmations, and account notifications via email
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-6">
                      <div className="flex items-start gap-4">
                        <input
                          type="checkbox"
                          checked={formData.sms_notifications}
                          onChange={(e) => setFormData({ ...formData, sms_notifications: e.target.checked })}
                          className="w-5 h-5 text-[#FF7A19] border-gray-300 rounded focus:ring-[#FF7A19] mt-1"
                        />
                        <div>
                          <h3 className="font-semibold text-[#1A1A1A] mb-1">SMS Notifications</h3>
                          <p className="text-sm text-[#3A3A3A]">
                            Get important order and delivery updates via SMS
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-6">
                      <div className="flex items-start gap-4">
                        <input
                          type="checkbox"
                          checked={formData.newsletter_subscribed}
                          onChange={(e) => setFormData({ ...formData, newsletter_subscribed: e.target.checked })}
                          className="w-5 h-5 text-[#FF7A19] border-gray-300 rounded focus:ring-[#FF7A19] mt-1"
                        />
                        <div>
                          <h3 className="font-semibold text-[#1A1A1A] mb-1">Newsletter Subscription</h3>
                          <p className="text-sm text-[#3A3A3A]">
                            Receive exclusive deals, new product announcements, and tech tips
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Save Button */}
              <div className="mt-8 pt-6 border-t border-gray-200">
                <div className="flex gap-4 justify-end">
                  <Button
                    variant="ghost"
                    onClick={loadProfile}
                    disabled={saving}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    onClick={handleSave}
                    disabled={saving}
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

