'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, CreditCard, MapPin, User } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { authService } from '@/services/auth.service';
import toast from 'react-hot-toast';

interface UserProfile {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  date_of_birth: string | null;
  gender: string | null;
  shipping_address: Record<string, string> | null;
  billing_address: Record<string, string> | null;
  newsletter_subscribed: boolean;
  sms_notifications: boolean;
  email_notifications: boolean;
}

interface ShippingAddress {
  street_address: string;
  city: string;
  region: string;
  postal_code: string;
  country: string;
}

interface BillingAddress {
  address_line1: string;
  address_line2: string;
  city: string;
  region: string;
  postal_code: string;
  country: string;
}

interface ProfileForm {
  first_name: string;
  last_name: string;
  phone: string;
  date_of_birth: string;
  gender: string;
  shipping_address: ShippingAddress;
  billing_address: BillingAddress;
  sameAsShipping: boolean;
  newsletter_subscribed: boolean;
  sms_notifications: boolean;
  email_notifications: boolean;
}

const GHANA_REGIONS = [
  'Greater Accra',
  'Ashanti',
  'Central',
  'Eastern',
  'Western',
  'Western North',
  'Volta',
  'Oti',
  'Northern',
  'Savannah',
  'North East',
  'Upper East',
  'Upper West',
  'Bono',
  'Bono East',
  'Ahafo',
  'Brong-Ahafo',
];

const EMPTY_SHIPPING: ShippingAddress = {
  street_address: '',
  city: '',
  region: '',
  postal_code: '',
  country: 'Ghana',
};

const EMPTY_BILLING: BillingAddress = {
  address_line1: '',
  address_line2: '',
  city: '',
  region: '',
  postal_code: '',
  country: 'Ghana',
};

const SECTIONS = [
  { id: 'details', label: 'Your details', icon: User },
  { id: 'delivery', label: 'Delivery', icon: MapPin },
  { id: 'billing', label: 'Billing', icon: CreditCard },
  { id: 'notifications', label: 'Notifications', icon: Bell },
] as const;

const INPUT =
  'w-full min-h-11 rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-[#1A1A1A] placeholder:text-gray-400 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF7A19] disabled:bg-gray-100 disabled:text-[#3A3A3A]';

function billingFromShipping(shipping: ShippingAddress): BillingAddress {
  return {
    address_line1: shipping.street_address,
    address_line2: '',
    city: shipping.city,
    region: shipping.region,
    postal_code: shipping.postal_code,
    country: shipping.country || 'Ghana',
  };
}

function formFromProfile(user: UserProfile): ProfileForm {
  return {
    first_name: user.first_name || '',
    last_name: user.last_name || '',
    phone: user.phone || '',
    date_of_birth: user.date_of_birth || '',
    gender: user.gender || '',
    shipping_address: user.shipping_address
      ? {
          street_address:
            user.shipping_address.street_address || user.shipping_address.address_line1 || '',
          city: user.shipping_address.city || '',
          region: user.shipping_address.region || '',
          postal_code: user.shipping_address.postal_code || '',
          country: user.shipping_address.country || 'Ghana',
        }
      : { ...EMPTY_SHIPPING },
    billing_address: user.billing_address
      ? {
          address_line1:
            user.billing_address.address_line1 || user.billing_address.street_address || '',
          address_line2: user.billing_address.address_line2 || '',
          city: user.billing_address.city || '',
          region: user.billing_address.region || '',
          postal_code: user.billing_address.postal_code || '',
          country: user.billing_address.country || 'Ghana',
        }
      : { ...EMPTY_BILLING },
    sameAsShipping: false,
    newsletter_subscribed: user.newsletter_subscribed || false,
    sms_notifications: user.sms_notifications ?? true,
    email_notifications: user.email_notifications ?? true,
  };
}

