'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { InfoNote } from '@/components/ui/InfoNote';
import { ContentHtml } from '@/components/content/ContentHtml';
import { DeviceWarrantyBadge } from '@/components/admin/DeviceWarrantyBadge';
import { OwnerQrCard } from '@/components/devices/OwnerQrCard';
import { useAppSelector } from '@/store';
import { authHeaders } from '@/lib/authHeaders';
import { settingsService } from '@/lib/settings.service';
import { apiMessage, deviceRequest, formatDeviceDate, type DeviceWarranty } from '@/lib/devicesAdmin';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

const GUIDE_LABELS = [
  ['user_guide', 'Basic setup'],
  ['software', 'Windows and software'],
  ['maintenance', 'Maintenance'],
  ['battery', 'Battery care'],
  ['hardware', 'Hardware'],
  ['warranty', 'Warranty'],
  ['troubleshooting', 'Troubleshooting'],
] as const;

interface GuideArticle {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
}

interface LaptopFaq {
  id: string;
  question: string;
  answer_html: string;
}

interface DevicePayload {
  view: 'public' | 'owner';
  ownership?: 'original' | 'transferred';
  claimable?: boolean;
  registering?: boolean;
  model_name: string;
  product: { slug: string | null; thumbnail: string | null };
  warranty?: DeviceWarranty;
  guides?: Record<string, GuideArticle[]>;
  faqs?: LaptopFaq[];
  customer_name?: string | null;
  owner_name?: string | null;
  serial_number?: string | null;
  purchase_date?: string;
  linked_at?: string | null;
  order_number?: string | null;
  order_id?: string | null;
  qr_token?: string;
}

interface StoreContact {
  phone: string;
  email: string;
  whatsapp: string;
}

const FALLBACK_CONTACT: StoreContact = {
  phone: '+233 55 134 4310',
  email: 'ventechgadgets@gmail.com',
  whatsapp: '',
};

function whatsappHref(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (!digits) return '';
  const normalized = digits.startsWith('0') ? `233${digits.slice(1)}` : digits;
  return `https://wa.me/${normalized}`;
}

