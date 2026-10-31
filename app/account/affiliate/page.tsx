'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { Copy, Facebook } from 'lucide-react';
import { AccessDenied, EmptyState, ErrorState, OverviewSkeleton } from '@/components/ui-states';
import { useListQuery } from '@/hooks/useListQuery';
import { Badge } from '@/components/ui/Badge';
import { InfoNote, InfoTip } from '@/components/ui/InfoNote';
import { StackRows } from '@/components/ui/ScrollTable';
import { useAppSelector } from '@/store';
import { safeRedirectPath } from '@/lib/safeRedirect';
import { fetchPublicFeatures } from '@/lib/features';
import {
  AFFILIATE_STATUS_LABEL,
  COMMISSION_STATUS_LABEL,
  WITHDRAWAL_STATUS_LABEL,
  affiliateStatusVariant,
  ghsInput,
  pesewasFromGhs,
} from '@/lib/affiliatesAdmin';
import {
  affiliateRequest,
  apiMessage,
  fetchPublicAffiliateInfo,
  formatCopyDateTime,
  formatCopyGhs,
  formatGhs,
  formatWhen,
  loadAffiliateMe,
  payoutHoldUntil,
  payoutMethodLabel,
  skipReasonCopy,
  withdrawalStatusTip,
  type AffiliateMe,
  type AffiliateProductHit,
  type AffiliateSale,
  type AffiliateSummary,
  type AffiliateWithdrawal,
  type PayoutMethod,
  type PublicAffiliateInfo,
  type WithdrawalMode,
} from '@/lib/affiliates';

const MOMO_NETWORKS = ['MTN', 'Telecel', 'AirtelTigo'];
const OPEN_WITHDRAWAL = new Set(['requested', 'processing', 'approved']);
const SUPPORT_EMAIL = 'ventechgadgets@gmail.com';

function copyText(value: string) {
  void navigator.clipboard.writeText(value).then(
    () => toast.success('Copied'),
    () => toast.error('Could not copy')
  );
}