function Field({
  id,
  label,
  required,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-[#1A1A1A]">
        {label}
        {required ? (
          <span className="text-red-600" aria-hidden="true">
            {' '}
            *
          </span>
        ) : null}
      </label>
      {children}
      {hint ? <p className="mt-1 text-xs text-[#3A3A3A]">{hint}</p> : null}
      {error ? (
        <p id={`${id}-error`} className="mt-1 text-xs text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function ToggleRow({
  id,
  title,
  description,
  checked,
  onChange,
}: {
  id: string;
  title: string;
  description: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <label
      htmlFor={id}
      className="flex cursor-pointer items-start gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4 hover:border-orange-200"
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 h-5 w-5 shrink-0 rounded border-gray-300 text-[#FF7A19] focus-visible:ring-[#FF7A19]"
      />
      <span>
        <span className="block font-semibold text-[#1A1A1A]">{title}</span>
        <span className="mt-0.5 block text-sm text-[#3A3A3A]">{description}</span>
      </span>
    </label>
  );
}

function initials(first: string, last: string, email: string) {
  const a = first.trim().charAt(0);
  const b = last.trim().charAt(0);
  if (a || b) return `${a}${b}`.toUpperCase();
  return (email.charAt(0) || '?').toUpperCase();
}

export default function ProfilePage() {
  const router = useRouter();
  const firstNameRef = useRef<HTMLInputElement>(null);
  const snapshotRef = useRef('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [formData, setFormData] = useState<ProfileForm>({
    first_name: '',
    last_name: '',
    phone: '',
    date_of_birth: '',
    gender: '',
    shipping_address: { ...EMPTY_SHIPPING },
    billing_address: { ...EMPTY_BILLING },
    sameAsShipping: false,
    newsletter_subscribed: false,
    sms_notifications: true,
    email_notifications: true,
  });
  const [errors, setErrors] = useState<{ first_name?: string; last_name?: string }>({});

  const dirty = JSON.stringify(formData) !== snapshotRef.current;

  const loadProfile = useCallback(async () => {
    try {
      const user = await authService.getUserProfile();
      if (!user) {
        router.push('/login');
        return;
      }
      const next = formFromProfile(user as UserProfile);
      setProfile(user as UserProfile);
      setFormData(next);
      snapshotRef.current = JSON.stringify(next);
      setErrors({});
    } catch {
      toast.error('Could not load your profile. Refresh and try again.');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    if (!dirty) return;
    const onLeave = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', onLeave);
    return () => window.removeEventListener('beforeunload', onLeave);
  }, [dirty]);

  const handleSave = async () => {
    const nextErrors: { first_name?: string; last_name?: string } = {};
    if (!formData.first_name.trim()) nextErrors.first_name = 'Enter your first name.';
    if (!formData.last_name.trim()) nextErrors.last_name = 'Enter your last name.';
    if (nextErrors.first_name || nextErrors.last_name) {
      setErrors(nextErrors);
      document.getElementById('details')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      firstNameRef.current?.focus();
      return;
    }

    setErrors({});
    setSaving(true);
    try {
      const billing = formData.sameAsShipping
        ? billingFromShipping(formData.shipping_address)
        : formData.billing_address;
      const result = await authService.updateUserProfile({
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        phone: formData.phone.trim(),
        date_of_birth: formData.date_of_birth || null,
        gender: formData.gender || null,
        shipping_address: formData.shipping_address,
        billing_address: billing,
        newsletter_subscribed: formData.newsletter_subscribed,
        sms_notifications: formData.sms_notifications,
        email_notifications: formData.email_notifications,
      });

      if (result.error) {
        throw result.error;
      }

      toast.success('Profile saved');
      await loadProfile();
    } catch {
      toast.error('Could not save your profile. Try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-[#3A3A3A]">Loading your profile…</p>;
  }

  const displayName = [formData.first_name, formData.last_name].filter(Boolean).join(' ') || 'Your profile';
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div>
      <header className="mb-4 flex items-start gap-3">
        <div
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-orange-100 text-sm font-semibold text-[#FF7A19]"
          aria-hidden="true"
        >
          {initials(formData.first_name, formData.last_name, profile?.email || '')}
        </div>
        <div className="min-w-0">
          <h1 className="hidden text-pretty text-2xl font-bold text-[#1A1A1A] md:block">Profile</h1>
          <p className="truncate text-sm font-medium text-[#1A1A1A] md:mt-1">{displayName}</p>
          <p className="truncate text-sm text-[#3A3A3A]">{profile?.email}</p>
        </div>
      </header>

      <p className="mb-4 text-sm text-[#3A3A3A]">
        Name, delivery address, and how we contact you. Email cannot be changed.
      </p>

      <nav
        aria-label="On this page"
        className="mb-5 flex gap-2 overflow-x-auto pb-1"
      >
        {SECTIONS.map((section) => {
          const Icon = section.icon;
          return (
            <a
              key={section.id}
              href={`#${section.id}`}
              className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 text-sm font-medium text-[#1A1A1A] hover:bg-orange-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF7A19]"
            >
              <Icon size={14} aria-hidden="true" />
              {section.label}
            </a>
          );
        })}
      </nav>

      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          void handleSave();
        }}
      >
        <section
          id="details"
          className="scroll-mt-24 rounded-xl bg-white p-4 shadow-sm sm:p-6"
        >
          <h2 className="text-lg font-bold text-[#1A1A1A]">Your details</h2>
          <p className="mt-1 mb-4 text-sm text-[#3A3A3A]">Used on receipts and when we call about an order.</p>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="first_name" label="First name" required error={errors.first_name}>
                <input
                  ref={firstNameRef}
                  id="first_name"
                  name="first_name"
                  type="text"
                  autoComplete="given-name"
                  value={formData.first_name}
                  aria-invalid={Boolean(errors.first_name)}
                  aria-describedby={errors.first_name ? 'first_name-error' : undefined}
                  onChange={(event) =>
                    setFormData({ ...formData, first_name: event.target.value })
                  }
                  className={INPUT}
                />
              </Field>
              <Field id="last_name" label="Last name" required error={errors.last_name}>
                <input
                  id="last_name"
                  name="last_name"
                  type="text"
                  autoComplete="family-name"
                  value={formData.last_name}
                  aria-invalid={Boolean(errors.last_name)}
                  aria-describedby={errors.last_name ? 'last_name-error' : undefined}
                  onChange={(event) =>
                    setFormData({ ...formData, last_name: event.target.value })
                  }
                  className={INPUT}
                />
              </Field>
            </div>

            <Field id="email" label="Email" hint="Email cannot be changed.">
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                spellCheck={false}
                value={profile?.email || ''}
                disabled
                className={INPUT}
              />
            </Field>

            <Field id="phone" label="Phone" hint="Ghana mobile, for delivery calls.">
              <input
                id="phone"
                name="phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="024 123 4567"
                value={formData.phone}
                onChange={(event) => setFormData({ ...formData, phone: event.target.value })}
                className={INPUT}
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="date_of_birth" label="Date of birth">
                <input
                  id="date_of_birth"
                  name="date_of_birth"
                  type="date"
                  autoComplete="bday"
                  max={today}
                  value={formData.date_of_birth}
                  onChange={(event) =>
                    setFormData({ ...formData, date_of_birth: event.target.value })
                  }
                  className={INPUT}
                />
              </Field>
              <Field id="gender" label="Gender">
                <select
                  id="gender"
                  name="gender"
                  autoComplete="sex"
                  value={formData.gender}
                  onChange={(event) => setFormData({ ...formData, gender: event.target.value })}
                  className={INPUT}
                >
                  <option value="">Prefer not to say</option>
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                  <option value="other">Other</option>
                  <option value="prefer_not_to_say">Prefer not to say</option>
                </select>
              </Field>
            </div>
          </div>
        </section>

        <section
          id="delivery"
          className="scroll-mt-24 rounded-xl bg-white p-4 shadow-sm sm:p-6"
        >
          <h2 className="text-lg font-bold text-[#1A1A1A]">Delivery address</h2>
          <p className="mt-1 mb-4 text-sm text-[#3A3A3A]">Where should we send your orders?</p>
          <div className="space-y-4">
            <Field id="shipping_street" label="Street address">
              <input
                id="shipping_street"
                name="shipping_street"
                type="text"
                autoComplete="shipping street-address"
                placeholder="House no., street, landmark…"
                value={formData.shipping_address.street_address}
                onChange={(event) =>
                  setFormData({
                    ...formData,
                    shipping_address: {
                      ...formData.shipping_address,
                      street_address: event.target.value,
                    },
                  })
                }
                className={INPUT}
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="shipping_city" label="City">
                <input
                  id="shipping_city"
                  name="shipping_city"
                  type="text"
                  autoComplete="shipping address-level2"
                  placeholder="Accra"
                  value={formData.shipping_address.city}
                  onChange={(event) =>
                    setFormData({
                      ...formData,
                      shipping_address: { ...formData.shipping_address, city: event.target.value },
                    })
                  }
                  className={INPUT}
                />
              </Field>
              <Field id="shipping_region" label="Region">
                <select
                  id="shipping_region"
                  name="shipping_region"
                  autoComplete="shipping address-level1"
                  value={formData.shipping_address.region}
                  onChange={(event) =>
                    setFormData({
                      ...formData,
                      shipping_address: {
                        ...formData.shipping_address,
                        region: event.target.value,
                      },
                    })
                  }
                  className={INPUT}
                >
                  <option value="">Select region</option>
                  {GHANA_REGIONS.map((region) => (
                    <option key={region} value={region}>
                      {region}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <Field id="shipping_postal" label="Postal code">
              <input
                id="shipping_postal"
                name="shipping_postal"
                type="text"
                autoComplete="shipping postal-code"
                placeholder="GA-123-4567"
                value={formData.shipping_address.postal_code}
                onChange={(event) =>
                  setFormData({
                    ...formData,
                    shipping_address: {
                      ...formData.shipping_address,
                      postal_code: event.target.value,
                    },
                  })
                }
                className={INPUT}
              />
            </Field>
          </div>
        </section>

        <section
          id="billing"
          className="scroll-mt-24 rounded-xl bg-white p-4 shadow-sm sm:p-6"
        >
          <h2 className="text-lg font-bold text-[#1A1A1A]">Billing address</h2>
          <p className="mt-1 mb-4 text-sm text-[#3A3A3A]">Used on invoices. Often the same as delivery.</p>
          <label
            htmlFor="same_as_shipping"
            className="mb-4 flex cursor-pointer items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3"
          >
            <input
              id="same_as_shipping"
              type="checkbox"
              checked={formData.sameAsShipping}
              onChange={(event) => {
                const checked = event.target.checked;
                setFormData((prev) => ({
                  ...prev,
                  sameAsShipping: checked,
                  billing_address: checked
                    ? billingFromShipping(prev.shipping_address)
                    : prev.billing_address,
                }));
              }}
              className="h-5 w-5 rounded border-gray-300 text-[#FF7A19] focus-visible:ring-[#FF7A19]"
            />
            <span className="text-sm font-medium text-[#1A1A1A]">Same as delivery address</span>
          </label>

          {formData.sameAsShipping ? (
            <p className="text-sm text-[#3A3A3A]">
              Invoices will use your delivery address.
            </p>
          ) : (
            <div className="space-y-4">
              <Field id="billing_line1" label="Address line 1">
                <input
                  id="billing_line1"
                  name="billing_line1"
                  type="text"
                  autoComplete="billing address-line1"
                  placeholder="Street address, P.O. box…"
                  value={formData.billing_address.address_line1}
                  onChange={(event) =>
                    setFormData({
                      ...formData,
                      billing_address: {
                        ...formData.billing_address,
                        address_line1: event.target.value,
                      },
                    })
                  }
                  className={INPUT}
                />
              </Field>
              <Field id="billing_line2" label="Address line 2">
                <input
                  id="billing_line2"
                  name="billing_line2"
                  type="text"
                  autoComplete="billing address-line2"
                  placeholder="Apartment, suite, floor…"
                  value={formData.billing_address.address_line2}
                  onChange={(event) =>
                    setFormData({
                      ...formData,
                      billing_address: {
                        ...formData.billing_address,
                        address_line2: event.target.value,
                      },
                    })
                  }
                  className={INPUT}
                />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field id="billing_city" label="City">
                  <input
                    id="billing_city"
                    name="billing_city"
                    type="text"
                    autoComplete="billing address-level2"
                    value={formData.billing_address.city}
                    onChange={(event) =>
                      setFormData({
                        ...formData,
                        billing_address: {
                          ...formData.billing_address,
                          city: event.target.value,
                        },
                      })
                    }
                    className={INPUT}
                  />
                </Field>
                <Field id="billing_region" label="Region">
                  <select
                    id="billing_region"
                    name="billing_region"
                    autoComplete="billing address-level1"
                    value={formData.billing_address.region}
                    onChange={(event) =>
                      setFormData({
                        ...formData,
                        billing_address: {
                          ...formData.billing_address,
                          region: event.target.value,
                        },
                      })
                    }
                    className={INPUT}
                  >
                    <option value="">Select region</option>
                    {GHANA_REGIONS.map((region) => (
                      <option key={region} value={region}>
                        {region}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field id="billing_postal" label="Postal code">
                  <input
                    id="billing_postal"
                    name="billing_postal"
                    type="text"
                    autoComplete="billing postal-code"
                    placeholder="GA-123-4567"
                    value={formData.billing_address.postal_code}
                    onChange={(event) =>
                      setFormData({
                        ...formData,
                        billing_address: {
                          ...formData.billing_address,
                          postal_code: event.target.value,
                        },
                      })
                    }
                    className={INPUT}
                  />
                </Field>
                <Field id="billing_country" label="Country">
                  <input
                    id="billing_country"
                    name="billing_country"
                    type="text"
                    autoComplete="billing country-name"
                    value={formData.billing_address.country}
                    disabled
                    className={INPUT}
                  />
                </Field>
              </div>
            </div>
          )}
        </section>

        <section
          id="notifications"
          className="scroll-mt-24 rounded-xl bg-white p-4 shadow-sm sm:p-6"
        >
          <h2 className="text-lg font-bold text-[#1A1A1A]">Notifications</h2>
          <p className="mt-1 mb-4 text-sm text-[#3A3A3A]">Choose what we send you. Order updates stay on by default.</p>
          <div className="space-y-3">
            <ToggleRow
              id="email_notifications"
              title="Email updates"
              description="Order status, shipping, and account notices."
              checked={formData.email_notifications}
              onChange={(checked) => setFormData({ ...formData, email_notifications: checked })}
            />
            <ToggleRow
              id="sms_notifications"
              title="SMS updates"
              description="Delivery calls and time-sensitive order texts."
              checked={formData.sms_notifications}
              onChange={(checked) => setFormData({ ...formData, sms_notifications: checked })}
            />
            <ToggleRow
              id="newsletter_subscribed"
              title="Deals & new arrivals"
              description="Occasional offers and new products. You can turn this off anytime."
              checked={formData.newsletter_subscribed}
              onChange={(checked) =>
                setFormData({ ...formData, newsletter_subscribed: checked })
              }
            />
          </div>
        </section>

        <div
          className="sticky bottom-20 z-10 mt-2 flex items-center justify-end gap-3 rounded-xl border border-gray-200 bg-white/95 p-3 shadow-sm backdrop-blur md:bottom-4"
          aria-live="polite"
        >
          {dirty ? (
            <p className="mr-auto text-xs text-[#3A3A3A]">Unsaved changes</p>
          ) : (
            <p className="mr-auto text-xs text-[#3A3A3A]">All changes saved</p>
          )}
          <Button type="button" variant="ghost" onClick={() => void loadProfile()} disabled={saving || !dirty}>
            Discard
          </Button>
          <Button type="submit" variant="primary" disabled={saving || !dirty}>
            {saving ? 'Saving…' : 'Save profile'}
          </Button>
        </div>
      </form>
    </div>
  );
}