export function DevicePassport() {
  const params = useParams<{ token: string }>();
  const token = Array.isArray(params.token) ? params.token[0] : params.token;
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAppSelector((state) => state.auth);
  const [device, setDevice] = useState<DevicePayload | null>(null);
  const [phase, setPhase] = useState<'loading' | 'ready' | 'missing' | 'error'>('loading');
  const [contact, setContact] = useState<StoreContact>(FALLBACK_CONTACT);
  const [openSlug, setOpenSlug] = useState<string | null>(null);
  const [openFaqId, setOpenFaqId] = useState<string | null>(null);
  const [bodies, setBodies] = useState<Record<string, string>>({});
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [claiming, setClaiming] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const claimStarted = useRef(false);

  const load = async () => {
    if (!token) {
      setPhase('missing');
      return;
    }
    try {
      const headers = await authHeaders();
      const response = await fetch(`${API_URL}/api/devices/public/${encodeURIComponent(token)}`, {
        headers,
        cache: 'no-store',
      });
      const body = await response.json().catch(() => ({}));
      if (response.status === 404) {
        setDevice(null);
        setPhase('missing');
        return;
      }
      if (!response.ok || body?.success === false) {
        setPhase('error');
        return;
      }
      setDevice(body.data as DevicePayload);
      setPhase('ready');
    } catch (error) {
      console.error('load device', error);
      setPhase('error');
      toast.error('Could not load this laptop');
    }
  };

  useEffect(() => {
    let cancelled = false;
    const loadContact = async () => {
      try {
        const settings = await settingsService.getSettingsByCategory('store');
        if (cancelled) return;
        setContact({
          phone: settings.store_phone || FALLBACK_CONTACT.phone,
          email: settings.store_email || FALLBACK_CONTACT.email,
          whatsapp: settings.store_whatsapp_number || '',
        });
      } catch (error) {
        console.error('store contact', error);
      }
    };
    void loadContact();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (isLoading || !token) return;
    void load();
    // Reload when the session becomes known so the owner view is not shown to a guest first.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, isAuthenticated, token]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setTimeout(() => setCooldown((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  const sendCode = async () => {
    if (!token) return;
    setClaiming(true);
    try {
      const result = await deviceRequest<{ sentTo: string }>(`/api/devices/${encodeURIComponent(token)}/claim`, {
        method: 'POST',
      });
      setSentTo(result.data.sentTo);
      setCooldown(60);
      setCode('');
    } catch (error) {
      toast.error(apiMessage(error, 'Could not send the code'));
    } finally {
      setClaiming(false);
    }
  };

  useEffect(() => {
    if (claimStarted.current || isLoading || !isAuthenticated || !device || !token) return;
    if (device.view !== 'public' || !device.claimable) return;
    if (new URLSearchParams(window.location.search).get('claim') !== '1') return;
    claimStarted.current = true;
    void sendCode();
    // The return from login should request the code once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [device, isAuthenticated, isLoading, token]);

  const verifyCode = async () => {
    if (!token) return;
    setClaiming(true);
    try {
      await deviceRequest(`/api/devices/${encodeURIComponent(token)}/claim/verify`, {
        method: 'POST',
        body: JSON.stringify({ code: code.trim() }),
      });
      toast.success('This laptop is now linked to your account');
      setSentTo(null);
      setCode('');
      router.replace(`/d/${encodeURIComponent(token)}`);
      await load();
    } catch (error) {
      toast.error(apiMessage(error, 'Could not verify the code'));
    } finally {
      setClaiming(false);
    }
  };

  const openGuide = async (slug: string) => {
    if (openSlug === slug) {
      setOpenSlug(null);
      return;
    }
    setOpenSlug(slug);
    if (bodies[slug]) return;
    try {
      const response = await fetch(`${API_URL}/api/content/articles/${encodeURIComponent(slug)}`);
      const body = await response.json().catch(() => ({}));
      if (!response.ok || typeof body?.data?.body_html !== 'string') {
        toast.error(typeof body?.message === 'string' ? body.message : 'Could not load this guide');
        return;
      }
      setBodies((current) => ({ ...current, [slug]: body.data.body_html }));
    } catch (error) {
      console.error('load guide', error);
      toast.error('Could not load this guide');
    }
  };

  if (isLoading || phase === 'loading') {
    return (
      <main className="min-h-screen bg-gray-50 px-4 py-16 text-center text-sm text-[#3A3A3A]">
        Loading this laptop…
      </main>
    );
  }

  if (phase === 'missing' || phase === 'error') {
    return (
      <main className="min-h-screen bg-gray-50 px-4 py-10">
        <div className="max-w-md mx-auto bg-white border border-gray-200 rounded-2xl p-6 text-center">
          <h1 className="text-2xl font-bold text-[#1A1A1A]">
            {phase === 'missing' ? "We couldn't find this laptop" : "We couldn't load this laptop"}
          </h1>
          <p className="mt-2 text-sm text-[#3A3A3A]">
            {phase === 'error' ? 'Please try again in a moment.' : 'Check the sticker and scan the code again.'}
          </p>
          <SupportContact contact={contact} />
        </div>
      </main>
    );
  }

  if (!device) return null;

  const registering = Boolean(device.registering);
  const returnPath = `/d/${token}`;
  const claimHref = `/login?redirect=${encodeURIComponent(`${returnPath}?claim=1`)}`;
  const detailsHref = `/login?redirect=${encodeURIComponent(returnPath)}`;
  const warranty = device.warranty || { status: 'none' as const, endsOn: null };
  const groups = GUIDE_LABELS.map(([key, label]) => ({
    key,
    label,
    articles: device.guides?.[key] || [],
  })).filter((group) => group.articles.length > 0);
  const faqs = device.faqs || [];

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-6">
      <div className="max-w-lg mx-auto space-y-4">
        <section className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          {device.product?.thumbnail ? (
            <img src={device.product.thumbnail} alt={device.model_name} className="w-full h-56 object-cover bg-gray-100" />
          ) : (
            <div className="h-40 bg-gray-100 flex items-center justify-center text-sm text-[#3A3A3A]">VENTECH</div>
          )}
          <div className="p-4 space-y-3">
            <p className="text-xs font-bold tracking-wide text-[#FF7A19]">VENTECH</p>
            {registering ? (
              <>
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">Being prepared</p>
                <h1 className="text-2xl font-bold text-[#1A1A1A] leading-tight">This laptop is being registered</h1>
                <p className="text-lg font-medium text-[#1A1A1A]">{device.model_name}</p>
                {device.view === 'owner' && device.order_number ? (
                  <p className="text-sm text-[#3A3A3A]">
                    {device.order_id ? (
                      <>
                        Order{' '}
                        <Link href={`/orders/${device.order_id}`} className="text-[#FF7A19]">{device.order_number}</Link>
                      </>
                    ) : (
                      <>Order {device.order_number}</>
                    )}
                  </p>
                ) : null}
                <p className="text-sm text-[#3A3A3A]">
                  Serial number, warranty dates, and service requests appear once VENTECH registers this laptop. Setup, care, and support are already below.
                </p>
              </>
            ) : (
              <>
                <h1 className="text-2xl font-bold text-[#1A1A1A] leading-tight">{device.model_name}</h1>
                <DeviceWarrantyBadge warranty={warranty} showDate={false} />
                <p className="text-sm text-[#3A3A3A]">
                  {warranty.endsOn
                    ? `Warranty ends ${formatDeviceDate(warranty.endsOn)}`
                    : 'No warranty recorded'}
                </p>
              </>
            )}

            {!registering && device.view === 'owner' && device.ownership === 'transferred' && (
              <dl className="grid grid-cols-1 gap-2 text-sm border-t border-gray-100 pt-3">
                <Detail label="Registered to" value={device.owner_name || '—'} />
                <Detail label="Serial" value={device.serial_number || '—'} mono />
                <Detail label="Purchased" value={formatDeviceDate(device.purchase_date) || '—'} />
                <Detail label="Linked on" value={formatDeviceDate(device.linked_at) || '—'} />
              </dl>
            )}

            {!registering && device.view === 'owner' && device.ownership !== 'transferred' && (
              <dl className="grid grid-cols-1 gap-2 text-sm border-t border-gray-100 pt-3">
                <Detail label="Name" value={device.customer_name || '—'} />
                <Detail label="Serial" value={device.serial_number || '—'} mono />
                <Detail label="Purchased" value={formatDeviceDate(device.purchase_date) || '—'} />
                <div className="flex justify-between gap-3">
                  <dt className="text-[#3A3A3A]">Order</dt>
                  <dd className="font-medium text-[#1A1A1A] text-right">
                    {device.order_id && device.order_number ? (
                      <Link href={`/orders/${device.order_id}`} className="text-[#FF7A19]">{device.order_number}</Link>
                    ) : (
                      device.order_number || '—'
                    )}
                  </dd>
                </div>
              </dl>
            )}

            {!registering && device.view === 'public' && device.claimable && !sentTo && (
              isAuthenticated ? (
                <Button className="w-full" onClick={sendCode} isLoading={claiming}>Claim this laptop</Button>
              ) : (
                <Link
                  href={claimHref}
                  className="inline-flex w-full items-center justify-center rounded-lg bg-[#FF7A19] px-4 py-2 font-medium text-white"
                >
                  Claim this laptop
                </Link>
              )
            )}

            {!registering && device.view === 'public' && !isAuthenticated && (
              <p className="text-sm text-[#3A3A3A]">
                <Link href={detailsHref} className="text-[#FF7A19] font-semibold">Log in to see your device details</Link>
              </p>
            )}

            {!registering && sentTo && (
              <div className="space-y-3 border-t border-gray-100 pt-3">
                <InfoNote>
                  To protect your privacy, we'll send a 6-digit code to the email used when this laptop was bought. Enter it here to link the laptop to your account.
                </InfoNote>
                <p className="text-sm text-[#1A1A1A]">We sent a 6-digit code to {sentTo}</p>
                <input
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={code}
                  onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-center tracking-[0.4em] text-lg focus:outline-none focus:ring-2 focus:ring-[#FF7A19]"
                />
                <Button className="w-full" onClick={verifyCode} isLoading={claiming} disabled={code.length !== 6}>
                  Verify
                </Button>
                <button
                  type="button"
                  className="w-full text-sm font-semibold text-[#FF7A19] disabled:text-gray-400"
                  disabled={cooldown > 0 || claiming}
                  onClick={sendCode}
                >
                  {cooldown > 0 ? `Send a new code (${cooldown}s)` : 'Send a new code'}
                </button>
              </div>
            )}

            {!registering && device.view === 'owner' && (
              <Link
                href={`/account/service/new?device=${encodeURIComponent(token)}`}
                className="inline-flex w-full items-center justify-center rounded-lg bg-[#1A1A1A] px-4 py-2 font-medium text-white"
              >
                Request service
              </Link>
            )}
          </div>
        </section>

        {!registering && device.view === 'owner' && device.qr_token && device.serial_number ? (
          <OwnerQrCard
            qrToken={device.qr_token}
            modelName={device.model_name}
            serialNumber={device.serial_number}
            phone={contact.phone}
          />
        ) : null}

        {groups.length > 0 && (
          <section className="bg-white border border-gray-200 rounded-2xl p-4 space-y-2">
            <h2 className="font-semibold text-[#1A1A1A]">Guides</h2>
            {groups.map((group) => (
              <div key={group.key} className="border-t border-gray-100 pt-2">
                <h3 className="text-sm font-semibold text-[#1A1A1A] py-1">{group.label}</h3>
                {group.articles.map((article) => {
                  const open = openSlug === article.slug;
                  return (
                    <div key={article.id} className="border border-gray-200 rounded-lg mb-2">
                      <button
                        type="button"
                        className="w-full flex items-center justify-between gap-3 px-3 py-3 text-left"
                        onClick={() => openGuide(article.slug)}
                        aria-expanded={open}
                      >
                        <span>
                          <span className="block text-sm font-medium text-[#1A1A1A]">{article.title}</span>
                          {article.summary ? <span className="block text-xs text-[#3A3A3A] mt-1">{article.summary}</span> : null}
                        </span>
                        <ChevronDown size={16} className={`shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
                      </button>
                      {open && (
                        <div className="px-3 pb-3">
                          {bodies[article.slug] ? <ContentHtml html={bodies[article.slug]} /> : <p className="text-sm text-[#3A3A3A]">Loading…</p>}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </section>
        )}

        {faqs.length > 0 && (
          <section className="bg-white border border-gray-200 rounded-2xl p-4 space-y-2">
            <h2 className="font-semibold text-[#1A1A1A]">Laptop FAQs</h2>
            {faqs.map((faq) => {
              const open = openFaqId === faq.id;
              return (
                <div key={faq.id} className="border border-gray-200 rounded-lg">
                  <button
                    type="button"
                    className="w-full flex items-center justify-between gap-3 px-3 py-3 text-left"
                    onClick={() => setOpenFaqId(open ? null : faq.id)}
                    aria-expanded={open}
                  >
                    <span className="text-sm font-medium text-[#1A1A1A]">{faq.question}</span>
                    <ChevronDown size={16} className={`shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
                  </button>
                  {open ? (
                    <div className="px-3 pb-3">
                      <ContentHtml html={faq.answer_html} />
                    </div>
                  ) : null}
                </div>
              );
            })}
            <p className="pt-1 text-sm">
              <Link href="/faq" className="font-semibold text-[#FF7A19]">Store FAQs</Link>
            </p>
          </section>
        )}

        <section className="bg-white border border-gray-200 rounded-2xl p-4 text-sm">
          <SupportContact contact={contact} />
        </section>
      </div>
    </main>
  );
}

function Detail({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-[#3A3A3A]">{label}</dt>
      <dd className={`min-w-0 break-all font-medium text-[#1A1A1A] text-right ${mono ? 'font-mono text-xs' : ''}`}>{value}</dd>
    </div>
  );
}

function SupportContact({ contact }: { contact: StoreContact }) {
  const whatsapp = whatsappHref(contact.whatsapp);
  return (
    <div className="space-y-2 text-sm text-left">
      <p className="font-semibold text-[#1A1A1A]">VENTECH support</p>
      <a className="block text-[#FF7A19]" href={`tel:${contact.phone.replace(/\s/g, '')}`}>{contact.phone}</a>
      {whatsapp ? (
        <a className="block text-[#FF7A19]" href={whatsapp} target="_blank" rel="noopener noreferrer">WhatsApp</a>
      ) : null}
      <a className="block text-[#FF7A19]" href={`mailto:${contact.email}`}>{contact.email}</a>
    </div>
  );
}