function productRefLink(template: string | null | undefined, slug: string, code: string | null) {
  if (template && template.includes('{slug}')) return template.replace('{slug}', encodeURIComponent(slug));
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}/product/${encodeURIComponent(slug)}${code ? `?ref=${encodeURIComponent(code)}` : ''}`;
}

export default function AffiliateDashboardPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAppSelector((state) => state.auth);
  const [ready, setReady] = useState(false);
  const accountQuery = useListQuery();
  const [me, setMe] = useState<AffiliateMe | null>(null);
  const [summary, setSummary] = useState<AffiliateSummary | null>(null);
  const [sales, setSales] = useState<AffiliateSale[]>([]);
  const [withdrawals, setWithdrawals] = useState<AffiliateWithdrawal[]>([]);
  const [info, setInfo] = useState<PublicAffiliateInfo | null>(null);
  const [paying, setPaying] = useState(false);
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<AffiliateProductHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [amount, setAmount] = useState('0.00');
  const [modeBusy, setModeBusy] = useState(false);
  const [withdrawBusy, setWithdrawBusy] = useState(false);
  const [withdrawError, setWithdrawError] = useState<string | null>(null);
  const [payoutMethod, setPayoutMethod] = useState<PayoutMethod>('momo');
  const [momoNetwork, setMomoNetwork] = useState('MTN');
  const [momoNumber, setMomoNumber] = useState('');
  const [bankName, setBankName] = useState('');
  const [bankAccountName, setBankAccountName] = useState('');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [payoutBusy, setPayoutBusy] = useState(false);

  const load = useCallback(async () => {
    await accountQuery.run(async () => {
      const [account, publicInfo] = await Promise.all([loadAffiliateMe(), fetchPublicAffiliateInfo()]);
      setInfo(publicInfo);
      if (!account || account.status !== 'active') {
        setMe(account);
        setSummary(null);
        setSales([]);
        setWithdrawals([]);
        return;
      }
      const [summaryResult, salesResult, withdrawalResult] = await Promise.all([
        affiliateRequest<AffiliateSummary>('/api/affiliates/me/summary'),
        affiliateRequest<AffiliateSale[]>('/api/affiliates/me/sales?page=1&limit=20'),
        affiliateRequest<AffiliateWithdrawal[]>('/api/affiliates/me/withdrawals?page=1&limit=20'),
      ]);
      setMe(account);
      setSummary(summaryResult.data);
      setSales(salesResult.data || []);
      setWithdrawals(withdrawalResult.data || []);
      setAmount(ghsInput(summaryResult.data.available_pesewas));
      setPayoutMethod((account.payout.payout_method as PayoutMethod) || 'momo');
      setMomoNetwork(account.payout.momo_network || 'MTN');
      setBankName(account.payout.bank_name || '');
      setBankAccountName(account.payout.bank_account_name || '');
    });
  }, [accountQuery.run]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const flags = await fetchPublicFeatures();
      if (cancelled) return;
      if (!flags.feature_affiliates_enabled) {
        router.replace('/affiliate');
        return;
      }
      if (isLoading) return;
      if (!isAuthenticated) {
        const next = safeRedirectPath('/account/affiliate');
        router.replace(next ? `/login?redirect=${encodeURIComponent(next)}` : '/login');
        return;
      }
      await load();
      if (!cancelled) setReady(true);
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    if (!query.trim()) {
      setHits([]);
      return;
    }
    const timer = window.setTimeout(() => {
      setSearching(true);
      affiliateRequest<AffiliateProductHit[]>(`/api/affiliates/products/search?q=${encodeURIComponent(query.trim())}`)
        .then((result) => setHits(result.data || []))
        .catch((error) => toast.error(apiMessage(error, 'Could not search products.')))
        .finally(() => setSearching(false));
    }, 350);
    return () => window.clearTimeout(timer);
  }, [query]);

  const openWithdrawal = useMemo(
    () => withdrawals.find((row) => OPEN_WITHDRAWAL.has(row.status)) || null,
    [withdrawals]
  );
  const minPesewas = info?.min_withdrawal_pesewas || 0;
  const available = summary?.available_pesewas ?? 0;
  const requestedPesewas = pesewasFromGhs(amount);
  const holdHours = info?.payout_change_hold_hours ?? 48;
  const holdUntil = payoutHoldUntil(me?.payout.payout_details_changed_at, holdHours);
  const inPayoutHold = Boolean(holdUntil && holdUntil.getTime() > Date.now());
  const negativeBalance = available < 0;
  const withdrawBlockedReason = openWithdrawal
    ? 'A withdrawal request is already open.'
    : inPayoutHold
      ? null
      : negativeBalance
        ? null
        : available < minPesewas
          ? `Minimum withdrawal is ${formatGhs(minPesewas)}.`
          : requestedPesewas < minPesewas
            ? `Minimum withdrawal is ${formatGhs(minPesewas)}.`
            : requestedPesewas > available
              ? 'Amount is more than your available balance.'
              : null;
  const withdrawBlocked = Boolean(withdrawBlockedReason) || inPayoutHold || negativeBalance || available < minPesewas;
  const returnWindowDays = info?.return_window_days ?? 7;
  const payoutDays = info?.payout_working_days ?? 3;
  const payoutKind = me?.payout.payout_method === 'bank' ? 'bank' : 'MoMo';

  const resumePayment = async () => {
    setPaying(true);
    try {
      const result = await affiliateRequest<{ authorization_url?: string }>('/api/affiliates/fee/initialize', {
        method: 'POST',
        body: '{}',
      });
      if (!result.data?.authorization_url) throw new Error('Could not start the payment.');
      window.location.href = result.data.authorization_url;
    } catch (error) {
      toast.error(apiMessage(error, 'Could not start the payment.'));
      setPaying(false);
    }
  };

  const setMode = async (withdrawal_mode: WithdrawalMode) => {
    setModeBusy(true);
    try {
      const result = await affiliateRequest<{ withdrawal_mode: WithdrawalMode }>('/api/affiliates/me/withdrawal-mode', {
        method: 'PATCH',
        body: JSON.stringify({ withdrawal_mode }),
      });
      toast.success(result.message);
      setMe((current) => (current ? { ...current, withdrawal_mode: result.data.withdrawal_mode } : current));
    } catch (error) {
      toast.error(apiMessage(error, 'Could not update withdrawal mode.'));
    } finally {
      setModeBusy(false);
    }
  };

  const requestWithdraw = async () => {
    if (withdrawBlocked || withdrawBusy) return;
    setWithdrawBusy(true);
    setWithdrawError(null);
    try {
      const result = await affiliateRequest('/api/affiliates/me/withdrawals', {
        method: 'POST',
        body: JSON.stringify({ amount_pesewas: requestedPesewas }),
      });
      toast.success(result.message);
      await load();
    } catch (error) {
      setWithdrawError(apiMessage(error, 'Could not request this withdrawal.'));
    } finally {
      setWithdrawBusy(false);
    }
  };

  const savePayout = async (event: FormEvent) => {
    event.preventDefault();
    setPayoutBusy(true);
    try {
      const body =
        payoutMethod === 'momo'
          ? { payout_method: 'momo', momo_network: momoNetwork, momo_number: momoNumber.trim() }
          : {
              payout_method: 'bank',
              bank_name: bankName.trim(),
              bank_account_name: bankAccountName.trim(),
              bank_account_number: bankAccountNumber.trim(),
            };
      const result = await affiliateRequest('/api/affiliates/me/payout', {
        method: 'PATCH',
        body: JSON.stringify(body),
      });
      toast.success(result.message);
      setMomoNumber('');
      setBankAccountNumber('');
      await load();
    } catch (error) {
      toast.error(apiMessage(error, 'Could not update payout details.'));
    } finally {
      setPayoutBusy(false);
    }
  };

  if (!ready || accountQuery.loading) {
    return <OverviewSkeleton />;
  }

  if (accountQuery.forbidden) {
    return (
      <AccessDenied
        title="You don't have access"
        description="You don't have access to this data."
        primary={{ label: 'Go to your account', href: '/account' }}
      />
    );
  }

  if (accountQuery.error && !me) {
    return (
      <ErrorState
        title="We couldn't load your affiliate account"
        description="Try again in a moment. If it keeps failing, contact support."
        primary={{ label: 'Try again', onClick: () => void load() }}
      />
    );
  }

  if (!me) {
    return (
      <EmptyState
        title="No affiliate application yet"
        description="Join the programme to share products and earn commission on successful sales."
        primary={{ label: 'Join now', href: '/affiliate/join' }}
      />
    );
  }

  if (me.status !== 'active') {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="mx-auto max-w-lg px-4">
          <div className="rounded-xl bg-white p-6 shadow-lg">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h1 className="text-2xl font-bold text-[#1A1A1A]">Affiliate application</h1>
              <Badge variant={affiliateStatusVariant(me.status)}>
                {AFFILIATE_STATUS_LABEL[me.status] || me.status}
              </Badge>
            </div>
            {me.status === 'awaiting_payment' && (
              <>
                <p className="mb-6 text-[#3A3A3A]">Pay the application fee to send your application for review.</p>
                <button
                  type="button"
                  onClick={() => void resumePayment()}
                  disabled={paying}
                  className="w-full rounded-lg bg-[#FF7A19] px-4 py-3 font-semibold text-white hover:bg-[#e66a0f] disabled:opacity-50"
                >
                  {paying ? 'Opening payment…' : info ? `Pay ${formatGhs(info.fee_pesewas)}` : 'Resume payment'}
                </button>
              </>
            )}
            {me.status === 'pending' && (
              <p className="text-[#3A3A3A]">Under review. We will email you when a decision is made.</p>
            )}
            {me.status === 'rejected' && (
              <div className="space-y-3 text-[#3A3A3A]">
                <p>{me.rejected_reason || 'Your application was not approved.'}</p>
                <p>
                  {me.fee_refunded_at
                    ? 'The application fee has been refunded.'
                    : me.refund_due
                      ? 'The application fee will be refunded.'
                      : 'The application fee is not refunded.'}
                </p>
              </div>
            )}
            {me.status === 'suspended' && (
              <div className="space-y-3 text-[#3A3A3A]">
                <p>{me.suspended_reason || 'Your affiliate account is suspended.'}</p>
                <p>
                  Contact support at{' '}
                  <a href={`mailto:${SUPPORT_EMAIL}`} className="text-[#FF7A19] underline">
                    {SUPPORT_EMAIL}
                  </a>
                  .
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  const generalLink = me.links?.general || '';
  const shareText = encodeURIComponent(generalLink);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="mx-auto max-w-4xl space-y-6 px-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-[#1A1A1A]">Affiliate dashboard</h1>
            <p className="text-sm text-[#3A3A3A]">{me.affiliate_no}</p>
          </div>
          <Badge variant="success">Active</Badge>
        </div>

        <section className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {[
            ['Clicks', summary?.link_clicks ?? 0],
            ['Referred customers', summary?.referred_customers ?? 0],
            ['Successful sales', summary?.successful_sales ?? 0],
            ['Total', formatGhs(summary?.total_commission_pesewas)],
            ['Pending', formatGhs(summary?.pending_pesewas)],
            ['Available', formatGhs(summary?.available_pesewas)],
          ].map(([label, value]) => (
            <div key={String(label)} className="rounded-xl bg-white p-4 shadow-sm">
              <p className="text-xs text-[#3A3A3A]">{label}</p>
              <p className="mt-1 text-lg font-semibold text-[#1A1A1A]">{value}</p>
            </div>
          ))}
        </section>

        <section className="rounded-xl bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-lg font-semibold text-[#1A1A1A]">Your link</h2>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              readOnly
              value={generalLink}
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={() => copyText(generalLink)}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#1A1A1A] px-3 py-2 text-sm text-white"
            >
              <Copy className="h-4 w-4" /> Copy
            </button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <a
              href={`https://wa.me/?text=${shareText}`}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg bg-[#25D366] px-3 py-2 text-sm font-medium text-white"
            >
              Share on WhatsApp
            </a>
            <a
              href={`https://www.facebook.com/sharer/sharer.php?u=${shareText}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-[#1877F2] px-3 py-2 text-sm font-medium text-white"
            >
              <Facebook className="h-4 w-4" /> Share on Facebook
            </a>
          </div>
        </section>

        <section className="rounded-xl bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-lg font-semibold text-[#1A1A1A]">Product link</h2>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search a product"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#FF7A19]"
          />
          {searching && <p className="mt-2 text-sm text-[#3A3A3A]">Searching…</p>}
          <ul className="mt-3 space-y-2">
            {hits.map((hit) => {
              if (!hit.slug) return null;
              const link = productRefLink(me.links?.product, hit.slug, me.referral_code);
              return (
                <li key={hit.slug} className="flex items-center justify-between gap-3 rounded-lg border border-gray-100 p-3">
                  <span className="min-w-0 break-words text-sm text-[#1A1A1A]">{hit.name}</span>
                  <button
                    type="button"
                    onClick={() => copyText(link)}
                    className="inline-flex min-h-11 shrink-0 items-center text-sm font-semibold text-[#FF7A19] hover:underline"
                  >
                    Copy link
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="rounded-xl bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-lg font-semibold text-[#1A1A1A]">Referred sales</h2>
          <InfoNote className="mb-3">
            Customer names and contact details are never shown, to protect their privacy.
          </InfoNote>
          {sales.length === 0 ? (
            <p className="text-sm text-[#3A3A3A]">No sales yet.</p>
          ) : (
            <>
            <div className="space-y-3 md:hidden">
              {sales.map((sale, index) => (
                <div key={`${sale.order_number}-${index}`} className="rounded-lg border border-gray-100 p-3">
                  <StackRows
                    rows={[
                      { label: 'Order', value: sale.order_number || '—' },
                      { label: 'Products', value: sale.product_names.join(', ') || '—' },
                      { label: 'Date', value: formatWhen(sale.date) },
                      {
                        label: 'Status',
                        value: (
                          <Badge variant={affiliateStatusVariant(sale.commission_status)} size="sm">
                            {COMMISSION_STATUS_LABEL[sale.commission_status] || sale.commission_status}
                          </Badge>
                        ),
                      },
                      { label: 'Commission', value: formatGhs(sale.amount_pesewas) },
                      ...(sale.skip_reason
                        ? [{ label: 'Note', value: skipReasonCopy(sale.skip_reason, info?.min_order_pesewas || 0) }]
                        : []),
                    ]}
                  />
                </div>
              ))}
            </div>
            <div className="hidden overflow-x-auto sticky-first md:block">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="text-[#3A3A3A]">
                    <th className="pb-2 pr-3">Order</th>
                    <th className="pb-2 pr-3">Products</th>
                    <th className="pb-2 pr-3">Date</th>
                    <th className="pb-2 pr-3">Status</th>
                    <th className="pb-2">Commission</th>
                    <th className="pb-2">Note</th>
                  </tr>
                </thead>
                <tbody>
                  {sales.map((sale, index) => (
                    <tr key={`${sale.order_number}-${index}`} className="border-t border-gray-100">
                      <td className="py-2 pr-3">{sale.order_number || '—'}</td>
                      <td className="py-2 pr-3">{sale.product_names.join(', ') || '—'}</td>
                      <td className="py-2 pr-3">{formatWhen(sale.date)}</td>
                      <td className="py-2 pr-3">
                        <Badge variant={affiliateStatusVariant(sale.commission_status)} size="sm">
                          {COMMISSION_STATUS_LABEL[sale.commission_status] || sale.commission_status}
                        </Badge>
                      </td>
                      <td className="py-2">{formatGhs(sale.amount_pesewas)}</td>
                      <td className="py-2 text-[#3A3A3A]">{skipReasonCopy(sale.skip_reason, info?.min_order_pesewas || 0) || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            </>
          )}
        </section>

        <section className="rounded-xl bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-lg font-semibold text-[#1A1A1A]">Wallet</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <p className="text-xs text-[#3A3A3A]">Available</p>
              <p className="font-semibold">{formatGhs(summary?.available_pesewas)}</p>
            </div>
            <div>
              <p className="text-xs text-[#3A3A3A]">Pending</p>
              <p className="font-semibold">{formatGhs(summary?.pending_pesewas)}</p>
            </div>
            <div>
              <p className="text-xs text-[#3A3A3A]">Withdrawn</p>
              <p className="font-semibold">{formatGhs(summary?.withdrawn_pesewas)}</p>
            </div>
          </div>
          <InfoNote title="Why is my commission pending?" defaultOpen={false} className="mt-3">
            <p>Every commission is checked before it can be withdrawn. This protects you and VENTECH from paying out on sales that don't go through.</p>
            <p className="mt-2">A commission becomes available once:</p>
            <ul className="mt-1 space-y-0.5">
              <li>• the order has been delivered and fully paid for,</li>
              <li>• the {returnWindowDays}-day return period has passed, and</li>
              <li>• VENTECH has confirmed the sale.</li>
            </ul>
            <p className="mt-2">
              A commission is cancelled if the order is cancelled, refunded or returned, the payment fails, the order is never completed, the sale appears to be fraudulent, or the same sale has already been credited through another referral.
            </p>
          </InfoNote>
          <div className="mt-4">
            <p className="mb-2 text-sm font-medium text-[#1A1A1A]">Withdrawal mode</p>
            <div className="flex gap-2">
              {(['anytime', 'month_end'] as WithdrawalMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  disabled={modeBusy}
                  onClick={() => void setMode(mode)}
                  className={`rounded-lg px-3 py-2 text-sm ${
                    me.withdrawal_mode === mode
                      ? 'bg-[#FF7A19] text-white'
                      : 'bg-gray-100 text-[#1A1A1A]'
                  }`}
                >
                  {mode === 'anytime' ? 'Anytime' : 'Month end'}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-4">
            <label htmlFor="withdrawAmount" className="mb-1 block text-sm font-medium text-[#1A1A1A]">
              Withdraw amount
            </label>
            <input
              id="withdrawAmount"
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              className="min-h-11 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#FF7A19]"
            />
            <button
              type="button"
              disabled={withdrawBlocked || withdrawBusy}
              onClick={() => void requestWithdraw()}
              className="mt-3 w-full rounded-lg bg-[#FF7A19] px-4 py-3 font-semibold text-white hover:bg-[#e66a0f] disabled:opacity-50"
            >
              {withdrawBusy ? 'Working...' : 'Withdraw'}
            </button>
            {withdrawError ? <p className="mt-2 text-sm text-red-600">{withdrawError}</p> : null}
            <InfoNote className="mt-2">
              You can withdraw once your available balance reaches {formatCopyGhs(minPesewas)}. Payments go to your registered {payoutKind} account, usually within {payoutDays} working days.
            </InfoNote>
            {inPayoutHold && holdUntil ? (
              <InfoNote className="mt-2">
                For your security, withdrawals pause for {holdHours} hours after your payout details change. You can withdraw again from {formatCopyDateTime(holdUntil)}.
              </InfoNote>
            ) : null}
            {negativeBalance ? (
              <InfoNote className="mt-2">
                Your balance is below zero because a sale you were already paid for was later refunded. Your next approved commissions will bring it back up. Withdrawals resume once your balance reaches {formatCopyGhs(minPesewas)}.
              </InfoNote>
            ) : null}
            {withdrawBlockedReason && <p className="mt-2 text-sm text-[#3A3A3A]">{withdrawBlockedReason}</p>}
          </div>
        </section>

        <section className="rounded-xl bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-lg font-semibold text-[#1A1A1A]">Withdrawal history</h2>
          {withdrawals.length === 0 ? (
            <p className="text-sm text-[#3A3A3A]">No withdrawals yet.</p>
          ) : (
            <ul className="space-y-3">
              {withdrawals.map((row) => (
                <li key={row.id} className="rounded-lg border border-gray-100 p-3 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{formatGhs(row.amount_pesewas)}</span>
                    <InfoTip text={withdrawalStatusTip(row.status, row.payment_reference, row.reason)}>
                      <Badge variant={affiliateStatusVariant(row.status)} size="sm">
                        {WITHDRAWAL_STATUS_LABEL[row.status] || row.status}
                      </Badge>
                    </InfoTip>
                  </div>
                  <p className="mt-1 text-[#3A3A3A]">{formatWhen(row.created_at)}</p>
                  {row.reason && <p className="mt-1 text-[#3A3A3A]">{row.reason}</p>}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-xl bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-lg font-semibold text-[#1A1A1A]">Payout details</h2>
          <p className="mb-4 text-sm text-[#3A3A3A]">
            Current:{' '}
            {me.payout.payout_method === 'momo'
              ? `${payoutMethodLabel('momo')} ${me.payout.momo_network || ''} ${me.payout.momo_number || ''}`.trim()
              : `${payoutMethodLabel('bank')} ${me.payout.bank_name || ''} ${me.payout.bank_account_number || ''}`.trim()}
          </p>
          <form onSubmit={(event) => void savePayout(event)} className="space-y-3">
            <select
              value={payoutMethod}
              onChange={(event) => setPayoutMethod(event.target.value as PayoutMethod)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
            >
              {(info?.payout_methods || ['momo', 'bank']).map((method) => (
                <option key={method} value={method}>
                  {payoutMethodLabel(method)}
                </option>
              ))}
            </select>
            {payoutMethod === 'momo' ? (
              <>
                <select
                  value={momoNetwork}
                  onChange={(event) => setMomoNetwork(event.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                >
                  {MOMO_NETWORKS.map((network) => (
                    <option key={network} value={network}>
                      {network}
                    </option>
                  ))}
                </select>
                <input
                  required
                  value={momoNumber}
                  onChange={(event) => setMomoNumber(event.target.value)}
                  placeholder="New mobile money number"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#FF7A19]"
                />
              </>
            ) : (
              <>
                <input
                  required
                  value={bankName}
                  onChange={(event) => setBankName(event.target.value)}
                  placeholder="Bank name"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#FF7A19]"
                />
                <input
                  required
                  value={bankAccountName}
                  onChange={(event) => setBankAccountName(event.target.value)}
                  placeholder="Account name"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#FF7A19]"
                />
                <input
                  required
                  value={bankAccountNumber}
                  onChange={(event) => setBankAccountNumber(event.target.value)}
                  placeholder="New account number"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#FF7A19]"
                />
              </>
            )}
            <button
              type="submit"
              disabled={payoutBusy}
              className="w-full rounded-lg bg-[#1A1A1A] px-4 py-3 font-semibold text-white disabled:opacity-50"
            >
              {payoutBusy ? 'Saving…' : 'Save payout details'}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
