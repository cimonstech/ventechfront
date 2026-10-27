'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { useAppSelector } from '@/store';
import { safeRedirectPath } from '@/lib/safeRedirect';
import {
  affiliateRequest,
  apiMessage,
  fetchPublicAffiliateInfo,
  formatGhs,
  loadAffiliateMe,
  payoutMethodLabel,
  type AffiliateMe,
  type PayoutMethod,
  type PublicAffiliateInfo,
} from '@/lib/affiliates';

const CHANNELS = ['Instagram', 'TikTok', 'YouTube', 'WhatsApp', 'Facebook', 'Twitter (X)', 'Website / Blog', 'Other'];
const MOMO_NETWORKS = ['MTN', 'Telecel', 'AirtelTigo'];

function startFeePayment() {
  return affiliateRequest<{ authorization_url?: string }>('/api/affiliates/fee/initialize', {
    method: 'POST',
    body: '{}',
  }).then((result) => {
    const url = result.data?.authorization_url;
    if (!url) throw new Error('Could not start the payment.');
    window.location.href = url;
  });
}

export default function AffiliateJoinPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAppSelector((state) => state.auth);
  const [ready, setReady] = useState(false);
  const [info, setInfo] = useState<PublicAffiliateInfo | null>(null);
  const [existing, setExisting] = useState<AffiliateMe | null>(null);
  const [channels, setChannels] = useState<string[]>([]);
  const [handles, setHandles] = useState<Record<string, string>>({});
  const [payoutMethod, setPayoutMethod] = useState<PayoutMethod>('momo');
  const [momoNetwork, setMomoNetwork] = useState('MTN');
  const [momoNumber, setMomoNumber] = useState('');
  const [bankName, setBankName] = useState('');
  const [bankAccountName, setBankAccountName] = useState('');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      const next = safeRedirectPath('/affiliate/join');
      router.replace(next ? `/login?redirect=${encodeURIComponent(next)}` : '/login');
      return;
    }
    let cancelled = false;
    const load = async () => {
      try {
        const [me, publicInfo] = await Promise.all([loadAffiliateMe(), fetchPublicAffiliateInfo()]);
        if (cancelled) return;
        setInfo(publicInfo);
        if (me && me.status !== 'awaiting_payment') {
          router.replace('/account/affiliate');
          return;
        }
        setExisting(me);
        if (publicInfo?.payout_methods?.length) {
          setPayoutMethod(publicInfo.payout_methods[0]);
        }
      } catch (error) {
        if (!cancelled) toast.error(apiMessage(error, 'Could not load the application form.'));
      } finally {
        if (!cancelled) setReady(true);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, isLoading, router]);

  const toggleChannel = (channel: string) => {
    setChannels((current) =>
      current.includes(channel) ? current.filter((item) => item !== channel) : [...current, channel]
    );
  };

  const payLabel = info ? `Pay ${formatGhs(info.fee_pesewas)}` : 'Pay application fee';
  const formValid =
    acceptTerms
    && channels.length > 0
    && (payoutMethod === 'momo'
      ? momoNetwork.trim().length > 0 && momoNumber.trim().length >= 8
      : bankName.trim().length > 0 && bankAccountName.trim().length > 0 && bankAccountNumber.trim().length >= 6);

  const resumePayment = async () => {
    setPaying(true);
    try {
      await startFeePayment();
    } catch (error) {
      toast.error(apiMessage(error, 'Could not start the payment.'));
      setPaying(false);
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!acceptTerms) {
      toast.error('You must accept the affiliate terms.');
      return;
    }
    if (!channels.length) {
      toast.error('Select at least one promotion channel.');
      return;
    }
    setSubmitting(true);
    try {
      const social_handles = Object.fromEntries(
        Object.entries(handles).map(([key, value]) => [key, value.trim()]).filter(([, value]) => value)
      );
      const body =
        payoutMethod === 'momo'
          ? {
              promo_channels: channels,
              social_handles,
              payout_method: 'momo' as const,
              momo_network: momoNetwork,
              momo_number: momoNumber.trim(),
              accept_terms: true as const,
            }
          : {
              promo_channels: channels,
              social_handles,
              payout_method: 'bank' as const,
              bank_name: bankName.trim(),
              bank_account_name: bankAccountName.trim(),
              bank_account_number: bankAccountNumber.trim(),
              accept_terms: true as const,
            };
      await affiliateRequest('/api/affiliates/register', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      await startFeePayment();
    } catch (error) {
      const message = apiMessage(error, 'Could not save your application.');
      if (/already/i.test(message)) {
        router.replace('/account/affiliate');
        return;
      }
      toast.error(message);
      setSubmitting(false);
    }
  };

  if (!ready) {
    return <div className="min-h-screen bg-gray-50 px-4 py-16 text-center text-[#3A3A3A]">Loading…</div>;
  }

  if (existing?.status === 'awaiting_payment') {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="mx-auto max-w-lg px-4">
          <div className="rounded-xl bg-white p-6 shadow-lg">
            <h1 className="mb-3 text-2xl font-bold text-[#1A1A1A]">Finish your application</h1>
            <p className="mb-6 text-[#3A3A3A]">
              Your details are saved. Pay the application fee to send your application for review.
            </p>
            <button
              type="button"
              onClick={() => void resumePayment()}
              disabled={paying}
              className="w-full rounded-lg bg-[#FF7A19] px-4 py-3 font-semibold text-white hover:bg-[#e66a0f] disabled:opacity-50"
            >
              {paying ? 'Opening payment…' : payLabel}
            </button>
            <p className="mt-4 text-center">
              <Link href="/affiliate/terms" className="text-sm text-[#FF7A19] hover:underline">
                Read the affiliate terms
              </Link>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="mx-auto max-w-lg px-4">
        <div className="rounded-xl bg-white p-6 shadow-lg">
          <h1 className="mb-2 text-2xl font-bold text-[#1A1A1A]">Join the affiliate program</h1>
          <p className="mb-6 text-sm text-[#3A3A3A]">
            {info
              ? `A one-time fee of ${formatGhs(info.fee_pesewas)} is charged after you submit this form.`
              : 'A one-time application fee is charged after you submit this form.'}
          </p>
          <form onSubmit={(event) => void handleSubmit(event)} className="space-y-5">
            <fieldset>
              <legend className="mb-2 text-sm font-medium text-[#1A1A1A]">Promotion channels</legend>
              <div className="grid grid-cols-1 gap-2">
                {CHANNELS.map((channel) => (
                  <label key={channel} className="flex items-center gap-2 text-sm text-[#3A3A3A]">
                    <input
                      type="checkbox"
                      checked={channels.includes(channel)}
                      onChange={() => toggleChannel(channel)}
                      className="rounded border-gray-300 text-[#FF7A19] focus:ring-[#FF7A19]"
                    />
                    {channel}
                  </label>
                ))}
              </div>
            </fieldset>

            {channels.length > 0 && (
              <div className="space-y-3">
                <p className="text-sm font-medium text-[#1A1A1A]">Handles or links (optional)</p>
                {channels.map((channel) => (
                  <div key={channel}>
                    <label htmlFor={`handle-${channel}`} className="mb-1 block text-xs text-[#3A3A3A]">
                      {channel}
                    </label>
                    <input
                      id={`handle-${channel}`}
                      value={handles[channel] || ''}
                      onChange={(event) => setHandles((current) => ({ ...current, [channel]: event.target.value }))}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-transparent focus:ring-2 focus:ring-[#FF7A19]"
                      placeholder="@handle or https://"
                    />
                  </div>
                ))}
              </div>
            )}

            <div>
              <label htmlFor="payoutMethod" className="mb-1 block text-sm font-medium text-[#1A1A1A]">
                Payout method
              </label>
              <select
                id="payoutMethod"
                value={payoutMethod}
                onChange={(event) => setPayoutMethod(event.target.value as PayoutMethod)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#FF7A19]"
              >
                {(info?.payout_methods || ['momo', 'bank']).map((method) => (
                  <option key={method} value={method}>
                    {payoutMethodLabel(method)}
                  </option>
                ))}
              </select>
            </div>

            {payoutMethod === 'momo' ? (
              <>
                <div>
                  <label htmlFor="momoNetwork" className="mb-1 block text-sm font-medium text-[#1A1A1A]">
                    Mobile money network
                  </label>
                  <select
                    id="momoNetwork"
                    value={momoNetwork}
                    onChange={(event) => setMomoNetwork(event.target.value)}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#FF7A19]"
                  >
                    {MOMO_NETWORKS.map((network) => (
                      <option key={network} value={network}>
                        {network}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="momoNumber" className="mb-1 block text-sm font-medium text-[#1A1A1A]">
                    Mobile money number
                  </label>
                  <input
                    id="momoNumber"
                    required
                    value={momoNumber}
                    onChange={(event) => setMomoNumber(event.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#FF7A19]"
                    placeholder="0240000000"
                  />
                </div>
              </>
            ) : (
              <>
                <div>
                  <label htmlFor="bankName" className="mb-1 block text-sm font-medium text-[#1A1A1A]">
                    Bank name
                  </label>
                  <input
                    id="bankName"
                    required
                    value={bankName}
                    onChange={(event) => setBankName(event.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#FF7A19]"
                  />
                </div>
                <div>
                  <label htmlFor="bankAccountName" className="mb-1 block text-sm font-medium text-[#1A1A1A]">
                    Account name
                  </label>
                  <input
                    id="bankAccountName"
                    required
                    value={bankAccountName}
                    onChange={(event) => setBankAccountName(event.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#FF7A19]"
                  />
                </div>
                <div>
                  <label htmlFor="bankAccountNumber" className="mb-1 block text-sm font-medium text-[#1A1A1A]">
                    Account number
                  </label>
                  <input
                    id="bankAccountNumber"
                    required
                    value={bankAccountNumber}
                    onChange={(event) => setBankAccountNumber(event.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#FF7A19]"
                  />
                </div>
              </>
            )}

            <label className="flex items-start gap-2 text-sm text-[#3A3A3A]">
              <input
                type="checkbox"
                checked={acceptTerms}
                onChange={(event) => setAcceptTerms(event.target.checked)}
                className="mt-1 rounded border-gray-300 text-[#FF7A19] focus:ring-[#FF7A19]"
              />
              <span>
                I accept the{' '}
                <Link href="/affiliate/terms" className="text-[#FF7A19] hover:underline">
                  affiliate terms
                </Link>
                .
              </span>
            </label>

            <button
              type="submit"
              disabled={submitting || !formValid}
              className="w-full rounded-lg bg-[#FF7A19] px-4 py-3 font-semibold text-white hover:bg-[#e66a0f] disabled:opacity-50"
            >
              {submitting ? 'Opening payment…' : payLabel}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
