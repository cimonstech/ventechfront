'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useAccess } from '@/context/AccessContext';
import { hasActiveInvestorRole } from '@/lib/account';
import { settingsService } from '@/lib/settings.service';
import {
  apiMessage,
  downloadAuthFile,
  formatDeviceDate,
  formatGhs,
  payoutStatusVariant,
  vlbRequest,
  type VlbDocument,
  type VlbMe,
  type VlbPublicPlan,
} from '@/lib/vlb';

const FALLBACK_PHONE = '+233 55 134 4310';

function whatsappHref(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (!digits) return '';
  const normalized = digits.startsWith('0') ? `233${digits.slice(1)}` : digits;
  return `https://wa.me/${normalized}`;
}

function telHref(value: string): string {
  const digits = value.replace(/\D/g, '');
  return digits ? `tel:+${digits.startsWith('0') ? `233${digits.slice(1)}` : digits}` : '';
}

export default function AccountInvestmentsPage() {
  const { access } = useAccess();
  const allowed = hasActiveInvestorRole(access?.programRoles);
  const [me, setMe] = useState<VlbMe | null>(null);
  const [docs, setDocs] = useState<VlbDocument[]>([]);
  const [plans, setPlans] = useState<VlbPublicPlan[]>([]);
  const [failed, setFailed] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [planId, setPlanId] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [phone, setPhone] = useState(FALLBACK_PHONE);
  const [whatsapp, setWhatsapp] = useState('');

  const load = async () => {
    const [mine, documents] = await Promise.all([
      vlbRequest<VlbMe>('/api/vlb/me'),
      vlbRequest<VlbDocument[]>('/api/vlb/me/documents'),
    ]);
    setMe(mine.data);
    setDocs(documents.data || []);
  };

  useEffect(() => {
    if (!allowed) return;
    let cancelled = false;
    load()
      .then(() => {
        if (!cancelled) setFailed(false);
      })
      .catch((error) => {
        if (!cancelled) {
          setFailed(true);
          toast.error(apiMessage(error, 'Could not load your investments'));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [allowed]);

  useEffect(() => {
    let cancelled = false;
    settingsService.getSettingsByCategory('store')
      .then((settings) => {
        if (cancelled) return;
        if (settings.store_phone) setPhone(settings.store_phone);
        if (settings.store_whatsapp_number) setWhatsapp(settings.store_whatsapp_number);
      })
      .catch((error) => console.error('store contact', error));
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!upgradeOpen) return;
    vlbRequest<VlbPublicPlan[]>('/api/vlb/plans')
      .then((result) => setPlans(result.data || []))
      .catch((error) => toast.error(apiMessage(error, 'Could not load plans')));
  }, [upgradeOpen]);

  if (!allowed) {
    return (
      <div className="rounded-xl bg-white p-5 shadow-sm">
        <h1 className="text-xl font-bold text-[#1A1A1A]">Investments</h1>
        <p className="mt-2 text-sm text-[#3A3A3A]">This section is for active Laptop Banking investors.</p>
      </div>
    );
  }

  if (!me) {
    return <p className="text-sm text-[#3A3A3A]">{failed ? 'Could not load your investments.' : 'Loading your investments…'}</p>;
  }

  const payout = me.payout;
  const summary = me.summary;
  const featured = summary?.featured;
  const horizon = featured?.horizon_progress;
  const horizonPct = horizon?.days_total
    ? Math.min(100, Math.round((horizon.days_elapsed / horizon.days_total) * 100))
    : 0;
  const wa = whatsappHref(whatsapp);
  const call = telHref(phone);

  return (
    <div className="space-y-4">
      <section className="rounded-xl bg-white p-4 shadow-sm sm:p-5">
        <h1 className="text-xl font-bold text-[#1A1A1A] md:text-2xl">Laptop Banking</h1>
        <p className="mt-1 text-sm text-[#3A3A3A]">{me.investor_no || 'Your investments'}</p>
        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-[#3A3A3A]">Total invested</dt>
            <dd className="font-semibold text-[#1A1A1A]">{formatGhs(summary?.total_invested_pesewas || 0)}</dd>
          </div>
          <div>
            <dt className="text-[#3A3A3A]">Next payout</dt>
            <dd className="font-semibold text-[#1A1A1A]">
              {summary?.next_payout
                ? `${formatDeviceDate(summary.next_payout.date)} · ${formatGhs(summary.next_payout.net_pesewas)}`
                : '—'}
            </dd>
          </div>
          <div>
            <dt className="text-[#3A3A3A]">Received so far</dt>
            <dd className="font-semibold text-[#1A1A1A]">{formatGhs(summary?.received_pesewas || 0)}</dd>
          </div>
          <div>
            <dt className="text-[#3A3A3A]">Scholar Fund</dt>
            <dd className="font-semibold text-[#1A1A1A]">{formatGhs(summary?.scholar_fund_pesewas || 0)}</dd>
          </div>
        </dl>
        {featured && (
          <div className="mt-4">
            <p className="text-sm text-[#3A3A3A]">
              {featured.horizon_months}-month progress · {featured.plan_name}
            </p>
            <div className="mt-2 h-2 rounded-full bg-gray-100">
              <div className="h-2 rounded-full bg-[#FF7A19]" style={{ width: `${horizonPct}%` }} />
            </div>
          </div>
        )}
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button
            size="sm"
            variant="outline"
            className="min-h-11"
            disabled={!featured || downloading}
            isLoading={downloading}
            onClick={async () => {
              if (!featured) return;
              setDownloading(true);
              try {
                await downloadAuthFile(
                  `/api/vlb/me/investments/${featured.investment_id}/statement.pdf`,
                  `vlb-statement-${me.investor_no || 'investment'}.pdf`
                );
              } catch (error) {
                toast.error(apiMessage(error, 'Could not download this statement.'));
              } finally {
                setDownloading(false);
              }
            }}
          >
            Download statement
          </Button>
          <Button size="sm" className="min-h-11" onClick={() => setUpgradeOpen(true)}>Upgrade</Button>
          {wa ? (
            <a
              href={wa}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center justify-center rounded-lg border-2 border-[#FF7A19] px-3 text-sm font-medium text-[#FF7A19]"
            >
              WhatsApp
            </a>
          ) : null}
          {call ? (
            <a
              href={call}
              className="inline-flex min-h-11 items-center justify-center rounded-lg border-2 border-[#FF7A19] px-3 text-sm font-medium text-[#FF7A19]"
            >
              Call VENTECH
            </a>
          ) : null}
        </div>
      </section>

      {me.investments.length === 0 ? (
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <p className="text-sm text-[#3A3A3A]">No investments yet.</p>
        </div>
      ) : (
        me.investments.map((row) => {
          const progress = row.term_progress.days_total
            ? Math.min(100, Math.round((row.term_progress.days_elapsed / row.term_progress.days_total) * 100))
            : 0;
          return (
            <Link
              key={row.id}
              href={`/account/investments/${row.id}`}
              className="block rounded-xl bg-white p-4 shadow-sm sm:p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-[#1A1A1A]">{row.plan_name}</p>
                  <p className="mt-1 text-sm text-[#3A3A3A]">Principal {formatGhs(row.principal_pesewas)}</p>
                </div>
                <Badge variant={payoutStatusVariant(row.status)}>{row.status}</Badge>
              </div>
              <p className="mt-3 text-sm text-[#3A3A3A]">
                Term {row.current_term} · {row.term_progress.days_elapsed} of {row.term_progress.days_total} days
              </p>
              <div className="mt-2 h-2 rounded-full bg-gray-100">
                <div className="h-2 rounded-full bg-[#FF7A19]" style={{ width: `${progress}%` }} />
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <div>
                  <dt className="text-[#3A3A3A]">Next payout</dt>
                  <dd className="font-medium text-[#1A1A1A]">
                    {row.next_payout
                      ? `${formatDeviceDate(row.next_payout.date)} · ${formatGhs(row.next_payout.net_pesewas)}`
                      : '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-[#3A3A3A]">Paid so far</dt>
                  <dd className="font-medium text-[#1A1A1A]">{formatGhs(row.totals_paid_pesewas)}</dd>
                </div>
                <div>
                  <dt className="text-[#3A3A3A]">Scholar Fund</dt>
                  <dd className="font-medium text-[#1A1A1A]">{formatGhs(row.scholar_fund_deducted_pesewas)}</dd>
                </div>
                <div>
                  <dt className="text-[#3A3A3A]">Maturity</dt>
                  <dd className="font-medium text-[#1A1A1A]">{formatDeviceDate(row.maturity_date)}</dd>
                </div>
              </dl>
              <p className="mt-2 text-sm text-[#3A3A3A]">
                Settlement: {row.principal_settlement?.status || '—'}
              </p>
            </Link>
          );
        })
      )}

      <section className="rounded-xl bg-white p-4 shadow-sm sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-semibold text-[#1A1A1A]">Upgrade</h2>
          <Button size="sm" onClick={() => setUpgradeOpen(true)}>Request upgrade</Button>
        </div>
        <p className="mt-2 text-sm text-[#3A3A3A]">Ask VENTECH about moving to another plan.</p>
      </section>

      <section className="rounded-xl bg-white p-4 shadow-sm sm:p-5">
        <h2 className="font-semibold text-[#1A1A1A]">Documents</h2>
        {docs.length === 0 ? (
          <p className="mt-2 text-sm text-[#3A3A3A]">No documents yet.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {docs.map((doc) => (
              <li key={doc.id}>
                {doc.url ? (
                  <a href={doc.url} target="_blank" rel="noreferrer" className="text-sm font-medium text-[#FF7A19]">
                    {doc.title}
                  </a>
                ) : (
                  <span className="text-sm text-[#3A3A3A]">{doc.title}</span>
                )}
                <span className="ml-2 text-xs text-[#3A3A3A]">{doc.kind}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl bg-white p-4 shadow-sm sm:p-5">
        <h2 className="font-semibold text-[#1A1A1A]">Payout details</h2>
        <p className="mt-2 text-sm text-[#3A3A3A]">
          {payout.payout_method === 'momo'
            ? `${payout.momo_network || 'MoMo'} · ${payout.momo_number || '—'}`
            : payout.payout_method === 'bank'
              ? `${payout.bank_name || 'Bank'} · ${payout.bank_account_number || '—'}`
              : 'Not set yet'}
        </p>
        <p className="mt-2 text-xs text-[#3A3A3A]">
          Changes to payout details are handled by VENTECH support.
        </p>
      </section>

      {upgradeOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <form
            className="w-full max-w-md rounded-xl bg-white p-5"
            onSubmit={async (event) => {
              event.preventDefault();
              if (!planId) {
                toast.error('Select a plan');
                return;
              }
              setBusy(true);
              try {
                await vlbRequest('/api/vlb/me/upgrade-requests', {
                  method: 'POST',
                  body: JSON.stringify({ requested_plan_id: planId, message: message || undefined }),
                });
                toast.success('Upgrade request sent.');
                setUpgradeOpen(false);
                setMessage('');
              } catch (error) {
                toast.error(apiMessage(error, 'Could not send this request.'));
              } finally {
                setBusy(false);
              }
            }}
          >
            <h2 className="text-lg font-bold text-[#1A1A1A]">Upgrade request</h2>
            <label className="mt-4 block text-sm font-medium text-[#1A1A1A]">Plan</label>
            <select
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-3 text-sm"
              value={planId}
              onChange={(e) => setPlanId(e.target.value)}
              required
            >
              <option value="">Select a plan</option>
              {plans.map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.name} ({formatGhs(plan.principal_pesewas)})
                </option>
              ))}
            </select>
            <label className="mt-3 block text-sm font-medium text-[#1A1A1A]">Message</label>
            <textarea
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-3 text-sm"
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
            <div className="mt-4 flex gap-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setUpgradeOpen(false)}>Cancel</Button>
              <Button type="submit" className="flex-1" disabled={busy}>{busy ? 'Sending…' : 'Send'}</Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
